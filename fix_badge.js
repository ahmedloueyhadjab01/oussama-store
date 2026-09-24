const fs = require('fs');
let code = fs.readFileSync('public/js/cart.js', 'utf8');
code = code.replace(/if \(badge\) badge.textContent = this.count\(\);/g, `if (badge) badge.textContent = this.count();
    const badgeM = document.getElementById('cartCountMobile');
    if (badgeM) badgeM.textContent = this.count();`);
fs.writeFileSync('public/js/cart.js', code, 'utf8');
