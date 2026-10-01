const fs = require('fs');
let code = fs.readFileSync('public/js/product.js', 'utf8');

const missingTop = `let CURRENT_DELIVERY_TYPE = 'home';
let PRODUCT_QTY = 1;

(function captureUtm() {
  const params = new URLSearchParams(window.location.search);
  const utm_fields = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content'];
  let found = false;
  for (const field of utm_fields) {
    if (params.has(field)) {
      sessionStorage.setItem(field, params.get(field));
      found = true;
    }
  }
`;

code = missingTop + code;
fs.writeFileSync('public/js/product.js', code, 'utf8');
console.log('Fixed product.js top lines!');
