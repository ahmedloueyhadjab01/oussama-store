const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {}

let supabaseClient = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
    );
  } catch (err) {
    console.warn('⚠️ Supabase Storage client init warning:', err.message);
  }
}

function fileFilter(req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension) || !file.mimetype.startsWith('image/')) {
    return cb(new Error('نوع الملف غير مسموح. يُسمح فقط بصور JPEG, PNG, WEBP, GIF'));
  }
  cb(null, true);
}

// استخدام الذاكرة إذا كانت هناك سحابة Supabase، أو القرص المحلي كخيار بديل
const storage = supabaseClient
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, safeName);
      },
    });

const rawMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 20, fields: 50 },
});

async function uploadToSupabaseStorage(buffer, originalname, mimetype) {
  const ext = path.extname(originalname).toLowerCase();
  const safeName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

  try {
    // محاولة إنشاء الـ bucket إذا لم تكن موجودة
    await supabaseClient.storage.createBucket(bucketName, { public: true }).catch(() => {});
  } catch (e) {}

  const { data, error } = await supabaseClient.storage
    .from(bucketName)
    .upload(safeName, buffer, {
      contentType: mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(`خطأ أثناء رفع الملف إلى Supabase Storage: ${error.message}`);
  }

  const { data: publicUrlData } = supabaseClient.storage.from(bucketName).getPublicUrl(safeName);
  return {
    url: publicUrlData.publicUrl,
    filename: safeName,
  };
}

// ميدلوير مخصص لرفع الملفات مفردة أو متعددة مع معالجة Supabase التلقائية
const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      rawMulter.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (req.file && supabaseClient && req.file.buffer) {
          try {
            const uploaded = await uploadToSupabaseStorage(
              req.file.buffer,
              req.file.originalname,
              req.file.mimetype
            );
            req.file.url = uploaded.url;
            req.file.filename = uploaded.filename;
          } catch (uploadErr) {
            return next(uploadErr);
          }
        } else if (req.file && !req.file.url) {
          req.file.url = `/uploads/${req.file.filename}`;
        }
        next();
      });
    };
  },
  array: (fieldName, maxCount = 20) => {
    return (req, res, next) => {
      rawMulter.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return next(err);
        if (req.files && req.files.length && supabaseClient) {
          try {
            for (const file of req.files) {
              if (file.buffer) {
                const uploaded = await uploadToSupabaseStorage(
                  file.buffer,
                  file.originalname,
                  file.mimetype
                );
                file.url = uploaded.url;
                file.filename = uploaded.filename;
              }
            }
          } catch (uploadErr) {
            return next(uploadErr);
          }
        } else if (req.files && req.files.length) {
          for (const file of req.files) {
            if (!file.url) file.url = `/uploads/${file.filename}`;
          }
        }
        next();
      });
    };
  },
  deleteFiles: async (urls) => {
    if (!supabaseClient || !urls || !urls.length) return;
    const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
    try {
      const filenames = urls.map(url => {
        const parts = url.split('/');
        return parts[parts.length - 1];
      }).filter(Boolean);
      if (filenames.length > 0) {
        await supabaseClient.storage.from(bucketName).remove(filenames);
      }
    } catch (err) {
      console.warn('Failed to delete from Supabase:', err.message);
    }
  }
};

module.exports = upload;
