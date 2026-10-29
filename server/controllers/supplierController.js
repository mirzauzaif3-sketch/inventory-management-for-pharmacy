const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM suppliers WHERE is_active = TRUE';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY name ASC';
    const [suppliers] = await db.query(query, params);
    res.json({ success: true, data: suppliers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const [suppliers] = await db.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (suppliers.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    // Get medicines supplied
    const [medicines] = await db.query(
      'SELECT id, name, generic_name, selling_price, unit FROM medicines WHERE supplier_id = ? AND is_active = TRUE',
      [req.params.id]
    );

    // Get purchase history
    const [purchases] = await db.query(
      'SELECT * FROM purchases WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );

    res.json({ success: true, data: { ...suppliers[0], medicines, purchases } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, company, gst_number } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });

    const [result] = await db.query(
      'INSERT INTO suppliers (name, contact_person, phone, email, address, company, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, contact_person || null, phone || null, email || null, address || null, company || null, gst_number || null]
    );
    res.status(201).json({ success: true, message: 'Supplier added successfully.', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, company, gst_number } = req.body;
    await db.query(
      'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, company = ?, gst_number = ? WHERE id = ?',
      [name, contact_person || null, phone || null, email || null, address || null, company || null, gst_number || null, req.params.id]
    );
    res.json({ success: true, message: 'Supplier updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    await db.query('UPDATE suppliers SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
