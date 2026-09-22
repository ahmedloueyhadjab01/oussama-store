const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const passwordHash = await bcrypt.hash('kalkoul.dz28', 10);
    const now = new Date();
    await db.query(
      `INSERT INTO users (store_name, name, email, password_hash, role, trial_ends_at) VALUES ('Kalkoul Store', 'kalkoul.dz', 'kalkoul.dz', $1, 'admin', $2)`,
      [passwordHash, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()]
    );
    console.log('Account created successfully');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
