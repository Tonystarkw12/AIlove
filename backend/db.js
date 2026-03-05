require('dotenv').config(); // Ensure environment variables are loaded
const { Pool } = require('pg');

// SSL configuration - disable for local development
const sslConfig = process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: false
} : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig
});

// Optional: Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client for initial connection test (db.js)', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing initial connection test query (db.js)', err.stack);
    }
    console.log('Successfully connected to PostgreSQL (from db.js). Current time from DB:', result.rows[0].now);
  });
});

module.exports = pool;
