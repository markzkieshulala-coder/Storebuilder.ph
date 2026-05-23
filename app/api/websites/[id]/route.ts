import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderBlueprintToHtml } from "@/lib/ultra-premium/render/htmlRenderer";
import type { SiteBlueprint } from "@/lib/ultra-premium/types/SiteBlueprint";

// All operations use raw SQL to avoid type-mismatch errors with a stale
// Prisma client (e.g., when the deployed client predates schema changes).

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Website" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
      params.id,
      session.user.id
    );
    const website = rows?.[0];

    if (!website) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    // Lazy re-render: always re-render from the blueprint when one exists, so
    // any improvements to the renderer (image engine, theme styling, CSS) reach
    // the editor immediately instead of being shadowed by stale `htmlContent`
    // that was baked at the moment the website was first generated.
    try {
      const json = website.jsonContent as Record<string, unknown> | null;
      const blueprint = json?.blueprint as SiteBlueprint | undefined;
      if (blueprint && website.name) {
        const freshHtml = renderBlueprintToHtml(blueprint, website.name);
        if (freshHtml !== website.htmlContent) {
          website.htmlContent = freshHtml;
          // Persist in background — don't block the response
          prisma.$executeRawUnsafe(
            `UPDATE "Website" SET "htmlContent" = $1, "updatedAt" = NOW() WHERE id = $2`,
            freshHtml,
            website.id
          ).catch(() => {});
        }
      }
    } catch { /* never fail a GET because of lazy re-render */ }

    return NextResponse.json({ website });
  } catch (err: any) {
    console.error("[GET /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not load website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "Website" WHERE id = $1 AND "userId" = $2 LIMIT 1`,
      params.id,
      session.user.id
    );
    if (!ownerCheck?.length) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    const body = await req.json();
    const { jsonContent, htmlContent, name, published, seoTitle, seoDesc, customDomain } = body;

    // Build dynamic SET clause for only the fields that were provided
    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (jsonContent !== undefined)   { sets.push(`"jsonContent" = $${i++}::jsonb`); values.push(JSON.stringify(jsonContent)); }
    if (htmlContent !== undefined)   { sets.push(`"htmlContent" = $${i++}`); values.push(htmlContent); }
    if (name !== undefined)          { sets.push(`name = $${i++}`); values.push(name); }
    if (published !== undefined)     { sets.push(`published = $${i++}`); values.push(published); }
    if (seoTitle !== undefined)      { sets.push(`"seoTitle" = $${i++}`); values.push(seoTitle); }
    if (seoDesc !== undefined)       { sets.push(`"seoDesc" = $${i++}`); values.push(seoDesc); }
    if (customDomain !== undefined)  { sets.push(`"customDomain" = $${i++}`); values.push(customDomain); }
    sets.push(`"updatedAt" = NOW()`);

    if (values.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(params.id);
    const sql = `UPDATE "Website" SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`;
    const updatedRows = await prisma.$queryRawUnsafe<any[]>(sql, ...values);

    // If we updated content for a published site, bust ISR so the live page
    // reflects the edit on the next request instead of waiting up to 60s.
    const updated = updatedRows[0];
    if (updated?.published && (jsonContent !== undefined || htmlContent !== undefined || name !== undefined)) {
      try { revalidatePath(`/sites/${updated.subdomain}`); } catch {}
    }

    return NextResponse.json({ website: updated });
  } catch (err: any) {
    console.error("[PATCH /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not update website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "Website" WHERE id = $1 AND "userId" = $2`,
      params.id,
      session.user.id
    );

    if (Number(result) === 0) {
      return NextResponse.json({ error: "Website not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/websites/[id]]", err);
    return NextResponse.json(
      { error: "Could not delete website: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
