import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// POST /api/notifications/read-all — flips every unread notification for the
// current user to read. Used by the "Mark all read" link in the bell dropdown.
export async function POST() {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Notification" SET read = true, "readAt" = NOW()
         WHERE "userId" = $1 AND read = false`,
        session.user.id
      );
    } catch (e) {
      console.error("[notifications read-all]", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
