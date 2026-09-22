
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const slugify = require("slugify");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { sendOtpEmail } = require("../utils/email");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

function computeSubscriptionStatus(user) { 
  return { days_left: 9999, is_expired: false, is_trial: false, is_lifetime: true }; 
}

router.post(
  "/login",
  authLimiter,
  [
    body("username").trim().notEmpty().withMessage("اسم المستخدم أو البريد الإلكتروني مطلوب"),
    body("password").notEmpty().withMessage("كلمة المرور مطلوبة"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    const loginIdentifier = username.trim().toLowerCase();

    let user = await db.get("SELECT * FROM users WHERE LOWER(email) = $1", [loginIdentifier]);
    if (!user) {
      const sameNameUsers = await db.all("SELECT * FROM users WHERE LOWER(name) = $1 LIMIT 2", [loginIdentifier]);
      if (sameNameUsers.length === 1) user = sameNameUsers[0];
    }

    if (!user) {
      const admin = await db.get("SELECT * FROM admins WHERE LOWER(username) = $1", [loginIdentifier]);
      if (admin && bcrypt.compareSync(password, admin.password_hash)) {
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const subEnd = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
        const insertRes = await db.query(`
          INSERT INTO users (name, email, password_hash, role, subscription_plan, subscription_status, trial_ends_at, subscription_ends_at, store_name, store_slug)
          VALUES ($1, $2, $3, 'admin', 'annual', 'active', $4, $5, 'Admin Store', 'main')
          ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
          RETURNING *
        `, [admin.username, `${admin.username}@mystore.dz`, admin.password_hash, trialEnd, subEnd]);
        user = insertRes.rows[0];
      }
    }

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const subInfo = computeSubscriptionStatus(user);

    res.json({
      success: true,
      token,
      username: user.name,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription_plan: user.subscription_plan,
        trial_ends_at: user.trial_ends_at,
        subscription_ends_at: user.subscription_ends_at,
        phone: user.phone,
        store_name: user.store_name,
        store_slug: user.store_slug,
        ...subInfo,
      },
    });
  }
);

router.get("/me", requireAuth, async (req, res) => {
  const user = await db.get("SELECT * FROM users WHERE id = $1", [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  const subInfo = computeSubscriptionStatus(user);

  res.json({
    username: user.name,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription_plan: user.subscription_plan,
      subscription_status: user.subscription_status,
      trial_ends_at: user.trial_ends_at,
      subscription_ends_at: user.subscription_ends_at,
      phone: user.phone,
      store_name: user.store_name,
      store_slug: user.store_slug,
      ...subInfo,
    },
  });
});

router.get("/store-info/:identifier", async (req, res) => {
  const identifier = req.params.identifier;
  let vendor;
  if (identifier === '1' || identifier === 'default') {
    // Single-tenant mode
    if (process.env.MAIN_STORE_USER_ID) {
      vendor = await db.get("SELECT id, name, store_name, store_slug FROM users WHERE id = $1", [process.env.MAIN_STORE_USER_ID]);
    } else {
      vendor = await db.get("SELECT id, name, store_name, store_slug FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    }
  } else if (/^\d+$/.test(identifier)) {
    vendor = await db.get("SELECT id, name, store_name, store_slug FROM users WHERE id = $1", [parseInt(identifier, 10)]);
  } else {
    vendor = await db.get("SELECT id, name, store_name, store_slug FROM users WHERE store_slug = $1", [identifier]);
  }
  if (!vendor) return res.status(404).json({ error: "المتجر غير موجود" });
  res.json({
    id: vendor.id,
    name: vendor.name,
    store_name: vendor.store_name || vendor.name,
    store_slug: vendor.store_slug,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
});


router.put("/change-password", requireAuth, async (req, res) => {
  const { old_password: currentPassword, new_password: newPassword } = req.body;
  try {
    const user = await db.get("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!user) return res.status(404).json({ error: "المستخدم غير موجود" });
    const match = await require("bcryptjs").compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    const hash = await require("bcryptjs").hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;


