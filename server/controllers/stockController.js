const db = require('../config/db');

exports.addStock = async (req, res) => {
  try {
    const { medicine_id, batch_number, mfg_date, expiry_date, quantity, purchase_price } = req.body;

    if (!medicine_id || !batch_number || !expiry_date || !quantity) {
      return res.status(400).json({ success: false, message: 'Medicine, batch number, expiry date, and quantity are required.' });
    }

    // Verify medicine exists
    const [med] = await db.query('SELECT id, name FROM medicines WHERE id = ? AND is_active = TRUE', [medicine_id]);
    if (med.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    // Check if batch already exists for this medicine
    const [existingBatch] = await db.query(
      'SELECT id, quantity FROM batches WHERE medicine_id = ? AND batch_number = ?',
      [medicine_id, batch_number]
    );

    let batchId;
    if (existingBatch.length > 0) {
      // Update existing batch quantity
      batchId = existingBatch[0].id;
      await db.query(
        'UPDATE batches SET quantity = quantity + ?, mfg_date = COALESCE(?, mfg_date), expiry_date = ?, purchase_price = COALESCE(?, purchase_price) WHERE id = ?',
        [quantity, mfg_date || null, expiry_date, purchase_price || null, batchId]
      );
    } else {
      // Create new batch
      const [result] = await db.query(
        'INSERT INTO batches (medicine_id, batch_number, mfg_date, expiry_date, quantity, purchase_price) VALUES (?, ?, ?, ?, ?, ?)',
        [medicine_id, batch_number, mfg_date || null, expiry_date, quantity, purchase_price || 0]
      );
      batchId = result.insertId;
    }

    // Record stock movement
    await db.query(
      'INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, reference_type, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [medicine_id, batchId, 'IN', quantity, 'manual', `Stock added: ${quantity} units`, req.user.id]
    );

    res.status(201).json({ success: true, message: `${quantity} units of ${med[0].name} added successfully.` });
  } catch (err) {
    console.error('Add stock error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { batch_id, quantity, notes } = req.body;

    if (!batch_id || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Batch ID and quantity are required.' });
    }

    const [batch] = await db.query('SELECT * FROM batches WHERE id = ?', [batch_id]);
    if (batch.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const diff = quantity - batch[0].quantity;
    await db.query('UPDATE batches SET quantity = ? WHERE id = ?', [quantity, batch_id]);

    // Record adjustment
    await db.query(
      'INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, reference_type, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [batch[0].medicine_id, batch_id, 'ADJUSTMENT', diff, 'manual', notes || `Stock adjusted to ${quantity}`, req.user.id]
    );

    res.json({ success: true, message: 'Stock updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getMovements = async (req, res) => {
  try {
    const { medicine_id, type, from_date, to_date, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT sm.*, m.name as medicine_name, b.batch_number, u.full_name as user_name
      FROM stock_movements sm
      JOIN medicines m ON sm.medicine_id = m.id
      LEFT JOIN batches b ON sm.batch_id = b.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (medicine_id) { query += ' AND sm.medicine_id = ?'; params.push(medicine_id); }
    if (type) { query += ' AND sm.type = ?'; params.push(type); }
    if (from_date) { query += ' AND DATE(sm.created_at) >= ?'; params.push(from_date); }
    if (to_date) { query += ' AND DATE(sm.created_at) <= ?'; params.push(to_date); }

    query += ' ORDER BY sm.created_at DESC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [movements] = await db.query(query, params);
    res.json({ success: true, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const { medicine_id, expired, near_expiry } = req.query;
    let query = `
      SELECT b.*, m.name as medicine_name, m.unit
      FROM batches b JOIN medicines m ON b.medicine_id = m.id
      WHERE m.is_active = TRUE
    `;
    const params = [];

    if (medicine_id) { query += ' AND b.medicine_id = ?'; params.push(medicine_id); }
    if (expired === 'true') { query += ' AND b.expiry_date < CURDATE()'; }
    if (near_expiry === 'true') { query += ' AND b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)'; }

    query += ' ORDER BY b.expiry_date ASC';
    const [batches] = await db.query(query, params);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getExpiring = async (req, res) => {
  try {
    const [medicines] = await db.query(`
      SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.quantity,
             m.id as medicine_id, m.name as medicine_name, m.unit,
             DATEDIFF(b.expiry_date, CURDATE()) as days_until_expiry
      FROM batches b JOIN medicines m ON b.medicine_id = m.id
      WHERE m.is_active = TRUE AND b.quantity > 0
        AND b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY b.expiry_date ASC
    `);
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getExpired = async (req, res) => {
  try {
    const [medicines] = await db.query(`
      SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.quantity,
             m.id as medicine_id, m.name as medicine_name, m.unit
      FROM batches b JOIN medicines m ON b.medicine_id = m.id
      WHERE m.is_active = TRUE AND b.quantity > 0 AND b.expiry_date < CURDATE()
      ORDER BY b.expiry_date ASC
    `);
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
