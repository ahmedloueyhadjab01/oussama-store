const fs = require('fs');
let js = fs.readFileSync('db.js', 'utf8');
js = js.replace('free_shipping_threshold NUMERIC(10, 2) DEFAULT 15000,', 'free_shipping_threshold NUMERIC(10, 2) DEFAULT 15000,\n        manual_provider_name VARCHAR(255) DEFAULT NULL,');
fs.writeFileSync('db.js', js, 'utf8');
