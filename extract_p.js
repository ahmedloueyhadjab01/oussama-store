const fs = require('fs');
const html = fs.readFileSync('old_product.html', 'utf8');

const regex = /<script>\s*let CURRENT_DELIVERY_TYPE = 'home';[\s\S]*?<\/script>/;
const match = html.match(regex);
if (match) {
  let js = match[0].replace(/<\/?script>/g, '');
  // Since we also updated product.js previously, I should just extract it and apply the DOM ID fixes over it?
  // Let's first just dump it to product_full.js so I can see what I missed.
  fs.writeFileSync('product_full.js', js, 'utf8');
  console.log('Extracted to product_full.js. Length:', js.length);
} else {
  console.log('Not found!');
}
