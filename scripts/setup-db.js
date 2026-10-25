const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('Connecting to MySQL server...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('Reading database.sql...');
    const sqlPath = path.join(__dirname, '..', 'database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying database schema and seed data...');
    await connection.query(sqlContent);
    console.log('✅ Database setup completed successfully!');
  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    if (err.sqlMessage) console.error('SQL details:', err.sqlMessage);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();
