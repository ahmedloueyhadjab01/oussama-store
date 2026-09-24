const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');

code = code.replace(/document\.getElementById\('wilaya'\)/g, "document.getElementById('customerWilaya')");
code = code.replace(/document\.getElementById\('commune'\)/g, "document.getElementById('customerCommune')");
code = code.replace(/document\.getElementById\('cartItemsList'\)/g, "document.getElementById('cartItems')");

code = code.replace(/customer_name:\s*form\.customer_name\.value\.trim\(\),/g, "customer_name: document.getElementById('customerName').value.trim(),");
code = code.replace(/phone:\s*form\.phone\.value\.trim\(\),/g, "phone: document.getElementById('customerPhone').value.trim(),");
code = code.replace(/address:\s*form\.address\.value\.trim\(\),/g, "address: document.getElementById('customerAddress').value.trim(),");

// In case checkoutError is missing in HTML, prevent null error
code = code.replace(/const errorEl = document.getElementById\('checkoutError'[\s\S]*?\);/, "const errorEl = document.getElementById('checkoutError') || document.createElement('div');");

// The emptyState might be missing, prevent null error
code = code.replace(/const empty = document.getElementById\('emptyState'\);/g, "const empty = document.getElementById('emptyState') || document.createElement('div');");

// Hide checkout modal logic (previously checkoutOverlay)
code = code.replace(/document\.getElementById\('checkoutOverlay'\)\.classList\.add\('hidden'\);/g, `const modal = document.getElementById('checkoutModal');
if(modal) {
  const inner = modal.querySelector('.bg-white');
  if(inner) inner.classList.add('translate-y-full');
  setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
}`);

fs.writeFileSync('public/js/store.js', code, 'utf8');
console.log('Fixed checkout form and logic!');
