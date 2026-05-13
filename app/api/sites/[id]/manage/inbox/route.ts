import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeManage } from "@/lib/site/manage-auth";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// GET /api/sites/[id]/manage/inbox
// Returns every contact form submission for the site plus the merchant's
// stored business email. Replies are attached so the Inbox UI shows the
// full conversation history.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Read business email via raw SQL — column is added by db-migrations and
  // may not be reflected in the Prisma client yet.
  let businessEmail: string | null = null;
  let forwardContactEmails = true;
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "businessEmail", "forwardContactEmails" FROM "Website" WHERE id = $1 LIMIT 1`,
      params.id
    );
    if (rows?.[0]) {
      businessEmail = rows[0].businessEmail ?? null;
      forwardContactEmails = rows[0].forwardContactEmails ?? true;
    }
  } catch (e) { console.error("[inbox] website cols:", e); }

  // Contact submissions ordered newest-first.
  const submissions = await prisma.storeContactSubmission.findMany({
    where: { websiteId: params.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Replies grouped by submission.
  let replyRows: any[] = [];
  try {
    replyRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StoreContactReply" WHERE "websiteId" = $1 ORDER BY "createdAt" ASC`,
      params.id
    );
  } catch (e) { console.error("[inbox] replies:", e); }

  const repliesBySub: Record<string, any[]> = {};
  for (const r of replyRows) {
    (repliesBySub[r.submissionId] ||= []).push({
      id: r.id,
      subject: r.subject,
      body: r.body,
      deliveredAt: r.deliveredAt,
      error: r.error,
      createdAt: r.createdAt,
    });
  }

  return NextResponse.json({
    businessEmail,
    forwardContactEmails,
    messages: submissions.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      message: s.message,
      read: s.read,
      createdAt: s.createdAt,
      replies: repliesBySub[s.id] || [],
    })),
  });
}
