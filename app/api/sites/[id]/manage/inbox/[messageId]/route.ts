import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

// PATCH /api/sites/[id]/manage/inbox/[messageId]   body { read?: boolean }
// Used by the inbox to toggle read/unread state per message.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const read = body?.read !== false;

  await prisma.storeContactSubmission.updateMany({
    where: { id: params.messageId, websiteId: params.id },
    data: { read },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/sites/[id]/manage/inbox/[messageId]
// Removes a single message from the inbox (also cascades stored replies via FK).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; messageId: string } }) {
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.storeContactSubmission.deleteMany({
    where: { id: params.messageId, websiteId: params.id },
  });

  return NextResponse.json({ success: true });
}
