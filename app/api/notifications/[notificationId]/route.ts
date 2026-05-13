import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// PATCH /api/notifications/[id]
// Body: { read?: boolean }
// Used by the bell dropdown to mark a single notification as read/unread.
export async function PATCH(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const read = body?.read !== false; // default true

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Notification" SET read = $1, "readAt" = CASE WHEN $1 THEN NOW() ELSE NULL END
         WHERE id = $2 AND "userId" = $3`,
        read, params.notificationId, session.user.id
      );
    } catch (e) {
      console.error("[notifications PATCH]", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] — removes a single notification from the inbox.
export async function DELETE(_req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "Notification" WHERE id = $1 AND "userId" = $2`,
        params.notificationId, session.user.id
      );
    } catch (e) {
      console.error("[notifications DELETE]", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
