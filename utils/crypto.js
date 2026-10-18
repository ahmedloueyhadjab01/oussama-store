const crypto = require('crypto');

/**
 * Get dedicated encryption key from ENCRYPTION_KEY environment variable.
 * Independent of JWT_SECRET to ensure rotating JWT_SECRET does not invalidate encrypted data.
 */
let devEphemeralKey = null;

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32 || key.includes('replace_')) {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      throw new Error('ENCRYPTION_KEY environment variable is required, must be at least 32 characters, and cannot be a placeholder in production.');
    }
    // Only in local development, use an ephemeral key generated per process lifecycle
    if (!devEphemeralKey) {
      devEphemeralKey = crypto.randomBytes(32);
    }
    return devEphemeralKey;
  }
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive plain text using AES-256-GCM.
 * Prepends 'enc:' prefix with IV and Auth Tag.
 * Fails explicitly on error instead of returning unencrypted plain text.
 */
function encryptText(plainText) {
  if (!plainText || typeof plainText !== 'string') return plainText;
  const str = plainText.trim();
  if (!str) return str;
  if (str.startsWith('enc:')) return str; // Already encrypted

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('❌ Encryption failed:', err.message);
    throw new Error('فشل تشفير بيانات الاعتماد الحساسة: ' + err.message);
  }
}

/**
 * Decrypt AES-256-GCM encrypted text.
 * If text is not encrypted (does not start with 'enc:'), returns as-is for backward compatibility.
 * On decryption failure, returns null (never returns the raw ciphertext string).
 */
function decryptText(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') {
    return cipherText || '';
  }
  if (!cipherText.startsWith('enc:')) {
    // Unencrypted legacy text
    return cipherText;
  }

  try {
    const parts = cipherText.slice(4).split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed encrypted credential string');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('⚠️ Decryption failed (check ENCRYPTION_KEY environment variable):', err.message);
    // Return null to prevent sending malformed or ciphertext string as an API key
    return null;
  }
}

module.exports = { encryptText, decryptText };
