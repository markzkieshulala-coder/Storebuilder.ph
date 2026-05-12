import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// Returns up to 50 most recent LoginEvent rows for the target user.
// Restricted to ADMIN.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let events: any[] = [];
    try {
      events = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, ip, "userAgent", browser, os, device, location, provider, "createdAt"
         FROM "LoginEvent"
         WHERE "userId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 50`,
        params.id
      );
    } catch (e) {
      console.error("[admin login-events] query:", e);
      events = [];
    }

    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
