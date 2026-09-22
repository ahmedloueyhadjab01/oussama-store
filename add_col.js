const { Client } = require('pg');
require('dotenv').config();

async function addCol() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query('ALTER TABLE vendor_shipping_configs ADD COLUMN manual_provider_name VARCHAR(150)');
    console.log('Column added!');
  } catch (e) {
    console.log('Error or already exists:', e.message);
  }
  await client.end();
}
addCol();
