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

const app = express();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this') || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be a strong secret of at least 32 characters in production.');
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this')) {
  console.warn('\nâš ï¸  ØªØ­Ø°ÙŠØ± Ø£Ù…Ù†ÙŠ: ÙŠØ±Ø¬Ù‰ ØªØ¹ÙŠÙŠÙ† JWT_SECRET Ù‚ÙˆÙŠ ÙˆØ¹Ø´ÙˆØ§Ø¦ÙŠ ÙÙŠ Ù…Ù„Ù .env Ù‚Ø¨Ù„ Ø§Ù„Ù†Ø´Ø± Ø§Ù„ÙØ¹Ù„ÙŠ!\n');
}

app.set('trust proxy', 1);

// ----- Ø£Ù…Ø§Ù† Ø¹Ø§Ù… -----
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

const extraDevOrigins = [
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:8085',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:8082',
  'http://127.0.0.1:8083',
  'http://127.0.0.1:8084',
  'http://127.0.0.1:8085',
  'http://192.168.1.5:8082',
  'http://192.168.1.5:8081',
  'http://192.168.1.5:8083',
  'http://192.168.1.5:8084',
  'http://192.168.1.5:8085',
];

const allowedOrigins = [...new Set([
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean) : []),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:19006',
  'http://localhost:19007',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:19007',
  ...extraDevOrigins,
])];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.1\.5):808[1-5]$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Ø­Ø¯ Ø¹Ø§Ù… Ù„Ø¹Ø¯Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ù„ÙƒÙ„ IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// ----- Ø§Ù„Ù…Ù„ÙØ§Øª Ø§Ù„Ø«Ø§Ø¨ØªØ© (Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø£Ù…Ø§Ù…ÙŠØ©) -----
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Ù…Ø³Ø§Ø±Ø§Øª ÙˆØªÙˆØ¬ÙŠÙ‡Ø§Øª Ø§Ù„Ø±Ø§Ø¨Ø·ÙŠÙ† Ø§Ù„Ù…Ù†ÙØµÙ„ÙŠÙ†: Ø§Ù„Ø²Ø¨ÙˆÙ† ÙˆØ§Ù„Ø¨Ø§Ø¦Ø¹
app.get('/seller', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ù…ØªØ¬Ø± Ø§Ù„Ø¹Ø§Ù…Ø© Ù„ØªØ§Ø¬Ø± Ù…Ø¹ÙŠÙ†: /store/3 Ø£Ùˆ /store/my-slug

// ----- Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù€ API -----
app.use('/api/auth', authRoutes);
app.get('/api/subscription', (req, res) => res.json({ status: 'active', plan: 'lifetime', ends_at: null, days_left: 9999 }));
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

// Ù…Ø¹Ø§Ù„Ø¬ Ø£Ø®Ø·Ø§Ø¡ Ù…ÙˆØ­Ù‘Ø¯
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ error: 'Ø­Ø¬Ù… Ø£Ùˆ Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù„ÙØ§Øª ÙˆØ§Ù„Ø­Ù‚ÙˆÙ„ ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ø­Ø¯ Ø§Ù„Ù…Ø³Ù…ÙˆØ­.' });
  }
  if (err.message && err.message.includes('Ù†ÙˆØ¹ Ø§Ù„Ù…Ù„Ù')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Ø­Ø¯Ø« Ø®Ø·Ø£ ÙÙŠ Ø§Ù„Ø®Ø§Ø¯Ù…' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.initDb();
    app.listen(PORT, () => {
      console.log(`âœ… Ø§Ù„Ù…ØªØ¬Ø± ÙŠØ¹Ù…Ù„ Ø§Ù„Ø¢Ù† Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù†ÙØ° ${PORT}`);
      console.log(`ðŸ” Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…: http://localhost:${PORT}/admin.html`);
    });
  } catch (err) {
    console.error('âŒ ÙØ´Ù„ Ø¨Ø¯Ø¡ ØªØ´ØºÙŠÙ„ Ø§Ù„Ø®Ø§Ø¯Ù… Ø¨Ø³Ø¨Ø¨ Ø®Ø·Ø£ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª:', err);
    process.exit(1);
  }
}

startServer();



