function sanitizeSingleImageUrl(clean) {
  if (typeof clean !== 'string') return null;
  const s = clean.trim();
  if (!s || s.length > 500) return null;
  if (/[<>"'\s]/.test(s)) return null;
  if (s.startsWith('/uploads/')) {
    const filename = s.slice('/uploads/'.length);
    return /^[a-zA-Z0-9_\-.]+\.(jpg|jpeg|png|webp|gif|mp4|mov)$/i.test(filename) ? s : null;
  }
  if (s.startsWith('https://')) {
    try {
      const parsedUrl = new URL(s);
      if (parsedUrl.protocol !== 'https:') return null;
      const pathname = parsedUrl.pathname.toLowerCase();
      return /\.(jpg|jpeg|png|webp|gif|mp4|mov)$/i.test(pathname) ? s : null;
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeImageUrls(raw) {
  if (!raw) return [];
  let arr = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
      else if (typeof parsed === 'string') arr = [parsed];
    } catch {
      if (raw.trim().startsWith('/uploads/') || raw.trim().startsWith('https://')) {
        arr = [raw.trim()];
      }
    }
  }

  const result = [];
  for (const item of arr) {
    const valid = sanitizeSingleImageUrl(item);
    if (valid) result.push(valid);
  }
  return result;
}

module.exports = { sanitizeSingleImageUrl, sanitizeImageUrls };
