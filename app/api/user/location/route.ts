import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

    // Get IP from headers (works behind Vercel/Nginx/CloudFlare)
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = (forwarded?.split(",")[0] ?? realIp ?? "").trim();

    // Skip localhost IPs
    const isLocal = !ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");
    let location = "Philippines"; // sensible default for this app

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

    // Only write if location is not yet set
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { location: true },
    });

    if (!existing?.location) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { location },
      });
    }

    return NextResponse.json({ ok: true, location: existing?.location ?? location });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
