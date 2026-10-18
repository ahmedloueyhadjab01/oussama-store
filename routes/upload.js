const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) { console.error('Ignored Error:', e.message); }

let supabaseClient = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
  } catch (err) {
    console.warn('⚠️  Supabase Storage client init warning:', err.message);
  }
}

// قائمة الامتدادات وأنواع MIME المسموح بها بدقة
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov']);
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime'
]);

// فحص البايتات السحرية (Magic Bytes) لمنع رفع أي ملف تنفيذي أو HTML/SVG متنكر
function validateMagicBytes(buffer) {
  if (!buffer || buffer.length < 8) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: GIF87a أو GIF89a (47 49 46 38)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WEBP: RIFF....WEBP
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  // MP4 / MOV: ....ftyp
  if (buffer.length >= 8 && buffer.slice(4, 8).toString() === 'ftyp') return true;
  return false;
}

function fileFilter(req, file, cb) {
  if (!file || !file.originalname) return cb(null, false);
  const ext = path.extname(file.originalname).toLowerCase();
  
  // التحقق الإجباري الصارم من الامتداد و MIME type معاً
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('امتداد الملف غير مدعوم. مسموح فقط بـ (JPG, PNG, WebP, GIF, MP4)'));
  }
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    return cb(new Error('نوع الملف (MIME) غير مصرح به.'));
  }
  return cb(null, true);
}

// استخدام memoryStorage دائماً للتحقق من Magic Bytes في الذاكرة قبل الكتابة للقرص أو السحابة
const storage = multer.memoryStorage();

const rawMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
});

async function uploadFileBuffer(buffer, originalname, mimetype, userId = null) {
  // فحص البايتات السحرية للتأكد من المحتوى الحقيقي
  if (!validateMagicBytes(buffer)) {
    throw new Error('محتوى الملف غير صالح أو تم التلاعب بامتداده (فشل التحقق الأمني من توقيع الملف).');
  }

  const ext = path.extname(originalname).toLowerCase();
  const userPrefix = userId ? `u${userId}_` : '';
  const safeName = `${userPrefix}${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
  let fallbackLocal = false;

  if (supabaseClient) {
    try {
      await supabaseClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
      const { data, error } = await supabaseClient.storage.from(bucketName).upload(safeName, buffer, {
        contentType: mimetype,
        upsert: false
      });
      if (error) {
        console.warn('Supabase upload failed, falling back to local:', error.message);
        fallbackLocal = true;
      } else {
        const { data: pUrl } = supabaseClient.storage.from(bucketName).getPublicUrl(safeName);
        return { url: pUrl.publicUrl, filename: safeName };
      }
    } catch (err) {
      console.warn('Supabase error, falling back to local:', err.message);
      fallbackLocal = true;
    }
  } else {
    fallbackLocal = true;
  }

  if (fallbackLocal) {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const localFilePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(localFilePath, buffer);
    return { url: '/uploads/' + safeName, filename: safeName };
  }
}

const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      rawMulter.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (req.file && req.file.buffer) {
          try {
            const uploaded = await uploadFileBuffer(
              req.file.buffer,
              req.file.originalname,
              req.file.mimetype,
              req.user?.id || null
            );
            req.file.url = uploaded.url;
            req.file.filename = uploaded.filename;
          } catch (uploadErr) {
            return res.status(400).json({ error: uploadErr.message });
          }
        }
        next();
      });
    };
  },
  array: (fieldName, maxCount = 20) => {
    return (req, res, next) => {
      rawMulter.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return next(err);
        if (req.files && req.files.length) {
          try {
            for (const file of req.files) {
              if (file.buffer) {
                const uploaded = await uploadFileBuffer(
                  file.buffer,
                  file.originalname,
                  file.mimetype,
                  req.user?.id || null
                );
                file.url = uploaded.url;
                file.filename = uploaded.filename;
              }
            }
          } catch (uploadErr) {
            return res.status(400).json({ error: uploadErr.message });
          }
        }
        next();
      });
    };
  },
  deleteFiles: async (urls, userId = null) => {
    if (!urls || !urls.length) return;
    // حذف محلي
    for (const url of urls) {
      if (typeof url === 'string' && url.startsWith('/uploads/')) {
        const safeBase = path.basename(url);
        // التحقق من ملكية الصورة للتاجر إذا كانت مسبوقة بـ u<id>_
        const userMatch = safeBase.match(/^u(\d+)_/);
        if (userMatch && userId && parseInt(userMatch[1], 10) !== parseInt(userId, 10)) {
          console.warn(`[Security] Blocked unauthorized attempt to delete file ${safeBase} by user ${userId}`);
          continue;
        }
        const localPath = path.join(uploadsDir, safeBase);
        try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch {}
      }
    }
    // حذف من Supabase
    if (supabaseClient) {
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
      try {
        const filenames = urls.map(url => {
          if (typeof url !== 'string') return null;
          const parts = url.split('/');
          const safeBase = parts[parts.length - 1];
          const userMatch = safeBase.match(/^u(\d+)_/);
          if (userMatch && userId && parseInt(userMatch[1], 10) !== parseInt(userId, 10)) {
            return null;
          }
          return safeBase;
        }).filter(Boolean);
        if (filenames.length > 0) {
          await supabaseClient.storage.from(bucketName).remove(filenames);
        }
      } catch (err) {
        console.warn('Failed to delete from Supabase:', err.message);
      }
    }
  }
};

module.exports = upload;
