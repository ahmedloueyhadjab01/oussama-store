
const fs = require("fs");

let dbjs = fs.readFileSync("db.js", "utf8");
dbjs = dbjs.replace(/\.replace\(\/\\\\\$\\d\+\/g, \x27\?\x27\)/g, ".replace(/\\\\$(\\d+)/g, \x27?$1\x27)");
dbjs = dbjs.replace(/sqlite\.pragma\(\x27foreign_keys = OFF\x27\);/g, "sqlite.pragma(\x27foreign_keys = ON\x27);");
dbjs = dbjs.replace(/let databaseMode = \x27postgres\x27;/g, "let databaseMode = \x27postgres\x27;\nmodule.exports.getMode = () => databaseMode;");
fs.writeFileSync("db.js", dbjs);

let serverjs = fs.readFileSync("server.js", "utf8");
serverjs = serverjs.replace(/res\.json\(\{ status: \x27ok\x27, database: \x27postgresql\x27,/g, "res.json({ status: \x27ok\x27, database: require(\x27./db\x27).getMode(),");
fs.writeFileSync("server.js", serverjs);

console.log("Fixed db and server");

