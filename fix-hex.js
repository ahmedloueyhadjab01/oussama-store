
const fs = require("fs");
let content = fs.readFileSync("routes/orders.js", "utf8");

const s1 = content.indexOf("SELECT * FROM orders WHERE status = ");
const e1 = content.indexOf("AND created_at >= datetime", s1);
if (s1 !== -1 && e1 !== -1) {
  const ar1 = Buffer.from("d8aad98520d8a7d984d8aad8b3d984d98ad985", "hex").toString("utf8");
  content = content.substring(0, s1) + "SELECT * FROM orders WHERE status = \x27" + ar1 + "\x27 " + content.substring(e1);
}

const s2 = content.indexOf("WHERE (status IN (");
const e2 = content.indexOf(")) AND shipping_cost_incurred", s2);
if (s2 !== -1 && e2 !== -1) {
  const ar2 = Buffer.from("d985d984d8bad98a", "hex").toString("utf8");
  const ar3 = Buffer.from("d985d8b1d8aad8acd8b9", "hex").toString("utf8");
  const ar4 = Buffer.from("d8aad8b9d8b0d8b120d8a7d984d8aad988d8b5d98ad984", "hex").toString("utf8");
  content = content.substring(0, s2) + "WHERE (status IN (\x27" + ar2 + "\x27, \x27" + ar3 + "\x27, \x27" + ar4 + "\x27" + content.substring(e2);
}

fs.writeFileSync("routes/orders.js", content, "utf8");

