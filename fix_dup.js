const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');

const duplicateCheckout = /document\.getElementById\('checkoutBtn'\)\?\.addEventListener\('click',\s*\(\)\s*=>\s*\{\s*if\s*\(!Cart\.get\(\)\.length\)\s*return;\s*closeCart\(\);\s*updateGrandTotal\(\);\s*document\.getElementById\('checkoutOverlay'\)\.classList\.remove\('hidden'\);\s*\}\);/;

code = code.replace(duplicateCheckout, '');

// also in product.js
fs.writeFileSync('public/js/store.js', code, 'utf8');

if (fs.existsSync('public/js/product.js')) {
  let pcode = fs.readFileSync('public/js/product.js', 'utf8');
  pcode = pcode.replace(duplicateCheckout, '');
  fs.writeFileSync('public/js/product.js', pcode, 'utf8');
}
console.log('Removed duplicate checkoutBtn listeners');
