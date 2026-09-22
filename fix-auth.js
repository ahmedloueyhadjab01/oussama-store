
const fs = require("fs");
let authjs = fs.readFileSync("routes/auth.js", "utf8");

const missingAuth = `
router.put("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await db.get("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    const match = await require("bcryptjs").compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    const hash = await require("bcryptjs").hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
`;

authjs = authjs.replace(/module\.exports = router;/, missingAuth + "\nmodule.exports = router;");
fs.writeFileSync("routes/auth.js", authjs);

