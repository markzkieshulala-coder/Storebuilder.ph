import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET → public template metadata (for the /template/[slug] preview page)
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const website = await prisma.website.findUnique({
    where: { templateSlug: params.slug },
    select: {
      id: true,
      name: true,
      type: true,
      jsonContent: true,
      thumbnail: true,
      templateShared: true,
      templateUseCount: true,
      seoTitle: true,
      seoDesc: true,
      user: { select: { name: true } },
    },
  });

  if (!website || !website.templateShared) {
    return NextResponse.json({ error: "Template not found or no longer shared." }, { status: 404 });
  }

  return NextResponse.json({
    name: website.name,
    type: website.type,
    thumbnail: website.thumbnail,
    seoTitle: website.seoTitle,
    seoDesc: website.seoDesc,
    useCount: website.templateUseCount,
    creator: website.user?.name || "Storebuilder user",
    jsonContent: website.jsonContent, // for preview rendering
  });
}
