const fs = require('fs');
let code = fs.readFileSync('public/js/store.js', 'utf8');

code = code.replace(/document.getElementById\('cartItemsList'\)/g, "document.getElementById('cartItems')");
code = code.replace(/document.getElementById\('bottomCartCount'\)/g, "document.getElementById('cartCountMobile')");

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

// Replace listeners
code = code.replace(/document\.getElementById\('cartBtn'\)\?\.addEventListener\('click',\s*openCart\);[\s\S]*?(?=const\s+wilayaSelect)/, `document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('cartBtnMobile')?.addEventListener('click', openCart);
document.getElementById('closeCartBtn')?.addEventListener('click', closeCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);

// Checkout modal open logic
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  if (!Cart.get().length) return;
  closeCart();
  const modal = document.getElementById('checkoutModal');
  if(modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => modal.querySelector('.bg-white').classList.remove('translate-y-full'), 10);
  }
  updateGrandTotal();
});

// Checkout modal close logic
document.querySelectorAll('.close-checkout, .checkout-overlay').forEach(el => {
  el.addEventListener('click', () => {
    const modal = document.getElementById('checkoutModal');
    if(modal) {
      modal.querySelector('.bg-white').classList.add('translate-y-full');
      setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }, 300);
    }
  });
});

  `);

fs.writeFileSync('public/js/store.js', code, 'utf8');
console.log('Fixed cart UI logic!');
