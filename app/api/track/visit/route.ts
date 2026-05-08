import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// Lightweight pageview beacon — fired client-side from published sites so the
// merchant dashboard can show traffic stats. Best-effort; never blocks the page.
export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const { subdomain, path } = await req.json();
    if (!subdomain || !path) return NextResponse.json({ ok: false });

    const website = await prisma.website.findFirst({
      where: { subdomain, published: true },
      select: { id: true },
    });
    if (!website) return NextResponse.json({ ok: false });

    const referrer = req.headers.get("referer") || null;
    const ua = req.headers.get("user-agent") || null;
    const country = req.headers.get("x-vercel-ip-country") || null;

    await prisma.storeVisit.create({
      data: {
        websiteId: website.id,
        path: String(path).slice(0, 500),
        referrer: referrer ? referrer.slice(0, 500) : null,
        userAgent: ua ? ua.slice(0, 500) : null,
        country,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
