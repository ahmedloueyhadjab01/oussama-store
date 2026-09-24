const fs = require('fs');
let code = fs.readFileSync('public/js/product.js', 'utf8');

// Replace openCart
code = code.replace(/function openCart\(\)\s*\{[\s\S]*?\}/, `function openCart() {
  renderCartDrawer();
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if(drawer) drawer.classList.remove('-translate-x-full');
  if(overlay) {
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.remove('opacity-0'), 10);
  }
}`);

// Replace closeCart
code = code.replace(/function closeCart\(\)\s*\{[\s\S]*?\}/, `function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if(drawer) drawer.classList.add('-translate-x-full');
  if(overlay) {
    overlay.classList.add('opacity-0');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}`);

code = code.replace(/document\.getElementById\('cartBtn'\)\.addEventListener\('click', openCart\);[\s\S]*?document\.getElementById\('cartOverlay'\)\.addEventListener\('click', closeCart\);/, `document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('cartBtnMobile')?.addEventListener('click', openCart);
document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);`);

fs.writeFileSync('public/js/product.js', code, 'utf8');
console.log('product.js cart logic fixed!');
