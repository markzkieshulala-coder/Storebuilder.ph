import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

// GET /api/sites/[id]/manage/products
// Returns every product row for the given website, newest first.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "websiteId", name, description, sku, "priceCents", "compareAtCents", currency,
              stock, "trackInventory", "imageUrl", category, tags, status, "weightGrams",
              "createdAt", "updatedAt"
       FROM "StoreProduct"
       WHERE "websiteId" = $1
       ORDER BY "updatedAt" DESC`,
      auth.website.id
    );
    return NextResponse.json({ products: rows });
  } catch (e: any) {
    return NextResponse.json({ products: [], error: e?.message ?? "DB error" });
  }
}

// POST /api/sites/[id]/manage/products
// Creates a new product. The only required field is `name`. Everything else
// defaults to sensible blanks so the user can quickly create a stub and fill
// the details in afterwards.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const id = randomUUID();
  const priceCents = clampInt(body.priceCents, 0, 100_000_000);
  const compareAtCents = body.compareAtCents == null ? null : clampInt(body.compareAtCents, 0, 100_000_000);
  const stock = clampInt(body.stock, 0, 1_000_000);
  const trackInventory = body.trackInventory !== false;
  const description = body.description ? String(body.description).slice(0, 5000) : null;
  const sku = body.sku ? String(body.sku).slice(0, 80) : null;
  const imageUrl = body.imageUrl ? String(body.imageUrl).slice(0, 1000) : null;
  const category = body.category ? String(body.category).slice(0, 80) : null;
  const tags = body.tags ? String(body.tags).slice(0, 400) : null;
  const status = body.status === "DRAFT" ? "DRAFT" : "ACTIVE";

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StoreProduct" (id, "websiteId", name, description, sku, "priceCents", "compareAtCents", currency, stock, "trackInventory", "imageUrl", category, tags, status, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PHP', $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      id, auth.website.id, name, description, sku, priceCents, compareAtCents, stock, trackInventory, imageUrl, category, tags, status
    );
    return NextResponse.json({ id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

function clampInt(v: any, min: number, max: number): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
