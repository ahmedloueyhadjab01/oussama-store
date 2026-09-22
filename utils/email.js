const nodemailer = require('nodemailer');

function createTransporter() {
  // محاولة استخدام SMTP_* أولاً، ثم EMAIL_* للتوافق الخلفي
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = process.env.SMTP_PORT || process.env.EMAIL_PORT;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(port || '587', 10),
      secure: (process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: user,
        pass: pass,
      },
    });
  }
  return null;
}

async function sendOtpEmail(toEmail, otpCode, userName = 'مرحباً', type = 'reset') {
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n=========================================');
    console.log(`📧 [رمز التحقق OTP] البريد: ${toEmail} | النوع: ${type}`);
    console.log(`🔐 الرمز: ${otpCode}`);
    console.log('⏰ صالح لمدة: 15 دقيقة');
    console.log('=========================================\n');
  }

  const transporter = createTransporter();
  if (!transporter) {
    return process.env.NODE_ENV === 'production'
      ? { success: false, simulated: false, error: 'إعدادات البريد الإلكتروني غير مكتملة.' }
      : { success: true, simulated: true, otp: otpCode };
  }

  const isVerify = type === 'verify';
  const title = isVerify ? '🔐 تفعيل حساب التاجر والتحقق من البريد' : '🔐 استعادة كلمة المرور';
  const bodyText = isVerify 
    ? 'أهلاً بك في منصة متجر الجملة والشوالات! يرجى استخدام رمز التحقق التالي لتفعيل حسابك والتحقق من صحة بريدك الإلكتروني لتفادي أي انتحال لبياناتك:'
    : 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة المتجر الإلكتروني. استخدم رمز التحقق التالي لإكمال العملية:';

  const html = `
    <div dir="rtl" style="font-family: 'Almarai', Arial, sans-serif; background-color: #FAF3E6; padding: 30px; color: #17241F;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 2px solid #17241F; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <h2 style="color: #1E6F54; text-align: center; margin-top: 0;">${title}</h2>
        <p style="font-size: 15px; line-height: 1.6;">أهلاً <strong>${userName}</strong>،</p>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">${bodyText}</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #17241F; background: #FAF3E6; border: 2px dashed #C9A227; padding: 12px 28px; border-radius: 12px;">
            ${otpCode}
          </span>
        </div>

        <p style="font-size: 13px; color: #666; text-align: center;">⏱️ هذا الرمز صالح لمدة <strong>15 دقيقة</strong> فقط.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 0;">إذا لم تقم بإنشاء حساب أو طلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || `"متجري" <${user}>`,
      to: toEmail,
      subject: `${isVerify ? 'رمز تفعيل حسابك' : 'رمز استعادة كلمة المرور'}: ${otpCode}`,
      html,
    });
    return { success: true, simulated: false };
  } catch (err) {
    console.error('⚠️ خطأ أثناء إرسال البريد الإلكتروني عبر SMTP:', err.message);
    return { success: false, simulated: false, error: err.message };
  }
}

module.exports = { sendOtpEmail };
