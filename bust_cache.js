const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
const v = '?v=' + Date.now();
html = html.replace(/src="\/js\/locations\.js[^"]*"/, 'src="/js/locations.js' + v + '"');
html = html.replace(/src="\/js\/cart\.js[^"]*"/, 'src="/js/cart.js' + v + '"');
html = html.replace(/src="\/js\/social\.js[^"]*"/, 'src="/js/social.js' + v + '"');
html = html.replace(/src="\/js\/store\.js[^"]*"/, 'src="/js/store.js' + v + '"');
fs.writeFileSync('public/index.html', html, 'utf8');

// Also do it for product.html
if (fs.existsSync('public/product.html')) {
  let phtml = fs.readFileSync('public/product.html', 'utf8');
  phtml = phtml.replace(/src="\/js\/locations\.js[^"]*"/, 'src="/js/locations.js' + v + '"');
  phtml = phtml.replace(/src="\/js\/cart\.js[^"]*"/, 'src="/js/cart.js' + v + '"');
  phtml = phtml.replace(/src="\/js\/social\.js[^"]*"/, 'src="/js/social.js' + v + '"');
  phtml = phtml.replace(/src="\/js\/product\.js[^"]*"/, 'src="/js/product.js' + v + '"');
  fs.writeFileSync('public/product.html', phtml, 'utf8');
}
console.log('Cache busting applied to HTML files!');
