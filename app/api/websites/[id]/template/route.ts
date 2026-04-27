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

// POST → enable template sharing (PRO + ENTERPRISE only)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // session.user.plan is refreshed from DB on every JWT cycle (see lib/auth.ts)
    const plan = session.user.plan;
    if (plan !== "PRO" && plan !== "ENTERPRISE") {
      return NextResponse.json(
        { error: "Template sharing is available on the Pro and Enterprise plans." },
        { status: 403 }
      );
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    let slug = website.templateSlug;
    if (!slug) {
      for (let i = 0; i < 5; i++) {
        const candidate = generateTemplateSlug(website.name);
        const exists = await prisma.website.findUnique({ where: { templateSlug: candidate } });
        if (!exists) { slug = candidate; break; }
      }
      if (!slug) {
        return NextResponse.json({ error: "Could not generate a unique link. Please try again." }, { status: 500 });
      }
    }

    const updated = await prisma.website.update({
      where: { id: params.id },
      data: { templateShared: true, templateSlug: slug },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host") || "storebuilder.ph"}`;

    return NextResponse.json({
      success: true,
      templateSlug: updated.templateSlug,
      shareUrl: `${appUrl}/template/${updated.templateSlug}`,
      useCount: updated.templateUseCount,
    });
  } catch (err: any) {
    console.error("[POST /api/websites/[id]/template]", err);
    return NextResponse.json({ error: "Internal server error: " + (err?.message ?? "unknown") }, { status: 500 });
  }
}

// DELETE → disable template sharing
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    await prisma.website.update({
      where: { id: params.id },
      data: { templateShared: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/websites/[id]/template]", err);
    return NextResponse.json({ error: "Internal server error: " + (err?.message ?? "unknown") }, { status: 500 });
  }
}
