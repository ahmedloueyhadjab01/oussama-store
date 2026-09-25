const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const newStyle = `  <style>
    :root { --primary: #1d4ed8; --bg: #f1f5f9; --surface: #ffffff; --border: #e2e8f0; --text: #0f172a; --muted: #64748b; --radius: 0.875rem; }
    * { box-sizing: border-box; }
    body { font-family: 'IBM Plex Sans Arabic', sans-serif; background-color: var(--bg); color: var(--text); }
    .glass-nav { background: rgba(255,255,255,0.97); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); box-shadow: 0 1px 8px rgba(0,0,0,0.05); }
    .bottom-nav { background: rgba(255,255,255,0.99); backdrop-filter: blur(16px); border-top: 1px solid var(--border); padding-bottom: env(safe-area-inset-bottom); box-shadow: 0 -2px 12px rgba(0,0,0,0.05); }
    .nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; color: #94a3b8; transition: all 0.2s; position: relative; }
    .nav-item:hover, .nav-item.active { color: var(--primary); }
    .nav-icon { width: 24px; height: 24px; margin-bottom: 4px; transition: transform 0.2s; }
    .nav-item:hover .nav-icon { transform: translateY(-2px); }
    .nav-label { font-size: 10px; font-weight: 700; opacity: 0; transform: translateY(5px); transition: all 0.2s; position: absolute; bottom: 6px; }
    .nav-item:hover .nav-label, .nav-item:active .nav-label { opacity: 1; transform: translateY(0); }
    .nav-item:hover .nav-icon, .nav-item:active .nav-icon { transform: translateY(-10px); }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    /* ===== BUTTONS ===== */
    #cartBtn {
      background: linear-gradient(135deg, #1e40af, #2563eb);
      border: none; border-radius: 12px; padding: 0.65rem 1.4rem;
      font-size: 0.875rem; font-weight: 700; color: #fff;
      display: flex; align-items: center; gap: 0.5rem; cursor: pointer;
      box-shadow: 0 4px 16px rgba(29,78,216,0.4); transition: all 0.22s;
    }
    #cartBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(29,78,216,0.5); }
    #cartBtn:active { transform: translateY(0); }
    #searchBtn {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      border: none; border-radius: 8px; padding: 0.45rem 1rem;
      font-size: 0.75rem; font-weight: 700; color: #fff; cursor: pointer;
      box-shadow: 0 2px 8px rgba(29,78,216,0.3); transition: all 0.2s;
    }
    #searchBtn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(29,78,216,0.45); }
    .cat-btn {
      border-radius: 10px; padding: 0.5rem 1.15rem; font-size: 0.8rem; font-weight: 700;
      transition: all 0.18s; border: 1.5px solid #e2e8f0; color: var(--muted);
      background: var(--surface); cursor: pointer; white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .cat-btn:hover { border-color: #93c5fd; color: var(--primary); background: #eff6ff; transform: translateY(-1px); }
    .cat-btn.active-cat {
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #fff; border-color: transparent;
      box-shadow: 0 4px 14px rgba(29,78,216,0.4); transform: translateY(-1px);
    }
    .subcat-btn {
      border-radius: 8px; padding: 0.35rem 0.9rem; font-size: 0.78rem; font-weight: 700;
      transition: all 0.18s; border: 1.5px solid var(--border); color: var(--muted);
      background: var(--surface); cursor: pointer;
    }
    .subcat-btn:hover { border-color: #93c5fd; color: var(--primary); }
    .subcat-btn.active-cat {
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #fff; border-color: transparent; box-shadow: 0 3px 10px rgba(29,78,216,0.35);
    }
    #checkoutBtn {
      width: 100%;
      background: linear-gradient(135deg, #1e40af, #2563eb);
      color: #fff; font-weight: 800; font-size: 1rem;
      padding: 1rem; border-radius: 14px; border: none; cursor: pointer;
      box-shadow: 0 4px 18px rgba(29,78,216,0.45); transition: all 0.22s;
    }
    #checkoutBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(29,78,216,0.55); }
    #checkoutBtn:active { transform: translateY(0); }
    #checkoutBtn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    #confirmOrderBtn {
      flex: 1;
      background: linear-gradient(135deg, #15803d, #22c55e);
      color: #fff; font-weight: 800; font-size: 1rem;
      padding: 1rem; border-radius: 14px; border: none; cursor: pointer;
      box-shadow: 0 4px 18px rgba(21,128,61,0.4); transition: all 0.22s;
    }
    #confirmOrderBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(21,128,61,0.55); }
    #confirmOrderBtn:active { transform: translateY(0); }
    #cancelCheckout {
      padding: 1rem 1.2rem; background: #f1f5f9; color: #475569; font-weight: 700;
      border-radius: 14px; border: 1.5px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
    }
    #cancelCheckout:hover { background: #e2e8f0; color: #0f172a; }
    #cancelCheckoutHeader {
      padding: 0.45rem; background: transparent; border: none; cursor: pointer;
      border-radius: 50%; color: #94a3b8; transition: all 0.2s; line-height: 0;
    }
    #cancelCheckoutHeader:hover { background: #fee2e2; color: #ef4444; }
    /* Checkout */
    .checkout-modal { background: rgba(255,255,255,0.99); backdrop-filter: blur(20px); }
    .input-field { width: 100%; padding: 0.8rem 1rem; font-size: 0.95rem; border-radius: var(--radius); border: 1.5px solid var(--border); background: #fafafa; color: var(--text); outline: none; transition: all 0.2s; }
    .input-field:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(29,78,216,0.1); background: #fff; }
    .delivery-option { border-radius: var(--radius); border: 1.5px solid var(--border); transition: all 0.2s; cursor: pointer; }
    .delivery-option:has(input:checked) { border-color: var(--primary); background: #eff6ff; }
  </style>`;

// استبدل كل بلوك الـ <style>...</style>
html = html.replace(/<style>[\s\S]*?<\/style>/, newStyle);
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Done! Style updated.');
