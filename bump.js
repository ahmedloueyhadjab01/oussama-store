const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
const ts = Date.now();
html = html.replace(/src="\/js\/store.js\?v=\d+"/g, `src="/js/store.js?v=${ts}"`);
fs.writeFileSync('public/index.html', html);
console.log('Bumped store.js cache');
