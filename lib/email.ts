import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: Number(process.env.EMAIL_SERVER_PORT) === 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM || "Storebuilder.ph <noreply@storebuilder.ph>";

async function sendMail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  return transporter.sendMail({ from: FROM, ...opts });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  return sendMail({
    to,
    subject: "Reset your Storebuilder.ph password",
    text: `Click the link below to reset your password. This link expires in 1 hour.\n\n${url}\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Google Sans',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden">
        <tr><td style="background:#1877F2;padding:28px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">Storebuilder<span style="opacity:0.75">.ph</span></h1>
        </td></tr>
        <tr><td style="padding:36px 32px">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700">Reset your password</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">Click the button below to set a new password for your account. This link will expire in <strong>1 hour</strong>.</p>
          <a href="${url}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px;margin-bottom:24px">Reset Password</a>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Or copy this link into your browser:</p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#6b7280;background:#f9fafb;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb">${url}</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Storebuilder.ph — All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendContactFormEmail(opts: {
  to: string;
  storeName: string;
  fromName: string;
  fromEmail: string;
  message: string;
  subdomain?: string;
}) {
  const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
  const replyContext = opts.subdomain ? `${opts.subdomain}.storebuilder.ph` : opts.storeName;
  return sendMail({
    to: opts.to,
    replyTo: opts.fromEmail,
    subject: `New contact form message — ${opts.storeName}`,
    text: `New message from your ${opts.storeName} contact form:\n\nFrom: ${opts.fromName} <${opts.fromEmail}>\n\nMessage:\n${opts.message}\n\nReply directly to this email to respond.\n\n-- Sent via ${replyContext}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Google Sans',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden">
        <tr><td style="background:#1877F2;padding:24px 28px">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase">${safe(opts.storeName)}</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">New contact form message</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">
            <tr>
              <td style="color:#9ca3af;font-size:12px;width:70px;padding-bottom:6px">From</td>
              <td style="color:#111827;font-size:14px;font-weight:600;padding-bottom:6px">${safe(opts.fromName)}</td>
            </tr>
            <tr>
              <td style="color:#9ca3af;font-size:12px;padding-bottom:6px">Email</td>
              <td style="color:#1877F2;font-size:14px;padding-bottom:6px"><a href="mailto:${safe(opts.fromEmail)}" style="color:#1877F2;text-decoration:none">${safe(opts.fromEmail)}</a></td>
            </tr>
          </table>
          <div style="background:#f9fafb;border-left:3px solid #1877F2;padding:16px 18px;border-radius:6px;color:#374151;font-size:14px;line-height:1.6;white-space:pre-wrap">${safe(opts.message)}</div>
          <p style="margin:18px 0 0;color:#9ca3af;font-size:12px">Reply directly to this email to respond to <strong>${safe(opts.fromName)}</strong>.</p>
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:11px">Sent via ${safe(replyContext)} · powered by Storebuilder.ph</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendSignInNotificationEmail(opts: {
  to: string;
  name: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  time: string;
  ip: string;
}) {
  const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
  return sendMail({
    to: opts.to,
    subject: "New sign-in to your Storebuilder.ph account",
    text: `Hi ${opts.name},\n\nWe detected a new sign-in to your account.\n\nTime: ${opts.time}\nDevice: ${opts.device}\nBrowser: ${opts.browser}\nOS: ${opts.os}\nLocation: ${opts.location}\nIP Address: ${opts.ip}\n\nIf this was you, no action is needed. If you don't recognise this activity, please change your password immediately.\n\nManage your account: ${dashboardUrl}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Google Sans',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden">
        <tr><td style="background:#1877F2;padding:28px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">Storebuilder<span style="opacity:0.75">.ph</span></h1>
        </td></tr>
        <tr><td style="padding:36px 32px">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700">New sign-in detected</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>, we noticed a new sign-in to your Storebuilder.ph account.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px">
            <tr><td style="padding:16px 18px">
              <table width="100%" cellpadding="0" cellspacing="6">
                <tr>
                  <td style="color:#9ca3af;font-size:13px;width:90px;vertical-align:top;padding-bottom:10px">Time</td>
                  <td style="color:#111827;font-size:13px;font-weight:500;padding-bottom:10px">${opts.time}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;font-size:13px;vertical-align:top;padding-bottom:10px">Browser</td>
                  <td style="color:#111827;font-size:13px;font-weight:500;padding-bottom:10px">${opts.browser}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;font-size:13px;vertical-align:top;padding-bottom:10px">OS</td>
                  <td style="color:#111827;font-size:13px;font-weight:500;padding-bottom:10px">${opts.os}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;font-size:13px;vertical-align:top;padding-bottom:10px">Location</td>
                  <td style="color:#111827;font-size:13px;font-weight:500;padding-bottom:10px">${opts.location}</td>
                </tr>
                <tr>
                  <td style="color:#9ca3af;font-size:13px;vertical-align:top">IP Address</td>
                  <td style="color:#111827;font-size:13px;font-weight:500">${opts.ip}</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">If this was you, no action needed. If you <strong>don't recognise</strong> this activity, please change your password immediately.</p>
          <a href="${dashboardUrl}/settings" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:9px">Secure my account</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Storebuilder.ph — All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

export async function sendEmailChangeVerification(opts: {
  currentEmail: string;
  newEmail: string;
  verifyUrl: string;
  token: string;
}) {
  return sendMail({
    to: opts.currentEmail,
    subject: "Confirm your email change · Storebuilder.ph",
    text: `We received a request to change your Storebuilder.ph email from ${opts.currentEmail} to ${opts.newEmail}. Confirm within 30 minutes by visiting: ${opts.verifyUrl}\n\nIf you didn't request this, ignore this email. Can't access your current email? Contact support@storebuilder.ph.`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Google Sans',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden">
        <tr><td style="background:#1877F2;padding:28px 32px;text-align:center">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">Storebuilder<span style="opacity:0.75">.ph</span></h1>
        </td></tr>
        <tr><td style="padding:36px 32px">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:700">Confirm your email change</h2>
          <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6">We received a request to change the email on your account from <strong>${opts.currentEmail}</strong> to <strong>${opts.newEmail}</strong>.</p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">Click the button below within <strong>30 minutes</strong> to confirm. If you didn't request this, ignore this email — your address will stay the same.</p>
          <a href="${opts.verifyUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px;margin-bottom:24px">Confirm email change</a>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Or copy this link into your browser:</p>
          <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#6b7280;background:#f9fafb;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb">${opts.verifyUrl}</p>
          <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">Can't access your current email? Contact support at <a href="mailto:support@storebuilder.ph" style="color:#1877F2;text-decoration:none">support@storebuilder.ph</a>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Storebuilder.ph — All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
