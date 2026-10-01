const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');

// Replace the hardcoded ID-based links with just bubbling up to the card click
code = code.replace(/onclick="location\.href='\/product\.html\?id=\$\{p\.id\}'"/g, '');

fs.writeFileSync('public/js/store.js', code, 'utf8');
console.log('Fixed hardcoded product.html links in store.js!');
