const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');

// remove onclick addToCart
code = code.replace(/onclick="[^"]*addToCart[^"]*"/g, '');

fs.writeFileSync('public/js/store.js', code, 'utf8');
console.log('Removed inline onclick addToCart!');
