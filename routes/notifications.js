const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function getUserPushTokens(userId) {
  const rows = await db.all('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
  return rows.map((row) => row.token).filter(Boolean);
}

async function createNotification(userId, title, body, data = {}, type = 'general') {
  const payload = {
    ...(data || {}),
    user_id: String(userId),
  };

  const row = await db.get(
    `INSERT INTO notifications (user_id, title, body, type, data, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, 0, CURRENT_TIMESTAMP)
     RETURNING *`,
    [userId, title, body, type, JSON.stringify(payload)]
  );

  return row;
}

async function notifyUser(userId, title, body, data = {}, type = 'general') {
  const notification = await createNotification(userId, title, body, data, type);

  const tokens = await getUserPushTokens(userId);
  if (!tokens.length) {
    return { sent: 0, skipped: true, notification };
  }

  const results = [];

  for (const token of tokens) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data: {
            ...data,
            user_id: String(userId),
            notification_id: String(notification?.id || ''),
          },
        }),
      });

      const responseText = await response.text();
      let parsed = {};
      try {
        parsed = JSON.parse(responseText);
      } catch (err) {
        parsed = { raw: responseText };
      }

      results.push({
        ok: response.ok,
        status: response.status,
        payload: parsed,
      });
    } catch (err) {
      results.push({ ok: false, error: err.message });
    }
  }

  return { sent: results.length, results, notification };
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT *
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(
      notifications.map((item) => ({
        ...item,
        is_read: Number(item.is_read) === 1,
        data: typeof item.data === 'string' ? JSON.parse(item.data || '{}') : (item.data || {}),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'تعذر جلب الإشعارات: ' + err.message });
  }
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await db.get(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!notification) {
      return res.status(404).json({ error: 'الإشعار غير موجود.' });
    }

    const updated = await db.get(
      `UPDATE notifications
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    res.json({
      ...updated,
      is_read: Number(updated.is_read) === 1,
      data: typeof updated.data === 'string' ? JSON.parse(updated.data || '{}') : (updated.data || {}),
    });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تحديث حالة الإشعار: ' + err.message });
  }
});

router.patch('/read-all', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = 0`,
      [req.user.id]
    );

    res.json({ success: true, updated: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تحديث جميع الإشعارات: ' + err.message });
  }
});

router.post('/register', requireAuth, async (req, res) => {
  const { token, platform } = req.body || {};

  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ error: 'رمز الإشعار مطلوب.' });
  }

  try {
    await db.query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, token)
       DO UPDATE SET platform = EXCLUDED.platform, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, token.trim(), platform || 'ios']
    );

    res.json({ success: true, message: 'تم تسجيل جهاز الإشعارات بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: 'تعذر تسجيل جهاز الإشعارات: ' + err.message });
  }
});

router.delete('/unregister', requireAuth, async (req, res) => {
  const { token } = req.body || {};

  try {
    if (token) {
      await db.query('DELETE FROM push_tokens WHERE user_id = $1 AND token = $2', [req.user.id, token]);
    } else {
      await db.query('DELETE FROM push_tokens WHERE user_id = $1', [req.user.id]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'تعذر حذف جهاز الإشعارات: ' + err.message });
  }
});

module.exports = { router, notifyUser, getUserPushTokens };
