const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });

    const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Category already exists.' });

    const [result] = await db.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || null]);
    res.status(201).json({ success: true, message: 'Category created.', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.query('UPDATE categories SET name = ?, description = ? WHERE id = ?', [name, description || null, req.params.id]);
    res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.delete = async (req, res) => {
  try {
    const [medicines] = await db.query('SELECT COUNT(*) as count FROM medicines WHERE category_id = ? AND is_active = TRUE', [req.params.id]);
    if (medicines[0].count > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete category with associated medicines.' });
    }
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
