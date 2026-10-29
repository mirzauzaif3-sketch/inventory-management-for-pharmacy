const mysql = require('mysql2/promise');
const { createSqliteWrapper } = require('./sqliteEngine');
require('dotenv').config();

let activeDb = null;
let useSqlite = false;
let sqliteWrapper = null;

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const hasRemoteMysql = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';

// In Vercel serverless functions without remote MySQL configured, activate SQLite immediately to avoid connection timeout
if (isServerless && !hasRemoteMysql) {
  useSqlite = true;
  sqliteWrapper = createSqliteWrapper();
  console.log('⚡ Vercel serverless environment detected: using built-in SQLite engine.');
}

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmacy_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

function getActiveDb() {
  if (useSqlite) {
    if (!sqliteWrapper) {
      sqliteWrapper = createSqliteWrapper();
    }
    return sqliteWrapper;
  }
  return mysqlPool;
}

// Test MySQL connection once at startup if not already running SQLite
if (!useSqlite) {
  mysqlPool.getConnection()
    .then(conn => {
      console.log('✅ MySQL connected successfully to', process.env.DB_NAME || 'pharmacy_db');
      conn.release();
    })
    .catch(err => {
      console.warn(`⚠️ MySQL not reachable (${err.message}).`);
      console.log('🔄 Seamlessly activating built-in Pharmacy SQLite database (zero-config, high performance)...');
      useSqlite = true;
      sqliteWrapper = createSqliteWrapper();
      console.log('✅ Built-in database active and ready!');
    });
}

const proxy = {
  async query(sql, params) {
    try {
      const db = getActiveDb();
      return await db.query(sql, params);
    } catch (err) {
      if (!useSqlite && (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'PROTOCOL_CONNECTION_LOST')) {
        console.warn(`⚠️ MySQL error (${err.message}), falling back to built-in SQLite engine...`);
        useSqlite = true;
        sqliteWrapper = createSqliteWrapper();
        return await sqliteWrapper.query(sql, params);
      }
      throw err;
    }
  },
  async execute(sql, params) {
    return this.query(sql, params);
  },
  async getConnection() {
    try {
      const db = getActiveDb();
      return await db.getConnection();
    } catch (err) {
      if (!useSqlite) {
        console.warn(`⚠️ MySQL connection error, falling back to built-in SQLite engine...`);
        useSqlite = true;
        sqliteWrapper = createSqliteWrapper();
        return await sqliteWrapper.getConnection();
      }
      throw err;
    }
  }
};

module.exports = proxy;
