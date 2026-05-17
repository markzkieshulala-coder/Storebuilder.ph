import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Extract preview data from either jsonContent (legacy) or htmlContent (new deterministic compiler).
// Returns enough to render a real-looking thumbnail card without returning the full HTML.
function extractPreview(jsonContent: any, htmlContent?: string | null) {
  // ── New path: parse the compiled HTML for CSS variables and first image ──
  if (htmlContent && htmlContent.length > 200) {
    const primary   = (htmlContent.match(/--color-primary\s*:\s*([^;]+);/) || [])[1]?.trim() || "#0d0d1a";
    const accent    = (htmlContent.match(/--color-accent\s*:\s*([^;]+);/) || [])[1]?.trim() || "#1877F2";
    const bgColor   = (htmlContent.match(/--color-background\s*:\s*([^;]+);/) || [])[1]?.trim() || "#ffffff";
    const textColor = (htmlContent.match(/--color-text-inverse\s*:\s*([^;]+);/) || [])[1]?.trim() || "#ffffff";

    // Hero image — first <img> in a hero/fullscreen section
    let image: string | null = null;
    const heroMatch = htmlContent.match(/class="[^"]*hero[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/);
    if (heroMatch) image = heroMatch[1];
    if (!image) {
      const imgMatch = htmlContent.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
      if (imgMatch) image = imgMatch[1];
    }

    // Headline — first h1
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/);
    const headline = h1Match ? h1Match[1].replace(/&amp;/g, "&").trim() : "";

    // Logo — nav-logo text
    const logoMatch = htmlContent.match(/class="nav-logo"[^>]*>([^<]+)</);
    const logo = logoMatch ? logoMatch[1].trim() : "";

    return {
      image,
      headline,
      logo,
      background: primary,
      text: textColor,
      accent,
      bgColor,
    };
  }

  // ── Legacy path: jsonContent.sections (old generator) ──
  if (!jsonContent || typeof jsonContent !== "object") return null;
  const sections = Array.isArray(jsonContent.sections) ? jsonContent.sections : [];
  const colors = jsonContent.colors || {};
  const nav = sections.find((s: any) => s?.type === "nav");
  const hero = sections.find((s: any) => s?.type === "hero");

  let image: string | null = null;
  for (const s of sections) {
    const d = s?.data || {};
    if (d.backgroundImage) { image = d.backgroundImage; break; }
    if (d.image) { image = d.image; break; }
    if (Array.isArray(d.products) && d.products[0]?.image) { image = d.products[0].image; break; }
    if (Array.isArray(d.images) && d.images[0]) {
      image = typeof d.images[0] === "string" ? d.images[0] : d.images[0].url || null;
      if (image) break;
    }
  }

  return {
    image,
    headline: (hero?.data as any)?.headline || jsonContent.name || "",
    logo: (nav?.data as any)?.logo || jsonContent.name || "",
    background: colors.background || colors.primary || "#0d0d1a",
    text: colors.text || "#ffffff",
    accent: colors.accent || colors.secondary || "#1877F2",
    bgColor: colors.background || "#ffffff",
  };
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const websites = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, type, subdomain, "customDomain", published,
              "seoTitle", thumbnail, "jsonContent",
              LEFT("htmlContent", 4000) AS "htmlPreview",
              "createdAt", "updatedAt"
         FROM "Website"
        WHERE "userId" = $1
        ORDER BY "updatedAt" DESC`,
      session.user.id
    );

    // Replace heavy content with a slim preview object.
    const slim = websites.map((w: any) => {
      const { jsonContent, htmlPreview, ...rest } = w;
      return { ...rest, preview: extractPreview(jsonContent, htmlPreview) };
    });

    return NextResponse.json({ websites: slim });
  } catch (err: any) {
    console.error("[GET /api/websites]", err);
    return NextResponse.json(
      { error: "Could not load websites: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
