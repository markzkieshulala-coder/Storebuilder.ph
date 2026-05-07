import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = (forwarded?.split(",")[0] ?? realIp ?? "").trim();

    const isLocal = !ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
    let location = "Philippines";

    if (!isLocal) {
      try {
        const geo = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { "User-Agent": "storebuilder.ph/1.0" },
          signal: AbortSignal.timeout(3000),
        }).then((r) => r.json());

        if (geo.city && geo.country_name) {
          location = `${geo.city}, ${geo.country_name}`;
        } else if (geo.country_name) {
          location = geo.country_name;
        }
      } catch {
        // geo lookup failed — keep default
      }
    }

    // Read current location via raw SQL so missing column never crashes
    let existingLocation: string | null = null;
    try {
      const rows = await prisma.$queryRawUnsafe<{ location: string | null }[]>(
        `SELECT "location" FROM "User" WHERE id = $1 LIMIT 1`,
        session.user.id
      );
      existingLocation = rows[0]?.location ?? null;
    } catch {
      // column absent — will be added by ensureSchemaMigrations above
    }

    if (!existingLocation) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "location" = $1 WHERE id = $2`,
          location,
          session.user.id
        );
      } catch {
        // best-effort — column may not exist yet on this request
      }
    }

    return NextResponse.json({ ok: true, location: existingLocation ?? location });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
