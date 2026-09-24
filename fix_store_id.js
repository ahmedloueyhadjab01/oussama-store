const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');
code = code.replace(/function detectStoreIdentifier\(\)\s*\{\s*return\s*['"]default['"];\s*\}/, "function detectStoreIdentifier() { return 'ovaro_28'; }");
fs.writeFileSync('public/js/store.js', code, 'utf8');
console.log('Fixed detectStoreIdentifier!');
