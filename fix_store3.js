const fs = require('fs');
let lines = fs.readFileSync('public/js/store.js', 'utf8').split('\n');

const newLogicLines = `async function loadCategories() {
  const params = new URLSearchParams();
  if (CURRENT_STORE_ID) params.set('store_id', CURRENT_STORE_ID);
  const res = await fetch(\`/api/categories?\${params.toString()}\`);
  CATEGORY_TREE = await res.json();

  const nav = document.getElementById('categoryNav');
  nav.querySelectorAll('.cat-btn:not([data-cat=""])').forEach((b) => b.remove());

  for (const cat of CATEGORY_TREE) {
    const btn = document.createElement('button');
    btn.className = 'cat-btn px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900';
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    nav.appendChild(btn);
  }

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    selectMainCategory(btn.dataset.cat, false);
  });
  
  if (CURRENT_CATEGORY) {
    let parentCat = CATEGORY_TREE.find(c => String(c.id) === String(CURRENT_CATEGORY));
    if (!parentCat) {
      const parentWithChild = CATEGORY_TREE.find(c => c.children && c.children.some(child => String(child.id) === String(CURRENT_CATEGORY)));
      if (parentWithChild) {
        selectMainCategory(parentWithChild.id, true);
        const subNav = document.getElementById('subCategoryNav');
        if (subNav) {
           subNav.querySelectorAll('.subcat-btn').forEach(b => b.classList.remove('active-cat'));
           const activeSub = subNav.querySelector(\`.subcat-btn[data-subcat="\${CURRENT_CATEGORY}"]\`);
           if (activeSub) activeSub.classList.add('active-cat');
        }
        return;
      }
    }
  }
  selectMainCategory(CURRENT_CATEGORY || '', true);
}

function selectMainCategory(catId, skipLoad = false) {
  const nav = document.getElementById('categoryNav');
  const subNav = document.getElementById('subCategoryNav');

  document.querySelectorAll('#categoryNav .cat-btn').forEach((b) => {
    const isActive = String(b.dataset.cat) === String(catId);
    b.classList.toggle('active-cat', isActive);
    b.classList.toggle('dimmed', !isActive && catId !== '');
  });

  CURRENT_CATEGORY = catId;

  let children = [];
  let isAll = false;
  if (!catId) {
    isAll = true;
    CATEGORY_TREE.forEach(p => {
      if (p.children) children.push(...p.children);
    });
  } else {
    const parent = CATEGORY_TREE.find((c) => String(c.id) === String(catId));
    children = parent && parent.children ? parent.children : [];
  }

  if (children.length) {
    subNav.classList.remove('hidden');
    let html = '';
    if (!isAll) {
      const p = CATEGORY_TREE.find((c) => String(c.id) === String(catId));
      if (p) {
        html += \`<button data-subcat="\${catId}" class="subcat-btn active-cat">???? ?? \${escapeHtmlSimple(p.name)}</button>\`;
      }
    }
    html += children.map((c) => \`<button data-subcat="\${c.id}" class="subcat-btn">\${escapeHtmlSimple(c.name)}</button>\`).join('');
    
    subNav.innerHTML = html;
    subNav.querySelectorAll('.subcat-btn').forEach((sb) => {
      sb.addEventListener('click', () => {
        subNav.querySelectorAll('.subcat-btn').forEach((b) => b.classList.remove('active-cat'));
        sb.classList.add('active-cat');
        CURRENT_CATEGORY = sb.dataset.subcat;
        loadProducts();
      });
    });
  } else {
    subNav.classList.add('hidden');
    subNav.innerHTML = '';
  }

  if (!skipLoad) {
    loadProducts();
  }
}`.split('\n');

const start = 68; // 0-indexed line 69
const end = 129; // 0-indexed line 130
lines.splice(start, end - start, ...newLogicLines);

let js = lines.join('\n');

// openCart fix
const newOpenClose = `function openCart() {
  renderCartDrawer();
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if (drawer) drawer.classList.remove('hidden');
  if (content) setTimeout(() => content.classList.remove('translate-x-full', 'translate-x-[100%]'), 10);
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if (content) content.classList.add('translate-x-full');
  if (drawer) setTimeout(() => drawer.classList.add('hidden'), 300);
}`;
const openCloseRegex = /function openCart\(\) \{[\s\S]*?function closeCart\(\) \{[\s\S]*?\n\s+\}/;
js = js.replace(openCloseRegex, newOpenClose);
js = js.replace("document.getElementById('checkoutOverlay' /* renamed overlay */).addEventListener('click', closeCart);", "document.getElementById('cartDrawer')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCart(); });\n  document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) { document.getElementById('checkoutOverlay').classList.add('hidden'); } });");

fs.writeFileSync('public/js/store.js', js, 'utf8');
console.log('Fixed using array splice!');
