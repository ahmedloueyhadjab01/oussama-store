const fs = require('fs');
let html = fs.readFileSync('public/product.html', 'utf8');

// Fix header
html = html.replace('<header class="sticky top-0 z-40', '<header class="relative z-40');

// Fix openCart and closeCart
const oldCartCode = `function openCart() {
      renderCartDrawer();
      document.getElementById('cartOverlay').classList.remove('hidden');
      document.getElementById('cartDrawer').classList.add('open');
    }

    function closeCart() {
      document.getElementById('cartOverlay').classList.add('hidden');
      document.getElementById('cartDrawer').classList.remove('open');
    }`;

const newCartCode = `function openCart() {
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

html = html.replace(oldCartCode, newCartCode);

fs.writeFileSync('public/product.html', html, 'utf8');
console.log('Fixed product.html');
