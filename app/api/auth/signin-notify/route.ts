import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSignInNotificationEmail } from "@/lib/email";

function parseUserAgent(ua: string): { browser: string; os: string; device: string } {
  const browser =
    /Edg\//.test(ua) ? "Microsoft Edge" :
    /OPR\/|Opera/.test(ua) ? "Opera" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? "Safari" :
    "Unknown Browser";

  const os =
    /Windows NT 10/.test(ua) ? "Windows 10/11" :
    /Windows NT 6\.3/.test(ua) ? "Windows 8.1" :
    /Windows NT 6\.1/.test(ua) ? "Windows 7" :
    /Windows/.test(ua) ? "Windows" :
    /Macintosh|Mac OS X/.test(ua) ? "macOS" :
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android/.test(ua) ? "Android" :
    /Linux/.test(ua) ? "Linux" :
    "Unknown OS";

  const device =
    /iPhone/.test(ua) ? "iPhone" :
    /iPad/.test(ua) ? "iPad" :
    /Android.*Mobile/.test(ua) ? "Android Phone" :
    /Android/.test(ua) ? "Android Tablet" :
    "Desktop / Laptop";

  return { browser, os, device };
}

async function getLocation(ip: string): Promise<string> {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Local / Unknown";
  }
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, { next: { revalidate: 3600 } });
    if (!res.ok) return "Unknown Location";
    const data = await res.json();
    const parts = [data.city, data.region, data.country_name].filter(Boolean);
    return parts.length ? parts.join(", ") : "Unknown Location";
  } catch {
    return "Unknown Location";
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: true }); // silently skip if no session
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, email: true },
    });
    if (!user?.email) return NextResponse.json({ ok: true });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "Unknown";

    const ua = req.headers.get("user-agent") || "";
    const { browser, os, device } = parseUserAgent(ua);
    const location = await getLocation(ip);

    const time = new Date().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    await sendSignInNotificationEmail({
      to: user.email,
      name: user.name || user.email,
      browser,
      os,
      device,
      location,
      time,
      ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Fire-and-forget — never fail the sign-in flow
    console.error("[signin-notify]", err);
    return NextResponse.json({ ok: true });
  }
}
