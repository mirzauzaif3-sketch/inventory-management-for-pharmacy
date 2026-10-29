const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const os = require('os');

let dbInstance = null;

function getSqliteDb() {
  if (dbInstance) return dbInstance;

  let dbPath = path.join(__dirname, '..', 'pharmacy.db');

  // In serverless environments (e.g. Vercel), the deployment filesystem is read-only.
  // We copy the database to the writable temporary directory if running on Vercel.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDbPath = path.join(os.tmpdir(), 'pharmacy.db');
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(dbPath)) {
        try {
          fs.copyFileSync(dbPath, tmpDbPath);
        } catch (e) {
          console.warn('⚠️ Could not copy seed DB to tmp directory:', e.message);
        }
      }
    }
    dbPath = tmpDbPath;
  }

  const db = new DatabaseSync(dbPath);

  // Register compatibility functions
  db.function('CURDATE', () => new Date().toISOString().slice(0, 10));
  db.function('NOW', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
  db.function('DATE', (dt) => (dt ? String(dt).slice(0, 10) : ''));
  db.function('DATEDIFF', (d1, d2) => {
    if (!d1 || !d2) return 0;
    const diff = (new Date(d1) - new Date(d2)) / 86400000;
    return Math.round(diff);
  });
  db.function('CONCAT', (...args) => args.join(''));
  db.function('IFNULL', (a, b) => (a !== null && a !== undefined ? a : b));

  // Enable WAL and foreign keys
  try {
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.warn('Foreign keys pragma error:', e.message);
  }

  // Initialize schema if users table does not exist
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
  if (tableCheck.length === 0) {
    console.log('📦 Initializing built-in SQLite database schema...');
    initSchemaAndSeed(db);
  }

  dbInstance = db;
  return db;
}

function initSchemaAndSeed(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'pharmacist',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      company TEXT,
      gst_number TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic_name TEXT,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      description TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      unit TEXT DEFAULT 'Tablet',
      manufacturer TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      mfg_date TEXT,
      expiry_date TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      purchase_price REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_phone TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_percent REAL DEFAULT 5,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'cash',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      invoice_number TEXT,
      total REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'received',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );
  `);

  // Seed Users
  const adminHash = bcrypt.hashSync('admin123', 10);
  const pharmacistHash = bcrypt.hashSync('pharma123', 10);
  const cashierHash = bcrypt.hashSync('cash123', 10);

  const insertUser = db.prepare('INSERT INTO users (username, password_hash, full_name, email, phone, role) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('admin', adminHash, 'Dr. Rajesh Kumar', 'admin@pharmacy.com', '9876543210', 'admin');
  insertUser.run('pharmacist', pharmacistHash, 'Priya Sharma', 'priya@pharmacy.com', '9876543211', 'pharmacist');
  insertUser.run('cashier', cashierHash, 'Amit Patel', 'amit@pharmacy.com', '9876543212', 'cashier');

  // Seed Categories
  const categories = [
    ['Antibiotics', 'Medicines used to treat bacterial infections'],
    ['Analgesics', 'Pain relieving medicines'],
    ['Antipyretics', 'Fever reducing medicines'],
    ['Antacids', 'Medicines for acidity and stomach related issues'],
    ['Antihistamines', 'Allergy relief medicines'],
    ['Cardiovascular', 'Heart and blood pressure medicines'],
    ['Diabetes', 'Medicines for diabetes management'],
    ['Vitamins & Supplements', 'Nutritional supplements and vitamins'],
    ['Dermatology', 'Skin care medicines and ointments'],
    ['Respiratory', 'Medicines for cough, cold, and respiratory issues'],
    ['Gastrointestinal', 'Medicines for digestive system'],
    ['Ophthalmic', 'Eye care medicines and drops']
  ];
  const insertCat = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  categories.forEach(([n, d]) => insertCat.run(n, d));

  // Seed Suppliers
  const suppliers = [
    ['MedPlus Distributors', 'Suresh Reddy', '9845012345', 'suresh@medplus.com', '12 MG Road, Bangalore', 'MedPlus Healthcare Ltd', 'GST29AABCD1234E'],
    ['Apollo Pharma Supply', 'Kavitha Nair', '9845012346', 'kavitha@apollo.com', '45 Anna Nagar, Chennai', 'Apollo Pharmacy Pvt Ltd', 'GST33AABCE5678F'],
    ['Sun Pharma Direct', 'Rahul Mehra', '9845012347', 'rahul@sunpharma.com', '78 Andheri East, Mumbai', 'Sun Pharmaceutical Industries', 'GST27AABCF9012G'],
    ['Cipla Distribution', 'Deepa Joshi', '9845012348', 'deepa@cipla.com', '23 Baner Road, Pune', 'Cipla Ltd', 'GST27AABCG3456H'],
    ['Ranbaxy Wellness', 'Vikram Singh', '9845012349', 'vikram@ranbaxy.com', '56 Sector 32, Gurgaon', 'Ranbaxy Laboratories', 'GST06AABCH7890I']
  ];
  const insertSup = db.prepare('INSERT INTO suppliers (name, contact_person, phone, email, address, company, gst_number) VALUES (?, ?, ?, ?, ?, ?, ?)');
  suppliers.forEach(s => insertSup.run(...s));

  // Seed Medicines
  const medicines = [
    ['Amoxicillin 500mg', 'Amoxicillin', 1, 1, 'Broad spectrum antibiotic', 3.50, 5.00, 50, 'Capsule', 'Cipla Ltd'],
    ['Azithromycin 500mg', 'Azithromycin', 1, 3, 'Macrolide antibiotic', 18.00, 25.00, 30, 'Tablet', 'Sun Pharma'],
    ['Ciprofloxacin 500mg', 'Ciprofloxacin', 1, 4, 'Fluoroquinolone antibiotic', 5.00, 8.00, 40, 'Tablet', 'Cipla Ltd'],
    ['Paracetamol 500mg', 'Paracetamol', 2, 1, 'Common pain reliever and antipyretic', 1.00, 2.00, 100, 'Tablet', 'MedPlus Healthcare'],
    ['Ibuprofen 400mg', 'Ibuprofen', 2, 2, 'NSAID for pain and inflammation', 2.50, 4.00, 60, 'Tablet', 'Apollo Pharmacy'],
    ['Diclofenac 50mg', 'Diclofenac Sodium', 2, 3, 'NSAID for pain relief', 2.00, 3.50, 50, 'Tablet', 'Sun Pharma'],
    ['Cetirizine 10mg', 'Cetirizine', 5, 1, 'Antihistamine for allergies', 1.50, 3.00, 80, 'Tablet', 'MedPlus Healthcare'],
    ['Pantoprazole 40mg', 'Pantoprazole', 4, 2, 'Proton pump inhibitor for acidity', 4.00, 7.00, 50, 'Tablet', 'Apollo Pharmacy'],
    ['Omeprazole 20mg', 'Omeprazole', 4, 4, 'Proton pump inhibitor', 3.00, 5.50, 50, 'Capsule', 'Cipla Ltd'],
    ['Metformin 500mg', 'Metformin HCl', 7, 3, 'Oral antidiabetic agent', 2.00, 3.50, 100, 'Tablet', 'Sun Pharma'],
    ['Amlodipine 5mg', 'Amlodipine', 6, 4, 'Calcium channel blocker for hypertension', 3.00, 5.00, 60, 'Tablet', 'Cipla Ltd'],
    ['Atorvastatin 10mg', 'Atorvastatin', 6, 5, 'Statin for cholesterol management', 5.00, 8.00, 40, 'Tablet', 'Ranbaxy Labs'],
    ['Vitamin C 500mg', 'Ascorbic Acid', 8, 1, 'Vitamin C supplement', 2.00, 4.00, 50, 'Tablet', 'MedPlus Healthcare'],
    ['Vitamin D3 1000IU', 'Cholecalciferol', 8, 2, 'Vitamin D supplement', 5.00, 8.00, 30, 'Capsule', 'Apollo Pharmacy'],
    ['B-Complex', 'Vitamin B Complex', 8, 1, 'Multi-vitamin B supplement', 3.00, 5.00, 40, 'Tablet', 'MedPlus Healthcare'],
    ['Betadine Ointment', 'Povidone Iodine', 9, 3, 'Antiseptic ointment', 25.00, 40.00, 20, 'Tube', 'Sun Pharma'],
    ['Cough Syrup (Benadryl)', 'Diphenhydramine', 10, 2, 'Cough suppressant syrup', 45.00, 65.00, 20, 'Bottle', 'Apollo Pharmacy'],
    ['Salbutamol Inhaler', 'Salbutamol', 10, 4, 'Bronchodilator for asthma', 80.00, 120.00, 15, 'Inhaler', 'Cipla Ltd'],
    ['ORS Sachets', 'Oral Rehydration Salts', 11, 1, 'Electrolyte replacement', 5.00, 10.00, 50, 'Sachet', 'MedPlus Healthcare'],
    ['Eye Drops (Refresh)', 'Carboxymethylcellulose', 12, 5, 'Lubricating eye drops', 35.00, 55.00, 15, 'Bottle', 'Ranbaxy Labs'],
    ['Dolo 650', 'Paracetamol', 3, 1, 'Antipyretic for fever', 1.50, 2.50, 100, 'Tablet', 'Micro Labs'],
    ['Monteleukast 10mg', 'Montelukast', 10, 4, 'Leukotriene receptor antagonist', 6.00, 10.00, 30, 'Tablet', 'Cipla Ltd'],
    ['Ranitidine 150mg', 'Ranitidine', 11, 3, 'H2 blocker for acid reflux', 2.50, 4.00, 40, 'Tablet', 'Sun Pharma'],
    ['Losartan 50mg', 'Losartan Potassium', 6, 5, 'ARB for hypertension', 4.00, 7.00, 40, 'Tablet', 'Ranbaxy Labs'],
    ['Glimepiride 2mg', 'Glimepiride', 7, 4, 'Sulfonylurea for diabetes', 3.50, 6.00, 30, 'Tablet', 'Cipla Ltd']
  ];
  const insertMed = db.prepare('INSERT INTO medicines (name, generic_name, category_id, supplier_id, description, purchase_price, selling_price, min_stock_level, unit, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  medicines.forEach(m => insertMed.run(...m));

  // Seed Batches (some good, some near-expiry, some expired, some low stock)
  const fmt = (d) => d.toISOString().split('T')[0];
  const addDays = (n) => { const r = new Date(); r.setDate(r.getDate() + n); return fmt(r); };
  const subDays = (n) => { const r = new Date(); r.setDate(r.getDate() - n); return fmt(r); };

  const batches = [
    [1, 'AMX-B001', subDays(180), addDays(365), 200, 3.50],
    [1, 'AMX-B002', subDays(90), addDays(45), 150, 3.50], // near expiry
    [2, 'AZI-B001', subDays(120), addDays(400), 80, 18.00],
    [3, 'CIP-B001', subDays(60), addDays(300), 100, 5.00],
    [4, 'PAR-B001', subDays(300), addDays(600), 500, 1.00],
    [4, 'PAR-B002', subDays(100), addDays(500), 300, 1.00],
    [5, 'IBU-B001', subDays(150), addDays(450), 150, 2.50],
    [6, 'DIC-B001', subDays(80), addDays(350), 120, 2.00],
    [7, 'CET-B001', subDays(200), addDays(500), 200, 1.50],
    [8, 'PAN-B001', subDays(90), addDays(25), 10, 4.00], // near expiry + low
    [9, 'OME-B001', subDays(60), addDays(400), 80, 3.00],
    [10, 'MET-B001', subDays(120), addDays(365), 250, 2.00],
    [11, 'AML-B001', subDays(90), addDays(300), 150, 3.00],
    [12, 'ATO-B001', subDays(150), addDays(400), 100, 5.00],
    [13, 'VTC-B001', subDays(60), addDays(500), 120, 2.00],
    [14, 'VTD-B001', subDays(90), addDays(60), 60, 5.00], // near expiry
    [15, 'BCO-B001', subDays(180), addDays(400), 90, 3.00],
    [16, 'BET-B001', subDays(120), addDays(300), 30, 25.00],
    [17, 'BEN-B001', subDays(60), addDays(20), 5, 45.00], // low + near expiry
    [18, 'SAL-B001', subDays(90), addDays(365), 20, 80.00],
    [19, 'ORS-B001', subDays(150), addDays(500), 100, 5.00],
    [20, 'EYE-B001', subDays(90), addDays(300), 18, 35.00],
    [21, 'DOL-B001', subDays(60), addDays(450), 400, 1.50],
    [22, 'MON-B001', subDays(120), addDays(365), 60, 6.00],
    [23, 'RAN-B001', subDays(90), subDays(15), 50, 2.50], // expired
    [24, 'LOS-B001', subDays(150), addDays(400), 70, 4.00],
    [25, 'GLI-B001', subDays(60), addDays(365), 30, 3.50]
  ];
  const insertBatch = db.prepare('INSERT INTO batches (medicine_id, batch_number, mfg_date, expiry_date, quantity, purchase_price) VALUES (?, ?, ?, ?, ?, ?)');
  batches.forEach(b => insertBatch.run(...b));

  // Seed sample initial sales
  const insertSale = db.prepare(`
    INSERT INTO sales (invoice_number, user_id, customer_name, customer_phone, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, payment_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
  `);
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const salesData = [
    ['INV-0001', 3, 'Sunil Verma', '9811223344', 150.00, 0, 0, 5, 7.50, 157.50, 'cash', '-2 days'],
    ['INV-0002', 3, 'Meena Kumari', '9822334455', 240.00, 5, 12.00, 5, 11.40, 239.40, 'upi', '-1 day'],
    ['INV-0003', 2, 'Rohan Gupta', '9833445566', 85.00, 0, 0, 5, 4.25, 89.25, 'cash', '-3 hours'],
    ['INV-0004', 3, 'Ananya Das', '9844556677', 420.00, 10, 42.00, 5, 18.90, 396.90, 'card', '-1 hour']
  ];

  salesData.forEach(s => {
    insertSale.run(...s);
  });

  insertSaleItem.run(1, 4, 5, 50, 2.00, 100.00);
  insertSaleItem.run(1, 7, 9, 10, 3.00, 30.00);
  insertSaleItem.run(2, 2, 3, 6, 25.00, 150.00);
  insertSaleItem.run(2, 8, 10, 10, 7.00, 70.00);
  insertSaleItem.run(3, 21, 23, 20, 2.50, 50.00);
  insertSaleItem.run(3, 19, 21, 3, 10.00, 30.00);
  insertSaleItem.run(4, 18, 20, 2, 120.00, 240.00);
  insertSaleItem.run(4, 1, 1, 20, 5.00, 100.00);

  console.log('✅ SQLite database initialized and seeded successfully!');
}

function adaptSql(sql) {
  let s = sql;
  // Replace MySQL specific interval syntax
  s = s.replace(/DATE_ADD\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s*(\d+)\s*DAY\s*\)/gi, "date(CURDATE(), '+$1 days')");
  s = s.replace(/DATE_SUB\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s*\?\s*DAY\s*\)/gi, "date(CURDATE(), '-' || ? || ' days')");
  s = s.replace(/DATE\s*\(\s*created_at\s*\)\s*=\s*CURDATE\(\)/gi, "DATE(created_at) = CURDATE()");
  return s;
}

function createSqliteWrapper() {
  const db = getSqliteDb();

  const executeQuery = (sql, params = []) => {
    const adapted = adaptSql(sql);
    const cleanParams = (params || []).map(p => {
      if (typeof p === 'boolean') return p ? 1 : 0;
      if (p === undefined) return null;
      return p;
    });

    const trimmed = adapted.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA');

    if (isSelect) {
      const stmt = db.prepare(adapted);
      const rows = stmt.all(...cleanParams);
      // Ensure null prototypes are plain objects if needed
      const cleanRows = rows.map(r => ({ ...r }));
      return [cleanRows, []];
    } else {
      const stmt = db.prepare(adapted);
      const info = stmt.run(...cleanParams);
      const resultObj = {
        insertId: Number(info.lastInsertRowid || 0),
        affectedRows: Number(info.changes || 0)
      };
      return [resultObj, []];
    }
  };

  const poolWrapper = {
    async query(sql, params) {
      return executeQuery(sql, params);
    },
    async execute(sql, params) {
      return executeQuery(sql, params);
    },
    async getConnection() {
      return {
        async query(sql, params) {
          return executeQuery(sql, params);
        },
        async beginTransaction() {
          db.exec('BEGIN TRANSACTION;');
        },
        async commit() {
          db.exec('COMMIT;');
        },
        async rollback() {
          try {
            db.exec('ROLLBACK;');
          } catch (e) {
            // ignore if not in transaction
          }
        },
        release() {
          // No-op for SQLite
        }
      };
    }
  };

  return poolWrapper;
}

module.exports = {
  createSqliteWrapper,
  getSqliteDb
};
