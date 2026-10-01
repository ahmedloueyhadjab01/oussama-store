
const fs = require("fs");
let server = fs.readFileSync("server.js", "utf8");

if (!server.includes("unhandledRejection")) {
  server = "process.on(\x27unhandledRejection\x27, (err) => { console.error(\x27Unhandled Rejection:\x27, err); });\nprocess.on(\x27uncaughtException\x27, (err) => { console.error(\x27Uncaught Exception:\x27, err); });\n" + server;
  fs.writeFileSync("server.js", server);
}

