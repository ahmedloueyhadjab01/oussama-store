const fs = require('fs');
let routes = fs.readFileSync('routes/campaigns.js', 'utf8');

const putRoute = `
// تعديل مصروف إعلاني
router.put(
  '/spend/:id',
  requireAuth,
  [
    body('campaign_name').trim().notEmpty().withMessage('اسم الحملة مطلوب'),
    body('spend_amount').isFloat({ min: 0.01 }).withMessage('المبلغ يجب أن يكون أكبر من 0'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const spend = await db.get('SELECT user_id FROM campaign_ad_spend WHERE id = $1', [req.params.id]);
      if (!spend) return res.status(404).json({ error: 'السجل غير موجود' });
      if (spend.user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'لا تملك صلاحية التعديل' });
      }

      const { campaign_name, source, spend_amount, spend_date, notes } = req.body;
      await db.query(
        \`UPDATE campaign_ad_spend SET campaign_name = $1, source = $2, spend_amount = $3, spend_date = $4, notes = $5 WHERE id = $6\`,
        [campaign_name.trim(), (source || 'facebook').trim(), parseFloat(spend_amount), spend_date, (notes || '').trim(), req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطأ أثناء التعديل' });
    }
  }
);
`;

// Insert before the DELETE route
routes = routes.replace("// 3. حذف مصروف إعلاني", putRoute + "\n// 3. حذف مصروف إعلاني");
fs.writeFileSync('routes/campaigns.js', routes);
console.log("PUT route added to campaigns.js");
