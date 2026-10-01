const fs = require('fs');
const html = fs.readFileSync('old_product.html', 'utf8');

const regex = /<script>\s*let CURRENT_DELIVERY_TYPE = 'home';[\s\S]*?<\/script>/;
const match = html.match(regex);
if (match) {
  let js = match[0].replace(/<script>\s*/, '').replace(/\s*<\/script>/, '');
  fs.writeFileSync('public/js/product.js', js, 'utf8');
  console.log('Fixed product.js! Length:', js.length);
} else {
  console.log('Regex match not found!');
}
