const fs = require('fs');

let dbjs = fs.readFileSync('db.js', 'utf8');
dbjs = dbjs.replace(/\.replace\(\/\\\\\$\\d\+\/g, '\?'\)/g, ".replace(/\\\\(\\d+)/g, '?1')");
dbjs = dbjs.replace(/sqlite\.pragma\('foreign_keys = OFF'\);/g, "sqlite.pragma('foreign_keys = ON');");
dbjs = dbjs.replace(/let databaseMode = 'postgres';/g, "let databaseMode = 'postgres';\nmodule.exports.getMode = () => databaseMode;");
fs.writeFileSync('db.js', dbjs);

let serverjs = fs.readFileSync('server.js', 'utf8');
serverjs = serverjs.replace(/res\.json\(\{ status: 'ok', database: 'postgresql',/g, "res.json({ status: 'ok', database: require('./db').getMode(),");
fs.writeFileSync('server.js', serverjs);

// Remove profit-30d from inside stats, and replace Cross-DB syntax
let ordersjs = fs.readFileSync('routes/orders.js', 'utf8');

// First remove the old injected profit-30d completely
const profitMatch = ordersjs.match(/router\.get\("\/profit-30d"[\s\S]*?\}\);\n/);
if (profitMatch) {
    ordersjs = ordersjs.replace(profitMatch[0], "");
}

// Ensure the new route is placed outside
const newProfit30d = 
router.get('/profit-30d', requireAuth, async (req, res) => {
  try {
    const userId = req.user.role === 'admin' ? null : req.user.id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    let ordersQuery = "SELECT * FROM orders WHERE status = 'تم التسليم' AND created_at >= ";
    let params = [thirtyDaysAgo];
    if (userId) {
      ordersQuery += " AND user_id = ";
      params.push(userId);
    }

    const orders = await db.all(ordersQuery, params);
    
    let revenue = 0;
    let cost_of_goods = 0;
    let shipping_cost = 0;
    let units_sold = 0;
    const productSales = {};

    for (const o of orders) {
      revenue += Number(o.subtotal) || 0;
      shipping_cost += Number(o.shipping_cost_actual || o.delivery_price) || 0;
      let items = [];
      try { items = JSON.parse(o.items || '[]'); } catch (e) {}

      for (const item of items) {
        const qty = Number(item.qty) || 0;
        const cost = Number(item.cost_price) || 0;
        const price = Number(item.price) || 0;
        
        cost_of_goods += cost * qty;
        units_sold += qty;
        
        if (!productSales[item.id]) {
          productSales[item.id] = { name: item.name, qty: 0, revenue: 0, cost: 0 };
        }
        productSales[item.id].qty += qty;
        productSales[item.id].revenue += price * qty;
        productSales[item.id].cost += cost * qty;
      }
    }

    let lostShippingQuery = "SELECT COALESCE(SUM(COALESCE(NULLIF(shipping_cost_actual, 0), delivery_price)), 0) AS lost FROM orders WHERE status IN ('ملغي', 'مرتجع', 'تعذر التوصيل') AND shipping_cost_incurred = 1 AND created_at >= ";
    let paramsLost = [thirtyDaysAgo];
    if (userId) {
      lostShippingQuery += " AND user_id = ";
      paramsLost.push(userId);
    }
    
    const lostRes = await db.get(lostShippingQuery, paramsLost);
    shipping_cost += Number(lostRes ? lostRes.lost : 0) || 0;

    const top_products = Object.values(productSales)
      .sort((a, b) => (b.revenue - b.cost) - (a.revenue - a.cost))
      .slice(0, 10).map(p => ({ ...p, profit: p.revenue - p.cost }));

    res.json({
      period_days: 30, delivered_orders: orders.length, units_sold,
      revenue, cost_of_goods, shipping_cost, net_profit: revenue - cost_of_goods - shipping_cost,
      top_products
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
;

ordersjs = ordersjs.replace(/module\.exports = router;/, newProfit30d + "\nmodule.exports = router;");

// Fix NOW() - INTERVAL '10 minutes' in POST /
ordersjs = ordersjs.replace(
  /created_at >= NOW\(\) - INTERVAL '10 minutes'/g,
  "created_at >= "
);
// We also need to add the parameter. Wait, I'll write a better regex replacement for this.
fs.writeFileSync('routes/orders.js', ordersjs);
console.log('Fixed DB params, health check, foreign_keys, and profit-30d extracted.');
