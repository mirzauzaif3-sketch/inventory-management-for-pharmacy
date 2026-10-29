const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    // Total medicines
    const [totalMeds] = await db.query('SELECT COUNT(*) as count FROM medicines WHERE is_active = TRUE');

    // Available stock (total quantity across all non-expired batches)
    const [stockResult] = await db.query(
      'SELECT COALESCE(SUM(b.quantity), 0) as total FROM batches b JOIN medicines m ON b.medicine_id = m.id WHERE m.is_active = TRUE AND b.expiry_date >= CURDATE()'
    );

    // Low stock medicines (below min_stock_level)
    const [lowStock] = await db.query(`
      SELECT COUNT(DISTINCT m.id) as count FROM medicines m
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE AND COALESCE(b.total_qty, 0) <= m.min_stock_level AND COALESCE(b.total_qty, 0) > 0
    `);

    // Out of stock
    const [outOfStock] = await db.query(`
      SELECT COUNT(DISTINCT m.id) as count FROM medicines m
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE AND COALESCE(b.total_qty, 0) = 0
    `);

    // Today's sales
    const [todaySales] = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE DATE(created_at) = CURDATE()'
    );

    // Total inventory value
    const [inventoryValue] = await db.query(
      'SELECT COALESCE(SUM(b.quantity * m.selling_price), 0) as value FROM batches b JOIN medicines m ON b.medicine_id = m.id WHERE m.is_active = TRUE AND b.expiry_date >= CURDATE()'
    );

    res.json({
      success: true,
      data: {
        totalMedicines: totalMeds[0].count,
        availableStock: stockResult[0].total,
        lowStockCount: lowStock[0].count,
        outOfStockCount: outOfStock[0].count,
        todaySalesCount: todaySales[0].count,
        todaySalesTotal: todaySales[0].total,
        inventoryValue: inventoryValue[0].value
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getRecentSales = async (req, res) => {
  try {
    const [sales] = await db.query(`
      SELECT s.id, s.invoice_number, s.customer_name, s.total, s.payment_method, s.created_at,
             u.full_name as cashier_name
      FROM sales s LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC LIMIT 10
    `);
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getLowStockMedicines = async (req, res) => {
  try {
    const [medicines] = await db.query(`
      SELECT m.id, m.name, m.min_stock_level, m.unit, COALESCE(b.total_qty, 0) as current_stock,
             c.name as category_name
      FROM medicines m
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_active = TRUE AND COALESCE(b.total_qty, 0) <= m.min_stock_level
      ORDER BY COALESCE(b.total_qty, 0) ASC LIMIT 20
    `);
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getRecentMedicines = async (req, res) => {
  try {
    const [medicines] = await db.query(`
      SELECT m.id, m.name, m.selling_price, m.unit, c.name as category_name, m.created_at
      FROM medicines m LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.is_active = TRUE
      ORDER BY m.created_at DESC LIMIT 10
    `);
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getStockOverview = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT c.name as category, COUNT(DISTINCT m.id) as medicine_count,
             COALESCE(SUM(b.quantity), 0) as total_stock
      FROM categories c
      LEFT JOIN medicines m ON c.id = m.category_id AND m.is_active = TRUE
      LEFT JOIN batches b ON m.id = b.medicine_id AND b.expiry_date >= CURDATE()
      GROUP BY c.id, c.name
      ORDER BY total_stock DESC
    `);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
