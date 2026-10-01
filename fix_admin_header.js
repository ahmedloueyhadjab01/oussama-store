const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const targetHeader = `<header class="bg-white border-b border-slate-200 sticky top-0 z-30">
  <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <h1 class=" text-xl font-black text-slate-900">???? ???? ??????</h1>
      
    </div>
    <div class="flex items-center gap-2 sm:gap-3">
      <span id="userGreeting" class="text-sm font-black text-slate-900/70 hidden sm:inline"></span>
      <a id="vendorStoreLink" href="/" target="_blank" class="btn-primary text-sm px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5 shadow-sm">
        <span></span>
        <span>???? ovaro_28</span>
        <span class="text-[10px]"></span>
      </a>
      <button id="contactTeamBtn" type="button" class="btn-outline text-sm px-3 py-1.5 rounded-lg font-black flex items-center gap-1.5" title="????? ?? ???? ????? ?????">
        <span></span>
        <span>???? ?????</span>
      </button>
      <button id="copyVendorStoreLinkBtn" type="button" class="btn-outline text-sm px-2.5 py-1.5 rounded-lg font-black hidden md:inline-flex items-center gap-1" title="??? ???? ??????">
        <span>??? ??????</span>
      </button>
      <button id="logoutBtn" class="btn-outline text-sm px-3 py-1.5 rounded-lg font-black">????</button>
    </div>
  </div>`;

const newHeader = `<header class="bg-white border-b border-slate-200 sticky top-0 z-30">
  <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <h1 class="text-lg sm:text-xl font-black text-slate-900">???? ???? ??????</h1>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <span id="userGreeting" class="text-sm font-black text-slate-900/70 hidden sm:inline"></span>
      <a id="vendorStoreLink" href="/" target="_blank" class="btn-primary text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1 shadow-sm">
        <span>???? ovaro_28</span>
      </a>
      <button id="contactTeamBtn" type="button" class="btn-outline text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1" title="????? ?? ???? ????? ?????">
        <span>???? ?????</span>
      </button>
      <button id="copyVendorStoreLinkBtn" type="button" class="btn-outline text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black hidden md:inline-flex items-center gap-1" title="??? ???? ??????">
        <span>??? ??????</span>
      </button>
      <button id="logoutBtn" class="btn-outline text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black">????</button>
    </div>
  </div>`;

// Note: the original HTML might have \r\n or varying spaces.
// We'll replace it using a regex that captures from <header to the end of the div.
const regex = /<header class="bg-white border-b border-slate-200 sticky top-0 z-30">[\s\S]*?<button id="logoutBtn"[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/;
html = html.replace(regex, newHeader);

fs.writeFileSync('public/admin.html', html, 'utf8');
console.log('Admin header fixed.');
