require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT id, store_slug FROM users WHERE id = 2;")
  .then(res => { console.table(res.rows); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
