const fs = require('fs');

const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const footerRegex = /<footer[\s\S]*?<\/footer>/;
const indexFooterMatch = indexHtml.match(footerRegex);

if (indexFooterMatch) {
  let productHtml = fs.readFileSync('public/product.html', 'utf8');
  // In product.html we need to change socialIconsFooter to socialIconsProductFooter
  let newFooter = indexFooterMatch[0].replace('id="socialIconsFooter"', 'id="socialIconsProductFooter"');
  // Also we need to keep the extra padding for mobile sticky CTA
  newFooter = newFooter.replace('pt-16 pb-8', 'pt-16 pb-24 md:pb-8');
  
  productHtml = productHtml.replace(footerRegex, newFooter);
  fs.writeFileSync('public/product.html', productHtml, 'utf8');
  console.log('product.html footer updated successfully!');
}
