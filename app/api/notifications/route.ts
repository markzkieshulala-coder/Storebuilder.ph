import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// GET /api/notifications
// Returns the 50 most recent notifications for the signed-in user plus the
// count of unread items (so the bell badge can render even without paging).
export async function GET() {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let notifications: any[] = [];
    let unread = 0;
    try {
      notifications = await prisma.$queryRawUnsafe<any[]>(
        `SELECT n.id, n."websiteId", n.type, n.title, n.body, n.href, n.metadata,
                n.read, n."createdAt", n."readAt",
                w.name AS "websiteName", w.type AS "websiteType"
         FROM "Notification" n
         LEFT JOIN "Website" w ON w.id = n."websiteId"
         WHERE n."userId" = $1
         ORDER BY n."createdAt" DESC
         LIMIT 50`,
        session.user.id
      );
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "Notification" WHERE "userId" = $1 AND read = false`,
        session.user.id
      );
      unread = Number(rows[0]?.count ?? 0);
    } catch (e) {
      // Table may not exist on first deploy — return empty payload rather than
      // crash so the bell still renders.
      console.error("[notifications GET]", e);
    }

    return NextResponse.json({ notifications, unread });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
