const db = require('../config/db');

exports.createSale = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { customer_name, customer_phone, items, discount_percent = 0, tax_percent = 5, payment_method = 'cash', notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required.' });
    }

    // Generate invoice number
    const [lastSale] = await conn.query('SELECT invoice_number FROM sales ORDER BY id DESC LIMIT 1');
    let invoiceNum = 'INV-0001';
    if (lastSale.length > 0) {
      const lastNum = parseInt(lastSale[0].invoice_number.split('-')[1]) || 0;
      invoiceNum = `INV-${String(lastNum + 1).padStart(4, '0')}`;
    }

    let subtotal = 0;
    const processedItems = [];

    // Validate all items first
    for (const item of items) {
      const { medicine_id, quantity } = item;

      // Get medicine
      const [meds] = await conn.query('SELECT * FROM medicines WHERE id = ? AND is_active = TRUE', [medicine_id]);
      if (meds.length === 0) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: `Medicine ID ${medicine_id} not found.` });
      }

      // Get available batches (FIFO - earliest expiry first, non-expired only)
      const [batches] = await conn.query(
        'SELECT * FROM batches WHERE medicine_id = ? AND expiry_date >= CURDATE() AND quantity > 0 ORDER BY expiry_date ASC',
        [medicine_id]
      );

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < quantity) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${meds[0].name}. Available: ${totalAvailable}, Requested: ${quantity}`
        });
      }

      // Allocate quantity from batches (FIFO)
      let remaining = quantity;
      const allocations = [];
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.quantity);
        allocations.push({ batch_id: batch.id, quantity: take });
        remaining -= take;
      }

      const itemTotal = quantity * meds[0].selling_price;
      subtotal += itemTotal;

      processedItems.push({
        medicine_id,
        medicine_name: meds[0].name,
        quantity,
        unit_price: meds[0].selling_price,
        total_price: itemTotal,
        allocations
      });
    }

    // Calculate totals
    const discountAmount = (subtotal * discount_percent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * tax_percent) / 100;
    const total = afterDiscount + taxAmount;

    // Create sale
    const [saleResult] = await conn.query(
      `INSERT INTO sales (invoice_number, user_id, customer_name, customer_phone, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceNum, req.user.id, customer_name || 'Walk-in Customer', customer_phone || null,
       subtotal, discount_percent, discountAmount, tax_percent, taxAmount, total, payment_method, notes || null]
    );

    const saleId = saleResult.insertId;

    // Insert sale items and update stock
    for (const item of processedItems) {
      // Use first batch for sale_items record
      const primaryBatchId = item.allocations[0].batch_id;
      await conn.query(
        'INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [saleId, item.medicine_id, primaryBatchId, item.quantity, item.unit_price, item.total_price]
      );

      // Deduct from batches
      for (const alloc of item.allocations) {
        await conn.query('UPDATE batches SET quantity = quantity - ? WHERE id = ?', [alloc.quantity, alloc.batch_id]);

        // Record stock movement
        await conn.query(
          'INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, reference_type, reference_id, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [item.medicine_id, alloc.batch_id, 'OUT', -alloc.quantity, 'sale', saleId, `Sold ${alloc.quantity} units`, req.user.id]
        );
      }
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully.',
      data: {
        id: saleId,
        invoice_number: invoiceNum,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total,
        items: processedItems
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Create sale error:', err);
    res.status(500).json({ success: false, message: 'Server error during sale.' });
  } finally {
    conn.release();
  }
};

exports.getSales = async (req, res) => {
  try {
    const { from_date, to_date, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT s.*, u.full_name as cashier_name
      FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1
    `;
    const params = [];

    if (from_date) { query += ' AND DATE(s.created_at) >= ?'; params.push(from_date); }
    if (to_date) { query += ' AND DATE(s.created_at) <= ?'; params.push(to_date); }

    query += ' ORDER BY s.created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [sales] = await db.query(query, params);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT s.*, u.full_name as cashier_name
      FROM sales s LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (sales.length === 0) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    const [items] = await db.query(`
      SELECT si.*, m.name as medicine_name, m.unit, b.batch_number
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      LEFT JOIN batches b ON si.batch_id = b.id
      WHERE si.sale_id = ?
    `, [req.params.id]);

    res.json({ success: true, data: { ...sales[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
