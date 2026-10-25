const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'grand_azure_hotel',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Helper for test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ [MySQL] Successfully connected to database: "${process.env.DB_NAME || 'grand_azure_hotel'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (err) {
    console.error(`❌ [MySQL] Connection failed (${err.code}): ${err.message}`);
    console.error(`💡 TIP: Ensure MySQL is running and that credentials in .env are correct.`);
    console.error(`💡 TIP: If database is not created, execute 'database.sql' in MySQL Workbench.`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
