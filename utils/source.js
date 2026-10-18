// توحيد اسم مصدر الزيارة (المنصة) من utm_source أو من رابط الإحالة
// مثال: l.facebook.com / m.facebook.com / fb → facebook
const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'google', 'snapchat', 'youtube', 'whatsapp', 'telegram', 'other'];

function sanitizeUtm(raw, maxLen = 100) {
  if (!raw) return '';
  const str = String(raw).trim().slice(0, maxLen);
  // Allow safe characters in any language: Unicode letters, numbers, spaces, dots, dashes, underscores
  return str.replace(/[^\p{L}\p{N}_\-. ]/gu, '').trim();
}

function normalizeSource(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (/(^|[^a-z])(fb|facebook|meta)([^a-z]|$)|facebook\.|fbclid/.test(s)) return 'facebook';
  if (/instagram|(^|[^a-z])ig([^a-z]|$)|igshid/.test(s)) return 'instagram';
  if (/tiktok|ttclid|bytedance|musical/.test(s)) return 'tiktok';
  if (/snap/.test(s)) return 'snapchat';
  if (/youtube|youtu\.be/.test(s)) return 'youtube';
  if (/whatsapp|wa\.me/.test(s)) return 'whatsapp';
  if (/telegram|t\.me/.test(s)) return 'telegram';
  if (/google|gclid|adwords/.test(s)) return 'google';
  return sanitizeUtm(s, 60);
}

// تحويل أي قيمة تاريخ من قاعدة البيانات إلى ميلي ثانية (SQLite يخزن UTC بدون Z)
function toMs(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const str = String(v);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) return Date.parse(str.replace(' ', 'T') + 'Z') || 0;
  return Date.parse(str) || 0;
}

module.exports = { normalizeSource, sanitizeUtm, toMs, PLATFORMS };
