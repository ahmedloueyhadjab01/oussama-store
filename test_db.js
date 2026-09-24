require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const res = await pool.query("SELECT id, user_id, name, is_active FROM products WHERE is_active = 1 LIMIT 5;");
  console.table(res.rows);
  pool.end();
}
test();
