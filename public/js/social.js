// يجلب روابط التواصل الاجتماعي من الإعدادات ويرسم أيقونات SVG حقيقية مع اسم الحساب/الرقم تحتها
const SOCIAL_ICON_META = {
  social_whatsapp: {
    label: 'واتساب',
    color: '#25D366',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
  },
  social_instagram: {
    label: 'انستغرام',
    color: '#E1306C',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`
  },
  social_facebook: {
    label: 'فيسبوك',
    color: '#1877F2',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
  },
  social_tiktok: {
    label: 'تيك توك',
    color: '#010101',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" width="22" height="22"><path d="M448 209.91a210.06 210.06 0 0 1-122.77-39.25v178.72A162.55 162.55 0 1 1 162.6 162.5v86.13a76.54 76.54 0 1 0 76.47 76.44v-325h86.11a196.63 196.63 0 0 0 122.82 46.17z"/></svg>`
  },
  social_telegram: {
    label: 'تلغرام',
    color: '#0088CC',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`
  },
};

// استخراج اسم الحساب أو رقم الهاتف لعرضه تحت الأيقونة (مفيد لمن ليس لديه إنترنت قوي)
function extractHandle(key, value) {
  if (!value) return null;
  try {
    if (key === 'social_whatsapp') {
      const digits = value.replace(/[^0-9]/g, '');
      if (digits.length >= 9) return `+${digits}`;
    }
    if (key === 'social_telegram') {
      const m = value.match(/t\.me\/([^/?#]+)/i);
      if (m) return `@${m[1]}`;
      const m2 = value.match(/@([A-Za-z0-9_]+)/);
      if (m2) return `@${m2[1]}`;
    }
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const parts = url.pathname.replace(/^\/+/, '').replace(/\/$/, '').split('/').filter(Boolean);
    let handle = parts[parts.length - 1] || '';
    // تجاهل segments تقنية مثل profile, channel, pages
    const skip = ['profile', 'channel', 'pages', 'groups', 'video'];
    if (skip.includes(handle.toLowerCase())) handle = parts[0] || '';
    if (handle && handle !== 'www') {
      return handle.startsWith('@') ? handle : `@${handle}`;
    }
  } catch (_) {}
  return null;
}

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSocialUrl(key, value) {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (key === 'social_whatsapp') {
    if (/^https?:\/\//i.test(str)) {
      try {
        const u = new URL(str);
        return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
      } catch { return null; }
    }
    const digits = str.replace(/[^0-9]/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }
  const full = /^https?:\/\//i.test(str) ? str : `https://${str}`;
  try {
    const u = new URL(full);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  } catch {
    return null;
  }
}

async function fetchSocialLinks(storeId = null) {
  try {
    const url = storeId ? `/api/settings/social?store_id=${encodeURIComponent(storeId)}` : '/api/settings/social';
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function renderSocialIcons(container, links, { size = 'w-12 h-12' } = {}) {
  if (!container) return;
  const entries = Object.keys(SOCIAL_ICON_META)
    .map((key) => ({
      key,
      url: normalizeSocialUrl(key, links[key]),
      handle: extractHandle(key, links[key]),
      ...SOCIAL_ICON_META[key]
    }))
    .filter((e) => e.url);

  const section = container.closest('[data-social-section]');
  const divider = document.getElementById('footerSocialDivider');
  if (!entries.length) {
    container.replaceChildren();
    container.classList.remove('flex');
    container.hidden = true;
    if (section) section.hidden = true;
    if (divider) divider.hidden = true;
    return;
  }

  container.hidden = false;
  container.classList.add('flex', 'justify-center');
  if (section) section.hidden = false;
  if (divider) divider.hidden = false;

  const SQUIRCLE_STYLES = {
    social_whatsapp: "bg-[#25D366]",
    social_facebook: "bg-[#1877F2]",
    social_instagram: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    social_tiktok: "bg-[#111111]",
    social_telegram: "bg-[#33A0D6]"
  };

  const DEFS = `
  <svg width="0" height="0" style="position: absolute;">
    <defs>
      <clipPath id="squircleClipCustomer" clipPathUnits="objectBoundingBox">
        <path d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"></path>
      </clipPath>
    </defs>
  </svg>
  `;

  const dockHtml = `
  <div class="relative inline-block mx-auto mt-2 mb-6">
    <div class="absolute inset-0 bg-slate-50/80 backdrop-blur-2xl border border-slate-200/80 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)]"></div>
    <div class="relative flex items-center justify-center gap-x-4 px-6 py-3">
      ${entries.map(e => `
        <a href="${escapeAttr(e.url)}" target="_blank" rel="noopener" title="${escapeAttr(e.label)}" class="relative group cursor-pointer inline-block" style="text-decoration:none; outline:none;">
          <div style="clip-path: url(#squircleClipCustomer)" class="w-16 h-16 ${SQUIRCLE_STYLES[e.key]} rounded-2xl flex items-center justify-center transform transition-all duration-300 ease-out hover:scale-110 hover:-translate-y-2">
            ${e.svg.replace('width="22" height="22"', 'style="width: 32px; height: 32px; color: white;"').replace('fill="currentColor"', 'fill="currentColor"')}
          </div>
        </a>
      `).join('')}
    </div>
  </div>
  `;

  container.innerHTML = DEFS + dockHtml;
}

async function initSocialIcons(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const storeId = opts.storeId || (typeof CURRENT_STORE_ID !== 'undefined' ? CURRENT_STORE_ID : null);
  const links = await fetchSocialLinks(storeId);
  renderSocialIcons(container, links, opts);
}

document.addEventListener('DOMContentLoaded', () => {
  const storeId = new URLSearchParams(window.location.search).get('store_id');
  initSocialIcons('footerSocialLinks', { storeId, size: 'w-10 h-10' });
}, { once: true });


