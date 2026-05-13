import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkEmailConfig, verifyTransport } from "@/lib/email";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

// GET  /api/admin/email/test            → returns config + SMTP connectivity status
// POST /api/admin/email/test  body{to}  → sends a real test message to `to`
//
// Admin-only. Used to debug why emails aren't being received: the GET
// surfaces missing env vars and SMTP handshake failures; the POST actually
// sends a message and returns the SMTP response so the admin sees the exact
// failure (auth rejected, domain blocked, etc.).
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 as const };
  if ((session as any).user?.role !== "ADMIN") return { error: "Admin only", status: 403 as const };
  return { ok: true as const };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const cfg = checkEmailConfig();
  const verify = await verifyTransport();
  return NextResponse.json({
    config: { host: cfg.host, port: cfg.port, from: cfg.from, hasUser: cfg.hasUser, hasPassword: cfg.hasPassword },
    missing: cfg.missing,
    smtp: verify,
    ready: cfg.ok && verify.ok,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const to: string = String(body?.to ?? "").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Provide a valid `to` email address" }, { status: 400 });
  }

  const cfg = checkEmailConfig();
  if (!cfg.ok) {
    return NextResponse.json(
      { error: `Email service not configured: missing ${cfg.missing.join(", ")}` },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    const info = await transporter.sendMail({
      from: cfg.from,
      to,
      subject: "Storebuilder.ph — test email",
      text: "This is a test email from Storebuilder.ph. If you're reading this, your SMTP credentials are working.",
      html: `<p>This is a test email from <strong>Storebuilder.ph</strong>.</p><p>If you're reading this, your SMTP credentials are working.</p><p style="color:#6b7280;font-size:12px">Sent ${new Date().toISOString()}</p>`,
    });
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
  } catch (e: any) {
    console.error("[admin email test]", e);
    return NextResponse.json(
      {
        error: e?.message || "SMTP send failed",
        code: e?.code,
        command: e?.command,
        response: e?.response,
      },
      { status: 502 }
    );
  }
}
