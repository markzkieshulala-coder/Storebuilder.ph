import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Extract just enough from jsonContent to render a real-looking thumbnail
// in the dashboard — first section's image, headline, brand color, and nav.
// Returning the entire jsonContent for every site would balloon the payload.
function extractPreview(jsonContent: any) {
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
    background: colors.background || "#0d0d1a",
    text: colors.text || "#ffffff",
    accent: colors.accent || colors.secondary || "#1877F2",
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
              "seoTitle", thumbnail, "jsonContent", "createdAt", "updatedAt"
         FROM "Website"
        WHERE "userId" = $1
        ORDER BY "updatedAt" DESC`,
      session.user.id
    );

    // Replace heavy jsonContent with a slim preview object.
    const slim = websites.map((w: any) => {
      const { jsonContent, ...rest } = w;
      return { ...rest, preview: extractPreview(jsonContent) };
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
