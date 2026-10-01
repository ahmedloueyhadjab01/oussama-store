const fs = require('fs');
if (fs.existsSync('public/js/product.js')) {
  let pcode = fs.readFileSync('public/js/product.js', 'utf8');
  pcode = pcode.replace(/onclick="[^"]*addToCart[^"]*"/g, '');
  fs.writeFileSync('public/js/product.js', pcode, 'utf8');
  console.log('Cleaned product.js');
}
