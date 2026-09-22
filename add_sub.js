const fs = require('fs');
let js = fs.readFileSync('routes/auth.js', 'utf8');
js = js.replace('module.exports = router;', `
router.get('/subscription', (req, res) => {
  res.json({
    status: 'active',
    plan: 'lifetime',
    ends_at: null,
    days_left: 9999
  });
});

module.exports = router;
`);
fs.writeFileSync('routes/auth.js', js);
console.log('Added dummy subscription endpoint');
