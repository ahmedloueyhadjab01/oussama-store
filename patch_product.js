const fs = require('fs');
let code = fs.readFileSync('public/js/product.js', 'utf8');

// Fix the IDs that crash the script on load
code = code.replace(/document\.getElementById\('wilayaSelect'\)/g, "document.getElementById('customerWilaya')");
code = code.replace(/document\.getElementById\('communeSelect'\)/g, "document.getElementById('customerCommune')");

// Fix cart close button ID
code = code.replace(/document\.getElementById\('closeCart'\)/g, "document.getElementById('closeCartBtn')");

// Fix mobile cart btn
code = code.replace(/document\.getElementById\('cartBtn'\)\.addEventListener\('click',\s*openCart\);/g, "document.getElementById('cartBtn')?.addEventListener('click', openCart);\ndocument.getElementById('cartBtnMobile')?.addEventListener('click', openCart);");

// Make all top level getElementById calls safe against null using optional chaining or simple if checks for listeners
code = code.replace(/document\.getElementById\('([^']+)'\)\.addEventListener/g, "document.getElementById('$1')?.addEventListener");

fs.writeFileSync('public/js/product.js', code, 'utf8');
console.log('product.js patched successfully.');
