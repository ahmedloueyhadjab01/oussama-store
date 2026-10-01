
const fs = require("fs");
let ordersjs = fs.readFileSync("routes/orders.js", "utf8");

const pStart = ordersjs.indexOf("router.get(\"/profit-30d\"");
if (pStart !== -1) {
    const pEnd = ordersjs.indexOf("});", pStart + 2000) + 3;
    let profitRoute = ordersjs.substring(pStart, pEnd);
    ordersjs = ordersjs.substring(0, pStart) + ordersjs.substring(pEnd);
    
    // Fix datetime(now) to JS date params
    profitRoute = profitRoute.replace(/created_at >= datetime\(\x27now\x27, \x27-30 days\x27\)/g, "created_at >= $1");
    profitRoute = profitRoute.replace(/let params = \[\];/g, "const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();\n  let params = [thirtyDaysAgo];");
    profitRoute = profitRoute.replace(/AND user_id = \\$1/g, "AND user_id = $2");
    
    ordersjs = profitRoute + "\n\n" + ordersjs;
    fs.writeFileSync("routes/orders.js", ordersjs);
    console.log("Profit route extracted and date syntax fixed.");
} else {
    console.log("Profit route not found.");
}

