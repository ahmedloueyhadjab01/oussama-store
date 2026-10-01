const fs = require('fs');
const html = fs.readFileSync('old_product.html', 'utf8');
const startIdx = html.indexOf("let CURRENT_DELIVERY_TYPE = 'home';");
const startTagIdx = html.lastIndexOf('<script>', startIdx);
const endTagIdx = html.indexOf('</script>', startIdx);
console.log('Start:', startTagIdx, 'End:', endTagIdx);
const scriptContent = html.substring(startTagIdx + 8, endTagIdx);
fs.writeFileSync('product_full.js', scriptContent, 'utf8');
console.log('Done, length:', scriptContent.length);
