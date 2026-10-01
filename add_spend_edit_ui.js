const fs = require('fs');
let js = fs.readFileSync('public/js/admin.js', 'utf8');

const oldFormSubmit = js.match(/document\.getElementById\('addSpendForm'\)\?\.addEventListener[\s\S]*?showToast\([\s\S]*?loadCampaignAnalytics\(\);\n\}\);/)[0];

const newFormSubmit = `
let EDIT_SPEND_ID = null;

window.openEditSpend = function(id, campaign_name, source, spend_amount, spend_date, notes) {
  EDIT_SPEND_ID = id;
  document.getElementById('spendCampaignName').value = campaign_name;
  document.getElementById('spendSource').value = source;
  document.getElementById('spendAmount').value = spend_amount;
  document.getElementById('spendDate').value = spend_date;
  document.getElementById('spendNotes').value = notes;
  document.getElementById('spendSubmitBtn').textContent = 'حفظ التعديلات';
  
  // scroll to form
  document.getElementById('addSpendForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

document.getElementById('addSpendForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('spendFormError');
  errorEl.classList.add('hidden');

  const campaign_name = document.getElementById('spendCampaignName').value.trim();
  const source = document.getElementById('spendSource').value;
  const spend_amount = parseFloat(document.getElementById('spendAmount').value);
  const spend_date = document.getElementById('spendDate').value;
  const notes = document.getElementById('spendNotes').value.trim();

  const method = EDIT_SPEND_ID ? 'PUT' : 'POST';
  const url = EDIT_SPEND_ID ? \`/api/campaigns/spend/\${EDIT_SPEND_ID}\` : '/api/campaigns/spend';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaign_name, source, spend_amount, spend_date, notes }),
  });

  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error || 'حدث خطأ';
    errorEl.classList.remove('hidden');
    return;
  }

  showToast(EDIT_SPEND_ID ? 'تم تعديل المصروف بنجاح ✅' : \`تم تسجيل \${money(spend_amount)} مصاريف لحملة "\${campaign_name}"\`);
  
  // Reset
  EDIT_SPEND_ID = null;
  e.target.reset();
  document.getElementById('spendSubmitBtn').textContent = 'تسجيل المصروف';
  
  loadCampaignAnalytics();
});`;

js = js.replace(oldFormSubmit, newFormSubmit);

const oldSpendHtml = js.match(/<button data-spend-id="\$\{s\.id\}" class="delete-spend-btn.*?<\/button>/)[0];
const newSpendHtml = `<button onclick="openEditSpend(\${s.id}, '\${s.campaign_name.replace(/'/g, "\\'")}', '\${s.source}', \${s.spend_amount}, '\${s.spend_date}', '\${(s.notes || '').replace(/'/g, "\\'")}')" class="text-ink/70 hover:text-ink text-xs font-black px-2 py-1 rounded-lg hover:bg-sand transition">تعديل</button>
            <button data-spend-id="\${s.id}" class="delete-spend-btn text-rose-500 hover:text-rose-700 text-xs font-black px-2 py-1 rounded-lg hover:bg-rose-50 transition">حذف</button>`;

js = js.replace(oldSpendHtml, newSpendHtml);

fs.writeFileSync('public/js/admin.js', js);
console.log("Spend edit UI added.");
