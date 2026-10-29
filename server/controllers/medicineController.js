const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { search, category_id, page = 1, limit = 50 } = req.query;
    let query = `
      SELECT m.*, c.name as category_name, s.name as supplier_name,
             COALESCE(b.total_qty, 0) as current_stock
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE
    `;
    const params = [];

    if (search) {
      query += ' AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.id = ?)';
      params.push(`%${search}%`, `%${search}%`, isNaN(search) ? 0 : search);
    }
    if (category_id) {
      query += ' AND m.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY m.name ASC';
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [medicines] = await db.query(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM medicines m WHERE m.is_active = TRUE';
    const countParams = [];
    if (search) {
      countQuery += ' AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.id = ?)';
      countParams.push(`%${search}%`, `%${search}%`, isNaN(search) ? 0 : search);
    }
    if (category_id) {
      countQuery += ' AND m.category_id = ?';
      countParams.push(category_id);
    }
    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: medicines,
      pagination: { total: countResult[0].total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    console.error('Get medicines error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [medicines] = await db.query(`
      SELECT m.*, c.name as category_name, s.name as supplier_name
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (medicines.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    // Get batches
    const [batches] = await db.query(
      'SELECT * FROM batches WHERE medicine_id = ? ORDER BY expiry_date ASC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...medicines[0], batches } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, generic_name, category_id, supplier_id, description, purchase_price, selling_price, min_stock_level, unit, manufacturer } = req.body;

    if (!name || !selling_price) {
      return res.status(400).json({ success: false, message: 'Medicine name and selling price are required.' });
    }

    const [result] = await db.query(
      `INSERT INTO medicines (name, generic_name, category_id, supplier_id, description, purchase_price, selling_price, min_stock_level, unit, manufacturer)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, generic_name || null, category_id || null, supplier_id || null, description || null,
       purchase_price || 0, selling_price, min_stock_level || 10, unit || 'Tablet', manufacturer || null]
    );

    res.status(201).json({ success: true, message: 'Medicine added successfully.', data: { id: result.insertId } });
  } catch (err) {
    console.error('Create medicine error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, generic_name, category_id, supplier_id, description, purchase_price, selling_price, min_stock_level, unit, manufacturer } = req.body;

    const [existing] = await db.query('SELECT id FROM medicines WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    await db.query(
      `UPDATE medicines SET name = ?, generic_name = ?, category_id = ?, supplier_id = ?, description = ?,
       purchase_price = ?, selling_price = ?, min_stock_level = ?, unit = ?, manufacturer = ? WHERE id = ?`,
      [name, generic_name || null, category_id || null, supplier_id || null, description || null,
       purchase_price || 0, selling_price, min_stock_level || 10, unit || 'Tablet', manufacturer || null, id]
    );

    res.json({ success: true, message: 'Medicine updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE medicines SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Medicine deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Search medicines for billing (lightweight)
exports.search = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const [medicines] = await db.query(`
      SELECT m.id, m.name, m.generic_name, m.selling_price, m.unit,
             COALESCE(b.total_qty, 0) as current_stock
      FROM medicines m
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.id = ?)
      HAVING current_stock > 0
      ORDER BY m.name LIMIT 20
    `, [`%${q}%`, `%${q}%`, isNaN(q) ? 0 : q]);

    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
