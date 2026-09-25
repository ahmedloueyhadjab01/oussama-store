const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Fix search form
html = html.replace(/<form id="searchFormDesktop".*?>\s*<input id="searchInput" type="search".*?>/, 
  `<form id="searchFormDesktop" class="hidden md:flex flex-1 max-w-xl relative items-center w-full">
          <input id="searchInput" type="text" placeholder="??? ?? ????..." autocomplete="off" class="w-full pr-4 pl-16 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 rounded-full border border-slate-200 bg-white focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm" />`
);

// We should also adjust the position of clearSearchBtn if we changed pl-24 to pl-16
// Actually, left-14 is 3.5rem, which is fine since the search button is on the far left.
// Let's make sure the replacement worked.
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Fixed search.');
