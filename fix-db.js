
const db = require("./db");
async function fix() {
  await db.initDb();
  await db.query("UPDATE users SET password_hash = $1 WHERE name = $2", ["$2a$10$0QbaqdW7ILj6WD4CqoMO7ehISeniT9Uv8pi0P5e7vtST59tiWBlqa", "loueystore"]);
  await db.query("UPDATE admins SET password_hash = $1 WHERE username = $2", ["$2a$10$0QbaqdW7ILj6WD4CqoMO7ehISeniT9Uv8pi0P5e7vtST59tiWBlqa", "loueystore"]);
  console.log("Done");
  process.exit(0);
}
fix();

