const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  console.log('🔧 Creating database and tables...');

  // Create database
  await conn.query('CREATE DATABASE IF NOT EXISTS pharmacy_db');
  await conn.query('USE pharmacy_db');

  // Drop tables in reverse dependency order
  await conn.query(`
    DROP TABLE IF EXISTS purchase_items;
    DROP TABLE IF EXISTS purchases;
    DROP TABLE IF EXISTS sale_items;
    DROP TABLE IF EXISTS sales;
    DROP TABLE IF EXISTS stock_movements;
    DROP TABLE IF EXISTS batches;
    DROP TABLE IF EXISTS medicines;
    DROP TABLE IF EXISTS suppliers;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
  `);

  // Create tables
  await conn.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      role ENUM('admin', 'pharmacist', 'cashier') NOT NULL DEFAULT 'pharmacist',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      contact_person VARCHAR(100),
      phone VARCHAR(20),
      email VARCHAR(100),
      address TEXT,
      company VARCHAR(150),
      gst_number VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await conn.query(`
    CREATE TABLE medicines (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      generic_name VARCHAR(200),
      category_id INT,
      supplier_id INT,
      description TEXT,
      purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      min_stock_level INT DEFAULT 10,
      unit VARCHAR(50) DEFAULT 'Tablet',
      manufacturer VARCHAR(200),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE batches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      medicine_id INT NOT NULL,
      batch_number VARCHAR(100) NOT NULL,
      mfg_date DATE,
      expiry_date DATE NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      purchase_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    )
  `);

  await conn.query(`
    CREATE TABLE stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      medicine_id INT NOT NULL,
      batch_id INT,
      type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
      quantity INT NOT NULL,
      reference_type VARCHAR(50),
      reference_id INT,
      notes TEXT,
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      user_id INT,
      customer_name VARCHAR(150),
      customer_phone VARCHAR(20),
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      tax_percent DECIMAL(5,2) DEFAULT 5,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) NOT NULL DEFAULT 0,
      payment_method ENUM('cash', 'card', 'upi', 'other') DEFAULT 'cash',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE sale_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sale_id INT NOT NULL,
      medicine_id INT NOT NULL,
      batch_id INT,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE purchases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT,
      user_id INT,
      invoice_number VARCHAR(100),
      total DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      status ENUM('pending', 'received', 'cancelled') DEFAULT 'received',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await conn.query(`
    CREATE TABLE purchase_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_id INT NOT NULL,
      medicine_id INT NOT NULL,
      batch_id INT,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    )
  `);

  console.log('✅ Tables created');

  // Seed Users
  const adminHash = await bcrypt.hash('admin123', 10);
  const pharmacistHash = await bcrypt.hash('pharma123', 10);
  const cashierHash = await bcrypt.hash('cash123', 10);

  await conn.query(`
    INSERT INTO users (username, password_hash, full_name, email, phone, role) VALUES
    ('admin', ?, 'Dr. Rajesh Kumar', 'admin@pharmacy.com', '9876543210', 'admin'),
    ('pharmacist', ?, 'Priya Sharma', 'priya@pharmacy.com', '9876543211', 'pharmacist'),
    ('cashier', ?, 'Amit Patel', 'amit@pharmacy.com', '9876543212', 'cashier')
  `, [adminHash, pharmacistHash, cashierHash]);
  console.log('✅ Users seeded');

  // Seed Categories
  await conn.query(`
    INSERT INTO categories (name, description) VALUES
    ('Antibiotics', 'Medicines used to treat bacterial infections'),
    ('Analgesics', 'Pain relieving medicines'),
    ('Antipyretics', 'Fever reducing medicines'),
    ('Antacids', 'Medicines for acidity and stomach related issues'),
    ('Antihistamines', 'Allergy relief medicines'),
    ('Cardiovascular', 'Heart and blood pressure medicines'),
    ('Diabetes', 'Medicines for diabetes management'),
    ('Vitamins & Supplements', 'Nutritional supplements and vitamins'),
    ('Dermatology', 'Skin care medicines and ointments'),
    ('Respiratory', 'Medicines for cough, cold, and respiratory issues'),
    ('Gastrointestinal', 'Medicines for digestive system'),
    ('Ophthalmic', 'Eye care medicines and drops')
  `);
  console.log('✅ Categories seeded');

  // Seed Suppliers
  await conn.query(`
    INSERT INTO suppliers (name, contact_person, phone, email, address, company, gst_number) VALUES
    ('MedPlus Distributors', 'Suresh Reddy', '9845012345', 'suresh@medplus.com', '12 MG Road, Bangalore', 'MedPlus Healthcare Ltd', 'GST29AABCD1234E'),
    ('Apollo Pharma Supply', 'Kavitha Nair', '9845012346', 'kavitha@apollo.com', '45 Anna Nagar, Chennai', 'Apollo Pharmacy Pvt Ltd', 'GST33AABCE5678F'),
    ('Sun Pharma Direct', 'Rahul Mehra', '9845012347', 'rahul@sunpharma.com', '78 Andheri East, Mumbai', 'Sun Pharmaceutical Industries', 'GST27AABCF9012G'),
    ('Cipla Distribution', 'Deepa Joshi', '9845012348', 'deepa@cipla.com', '23 Baner Road, Pune', 'Cipla Ltd', 'GST27AABCG3456H'),
    ('Ranbaxy Wellness', 'Vikram Singh', '9845012349', 'vikram@ranbaxy.com', '56 Sector 32, Gurgaon', 'Ranbaxy Laboratories', 'GST06AABCH7890I')
  `);
  console.log('✅ Suppliers seeded');

  // Seed Medicines
  await conn.query(`
    INSERT INTO medicines (name, generic_name, category_id, supplier_id, description, purchase_price, selling_price, min_stock_level, unit, manufacturer) VALUES
    ('Amoxicillin 500mg', 'Amoxicillin', 1, 1, 'Broad spectrum antibiotic', 3.50, 5.00, 50, 'Capsule', 'Cipla Ltd'),
    ('Azithromycin 500mg', 'Azithromycin', 1, 3, 'Macrolide antibiotic', 18.00, 25.00, 30, 'Tablet', 'Sun Pharma'),
    ('Ciprofloxacin 500mg', 'Ciprofloxacin', 1, 4, 'Fluoroquinolone antibiotic', 5.00, 8.00, 40, 'Tablet', 'Cipla Ltd'),
    ('Paracetamol 500mg', 'Paracetamol', 2, 1, 'Common pain reliever and antipyretic', 1.00, 2.00, 100, 'Tablet', 'MedPlus Healthcare'),
    ('Ibuprofen 400mg', 'Ibuprofen', 2, 2, 'NSAID for pain and inflammation', 2.50, 4.00, 60, 'Tablet', 'Apollo Pharmacy'),
    ('Diclofenac 50mg', 'Diclofenac Sodium', 2, 3, 'NSAID for pain relief', 2.00, 3.50, 50, 'Tablet', 'Sun Pharma'),
    ('Cetirizine 10mg', 'Cetirizine', 5, 1, 'Antihistamine for allergies', 1.50, 3.00, 80, 'Tablet', 'MedPlus Healthcare'),
    ('Pantoprazole 40mg', 'Pantoprazole', 4, 2, 'Proton pump inhibitor for acidity', 4.00, 7.00, 50, 'Tablet', 'Apollo Pharmacy'),
    ('Omeprazole 20mg', 'Omeprazole', 4, 4, 'Proton pump inhibitor', 3.00, 5.50, 50, 'Capsule', 'Cipla Ltd'),
    ('Metformin 500mg', 'Metformin HCl', 7, 3, 'Oral antidiabetic agent', 2.00, 3.50, 100, 'Tablet', 'Sun Pharma'),
    ('Amlodipine 5mg', 'Amlodipine', 6, 4, 'Calcium channel blocker for hypertension', 3.00, 5.00, 60, 'Tablet', 'Cipla Ltd'),
    ('Atorvastatin 10mg', 'Atorvastatin', 6, 5, 'Statin for cholesterol management', 5.00, 8.00, 40, 'Tablet', 'Ranbaxy Labs'),
    ('Vitamin C 500mg', 'Ascorbic Acid', 8, 1, 'Vitamin C supplement', 2.00, 4.00, 50, 'Tablet', 'MedPlus Healthcare'),
    ('Vitamin D3 1000IU', 'Cholecalciferol', 8, 2, 'Vitamin D supplement', 5.00, 8.00, 30, 'Capsule', 'Apollo Pharmacy'),
    ('B-Complex', 'Vitamin B Complex', 8, 1, 'Multi-vitamin B supplement', 3.00, 5.00, 40, 'Tablet', 'MedPlus Healthcare'),
    ('Betadine Ointment', 'Povidone Iodine', 9, 3, 'Antiseptic ointment', 25.00, 40.00, 20, 'Tube', 'Sun Pharma'),
    ('Cough Syrup (Benadryl)', 'Diphenhydramine', 10, 2, 'Cough suppressant syrup', 45.00, 65.00, 20, 'Bottle', 'Apollo Pharmacy'),
    ('Salbutamol Inhaler', 'Salbutamol', 10, 4, 'Bronchodilator for asthma', 80.00, 120.00, 15, 'Inhaler', 'Cipla Ltd'),
    ('ORS Sachets', 'Oral Rehydration Salts', 11, 1, 'Electrolyte replacement', 5.00, 10.00, 50, 'Sachet', 'MedPlus Healthcare'),
    ('Eye Drops (Refresh)', 'Carboxymethylcellulose', 12, 5, 'Lubricating eye drops', 35.00, 55.00, 15, 'Bottle', 'Ranbaxy Labs'),
    ('Dolo 650', 'Paracetamol', 3, 1, 'Antipyretic for fever', 1.50, 2.50, 100, 'Tablet', 'Micro Labs'),
    ('Monteleukast 10mg', 'Montelukast', 10, 4, 'Leukotriene receptor antagonist', 6.00, 10.00, 30, 'Tablet', 'Cipla Ltd'),
    ('Ranitidine 150mg', 'Ranitidine', 11, 3, 'H2 blocker for acid reflux', 2.50, 4.00, 40, 'Tablet', 'Sun Pharma'),
    ('Losartan 50mg', 'Losartan Potassium', 6, 5, 'ARB for hypertension', 4.00, 7.00, 40, 'Tablet', 'Ranbaxy Labs'),
    ('Glimepiride 2mg', 'Glimepiride', 7, 4, 'Sulfonylurea for diabetes', 3.50, 6.00, 30, 'Tablet', 'Cipla Ltd')
  `);
  console.log('✅ Medicines seeded');

  // Seed Batches
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const subDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };

  await conn.query(`
    INSERT INTO batches (medicine_id, batch_number, mfg_date, expiry_date, quantity, purchase_price) VALUES
    (1, 'AMX-B001', ?, ?, 200, 3.50),
    (1, 'AMX-B002', ?, ?, 150, 3.50),
    (2, 'AZI-B001', ?, ?, 80, 18.00),
    (3, 'CIP-B001', ?, ?, 100, 5.00),
    (4, 'PAR-B001', ?, ?, 500, 1.00),
    (4, 'PAR-B002', ?, ?, 300, 1.00),
    (5, 'IBU-B001', ?, ?, 150, 2.50),
    (6, 'DIC-B001', ?, ?, 120, 2.00),
    (7, 'CET-B001', ?, ?, 200, 1.50),
    (8, 'PAN-B001', ?, ?, 100, 4.00),
    (9, 'OME-B001', ?, ?, 80, 3.00),
    (10, 'MET-B001', ?, ?, 250, 2.00),
    (11, 'AML-B001', ?, ?, 150, 3.00),
    (12, 'ATO-B001', ?, ?, 100, 5.00),
    (13, 'VTC-B001', ?, ?, 120, 2.00),
    (14, 'VTD-B001', ?, ?, 60, 5.00),
    (15, 'BCO-B001', ?, ?, 90, 3.00),
    (16, 'BET-B001', ?, ?, 30, 25.00),
    (17, 'BEN-B001', ?, ?, 25, 45.00),
    (18, 'SAL-B001', ?, ?, 20, 80.00),
    (19, 'ORS-B001', ?, ?, 100, 5.00),
    (20, 'EYE-B001', ?, ?, 18, 35.00),
    (21, 'DOL-B001', ?, ?, 400, 1.50),
    (22, 'MON-B001', ?, ?, 60, 6.00),
    (23, 'RAN-B001', ?, ?, 80, 2.50),
    (24, 'LOS-B001', ?, ?, 70, 4.00),
    (25, 'GLI-B001', ?, ?, 50, 3.50),
    (4, 'PAR-B003', ?, ?, 50, 1.00),
    (7, 'CET-B002', ?, ?, 8, 1.50),
    (10, 'MET-B002', ?, ?, 5, 2.00)
  `, [
    fmt(subDays(today, 180)), fmt(addDays(today, 545)),   // AMX-B001 - good
    fmt(subDays(today, 90)), fmt(addDays(today, 640)),    // AMX-B002 - good
    fmt(subDays(today, 120)), fmt(addDays(today, 245)),   // AZI-B001 - good
    fmt(subDays(today, 150)), fmt(addDays(today, 210)),   // CIP-B001 - good
    fmt(subDays(today, 200)), fmt(addDays(today, 525)),   // PAR-B001 - good
    fmt(subDays(today, 60)), fmt(addDays(today, 670)),    // PAR-B002 - good
    fmt(subDays(today, 100)), fmt(addDays(today, 265)),   // IBU-B001 - good
    fmt(subDays(today, 130)), fmt(addDays(today, 235)),   // DIC-B001 - good
    fmt(subDays(today, 90)), fmt(addDays(today, 640)),    // CET-B001 - good
    fmt(subDays(today, 110)), fmt(addDays(today, 255)),   // PAN-B001 - good
    fmt(subDays(today, 160)), fmt(addDays(today, 205)),   // OME-B001 - good
    fmt(subDays(today, 140)), fmt(addDays(today, 590)),   // MET-B001 - good
    fmt(subDays(today, 70)), fmt(addDays(today, 660)),    // AML-B001 - good
    fmt(subDays(today, 80)), fmt(addDays(today, 285)),    // ATO-B001 - good
    fmt(subDays(today, 50)), fmt(addDays(today, 680)),    // VTC-B001 - good
    fmt(subDays(today, 40)), fmt(addDays(today, 325)),    // VTD-B001 - good
    fmt(subDays(today, 60)), fmt(addDays(today, 305)),    // BCO-B001 - good
    fmt(subDays(today, 30)), fmt(addDays(today, 700)),    // BET-B001 - good
    fmt(subDays(today, 45)), fmt(addDays(today, 320)),    // BEN-B001 - good
    fmt(subDays(today, 20)), fmt(addDays(today, 710)),    // SAL-B001 - good
    fmt(subDays(today, 55)), fmt(addDays(today, 310)),    // ORS-B001 - good
    fmt(subDays(today, 25)), fmt(addDays(today, 340)),    // EYE-B001 - good
    fmt(subDays(today, 100)), fmt(addDays(today, 265)),   // DOL-B001 - good
    fmt(subDays(today, 75)), fmt(addDays(today, 290)),    // MON-B001 - good
    fmt(subDays(today, 85)), fmt(addDays(today, 280)),    // RAN-B001 - good
    fmt(subDays(today, 65)), fmt(addDays(today, 300)),    // LOS-B001 - good
    fmt(subDays(today, 95)), fmt(addDays(today, 270)),    // GLI-B001 - good
    fmt(subDays(today, 350)), fmt(addDays(today, 15)),    // PAR-B003 - near expiry (15 days)
    fmt(subDays(today, 700)), fmt(addDays(today, 30)),    // CET-B002 - near expiry + low stock
    fmt(subDays(today, 720)), fmt(subDays(today, 5))      // MET-B002 - expired
  ]);
  console.log('✅ Batches seeded');

  // Seed some stock movements
  for (let i = 1; i <= 27; i++) {
    await conn.query(
      'INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, reference_type, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [i <= 25 ? i : (i === 26 ? 4 : 7), i, 'IN', i <= 25 ? [200,150,80,100,500,300,150,120,200,100,80,250,150,100,120,60,90,30,25,20,100,18,400,60,80,70,50][i-1] || 100 : (i === 26 ? 50 : 8), 'initial', 'Initial stock', 1]
    );
  }
  console.log('✅ Stock movements seeded');

  // Seed sample sales (last 30 days)
  const sampleSales = [
    { inv: 'INV-0001', customer: 'Anita Desai', items: [{mid: 4, qty: 10, price: 2.00}, {mid: 7, qty: 5, price: 3.00}], days_ago: 28 },
    { inv: 'INV-0002', customer: 'Ravi Shankar', items: [{mid: 1, qty: 15, price: 5.00}, {mid: 8, qty: 10, price: 7.00}], days_ago: 25 },
    { inv: 'INV-0003', customer: 'Meena Kumari', items: [{mid: 21, qty: 20, price: 2.50}, {mid: 17, qty: 1, price: 65.00}], days_ago: 22 },
    { inv: 'INV-0004', customer: 'Sunil Gavaskar', items: [{mid: 10, qty: 30, price: 3.50}, {mid: 11, qty: 15, price: 5.00}], days_ago: 20 },
    { inv: 'INV-0005', customer: 'Lakshmi Bai', items: [{mid: 13, qty: 10, price: 4.00}, {mid: 14, qty: 5, price: 8.00}], days_ago: 18 },
    { inv: 'INV-0006', customer: 'Prakash Jha', items: [{mid: 2, qty: 6, price: 25.00}, {mid: 9, qty: 10, price: 5.50}], days_ago: 15 },
    { inv: 'INV-0007', customer: 'Neha Gupta', items: [{mid: 5, qty: 10, price: 4.00}, {mid: 6, qty: 10, price: 3.50}], days_ago: 12 },
    { inv: 'INV-0008', customer: 'Arun Kumar', items: [{mid: 4, qty: 20, price: 2.00}, {mid: 21, qty: 15, price: 2.50}], days_ago: 10 },
    { inv: 'INV-0009', customer: 'Sunita Rao', items: [{mid: 18, qty: 1, price: 120.00}, {mid: 22, qty: 10, price: 10.00}], days_ago: 7 },
    { inv: 'INV-0010', customer: 'Vijay Singh', items: [{mid: 12, qty: 15, price: 8.00}, {mid: 24, qty: 10, price: 7.00}], days_ago: 5 },
    { inv: 'INV-0011', customer: 'Pooja Mehta', items: [{mid: 3, qty: 10, price: 8.00}, {mid: 7, qty: 20, price: 3.00}], days_ago: 3 },
    { inv: 'INV-0012', customer: 'Kiran Reddy', items: [{mid: 4, qty: 30, price: 2.00}, {mid: 15, qty: 10, price: 5.00}], days_ago: 1 },
    { inv: 'INV-0013', customer: 'Walk-in Customer', items: [{mid: 1, qty: 10, price: 5.00}, {mid: 21, qty: 10, price: 2.50}], days_ago: 0 },
    { inv: 'INV-0014', customer: 'Deepak Chopra', items: [{mid: 19, qty: 5, price: 10.00}, {mid: 20, qty: 2, price: 55.00}], days_ago: 0 }
  ];

  for (const sale of sampleSales) {
    const subtotal = sale.items.reduce((sum, it) => sum + (it.qty * it.price), 0);
    const discountPercent = 0;
    const discountAmount = 0;
    const taxPercent = 5;
    const taxAmount = (subtotal * taxPercent) / 100;
    const total = subtotal + taxAmount;
    const saleDate = fmt(subDays(today, sale.days_ago));

    const [saleResult] = await conn.query(
      `INSERT INTO sales (invoice_number, user_id, customer_name, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, payment_method, created_at)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'cash', ?)`,
      [sale.inv, sale.customer, subtotal, discountPercent, discountAmount, taxPercent, taxAmount, total, saleDate + ' 10:30:00']
    );
    const saleId = saleResult.insertId;

    for (const item of sale.items) {
      // Get first batch for this medicine
      const [batches] = await conn.query('SELECT id FROM batches WHERE medicine_id = ? LIMIT 1', [item.mid]);
      const batchId = batches.length > 0 ? batches[0].id : null;

      await conn.query(
        'INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [saleId, item.mid, batchId, item.qty, item.price, item.qty * item.price]
      );

      // Deduct from batch
      if (batchId) {
        await conn.query('UPDATE batches SET quantity = quantity - ? WHERE id = ? AND quantity >= ?', [item.qty, batchId, item.qty]);
      }
    }
  }
  console.log('✅ Sample sales seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:      username: admin       password: admin123');
  console.log('   Pharmacist: username: pharmacist  password: pharma123');
  console.log('   Cashier:    username: cashier      password: cash123');

  await conn.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
