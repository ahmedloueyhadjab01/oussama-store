const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Change type="search" to type="text"
html = html.replace(/<input id="searchInput" type="search"/, '<input id="searchInput" type="text"');

// Change pl-24 to pl-16 (to give text space to appear)
html = html.replace(/class="w-full pr-4 pl-24 py-2.5 text-sm/g, 'class="w-full pr-4 pl-16 py-2.5 text-sm');

// Ensure form has w-full if we want it to expand
html = html.replace(/<form id="searchFormDesktop" class="hidden md:flex flex-1 max-w-xl relative items-center">/, '<form id="searchFormDesktop" class="hidden md:flex flex-1 max-w-xl relative items-center w-full">');

fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Fixed search regexly.');
