require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("UPDATE users SET store_slug = 'ovaro_28' WHERE id = 2;")
  .then(res => { console.log('Store slug updated to ovaro_28!'); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
