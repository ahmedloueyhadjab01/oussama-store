
const fs = require("fs");
let code = fs.readFileSync("db.js", "utf8");

code = code.replace(/\.replace\(\/\\\\\$[a-z0-9]+\/g, \x27\?\x27\)/gi, ""); // remove it if exists? No.
code = code.replace(".replace(/\\$\\d+/g, \x27?\x27)", ".replace(/\\$(\\d+)/g, \x27?$1\x27)");
code = code.replace(".replace(/\\\\bNOW\\\\(\\\\)/gi, \x27CURRENT_TIMESTAMP\x27)", ".replace(/\\\\bNOW\\\\(\\\\)/gi, \x27CURRENT_TIMESTAMP\x27)");

fs.writeFileSync("db.js", code);

