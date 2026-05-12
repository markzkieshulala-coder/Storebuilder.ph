import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

// GET /api/sites/[id]/manage/products/[productId]
export async function GET(_req: NextRequest, { params }: { params: { id: string; productId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StoreProduct" WHERE id = $1 AND "websiteId" = $2 LIMIT 1`,
      params.productId, auth.website.id
    );
    if (!rows[0]) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ product: rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

// PATCH /api/sites/[id]/manage/products/[productId]
// Updates any subset of editable fields. All input is bounds-checked so a
// malicious caller can't insert a 1GB description or a price of Number.MAX.
export async function PATCH(req: NextRequest, { params }: { params: { id: string; productId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const vals: any[] = [];
  let p = 1;
  function push(col: string, v: any) { sets.push(`"${col}" = $${p++}`); vals.push(v); }

  if (typeof body.name === "string") push("name", String(body.name).slice(0, 200).trim());
  if (typeof body.description === "string") push("description", String(body.description).slice(0, 5000));
  if (typeof body.sku === "string") push("sku", String(body.sku).slice(0, 80));
  if (body.priceCents != null) push("priceCents", clampInt(body.priceCents, 0, 100_000_000));
  if (body.compareAtCents !== undefined) push("compareAtCents", body.compareAtCents == null ? null : clampInt(body.compareAtCents, 0, 100_000_000));
  if (body.stock != null) push("stock", clampInt(body.stock, 0, 1_000_000));
  if (typeof body.trackInventory === "boolean") push("trackInventory", body.trackInventory);
  if (typeof body.imageUrl === "string") push("imageUrl", String(body.imageUrl).slice(0, 1000));
  if (typeof body.category === "string") push("category", String(body.category).slice(0, 80));
  if (typeof body.tags === "string") push("tags", String(body.tags).slice(0, 400));
  if (body.status === "ACTIVE" || body.status === "DRAFT" || body.status === "ARCHIVED") push("status", body.status);
  if (body.weightGrams !== undefined) push("weightGrams", body.weightGrams == null ? null : clampInt(body.weightGrams, 0, 10_000_000));

  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  sets.push(`"updatedAt" = NOW()`);
  vals.push(params.productId, auth.website.id);

  try {
    const sql = `UPDATE "StoreProduct" SET ${sets.join(", ")} WHERE id = $${p++} AND "websiteId" = $${p}`;
    await prisma.$executeRawUnsafe(sql, ...vals);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

// DELETE /api/sites/[id]/manage/products/[productId]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; productId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StoreProduct" WHERE id = $1 AND "websiteId" = $2`,
      params.productId, auth.website.id
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

function clampInt(v: any, min: number, max: number): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
