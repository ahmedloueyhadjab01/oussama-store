require('dotenv').config();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const rawConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

let pool;
let databaseMode = 'postgres';


// ─── SQLite wrapper يحاكي واجهة pg Pool ──────────────────────────────
let sqliteInstance = null; // مشاركة الـ instance للـ initDb

function createSqlitePool() {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'eco-store.sqlite');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON'); // نُفعّل بعد إنشاء الجداول
  sqliteInstance = sqlite;

  console.log(`✅ قاعدة البيانات SQLite دائمة: ${dbPath}`);

  function convertSql(sql) {
    return sql
      .replace(/::jsonb/gi, '')
      .replace(/\\bNOW\\(\\)/gi, 'CURRENT_TIMESTAMP')
      .replace(/\$(\d+)/g, '@p$1')
      .replace(/SERIAL\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/TIMESTAMPTZ/gi, 'TEXT')
      .replace(/NUMERIC\(\d+,\s*\d+\)/gi, 'REAL')
      .replace(/NUMERIC\(\d+\)/gi, 'REAL')
      .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
      .replace(/JSONB/gi, 'TEXT')
      .replace(/ILIKE/gi, 'LIKE')
      .replace(/ON CONFLICT \(email\) DO NOTHING/gi, 'ON CONFLICT(email) DO NOTHING')
      .replace(/ON CONFLICT \(username\) DO NOTHING/gi, 'ON CONFLICT(username) DO NOTHING')
      .replace(/ON CONFLICT \(user_id\) DO NOTHING/gi, 'ON CONFLICT(user_id) DO NOTHING')
      .replace(/ON CONFLICT \(wilaya_code\) DO NOTHING/gi, 'ON CONFLICT(wilaya_code) DO NOTHING');
  }


  function convertParams(params) {
    if (!Array.isArray(params)) return params;
    const obj = {};
    params.forEach((v, i) => { obj['p' + (i + 1)] = v; });
    return obj;
  }
  const fakePool = {
    query: (sql, params = []) => {
      try {
        const trimmed = sql.trim();
        // إذا كانت schema (عدة جداول)، نفّذها عبر exec
        if (!params.length && /CREATE\s+TABLE/i.test(trimmed)) {
          sqlite.exec(convertSql(trimmed));
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        const converted = convertSql(trimmed);

        // INSERT/UPDATE/DELETE ... RETURNING
        if (/RETURNING/i.test(converted)) {
          const prepared = sqlite.prepare(converted);
          const rows = prepared.all(convertParams(params));
          return Promise.resolve({ rows, rowCount: rows.length });
        }

        const upper = converted.trimStart().toUpperCase();

        if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
          const prepared = sqlite.prepare(converted);
          const rows = prepared.all(convertParams(params));
          return Promise.resolve({ rows, rowCount: rows.length });
        }

        // CREATE INDEX / CREATE TABLE / ALTER TABLE
        if (upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP')) {
          try { sqlite.exec(converted); } catch (e) { /* ignore if exists */ }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        // INSERT / UPDATE / DELETE
        const prepared = sqlite.prepare(converted);
        const info = prepared.run(convertParams(params));
        const rows = [];
        if (upper.startsWith('INSERT') && info.lastInsertRowid) {
          try {
            const tableMatch = converted.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
            if (tableMatch) {
              const row = sqlite.prepare(`SELECT * FROM ${tableMatch[1]} WHERE rowid = ?`).get(info.lastInsertRowid);
              if (row) rows.push(row);
            }
          } catch {}
        }
        return Promise.resolve({ rows, rowCount: info.changes });
      } catch (e) {
        return Promise.reject(new Error(`SQLite Error [${sql.substring(0, 60)}...]: ${e.message}`));
      }
    },
    connect: () => {
      const client = { query: fakePool.query, release: () => {} };
      return Promise.resolve(client);
    },
    on: () => {},
    end: () => Promise.resolve(),
  };

  return fakePool;
}

function buildPool(connectionString) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRemoteDb = connectionString.includes('supabase') || connectionString.includes('render') || connectionString.includes('neon') || connectionString.includes('pooler');

  return new Pool({
    connectionString,
    ssl: (isProduction || isRemoteDb) ? { rejectUnauthorized: false } : false,
  });
}

// ─── محاولة الاتصال بـ PostgreSQL أولاً ────────────────────────────
let usePostgres = false;
if (process.env.DB_CLIENT !== 'sqlite' && process.env.DB_CLIENT !== 'sqlite3') {
  try {
    const parsed = new URL(rawConnectionString);
    if (
      !parsed.hostname ||
      parsed.hostname.includes('[PROJECT-REF]') ||
      parsed.username.includes('YOUR-PASSWORD') ||
      rawConnectionString.includes('[YOUR-PASSWORD]') ||
      rawConnectionString.includes('[PROJECT-REF]')
    ) {
      throw new Error('Invalid placeholder database URL');
    }
    pool = buildPool(rawConnectionString);
    usePostgres = true;
    console.log('✅ تم الاتصال بقاعدة بيانات PostgreSQL/Supabase.');
  } catch (err) {
    // fallback to SQLite
  }
}

// ─── إذا فشل PostgreSQL، استخدم SQLite دائم على القرص ─────────────
if (!usePostgres) {
  try {
    pool = createSqlitePool();
    databaseMode = 'sqlite';
    console.log('✅ وضع SQLite المحلي الدائم نشط. البيانات محفوظة في eco-store.sqlite');
  } catch (sqliteErr) {
    console.error('❌ فشل SQLite أيضاً:', sqliteErr.message);
    console.warn('⚠️ الرجوع لـ pg-mem (مؤقت):');
    try {
      const { newDb } = require('pg-mem');
      const memDb = newDb();
      const { Pool: MemPool } = memDb.adapters.createPg();
      pool = new MemPool();
      databaseMode = 'memory';
    } catch (memErr) {
      throw new Error('فشل إنشاء أي قاعدة بيانات: ' + memErr.message);
    }
  }
}

if (databaseMode === 'memory') {
  console.log('⚠️ وضع قاعدة البيانات المؤقتة (pg-mem) - البيانات لن تُحفظ عند إيقاف السيرفر!');
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

// تحويل استعلامات المعاملات من علامات الاستفهام (?) إلى دولارات الترقيم ($1, $2)
function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

/**
 * تنفيذ استعلام عام
 */
async function query(sql, params = [], client = null) {
  const runner = client || pool;
  const formattedSql = convertPlaceholders(sql);
  const result = await runner.query(formattedSql, params);
  return result;
}

/**
 * جلب صف واحد
 */
async function get(sql, params = [], client = null) {
  const res = await query(sql, params, client);
  return res.rows[0] || null;
}

/**
 * جلب جميع الصفوف
 */
async function all(sql, params = [], client = null) {
  const res = await query(sql, params, client);
  return res.rows || [];
}

/**
 * تنفيذ عملية إدراج/تحديث/حذف
 */
async function run(sql, params = [], client = null) {
  const res = await query(sql, params, client);
  const firstRow = res.rows[0] || null;
  return {
    rowCount: res.rowCount,
    changes: res.rowCount,
    lastInsertRowid: firstRow && firstRow.id !== undefined ? firstRow.id : null,
    rows: res.rows,
  };
}

/**
 * تنفيذ معاملة متكاملة (Transaction)
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    try { await client.query('BEGIN'); } catch (e) { if (!e.message.includes('within a transaction')) throw e; }
    
    // توفير نفس الواجهات داخل المعاملة
    const trx = {
      query: (sql, params) => query(sql, params, client),
      get: (sql, params) => get(sql, params, client),
      all: (sql, params) => all(sql, params, client),
      run: (sql, params) => run(sql, params, client),
      client,
    };

    const result = await callback(trx);
    try { await client.query('COMMIT'); } catch (e) { if (!e.message.includes('cannot commit')) throw e; }
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (e) { if (!e.message.includes('cannot rollback')) throw e; }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * ضمان وجود سجل الأرشيف المالي للتاجر
 */
async function ensureFinancialArchive(userId, client = null) {
  if (userId) {
    const exists = await get('SELECT id FROM financial_archive WHERE user_id = $1', [userId], client);
    if (!exists) {
      await query(
        'INSERT INTO financial_archive (user_id, archived_sales, archived_cogs, archived_shipping_cost) VALUES ($1, 0, 0, 0) ON CONFLICT(user_id) DO NOTHING',
        [userId],
        client
      );
    }
  } else {
    const nullExists = await get('SELECT id FROM financial_archive WHERE user_id IS NULL', [], client);
    if (!nullExists) {
      await query(
        'INSERT INTO financial_archive (user_id, archived_sales, archived_cogs, archived_shipping_cost) VALUES (NULL, 0, 0, 0)',
        [],
        client
      );
    }
  }
}

/**
 * تهيئة جداول قاعدة البيانات والبيانات الأولية في PostgreSQL
 */
async function initDb() {
  console.log('🔄 جاري تهيئة قاعدة بيانات PostgreSQL / Supabase...');

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'seller',
      subscription_plan VARCHAR(50) DEFAULT 'trial',
      subscription_status VARCHAR(50) DEFAULT 'active',
      trial_ends_at TIMESTAMPTZ NOT NULL,
      subscription_ends_at TIMESTAMPTZ,
      store_name VARCHAR(255) DEFAULT '',
      store_slug VARCHAR(255) DEFAULT '',
      phone VARCHAR(50) DEFAULT '',
      email_verified INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      otp_code VARCHAR(50) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform VARCHAR(50) DEFAULT 'ios',
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, token)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'general',
      data JSONB DEFAULT '{}'::jsonb,
      is_read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_notifications_unread
      ON notifications (user_id, is_read, created_at DESC);

    CREATE TABLE IF NOT EXISTS subscriptions_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(50) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'manual',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscription_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(12, 2) NOT NULL,
      compare_price NUMERIC(12, 2),
      sku VARCHAR(100),
      stock INTEGER DEFAULT 0,
      cost_price NUMERIC(12, 2) DEFAULT 0,
      has_variants INTEGER DEFAULT 0,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image TEXT,
      images TEXT DEFAULT '[]',
      pack_quantity INTEGER DEFAULT 1,
      video_file TEXT DEFAULT '',
      reviews TEXT DEFAULT '',
      rating NUMERIC(3, 2) DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label VARCHAR(255) NOT NULL,
      color VARCHAR(100) DEFAULT '',
      color_code VARCHAR(50) DEFAULT '',
      size VARCHAR(100) DEFAULT '',
      image TEXT DEFAULT '',
      stock INTEGER DEFAULT 0,
      cost_price NUMERIC(12, 2) DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS variant_restocks (
      id SERIAL PRIMARY KEY,
      variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
      qty_added INTEGER NOT NULL,
      cost_price NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stock_restocks (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      qty_added INTEGER NOT NULL,
      cost_price NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      key VARCHAR(255) NOT NULL,
      value TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS delivery_rates (
      wilaya_code INTEGER PRIMARY KEY,
      wilaya_name VARCHAR(255) NOT NULL,
      home_price NUMERIC(10, 2) DEFAULT 0,
      desk_price NUMERIC(10, 2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS vendor_shipping_configs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) DEFAULT 'manual',
      api_key TEXT DEFAULT '',
      api_token TEXT DEFAULT '',
      from_wilaya_id INTEGER NOT NULL DEFAULT 16,
      from_commune VARCHAR(255) NOT NULL DEFAULT '',
      pricing_mode VARCHAR(50) DEFAULT 'flat',
      flat_home_price NUMERIC(10, 2) DEFAULT 600,
      flat_desk_price NUMERIC(10, 2) DEFAULT 350,
      free_shipping_enabled INTEGER DEFAULT 0,
      free_shipping_threshold NUMERIC(10, 2) DEFAULT 15000,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vendor_custom_delivery_rates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wilaya_code INTEGER NOT NULL,
      home_price NUMERIC(10, 2) NOT NULL,
      desk_price NUMERIC(10, 2) NOT NULL,
      is_deliverable INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      customer_name VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      address TEXT NOT NULL,
      wilaya_code INTEGER,
      wilaya_name VARCHAR(255),
      commune VARCHAR(255),
      delivery_type VARCHAR(50) DEFAULT 'home',
      delivery_price NUMERIC(10, 2) DEFAULT 0,
      subtotal NUMERIC(12, 2) DEFAULT 0,
      items TEXT NOT NULL,
      total NUMERIC(12, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'قيد المعالجة',
      shipping_cost_incurred INTEGER DEFAULT 0,
      shipping_cost_actual NUMERIC(10, 2) DEFAULT 0,
      shipping_provider VARCHAR(50) DEFAULT 'manual',
      tracking_code VARCHAR(255) DEFAULT '',
      parcel_id VARCHAR(255) DEFAULT '',
      label_url TEXT DEFAULT '',
      tracking_status VARCHAR(100) DEFAULT '',
      return_reason TEXT DEFAULT '',
      utm_source VARCHAR(255) DEFAULT '',
      utm_campaign VARCHAR(255) DEFAULT '',
      utm_medium VARCHAR(255) DEFAULT '',
      utm_content VARCHAR(255) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_status VARCHAR(50),
      to_status VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS financial_archive (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      archived_sales NUMERIC(12, 2) DEFAULT 0,
      archived_cogs NUMERIC(12, 2) DEFAULT 0,
      archived_shipping_cost NUMERIC(12, 2) DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS campaign_ad_spend (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      campaign_name VARCHAR(255) NOT NULL,
      source VARCHAR(100) DEFAULT 'facebook',
      spend_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
      spend_date DATE DEFAULT CURRENT_DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Unique Constraints & Indexes
    CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_user_key_idx ON settings (COALESCE(user_id, 0), key);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_vendor_custom_delivery_rates_idx ON vendor_custom_delivery_rates (user_id, wilaya_code);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
    CREATE INDEX IF NOT EXISTS idx_ad_spend_campaign ON campaign_ad_spend(campaign_name);
    CREATE INDEX IF NOT EXISTS idx_ad_spend_user ON campaign_ad_spend(user_id);
  `;

  await pool.query(schemaSql);

  // إضافة الأعمدة الجديدة للمنتجات إذا كانت قاعدة البيانات موجودة بالفعل
  try {
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS video_file TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS reviews TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 5`);
  } catch (e) {
    // الأعمدة قد تكون موجودة بالفعل، لا مشكلة
    console.log('ℹ️ أعمدة المنتجات الجديدة موجودة بالفعل أو لا تحتاج إلى إضافة');
  }

  // إدخال الولايات الافتراضية إذا كان الجدول فارغاً
  const wilayaCountRes = await pool.query('SELECT COUNT(*) AS c FROM delivery_rates');
  if (parseInt(wilayaCountRes.rows[0].c, 10) === 0) {
    try {
      const wilayasSeed = require('./data/wilayas.json');
      for (const w of wilayasSeed) {
        await pool.query(
          'INSERT INTO delivery_rates (wilaya_code, wilaya_name, home_price, desk_price) VALUES ($1, $2, 0, 0) ON CONFLICT (wilaya_code) DO NOTHING',
          [w.code, w.name]
        );
      }
      console.log('✅ تم إدخال بيانات الـ 69 ولاية في PostgreSQL');
    } catch (e) {
      console.warn('⚠️ تعذر إدخال بيانات الولايات الافتراضية:', e.message);
    }
  }

  // إعدادات وسائل التواصل الافتراضية
  const defaultSocialKeys = ['social_whatsapp', 'social_instagram', 'social_facebook', 'social_tiktok', 'social_telegram'];
  for (const key of defaultSocialKeys) {
    const exists = await get('SELECT id FROM settings WHERE user_id IS NULL AND key = $1', [key]);
    if (!exists) {
      await query('INSERT INTO settings (user_id, key, value) VALUES (NULL, $1, $2)', [key, '']);
    }
  }

  // إنشاء حساب المشرف الافتراضي إن لم يكن موجوداً
  const userCountRes = await pool.query('SELECT COUNT(*) AS c FROM users');
  if (parseInt(userCountRes.rows[0].c, 10) === 0) {
    const bcrypt = require('bcryptjs');
    const defaultUsername = process.env.ADMIN_USERNAME || 'loueystore';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'k6t6J8DHw79jGw3';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const subEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, subscription_plan, subscription_status, trial_ends_at, subscription_ends_at, store_name, store_slug)
       VALUES ($1, $2, $3, 'admin', 'annual', 'active', $4, $5, 'متجر الجملة والشوالات', 'jomla')
       ON CONFLICT (email) DO NOTHING`,
      [defaultUsername, `${defaultUsername}@mystore.dz`, hash, trialEnd, subEnd]
    );

    await pool.query(
      `INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
      [defaultUsername, hash]
    );
    console.log(`✅ تم إنشاء حساب المشرف الافتراضي: ${defaultUsername}`);
  }

  console.log('✅ اكتملت تهيئة قاعدة بيانات PostgreSQL بنجاح.');
}

module.exports = {
  pool,
  query,
  get,
  all,
  run,
  transaction,
  ensureFinancialArchive,
  initDb,
  getMode: () => databaseMode,
};
