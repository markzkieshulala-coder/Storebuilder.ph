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

// Ensure the template-sharing columns exist on Website table.
// Idempotent: ADD COLUMN IF NOT EXISTS is a no-op when the column is already there.
let columnsEnsured = false;
async function ensureTemplateColumns(): Promise<void> {
  if (columnsEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Website"
        ADD COLUMN IF NOT EXISTS "templateSlug" TEXT,
        ADD COLUMN IF NOT EXISTS "templateShared" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "templateUseCount" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "clonedFromId" TEXT
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Website_templateSlug_key" ON "Website"("templateSlug")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "Website_templateSlug_idx" ON "Website"("templateSlug")`
    );
    columnsEnsured = true;
  } catch (err) {
    console.warn("[ensureTemplateColumns] migration step failed — continuing:", err);
    columnsEnsured = true;
  }
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

    const plan = session.user.plan;
    if (plan !== "PRO" && plan !== "ENTERPRISE") {
      return NextResponse.json(
        { error: "Template sharing is available on the Pro and Enterprise plans." },
        { status: 403 }
      );
    }

    await ensureTemplateColumns();

    // Read website row using raw SQL so we get columns the Prisma client may
    // not know about yet (templateSlug, etc.).
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, "userId", "templateSlug", "templateUseCount" FROM "Website" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
      params.id,
      session.user.id
    );
    const website = rows?.[0];
    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    let slug: string | null = website.templateSlug ?? null;
    if (!slug) {
      for (let i = 0; i < 5; i++) {
        const candidate = generateTemplateSlug(website.name);
        const existing = await prisma.$queryRawUnsafe<any[]>(
          `SELECT id FROM "Website" WHERE "templateSlug" = $1 LIMIT 1`,
          candidate
        );
        if (!existing?.length) {
          slug = candidate;
          break;
        }
      }
      if (!slug) {
        return NextResponse.json(
          { error: "Could not generate a unique link. Please try again." },
          { status: 500 }
        );
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "Website" SET "templateShared" = true, "templateSlug" = $1 WHERE id = $2`,
      slug,
      params.id
    );

    const useCount = Number(website.templateUseCount ?? 0);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host") || "storebuilder.ph"}`;

    return NextResponse.json({
      success: true,
      templateSlug: slug,
      shareUrl: `${appUrl}/template/${slug}`,
      useCount,
    });
  } catch (err: any) {
    console.error("[POST /api/websites/[id]/template]", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}

// DELETE → disable template sharing (slug remains so old links 404)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTemplateColumns();

    const result = await prisma.$executeRawUnsafe(
      `UPDATE "Website" SET "templateShared" = false WHERE id = $1 AND "userId" = $2`,
      params.id,
      session.user.id
    );
    if (Number(result) === 0) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/websites/[id]/template]", err);
    return NextResponse.json(
      { error: "Internal server error: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
