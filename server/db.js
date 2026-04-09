// ═══════════════════════════════════════════
//  SCMS — MySQL Connection Pool
// ═══════════════════════════════════════════

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Create connection pool using either a connection string (useful for Render/Aiven)
// or individual environment variables (with localhost fallback for local testing)
const isCloud = process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud');

const pool = process.env.DB_URL 
  ? mysql.createPool({ 
      uri: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Root12345',
      database: process.env.DB_NAME || 'scms_db',
      ssl: isCloud ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

module.exports = pool;
