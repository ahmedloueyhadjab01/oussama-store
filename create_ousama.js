const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createOusama() {
  // Fix the DATABASE_URL if it has double 'DATABASE_URL='
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('DATABASE_URL=')) {
      dbUrl = dbUrl.replace('DATABASE_URL=', '');
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    
    // Hash password
    const hashedPassword = await bcrypt.hash('ousamastore.dz28', 10);
    
    // Insert new user
    const query = `
      INSERT INTO users (username, password, role, store_name, store_slug)
      VALUES ($1, $2, 'admin', 'Oussama Store', 'default')
      RETURNING id, username;
    `;
    const res = await client.query(query, ['oussamastore', hashedPassword]);
    console.log('✅ تم إنشاء حساب أسامة بنجاح:', res.rows[0]);

    // Update MAIN_STORE_USER_ID in .env
    const fs = require('fs');
    let envContent = fs.readFileSync('.env', 'utf8');
    envContent = envContent.replace(/MAIN_STORE_USER_ID=\d+/, `MAIN_STORE_USER_ID=${res.rows[0].id}`);
    fs.writeFileSync('.env', envContent);
    console.log('✅ تم تحديث MAIN_STORE_USER_ID في ملف .env ليطابق حساب أسامة.');
    
  } catch (err) {
    console.error('❌ خطأ:', err);
  } finally {
    await client.end();
  }
}
createOusama();
