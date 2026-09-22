const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearAndSeed() {
  await client.connect();
  console.log('Clearing old data...');
  const VENDOR_ID = 2;
  
  await client.query(`DELETE FROM campaign_ad_spend WHERE user_id = $1`, [VENDOR_ID]);
  await client.query(`DELETE FROM orders WHERE user_id = $1`, [VENDOR_ID]);
  await client.query(`DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE user_id = $1)`, [VENDOR_ID]);
  await client.query(`DELETE FROM products WHERE user_id = $1`, [VENDOR_ID]);
  await client.query(`DELETE FROM categories WHERE user_id = $1`, [VENDOR_ID]);
  
  console.log('Cleared. Re-running the seeder...');
  await client.end();
}

clearAndSeed();
