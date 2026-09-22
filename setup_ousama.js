const db = require('./db.js');
const bcrypt = require('bcryptjs');

async function setup() {
  try {
    console.log('🔄 Initializing database schema...');
    await db.initDb();
    
    console.log('👤 Creating Oussama user...');
    const hash = await bcrypt.hash('ousamastore.dz28', 10);
    
    // Calculate trial dates
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const subEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const query = `
      INSERT INTO users (name, email, password_hash, role, subscription_plan, subscription_status, trial_ends_at, subscription_ends_at, store_name, store_slug)
      VALUES ($1, $2, $3, 'admin', 'annual', 'active', $4, $5, 'Oussama Store', 'default')
      RETURNING id, name;
    `;
    const res = await db.query(query, ['oussamastore', 'oussamastore@mystore.dz', hash, trialEnd, subEnd]);
    
    console.log('✅ تم إنشاء الحساب بنجاح:', res.rows[0]);
    console.log('اسم المستخدم:', 'oussamastore');
    console.log('كلمة السر:', 'ousamastore.dz28');

    // Create a default category so the store isn't empty
    await db.query(`INSERT INTO categories (user_id, name, slug) VALUES ($1, 'ملابس', 'clothes') ON CONFLICT DO NOTHING`, [res.rows[0].id]);

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    process.exit(0);
  }
}
setup();
