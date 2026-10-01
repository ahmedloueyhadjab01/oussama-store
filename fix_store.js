const fs = require('fs');
let js = fs.readFileSync('public/js/store.js', 'utf8');

const oldOpenClose = `function openCart() {
  renderCartDrawer();
  document.getElementById('checkoutOverlay' /* renamed overlay */).classList.remove('hidden');
  document.getElementById('cartDrawer').classList.add('open');
}
function closeCart() {
  document.getElementById('checkoutOverlay' /* renamed overlay */).classList.add('hidden');
  document.getElementById('cartDrawer').classList.remove('open');
}`;

const newOpenClose = `function openCart() {
  renderCartDrawer();
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if(drawer) drawer.classList.remove('hidden');
  if(content) setTimeout(() => content.classList.remove('translate-x-full'), 10);
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if(content) content.classList.add('translate-x-full');
  if(drawer) setTimeout(() => drawer.classList.add('hidden'), 300);
}`;

// I'll replace it carefully in case of whitespace mismatches
js = js.replace(/function openCart\(\)\s*\{[\s\S]*?function closeCart\(\)\s*\{[\s\S]*?\}\s*document\.getElementById\('cartBtn'\)/, newOpenClose + '\n\ndocument.getElementById(\'cartBtn\')');

fs.writeFileSync('public/js/store.js', js, 'utf8');
console.log('Fixed openCart in store.js');
