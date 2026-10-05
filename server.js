require('express-async-errors');
process.on('unhandledRejection', (err) => { console.error('Unhandled Rejection:', err); });
process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); process.exit(1); });
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const feedRoutes = require('./routes/feed');
const locationRoutes = require('./routes/locations');
const settingsRoutes = require('./routes/settings');
const campaignRoutes = require('./routes/campaigns');
const shippingRoutes = require('./routes/shipping');
const notificationRoutes = require('./routes/notifications').router;
const { requireAuth, getSubscriptionStatus } = require('./middleware/auth');

const app = express();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this') || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be a strong secret of at least 32 characters in production.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this')) {
  console.warn('\n⚠️  تحذير أمني: يرجى تعيين JWT_SECRET قوي وعشوائي في ملف .env قبل النشر الفعلي!\n');
}

app.set('trust proxy', 1);

// ----- أمان عام -----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        // السماح بمعالجات الأحداث المضمّنة onclick/onchange (كانت تُحجب فتتعطل أزرار كثيرة)
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://player.vimeo.com"],
        mediaSrc: ["'self'", "data:", "https:", "http:"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

if (!isProduction) {
  for (const hostname of ['localhost', '127.0.0.1', '192.168.1.5']) {
    for (const port of [3000, 3001, 3003, 8081, 8082, 8083, 8084, 8085, 19006, 19007]) {
      allowedOrigins.add(`http://${hostname}:${port}`);
    }
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// حد عام لعدد الطلبات لكل IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ----- الملفات الثابتة (الواجهة الأمامية) -----
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// مسارات وتوجيهات الرابطين المنفصلين: الزبون والبائع
app.get('/seller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// واجهة المتجر العامة لتاجر معين: /store/3 أو /store/my-slug

// ----- مسارات الـ API -----
app.use('/api/auth', authRoutes);
app.get('/api/subscription', requireAuth, (req, res) => {
  const subscription = getSubscriptionStatus(req.user);
  res.json({
    status: req.user.subscription_status,
    plan: req.user.subscription_plan,
    ends_at: subscription.is_lifetime ? null : subscription.is_trial ? req.user.trial_ends_at : req.user.subscription_ends_at,
    ...subscription,
  });
});
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/store', settingsRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve main store at root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', database: require('./db').getMode() }));

// معالج أخطاء موحّد
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'هذا المصدر غير مسموح له بالوصول.' });
  }
  console.error(err.message);
  if (err.code && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ error: 'حجم أو عدد الملفات والحقول يتجاوز الحد المسموح.' });
  }
  if (err.message && err.message.includes('نوع الملف')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`✅ المتجر يعمل الآن على المنفذ ${PORT}`);
      console.log(`🔐 لوحة التحكم: http://localhost:${PORT}/admin.html`);
    });
  } catch (err) {
    console.error('❌ فشل بدء تشغيل الخادم بسبب خطأ في قاعدة البيانات:', err);
    process.exit(1);
  }
}

startServer();



