const jwt = require('jsonwebtoken');
const db = require('../db');

function getSubscriptionStatus(user, now = Date.now()) {
  const isAdmin = user?.role === 'admin';
  const isTrial = user?.subscription_plan === 'trial';

  if (isAdmin) {
    return { days_left: 9999, is_expired: false, is_trial: false, is_lifetime: true };
  }

  if (user?.subscription_plan === 'lifetime') {
    return {
      days_left: 9999,
      is_expired: user.subscription_status !== 'active',
      is_trial: false,
      is_lifetime: true,
    };
  }

  const expiresAt = isTrial ? user?.trial_ends_at : user?.subscription_ends_at;
  const expiryTime = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const isExpired = user?.subscription_status !== 'active' || !Number.isFinite(expiryTime) || expiryTime <= now;

  return {
    days_left: isExpired ? 0 : Math.ceil((expiryTime - now) / (24 * 60 * 60 * 1000)),
    is_expired: isExpired,
    is_trial: isTrial,
    is_lifetime: false,
  };
}

function isSubscriptionExpired(user) {
  return getSubscriptionStatus(user).is_expired;
}

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
  const token = bearerToken || (req.cookies && req.cookies.token);
  if (!token) {
    return res.status(401).json({ error: 'غير مصرح لك. الرجاء تسجيل الدخول.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // جلب أحدث بيانات المستخدم من قاعدة البيانات للتحقق من حالة الاشتراك
    const user = await db.get('SELECT * FROM users WHERE id = $1', [payload.id]);
    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود أو تم حذفه.' });
    }

    const isExpired = isSubscriptionExpired(user);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      trial_ends_at: user.trial_ends_at,
      subscription_ends_at: user.subscription_ends_at,
      store_name: user.store_name,
      store_slug: user.store_slug,
      is_expired: isExpired,
    };
    // توافق خلفي مع الكود القديم الذي يستخدم req.admin
    req.admin = req.user;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية. الرجاء تسجيل الدخول من جديد.' });
  }
}

// ميدلوير لحماية العمليات التعديلية (الكتابة، الإضافة، الحذف) ومنعها في وضع المشاهدة فقط
function requireActiveSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مصرح لك.' });
  }
  // الأدمن لا يُقيد أبداً
  if (req.user.role === 'admin') {
    return next();
  }
  // إذا انتهت الفترة التجريبية أو الاشتراك
  if (req.user.is_expired) {
    return res.status(403).json({
      error: `حسابك في وضع المشاهدة فقط لانتهاء ${req.user.subscription_plan === 'trial' ? 'الفترة التجريبية' : 'الاشتراك'}. تواصل مع فريق العمل عبر الواتساب لتفعيل حسابك ومواصلة التعديل.`,
      is_read_only: true,
      whatsapp: 'https://wa.me/213665236042?text=' + encodeURIComponent(`مرحباً، أود تفعيل اشتراكي في متجر الجملة لحسابي: ${req.user.email}`),
      whatsapp_phone: '+213 665 23 60 42',
    });
  }
  next();
}

// ميدلوير للتحقق من صلاحية المشرف العام (Super Admin)
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'هذا الإجراء مخصص لمدير المنصة فقط.' });
  }
  next();
}

/**
 * ميدلوير للتحقق من ملكية مورد معين:
 * يتحقق أن المورد (product/category/order) ينتمي للمستخدم المسجل دخوله،
 * إلا إذا كان المستخدم مشرفاً عاماً (admin) يمكنه رؤية كل شيء.
 */
function checkResourceOwnership(resourceUserId, req, res) {
  if (!req.user) {
    res.status(401).json({ error: 'غير مصرح لك.' });
    return false;
  }
  if (req.user.role === 'admin') return true; // المشرف يرى كل شيء
  if (resourceUserId !== null && resourceUserId !== undefined && resourceUserId !== req.user.id) {
    res.status(403).json({ error: 'هذا المورد لا ينتمي لحسابك.' });
    return false;
  }
  return true;
}

module.exports = { requireAuth, requireActiveSubscription, requireAdmin, checkResourceOwnership, getSubscriptionStatus, isSubscriptionExpired };


