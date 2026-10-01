const fs = require("fs");
let content = fs.readFileSync("routes/orders.js", "utf8");

const oldStr1 = "SELECT * FROM orders WHERE status = " + "\u0027" + ". \"\"S." + "\u0027" + " AND created_at >= datetime(" + "\u0027now\u0027" + ", " + "\u0027-30 days\u0027" + ")";
const oldStr2 = "status IN (" + "\u0027.\"S\u0027" + ", " + "\u0027.\u001D\u0026\u001D\u0027" + ", " + "\u0027 \"^S\"\u0027" + ")";

const newStr1 = "SELECT * FROM orders WHERE status = " + String.fromCharCode(39) + "تم التسليم" + String.fromCharCode(39) + " AND created_at >= NOW() - INTERVAL " + String.fromCharCode(39) + "30 days" + String.fromCharCode(39);
const newStr2 = "status IN (" + String.fromCharCode(39) + "ملغي" + String.fromCharCode(39) + ", " + String.fromCharCode(39) + "مرتجع" + String.fromCharCode(39) + ", " + String.fromCharCode(39) + "تعذر التوصيل" + String.fromCharCode(39) + ")";

// just replace anything that looks like status = \x27... \x27
content = content.replace(/status = \x27[^\x27]+\x27 AND created_at >= datetime/, "status = \x27تم التسليم\x27 AND created_at >= datetime");
content = content.replace(/status IN \(\x27[^\x27]+\x27, \x27[^\x27]+\x27, \x27[^\x27]+\x27\)/, "status IN (\x27ملغي\x27, \x27مرتجع\x27, \x27تعذر التوصيل\x27)");

fs.writeFileSync("routes/orders.js", content, "utf8");

