import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { authorizeManage } from "@/lib/site/manage-auth";
import { sendInboxReplyEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/sites/[id]/manage/inbox/[messageId]/reply
// Body: { subject?: string, message: string }
// Sends a reply email to the customer using the merchant's saved business
// email as the reply-to address. The whole exchange is logged in
// StoreContactReply so the inbox UI can show the full conversation.
export async function POST(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const message: string = String(body?.message ?? "").trim();
  const subject: string = String(body?.subject ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  const submission = await prisma.storeContactSubmission.findFirst({
    where: { id: params.messageId, websiteId: params.id },
  });
  if (!submission) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // Resolve the merchant's business email — fall back to the account email
  // so replies still work even if the merchant hasn't configured one.
  let businessEmail = "";
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "businessEmail" FROM "Website" WHERE id = $1 LIMIT 1`,
      params.id
    );
    businessEmail = rows?.[0]?.businessEmail || "";
  } catch {}
  if (!businessEmail) {
    const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true } });
    businessEmail = me?.email || "";
  }
  if (!businessEmail) {
    return NextResponse.json(
      { error: "No business email is set for this site. Add one in Settings → Email." },
      { status: 400 }
    );
  }

  const finalSubject = subject || `Re: your message to ${auth.website.name}`;

  const replyId = crypto.randomBytes(12).toString("hex");
  let deliveredAt: Date | null = null;
  let errorMsg: string | null = null;
  try {
    await sendInboxReplyEmail({
      to: submission.email,
      customerName: submission.name,
      subject: finalSubject,
      message,
      businessName: auth.website.name,
      businessEmail,
      subdomain: auth.website.subdomain,
    });
    deliveredAt = new Date();
  } catch (e: any) {
    errorMsg = e?.message || "Email delivery failed";
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StoreContactReply"(id, "submissionId", "websiteId", "userId", subject, body, "deliveredAt", error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      replyId, submission.id, params.id, auth.userId, finalSubject, message, deliveredAt, errorMsg
    );
  } catch (e) { console.error("[inbox reply] persist:", e); }

  // Mark the original message as read once we've replied.
  try {
    await prisma.storeContactSubmission.updateMany({
      where: { id: submission.id, websiteId: params.id },
      data: { read: true },
    });
  } catch {}

  if (errorMsg) {
    return NextResponse.json({ error: errorMsg, replyId }, { status: 502 });
  }
  return NextResponse.json({ success: true, replyId, deliveredAt });
}
