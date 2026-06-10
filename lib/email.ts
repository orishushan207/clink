import nodemailer from "nodemailer";

const FROM_NAME = "Clink";
const FROM_EMAIL = process.env.GMAIL_USER ?? "";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEventCreatedEmail({
  to,
  email,
  password,
  eventName,
  eventUrl,
  adminUrl,
}: {
  to: string;
  email: string;
  password: string;
  eventName: string;
  eventUrl: string;
  adminUrl: string;
}) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping email");
    return;
  }

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject: `האירוע שלך "${eventName}" נוצר בהצלחה! 🎉`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:sans-serif;color:#e2e8f0;direction:rtl;">
  <div style="max-width:520px;margin:40px auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
    <div style="background:linear-gradient(to right,#f0cdb8,#d9a98e);padding:32px;text-align:center;">
      <h1 style="margin:0;font-size:28px;color:#fff;letter-spacing:-0.5px;">🎉 Clink</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">האירוע שלך נוצר בהצלחה</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#fff;">${eventName}</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;">שמור את פרטי הכניסה שלך במקום בטוח</p>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">פרטי התחברות</p>
        <div style="margin-bottom:10px;">
          <span style="color:#94a3b8;font-size:13px;">אימייל: </span>
          <span style="color:#e2e8f0;font-size:14px;font-weight:600;">${email}</span>
        </div>
        <div>
          <span style="color:#94a3b8;font-size:13px;">סיסמה: </span>
          <span style="color:#e2e8f0;font-size:14px;font-weight:600;font-family:monospace;">${password}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <a href="${adminUrl}" style="display:block;background:linear-gradient(to right,#f0cdb8,#d9a98e);color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;text-align:center;font-weight:600;font-size:15px;">
          כניסה לפאנל הניהול →
        </a>
        <a href="${eventUrl}" style="display:block;background:rgba(255,255,255,0.06);color:#e2e8f0;text-decoration:none;padding:14px 24px;border-radius:12px;text-align:center;font-size:14px;border:1px solid rgba(255,255,255,0.1);">
          צפייה בדף האירוע
        </a>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
      <p style="margin:0;color:#4a5568;font-size:12px;">Clink — גלריית תמונות לאירועים</p>
    </div>
  </div>
</body>
</html>`,
  });
}
