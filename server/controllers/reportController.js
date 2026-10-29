const db = require('../config/db');

exports.dailySales = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [sales] = await db.query(`
      SELECT s.id, s.invoice_number, s.customer_name, s.total, s.payment_method, s.created_at,
             u.full_name as cashier_name
      FROM sales s LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) = ?
      ORDER BY s.created_at DESC
    `, [targetDate]);

    const [summary] = await db.query(`
      SELECT COUNT(*) as total_transactions, COALESCE(SUM(total), 0) as total_revenue,
             COALESCE(SUM(discount_amount), 0) as total_discounts, COALESCE(SUM(tax_amount), 0) as total_tax
      FROM sales WHERE DATE(created_at) = ?
    `, [targetDate]);

    res.json({ success: true, data: { date: targetDate, summary: summary[0], sales } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.salesByPeriod = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    let groupBy, dateFormat, limit;

    if (period === 'daily') {
      groupBy = 'DATE(created_at)';
      dateFormat = 'DATE(created_at) as period';
      limit = 30;
    } else if (period === 'weekly') {
      groupBy = 'YEARWEEK(created_at, 1)';
      dateFormat = "CONCAT(DATE_FORMAT(MIN(created_at), '%Y-%m-%d'), ' to ', DATE_FORMAT(MAX(created_at), '%Y-%m-%d')) as period";
      limit = 12;
    } else {
      groupBy = "DATE_FORMAT(created_at, '%Y-%m')";
      dateFormat = "DATE_FORMAT(created_at, '%Y-%m') as period";
      limit = 12;
    }

    const [data] = await db.query(`
      SELECT ${dateFormat}, COUNT(*) as transactions, COALESCE(SUM(total), 0) as revenue
      FROM sales
      GROUP BY ${groupBy}
      ORDER BY MIN(created_at) DESC
      LIMIT ?
    `, [limit]);

    res.json({ success: true, data: data.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.stockReport = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT m.id, m.name, m.generic_name, m.unit, m.min_stock_level, m.selling_price, m.purchase_price,
             c.name as category_name, s.name as supplier_name,
             COALESCE(b.total_qty, 0) as current_stock,
             COALESCE(b.total_qty * m.selling_price, 0) as stock_value
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE
      ORDER BY m.name
    `);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.lowStockReport = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT m.id, m.name, m.unit, m.min_stock_level, c.name as category_name,
             COALESCE(b.total_qty, 0) as current_stock,
             m.min_stock_level - COALESCE(b.total_qty, 0) as deficit
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN (SELECT medicine_id, SUM(quantity) as total_qty FROM batches WHERE expiry_date >= CURDATE() GROUP BY medicine_id) b ON m.id = b.medicine_id
      WHERE m.is_active = TRUE AND COALESCE(b.total_qty, 0) <= m.min_stock_level
      ORDER BY COALESCE(b.total_qty, 0) ASC
    `);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.expiryReport = async (req, res) => {
  try {
    const [expired] = await db.query(`
      SELECT b.*, m.name as medicine_name, m.unit
      FROM batches b JOIN medicines m ON b.medicine_id = m.id
      WHERE m.is_active = TRUE AND b.quantity > 0 AND b.expiry_date < CURDATE()
      ORDER BY b.expiry_date ASC
    `);

    const [nearExpiry] = await db.query(`
      SELECT b.*, m.name as medicine_name, m.unit,
             DATEDIFF(b.expiry_date, CURDATE()) as days_until_expiry
      FROM batches b JOIN medicines m ON b.medicine_id = m.id
      WHERE m.is_active = TRUE AND b.quantity > 0
        AND b.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY)
      ORDER BY b.expiry_date ASC
    `);

    res.json({ success: true, data: { expired, nearExpiry } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.inventoryValuation = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT c.name as category,
             COUNT(DISTINCT m.id) as medicine_count,
             COALESCE(SUM(b.quantity), 0) as total_units,
             COALESCE(SUM(b.quantity * m.purchase_price), 0) as cost_value,
             COALESCE(SUM(b.quantity * m.selling_price), 0) as retail_value
      FROM categories c
      LEFT JOIN medicines m ON c.id = m.category_id AND m.is_active = TRUE
      LEFT JOIN batches b ON m.id = b.medicine_id AND b.expiry_date >= CURDATE()
      GROUP BY c.id, c.name
      ORDER BY retail_value DESC
    `);

    const totals = data.reduce((acc, row) => ({
      medicine_count: acc.medicine_count + row.medicine_count,
      total_units: acc.total_units + row.total_units,
      cost_value: acc.cost_value + Number(row.cost_value),
      retail_value: acc.retail_value + Number(row.retail_value)
    }), { medicine_count: 0, total_units: 0, cost_value: 0, retail_value: 0 });

    res.json({ success: true, data: { categories: data, totals } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.topSellingMedicines = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const [data] = await db.query(`
      SELECT m.id, m.name, m.unit, SUM(si.quantity) as total_sold,
             SUM(si.total_price) as total_revenue
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY m.id, m.name, m.unit
      ORDER BY total_sold DESC
      LIMIT 20
    `, [Number(period)]);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
