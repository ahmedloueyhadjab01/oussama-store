function money(n) { return `${Number(n).toLocaleString('ar-DZ')} دج`; }
function escapeHtml(str) {
 const div = document.createElement('div');
 div.textContent = String(str ?? '');
 return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function safeUrl(value) {
 if (typeof value !== 'string' || !value.trim()) return '';
 try {
 const url = new URL(value, window.location.origin);
 if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === window.location.origin)) return '';
 return url.href;
 } catch {
 return '';
 }
}
function showToast(msg, isError = false) {
 const t = document.getElementById('toast');
 t.textContent = msg;
 t.classList.remove('hidden');
 t.style.background = isError ? '#C1443C' : '#1E6F54';
 t.style.borderColor = isError ? '#9A332C' : '#123F30';
 setTimeout(() => t.classList.add('hidden'), 2500);
}

// ---------- نظام المصادقة والاشتراكات ----------
let currentUser = null;

// رقم واتساب فريق العمل
const WORK_TEAM_WHATSAPP = '213665236042';

function buildWorkTeamMessage(shipping) {
  const user = currentUser || {};
  shipping = shipping || {};
  const annualPriority = user.subscription_plan === 'annual' ? ' أولوية دعم: مشترك سنوي ' : '';
  return [
    'مرحبًا فريق العمل، أحتاج إلى التواصل معكم.',
    annualPriority,
    '',
    'بيانات التاجر:',
    `الاسم: ${user.name || 'غير محدد'}`,
    `البريد الإلكتروني: ${user.email || 'غير محدد'}`,
    `اسم المتجر: ${user.store_name || 'غير محدد'}`,
    `معرّف الحساب: ${user.id || 'غير محدد'}`,
    `الخطة: ${user.subscription_plan || 'غير محددة'}`,
    `حالة الاشتراك: ${user.subscription_status || 'غير محددة'}`,
    `رابط المتجر: ${window.location.origin}`,
    '',
    'إعدادات الشحن:',
    `الشركة: ${shipping.provider || 'يدوي'}`,
    `ولاية الانطلاق: ${shipping.from_wilaya_id || 'غير محددة'}`,
    `طريقة التسعير: ${shipping.pricing_mode || 'غير محددة'}`,
    `المفاتيح: ${shipping.credentials_configured ? 'مضبوطة' : 'غير مضبوطة'}`,
    '',
    'أرغب في التحدث معكم بخصوص طريقة الدفع أو أي خلل أو مشكلة في المتجر.'
  ].join('\n');
}

// آخر إعدادات شحن معروفة (تُجلب في الخلفية حتى لا ننتظر الشبكة داخل نقرة المستخدم)
let CACHED_SHIPPING_FOR_CONTACT = null;
function prefetchShippingForContact() {
  fetch('/api/shipping/settings').then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) CACHED_SHIPPING_FOR_CONTACT = j; }).catch(() => {});
}

function contactWorkTeam() {
  // الفتح يتم مباشرة داخل نقرة المستخدم كي لا يحجبه المتصفح كنافذة منبثقة
  const url = `https://wa.me/${WORK_TEAM_WHATSAPP}?text=${encodeURIComponent(buildWorkTeamMessage(CACHED_SHIPPING_FOR_CONTACT))}`;
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) window.location.href = url; // إن حُجبت النافذة نفتح في نفس التبويب
}

// تفويض الحدث على مستوى الصفحة: يعمل حتى لو أُعيد رسم الزر أو تأخر تحميله
// removed duplicate listener
prefetchShippingForContact();

async function checkSession() {
 try {
 const res = await fetch('/api/auth/me');
 if (res.ok) {
 const data = await res.json();
 currentUser = data.user || { name: data.username };
 document.getElementById('loginScreen').classList.add('hidden');
 document.getElementById('dashboard').classList.remove('hidden');
 updateSubscriptionUI(currentUser);
 initDashboard();
 } else {
 document.getElementById('loginScreen').classList.remove('hidden');
 document.getElementById('dashboard').classList.add('hidden');
 }
 } catch (err) {
 document.getElementById('loginScreen').classList.remove('hidden');
 document.getElementById('dashboard').classList.add('hidden');
 }
}

function updateSubscriptionUI(user) {
 if (!user) return;

 const greetingEl = document.getElementById('userGreeting');
 if (greetingEl) greetingEl.textContent = `مرحباً، ${user.name || user.username || ''}`;

 const headerPill = document.getElementById('headerSubscriptionPill');
 const headerDaysText = document.getElementById('headerTrialDaysText');
 const bannerText = document.getElementById('bannerSubscriptionText');
 const bannerEl = document.getElementById('subscriptionBanner');
 const bannerBtn = document.getElementById('bannerUpgradeBtn');
 const paywallModal = document.getElementById('paywallModal');
 const adminTabBtn = document.getElementById('adminUsersTabBtn');

 // إظهار تبويب إدارة المشتركين للمشرف العام فقط
 if (adminTabBtn) {
 if (user.role === 'admin') {
 adminTabBtn.classList.remove('hidden');
 } else {
 adminTabBtn.classList.add('hidden');
 }
 }

 const planName = user.role === 'admin' ? 'حساب إداري مدى الحياة' : (user.subscription_plan === 'annual' ? 'الاشتراك السنوي للتجار' : (user.subscription_plan === 'monthly' ? 'الاشتراك الشهري للتجار' : 'فترة تجريبية (7 أيام)'));
 const daysLeft = user.days_left ?? 0;
 const isExpired = user.is_expired || false;
 const isTrial = user.is_trial ?? (user.subscription_plan === 'trial');

 // تحديث الشارة العلوية
 if (headerPill && headerDaysText) {
 headerPill.classList.remove('hidden');
 if (isTrial) {
 headerDaysText.textContent = isExpired ? 'انتهت التجربة (مشاهدة فقط)' : `تجربة: متبقي ${daysLeft} يوم`;
 headerPill.className = isExpired 
 ? 'hidden sm:flex items-center gap-1.5 px-4 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-full text-sm font-black cursor-pointer'
 : 'hidden sm:flex items-center gap-1.5 px-4 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-sm font-black cursor-pointer hover:bg-amber-200';
 } else {
 headerDaysText.textContent = user.role === 'admin' ? 'حساب إداري: مدى الحياة' : (isExpired ? 'انتهى الاشتراك (مشاهدة فقط)' : `اشتراك ${user.subscription_plan === 'annual' ? 'سنوي' : 'شهري'}: ${daysLeft} يوم`);
 headerPill.className = isExpired
 ? 'hidden sm:flex items-center gap-1.5 px-4 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-full text-sm font-black cursor-pointer'
 : 'hidden sm:flex items-center gap-1.5 px-4 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-sm font-black cursor-pointer hover:bg-emerald-200';
 }
 }

 // تحديث الشريط العلوي
 if (bannerText && bannerEl) {
 if (isExpired && user.role !== 'admin') {
 bannerText.innerHTML = `️ <b>انتهت فترتك التجريبية (7 أيام) - أنت في وضع المشاهدة فقط.</b> تواصل مع فريق العمل عبر واتساب لتفعيل حسابك ومواصلة العمل: <b class="underline">0665236042</b>`;
 bannerEl.className = 'bg-rose-700 text-white px-4 py-3 text-sm sm:text-sm font-black flex flex-wrap items-center justify-between gap-2 shadow-inner';
 if (bannerBtn) {
 bannerBtn.innerHTML = ' تواصل عبر واتساب';
 bannerBtn.onclick = () => window.open('https://wa.me/213665236042?text=' + encodeURIComponent(`مرحباً، أود تفعيل اشتراكي في منصة المتاجر الإلكترونية لحسابي: ${user.email || user.name}`), '_blank');
 }
 } else if (isTrial) {
 bannerText.textContent = ` أنت الآن في الفترة التجريبية المجانية (متبقي ${daysLeft} أيام). استمتع بجميع ميزات المتجر الإلكتروني!`;
 bannerEl.className = 'bg-amber-500 text-white px-4 py-2 text-sm sm:text-sm font-black flex items-center justify-between shadow-inner';
 if (bannerBtn) {
 bannerBtn.innerHTML = 'ترقية الخطة ';
 bannerBtn.onclick = () => {
 const subTab = document.querySelector('[data-tab="subscription"]');
 if (subTab) subTab.click();
 };
 }
 } else {
 bannerText.textContent = user.role === 'admin'
 ? ' حساب المدير العام نشط مدى الحياة.'
 : ` اشتراكك ${user.subscription_plan === 'annual' ? 'السنوي' : 'الشهري'} نشط حتى ${user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString('ar-DZ') : ''} (متبقي ${daysLeft} يوم).`;
 bannerEl.className = 'bg-emerald-700 text-white px-4 py-2 text-sm sm:text-sm font-black flex items-center justify-between shadow-inner';
 if (bannerBtn) {
 bannerBtn.innerHTML = 'إدارة الاشتراك ';
 bannerBtn.onclick = () => {
 const subTab = document.querySelector('[data-tab="subscription"]');
 if (subTab) subTab.click();
 };
 }
 }
 }

 // تحديث رابط المتجر للتاجر
 const storeLinkEl = document.getElementById('vendorStoreLink');
 const copyBtn = document.getElementById('copyVendorStoreLinkBtn');
 const storePath = '/';
 if (storeLinkEl) {
 storeLinkEl.href = storePath;
 storeLinkEl.title = `رابط متجرك للزبائن: ${window.location.origin}${storePath}`;
 }
 if (copyBtn) {
 copyBtn.onclick = () => {
 const fullUrl = `${window.location.origin}${storePath}`;
 navigator.clipboard.writeText(fullUrl).then(() => {
 showToast('تم نسخ رابط متجرك بنجاح ');
 }).catch(() => {
 prompt('انسخ رابط متجرك:', fullUrl);
 });
 };
 }

 // تحديث روابط الـ Feeds الخاصة بالتاجر
 const fbFeed = document.getElementById('fbFeedUrl');
 const ttFeed = document.getElementById('ttFeedUrl');
 if (fbFeed) fbFeed.textContent = `${window.location.origin}/api/feed/facebook.xml?store_id=${user.id || 1}`;
 if (ttFeed) ttFeed.textContent = `${window.location.origin}/api/feed/tiktok.csv?store_id=${user.id || 1}`;

 // تفعيل اعتراض الأزرار التعديلية في وضع المشاهدة فقط
 setupReadOnlyInterceptors(user);

 // تحديث تبويب الاشتراك
 const curPlanEl = document.getElementById('subCurrentPlanName');
 const curStatusEl = document.getElementById('subCurrentStatus');
 const curDaysEl = document.getElementById('subDaysLeft');
 const curExpiryEl = document.getElementById('subExpiryDate');
 const statusBadge = document.getElementById('subStatusBadgeText');

 if (curPlanEl) curPlanEl.textContent = planName;
 if (curStatusEl) {
 curStatusEl.textContent = isExpired ? 'منتهي (وضع المشاهدة فقط) ️' : 'نشط ومفعّل ';
 curStatusEl.className = isExpired ? 'text-sm sm:text-base font-black text-rose-700' : 'text-sm sm:text-base font-black text-emerald-700';
 }
 if (curDaysEl) curDaysEl.textContent = user.role === 'admin' ? 'مدى الحياة' : `${daysLeft} يوم`;
 if (curExpiryEl) {
 const expDate = isTrial ? user.trial_ends_at : user.subscription_ends_at;
 curExpiryEl.textContent = user.role === 'admin' ? 'مدى الحياة' : (expDate ? new Date(expDate).toLocaleDateString('ar-DZ') : '-');
 }
 if (statusBadge) {
 statusBadge.textContent = isExpired ? 'مشاهدة فقط' : (isTrial ? 'فترة تجريبية' : 'اشتراك مفعل');
 }

 
}

// دالة منع العمليات التعديلية وفتح نافذة الواتساب
function openReadOnlyAlert() {
 const modal = document.getElementById('readOnlyAlertModal');
 if (modal) modal.classList.remove('hidden');
}

function setupReadOnlyInterceptors(user) {
 if (!user || user.role === 'admin' || !user.is_expired) return;

 // عند النقر على أزرار الإضافة أو الحفظ أو التعديل
 const targetSelectors = [
 '#newProductBtn',
 '#addRootCategoryBtn',
 '#quickResetStatsBtn',
 '#openResetStatsModalBtn',
 '#openResetStoreModalBtn',
 '#saveCalcBtn',
 '#socialSettingsForm button[type="submit"]',
 '#bulkDeliveryForm button[type="submit"]',
 '#saveDeliveryBtn',
 '#syncSheetNowBtn',
 ];

 targetSelectors.forEach(sel => {
 const el = document.querySelector(sel);
 if (el) {
 el.addEventListener('click', (e) => {
 if (currentUser && currentUser.is_expired && currentUser.role !== 'admin') {
 e.preventDefault();
 e.stopImmediatePropagation();
 openReadOnlyAlert();
 }
 }, true);
 }
 });
}

// 1. التبديل بين نماذج المصادقة (دخول / تسجيل / استعادة)
const tabAuthLogin = document.getElementById('tabAuthLogin');
const tabAuthRegister = document.getElementById('tabAuthRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const forgotPasswordSection = document.getElementById('forgotPasswordSection');

window.switchAuthTab = function(tab) {
 if (tab === 'register') {
 if (tabAuthRegister) tabAuthRegister.className = 'py-3 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 transition-all flex items-center justify-center gap-1 cursor-pointer';
 if (tabAuthLogin) tabAuthLogin.className = 'py-3 rounded-lg text-slate-900/70 hover:text-slate-900 transition-all cursor-pointer';
 if (registerForm) registerForm.classList.remove('hidden');
 if (loginForm) loginForm.classList.add('hidden');
 if (forgotPasswordSection) forgotPasswordSection.classList.add('hidden');
 if (emailVerifySection) emailVerifySection.classList.add('hidden');
 } else {
 if (tabAuthLogin) tabAuthLogin.className = 'py-3 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 transition-all cursor-pointer';
 if (tabAuthRegister) tabAuthRegister.className = 'py-3 rounded-lg text-slate-900/70 hover:text-slate-900 transition-all flex items-center justify-center gap-1 cursor-pointer';
 if (loginForm) loginForm.classList.remove('hidden');
 if (registerForm) registerForm.classList.add('hidden');
 if (forgotPasswordSection) forgotPasswordSection.classList.add('hidden');
 if (emailVerifySection) emailVerifySection.classList.add('hidden');
 }
};

if (tabAuthLogin) {
 tabAuthLogin.addEventListener('click', () => window.switchAuthTab('login'));
}
if (tabAuthRegister) {
 tabAuthRegister.addEventListener('click', () => window.switchAuthTab('register'));
}

const showForgotBtn = document.getElementById('showForgotPasswordBtn');
const backToLoginBtn = document.getElementById('backToLoginBtn');

if (showForgotBtn) {
 showForgotBtn.addEventListener('click', () => {
 loginForm.classList.add('hidden');
 registerForm.classList.add('hidden');
 forgotPasswordSection.classList.remove('hidden');
 document.getElementById('sendOtpForm').classList.remove('hidden');
 document.getElementById('verifyOtpForm').classList.add('hidden');
 });
}

if (backToLoginBtn) {
 backToLoginBtn.addEventListener('click', () => {
 tabAuthLogin.click();
 });
}


// 2. معالجة تسجيل الدخول
if (loginForm) loginForm.addEventListener('submit', async (e) => {
 e.preventDefault();
 const form = e.target;
 const errorEl = document.getElementById('loginError');
 const btn = document.getElementById('loginSubmitBtn');
 errorEl.classList.add('hidden');
 btn.disabled = true;
 btn.textContent = 'جاري التحقق...';

 try {
 const res = await fetch('/api/auth/login', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ username: form.username.value, password: form.password.value }),
 });
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.error);
 }

 currentUser = data.user || { name: data.username };
 document.getElementById('loginScreen').classList.add('hidden');
 document.getElementById('dashboard').classList.remove('hidden');
 showToast('تم تسجيل الدخول بنجاح! مرحباً بك ');
 updateSubscriptionUI(currentUser);
 initDashboard();
 } catch (err) {
 errorEl.textContent = err.message;
 errorEl.classList.remove('hidden');
 } finally {
 btn.disabled = false;
 btn.textContent = 'دخول إلى لوحة التحكم ';
 }
});


function openEmergencySupport(identifier = '') {
 const accountIdentifier = identifier.trim() || 'لم أتمكن من إدخال البريد أو اسم المستخدم';
 const message = [
 ' حالة طارئة - أحتاج مساعدة لاستعادة حسابي.',
 `البريد الإلكتروني أو اسم المستخدم القديم: ${accountIdentifier}`,
 'هاتف التسجيل موجود في الحساب، وأرجو التحقق من هويتي ومساعدتي في إعادة تعيين كلمة المرور.',
 ].join('\n');
 window.open(`https://wa.me/213665236042?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
}

document.getElementById('emergencySupportBtn')?.addEventListener('click', () => {
 openEmergencySupport(document.querySelector('#loginForm [name="username"]')?.value || '');
});
document.getElementById('forgotEmergencyBtn')?.addEventListener('click', () => {
 openEmergencySupport(document.querySelector('#sendOtpForm [name="email"]')?.value || '');
});



// 5. استعادة كلمة المرور: التحقق من OTP وتعيين كلمة المرور الجديدة


document.getElementById('logoutBtn')?.addEventListener('click', async () => {
 await fetch('/api/auth/logout', { method: 'POST' });
 location.reload();
});

// ---------- التبويبات ----------
let lowStockRefreshTimer = null;

function initDashboard() {
 document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
 btn.addEventListener('click', () => {
 document.querySelectorAll('.admin-tab-btn').forEach((b) => b.classList.remove('active-tab'));
 btn.classList.add('active-tab');
 document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
 const tabEl = document.getElementById(`tab-${btn.dataset.tab}`);
 if (tabEl) tabEl.classList.remove('hidden');
 if (btn.dataset.tab === 'campaigns') {
 setTimeout(() => loadCampaignAnalytics(), 50);
 } else if (btn.dataset.tab === 'profit') {
 setTimeout(() => loadProfit30d(), 50);
 } else if (btn.dataset.tab === 'calculator') {
 renderSavedCalculations();
 recomputeCalculator();
 }
 });
 });
 document.querySelector('.admin-tab-btn').classList.add('active-tab');

 loadCategoryTree();
 loadProducts();
 if (!lowStockRefreshTimer) {
 lowStockRefreshTimer = window.setInterval(() => loadProducts(), 60 * 1000);
 }
 loadOrders();
 loadDeliveryRates();
 loadFeedUrls();
 loadSocialSettings();
 loadProfit30d();
 loadCampaignAnalytics();
 initCalculator();
}

function loadFeedUrls() {
 const base = location.origin;
 document.getElementById('fbFeedUrl').textContent = `${base}/api/feed/facebook.xml`;
 document.getElementById('ttFeedUrl').textContent = `${base}/api/feed/tiktok.csv`;
}

// ---------- روابط التواصل الاجتماعي ----------
async function loadSocialSettings() {
 const res = await fetch('/api/settings/social' + (currentUser && currentUser.id ? '?store_id=' + encodeURIComponent(currentUser.id) : ''));
 if (!res.ok) return;
 const data = await res.json();
 const form = document.getElementById('socialForm');
 for (const key in data) {
 if (form[key]) form[key].value = data[key] || '';
 }
}

document.getElementById('socialForm')?.addEventListener('submit', async (e) => {
 e.preventDefault();
 const form = e.target;
 const errorEl = document.getElementById('socialFormError');
 errorEl.classList.add('hidden');
 const payload = {
 social_whatsapp: form.social_whatsapp.value.trim(),
 social_instagram: form.social_instagram.value.trim(),
 social_facebook: form.social_facebook.value.trim(),
 social_tiktok: form.social_tiktok.value.trim(),
 social_telegram: form.social_telegram.value.trim(),
 };
 try {
 const res = await fetch('/api/settings/social', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error || 'تعذر الحفظ');
 showToast('تم حفظ روابط التواصل الاجتماعي ');
 } catch (err) {
 errorEl.textContent = err.message;
 errorEl.classList.remove('hidden');
 }
});

// ---------- التصنيفات (زر +) ----------
let CATEGORY_MODAL_PARENT = null;

function renderCategoryNode(cat, container) {
 const wrap = document.createElement('div');
 wrap.className = 'border-r-2 border-slate-200/10 pr-3';
 wrap.innerHTML = `
 <div class="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 mb-2 border border-slate-200/10">
 <div class="flex items-center gap-3 min-w-0">
 <span class="category-image-slot w-10 h-10 shrink-0"></span>
 <span class="font-bold text-sm">${escapeHtml(cat.name)}</span>
 </div>
 <div class="flex gap-2">
 <button class="add-sub-btn text-sm bg-red-700 text-white w-6 h-6 rounded-full font-black" title="إضافة تصنيف فرعي">+</button>
 <button class="edit-cat-btn text-sm text-slate-900/70 hover:text-slate-900 font-bold px-1" title="تعديل التصنيف">✏️</button>
 <button class="del-cat-btn text-sm text-[#E52F20] font-extrabold px-1" title="حذف التصنيف">🗑️</button>
 </div>
 </div>
 <div class="children pr-4 space-y-2"></div>
 `;
 if (cat.image) {
 const image = document.createElement('img');
 image.src = cat.image;
 image.alt = '';
 image.loading = 'lazy';
 image.className = 'w-10 h-10 rounded-full object-cover';
 image.addEventListener('error', () => image.remove(), { once: true });
 wrap.querySelector('.category-image-slot').appendChild(image);
 }
 wrap.querySelector('.add-sub-btn').addEventListener('click', () => openCategoryModal(cat.id, cat.name));
 wrap.querySelector('.edit-cat-btn').addEventListener('click', () => openCategoryModal(null, null, cat.id, cat.name, cat.image));
 wrap.querySelector('.del-cat-btn').addEventListener('click', () => deleteCategory(cat.id, cat.name));

 const childrenContainer = wrap.querySelector('.children');
 for (const child of cat.children || []) {
 renderCategoryNode(child, childrenContainer);
 }
 container.appendChild(wrap);
}

async function loadCategoryTree() {
 const res = await fetch('/api/categories');
 const tree = await res.json();
 const container = document.getElementById('categoryTree');
 container.innerHTML = '';
 if (!tree.length) {
 container.innerHTML = '<p class="text-slate-900/40 text-sm font-bold">لا توجد تصنيفات بعد. اضغط "+ إضافة تصنيف رئيسي" للبدء.</p>';
 }
 for (const cat of tree) renderCategoryNode(cat, container);

 const flat = flattenForSelect(tree);
 const select = document.getElementById('productCategorySelect');
 select.innerHTML = '<option value="">بدون تصنيف</option>' + flat.map(c =>
 `<option value="${c.id}">${'　'.repeat(c.depth)}${escapeHtml(c.name)}</option>`).join('');
}

function flattenForSelect(tree, depth = 0) {
 let out = [];
 for (const c of tree) {
 out.push({ id: c.id, name: c.name, depth });
 out = out.concat(flattenForSelect(c.children || [], depth + 1));
 }
 return out;
}

let CATEGORY_MODAL_EDIT_ID = null;

function openCategoryModal(parentId = null, parentName = null, editId = null, currentName = null, currentImage = '') {
 CATEGORY_MODAL_PARENT = parentId;
 CATEGORY_MODAL_EDIT_ID = editId;
 const form = document.getElementById('categoryForm');
 form.reset();
 
 if (editId) {
 document.getElementById('categoryModalTitle').textContent = `تعديل التصنيف: "${currentName}"`;
 form.name.value = currentName;
 } else {
 document.getElementById('categoryModalTitle').textContent = parentId
 ? `إضافة تصنيف فرعي داخل "${parentName}"`
 : 'إضافة تصنيف رئيسي';
 }

 const imagePreview = document.getElementById('categoryImagePreview');
 imagePreview.src = currentImage || '';
 imagePreview.classList.toggle('hidden', !currentImage);
 
 document.getElementById('categoryFormError').classList.add('hidden');
 document.getElementById('categoryModal').classList.remove('hidden');
}

document.getElementById('addRootCategoryBtn')?.addEventListener('click', () => openCategoryModal(null));
document.getElementById('closeCategoryModal')?.addEventListener('click', () => document.getElementById('categoryModal').classList.add('hidden'));

document.getElementById('categoryImageInput')?.addEventListener('change', (e) => {
 const file = e.target.files[0];
 const preview = document.getElementById('categoryImagePreview');
 if (!file) return;
 const previewUrl = URL.createObjectURL(file);
 preview.src = previewUrl;
 preview.classList.remove('hidden');
 preview.addEventListener('load', () => URL.revokeObjectURL(previewUrl), { once: true });
});

document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
 e.preventDefault();
 const form = e.target;
 const errorEl = document.getElementById('categoryFormError');
 errorEl.classList.add('hidden');
 try {
 const url = CATEGORY_MODAL_EDIT_ID ? `/api/categories/${CATEGORY_MODAL_EDIT_ID}` : '/api/categories';
 const method = CATEGORY_MODAL_EDIT_ID ? 'PUT' : 'POST';
 const bodyData = new FormData();
 bodyData.append('name', form.name.value.trim());
 if (!CATEGORY_MODAL_EDIT_ID && CATEGORY_MODAL_PARENT != null) {
 bodyData.append('parent_id', CATEGORY_MODAL_PARENT);
 }
 const imageFile = form.querySelector('[name="image"]').files[0];
 if (imageFile) bodyData.append('image', imageFile);

 const res = await fetch(url, {
 method,
 body: bodyData,
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error);
 document.getElementById('categoryModal').classList.add('hidden');
 showToast(CATEGORY_MODAL_EDIT_ID ? 'تم تعديل التصنيف بنجاح ' : 'تمت إضافة التصنيف بنجاح ');
 loadCategoryTree();
 } catch (err) {
 errorEl.textContent = err.message;
 errorEl.classList.remove('hidden');
 }
});

async function deleteCategory(id, name) {
 if (!confirm(`حذف التصنيف "${name}" وكل ما بداخله من تصنيفات فرعية؟`)) return;
 const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
 if (res.ok) { showToast('تم الحذف'); loadCategoryTree(); }
 else showToast('تعذر الحذف', true);
}

// ---------- المنتجات ----------
let ALL_PRODUCTS = [];

['productSearchInput', 'productStockFilter', 'productStatusFilter'].forEach((id) => {
 document.getElementById(id)?.addEventListener('input', () => loadProducts());
 document.getElementById(id)?.addEventListener('change', () => loadProducts());
});

function updateLowStockAlert(products) {
 const alert = document.getElementById('lowStockAlert');
 const itemsContainer = document.getElementById('lowStockItems');
 const count = document.getElementById('lowStockCount');
 if (!alert || !itemsContainer || !count) return;

 const lowStockProducts = products.filter((product) => Number(product.stock) <= 5);
 if (!lowStockProducts.length) {
 alert.classList.add('hidden');
 return;
 }

 count.textContent = lowStockProducts.length;
 itemsContainer.innerHTML = lowStockProducts.map((product) => {
 const stock = Number(product.stock) || 0;
 return `<div class="flex items-center justify-between gap-2 border-t border-amber-200 pt-1.5">
 <span>${escapeHtml(product.name)}</span>
 <strong class="${stock === 0 ? 'text-rose-700' : 'text-amber-700'}">${stock === 0 ? 'نفد المخزون' : `${stock} قطع`}</strong>
 </div>`;
 }).join('');
 alert.classList.remove('hidden');
}

async function loadProducts() {
 const res = await fetch('/api/products/admin/all');
 const products = await res.json();
 ALL_PRODUCTS = products;
 const table = document.getElementById('productsTable');
 updateLowStockAlert(products);
 const search = (document.getElementById('productSearchInput')?.value || '').trim().toLowerCase();
 const stockFilter = document.getElementById('productStockFilter')?.value || 'all';
 const statusFilter = document.getElementById('productStatusFilter')?.value || 'all';
 const filteredProducts = products.filter((product) => {
 const matchesSearch = !search || `${product.name} ${product.sku || ''}`.toLowerCase().includes(search);
 const stock = Number(product.stock) || 0;
 const matchesStock = stockFilter === 'low' ? stock > 0 && stock <= 5 : stockFilter === 'out' ? stock === 0 : stockFilter === 'available' ? stock > 0 : true;
 const matchesStatus = statusFilter === 'active' ? !!product.is_active : statusFilter === 'inactive' ? !product.is_active : true;
 return matchesSearch && matchesStock && matchesStatus;
 });

 if (!filteredProducts.length) {
 table.innerHTML = '<p class="p-6 text-slate-900/40 text-sm font-bold">لا توجد منتجات بعد.</p>';
 return;
 }

 table.innerHTML = `
 <table class="w-full text-sm">
 <thead class="bg-slate-50 text-slate-900/60">
 <tr>
 <th class="p-3 text-right">الصورة</th>
 <th class="p-3 text-right">الاسم</th>
 <th class="p-3 text-right">السعر</th>
 <th class="p-3 text-right">المخزون</th>
 <th class="p-3 text-right">الحالة</th>
 <th class="p-3 text-right">إجراءات</th>
 </tr>
 </thead>
 <tbody id="productsTbody"></tbody>
 </table>
 `;
 const tbody = document.getElementById('productsTbody');
 for (const p of filteredProducts) {
     const tr = document.createElement('tr');
     tr.className = 'border-t border-slate-200/10 hover:bg-slate-50 transition-colors';
 const packQuantity = Number(p.pack_quantity) || 1;
 const unitLabel = packQuantity > 1 ? 'عبوة' : 'حبة';
 tr.innerHTML = `
 <td class="p-3"><img src="${escapeHtml(p.image || '/img/placeholder.svg')}" class="w-10 h-10 object-cover rounded-lg bg-slate-50 border border-slate-200/10" /></td>
 <td class="p-3">
 <span class="font-bold block">${escapeHtml(p.name)}</span>
 <span class="text-[10px] text-slate-900/60 font-bold">${unitLabel} (${packQuantity} قطعة) القطعة: ${money(Math.round(p.price / packQuantity))}</span>
 </td>
 <td class="p-3 font-black">${money(p.price)}</td>
 <td class="p-3 font-bold">${p.stock} ${unitLabel}${p.has_variants ? ' <span class="text-[10px] bg-yellow-500/20 text-yellow-600 border border-gold/40 rounded-full px-2 py-0.5 font-bold">مقاسات</span>' : ''}</td>
 <td class="p-3">${p.is_active ? '<span class="text-blue-600 font-bold">مفعّل</span>' : '<span class="text-slate-900/40">معطّل</span>'}</td>
 <td class="p-3 flex gap-2">
 <button class="edit-btn text-blue-600 font-extrabold">✏️ تعديل</button>
 <button class="del-btn text-red-500 font-extrabold">🗑️ حذف</button>
 </td>
 `;
 tr.querySelector('.edit-btn').addEventListener('click', () => openProductModal(p));
 tr.querySelector('.del-btn').addEventListener('click', () => deleteProduct(p.id, p.name));
 tbody.appendChild(tr);
 }
}

let RESTOCK_PRODUCT = null;
let RESTOCK_VARIANT = null;
let VARIANT_ROW_ID = 0;
let COLOR_BLOCK_ID = 0;

// ---------- إدارة نوع المنتج (بسيط، ملابس بألوان ومقاسات، مقاسات فقط) ----------
function setProductTypeMode(mode) {
 const stockFields = document.getElementById('stockFieldsNew');
 const clothingBuilder = document.getElementById('clothingVariantsBuilder');
 const simpleSizesBuilder = document.getElementById('simpleSizesBuilder');

 stockFields.classList.add('hidden');
 clothingBuilder.classList.add('hidden');
 simpleSizesBuilder.classList.add('hidden');

 if (mode === 'clothing') {
 clothingBuilder.classList.remove('hidden');
 if (!document.getElementById('colorBlocksContainer').children.length) {
 addColorBlock('أصفر', '#FACC15', '', [
 { size: 'S', qty: 5, cost: '' },
 { size: 'M', qty: 10, cost: '' },
 { size: 'L', qty: 10, cost: '' },
 ]);
 addColorBlock('أسود', '#000000', '', [
 { size: 'S', qty: 5, cost: '' },
 { size: 'M', qty: 10, cost: '' },
 { size: 'L', qty: 10, cost: '' },
 ]);
 }
 } else if (mode === 'sizes_only') {
 simpleSizesBuilder.classList.remove('hidden');
 if (!document.getElementById('variantRows').children.length) {
 addVariantRow('M', '', '');
 addVariantRow('L', '', '');
 }
 } else {
 stockFields.classList.remove('hidden');
 }
}

document.querySelectorAll('input[name="product_type_mode"]').forEach((radio) => {
 radio.addEventListener('change', (e) => {
 setProductTypeMode(e.target.value);
 });
});

// إضافة كتلة لون جديدة (للملابس)
function addColorBlock(colorName = '', colorCode = '#17241F', imagePath = '', initialSizes = []) {
 const blockId = `cblock-${COLOR_BLOCK_ID++}`;
 const container = document.getElementById('colorBlocksContainer');
 const block = document.createElement('div');
 block.className = 'color-block bg-slate-100/60 border border-slate-200/20 rounded-xl p-4 space-y-3 relative';
 block.dataset.blockId = blockId;

 block.innerHTML = `
 <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/10 pb-3">
 <div class="flex items-center gap-2 flex-1 min-w-[200px]">
 <input class="cb-color-picker w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5" type="color" value="${escapeHtml(colorCode || '#17241F')}" title="اختر رمز اللون للعرض بالمتجر" />
 <input class="cb-color-name field px-4 py-1.5 text-sm font-bold flex-1" placeholder="اسم اللون (مثال: أصفر، أسود، أحمر)" value="${escapeHtml(colorName)}" />
 </div>
 <div class="flex items-center gap-2">
 <label class="btn-outline px-4 py-1.5 rounded-lg text-sm font-bold cursor-pointer flex items-center gap-1">
 <span>صورة هذا اللون</span>
 <input type="file" accept="image
 }

 // سجل مصاريف الإعلانات
 const spendTbody = document.getElementById('spendHistoryTbody');
 if (!recent_spends.length) {
 spendTbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-900/40 font-bold">لا توجد سجلات مصاريف بعد</td></tr>';
 } else {
 spendTbody.innerHTML = recent_spends.map((s) => `
 <tr class="border-t border-slate-200/10 hover:bg-slate-50/60 transition-colors">
 <td class="p-3 font-bold text-sm dir-ltr text-right">${escapeHtml(s.campaign_name)}</td>
 <td class="p-3 text-sm">${getSourceLabel(s.source)}</td>
 <td class="p-3 font-black text-[#E52F20] text-sm">${money(s.spend_amount)}</td>
 <td class="p-3 text-sm text-slate-900/60">${String(s.spend_date).slice(0, 10)}</td>
 <td class="p-3 text-sm text-slate-900/50">${escapeHtml(s.notes || '')}</td>
 <td class="p-3">
 <button data-spend="${encodeURIComponent(JSON.stringify({ id: s.id, campaign_name: s.campaign_name, source: s.source, spend_amount: s.spend_amount, spend_date: String(s.spend_date).slice(0, 10), notes: s.notes || '' }))}" class="edit-spend-btn text-slate-900/70 hover:text-slate-900 text-sm font-black px-2 py-1 rounded-lg hover:bg-slate-50 transition">✏️ تعديل</button>
 <button data-spend-id="${s.id}" class="delete-spend-btn text-rose-600 hover:text-rose-700 text-sm font-black px-2 py-1 rounded-lg hover:bg-rose-50 transition">🗑️ حذف</button>
 </td>
 </tr>`).join('');

 // ربط أزرار الحذف
 spendTbody.querySelectorAll('.edit-spend-btn').forEach((btn) => {
 btn.addEventListener('click', () => {
 const d = JSON.parse(decodeURIComponent(btn.dataset.spend));
 window.openEditSpend(d.id, d.campaign_name, d.source, d.spend_amount, d.spend_date, d.notes);
 });
 });
 spendTbody.querySelectorAll('.delete-spend-btn').forEach((btn) => {
 btn.addEventListener('click', async () => {
 if (!confirm('هل تريد حذف هذا السجل؟')) return;
 const res = await fetch(`/api/campaigns/spend/${btn.dataset.spendId}`, { method: 'DELETE' });
 if (res.ok) {
 showToast('تم حذف السجل ');
 loadCampaignAnalytics();
 }
 });
 });
 }

 // مثال رابط UTM
 const baseUrl = window.location.origin;
 const utmEl = document.getElementById('utmExampleUrl');
 if (utmEl) {
 utmEl.textContent = `${baseUrl}/?utm_source=facebook&utm_campaign=اسم_الحملة&utm_medium=cpc&utm_content=اسم_الاعلان`;
 }

 // رسم البيانيات للحملات (بما فيها الدوائر النسبية ومنحنى التتبع الزمني)
 renderCampaignCharts(campaigns, daily_trends, status_breakdown, top_delivered_ad_products, top_cancelled_ad_products);

 } catch (err) {
 console.error('Campaign analytics error:', err);
 }
}

// متغيرات عامة لحفظ المخططات ومنع التكرار (Chart instances)
let cmpCompareChartInstance = null;
let platformRoasChartInstance = null;
let profitStructureChartInstance = null;
let dailyTrendLineChartInstance = null;
let adStatusDonutChartInstance = null;
let adProductEffectivenessChartInstance = null;

function renderCampaignCharts(campaigns, dailyTrends = [], statusBreakdown = {}, topDelivered = [], topCancelled = []) {
 if (typeof Chart === 'undefined') return;

 // 0. منحنى الأداء والنمو اليومي (Line Chart)
 if (dailyTrends && dailyTrends.length) {
 const dates = dailyTrends.map(d => d.date.substring(5)); // MM-DD
 const salesData = dailyTrends.map(d => d.sales);
 const profitData = dailyTrends.map(d => d.profit);
 const spendData = dailyTrends.map(d => d.spend);

 const ctx0 = document.getElementById('dailyTrendLineChart')?.getContext('2d');
 if (ctx0) {
 if (dailyTrendLineChartInstance) dailyTrendLineChartInstance.destroy();
 dailyTrendLineChartInstance = new Chart(ctx0, {
 type: 'line',
 data: {
 labels: dates,
 datasets: [
 {
 label: 'المبيعات المسلَّمة (دج)',
 data: salesData,
 borderColor: '#1E6F54',
 backgroundColor: 'rgba(30, 111, 84, 0.1)',
 borderWidth: 3,
 tension: 0.35,
 fill: true,
 pointRadius: 4,
 pointHoverRadius: 6,
 },
 {
 label: 'صافي الربح (دج)',
 data: profitData,
 borderColor: '#C9A227',
 backgroundColor: 'rgba(201, 162, 39, 0.05)',
 borderWidth: 3,
 tension: 0.35,
 fill: false,
 pointRadius: 4,
 pointHoverRadius: 6,
 },
 {
 label: 'مصاريف الإعلان (دج)',
 data: spendData,
 borderColor: '#2F6690',
 backgroundColor: 'transparent',
 borderWidth: 2,
 borderDash: [5, 5],
 tension: 0.35,
 fill: false,
 pointRadius: 3,
 }
 ]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { position: 'top', labels: { font: { family: 'Almarai', weight: 'bold' } } }
 },
 scales: {
 x: { ticks: { font: { family: 'Almarai', weight: 'bold' } } },
 y: { ticks: { font: { family: 'Almarai' } } }
 }
 }
 });
 }
 }

 // 1. مخطط مقارنة الحملات الإعلانية vs الزيارات المباشرة
 const labels = campaigns.map(c => c.campaign_name);
 const revData = campaigns.map(c => c.delivered_revenue);
 const netData = campaigns.map(c => c.net_profit);
 const spendData = campaigns.map(c => c.ad_spend);

 const ctx1 = document.getElementById('campaignCompareChart')?.getContext('2d');
 if (ctx1) {
 if (cmpCompareChartInstance) cmpCompareChartInstance.destroy();
 cmpCompareChartInstance = new Chart(ctx1, {
 type: 'bar',
 data: {
 labels: labels.length ? labels : ['لا توجد بيانات'],
 datasets: [
 {
 label: 'المبيعات المسلَّمة (دج)',
 data: revData.length ? revData : [0],
 backgroundColor: 'rgba(30, 111, 84, 0.85)',
 borderRadius: 6,
 },
 {
 label: 'صافي الربح الحقيقي (دج)',
 data: netData.length ? netData : [0],
 backgroundColor: 'rgba(201, 162, 39, 0.85)',
 borderRadius: 6,
 },
 {
 label: 'مصاريف الإعلان (دج)',
 data: spendData.length ? spendData : [0],
 backgroundColor: 'rgba(47, 102, 144, 0.85)',
 borderRadius: 6,
 }
 ]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { position: 'top', labels: { font: { family: 'Almarai', weight: 'bold' } } }
 },
 scales: {
 x: { ticks: { font: { family: 'Almarai', weight: 'bold' } } },
 y: { ticks: { font: { family: 'Almarai' } } }
 }
 }
 });
 }

 // 2. مخطط Real ROAS حسب المنصة
 const sourceGroups = {};
 for (const c of campaigns) {
 const src = getSourceLabel(c.source);
 if (!sourceGroups[src]) sourceGroups[src] = { spend: 0, revenue: 0 };
 sourceGroups[src].spend += c.ad_spend;
 sourceGroups[src].revenue += c.delivered_revenue;
 }

 const platformLabels = Object.keys(sourceGroups);
 const roasData = platformLabels.map(p => {
 const g = sourceGroups[p];
 return g.spend > 0 ? (g.revenue / g.spend) : (g.revenue > 0 ? 5 : 0);
 });

 const ctx2 = document.getElementById('platformRoasChart')?.getContext('2d');
 if (ctx2) {
 if (platformRoasChartInstance) platformRoasChartInstance.destroy();
 platformRoasChartInstance = new Chart(ctx2, {
 type: 'bar',
 data: {
 labels: platformLabels.length ? platformLabels : ['لا توجد منصات'],
 datasets: [{
 label: 'معدل العائد Real ROAS (x)',
 data: roasData.length ? roasData : [0],
 backgroundColor: roasData.map(v => v >= 1 ? 'rgba(30, 111, 84, 0.8)' : 'rgba(47, 102, 144, 0.8)'),
 borderColor: roasData.map(v => v >= 1 ? '#1E6F54' : '#2F6690'),
 borderWidth: 2,
 borderRadius: 8,
 }]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { display: false }
 },
 scales: {
 y: {
 suggestedMax: 3,
 ticks: { callback: (v) => `${v}×`, font: { family: 'Almarai' } }
 },
 x: { ticks: { font: { family: 'Almarai', weight: 'bold' } } }
 }
 }
 });
 }

 // 3. الدائرة النسبية لحالات طلبات الإعلانات
 const ctx3 = document.getElementById('adStatusDonutChart')?.getContext('2d');
 if (ctx3) {
 if (adStatusDonutChartInstance) adStatusDonutChartInstance.destroy();
 const dCount = statusBreakdown.delivered || 0;
 const sCount = statusBreakdown.shipping || 0;
 const pCount = statusBreakdown.processing || 0;
 const fCount = statusBreakdown.failed_delivery || 0;
 const rCount = statusBreakdown.returned || 0;
 const cCount = statusBreakdown.cancelled || 0;
 const totalCount = dCount + sCount + pCount + fCount + rCount + cCount;

 const hasData = totalCount > 0;
 const statusData = hasData ? [dCount, sCount, pCount, fCount, rCount, cCount] : [0, 0, 0, 0, 0, 0];
 const statusLabels = ['مسلَّمة ', 'قيد التوصيل ', 'قيد المعالجة ', 'تعذر التوصيل ️', 'مرتجع ', 'ملغاة '];
 const statusColors = ['#1E6F54', '#2F6690', '#C9A227', '#F39C12', '#8E44AD', '#E74C3C'];

 adStatusDonutChartInstance = new Chart(ctx3, {
 type: 'doughnut',
 data: {
 labels: statusLabels,
 datasets: [{
 data: hasData ? statusData : [1],
 backgroundColor: hasData ? statusColors : ['#e2e8f0'],
 borderColor: '#ffffff',
 borderWidth: 2,
 }]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { position: 'bottom', labels: { font: { family: 'Almarai', weight: 'bold' }, padding: 12 } },
 tooltip: {
 callbacks: {
 label: function(context) {
 if (!hasData) return 'لا توجد طلبات إعلانات بعد';
 const val = context.raw || 0;
 const pct = totalCount > 0 ? ((val / totalCount) * 100).toFixed(1) : 0;
 return ` ${context.label}: ${val} طلب (${pct}%)`;
 }
 }
 }
 },
 cutout: '65%'
 }
 });
 }

 // 4. الدائرة النسبية / المخطط للمنتجات الأكثر تسليماً مقابل الأكثر إلغاءً من الإعلانات
 const ctx4 = document.getElementById('adProductEffectivenessChart')?.getContext('2d');
 if (ctx4) {
 if (adProductEffectivenessChartInstance) adProductEffectivenessChartInstance.destroy();

 // دمج أسماء المنتجات الفريدة
 const productNames = Array.from(new Set([
 ...topDelivered.map(p => p.name),
 ...topCancelled.map(p => p.name)
 ])).slice(0, 5);

 const deliveredQuantities = productNames.map(name => {
 const found = topDelivered.find(p => p.name === name);
 return found ? found.qty : 0;
 });

 const cancelledQuantities = productNames.map(name => {
 const found = topCancelled.find(p => p.name === name);
 return found ? found.qty : 0;
 });

 const hasProdData = productNames.length > 0;

 adProductEffectivenessChartInstance = new Chart(ctx4, {
 type: 'bar',
 data: {
 labels: hasProdData ? productNames : ['لا توجد منتجات مسجلة بعد'],
 datasets: [
 {
 label: 'المسلَّمة فعلياً ',
 data: hasProdData ? deliveredQuantities : [0],
 backgroundColor: '#1E6F54',
 borderRadius: 6,
 },
 {
 label: 'الملغاة / المرتجعة ',
 data: hasProdData ? cancelledQuantities : [0],
 backgroundColor: '#E74C3C',
 borderRadius: 6,
 }
 ]
 },
 options: {
 indexAxis: 'y', // أفقي لقراءة أسماء المنتجات بوضوح
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { position: 'top', labels: { font: { family: 'Almarai', weight: 'bold' } } },
 tooltip: {
 callbacks: {
 label: function(context) {
 return ` ${context.dataset.label}: ${context.raw} قطعة / عبوة`;
 }
 }
 }
 },
 scales: {
 x: {
 beginAtZero: true,
 ticks: { stepSize: 1, font: { family: 'Almarai' } }
 },
 y: {
 ticks: { font: { family: 'Almarai', weight: 'bold' } }
 }
 }
 }
 });
 }
}

function renderProfitStructureChart(d) {
 if (typeof Chart === 'undefined') return;
 const ctx = document.getElementById('profitStructureChart')?.getContext('2d');
 if (!ctx) return;

 if (profitStructureChartInstance) profitStructureChartInstance.destroy();
 profitStructureChartInstance = new Chart(ctx, {
 type: 'doughnut',
 data: {
 labels: ['تكلفة المنتجات (COGS)', 'خسائر الراجع (Retour)', 'صافي الربح المتبقي'],
 datasets: [{
 data: [d.cost_of_goods, d.shipping_cost, Math.max(0, d.net_profit)],
 backgroundColor: ['#2F6690', '#E74C3C', '#1E6F54'],
 borderWidth: 2,
 borderColor: '#ffffff',
 }]
 },
 options: {
 responsive: true,
 maintainAspectRatio: false,
 plugins: {
 legend: { position: 'bottom', labels: { font: { family: 'Almarai', weight: 'bold' } } },
 tooltip: {
 callbacks: {
 label: function(context) {
 return ` ${context.label}: ${context.raw.toLocaleString('ar-DZ')} دج`;
 }
 }
 }
 }
 }
 });
}

// نموذج تسجيل المصاريف

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
 const url = EDIT_SPEND_ID ? `/api/campaigns/spend/${EDIT_SPEND_ID}` : '/api/campaigns/spend';

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

 showToast(EDIT_SPEND_ID ? 'تم تعديل المصروف بنجاح ' : `تم تسجيل ${money(spend_amount)} مصاريف لحملة "${campaign_name}"`);
 
 // Reset
 EDIT_SPEND_ID = null;
 e.target.reset();
 document.getElementById('spendSubmitBtn').textContent = 'تسجيل المصروف';
 
 loadCampaignAnalytics();
});

document.getElementById('refreshCampaignsBtn')?.addEventListener('click', loadCampaignAnalytics);

// ---------- الأرباح 30 يوم ----------
async function loadProfit30d() {
 const res = await fetch('/api/orders/profit-30d');
 if (!res.ok) return;
 const d = await res.json();

 document.getElementById('profitRevenue').textContent = money(d.revenue);
 document.getElementById('profitCogs').textContent = `- ${money(d.cost_of_goods)}`;
 document.getElementById('profitShipping').textContent = `- ${money(d.shipping_cost)}`;
 const netEl = document.getElementById('profitNet');
 netEl.textContent = money(d.net_profit);
 netEl.style.color = d.net_profit >= 0 ? '#1E6F54' : '#2F6690';
 document.getElementById('profitMeta').textContent =
 `${d.delivered_orders} طلب مُسلَّم، ${d.units_sold} قطعة مباعة خلال آخر ${d.period_days} يومًا`;

 // رسم الهيكل المالي للأرباح
 renderProfitStructureChart(d);

 const container = document.getElementById('profitTopProducts');
 if (!d.top_products.length) {
 container.innerHTML = '<p class="p-6 text-slate-900/40 text-sm font-bold">لا توجد مبيعات مُسلَّمة خلال آخر 30 يومًا بعد.</p>';
 return;
 }
 container.innerHTML = `
 <table class="w-full text-sm">
 <thead class="bg-slate-50 text-slate-900/60">
 <tr>
 <th class="p-3 text-right">المنتج</th>
 <th class="p-3 text-right">الكمية المباعة</th>
 <th class="p-3 text-right">المبيعات</th>
 <th class="p-3 text-right">الربح</th>
 </tr>
 </thead>
 <tbody>
 ${d.top_products.map(p => `
 <tr class="border-t border-slate-200/10">
 <td class="p-3 font-bold">${escapeHtml(p.name)}</td>
 <td class="p-3">${p.qty}</td>
 <td class="p-3">${money(p.revenue)}</td>
 <td class="p-3 font-extrabold" style="color:${p.profit >= 0 ? '#1E6F54' : '#2F6690'}">${money(p.profit)}</td>
 </tr>
 `).join('')}
 </tbody>
 </table>
 `;
}

// ---------- الطلبات ----------
let ALL_ORDERS = [];
let ORDER_FILTER = 'active';

async function loadOrders() {
 const res = await fetch('/api/orders');
 if (!res.ok) return;
 ALL_ORDERS = await res.json();
 renderOrdersTable();
 loadOrderStats();
 loadProfit30d();
}

async function loadOrderStats() {
 const res = await fetch('/api/orders/stats');
 if (!res.ok) return;
 const s = await res.json();
 document.getElementById('statSales').textContent = money(s.total_sales);
 document.getElementById('statShipping').textContent = `- ${money(s.shipping_losses)}`;
 const netEl = document.getElementById('statNet');
 netEl.textContent = money(s.net_profit);
 netEl.style.color = s.net_profit >= 0 ? '#1E6F54' : '#2F6690';

 const cancelledAfterShipping = s.counts.cancelled_after_shipping || 0;
 const noteEl = document.getElementById('statCancelledAfterShipping');
 noteEl.textContent = cancelledAfterShipping > 0
 ? `منها ${cancelledAfterShipping} طلب شُحن ثم أُلغي (خسارة الشحن محتسبة رغم الإلغاء)`
 : '';
}

document.querySelectorAll('.order-filter-btn').forEach((btn) => {
 btn.addEventListener('click', () => {
 document.querySelectorAll('.order-filter-btn').forEach((b) => b.classList.remove('active-cat'));
 btn.classList.add('active-cat');
 ORDER_FILTER = btn.dataset.orderfilter;
 renderOrdersTable();
 });
});

function filteredOrders() {
 const search = (document.getElementById('orderSearchInput')?.value || '').trim().toLowerCase();
 const from = document.getElementById('orderDateFrom')?.value || '';
 const to = document.getElementById('orderDateTo')?.value || '';
 return ALL_ORDERS.filter((order) => {
 const statusMatch = ORDER_FILTER === 'delivered' ? order.status === 'تم التسليم'
 : ORDER_FILTER === 'failed_delivery' ? order.status === 'تعذر التوصيل'
 : ORDER_FILTER === 'returned' ? order.status === 'مرتجع'
 : ORDER_FILTER === 'cancelled' ? order.status === 'ملغي'
 : ORDER_FILTER === 'all' ? true
 : ['قيد المعالجة', 'قيد التوصيل'].includes(order.status);
 const haystack = `${order.id} ${order.customer_name} ${order.phone} ${order.wilaya_name || ''}`.toLowerCase();
 const date = (order.created_at || '').slice(0, 10);
 return statusMatch && (!search || haystack.includes(search)) && (!from || date >= from) && (!to || date <= to);
 });
}

['orderSearchInput', 'orderDateFrom', 'orderDateTo'].forEach((id) => {
 document.getElementById(id)?.addEventListener('input', renderOrdersTable);
 document.getElementById(id)?.addEventListener('change', renderOrdersTable);
});

function renderOrdersTable() {
 const orders = filteredOrders();
 const table = document.getElementById('ordersTable');

 if (!orders.length) {
 table.innerHTML = '<p class="p-6 text-slate-900/40 text-sm font-bold">لا توجد طلبات في هذا القسم.</p>';
 return;
 }

 table.innerHTML = `
 <table class="w-full text-sm">
 <thead class="bg-slate-50 text-slate-900/60">
 <tr>
 <th class="p-3 text-right">#</th>
 <th class="p-3 text-right">العميل</th>
 <th class="p-3 text-right">العنوان</th>
 <th class="p-3 text-right">التوصيل</th>
 <th class="p-3 text-right">المنتجات</th>
 <th class="p-3 text-right">الإجمالي</th>
 <th class="p-3 text-right">الحالة والإجراء</th>
 <th class="p-3 text-right">التاريخ</th>
 <th class="p-3 text-right"></th>
 </tr>
 </thead>
 <tbody id="ordersTbody"></tbody>
 </table>
 `;
 const tbody = document.getElementById('ordersTbody');
 
 const VALID_TRANSITIONS = {
 'قيد المعالجة': ['قيد المعالجة', 'قيد التوصيل', 'تم التسليم', 'ملغي'],
 'قيد التوصيل': ['قيد التوصيل', 'قيد المعالجة', 'تم التسليم', 'تعذر التوصيل', 'ملغي'],
 'تعذر التوصيل': ['تعذر التوصيل', 'قيد المعالجة', 'قيد التوصيل', 'ملغي'],
 'تم التسليم': ['تم التسليم', 'مرتجع', 'قيد التوصيل', 'قيد المعالجة'],
 'مرتجع': ['مرتجع'],
 'ملغي': ['ملغي', 'قيد المعالجة', 'قيد التوصيل']
 };

 const STATUS_BADGE_STYLE = {
 'قيد المعالجة': 'bg-amber-100 text-amber-900 border-amber-300',
 'قيد التوصيل': 'bg-blue-100 text-red-900 border-blue-300',
 'تم التسليم': 'bg-emerald-100 text-emerald-900 border-emerald-300',
 'تعذر التوصيل': 'bg-orange-100 text-orange-900 border-orange-300',
 'مرتجع': 'bg-purple-100 text-purple-900 border-purple-300',
 'ملغي': 'bg-rose-100 text-rose-900 border-rose-300',
 };

    const phoneCounts = {};
   for (const o of orders) {
     if (o.customer_phone) {
       phoneCounts[o.customer_phone] = (phoneCounts[o.customer_phone] || 0) + 1;
     }
   }

   let colorIndex = 0;
   const phoneColors = {};
   const bgColors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-yellow-100', 'bg-rose-100', 'bg-cyan-100'];

   for (const o of orders) {
   const tr = document.createElement('tr');
   tr.className = 'border-t border-slate-200/10 hover:bg-slate-50 transition-colors';
   if (o.customer_phone && phoneCounts[o.customer_phone] > 1) {
     if (!phoneColors[o.customer_phone]) {
       phoneColors[o.customer_phone] = bgColors[colorIndex % bgColors.length];
       colorIndex++;
     }
     tr.className = 'border-t border-slate-200/20 ' + phoneColors[o.customer_phone];
   }
 const deliveryLabel = o.delivery_type === 'desk' ? 'مكتب البريد ' : 'للمنزل ';

 const itemsSummary = (o.items || []).map(i => {
 const details = [];
 if (i.color) details.push(`اللون: ${escapeHtml(i.color)}`);
 if (i.size) details.push(`المقاس: ${escapeHtml(i.size)}`);
 if (!i.color && !i.size && i.variant_label) details.push(escapeHtml(i.variant_label));

 const colorDot = i.color_code ? `<span class="w-3 h-3 rounded-full border border-slate-200/30 inline-block shrink-0" style="background-color:${escapeHtml(i.color_code)}"></span>` : '';
 const imgTag = i.image ? `<img src="${escapeHtml(i.image)}" class="w-7 h-7 object-cover rounded border border-slate-200/20 shrink-0 bg-slate-50" />` : '';
 const detailsBadge = details.length ? `<span class="bg-red-700/10 text-blue-600 font-black px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">${colorDot}${details.join(' | ')}</span>` : '';

 return `
 <div class="flex items-center gap-2 my-1 bg-slate-100/40 p-1.5 rounded-lg border border-slate-200/5">
 ${imgTag}
 <div class="flex-1">
 <div class="font-bold">${escapeHtml(i.name)} <span class="text-slate-900/60">× ${i.qty}</span></div>
 ${detailsBadge}
 </div>
 </div>
 `;
 }).join('');

 const availableStatuses = VALID_TRANSITIONS[o.status] || [o.status];
 const isFinalStatus = ['مرتجع', 'ملغي'].includes(o.status);

 const shippingLossBadge = o.shipping_cost_incurred && ['ملغي', 'مرتجع', 'تعذر التوصيل'].includes(o.status)
 ? `<span class="block text-[10px] font-black text-[#E52F20] mt-0.5">️ خُصمت تكلفة التوصيل (-${money(o.delivery_price)})</span>`
 : '';

 const trackingBadge = o.tracking_code
 ? `<div class="mt-1 flex flex-col gap-1">
 <span class="inline-flex items-center gap-1 text-[10px] font-mono font-black bg-slate-50 border border-slate-200/20 px-1.5 py-0.5 rounded">
 ${escapeHtml(o.tracking_code)}
 </span>
 ${safeUrl(o.label_url) ? `<a href="${escapeHtml(safeUrl(o.label_url))}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-black text-red-700 hover:underline flex items-center gap-1"> طباعة البوليصة</a>` : ''}
 <button class="live-track-btn text-[10px] font-black text-blue-600 hover:underline text-right" data-orderid="${o.id}"> تتبع لحظي</button>
 </div>`
 : (['قيد المعالجة', 'قيد التوصيل'].includes(o.status) ? `
 <div class="mt-1">
 <button class="generate-label-btn btn-outline text-[10px] font-black px-2 py-1 rounded bg-slate-50/60 border-slate-200/30 hover:bg-red-700 hover:text-white transition-all flex items-center gap-1" data-orderid="${o.id}">
 ️ توليد بوليصة الشحن
 </button>
 </div>` : '');

 tr.innerHTML = `
 <td class="p-3">${o.id}</td>
 <td class="p-3">${escapeHtml(o.customer_name)}<br><span class="text-sm text-slate-900/40">${escapeHtml(o.phone)}</span></td>
 <td class="p-3 text-sm">
 <b>${escapeHtml(o.wilaya_name || '')}</b> - ${escapeHtml(o.commune || '')}<br>
 <span class="text-slate-900/40">${escapeHtml(o.address)}</span>
 </td>
 <td class="p-3 text-sm">
 ${deliveryLabel}<br>
 <span class="text-slate-900/40">+${money(o.delivery_price)}</span>
 ${trackingBadge}
 </td>
 <td class="p-3 text-sm">${itemsSummary}</td>
 <td class="p-3 font-extrabold">${money(o.total)}<br><span class="text-sm text-slate-900/40 font-normal">منتجات: ${money(o.subtotal)}</span></td>
 <td class="p-3">
 ${isFinalStatus ? `
 <span class="inline-block px-4 py-1 text-sm font-black rounded-lg border ${STATUS_BADGE_STYLE[o.status] || 'bg-slate-50'}">
 ${o.status}
 </span>
 ${shippingLossBadge}
 ` : `
 <select class="status-select field px-2 py-1 text-sm font-black rounded-lg border ${STATUS_BADGE_STYLE[o.status] || ''}">
 ${availableStatuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
 </select>
 ${shippingLossBadge}
 `}
 </td>
 <td class="p-3 text-sm text-slate-900/40">${new Date(o.created_at).toLocaleString('ar-DZ')}</td>
 <td class="p-3"><button class="del-order-btn text-rose-600 font-extrabold text-sm hover:underline">🗑️ حذف</button></td>
 `;

 const selectEl = tr.querySelector('.status-select');
 if (selectEl) {
 selectEl.addEventListener('change', async (e) => {
 const previousValue = o.status;
 const targetVal = e.target.value;

 if (targetVal === 'مرتجع' && !confirm('هل أنت متأكد من تسجيل هذا الطلب كـ "مرتجع"؟ سيتم استرجاع قطع المنتج إلى المخزون واحتساب تكلفة الشحن كخسارة.')) {
 e.target.value = previousValue;
 return;
 }

 const res = await fetch(`/api/orders/${o.id}/status`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ status: targetVal }),
 });
 const data = await res.json();
 if (!res.ok) {
 e.target.value = previousValue;
 showToast(data.error || 'تعذر تحديث حالة الطلب', true);
 return;
 }
 o.status = targetVal;
 showToast('تم تحديث حالة الطلب بنجاح ');
 loadProducts();
 loadOrderStats();
 loadProfit30d();
 renderOrdersTable();
 });
 }
 // زر توليد البوليصة
 const genBtn = tr.querySelector('.generate-label-btn');
 if (genBtn) {
 genBtn.addEventListener('click', async () => {
 try {
 genBtn.disabled = true;
 genBtn.textContent = 'جارٍ التوليد... ';
 const res = await fetch(`/api/shipping/orders/${o.id}/generate-label`, { method: 'POST' });
 const data = await res.json();
 if (!res.ok) {
 showToast(data.error || 'تعذر توليد بوليصة الشحن', true);
 genBtn.disabled = false;
 genBtn.textContent = '️ توليد بوليصة الشحن';
 return;
 }
 showToast('تم تسجيل الطرد وتوليد بوليصة الشحن بنجاح ');
 if (data.label_url) {
 const labelUrl = safeUrl(data.label_url);
 if (labelUrl) window.open(labelUrl, '_blank', 'noopener,noreferrer');
 }
 loadOrders();
 } catch (err) {
 showToast(err.message, true);
 genBtn.disabled = false;
 genBtn.textContent = '️ توليد بوليصة الشحن';
 }
 });
 }

 // زر التتبع اللحظي
 const trackBtn = tr.querySelector('.live-track-btn');
 if (trackBtn) {
 trackBtn.addEventListener('click', async () => {
 try {
 trackBtn.textContent = 'جارٍ التتبع... ';
 const res = await fetch(`/api/shipping/orders/${o.id}/live-track`);
 const data = await res.json();
 if (!res.ok) {
 showToast(data.error || 'تعذر جلب بيانات التتبع', true);
 trackBtn.textContent = ' تتبع لحظي';
 return;
 }
 showToast(`حالة الشحنة لدى الشركة: ${data.last_status || 'قيد التوصيل'} (${data.internal_status || ''})`);
 loadOrders();
 } catch (err) {
 showToast(err.message, true);
 trackBtn.textContent = ' تتبع لحظي';
 }
 });
 }

 tr.querySelector('.del-order-btn').addEventListener('click', () => deleteOrder(o.id, o.status));
 tbody.appendChild(tr);
 }
}

async function deleteOrder(id, status) {
 let body = {};

 if (status === 'قيد التوصيل') {
 // هذا الطلب لم يصل للزبون بعد مهما كانت النتيجة، لذا سيعود المخزون حتمًا.
 // لكن تكلفة الشحن تعتمد على إجابتك: هل ذهب المندوب فعليًا ودُفعت التكلفة أم لا؟
 if (!confirm(`حذف الطلب رقم ${id}؟ (سيعود المخزون تلقائيًا لأنه لم يصل للزبون بعد)`)) return;
 const lost = confirm('هل خسرت ثمن التوصيل فعليًا (أي ذهب المندوب ودفعت التكلفة)؟\n\nاضغط "موافق" إذا نعم، أو "إلغاء" إذا لا.');
 body = { lost_shipping_cost: lost };
 } else {
 const warning = status === 'تم التسليم'
 ? `حذف الطلب رقم ${id} نهائيًا؟ (تم تسليمه فعليًا، فلن يُعاد أي مخزون، وستبقى مبيعاته وتكلفة شحنه محتسبة في الأرباح كسجل مؤرشف)`
 : `حذف الطلب رقم ${id} نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`;
 if (!confirm(warning)) return;
 }

 const res = await fetch(`/api/orders/${id}`, {
 method: 'DELETE',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(body),
 });
 if (res.ok) {
 showToast('تم حذف الطلب');
 ALL_ORDERS = ALL_ORDERS.filter((o) => o.id !== id);
 renderOrdersTable();
 loadOrderStats();
 loadProfit30d();
 loadProducts();
 } else {
 const data = await res.json().catch(() => ({}));
 showToast(data.error || 'تعذر حذف الطلب', true);
 }
}

// ---------- أسعار التوصيل ----------
let DELIVERY_RATES = [];

async function loadDeliveryRates() {
 const res = await fetch('/api/locations/wilayas');
 DELIVERY_RATES = await res.json();
 renderDeliveryTable(DELIVERY_RATES);
}

function renderDeliveryTable(rates) {
 const container = document.getElementById('deliveryTable');
 container.innerHTML = `
 <table class="w-full text-sm">
 <thead class="bg-slate-50 text-slate-900/60">
 <tr>
 <th class="p-3 text-right">#</th>
 <th class="p-3 text-right">الولاية</th>
 <th class="p-3 text-right">التوصيل للمنزل (دج)</th>
 <th class="p-3 text-right">التوصيل لمكتب البريد (دج)</th>
 </tr>
 </thead>
 <tbody id="deliveryTbody"></tbody>
 </table>
 `;
 const tbody = document.getElementById('deliveryTbody');
 for (const r of rates) {
 const tr = document.createElement('tr');
 tr.className = 'border-t border-slate-200/10';
 tr.innerHTML = `
 <td class="p-2 text-sm text-slate-900/40">${String(r.wilaya_code).padStart(2, '0')}</td>
 <td class="p-2 font-bold">${escapeHtml(r.wilaya_name)}</td>
 <td class="p-2"><input type="number" min="0" step="10" data-code="${r.wilaya_code}" data-field="home_price" value="${r.home_price}" class="field px-2 py-1 text-sm w-28" /></td>
 <td class="p-2"><input type="number" min="0" step="10" data-code="${r.wilaya_code}" data-field="desk_price" value="${r.desk_price}" class="field px-2 py-1 text-sm w-28" /></td>
 `;
 tbody.appendChild(tr);
 }
}

document.getElementById('deliverySearch').addEventListener('input', (e) => {
 const q = e.target.value.trim();
 const filtered = q ? DELIVERY_RATES.filter(r => r.wilaya_name.includes(q)) : DELIVERY_RATES;
 renderDeliveryTable(filtered);
});

document.getElementById('saveDeliveryBtn').addEventListener('click', async () => {
 const inputs = document.querySelectorAll('#deliveryTbody input');
 const map = {};
 inputs.forEach((input) => {
 const code = input.dataset.code;
 map[code] = map[code] || { wilaya_code: Number(code), home_price: 0, desk_price: 0 };
 map[code][input.dataset.field] = Number(input.value) || 0;
 });

 // دمج القيم المعدّلة مع بقية الولايات غير المعروضة حاليًا (بسبب البحث)
 const rateMap = new Map(DELIVERY_RATES.map(r => [r.wilaya_code, r]));
 for (const code in map) {
 rateMap.set(Number(code), { ...rateMap.get(Number(code)), ...map[code] });
 }
 const rates = Array.from(rateMap.values()).map(r => ({
 wilaya_code: r.wilaya_code, home_price: r.home_price, desk_price: r.desk_price,
 }));

 const res = await fetch('/api/locations/wilayas', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ rates }),
 });
 if (res.ok) {
 showToast('تم حفظ كل أسعار التوصيل ');
 loadDeliveryRates();
 } else {
 showToast('تعذر الحفظ', true);
 }
});

// ---------- إدارة إعادة التعيين وتصفير الحسابات مع كلمة المرور ----------
let ACTIVE_RESET_ACTION = null; // 'stats' أو 'store'

function openResetModal(actionType) {
 ACTIVE_RESET_ACTION = actionType;
 const modal = document.getElementById('resetConfirmModal');
 const title = document.getElementById('resetModalTitle');
 const icon = document.getElementById('resetModalIcon');
 const subtitle = document.getElementById('resetModalSubtitle');
 const warning = document.getElementById('resetModalWarning');
 const passInput = document.getElementById('resetAdminPassword');
 const errorEl = document.getElementById('resetModalError');

 errorEl.classList.add('hidden');
 errorEl.textContent = '';
 passInput.value = '';

 if (actionType === 'stats') {
 icon.textContent = '';
 title.textContent = 'تصفير الحسابات والطلبات (0)';
 subtitle.textContent = 'إعادة تصفير الإحصائيات والأرباح لتبدأ من جديد';
 warning.innerHTML = '️ <b>تحذير:</b> سيتم حذف جميع الطلبات المسجلة وتصفير المبيعات والأرباح وتكاليف الشحن إلى <b>0 دج</b>. ستبقى المنتجات والتصنيفات كما هي.';
 } else if (actionType === 'store') {
 icon.textContent = '️';
 title.textContent = 'إعادة ضبط المصنع الكامل للمتجر';
 subtitle.textContent = 'مسح شامل وإعادة المتجر نظيفاً مع حفظ أسعار التوصيل';
 warning.innerHTML = ' <b>تحذير:</b> سيتم مسح المنتجات والتصنيفات والطلبات والإحصائيات ومصاريف الإعلانات. <b>ستبقى أسعار التوصيل للولايات الـ 69 محفوظة كما هي دون مسح.</b>';
 }

 modal.classList.remove('hidden');
 setTimeout(() => passInput.focus(), 100);
}

function closeResetModal() {
 document.getElementById('resetConfirmModal').classList.add('hidden');
 ACTIVE_RESET_ACTION = null;
}

document.getElementById('closeResetConfirmModal')?.addEventListener('click', closeResetModal);
document.getElementById('quickResetStatsBtn')?.addEventListener('click', () => openResetModal('stats'));
document.getElementById('openResetStatsModalBtn')?.addEventListener('click', () => openResetModal('stats'));
document.getElementById('openResetStoreModalBtn')?.addEventListener('click', () => openResetModal('store'));

document.getElementById('resetConfirmForm')?.addEventListener('submit', async (e) => {
 e.preventDefault();
 const password = document.getElementById('resetAdminPassword').value;
 const errorEl = document.getElementById('resetModalError');
 const submitBtn = document.getElementById('executeResetBtn');
 const origText = submitBtn.textContent;

 errorEl.classList.add('hidden');
 submitBtn.disabled = true;
 submitBtn.textContent = 'جارٍ التحقق والتنفيذ...';

 const endpoint = ACTIVE_RESET_ACTION === 'store' ? '/api/settings/reset-store' : '/api/settings/reset-stats';

 try {
 const res = await fetch(endpoint, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ password }),
 });

 const data = await res.json().catch(() => ({ error: 'تعذر الاتصال بالخادم، يرجى إعادة تحميل الصفحة وتكرار المحاولة.' }));

 if (!res.ok) {
 throw new Error(data.error || 'فشلت العملية. تأكد من صحة كلمة المرور.');
 }

 closeResetModal();
 showToast(data.message || 'تمت العملية بنجاح ');

 // إعادة تحميل بيانات اللوحة
 loadCategoryTree();
 loadProducts();
 loadOrders();
 loadDeliveryRates();
 loadProfit30d();
 loadCampaignAnalytics();
 initCalculator();

 } catch (err) {
 errorEl.textContent = err.message;
 errorEl.classList.remove('hidden');
 } finally {
 submitBtn.disabled = false;
 submitBtn.textContent = origText;
 }
});

// ---------- إدارة إعدادات الشحن للتاجر و API ----------
async function populateOriginWilayas() {
 const select = document.getElementById('fromWilayaSelect');
 if (!select || select.children.length > 0) return;
 try {
 const res = await fetch('/api/locations/wilayas');
 const wilayas = await res.json();
 select.innerHTML = wilayas.map(w => `<option value="${w.wilaya_code}">${String(w.wilaya_code).padStart(2, '0')} - ${escapeHtml(w.wilaya_name)}</option>`).join('');
 } catch (err) {
 console.error('Failed to load origin wilayas:', err);
 }
}

async function loadVendorShippingSettings() {
 await populateOriginWilayas();
 try {
 const res = await fetch('/api/shipping/settings');
 if (!res.ok) return;
 const config = await res.json();

 const form = document.getElementById('vendorShippingForm');
 if (!form) return;

 if (form.provider) form.provider.value = config.provider || 'manual';
 if (form.api_key) form.api_key.value = config.api_key || '';
 if (form.api_token) form.api_token.value = config.api_token || '';
 if (form.manual_provider_name) form.manual_provider_name.value = config.manual_provider_name || '';
 if (form.from_wilaya_id) form.from_wilaya_id.value = config.from_wilaya_id || 16;
 if (form.from_commune) form.from_commune.value = config.from_commune || '';
 
 const pricingRadio = form.querySelector(`input[name="pricing_mode"][value="${config.pricing_mode || 'flat'}"]`);
 if (pricingRadio) pricingRadio.checked = true;

 if (form.flat_home_price) form.flat_home_price.value = config.flat_home_price || 600;
 if (form.flat_desk_price) form.flat_desk_price.value = config.flat_desk_price || 350;
 if (form.free_shipping_enabled) form.free_shipping_enabled.checked = !!config.free_shipping_enabled;
 if (form.free_shipping_threshold) form.free_shipping_threshold.value = config.free_shipping_threshold || 15000;
 renderCustomPricingVisibility();
 loadCustomRates();
 } catch (err) {
 console.error('Failed to load vendor shipping settings:', err);
 }
}

function renderCustomPricingVisibility() {
 const mode = document.querySelector('input[name="pricing_mode"]:checked')?.value;
 document.getElementById('flatPricingSection')?.classList.toggle('hidden', mode !== 'flat');
 document.getElementById('customPricingSection')?.classList.toggle('hidden', mode !== 'custom');
}

document.querySelectorAll('input[name="pricing_mode"]').forEach((radio) => radio.addEventListener('change', () => {
 renderCustomPricingVisibility();
 if (radio.checked && radio.value === 'custom') loadCustomRates();
}));

async function loadCustomRates() {
 const table = document.getElementById('customRatesTable');
 if (!table || document.getElementById('customPricingSection')?.classList.contains('hidden')) return;
 const res = await fetch('/api/shipping/custom-rates');
 if (!res.ok) return;
 const { rates } = await res.json();
 table.innerHTML = `<table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="p-2 text-right">الولاية</th><th class="p-2">للمنزل</th><th class="p-2">للمكتب</th><th class="p-2">متاح</th></tr></thead><tbody>${rates.map((rate) => `<tr data-wilaya-row="${rate.wilaya_code}" class="border-t border-slate-200/10"><td class="p-2 font-bold">${rate.wilaya_code} - ${escapeHtml(rate.wilaya_name)}</td><td class="p-2"><input data-rate="home" type="number" min="0" value="${rate.home_price}" class="field w-24 px-2 py-1 text-sm" /></td><td class="p-2"><input data-rate="desk" type="number" min="0" value="${rate.desk_price}" class="field w-24 px-2 py-1 text-sm" /></td><td class="p-2 text-center"><input data-rate="deliverable" type="checkbox" ${rate.is_deliverable ? 'checked' : ''} /></td></tr>`).join('')}</tbody></table>`;
 document.getElementById('customRatesSearch')?.addEventListener('input', filterCustomRates, { once: true });
}

function filterCustomRates(event) {
 const query = event.target.value.trim().toLowerCase();
 document.querySelectorAll('#customRatesTable tbody tr').forEach((row) => { row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(query)); });
 event.target.addEventListener('input', filterCustomRates);
}

document.getElementById('saveCustomRatesBtn')?.addEventListener('click', async () => {
 const rates = Array.from(document.querySelectorAll('#customRatesTable tbody tr')).map((row) => ({
 wilaya_code: row.dataset.wilayaRow,
 home_price: row.querySelector('[data-rate="home"]').value,
 desk_price: row.querySelector('[data-rate="desk"]').value,
 is_deliverable: row.querySelector('[data-rate="deliverable"]').checked,
 }));
 const res = await fetch('/api/shipping/custom-rates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rates }) });
 const data = await res.json();
 showToast(res.ok ? data.message : (data.error || 'تعذر حفظ الأسعار'), !res.ok);
});

document.getElementById('vendorShippingForm')?.addEventListener('submit', async (e) => {
 e.preventDefault();
 const form = e.target;
 const formData = new FormData(form);
 const payload = Object.fromEntries(formData.entries());
 payload.free_shipping_enabled = form.free_shipping_enabled.checked ? 1 : 0;

 try {
 const res = await fetch('/api/shipping/settings', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(payload)
 });
 const data = await res.json();
 if (res.ok) {
 showToast('تم حفظ إعدادات الشحن بنجاح ');
 } else {
 showToast(data.error || 'تعذر حفظ إعدادات الشحن', true);
 }
 } catch (err) {
 showToast(err.message, true);
 }
});

// استدعاء تحميل إعدادات الشحن عند تبديل التبويب
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
 btn.addEventListener('click', () => {
 if (btn.dataset.tab === 'shipping-settings') {
      loadVendorShippingSettings();
    } else if (btn.dataset.tab === 'reports') {
      loadProductReport();
    }
 });
});

checkSession();

// ---------- العدّاد الحي حسب المنصة (زيارات + مشتريات تلقائية) ----------
(function () {
  const LABELS = {
    facebook: '🔵 فيسبوك', instagram: '📸 انستغرام', tiktok: '⚫ تيك توك', google: '🔴 جوجل',
    snapchat: '🟡 سناب شات', youtube: '▶️ يوتيوب', whatsapp: '🟢 واتساب', telegram: '✈️ تيليغرام',
    direct: '🔗 مباشر / بدون مصدر',
  };
  let timer = null;
  let data = [];
  let programmatic = false;

  const platformLabel = (src) => LABELS[src] || escapeHtml(src);

  function render() {
    const tbody = document.getElementById('platformLiveTbody');
    if (!tbody) return;
    const rows = data.filter((p) => p.visits > 0 || p.orders > 0 || p.spend > 0 || ['facebook', 'instagram', 'tiktok'].includes(p.source));
    tbody.innerHTML = rows.map((p) => `
      <tr class="border-b border-slate-100">
        <td class="p-2 font-black">${platformLabel(p.source)}</td>
        <td class="p-2 text-center font-bold">${p.visits}</td>
        <td class="p-2 text-center font-black text-emerald-700">${p.orders}</td>
        <td class="p-2 text-center">${p.conversion_rate.toFixed(1)}%</td>
        <td class="p-2 text-center">${p.spend ? money(p.spend) : '—'}</td>
        <td class="p-2 text-center"><button type="button" class="platform-reset-btn text-rose-600 font-black hover:underline" data-source="${escapeHtml(p.source)}">↺ صفّر</button></td>
      </tr>`).join('') || '<tr><td colspan="6" class="p-4 text-center text-slate-900/40 font-bold">لا توجد بيانات بعد</td></tr>';
    const stamp = document.getElementById('platformLiveStamp');
    if (stamp) stamp.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar-DZ');
  }

  function setInput(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    programmatic = true;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    programmatic = false;
  }

  // تعبئة الحاسبة من أرقام المنصة المربوطة، دون الكتابة فوق ما أدخله المستخدم يدوياً
  function applyToCalculator() {
    const src = document.getElementById('calcPlatform')?.value;
    if (!src) return;
    const st = data.find((p) => p.source === src);
    if (!st) return;
    const buyers = document.getElementById('calcTotalBuyers');
    const budget = document.getElementById('calcTotalAdBudget');
    if (buyers && !buyers.dataset.manual) setInput('calcTotalBuyers', st.orders > 0 ? st.orders : '');
    if (budget && !budget.dataset.manual && st.spend > 0) setInput('calcTotalAdBudget', st.spend);
  }

  async function load() {
    try {
      const res = await fetch('/api/campaigns/platform-live');
      if (!res.ok) return;
      const json = await res.json();
      data = json.platforms || [];
      render();
      applyToCalculator();
    } catch (_) {}
  }

  async function reset(source) {
    const res = await fetch('/api/campaigns/platform-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    });
    if (!res.ok) { showToast('تعذر التصفير', true); return false; }
    // بعد التصفير نُلغي الإدخال اليدوي ليبدأ العدّ التلقائي من الصفر
    ['calcTotalBuyers', 'calcTotalAdBudget'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) delete el.dataset.manual;
    });
    const sel = document.getElementById('calcPlatform')?.value;
    if (source === 'all' || source === sel) {
      setInput('calcTotalBuyers', '');
      setInput('calcTotalAdBudget', '');
    }
    await load();
    return true;
  }

  function start() { load(); if (!timer) timer = setInterval(load, 10000); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.admin-tab-btn');
    if (tabBtn) { if (tabBtn.dataset.tab === 'calculator') start(); else stop(); return; }
    const one = e.target.closest('.platform-reset-btn');
    if (one) {
      if (confirm('تصفير عدّاد هذه المنصة والبدء من الصفر؟')) reset(one.dataset.source).then((ok) => ok && showToast('تم التصفير — العدّ التلقائي بدأ من جديد'));
      return;
    }
    if (e.target.closest('#platformResetAllBtn')) {
      if (confirm('تصفير عدّادات كل المنصات؟')) reset('all').then((ok) => ok && showToast('تم تصفير الكل'));
    }
  });

  // أي كتابة يدوية في الحقلين توقف التعبئة التلقائية لذلك الحقل
  ['calcTotalBuyers', 'calcTotalAdBudget'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', (e) => {
      if (!programmatic) e.target.dataset.manual = '1';
    });
  });
  document.getElementById('calcPlatform')?.addEventListener('change', () => {
    ['calcTotalBuyers', 'calcTotalAdBudget'].forEach((id) => { const el = document.getElementById(id); if (el) delete el.dataset.manual; });
    applyToCalculator();
  });

  // بعد حفظ الحسبة: صفّر المنصة المربوطة ليبدأ العدّ التلقائي من الصفر
  window.platformAfterSave = async function () {
    const src = document.getElementById('calcPlatform')?.value;
    if (src) await reset(src);
  };
})();


// ---------- Advanced Reports ----------
let productReportChartInstance = null;

async function loadProductReport() {
  try {
    const productSelect = document.getElementById('reportProductSelect');
    const periodSelect = document.getElementById('reportPeriodSelect');
    
    // Populate product select if empty
    if (productSelect.options.length <= 1 && ALL_PRODUCTS && ALL_PRODUCTS.length > 0) {
      ALL_PRODUCTS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        productSelect.appendChild(opt);
      });
    }

    const productId = productSelect.value;
    const months = periodSelect.value;

    const res = await fetch(`/api/orders/product-reports?product_id=${productId}&months=${months}`);
    if (!res.ok) throw new Error('Failed to fetch reports');
    const data = await res.json();
    
    // Update Stats
    document.getElementById('reportNetProfit').textContent = money(data.stats.net_profit) + ' د.ج';
    document.getElementById('reportUnitsSold').textContent = data.stats.units_sold;
    document.getElementById('reportShippingLoss').textContent = money(data.stats.shipping_losses) + ' د.ج';
    document.getElementById('reportOrderRatio').textContent = `${data.stats.delivered_count} / ${data.stats.returned_count}`;

    // Render Chart
    const ctx = document.getElementById('productReportChart');
    if (!ctx) return;
    
    if (productReportChartInstance) {
      productReportChartInstance.destroy();
    }
    
    productReportChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.chartData.labels,
        datasets: [{
          label: 'صافي الأرباح (د.ج)',
          data: data.chartData.profits,
          borderColor: '#1E6F54',
          backgroundColor: 'rgba(30, 111, 84, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });

  } catch (err) {
    console.error(err);
    showToast('خطأ في تحميل التقارير', true);
  }
}

document.getElementById('reportProductSelect')?.addEventListener('change', loadProductReport);
document.getElementById('reportPeriodSelect')?.addEventListener('change', loadProductReport);
