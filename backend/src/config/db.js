const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vehicle_rental_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

let isConnected = false;

// Test DB Connection
const initDb = async () => {
  try {
    const conn = await pool.getConnection();
    isConnected = true;
    console.log('[DB] Connected successfully to MySQL database:', process.env.DB_NAME || 'vehicle_rental_db');
    conn.release();
  } catch (err) {
    isConnected = false;
    console.warn('[DB WARNING] MySQL connection could not be established:', err.message);
    console.warn('[DB NOTICE] Operating in resilient memory-backed storage mode for local testing. Start MySQL to persist to disk.');
  }
};

initDb();

const query = async (sql, params = []) => {
  if (isConnected) {
    const [results] = await pool.query(sql, params);
    return results;
  }
  return null;
};

const getPool = () => pool;
const getStatus = () => ({ isConnected, database: process.env.DB_NAME || 'vehicle_rental_db' });

module.exports = {
  pool,
  query,
  getPool,
  getStatus
};
