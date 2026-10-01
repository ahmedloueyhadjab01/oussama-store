const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/id="productsSection"\s+class="([^"]+)"\s+id="productsGrid"/, 'id="productsGrid" class="$1"');
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Fixed double ID bug!');
