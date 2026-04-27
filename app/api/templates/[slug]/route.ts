import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → public template metadata (for the /template/[slug] preview page)
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Use raw SQL because the deployed Prisma client may not yet know about
    // templateShared / templateUseCount / templateSlug fields.
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         w.id,
         w.name,
         w.type,
         w."jsonContent",
         w.thumbnail,
         w."templateShared",
         w."templateUseCount",
         w."seoTitle",
         w."seoDesc",
         u.name AS "creatorName"
       FROM "Website" w
       LEFT JOIN "User" u ON u.id = w."userId"
       WHERE w."templateSlug" = $1
       LIMIT 1`,
      params.slug
    );
    const website = rows?.[0];

    if (!website || !website.templateShared) {
      return NextResponse.json({ error: "Template not found or no longer shared." }, { status: 404 });
    }

    return NextResponse.json({
      name: website.name,
      type: website.type,
      thumbnail: website.thumbnail,
      seoTitle: website.seoTitle,
      seoDesc: website.seoDesc,
      useCount: Number(website.templateUseCount ?? 0),
      creator: website.creatorName || "Storebuilder user",
      jsonContent: website.jsonContent,
    });
  } catch (err: any) {
    console.error("[GET /api/templates/[slug]]", err);
    return NextResponse.json(
      { error: "Could not load template: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
