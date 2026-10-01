const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace header container classes
html = html.replace('<div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">', '<div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">');

// Replace button container classes
html = html.replace('<div class="flex items-center gap-2 sm:gap-3">', '<div class="flex flex-wrap items-center gap-2">');

// Decrease button sizes
html = html.replace(/<button id="logoutBtn".*?>/g, '<button id="logoutBtn" class="btn-outline text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg font-black">');
html = html.replace(/<a id="vendorStoreLink".*?>\s*<span>.*?<\/span>\s*<span>(.*?)<\/span>\s*<span.*?<\/span>\s*<\/a>/, '<a id="vendorStoreLink" href="/" target="_blank" class="btn-primary text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1.5 shadow-sm">$1</a>');
html = html.replace(/<button id="contactTeamBtn".*?>\s*<span>.*?<\/span>\s*<span>(.*?)<\/span>\s*<\/button>/, '<button id="contactTeamBtn" type="button" class="btn-outline text-xs sm:text-sm px-2.5 py-1.5 rounded-lg font-black flex items-center gap-1.5" title="Support">$1</button>');

fs.writeFileSync('public/admin.html', html, 'utf8');
console.log('Fixed classes without touching Arabic directly.');
