import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateTemplateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32) || "template";
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

// POST → enable template sharing for this website
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const website = await prisma.website.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  let slug = website.templateSlug;
  if (!slug) {
    for (let i = 0; i < 5; i++) {
      const candidate = generateTemplateSlug(website.name);
      const exists = await prisma.website.findUnique({ where: { templateSlug: candidate } });
      if (!exists) { slug = candidate; break; }
    }
    if (!slug) return NextResponse.json({ error: "Could not generate slug" }, { status: 500 });
  }

  const updated = await prisma.website.update({
    where: { id: params.id },
    data: { templateShared: true, templateSlug: slug },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get("host") || "storebuilder.ph"}`;
  return NextResponse.json({
    success: true,
    templateSlug: updated.templateSlug,
    shareUrl: `${appUrl}/template/${updated.templateSlug}`,
    useCount: updated.templateUseCount,
  });
}

// DELETE → disable template sharing (slug remains so old links 404)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const website = await prisma.website.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!website) return NextResponse.json({ error: "Website not found" }, { status: 404 });

  await prisma.website.update({
    where: { id: params.id },
    data: { templateShared: false },
  });

  return NextResponse.json({ success: true });
}
