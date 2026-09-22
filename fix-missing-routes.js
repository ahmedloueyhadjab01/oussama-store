
const fs = require("fs");
let settings = fs.readFileSync("routes/settings.js", "utf8");

const missingRoutes = `
// حفظ بيانات المتجر
router.put("/", requireAuth, async (req, res) => {
  const { store_name, store_description, contact_email, contact_phone, currency, language } = req.body;
  try {
    await db.query(
      "UPDATE users SET store_name = COALESCE($1, store_name) WHERE id = $2",
      [store_name, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Profile endpoints
router.get("/profile", requireAuth, async (req, res) => {
  try {
    const user = await db.get("SELECT name, email, store_name, store_slug FROM users WHERE id = $1", [req.user.id]);
    res.json(user);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  const { name, store_name } = req.body;
  try {
    await db.query("UPDATE users SET name = COALESCE($1, name), store_name = COALESCE($2, store_name) WHERE id = $3", [name, store_name, req.user.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

settings = settings.replace(/module\.exports = router;/, missingRoutes + "\nmodule.exports = router;");
fs.writeFileSync("routes/settings.js", settings);

