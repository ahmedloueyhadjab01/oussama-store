const fs = require('fs');
let orders = fs.readFileSync('routes/orders.js', 'utf8');

// Fix rate issue in POST /
// In POST /, I removed const rate = await db.get(...) but later code might still use it.
if (orders.includes('if (!rate) return res.status(400).json({ error: ''ولاية غير معروفة'' });') && !orders.includes('const rate =')) {
    orders = orders.replace(
        /const shippingResult = await ShippingService\.calculateShippingCost/,
        "const rate = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = ', [wilaya_code]);\n    const shippingResult = await ShippingService.calculateShippingCost"
    );
} else {
    // If rate is entirely missing but referenced.
    orders = orders.replace(
        /const shippingResult = await ShippingService\.calculateShippingCost/,
        "const rate = await db.get('SELECT * FROM delivery_rates WHERE wilaya_code = ', [wilaya_code]);\n    const shippingResult = await ShippingService.calculateShippingCost"
    );
}

// Fix syntax near stats
orders = orders.replace(/\}\);\n\/\/ \.\.\.\n\}\);/g, '});');
orders = orders.replace(/\}\);\n\s*\}\);\n\nrouter\.get\('\/profit-30d'/g, '});\n\nrouter.get(''/profit-30d''');
orders = orders.replace(/top_products\n    \}\);\n  \} catch \(err\) \{/g, 'top_products\n    });\n  } catch (err) {');
// Let's just fix the trailing }); for profit-30d
if (orders.match(/top_products\n    \}\);\n  \} catch \(err\) \{\n    res\.status\(500\)\.json\(\{ error: 'Server error' \}\);\n  \}\n\}\);\nmodule\.exports = router;/)) {
    // Already good
} else {
    orders = orders.replace(/res\.status\(500\)\.json\(\{ error: 'Server error' \}\);\n  \}\nmodule\.exports = router;/g, "res.status(500).json({ error: 'Server error' });\n  }\n});\nmodule.exports = router;");
}

fs.writeFileSync('routes/orders.js', orders);
