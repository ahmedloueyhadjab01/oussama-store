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
  if (drawer) drawer.classList.remove('hidden');
  if (content) setTimeout(() => content.classList.remove('translate-x-full', 'translate-x-[100%]'), 10);
}
function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const content = document.getElementById('cartDrawerContent');
  if (content) content.classList.add('translate-x-full');
  if (drawer) setTimeout(() => drawer.classList.add('hidden'), 300);
}`;
js = js.replace(oldOpenClose, newOpenClose);
js = js.replace("document.getElementById('checkoutOverlay' /* renamed overlay */).addEventListener('click', closeCart);", "document.getElementById('cartDrawer')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCart(); });\n  document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) { document.getElementById('checkoutOverlay').classList.add('hidden'); } });");

const oldCatLogic = `async function loadCategories() {
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
    selectMainCategory(btn.dataset.cat);
  });
}

function selectMainCategory(catId) {
  const nav = document.getElementById('categoryNav');
  const subNav = document.getElementById('subCategoryNav');

  document.querySelectorAll('#categoryNav .cat-btn').forEach((b) => {
    const isActive = b.dataset.cat === catId;
    b.classList.toggle('active-cat', isActive);
    b.classList.toggle('dimmed', !isActive && catId !== '');
  });

  CURRENT_CATEGORY = catId;

  // ????? ????????? ??????? ??? ??? ????
  const parent = CATEGORY_TREE.find((c) => String(c.id) === String(catId));
  const children = parent && parent.children ? parent.children : [];

  if (children.length) {
    subNav.classList.remove('hidden');
    subNav.innerHTML =
      \`<button data-subcat="\${catId}" class="subcat-btn active-cat">???? ?? \${escapeHtmlSimple(parent.name)}</button>\` +
      children.map((c) => \`<button data-subcat="\${c.id}" class="subcat-btn">\${escapeHtmlSimple(c.name)}</button>\`).join('');
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

  loadProducts();
}`;

const newCatLogic = `async function loadCategories() {
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
}`;

js = js.replace(oldCatLogic, newCatLogic);

fs.writeFileSync('public/js/store.js', js, 'utf8');
console.log('Fixed safely!');
