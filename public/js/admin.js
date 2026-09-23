function money(n) { return `${Number(n).toLocaleString('ar-DZ')} دج`; }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
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

async function contactWorkTeam() {
  const whatsappWindow = window.open('about:blank', '_blank');
  try {
    const shippingResponse = await fetch('/api/shipping/settings');
    const shipping = shippingResponse.ok ? await shippingResponse.json() : {};
    const user = currentUser || {};
    const annualPriority = user.subscription_plan === 'annual'
      ? '🚨 أولوية دعم: مشترك سنوي 🚨'
      : '';
    const message = [
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
      `رابط المتجر: ${user.store_slug ? `${window.location.origin}/store/${encodeURIComponent(user.store_slug)}` : 'غير متوفر'}`,
      '',
      'إعدادات الشحن:',
      `الشركة: ${shipping.provider || 'يدوي'}`,
      `ولاية الانطلاق: ${shipping.from_wilaya_id || 'غير محددة'}`,
      `طريقة التسعير: ${shipping.pricing_mode || 'غير محددة'}`,
      `المفاتيح: ${shipping.credentials_configured ? 'مضبوطة' : 'غير مضبوطة'}`,
      '',
      'أرغب في التحدث معكم بخصوص طريقة الدفع أو أي خلل أو مشكلة في المتجر.'
    ].join('\n');
    const url = `https://wa.me/213665236042?text=${encodeURIComponent(message)}`;
    if (whatsappWindow) whatsappWindow.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    if (whatsappWindow) whatsappWindow.close();
    showToast('تعذر تجهيز رسالة فريق العمل. حاول مرة أخرى.', true);
  }
}

document.getElementById('contactTeamBtn')?.addEventListener('click', contactWorkTeam);

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
        ? 'hidden sm:flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-full text-xs font-black cursor-pointer'
        : 'hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-black cursor-pointer hover:bg-amber-200';
    } else {
      headerDaysText.textContent = user.role === 'admin' ? 'حساب إداري: مدى الحياة' : (isExpired ? 'انتهى الاشتراك (مشاهدة فقط)' : `اشتراك ${user.subscription_plan === 'annual' ? 'سنوي' : 'شهري'}: ${daysLeft} يوم`);
      headerPill.className = isExpired
        ? 'hidden sm:flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-full text-xs font-black cursor-pointer'
        : 'hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-black cursor-pointer hover:bg-emerald-200';
    }
  }

  // تحديث الشريط العلوي
  if (bannerText && bannerEl) {
    if (isExpired && user.role !== 'admin') {
      bannerText.innerHTML = `⚠️ <b>انتهت فترتك التجريبية (7 أيام) - أنت في وضع المشاهدة فقط.</b> تواصل مع فريق العمل عبر واتساب لتفعيل حسابك ومواصلة العمل: <b class="underline">0665236042</b>`;
      bannerEl.className = 'bg-rose-700 text-white px-4 py-2.5 text-xs sm:text-sm font-black flex flex-wrap items-center justify-between gap-2 shadow-inner';
      if (bannerBtn) {
        bannerBtn.innerHTML = '💬 تواصل عبر واتساب';
        bannerBtn.onclick = () => window.open('https://wa.me/213665236042?text=' + encodeURIComponent(`مرحباً، أود تفعيل اشتراكي في منصة المتاجر الإلكترونية لحسابي: ${user.email || user.name}`), '_blank');
      }
    } else if (isTrial) {
      bannerText.textContent = `⏳ أنت الآن في الفترة التجريبية المجانية (متبقي ${daysLeft} أيام). استمتع بجميع ميزات المتجر الإلكتروني!`;
      bannerEl.className = 'bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-black flex items-center justify-between shadow-inner';
      if (bannerBtn) {
        bannerBtn.innerHTML = 'ترقية الخطة 🚀';
        bannerBtn.onclick = () => {
          const subTab = document.querySelector('[data-tab="subscription"]');
          if (subTab) subTab.click();
        };
      }
    } else {
      bannerText.textContent = user.role === 'admin'
        ? '⭐ حساب المدير العام نشط مدى الحياة.'
        : `⭐ اشتراكك ${user.subscription_plan === 'annual' ? 'السنوي' : 'الشهري'} نشط حتى ${user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString('ar-DZ') : ''} (متبقي ${daysLeft} يوم).`;
      bannerEl.className = 'bg-emerald-700 text-white px-4 py-2 text-xs sm:text-sm font-black flex items-center justify-between shadow-inner';
      if (bannerBtn) {
        bannerBtn.innerHTML = 'إدارة الاشتراك 👑';
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
        showToast('تم نسخ رابط متجرك بنجاح 📋');
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
    curStatusEl.textContent = isExpired ? 'منتهي (وضع المشاهدة فقط) 👁️' : 'نشط ومفعّل 🟢';
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

  loadSubscriptionHistory();
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
    if (tabAuthRegister) tabAuthRegister.className = 'py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 transition-all flex items-center justify-center gap-1 cursor-pointer';
    if (tabAuthLogin) tabAuthLogin.className = 'py-2.5 rounded-lg text-slate-900/70 hover:text-slate-900 transition-all cursor-pointer';
    if (registerForm) registerForm.classList.remove('hidden');
    if (loginForm) loginForm.classList.add('hidden');
    if (forgotPasswordSection) forgotPasswordSection.classList.add('hidden');
    if (emailVerifySection) emailVerifySection.classList.add('hidden');
  } else {
    if (tabAuthLogin) tabAuthLogin.className = 'py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-900 transition-all cursor-pointer';
    if (tabAuthRegister) tabAuthRegister.className = 'py-2.5 rounded-lg text-slate-900/70 hover:text-slate-900 transition-all flex items-center justify-center gap-1 cursor-pointer';
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

// عناصر واجهة تفعيل البريد الإلكتروني
let verifyTargetEmail = '';
const emailVerifySection = document.getElementById('emailVerifySection');
const verifyEmailForm = document.getElementById('verifyEmailForm');
const verifyEmailMsg = document.getElementById('verifyEmailMessage');
const verifyEmailSubmitBtn = document.getElementById('verifyEmailSubmitBtn');
const verifyTargetEmailLabel = document.getElementById('verifyTargetEmailLabel');
const resendVerifyOtpBtn = document.getElementById('resendVerifyOtpBtn');
const backToLoginFromVerifyBtn = document.getElementById('backToLoginFromVerifyBtn');

function showEmailVerifyScreen(email) {
  verifyTargetEmail = email;
  if (verifyTargetEmailLabel) verifyTargetEmailLabel.textContent = email;
  if (loginForm) loginForm.classList.add('hidden');
  if (registerForm) registerForm.classList.add('hidden');
  if (forgotPasswordSection) forgotPasswordSection.classList.add('hidden');
  if (emailVerifySection) emailVerifySection.classList.remove('hidden');
  const otpInput = document.getElementById('verifyOtpInput');
  if (otpInput) {
    otpInput.value = '';
    otpInput.focus();
  }
}

if (backToLoginFromVerifyBtn) {
  backToLoginFromVerifyBtn.addEventListener('click', () => {
    tabAuthLogin.click();
  });
}

if (resendVerifyOtpBtn) {
  resendVerifyOtpBtn.addEventListener('click', async () => {
    if (!verifyTargetEmail) return;
    resendVerifyOtpBtn.disabled = true;
    resendVerifyOtpBtn.textContent = 'جاري إعادة الإرسال... ⏳';
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyTargetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message || 'تم إرسال رمز تحقق جديد إلى بريدك!');
    } catch (err) {
      showToast(err.message, true);
    } finally {
      resendVerifyOtpBtn.disabled = false;
      resendVerifyOtpBtn.textContent = 'لم يصلك الرمز؟ أعد إرسال رمز جديد 🔄';
    }
  });
}

if (verifyEmailForm) {
  verifyEmailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpInput = document.getElementById('verifyOtpInput');
    const otp = otpInput ? otpInput.value.trim() : '';
    if (!otp) return;

    verifyEmailSubmitBtn.disabled = true;
    verifyEmailSubmitBtn.textContent = 'جاري التحقق والتفعيل... ⏳';
    verifyEmailMsg.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyTargetEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      currentUser = data.user;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      showToast(data.message || '🎉 تم تفعيل بريدك بنجاح!');
      updateSubscriptionUI(currentUser);
      initDashboard();
    } catch (err) {
      verifyEmailMsg.textContent = err.message;
      verifyEmailMsg.className = 'text-xs font-black p-2.5 rounded-xl border bg-rose-50 text-rose-800 border-rose-200 block';
    } finally {
      verifyEmailSubmitBtn.disabled = false;
      verifyEmailSubmitBtn.textContent = 'تفعيل الحساب والدخول 🚀';
    }
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
      if (data.requires_verification && data.email) {
        showEmailVerifyScreen(data.email);
        showToast('يرجى تأكيد بريدك الإلكتروني أولاً لتفعيل حسابك 📧', true);
        return;
      }
      throw new Error(data.error);
    }

    currentUser = data.user || { name: data.username };
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    showToast('تم تسجيل الدخول بنجاح! مرحباً بك 👋');
    updateSubscriptionUI(currentUser);
    initDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'دخول إلى لوحة التحكم 🚀';
  }
});

// 3. معالجة إنشاء الحساب المباشر للتاجر
if (registerForm) registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('registerError');
  const btn = document.getElementById('registerSubmitBtn');
  errorEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'جاري إنشاء الحساب وتفعيله... ⏳';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        password: form.password.value,
        store_name: form.store_name.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    currentUser = data.user;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    showToast(data.message || '🎉 مرحباً بك! تم إنشاء حساب متجرك وتفعيل التجربة المجانية (7 أيام)');
    updateSubscriptionUI(currentUser);
    initDashboard();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'بدء تجربتي المجانية (7 أيام) 🚀';
  }
});

function openEmergencySupport(identifier = '') {
  const accountIdentifier = identifier.trim() || 'لم أتمكن من إدخال البريد أو اسم المستخدم';
  const message = [
    '🚨 حالة طارئة - أحتاج مساعدة لاستعادة حسابي.',
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

// 4. استعادة كلمة المرور: إرسال OTP
let resetTargetEmail = '';
const sendOtpForm = document.getElementById('sendOtpForm');
const sendOtpMsg = document.getElementById('sendOtpMessage');
const sendOtpBtn = document.getElementById('sendOtpBtn');

if (sendOtpForm) sendOtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetTargetEmail = sendOtpForm.email.value.trim();
  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = 'جاري إرسال الرمز...';
  sendOtpMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetTargetEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    sendOtpMsg.textContent = data.message;
    sendOtpMsg.className = 'text-xs font-black p-2.5 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 block';
    
    // الانتقال للخطوة 2
    document.getElementById('targetEmailLabel').textContent = resetTargetEmail;
    document.getElementById('verifyOtpForm').classList.remove('hidden');
    sendOtpForm.classList.add('hidden');

    if (data.dev_otp) {
      showToast(`🔑 رمز التحقق التجريبي هو: ${data.dev_otp}`);
      document.querySelector('#verifyOtpForm [name="otp"]').value = data.dev_otp;
    }
  } catch (err) {
    sendOtpMsg.textContent = err.message;
    sendOtpMsg.className = 'text-xs font-black p-2.5 rounded-xl border bg-rose-50 text-rose-800 border-rose-200 block';
  } finally {
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = 'إرسال رمز التحقق ✉️';
  }
});

// 5. استعادة كلمة المرور: التحقق من OTP وتعيين كلمة المرور الجديدة
const verifyOtpForm = document.getElementById('verifyOtpForm');
const verifyOtpMsg = document.getElementById('verifyOtpMessage');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');

if (verifyOtpForm) verifyOtpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetPasswordBtn.disabled = true;
  resetPasswordBtn.textContent = 'جاري التحقق والتحديث...';
  verifyOtpMsg.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetTargetEmail,
        otp: verifyOtpForm.otp.value,
        new_password: verifyOtpForm.new_password.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('✅ تم تغيير كلمة المرور بنجاح! سجل دخولك الآن');
    // إعادة تعبئة البريد والعودة لشاشة الدخول
    loginForm.username.value = resetTargetEmail;
    loginForm.password.value = '';
    tabAuthLogin.click();
  } catch (err) {
    verifyOtpMsg.textContent = err.message;
    verifyOtpMsg.className = 'text-xs font-black p-2.5 rounded-xl border bg-rose-50 text-rose-800 border-rose-200 block';
  } finally {
    resetPasswordBtn.disabled = false;
    resetPasswordBtn.textContent = 'تأكيد كلمة المرور الجديدة ✅';
  }
});

// 6. دالة طلب ترقية الاشتراك (تُرسل طلباً للإدارة)
let pendingSubscriptionWhatsApp = null;

function showSubscriptionContactModal(whatsappUrl, whatsappWindow, message) {
  pendingSubscriptionWhatsApp = { url: whatsappUrl, window: whatsappWindow };
  const messageEl = document.getElementById('subscriptionContactMessage');
  if (messageEl && message) messageEl.textContent = `${message} اضغط «حسناً» للانتقال مباشرة إلى فريق العمل.`;
  document.getElementById('subscriptionContactModal')?.classList.remove('hidden');
}

document.getElementById('subscriptionContactOkBtn')?.addEventListener('click', () => {
  const pending = pendingSubscriptionWhatsApp;
  pendingSubscriptionWhatsApp = null;
  document.getElementById('subscriptionContactModal')?.classList.add('hidden');
  if (!pending) return;

  if (pending.window && !pending.window.closed) {
    pending.window.location.href = pending.url;
  } else {
    window.open(pending.url, '_blank', 'noopener,noreferrer');
  }
});

window.subscribeToPlan = async function(planId) {
  const planName = planId === 'annual' ? 'الاشتراك السنوي' : 'الاشتراك الشهري';
  const whatsappWindow = window.open('about:blank', '_blank');
  try {
    const res = await fetch('/api/subscription/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (data.whatsapp_url) {
      showSubscriptionContactModal(data.whatsapp_url, whatsappWindow, data.message || `تم إرسال طلب ${planName} للإدارة بنجاح!`);
    } else if (whatsappWindow) {
      whatsappWindow.close();
    }
    showToast(`تم إرسال طلب ${planName} للإدارة 📨`);
    const paywall = document.getElementById('paywallModal');
    if (paywall) paywall.classList.add('hidden');
  } catch (err) {
    if (whatsappWindow) whatsappWindow.close();
    showToast(err.message, true);
    alert(err.message);
  }
};

// 7. جلب سجل الاشتراكات
async function loadSubscriptionHistory() {
  const container = document.getElementById('subHistoryContainer');
  if (!container) return;
  try {
    const res = await fetch('/api/subscription/history');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.history || data.history.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-900/50 font-bold py-4 text-center">لا توجد اشتراكات سابقة مسجلة بعد.</p>';
      return;
    }

    container.innerHTML = `
      <table class="w-full text-right text-xs font-bold">
        <thead>
          <tr class="border-b border-slate-200/20 text-slate-900/60">
            <th class="py-2.5 px-3">الخطة</th>
            <th class="py-2.5 px-3">المبلغ</th>
            <th class="py-2.5 px-3">تاريخ البدء</th>
            <th class="py-2.5 px-3">تاريخ الانتهاء</th>
            <th class="py-2.5 px-3">الحالة</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/10">
          ${data.history.map(log => `
            <tr>
              <td class="py-3 px-3 font-black">${log.plan === 'annual' ? '👑 سنوي' : '🗓️ شهري'}</td>
              <td class="py-3 px-3 font-black text-blue-600">${Number(log.amount).toLocaleString('ar-DZ')} دج</td>
              <td class="py-3 px-3 text-slate-900/70">${new Date(log.starts_at).toLocaleDateString('ar-DZ')}</td>
              <td class="py-3 px-3 text-slate-900/70">${new Date(log.ends_at).toLocaleDateString('ar-DZ')}</td>
              <td class="py-3 px-3"><span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">مكتمل</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
  }
}

// أزرار شريط الترقية والاشتراكات
document.addEventListener('DOMContentLoaded', () => {
  const bannerBtn = document.getElementById('bannerUpgradeBtn');
  const pillBtn = document.getElementById('headerSubscriptionPill');
  if (bannerBtn) {
    bannerBtn.addEventListener('click', () => {
      const subTabBtn = document.querySelector('[data-tab="subscription"]');
      if (subTabBtn) subTabBtn.click();
    });
  }
  if (pillBtn) {
    pillBtn.addEventListener('click', () => {
      const subTabBtn = document.querySelector('[data-tab="subscription"]');
      if (subTabBtn) subTabBtn.click();
    });
  }
  const paywallLogout = document.getElementById('paywallLogoutBtn');
  if (paywallLogout) {
    paywallLogout.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      location.reload();
    });
  }

  // ربط أزرار الاشتراك المباشرة
  const subMonthly = document.getElementById('subscribeMonthlyBtn');
  const subAnnual = document.getElementById('subscribeAnnualBtn');
  const payMonthly = document.getElementById('paywallMonthlyBtn');
  const payAnnual = document.getElementById('paywallAnnualBtn');

  if (subMonthly) subMonthly.addEventListener('click', () => subscribeToPlan('monthly'));
  if (subAnnual) subAnnual.addEventListener('click', () => subscribeToPlan('annual'));
  if (payMonthly) payMonthly.addEventListener('click', () => subscribeToPlan('monthly'));
  if (payAnnual) payAnnual.addEventListener('click', () => subscribeToPlan('annual'));
});

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
      } else if (btn.dataset.tab === 'subscription') {
        loadSubscriptionHistory();
      } else if (btn.dataset.tab === 'admin-users') {
        loadAdminUsersList();
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
  if (currentUser && currentUser.role === 'admin') {
    initAdminUsersListeners();
    document.getElementById('downloadBackupBtn')?.classList.remove('hidden');
  }
}

// ========================================================
// 👑 وظائف لوحة المشرف العام لإدارة وتفعيل حسابات المشتركين
// ========================================================
let allAdminUsers = [];

async function loadPendingRequests() {
  const tbody = document.getElementById('pendingRequestsTableBody');
  const badge = document.getElementById('pendingRequestsBadge');
  if (!tbody) return;

  try {
    const res = await fetch('/api/subscription/admin/pending-requests');
    if (!res.ok) return;
    const data = await res.json();
    const requests = data.requests || [];

    if (badge) badge.textContent = requests.length;

    if (requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-4 text-center text-slate-900/50">لا توجد طلبات اشتراك جديدة معلقة حالياً.</td></tr>';
      return;
    }

    tbody.innerHTML = requests.map(r => {
      const planText = r.plan === 'annual' 
        ? '<span class="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-black">👑 سنوي (16,000 دج)</span>' 
        : '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md font-black">🗓️ شهري (1,600 دج)</span>';

      const timeAgo = new Date(r.created_at).toLocaleString('ar-DZ');

      return `
        <tr class="hover:bg-amber-50/50 transition-colors">
          <td class="py-3 px-3 font-black text-slate-900">
            <div>${escapeHtml(r.name || '')}</div>
            <div class="text-[10px] text-slate-900/60 font-bold">${escapeHtml(r.store_name || 'متجر')}</div>
          </td>
          <td class="py-3 px-3 font-bold text-slate-900/80 dir-ltr">${escapeHtml(r.email || '')}</td>
          <td class="py-3 px-3">${planText}</td>
          <td class="py-3 px-3 text-slate-900/70 text-[11px]">${timeAgo}</td>
          <td class="py-3 px-3 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button type="button" data-req-action="approve" data-req-id="${r.id}" data-user-name="${escapeHtml(r.name || '')}" data-plan="${r.plan}" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer">
                ✅ قبول وتفعيل
              </button>
              <button type="button" data-req-action="reject" data-req-id="${r.id}" data-user-name="${escapeHtml(r.name || '')}" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer">
                ❌ رفض
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (!tbody.dataset.listenerAttached) {
      tbody.dataset.listenerAttached = 'true';
      tbody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-req-action]');
        if (!btn) return;
        const action = btn.dataset.reqAction;
        const reqId = parseInt(btn.dataset.reqId, 10);
        const userName = btn.dataset.userName || '';
        const plan = btn.dataset.plan;

        if (action === 'approve') {
          if (!confirm(`هل أنت متأكد من الموافقة على طلب (${userName}) وتفعيل ${plan === 'annual' ? 'الاشتراك السنوي' : 'الاشتراك الشهري'}؟`)) return;
          try {
            const resp = await fetch('/api/subscription/admin/approve-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ request_id: reqId }),
            });
            const d = await resp.json();
            if (!resp.ok) throw new Error(d.error);
            showToast(d.message || 'تم قبول وتفعيل الاشتراك بنجاح ✅');
            loadPendingRequests();
            loadAdminUsersList();
          } catch (err) {
            showToast(err.message, true);
          }
        } else if (action === 'reject') {
          if (!confirm(`هل أنت متأكد من رفض طلب الاشتراك للتاجر (${userName})؟`)) return;
          try {
            const resp = await fetch('/api/subscription/admin/reject-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ request_id: reqId }),
            });
            const d = await resp.json();
            if (!resp.ok) throw new Error(d.error);
            showToast(d.message || 'تم رفض الطلب.');
            loadPendingRequests();
          } catch (err) {
            showToast(err.message, true);
          }
        }
      });
    }
  } catch (err) {
    console.error('loadPendingRequests error:', err);
  }
}

async function loadAdminUsersList() {
  loadPendingRequests();
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-900/50 font-bold">جاري تحميل بيانات المشتركين... ⏳</td></tr>';

  try {
    const res = await fetch('/api/subscription/admin/users');
    if (!res.ok) {
      const err = await res.json();
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-700 font-black">${err.error || 'فشل جلب البيانات'}</td></tr>`;
      return;
    }

    const data = await res.json();
    allAdminUsers = data.users || [];
    renderAdminUsers(allAdminUsers);
    updateAdminUsersStats(allAdminUsers);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-rose-700 font-black">خطأ في الاتصال بالسيرفر</td></tr>`;
  }
}

function updateAdminUsersStats(users) {
  const total = users.length;
  const activeSubs = users.filter(u => u.subscription_plan !== 'trial' && !u.is_expired).length;
  const activeTrials = users.filter(u => u.subscription_plan === 'trial' && !u.is_expired).length;
  const expired = users.filter(u => u.is_expired).length;

  const elTotal = document.getElementById('statsTotalUsers');
  const elActive = document.getElementById('statsActiveSubs');
  const elTrials = document.getElementById('statsActiveTrials');
  const elExp = document.getElementById('statsExpiredUsers');

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = activeSubs;
  if (elTrials) elTrials.textContent = activeTrials;
  if (elExp) elExp.textContent = expired;
}

function renderAdminUsers(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-900/50 font-bold">لا يوجد أي مشترك مطابق للبحث.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isTrial = u.subscription_plan === 'trial';
    const isExpired = u.is_expired;
    const planBadge = u.subscription_plan === 'annual' 
      ? '<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black">👑 سنوي</span>'
      : (u.subscription_plan === 'monthly'
        ? '<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black">🗓️ شهري</span>'
        : '<span class="px-2.5 py-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 text-[11px] font-black">⏳ تجريبي (7 أيام)</span>');

    const statusBadge = isExpired
      ? '<span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[11px] font-black">❌ منتهي (مشاهدة فقط)</span>'
      : (u.subscription_status === 'suspended'
        ? '<span class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-900 border border-slate-400 text-[11px] font-black">⛔ موقوف</span>'
        : `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black">🟢 نشط (${u.days_left} يوم)</span>`);

    const expiryDateStr = isTrial ? u.trial_ends_at : u.subscription_ends_at;
    const expiryDisplay = expiryDateStr ? new Date(expiryDateStr).toLocaleDateString('ar-DZ') : '-';

    return `
      <tr class="hover:bg-slate-50/30 transition-colors">
        <td class="py-3.5 px-4">
          <div class="font-black text-slate-900 text-sm">${escapeHtml(u.name || '')}</div>
          <div class="text-[11px] text-slate-900/60 font-bold">${escapeHtml(u.store_name || 'بدون اسم متجر')} ${u.role === 'admin' ? '⭐ <b class="text-purple-700">مدير عام</b>' : ''}</div>
        </td>
        <td class="py-3.5 px-4 font-bold text-slate-900/80">${escapeHtml(u.email || '')}</td>
        <td class="py-3.5 px-4">${planBadge}</td>
        <td class="py-3.5 px-4">${statusBadge}</td>
        <td class="py-3.5 px-4 text-slate-900/70 text-xs">${expiryDisplay}</td>
        <td class="py-3.5 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5 flex-wrap">
            <button type="button" data-admin-action="activate-monthly" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-xs transition-all cursor-pointer" title="تفعيل اشتراك شهري (30 يوماً من اليوم)">
              ⚡ تفعيل شهري
            </button>
            <button type="button" data-admin-action="activate-annual" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black shadow-xs transition-all cursor-pointer" title="تفعيل اشتراك سنوي (365 يوماً من اليوم)">
              👑 تفعيل سنوي
            </button>
            <button type="button" data-admin-action="extend-days" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black shadow-xs transition-all cursor-pointer" title="تمديد أيام مخصصة">
              ➕ تمديد أيام
            </button>
            ${u.subscription_status === 'suspended' ? `
              <button type="button" data-admin-action="toggle-active" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black shadow-xs cursor-pointer">
                ▶️ تشغيل
              </button>
            ` : `
              <button type="button" data-admin-action="toggle-suspend" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black shadow-xs cursor-pointer" title="إيقاف مؤقت للحساب">
                ⛔ إيقاف
              </button>
            `}
            ${u.role !== 'admin' ? `
              <button type="button" data-admin-action="delete-user" data-user-id="${u.id}" data-user-name="${escapeHtml(u.name || '')}" class="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-black shadow-xs cursor-pointer" title="حذف الحساب">
                🗑️
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initAdminUsersListeners() {
  const searchInput = document.getElementById('adminUsersSearchInput');
  const filterSelect = document.getElementById('adminUsersFilterSelect');
  const tbody = document.getElementById('adminUsersTableBody');

  function applyFilters() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    const filter = filterSelect?.value || 'all';

    let filtered = allAdminUsers.filter(u => {
      const matchText = (u.name + ' ' + u.email + ' ' + (u.store_name || '')).toLowerCase();
      if (q && !matchText.includes(q)) return false;

      if (filter === 'active') return !u.is_expired && u.subscription_status === 'active';
      if (filter === 'trial') return u.subscription_plan === 'trial' && !u.is_expired;
      if (filter === 'expired') return u.is_expired;
      return true;
    });

    renderAdminUsers(filtered);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (filterSelect) filterSelect.addEventListener('change', applyFilters);

  if (tbody && !tbody.dataset.listenerAttached) {
    tbody.dataset.listenerAttached = 'true';
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-admin-action]');
      if (!btn) return;
      const action = btn.dataset.adminAction;
      const userId = parseInt(btn.dataset.userId, 10);
      const userName = btn.dataset.userName || '';

      if (action === 'activate-monthly') {
        if (!confirm(`هل أنت متأكد من تفعيل الاشتراك الشهري (30 يوماً ابتداءً من اليوم) لحساب (${userName})؟`)) return;
        activateUserByAdmin(userId, 'monthly', 30);
      } else if (action === 'activate-annual') {
        if (!confirm(`هل أنت متأكد من تفعيل الاشتراك السنوي (365 يوماً ابتداءً من اليوم) لحساب (${userName})؟`)) return;
        activateUserByAdmin(userId, 'annual', 365);
      } else if (action === 'extend-days') {
        promptCustomDaysActivation(userId, userName);
      } else if (action === 'toggle-active') {
        toggleUserStatusByAdmin(userId, 'active');
      } else if (action === 'toggle-suspend') {
        if (!confirm(`هل أنت متأكد من إيقاف حساب (${userName}) مؤقتاً؟`)) return;
        toggleUserStatusByAdmin(userId, 'suspended');
      } else if (action === 'delete-user') {
        deleteUserByAdmin(userId, userName);
      }
    });
  }
}

// دوال التحكم
window.activateUserByAdmin = async function(userId, plan, days) {
  try {
    const res = await fetch('/api/subscription/admin/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, plan, days }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message || 'تم تفعيل الحساب بنجاح!');
    loadAdminUsersList();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.promptCustomDaysActivation = function(userId, userName) {
  const input = prompt(`كم يوماً تريد ضبط وتفعيل حساب (${userName}) من تاريخ اليوم؟\n(مثال: 7 أو 30 أو 90 أو 365)`, '30');
  if (!input) return;
  const days = parseInt(input, 10);
  if (isNaN(days) || days <= 0) {
    alert('يرجى إدخال عدد أيام صحيح أكبر من الصفر.');
    return;
  }
  const plan = days >= 365 ? 'annual' : 'monthly';
  activateUserByAdmin(userId, plan, days);
};

window.toggleUserStatusByAdmin = async function(userId, status) {
  try {
    const res = await fetch('/api/subscription/admin/toggle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message || 'تم تحديث الحالة بنجاح');
    loadAdminUsersList();
  } catch (err) {
    showToast(err.message, true);
  }
};

window.deleteUserByAdmin = async function(userId, userName) {
  if (!confirm(`⚠️ تحذير: هل أنت متأكد تماماً من حذف حساب (${userName}) وجميع بياناته نهائياً؟`)) return;
  try {
    const res = await fetch('/api/subscription/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(data.message || 'تم حذف الحساب بنجاح');
    loadAdminUsersList();
  } catch (err) {
    showToast(err.message, true);
  }
};

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
    showToast('تم حفظ روابط التواصل الاجتماعي ✅');
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
    <div class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 mb-2 border border-slate-200/10">
      <span class="font-bold text-sm">${escapeHtml(cat.name)}</span>
      <div class="flex gap-2">
        <button class="add-sub-btn text-xs bg-blue-600 text-white w-6 h-6 rounded-full font-black" title="إضافة تصنيف فرعي">+</button>
        <button class="edit-cat-btn text-xs text-slate-900/70 hover:text-slate-900 font-bold px-1" title="تعديل التصنيف">✏️</button>
        <button class="del-cat-btn text-xs text-blue-500 font-extrabold px-1" title="حذف التصنيف">🗑️</button>
      </div>
    </div>
    <div class="children pr-4 space-y-2"></div>
  `;
  wrap.querySelector('.add-sub-btn').addEventListener('click', () => openCategoryModal(cat.id, cat.name));
  wrap.querySelector('.edit-cat-btn').addEventListener('click', () => openCategoryModal(null, null, cat.id, cat.name));
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

function openCategoryModal(parentId = null, parentName = null, editId = null, currentName = null) {
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
  
  document.getElementById('categoryFormError').classList.add('hidden');
  document.getElementById('categoryModal').classList.remove('hidden');
}

document.getElementById('addRootCategoryBtn')?.addEventListener('click', () => openCategoryModal(null));
document.getElementById('closeCategoryModal')?.addEventListener('click', () => document.getElementById('categoryModal').classList.add('hidden'));

document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('categoryFormError');
  errorEl.classList.add('hidden');
  try {
    const url = CATEGORY_MODAL_EDIT_ID ? `/api/categories/${CATEGORY_MODAL_EDIT_ID}` : '/api/categories';
    const method = CATEGORY_MODAL_EDIT_ID ? 'PUT' : 'POST';
    const bodyData = CATEGORY_MODAL_EDIT_ID 
      ? { name: form.name.value } 
      : { name: form.name.value, parent_id: CATEGORY_MODAL_PARENT };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('categoryModal').classList.add('hidden');
    showToast(CATEGORY_MODAL_EDIT_ID ? 'تم تعديل التصنيف بنجاح ✅' : 'تمت إضافة التصنيف بنجاح ✅');
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
    tr.className = 'border-t border-slate-200/10';
    const packQuantity = Number(p.pack_quantity) || 1;
    const unitLabel = packQuantity > 1 ? 'عبوة' : 'حبة';
    tr.innerHTML = `
      <td class="p-3"><img src="${p.image || '/img/placeholder.svg'}" class="w-10 h-10 object-cover rounded-lg bg-slate-50 border border-slate-200/10" /></td>
      <td class="p-3">
        <span class="font-bold block">${escapeHtml(p.name)}</span>
        <span class="text-[10px] text-slate-900/60 font-bold">${unitLabel} (${packQuantity} قطعة) — القطعة: ${money(Math.round(p.price / packQuantity))}</span>
      </td>
      <td class="p-3 font-black">${money(p.price)}</td>
      <td class="p-3 font-bold">${p.stock} ${unitLabel}${p.has_variants ? ' <span class="text-[10px] bg-yellow-500/20 text-yellow-600 border border-gold/40 rounded-full px-2 py-0.5 font-bold">مقاسات</span>' : ''}</td>
      <td class="p-3">${p.is_active ? '<span class="text-blue-600 font-bold">مفعّل</span>' : '<span class="text-slate-900/40">معطّل</span>'}</td>
      <td class="p-3 flex gap-2">
        <button class="edit-btn text-blue-600 font-extrabold">تعديل</button>
        <button class="del-btn text-blue-500 font-extrabold">حذف</button>
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
        <input class="cb-color-picker w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5" type="color" value="${colorCode || '#17241F'}" title="اختر رمز اللون للعرض بالمتجر" />
        <input class="cb-color-name field px-3 py-1.5 text-xs font-bold flex-1" placeholder="اسم اللون (مثال: أصفر، أسود، أحمر)" value="${escapeHtml(colorName)}" />
      </div>
      <div class="flex items-center gap-2">
        <label class="btn-outline px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1">
          📷 <span>صورة هذا اللون</span>
          <input type="file" accept="image/*" class="cb-image-file hidden" />
        </label>
        <div class="cb-image-preview w-8 h-8 rounded-lg border border-slate-200/30 bg-white overflow-hidden flex items-center justify-center text-[10px] text-slate-900/40">
          ${imagePath ? `<img src="${imagePath}" class="w-full h-full object-cover" />` : 'لا صورة'}
        </div>
        <button type="button" class="cb-remove-btn text-blue-500 hover:bg-blue-500/10 w-7 h-7 rounded-lg font-black text-sm flex items-center justify-center" title="حذف هذا اللون">&times;</button>
      </div>
    </div>

    <!-- جدول مقاسات هذا اللون -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-extrabold text-slate-900/70">المقاسات المتوفرة لهذا اللون:</span>
        <div class="flex gap-2">
          <button type="button" class="cb-quick-sizes text-[10px] text-blue-600 font-bold hover:underline">+ مقاسات شائعة (S, M, L, XL)</button>
          <button type="button" class="cb-add-size-btn text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">+ مقاس</button>
        </div>
      </div>
      <div class="cb-sizes-list space-y-1.5"></div>
    </div>
  `;

  // معاينة الصورة عند اختيار ملف
  const fileInput = block.querySelector('.cb-image-file');
  const previewDiv = block.querySelector('.cb-image-preview');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      previewDiv.innerHTML = `<img src="${url}" class="w-full h-full object-cover" />`;
    }
  });

  // إضافة مقاس داخل هذا اللون
  const sizesList = block.querySelector('.cb-sizes-list');
  function addSizeRow(sizeLabel = '', qty = '', cost = '') {
    const sRow = document.createElement('div');
    sRow.className = 'cb-size-row grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center';
    sRow.innerHTML = `
      <input class="cb-s-label field px-2 py-1 text-xs" placeholder="المقاس (مثال: M)" value="${escapeHtml(sizeLabel)}" />
      <input class="cb-s-qty field px-2 py-1 text-xs" type="number" min="0" placeholder="الكمية بالمخزون" value="${qty}" />
      <input class="cb-s-cost field px-2 py-1 text-xs" type="number" step="0.01" min="0" placeholder="سعر الشراء" value="${cost}" />
      <button type="button" class="cb-s-del text-blue-500 font-extrabold text-xs px-1 hover:bg-blue-500/10 rounded">&times;</button>
    `;
    sRow.querySelector('.cb-s-del').addEventListener('click', () => sRow.remove());
    sizesList.appendChild(sRow);
  }

  block.querySelector('.cb-add-size-btn').addEventListener('click', () => addSizeRow('', '', ''));
  block.querySelector('.cb-quick-sizes').addEventListener('click', () => {
    ['S', 'M', 'L', 'XL', 'XXL'].forEach(s => addSizeRow(s, 10, ''));
  });

  block.querySelector('.cb-remove-btn').addEventListener('click', () => {
    if (container.children.length > 1 || confirm('حذف هذا اللون؟')) {
      block.remove();
    }
  });

  // إضافة المقاسات الابتدائية
  if (initialSizes.length) {
    initialSizes.forEach(s => addSizeRow(s.size, s.qty, s.cost));
  } else {
    addSizeRow('M', 10, '');
    addSizeRow('L', 10, '');
  }

  container.appendChild(block);
}

document.getElementById('addColorBlockBtn')?.addEventListener('click', () => {
  addColorBlock('', '#2F6690', '', []);
});

// إضافة صف مقاس بسيط (بدون ألوان)
function addVariantRow(label = '', qty = '', cost = '') {
  const id = `vrow-${VARIANT_ROW_ID++}`;
  const row = document.createElement('div');
  row.className = 'grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center';
  row.dataset.rowId = id;
  row.innerHTML = `
    <input class="v-label field px-2 py-1.5 text-xs" placeholder="المقاس (مثال: 42 أو M)" value="${escapeHtml(label)}" />
    <input class="v-qty field px-2 py-1.5 text-xs" type="number" min="0" placeholder="الكمية" value="${qty}" />
    <input class="v-cost field px-2 py-1.5 text-xs" type="number" step="0.01" min="0" placeholder="سعر الشراء" value="${cost}" />
    <button type="button" class="v-remove text-blue-500 font-extrabold text-xs px-1">حذف</button>
  `;
  row.querySelector('.v-remove').addEventListener('click', () => row.remove());
  document.getElementById('variantRows').appendChild(row);
}
document.getElementById('addVariantRowBtn')?.addEventListener('click', () => addVariantRow());

// فتح نافذة المنتج
function openProductModal(product = null) {
  const form = document.getElementById('productForm');
  form.reset();
  // أعد الـ toggle إلى وضع الجملة الافتراضي عند إضافة منتج جديد
  if (!product && window._applyPackToggleState) window._applyPackToggleState(null);
  document.getElementById('productFormError').classList.add('hidden');
  document.getElementById('productModalTitle').textContent = product ? 'تعديل المنتج' : 'منتج جديد';
  form.id.value = product ? product.id : '';

  const variantTypeWrap = document.getElementById('variantTypeSelectorWrap');
  const editSummary = document.getElementById('stockSummaryEdit');
  const variantsEditPanel = document.getElementById('variantsEditPanel');
  
  document.getElementById('colorBlocksContainer').innerHTML = '';
  document.getElementById('variantRows').innerHTML = '';

  if (product) {
    form.name.value = product.name;
    form.description.value = product.description || '';
    form.price.value = product.price;
    form.pack_quantity.value = product.pack_quantity || 1;
    // اكتشف تلقائياً وضع الجملة/التجزئة
    if (window._applyPackToggleState) window._applyPackToggleState(product.pack_quantity);
    form.compare_price.value = product.compare_price || '';
    form.sku.value = product.sku || '';
    form.category_id.value = product.category_id || '';
    form.is_active.checked = !!product.is_active;

    variantTypeWrap.classList.add('hidden');
    RESTOCK_PRODUCT = product;

    if (product.has_variants) {
      editSummary.classList.add('hidden');
      variantsEditPanel.classList.remove('hidden');
      renderVariantsEditPanel(product);
    } else {
      editSummary.classList.remove('hidden');
      variantsEditPanel.classList.add('hidden');
      document.getElementById('stockSummaryValue').textContent = product.stock;
    }
  } else {
    variantTypeWrap.classList.remove('hidden');
    editSummary.classList.add('hidden');
    variantsEditPanel.classList.add('hidden');
    RESTOCK_PRODUCT = null;
    
    // التعيين الافتراضي لنمط الملابس والأزياء
    const clothingRadio = document.querySelector('input[name="product_type_mode"][value="clothing"]');
    if (clothingRadio) {
      clothingRadio.checked = true;
      setProductTypeMode('clothing');
    }
  }
  document.getElementById('productModal').classList.remove('hidden');
}

document.getElementById('newProductBtn')?.addEventListener('click', () => openProductModal());
document.getElementById('closeProductModal')?.addEventListener('click', () => document.getElementById('productModal').classList.add('hidden'));
const topCloseBtn = document.getElementById('closeProductModalTop');
if (topCloseBtn) topCloseBtn.addEventListener('click', () => document.getElementById('productModal').classList.add('hidden'));

// زر التبديل بين البيع بالجملة والبيع بالحبة (ديطاي)
(function setupRetailToggle() {
  const btn = document.getElementById('setSinglePieceBtn');
  const wrap = document.getElementById('packQuantityWrap');
  const input = document.getElementById('packQuantityInput');
  const label = document.getElementById('packQtyLabel');
  if (!btn || !wrap || !input) return;

  // isRetail = true  → البيع بالحبة (pack_quantity=1, input مخفي)
  // isRetail = false → البيع بالجملة (input ظاهر)
  let isRetail = false;

  function applyRetailState() {
    if (isRetail) {
      // وضع التجزئة: أخفِ الـ input، ضع القيمة 1
      wrap.classList.add('hidden');
      input.removeAttribute('required');
      input.value = 1;
      if (label) label.textContent = 'بيع بالحبة (ديطاي)';
      btn.textContent = '🏷️ البيع بالحبة';
      btn.className = 'text-[11px] font-black px-2 py-0.5 rounded transition-all cursor-pointer border text-rose-700 border-rose-300 bg-rose-50 hover:bg-rose-100';
    } else {
      // وضع الجملة: أظهر الـ input
      wrap.classList.remove('hidden');
      input.setAttribute('required', '');
      if (label) label.textContent = 'عدد القطع بالعبوة';
      btn.textContent = '📦 البيع بالجملة';
      btn.className = 'text-[11px] font-black px-2 py-0.5 rounded transition-all cursor-pointer border text-blue-600 border-blue-600 bg-blue-600/10 hover:bg-blue-600/20';
    }
  }

  // تطبيق الحالة الابتدائية (جملة)
  applyRetailState();

  btn.addEventListener('click', () => {
    isRetail = !isRetail;
    applyRetailState();
    showToast(isRetail ? 'تم التحويل إلى بيع بالحبة (ديطاي) ✅' : 'تم التحويل إلى بيع بالجملة 📦');
  });

  // عند فتح المودال لتعديل منتج موجود، اكشف الحالة تلقائياً
  // null يعني منتج جديد → وضع جملة افتراضي
  window._applyPackToggleState = function(packQty) {
    isRetail = packQty !== null && packQty !== undefined && Number(packQty) === 1;
    applyRetailState();
  };
})();


// عرض وتعديل متغيرات المنتج الموجود (في لوحة التعديل)
function renderVariantsEditPanel(product) {
  const list = document.getElementById('variantsEditList');
  const variants = product.variants || [];
  if (!variants.length) {
    list.innerHTML = '<p class="text-xs text-slate-900/40">لا توجد مواصفات/مقاسات مسجلة بعد.</p>';
    return;
  }

  list.innerHTML = variants.map(v => {
    const colorCircle = v.color_code ? `<span class="w-3.5 h-3.5 rounded-full border border-slate-200/30 inline-block shrink-0" style="background-color:${v.color_code}"></span>` : '';
    const imgThumb = v.image ? `<img src="${v.image}" class="w-8 h-8 object-cover rounded-lg border border-slate-200/20" />` : '';
    const labelText = v.label || [v.color, v.size].filter(Boolean).join(' - ');

    return `
      <div class="flex items-center justify-between bg-white rounded-xl border border-slate-200/15 p-2.5 text-xs shadow-xs">
        <div class="flex items-center gap-2">
          ${imgThumb}
          ${colorCircle}
          <div>
            <span class="font-black text-slate-900">${escapeHtml(labelText)}</span>
            <div class="text-[10px] text-slate-900/50">المخزون: <b class="text-blue-600">${v.stock}</b> | التكلفة: ${money(v.cost_price || 0)}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" class="v-image-btn text-sky-700 hover:bg-sky-50 px-2 py-1 rounded font-black text-xs" data-vid="${v.id}" title="تغيير صورة اللون أو المقاس">تغيير الصورة</button>
          <button type="button" class="v-restock-btn text-blue-600 hover:bg-blue-600/10 px-2 py-1 rounded font-black text-xs" data-vid="${v.id}" data-label="${escapeHtml(labelText)}" data-stock="${v.stock}">+ تزويد</button>
          <button type="button" class="v-delete-btn text-blue-500 hover:bg-blue-500/10 px-2 py-1 rounded font-black text-xs" data-vid="${v.id}" data-label="${escapeHtml(labelText)}" data-stock="${v.stock}">حذف</button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.v-restock-btn').forEach(btn => {
    btn.addEventListener('click', () => openRestockModal(product, { id: btn.dataset.vid, label: btn.dataset.label, stock: btn.dataset.stock }));
  });
  list.querySelectorAll('.v-image-btn').forEach(btn => {
    btn.addEventListener('click', () => changeVariantImage(product, btn.dataset.vid));
  });
  list.querySelectorAll('.v-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteVariant(product.id, btn.dataset.vid, btn.dataset.label, Number(btn.dataset.stock)));
  });
}

async function changeVariantImage(product, variantId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await fetch('/api/products/upload-single', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) throw new Error(uploadData.error || 'تعذر رفع الصورة');

      const res = await fetch(`/api/products/${product.id}/variants/${variantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadData.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر تغيير الصورة');

      RESTOCK_PRODUCT = data;
      renderVariantsEditPanel(data);
      loadProducts();
      showToast('تم تغيير صورة المتغير بنجاح ✅');
    } catch (err) {
      showToast(err.message || 'تعذر تغيير الصورة', true);
    }
  }, { once: true });
  input.click();
}

// إضافة متغير جديد لمنتج موجود
document.getElementById('addNewVariantBtn').addEventListener('click', async () => {
  if (!RESTOCK_PRODUCT) return;
  const color = document.getElementById('newVariantColor').value.trim();
  const color_code = document.getElementById('newVariantColorCode').value;
  const size = document.getElementById('newVariantSize').value.trim();
  const label = document.getElementById('newVariantLabel').value.trim() || [color, size].filter(Boolean).join(' - ');
  const qty = document.getElementById('newVariantQty').value || 0;
  const cost = document.getElementById('newVariantCost').value || 0;
  const imageFileInput = document.getElementById('newVariantImageFile');

  if (!label && !color && !size) {
    showToast('اكتب اسم اللون أو المقاس أولاً', true);
    return;
  }

  let imageUrl = '';
  if (imageFileInput.files && imageFileInput.files[0]) {
    const fd = new FormData();
    fd.append('image', imageFileInput.files[0]);
    const upRes = await fetch('/api/products/upload-single', { method: 'POST', body: fd });
    const upData = await upRes.json();
    if (upRes.ok && upData.url) imageUrl = upData.url;
  }

  const res = await fetch(`/api/products/${RESTOCK_PRODUCT.id}/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label, color, color_code, size, image: imageUrl, qty, cost_price: cost }),
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.error || 'تعذر الإضافة', true); return; }
  
  showToast('تمت إضافة المتغير بنجاح ✅');
  document.getElementById('newVariantColor').value = '';
  document.getElementById('newVariantSize').value = '';
  document.getElementById('newVariantLabel').value = '';
  document.getElementById('newVariantQty').value = '';
  document.getElementById('newVariantCost').value = '';
  imageFileInput.value = '';

  RESTOCK_PRODUCT = data;
  renderVariantsEditPanel(data);
  loadProducts();
});

// حفظ نموذج المنتج (إنشاء جديد أو تعديل)
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('productFormError');
  errorEl.classList.add('hidden');
  const submitBtn = document.getElementById('saveProductSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جارٍ الحفظ...';

  const id = form.id.value;
  const fd = new FormData(form);
  fd.set('is_active', form.is_active.checked ? 'true' : 'false');

  try {
    if (!id) {
      const mode = (document.querySelector('input[name="product_type_mode"]:checked') || {}).value || 'clothing';
      
      if (mode === 'clothing') {
        const colorBlocks = Array.from(document.querySelectorAll('#colorBlocksContainer .color-block'));
        if (!colorBlocks.length) {
          throw new Error('أضف لونًا واحدًا على الأقل للملابس والأزياء');
        }

        const variants = [];
        for (const block of colorBlocks) {
          const colorName = block.querySelector('.cb-color-name').value.trim();
          const colorCode = block.querySelector('.cb-color-picker').value;
          const fileInput = block.querySelector('.cb-image-file');

          if (!colorName) {
            throw new Error('يرجى كتابة اسم لكل لون مضاف');
          }

          let colorImageUrl = '';
          if (fileInput.files && fileInput.files[0]) {
            const upFd = new FormData();
            upFd.append('image', fileInput.files[0]);
            const upRes = await fetch('/api/products/upload-single', { method: 'POST', body: upFd });
            const upData = await upRes.json();
            if (upRes.ok && upData.url) colorImageUrl = upData.url;
          }

          const sizeRows = Array.from(block.querySelectorAll('.cb-size-row'));
          if (!sizeRows.length) {
            variants.push({
              label: colorName,
              color: colorName,
              color_code: colorCode,
              size: '',
              image: colorImageUrl,
              stock: 0,
              cost_price: 0,
            });
          } else {
            for (const sRow of sizeRows) {
              const sizeLabel = sRow.querySelector('.cb-s-label').value.trim();
              const sQty = sRow.querySelector('.cb-s-qty').value || 0;
              const sCost = sRow.querySelector('.cb-s-cost').value || 0;
              variants.push({
                label: sizeLabel ? `${colorName} - ${sizeLabel}` : colorName,
                color: colorName,
                color_code: colorCode,
                size: sizeLabel,
                image: colorImageUrl,
                stock: sQty,
                cost_price: sCost,
              });
            }
          }
        }

        fd.set('variants', JSON.stringify(variants));
        fd.delete('stock');
        fd.delete('cost_price');

      } else if (mode === 'sizes_only') {
        const rows = Array.from(document.querySelectorAll('#variantRows > div'));
        const variants = rows.map(row => ({
          label: row.querySelector('.v-label').value.trim(),
          stock: row.querySelector('.v-qty').value || 0,
          cost_price: row.querySelector('.v-cost').value || 0,
        })).filter(v => v.label);

        if (!variants.length) {
          throw new Error('أضف مقاسًا واحدًا على الأقل أو اختر منتج بسيط');
        }
        fd.set('variants', JSON.stringify(variants));
        fd.delete('stock');
        fd.delete('cost_price');
      }
    }

    const res = await fetch(id ? `/api/products/${id}` : '/api/products', {
      method: id ? 'PUT' : 'POST',
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'تعذر حفظ المنتج');

    document.getElementById('productModal').classList.add('hidden');
    showToast('تم حفظ المنتج بنجاح ✅');
    loadProducts();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'حفظ المنتج';
  }
});

async function deleteVariant(productId, variantId, label, stock) {
  if (stock > 0) {
    showToast(`زوّد "${label}" إلى صفر أولًا قبل حذفه`, true);
    return;
  }
  if (!confirm(`حذف المتغير "${label}" نهائيًا؟`)) return;
  const res = await fetch(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) { showToast(data.error || 'تعذر الحذف', true); return; }
  showToast('تم حذف المتغير');
  RESTOCK_PRODUCT = data;
  renderVariantsEditPanel(data);
  loadProducts();
}

function openRestockModal(product, variant = null) {
  RESTOCK_PRODUCT = product;
  RESTOCK_VARIANT = variant;
  document.getElementById('restockForm').reset();
  document.getElementById('restockFormError').classList.add('hidden');
  document.getElementById('restockProductName').textContent = variant
    ? `${product.name} — ${variant.label} — المخزون الحالي: ${variant.stock} قطعة`
    : `${product.name} — المخزون الحالي: ${product.stock} قطعة`;
  document.getElementById('restockModal').classList.remove('hidden');
}
document.getElementById('openRestockBtn').addEventListener('click', () => {
  if (!RESTOCK_PRODUCT) return;
  openRestockModal(RESTOCK_PRODUCT, null);
});
document.getElementById('closeRestockModal').addEventListener('click', () => document.getElementById('restockModal').classList.add('hidden'));

document.getElementById('restockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!RESTOCK_PRODUCT) return;
  const form = e.target;
  const errorEl = document.getElementById('restockFormError');
  errorEl.classList.add('hidden');
  const url = RESTOCK_VARIANT
    ? `/api/products/${RESTOCK_PRODUCT.id}/variants/${RESTOCK_VARIANT.id}/restock`
    : `/api/products/${RESTOCK_PRODUCT.id}/restock`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty: form.qty.value, cost_price: form.cost_price.value }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    document.getElementById('restockModal').classList.add('hidden');
    if (RESTOCK_VARIANT) {
      RESTOCK_PRODUCT = data;
      renderVariantsEditPanel(data);
      showToast('تم تزويد المخزون بنجاح ✅');
    } else {
      document.getElementById('productModal').classList.add('hidden');
      showToast(`تم تزويد المخزون ✅ الكمية الآن: ${data.stock}`);
    }
    loadProducts();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
  }
});

async function deleteProduct(id, name) {
  if (!confirm(`حذف المنتج "${name}"؟`)) return;
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  if (res.ok) { showToast('تم الحذف'); loadProducts(); }
  else showToast('تعذر الحذف', true);
}

// ---------- حاسبة التسعير والإعلانات ----------
let CALC_FIXED_ROW_ID = 0;

async function initCalculator() {
  // تعبئة قائمة المنتجات لاختيار سعر منتج موجود تلقائيًا
  const res = await fetch('/api/products/admin/all');
  const products = await res.json();
  const select = document.getElementById('calcProductSelect');
  select.innerHTML =
    '<option value="">— إدخال يدوي —</option>' +
    products.map((p) => `<option value="${p.id}" data-cost="${p.cost_price || 0}" data-price="${p.price}">${escapeHtml(p.name)}</option>`).join('');

  select.addEventListener('change', () => {
    const opt = select.options[select.selectedIndex];
    if (opt.value) {
      document.getElementById('calcCost').value = opt.dataset.cost;
      document.getElementById('calcPrice').value = opt.dataset.price;
      recomputeCalculator();
    }
  });

  // أي تغيير في أي حقل يُعيد الحساب فورًا (حاسبة حية)
  ['calcCost', 'calcPrice', 'calcShipping', 'calcPackaging', 'calcMisc', 'calcAdCost'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', recomputeCalculator);
  });

  // حساب كلفة الإعلان تلقائياً إذا أدخل المستخدم إجمالي الميزانية وعدد المشترين
  const handleAutoAdCost = () => {
    const budget = parseFloat(document.getElementById('calcTotalAdBudget')?.value) || 0;
    const buyers = parseFloat(document.getElementById('calcTotalBuyers')?.value) || 0;
    if (budget > 0 && buyers > 0) {
      const computedCpa = (budget / buyers).toFixed(2);
      document.getElementById('calcAdCost').value = computedCpa;
      recomputeCalculator();
    }
  };
  document.getElementById('calcTotalAdBudget')?.addEventListener('input', handleAutoAdCost);
  document.getElementById('calcTotalBuyers')?.addEventListener('input', handleAutoAdCost);

  // زر جلب البيانات الحقيقية من الإعلانات إلى الحاسبة
  document.getElementById('syncRealAdDataToCalcBtn')?.addEventListener('click', syncRealAdDataToCalculator);

  // إضافة بنود الثوابت
  document.getElementById('calcAddFixedRow')?.addEventListener('click', () => addCalcFixedRow());
  addCalcFixedRow('مصاريف إعلانات', 20000);
  addCalcFixedRow('مصاريف أخرى', 5000);

  // زر حفظ الحسبة
  document.getElementById('saveCalcBtn')?.addEventListener('click', saveCurrentCalculation);

  const calcsTbody = document.getElementById('savedCalcsTbody');
  if (calcsTbody && !calcsTbody.dataset.listenerAttached) {
    calcsTbody.dataset.listenerAttached = 'true';
    calcsTbody.addEventListener('click', (e) => {
      const loadBtn = e.target.closest('.btn-load-calc');
      if (loadBtn) {
        const id = loadBtn.dataset.calcId;
        loadSavedCalculation(id);
        return;
      }
      const delBtn = e.target.closest('.btn-delete-calc');
      if (delBtn) {
        const id = delBtn.dataset.calcId;
        deleteSavedCalculation(id);
        return;
      }
    });
  }

  renderSavedCalculations();
  recomputeCalculator();
}

// جلب وتعبئة بيانات الإعلانات الحقيقية تلقائياً داخل الحاسبة
async function syncRealAdDataToCalculator() {
  const btn = document.getElementById('syncRealAdDataToCalcBtn');
  const syncStatus = document.getElementById('calcSyncStatus');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'جاري المزامنة... ⏳';
  }

  try {
    const res = await fetch('/api/campaigns/analytics');
    if (!res.ok) throw new Error('تعذر جلب بيانات الحملات الإعلانية');
    const { summary, campaigns } = await res.json();

    if (!summary || (summary.total_ad_spend === 0 && summary.total_registered_orders === 0)) {
      showToast('لا توجد بيانات إعلانية مسجلة حتى الآن. يمكنك إدخال الأرقام يدوياً للتجربة.', true);
      if (syncStatus) {
        syncStatus.textContent = '⚠️ لا توجد مصاريف إعلانات مسجلة بعد — يمكنك الإدخال يدوياً للحساب الأولي';
        syncStatus.className = 'text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 block font-bold';
      }
      return;
    }

    // تعبئة الميزانية وعدد المشترين والـ CPA الحقيقي
    const totalSpend = summary.total_ad_spend || 0;
    const deliveredOrders = summary.total_delivered_orders || 0;
    const registeredOrders = summary.total_registered_orders || 0;

    const budgetInput = document.getElementById('calcTotalAdBudget');
    const buyersInput = document.getElementById('calcTotalBuyers');
    const adCostInput = document.getElementById('calcAdCost');

    if (budgetInput) budgetInput.value = totalSpend;
    if (buyersInput) buyersInput.value = deliveredOrders > 0 ? deliveredOrders : (registeredOrders || 1);

    // CPA الحقيقي المحسوب
    const realCpa = summary.overall_real_cpa || (deliveredOrders > 0 ? (totalSpend / deliveredOrders) : (registeredOrders > 0 ? totalSpend / registeredOrders : 0));
    if (adCostInput) adCostInput.value = Math.round(realCpa);

    recomputeCalculator();

    if (syncStatus) {
      syncStatus.innerHTML = `✅ <b>تمت المزامنة بنجاح:</b> تم جلب إجمالي الصرف (<b>${money(totalSpend)}</b>) والمبيعات (<b>${deliveredOrders || registeredOrders}</b> طلب) — Real CPA = <b>${money(realCpa)}</b> | Real ROAS = <b>${summary.overall_real_roas.toFixed(2)}×</b>`;
      syncStatus.className = 'text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-300 block font-bold';
    }

    showToast('تم جلب متوسطات CPA والأداء الإعلاني لمتجرك بنجاح ⚡');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ جلب أرقام CPA الحقيقية من إعلاناتي';
    }
  }
}

// حفظ واسترجاع الحسبات الدراسية من localStorage بشكل نظيف
function getStorageKey() {
  return currentUser && currentUser.id ? `saved_pricing_calcs_${currentUser.id}` : 'saved_pricing_calcs';
}

function getSavedCalculations() {
  const key = getStorageKey();
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    // إذا كان مفتاحاً قديماً موجوداً
    const legacyRaw = localStorage.getItem('saved_pricing_calcs');
    if (legacyRaw !== null) {
      const parsed = JSON.parse(legacyRaw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}

  // في المرة الأولى تماماً فقط
  return [];
}

function saveCurrentCalculation() {
  const titleInput = document.getElementById('calcSaveTitle');
  const title = titleInput.value.trim() || `حسبة منتج (${new Date().toLocaleDateString('ar-DZ')})`;

  const calcData = {
    id: Date.now(),
    title,
    cost: parseFloat(document.getElementById('calcCost').value) || 0,
    price: parseFloat(document.getElementById('calcPrice').value) || 0,
    shipping: parseFloat(document.getElementById('calcShipping').value) || 0,
    packaging: parseFloat(document.getElementById('calcPackaging').value) || 0,
    misc: parseFloat(document.getElementById('calcMisc').value) || 0,
    adCost: parseFloat(document.getElementById('calcAdCost').value) || 0,
    totalAdBudget: document.getElementById('calcTotalAdBudget')?.value || '',
    totalBuyers: document.getElementById('calcTotalBuyers')?.value || '',
    createdAt: new Date().toLocaleDateString('ar-DZ')
  };

  const key = getStorageKey();
  const saved = getSavedCalculations();
  saved.unshift(calcData);
  localStorage.setItem(key, JSON.stringify(saved));
  localStorage.removeItem('saved_pricing_calcs');
  titleInput.value = '';
  showToast(`تم حفظ حسبة "${title}" بنجاح 💾`);
  renderSavedCalculations();
}

function loadSavedCalculation(id) {
  const saved = getSavedCalculations();
  const item = saved.find(c => String(c.id) === String(id));
  if (!item) {
    showToast('لم يتم العثور على دراسة الجدوى ⚠️', true);
    return;
  }

  const setVal = (elemId, val) => {
    const el = document.getElementById(elemId);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };

  setVal('calcCost', item.cost);
  setVal('calcPrice', item.price);
  setVal('calcShipping', item.shipping);
  setVal('calcPackaging', item.packaging);
  setVal('calcMisc', item.misc);
  setVal('calcAdCost', item.adCost);
  setVal('calcTotalAdBudget', item.totalAdBudget || '');
  setVal('calcTotalBuyers', item.totalBuyers || '');
  setVal('calcSaveTitle', item.title);

  recomputeCalculator();
  showToast(`تم استرجاع وتحميل "${item.title}" بنجاح 📂`);

  // تمرير سلس نحو حقول الحاسبة لمشاهدة الأرقام المحمّلة
  const costInput = document.getElementById('calcCost');
  if (costInput) costInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteSavedCalculation(id) {
  const key = getStorageKey();
  let saved = getSavedCalculations();
  const target = saved.find(c => String(c.id) === String(id));
  const title = target ? target.title : 'هذه الحسبة';
  if (!confirm(`هل أنت متأكد من حذف (${title})؟`)) return;

  saved = saved.filter(c => String(c.id) !== String(id));
  localStorage.setItem(key, JSON.stringify(saved));
  localStorage.removeItem('saved_pricing_calcs');
  renderSavedCalculations();
  showToast('تم حذف دراسة الجدوى بنجاح 🗑️');
}

// إتاحة الدوال على window لضمان عمل أزرار onclick في الجدول
window.loadSavedCalculation = loadSavedCalculation;
window.deleteSavedCalculation = deleteSavedCalculation;
window.saveCurrentCalculation = saveCurrentCalculation;

function renderSavedCalculations() {
  const tbody = document.getElementById('savedCalcsTbody');
  if (!tbody) return;

  const saved = getSavedCalculations();
  if (!saved.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-900/40 font-bold">لا توجد حسبات محفوظة بعد</td></tr>';
    return;
  }

  tbody.innerHTML = saved.map(item => {
    const unitCost = Number(item.cost || 0) + Number(item.shipping || 0) + Number(item.packaging || 0) + Number(item.misc || 0);
    const margin = Number(item.price || 0) - unitCost;
    const netUnit = margin - Number(item.adCost || 0);
    const netColor = netUnit >= 0 ? '#1E6F54' : '#2F6690';

    return `<tr class="border-t border-slate-200/10 hover:bg-slate-50/60 transition-colors">
      <td class="p-2 font-bold">${escapeHtml(item.title)}</td>
      <td class="p-2 text-center font-bold">${money(item.price)}</td>
      <td class="p-2 text-center font-bold text-blue-500">${money(item.adCost)}</td>
      <td class="p-2 text-center font-black" style="color:${netColor}">${money(netUnit)}</td>
      <td class="p-2 text-center space-x-1 space-x-reverse">
        <button type="button" data-calc-id="${item.id}" onclick="window.loadSavedCalculation('${item.id}')" class="btn-load-calc text-blue-600 font-black px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs">
          <span>📂</span> <span>تحميل</span>
        </button>
        <button type="button" data-calc-id="${item.id}" onclick="window.deleteSavedCalculation('${item.id}')" class="btn-delete-calc text-rose-600 font-black px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs">
          <span>🗑️</span> <span>حذف</span>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function addCalcFixedRow(label = '', amount = '') {
  const id = `calc-fixed-${CALC_FIXED_ROW_ID++}`;
  const row = document.createElement('div');
  row.className = 'grid grid-cols-[2fr_1fr_auto] gap-2 items-center';
  row.dataset.rowId = id;
  row.innerHTML = `
    <input class="calc-fixed-label field px-2 py-1.5 text-xs" placeholder="اسم المصروف (مثال: إيجار)" value="${escapeHtml(label)}" />
    <input class="calc-fixed-amount field px-2 py-1.5 text-xs" type="number" min="0" placeholder="المبلغ" value="${amount}" />
    <button type="button" class="calc-remove-row text-blue-500 font-extrabold text-xs px-1">حذف</button>
  `;
  row.querySelector('.calc-remove-row').addEventListener('click', () => { row.remove(); recomputeCalculator(); });
  row.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', recomputeCalculator));
  document.getElementById('calcFixedRows').appendChild(row);
}

function recomputeCalculator() {
  const cost = parseFloat(document.getElementById('calcCost').value) || 0;
  const price = parseFloat(document.getElementById('calcPrice').value) || 0;
  const shipping = parseFloat(document.getElementById('calcShipping').value) || 0;
  const packaging = parseFloat(document.getElementById('calcPackaging').value) || 0;
  const misc = parseFloat(document.getElementById('calcMisc').value) || 0;
  const adCost = parseFloat(document.getElementById('calcAdCost').value) || 0;

  const unitCost = cost + shipping + packaging + misc; // تكلفة الوحدة الكاملة بدون الإعلان
  const margin = price - unitCost; // هامش المساهمة قبل الإعلان (= أقصى ما يمكن دفعه كإعلان)
  const marginPct = price > 0 ? (margin / price) * 100 : 0;
  const netUnit = margin - adCost; // صافي الربح الفعلي بعد خصم تكلفة الإعلان المُدخلة

  document.getElementById('calcUnitCost').textContent = money(unitCost);
  document.getElementById('calcMargin').textContent = money(margin);
  document.getElementById('calcMarginPct').textContent = `${marginPct.toFixed(1)}%`;
  document.getElementById('calcMaxAd').textContent = money(Math.max(margin, 0));
  const netEl = document.getElementById('calcNetUnit');
  netEl.textContent = money(netUnit);
  netEl.style.color = netUnit >= 0 ? '#1E6F54' : '#2F6690';

  // مجموع المصاريف الثابتة الشهرية من كل البنود المضافة
  const totalFixed = Array.from(document.querySelectorAll('.calc-fixed-amount')).reduce(
    (sum, inp) => sum + (parseFloat(inp.value) || 0),
    0
  );
  document.getElementById('calcTotalFixed').textContent = money(totalFixed);

  // نقطة التعادل: تُحسب على هامش المساهمة بعد خصم تكلفة الإعلان الفعلية (الربح الحقيقي للوحدة)
  const breakevenUnits = netUnit > 0 ? Math.ceil(totalFixed / netUnit) : null;
  document.getElementById('calcBreakevenUnits').textContent = breakevenUnits !== null ? `${breakevenUnits} قطعة` : 'غير ممكن ⚠️';
  document.getElementById('calcBreakevenDaily').textContent = breakevenUnits !== null ? `${Math.ceil(breakevenUnits / 30)} قطعة` : '—';

  // بانر الحالة
  const banner = document.getElementById('calcStatusBanner');
  if (margin <= 0) {
    banner.className = 'rounded-2xl border p-4 font-extrabold text-center';
    banner.style.background = '#fdecea';
    banner.style.borderColor = '#2F6690';
    banner.style.color = '#2F6690';
    banner.textContent = '⚠️ سعر البيع لا يغطي حتى تكلفة المنتج والشحن والتغليف — أنت خاسر في كل عملية بيع حتى بدون إعلان!';
  } else if (netUnit <= 0) {
    banner.style.background = '#fff8e6';
    banner.style.borderColor = '#C9A227';
    banner.style.color = '#8a6d00';
    banner.textContent = `⚠️ تكلفة الإعلان الحالية (${money(adCost)}) تتجاوز هامش ربحك — يجب رفع سعر البيع أو تقليل تكلفة الإعلان إلى أقل من ${money(margin)}.`;
  } else {
    banner.style.background = '#e9f5f0';
    banner.style.borderColor = '#1E6F54';
    banner.style.color = '#1E6F54';
    banner.textContent = `✅ المشروع رابح: ${money(netUnit)} صافي ربح لكل قطعة بعد كل التكاليف والإعلان.`;
  }
}

// ========== أداء الإعلانات والأرباح الحقيقية (Campaign ROI Dashboard) ==========

const SOURCE_LABELS = {
  facebook: '🔵 فيسبوك',
  tiktok: '⚫ تيك توك',
  instagram: '📸 انستغرام',
  google: '🔴 جوجل',
  snapchat: '🟡 سناب شات',
  direct: '🌐 مباشر',
  other: '📌 أخرى',
};

function getSourceLabel(src) {
  return SOURCE_LABELS[src] || (src ? `📌 ${src}` : '🌐 مباشر');
}

function filterCampaigns(campaigns) {
  const search = (document.getElementById('campaignSearchInput')?.value || '').trim().toLowerCase();
  const profitFilter = document.getElementById('campaignProfitFilter')?.value || 'all';
  const minRoas = Number(document.getElementById('campaignRoasFilter')?.value);
  return campaigns.filter((campaign) => {
    const matchesSearch = !search || `${campaign.campaign_name} ${campaign.source || ''}`.toLowerCase().includes(search);
    const matchesProfit = profitFilter === 'profit' ? campaign.net_profit > 0 : profitFilter === 'loss' ? campaign.net_profit < 0 : true;
    const matchesRoas = !Number.isFinite(minRoas) || campaign.real_roas >= minRoas;
    return matchesSearch && matchesProfit && matchesRoas;
  });
}

function rerenderCampaignTable() {
  if (window._campaignData) {
    renderCampaignTable(filterCampaigns(window._campaignData));
  }
}

function renderCampaignTable(campaigns) {
  const tbody = document.getElementById('campaignsTbody');
  if (!tbody) return;
  if (!campaigns.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-slate-900/40 font-bold">لا توجد حملات مطابقة للفلاتر الحالية.</td></tr>';
    return;
  }
  tbody.innerHTML = campaigns.map((c) => {
    const netColor = c.net_profit >= 0 ? '#1E6F54' : '#C03B2B';
    const roasColor = c.real_roas >= 1 ? '#1E6F54' : '#C03B2B';
    const delivRate = c.delivery_rate.toFixed(0);
    return `<tr class="border-t border-slate-200/10 hover:bg-slate-50/60 transition-colors">
      <td class="p-3"><span class="font-black text-xs block">${escapeHtml(c.campaign_name)}</span><span class="text-xs text-slate-900/50">${getSourceLabel(c.source)}</span></td>
      <td class="p-3 text-center font-bold">${c.registered_orders}</td><td class="p-3 text-center font-black text-blue-700">${c.delivered_orders}</td>
      <td class="p-3 text-center font-black text-blue-500">${c.cancelled_orders}</td><td class="p-3 text-center font-black">${delivRate}%</td>
      <td class="p-3 text-center font-bold text-blue-500">${money(c.ad_spend)}</td><td class="p-3 text-center font-bold">${c.real_cpa > 0 ? money(c.real_cpa) : '—'}</td>
      <td class="p-3 text-center font-bold text-blue-700">${money(c.delivered_revenue)}</td><td class="p-3 text-center font-bold text-blue-500">- ${money(c.returned_shipping_loss)}</td>
      <td class="p-3 text-center font-black" style="color:${netColor}">${money(c.net_profit)}</td><td class="p-3 text-center font-black" style="color:${roasColor}">${c.real_roas.toFixed(2)}×</td>
    </tr>`;
  }).join('');
}

['campaignSearchInput', 'campaignProfitFilter', 'campaignRoasFilter'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', rerenderCampaignTable);
  document.getElementById(id)?.addEventListener('change', rerenderCampaignTable);
});

async function loadCampaignAnalytics() {
  try {
    const res = await fetch('/api/campaigns/analytics');
    if (!res.ok) throw new Error('تعذر تحميل بيانات الحملات');
    const {
      summary,
      campaigns = [],
      recent_spends = [],
      daily_trends = [],
      status_breakdown = {},
      top_delivered_ad_products = [],
      top_cancelled_ad_products = [],
    } = await res.json();
    window._campaignData = campaigns;

    // بطاقات الملخص
    document.getElementById('cmpTotalSpend').textContent = `- ${money(summary.total_ad_spend)}`;
    document.getElementById('cmpTotalRevenue').textContent = money(summary.total_delivered_revenue);
    const netEl = document.getElementById('cmpTotalNet');
    netEl.textContent = money(summary.total_net_profit);
    netEl.style.color = summary.total_net_profit >= 0 ? '#1E6F54' : '#C03B2B';
    const roasEl = document.getElementById('cmpTotalRoas');
    roasEl.textContent = `${summary.overall_real_roas.toFixed(2)}×`;
    roasEl.style.color = summary.overall_real_roas >= 1 ? '#1E6F54' : '#C03B2B';

    // جدول الحملات
    const tbody = document.getElementById('campaignsTbody');
    if (!campaigns.length) {
      tbody.innerHTML = '<tr><td colspan="11" class="p-8 text-center text-slate-900/40 font-bold">لا توجد بيانات حملات بعد. أضف مصاريف إعلانية أو تأكد من أن روابط إعلاناتك تحتوي utm_campaign.</td></tr>';
    } else {
      renderCampaignTable(filterCampaigns(campaigns));
      /*
      tbody.innerHTML = campaigns.map((c) => {
        const netColor = c.net_profit >= 0 ? '#1E6F54' : '#C03B2B';
        const roasColor = c.real_roas >= 1 ? '#1E6F54' : '#C03B2B';
        const delivRate = c.delivery_rate.toFixed(0);
        const delivRateColor = c.delivery_rate >= 70 ? '#1E6F54' : c.delivery_rate >= 50 ? '#C9A227' : '#C03B2B';
        return `<tr class="border-t border-slate-200/10 hover:bg-slate-50/60 transition-colors">
          <td class="p-3">
            <span class="font-black text-xs block">${escapeHtml(c.campaign_name)}</span>
            <span class="text-xs text-slate-900/50">${getSourceLabel(c.source)}</span>
          </td>
          <td class="p-3 text-center font-bold">${c.registered_orders}</td>
          <td class="p-3 text-center font-black text-blue-700">${c.delivered_orders}</td>
          <td class="p-3 text-center font-black text-blue-500">${c.cancelled_orders}</td>
          <td class="p-3 text-center font-black" style="color:${delivRateColor}">${delivRate}%</td>
          <td class="p-3 text-center font-bold text-blue-500">${money(c.ad_spend)}</td>
          <td class="p-3 text-center font-bold">${c.real_cpa > 0 ? money(c.real_cpa) : '—'}</td>
          <td class="p-3 text-center font-bold text-blue-700">${money(c.delivered_revenue)}</td>
          <td class="p-3 text-center font-bold text-blue-500">- ${money(c.returned_shipping_loss)}</td>
          <td class="p-3 text-center font-black" style="color:${netColor}">${money(c.net_profit)}</td>
          <td class="p-3 text-center font-black" style="color:${roasColor}">${c.real_roas.toFixed(2)}×</td>
        </tr>`;
      }).join(''); */
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
          <td class="p-3 font-black text-blue-500 text-sm">${money(s.spend_amount)}</td>
          <td class="p-3 text-sm text-slate-900/60">${String(s.spend_date).slice(0, 10)}</td>
          <td class="p-3 text-sm text-slate-900/50">${escapeHtml(s.notes || '')}</td>
          <td class="p-3">
            <button data-spend="${encodeURIComponent(JSON.stringify({ id: s.id, campaign_name: s.campaign_name, source: s.source, spend_amount: s.spend_amount, spend_date: String(s.spend_date).slice(0, 10), notes: s.notes || '' }))}" class="edit-spend-btn text-slate-900/70 hover:text-slate-900 text-xs font-black px-2 py-1 rounded-lg hover:bg-slate-50 transition">تعديل</button>
            <button data-spend-id="${s.id}" class="delete-spend-btn text-rose-600 hover:text-rose-700 text-xs font-black px-2 py-1 rounded-lg hover:bg-rose-50 transition">حذف</button>
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
            showToast('تم حذف السجل ✅');
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
    const statusLabels = ['مسلَّمة ✅', 'قيد التوصيل 🚚', 'قيد المعالجة ⏳', 'تعذر التوصيل ⚠️', 'مرتجع 🔄', 'ملغاة ❌'];
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
            label: 'المسلَّمة فعلياً ✅',
            data: hasProdData ? deliveredQuantities : [0],
            backgroundColor: '#1E6F54',
            borderRadius: 6,
          },
          {
            label: 'الملغاة / المرتجعة ❌',
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

  showToast(EDIT_SPEND_ID ? 'تم تعديل المصروف بنجاح ✅' : `تم تسجيل ${money(spend_amount)} مصاريف لحملة "${campaign_name}"`);
  
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
    'قيد التوصيل': 'bg-blue-100 text-blue-900 border-blue-300',
    'تم التسليم': 'bg-emerald-100 text-emerald-900 border-emerald-300',
    'تعذر التوصيل': 'bg-orange-100 text-orange-900 border-orange-300',
    'مرتجع': 'bg-purple-100 text-purple-900 border-purple-300',
    'ملغي': 'bg-rose-100 text-rose-900 border-rose-300',
  };

  for (const o of orders) {
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-200/10';
    const deliveryLabel = o.delivery_type === 'desk' ? 'مكتب البريد 🏤' : 'للمنزل 🏠';

    const itemsSummary = (o.items || []).map(i => {
      const details = [];
      if (i.color) details.push(`اللون: ${escapeHtml(i.color)}`);
      if (i.size) details.push(`المقاس: ${escapeHtml(i.size)}`);
      if (!i.color && !i.size && i.variant_label) details.push(escapeHtml(i.variant_label));

      const colorDot = i.color_code ? `<span class="w-3 h-3 rounded-full border border-slate-200/30 inline-block shrink-0" style="background-color:${i.color_code}"></span>` : '';
      const imgTag = i.image ? `<img src="${i.image}" class="w-7 h-7 object-cover rounded border border-slate-200/20 shrink-0 bg-slate-50" />` : '';
      const detailsBadge = details.length ? `<span class="bg-blue-600/10 text-blue-600 font-black px-1.5 py-0.5 rounded text-[10px] inline-flex items-center gap-1">${colorDot}${details.join(' | ')}</span>` : '';

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
      ? `<span class="block text-[10px] font-black text-blue-500 mt-0.5">⚠️ خُصمت تكلفة التوصيل (-${money(o.delivery_price)})</span>`
      : '';

    const trackingBadge = o.tracking_code
      ? `<div class="mt-1 flex flex-col gap-1">
           <span class="inline-flex items-center gap-1 text-[10px] font-mono font-black bg-slate-50 border border-slate-200/20 px-1.5 py-0.5 rounded">
             📦 ${escapeHtml(o.tracking_code)}
           </span>
           ${o.label_url ? `<a href="${o.label_url}" target="_blank" class="text-[10px] font-black text-blue-700 hover:underline flex items-center gap-1">📄 طباعة البوليصة</a>` : ''}
           <button class="live-track-btn text-[10px] font-black text-blue-600 hover:underline text-right" data-orderid="${o.id}">🔄 تتبع لحظي</button>
         </div>`
      : (['قيد المعالجة', 'قيد التوصيل'].includes(o.status) ? `
         <div class="mt-1">
           <button class="generate-label-btn btn-outline text-[10px] font-black px-2 py-1 rounded bg-slate-50/60 border-slate-200/30 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1" data-orderid="${o.id}">
             🏷️ توليد بوليصة الشحن
           </button>
         </div>` : '');

    tr.innerHTML = `
      <td class="p-3">${o.id}</td>
      <td class="p-3">${escapeHtml(o.customer_name)}<br><span class="text-xs text-slate-900/40">${escapeHtml(o.phone)}</span></td>
      <td class="p-3 text-xs">
        <b>${escapeHtml(o.wilaya_name || '')}</b> - ${escapeHtml(o.commune || '')}<br>
        <span class="text-slate-900/40">${escapeHtml(o.address)}</span>
      </td>
      <td class="p-3 text-xs">
        ${deliveryLabel}<br>
        <span class="text-slate-900/40">+${money(o.delivery_price)}</span>
        ${trackingBadge}
      </td>
      <td class="p-3 text-xs">${itemsSummary}</td>
      <td class="p-3 font-extrabold">${money(o.total)}<br><span class="text-xs text-slate-900/40 font-normal">منتجات: ${money(o.subtotal)}</span></td>
      <td class="p-3">
        ${isFinalStatus ? `
          <span class="inline-block px-2.5 py-1 text-xs font-black rounded-lg border ${STATUS_BADGE_STYLE[o.status] || 'bg-slate-50'}">
            ${o.status}
          </span>
          ${shippingLossBadge}
        ` : `
          <select class="status-select field px-2 py-1 text-xs font-black rounded-lg border ${STATUS_BADGE_STYLE[o.status] || ''}">
            ${availableStatuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          ${shippingLossBadge}
        `}
      </td>
      <td class="p-3 text-xs text-slate-900/40">${new Date(o.created_at).toLocaleString('ar-DZ')}</td>
      <td class="p-3"><button class="del-order-btn text-rose-600 font-extrabold text-xs hover:underline">حذف</button></td>
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
        showToast('تم تحديث حالة الطلب بنجاح ✅');
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
          genBtn.textContent = 'جارٍ التوليد... ⏳';
          const res = await fetch(`/api/shipping/orders/${o.id}/generate-label`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'تعذر توليد بوليصة الشحن', true);
            genBtn.disabled = false;
            genBtn.textContent = '🏷️ توليد بوليصة الشحن';
            return;
          }
          showToast('تم تسجيل الطرد وتوليد بوليصة الشحن بنجاح ✅');
          if (data.label_url) {
            window.open(data.label_url, '_blank');
          }
          loadOrders();
        } catch (err) {
          showToast(err.message, true);
          genBtn.disabled = false;
          genBtn.textContent = '🏷️ توليد بوليصة الشحن';
        }
      });
    }

    // زر التتبع اللحظي
    const trackBtn = tr.querySelector('.live-track-btn');
    if (trackBtn) {
      trackBtn.addEventListener('click', async () => {
        try {
          trackBtn.textContent = 'جارٍ التتبع... ⏳';
          const res = await fetch(`/api/shipping/orders/${o.id}/live-track`);
          const data = await res.json();
          if (!res.ok) {
            showToast(data.error || 'تعذر جلب بيانات التتبع', true);
            trackBtn.textContent = '🔄 تتبع لحظي';
            return;
          }
          showToast(`حالة الشحنة لدى الشركة: ${data.last_status || 'قيد التوصيل'} (${data.internal_status || ''})`);
          loadOrders();
        } catch (err) {
          showToast(err.message, true);
          trackBtn.textContent = '🔄 تتبع لحظي';
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
      <td class="p-2 text-xs text-slate-900/40">${String(r.wilaya_code).padStart(2, '0')}</td>
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
    showToast('تم حفظ كل أسعار التوصيل ✅');
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
    icon.textContent = '🔄';
    title.textContent = 'تصفير الحسابات والطلبات (0)';
    subtitle.textContent = 'إعادة تصفير الإحصائيات والأرباح لتبدأ من جديد';
    warning.innerHTML = '⚠️ <b>تحذير:</b> سيتم حذف جميع الطلبات المسجلة وتصفير المبيعات والأرباح وتكاليف الشحن إلى <b>0 دج</b>. ستبقى المنتجات والتصنيفات كما هي.';
  } else if (actionType === 'store') {
    icon.textContent = '⚠️';
    title.textContent = 'إعادة ضبط المصنع الكامل للمتجر';
    subtitle.textContent = 'مسح شامل وإعادة المتجر نظيفاً مع حفظ أسعار التوصيل';
    warning.innerHTML = '🚨 <b>تحذير:</b> سيتم مسح المنتجات والتصنيفات والطلبات والإحصائيات ومصاريف الإعلانات. <b>ستبقى أسعار التوصيل للولايات الـ 69 محفوظة كما هي دون مسح.</b>';
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
document.getElementById('downloadBackupBtn')?.addEventListener('click', () => {
  window.location.href = '/api/settings/backup';
});

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
    showToast(data.message || 'تمت العملية بنجاح ✅');

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
  table.innerHTML = `<table class="w-full text-xs"><thead class="bg-slate-50"><tr><th class="p-2 text-right">الولاية</th><th class="p-2">للمنزل</th><th class="p-2">للمكتب</th><th class="p-2">متاح</th></tr></thead><tbody>${rates.map((rate) => `<tr data-wilaya-row="${rate.wilaya_code}" class="border-t border-slate-200/10"><td class="p-2 font-bold">${rate.wilaya_code} - ${escapeHtml(rate.wilaya_name)}</td><td class="p-2"><input data-rate="home" type="number" min="0" value="${rate.home_price}" class="field w-24 px-2 py-1 text-xs" /></td><td class="p-2"><input data-rate="desk" type="number" min="0" value="${rate.desk_price}" class="field w-24 px-2 py-1 text-xs" /></td><td class="p-2 text-center"><input data-rate="deliverable" type="checkbox" ${rate.is_deliverable ? 'checked' : ''} /></td></tr>`).join('')}</tbody></table>`;
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
      showToast('تم حفظ إعدادات الشحن بنجاح ✅');
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
    }
  });
});

checkSession();
