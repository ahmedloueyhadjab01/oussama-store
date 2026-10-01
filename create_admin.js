const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const username = (process.env.ADMIN_USERNAME || '').trim();
    const email = (process.env.ADMIN_EMAIL || `${username}@mystore.dz`).trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!username || !email || password.length < 12) {
      throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, and an ADMIN_PASSWORD of at least 12 characters.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    await db.query(
      `INSERT INTO users (store_name, name, email, password_hash, role, trial_ends_at)
       VALUES ($1, $2, $3, $4, 'admin', $5)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         store_name = EXCLUDED.store_name,
         password_hash = EXCLUDED.password_hash,
         role = 'admin'`,
      [username, username, email, passwordHash, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()]
    );
    console.log('Account created successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
