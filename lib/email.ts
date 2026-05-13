import nodemailer from "nodemailer";

// Email config validation — every send goes through here so we fail loudly
// when SMTP env vars are missing instead of silently dropping the message.
// Without these vars Nodemailer throws cryptic "Missing credentials"
// errors deep inside the API route and the user just sees "Email service
// unavailable" with no hint about what's wrong.
export type EmailConfigCheck = {
  ok: boolean;
  host: string;
  port: number;
  hasUser: boolean;
  hasPassword: boolean;
  from: string;
  missing: string[];
};

export function checkEmailConfig(): EmailConfigCheck {
  const host = process.env.EMAIL_SERVER_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587;
  const hasUser = !!process.env.EMAIL_SERVER_USER;
  const hasPassword = !!process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM || "Storebuilder.ph <noreply@storebuilder.ph>";
  const missing: string[] = [];
  if (!hasUser) missing.push("EMAIL_SERVER_USER");
  if (!hasPassword) missing.push("EMAIL_SERVER_PASSWORD");
  if (!process.env.EMAIL_FROM) missing.push("EMAIL_FROM (using fallback)");
  return { ok: hasUser && hasPassword, host, port, hasUser, hasPassword, from, missing };
}

let transporterCache: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (transporterCache) return transporterCache;
  const cfg = checkEmailConfig();
  transporterCache = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
    // Surface SMTP errors faster — without these, a misconfigured host hangs
    // the request for the full default of >2 minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporterCache;
}

const FROM = process.env.EMAIL_FROM || "Storebuilder.ph <noreply@storebuilder.ph>";

async function sendMail(opts: { to: string; subject: string; html: string; text: string; replyTo?: string }) {
  const cfg = checkEmailConfig();
  if (!cfg.ok) {
    throw new Error(
      `Email service not configured. Missing env vars: ${cfg.missing.join(", ")}. ` +
      `Set EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD (and EMAIL_FROM) in your environment, then redeploy.`
    );
  }
  return getTransporter().sendMail({ from: FROM, ...opts });
}

// Verify SMTP credentials without actually sending an email. Used by the
// admin "Test email delivery" panel to quickly diagnose configuration
// problems.
export async function verifyTransport(): Promise<{ ok: boolean; error?: string }> {
  const cfg = checkEmailConfig();
  if (!cfg.ok) return { ok: false, error: `Missing env vars: ${cfg.missing.join(", ")}` };
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "SMTP verification failed" };
  }
}

// Generic reply-to-customer email used by the in-app inbox. Subject and body
// are admin-provided; replyTo is set to the business email so the customer
// can hit "reply" in their email client and land back at the merchant.
export async function sendInboxReplyEmail(opts: {
  to: string;
  customerName: string;
  subject: string;
  message: string;
  businessName: string;
  businessEmail: string;
  subdomain?: string | null;
}) {
  const safe = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
  const escaped = safe(opts.message).replace(/\n/g, "<br/>");
  const footer = opts.subdomain ? `${opts.subdomain}.storebuilder.ph` : opts.businessName;
  return sendMail({
    to: opts.to,
    replyTo: opts.businessEmail,
    subject: opts.subject || `Reply from ${opts.businessName}`,
    text: `Hi ${opts.customerName || "there"},\n\n${opts.message}\n\n— ${opts.businessName}\nReply to this email to respond.\n\nSent via ${footer}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Google Sans',Roboto,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow:hidden">
        <tr><td style="background:#1877F2;padding:22px 28px">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase">${safe(opts.businessName)}</p>
          <h1 style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:700">A message from ${safe(opts.businessName)}</h1>
        </td></tr>
        <tr><td style="padding:28px;color:#374151;font-size:14px;line-height:1.6">
          <p style="margin:0 0 12px">Hi <strong>${safe(opts.customerName || "there")}</strong>,</p>
          <div style="margin:0 0 18px">${escaped}</div>
          <p style="margin:0 0 0;color:#9ca3af;font-size:12px">— ${safe(opts.businessName)} · just reply to this email to respond</p>
        </td></tr>
        <tr><td style="padding:14px 28px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:11px">Sent via ${safe(footer)} · powered by Storebuilder.ph</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
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

// Shared transactional email shell — every transactional email shares the
// same outer wrapper (header, footer, padding). Keeps templates focused on
// content while staying visually consistent.
function shell(opts: { title: string; bodyHtml: string }): string {
  return `
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
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:700">${opts.title}</h2>
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Storebuilder.ph — All rights reserved</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Account verification — sent on signup or whenever the user (or an admin)
// clicks "Send Verification Link". Contains a token URL that flips
// `emailVerified` on the User row.
export async function sendAccountVerificationEmail(opts: {
  to: string;
  name: string;
  verifyUrl: string;
}) {
  return sendMail({
    to: opts.to,
    subject: "Verify your Storebuilder.ph account",
    text: `Hi ${opts.name || "there"},\n\nTap this link to verify your account: ${opts.verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't request this email you can safely ignore it.`,
    html: shell({
      title: "Verify your account",
      bodyHtml: `
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>, please confirm your email address by tapping the link below.</p>
        <p style="margin:0 0 24px"><a href="${opts.verifyUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:10px">Tap to verify your account</a></p>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Or copy this link into your browser:</p>
        <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#6b7280;background:#f9fafb;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb">${opts.verifyUrl}</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">This link expires in 24 hours. If you didn't sign up for Storebuilder.ph, you can safely ignore this email.</p>
      `,
    }),
  });
}

// Sent when a user (or admin) cancels a subscription, whether immediate or
// deferred. `endsAt` is omitted for immediate cancels.
export async function sendSubscriptionCancelledEmail(opts: {
  to: string;
  name: string;
  plan: string;
  immediate: boolean;
  endsAt?: Date | null;
}) {
  const endsAtFmt = opts.endsAt
    ? new Date(opts.endsAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const billingUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`;
  return sendMail({
    to: opts.to,
    subject: opts.immediate
      ? `Your ${opts.plan} subscription has been cancelled`
      : `Your ${opts.plan} subscription is set to cancel`,
    text: opts.immediate
      ? `Hi ${opts.name || "there"},\n\nYour ${opts.plan} subscription has been cancelled and your account is now on the Free plan.\n\nIf this wasn't you or you'd like to resubscribe, visit ${billingUrl}.`
      : `Hi ${opts.name || "there"},\n\nWe've scheduled your ${opts.plan} subscription to cancel${endsAtFmt ? ` on ${endsAtFmt}` : ""}. You'll keep all paid features until then, after which your account will switch to the Free plan.\n\nChange your mind? You can keep your subscription anytime before that date at ${billingUrl}.`,
    html: shell({
      title: opts.immediate ? "Subscription cancelled" : "Cancellation scheduled",
      bodyHtml: `
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>,</p>
        ${opts.immediate
          ? `<p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Your <strong>${opts.plan}</strong> subscription has been cancelled. Your account is now on the <strong>Free</strong> plan.</p>`
          : `<p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">We've scheduled your <strong>${opts.plan}</strong> subscription to cancel${endsAtFmt ? ` on <strong>${endsAtFmt}</strong>` : ""}. You'll keep all paid features until then, after which your account will switch to the Free plan.</p>`}
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">${opts.immediate ? "Want to come back? You can resubscribe at any time from your dashboard." : "Change your mind? You can keep your subscription anytime before the cancel date."}</p>
        <p style="margin:0 0 24px"><a href="${billingUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:9px">Open billing settings</a></p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">If you didn't request this, please contact support immediately.</p>
      `,
    }),
  });
}

// Sent when a deferred cancellation is reversed — i.e. the user clicked
// "Keep my subscription".
export async function sendSubscriptionRestoredEmail(opts: {
  to: string;
  name: string;
  plan: string;
}) {
  const billingUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`;
  return sendMail({
    to: opts.to,
    subject: `Your ${opts.plan} subscription is back on`,
    text: `Hi ${opts.name || "there"},\n\nGood news — your ${opts.plan} subscription will continue as normal. The scheduled cancellation has been reversed.\n\nManage your subscription anytime: ${billingUrl}`,
    html: shell({
      title: "Subscription restored",
      bodyHtml: `
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>,</p>
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Good news — your <strong>${opts.plan}</strong> subscription will continue as normal. The scheduled cancellation has been reversed.</p>
        <p style="margin:0 0 24px"><a href="${billingUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:9px">Manage subscription</a></p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">No further action is needed.</p>
      `,
    }),
  });
}

// Sent when a paid subscription is first activated (Pro or Enterprise).
export async function sendSubscriptionPurchasedEmail(opts: {
  to: string;
  name: string;
  plan: string;
  billingCycle: "MONTHLY" | "YEARLY";
  amountCents: number;
  nextRenewal?: Date | null;
}) {
  const amount = `₱${(opts.amountCents / 100).toLocaleString("en-PH")}`;
  const cycle = opts.billingCycle === "MONTHLY" ? "month" : "year";
  const renewalFmt = opts.nextRenewal
    ? new Date(opts.nextRenewal).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const billingUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`;
  return sendMail({
    to: opts.to,
    subject: `Welcome to ${opts.plan} — your subscription is active`,
    text: `Hi ${opts.name || "there"},\n\nThanks for upgrading to ${opts.plan}! Your subscription is now active.\n\nPlan: ${opts.plan}\nBilling: ${amount} / ${cycle}\n${renewalFmt ? `Next renewal: ${renewalFmt}\n` : ""}\nManage your subscription: ${billingUrl}`,
    html: shell({
      title: `Welcome to ${opts.plan}`,
      bodyHtml: `
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>, thanks for upgrading! Your <strong>${opts.plan}</strong> subscription is now active.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin-bottom:24px">
          <tr><td style="padding:16px 18px">
            <table width="100%" cellpadding="0" cellspacing="6">
              <tr>
                <td style="color:#9ca3af;font-size:13px;width:110px;padding-bottom:8px">Plan</td>
                <td style="color:#111827;font-size:13px;font-weight:600;padding-bottom:8px">${opts.plan}</td>
              </tr>
              <tr>
                <td style="color:#9ca3af;font-size:13px;padding-bottom:8px">Billing</td>
                <td style="color:#111827;font-size:13px;font-weight:600;padding-bottom:8px">${amount} / ${cycle}</td>
              </tr>
              ${renewalFmt ? `<tr>
                <td style="color:#9ca3af;font-size:13px">Next renewal</td>
                <td style="color:#111827;font-size:13px;font-weight:600">${renewalFmt}</td>
              </tr>` : ""}
            </table>
          </td></tr>
        </table>
        <p style="margin:0 0 24px"><a href="${billingUrl}" style="display:inline-block;background:#1877F2;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:9px">Open billing</a></p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">Payments are non-refundable. You can cancel anytime from your billing settings.</p>
      `,
    }),
  });
}

// Sent when the user requests removal of their saved payment method.
// Requires the user to click the link to actually remove the payment method.
export async function sendPaymentRemovalConfirmation(opts: {
  to: string;
  name: string;
  verifyUrl: string;
}) {
  return sendMail({
    to: opts.to,
    subject: "Confirm payment method removal",
    text: `Hi ${opts.name || "there"},\n\nWe received a request to remove the saved payment method from your account. Tap the link below within 30 minutes to confirm: ${opts.verifyUrl}\n\nIf you didn't request this, ignore this email — no changes will be made.`,
    html: shell({
      title: "Confirm payment method removal",
      bodyHtml: `
        <p style="margin:0 0 18px;color:#6b7280;font-size:15px;line-height:1.6">Hi <strong>${opts.name || "there"}</strong>, we received a request to remove the saved payment method from your account.</p>
        <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">Tap the button below within <strong>30 minutes</strong> to confirm. After confirmation, your saved payment method will be removed and any active subscription will be cancelled.</p>
        <p style="margin:0 0 24px"><a href="${opts.verifyUrl}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:9px">Confirm removal</a></p>
        <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">Or copy this link into your browser:</p>
        <p style="margin:0 0 24px;word-break:break-all;font-size:12px;color:#6b7280;background:#f9fafb;padding:10px 12px;border-radius:8px;border:1px solid #e5e7eb">${opts.verifyUrl}</p>
        <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.5">If you didn't request this, you can ignore this email — your payment method will stay on file.</p>
      `,
    }),
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
