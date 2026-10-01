
const fs = require("fs");
let content = fs.readFileSync("routes/orders.js", "utf8");

content = content.replace(/status = \x27[^\x27]+\x27 AND created_at >= datetime/, "status = \x27" + Buffer.from("d8aad98520d8a7d984d8aad8b3d984d98ad985", "hex").toString("utf8") + "\x27 AND created_at >= datetime");

content = content.replace(/status IN \(\x27[^\x27]+\x27, \x27[^\x27]+\x27, \x27[^\x27]+\x27\)/, "status IN (\x27" + Buffer.from("d985d984d8bad98a", "hex").toString("utf8") + "\x27, \x27" + Buffer.from("d985d8b1d8aad8acd8b9", "hex").toString("utf8") + "\x27, \x27" + Buffer.from("d8aad8b9d8b0d8b120d8a7d984d8aad988d8b5d98ad984", "hex").toString("utf8") + "\x27)");

fs.writeFileSync("routes/orders.js", content, "utf8");

