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

    // Derive a preview image from jsonContent if no thumbnail exists.
    // Look in this order: hero backgroundImage → about image → first product
    // image → first team member image → first gallery image.
    function extractPreviewImage(json: any): string | null {
      if (!json || !Array.isArray(json.sections)) return null;
      for (const s of json.sections) {
        const d = s?.data || {};
        if (s.type === "hero" && typeof d.backgroundImage === "string" && d.backgroundImage.startsWith("https://")) return d.backgroundImage;
      }
      for (const s of json.sections) {
        const d = s?.data || {};
        if (s.type === "about" && typeof d.image === "string" && d.image.startsWith("https://")) return d.image;
        if (s.type === "products" && Array.isArray(d.products) && d.products[0]?.image?.startsWith?.("https://")) return d.products[0].image;
        if (s.type === "team" && Array.isArray(d.members) && d.members[0]?.image?.startsWith?.("https://")) return d.members[0].image;
        if (s.type === "gallery" && Array.isArray(d.images)) {
          const first = typeof d.images[0] === "string" ? d.images[0] : d.images[0]?.url;
          if (typeof first === "string" && first.startsWith("https://")) return first;
        }
      }
      return null;
    }

    const previewImage = website.thumbnail || extractPreviewImage(website.jsonContent);

    return NextResponse.json({
      name: website.name,
      type: website.type,
      thumbnail: previewImage,
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
