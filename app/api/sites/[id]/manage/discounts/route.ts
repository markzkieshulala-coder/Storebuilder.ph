import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StoreDiscount" WHERE "websiteId" = $1 ORDER BY "updatedAt" DESC`,
      auth.website.id
    );
    return NextResponse.json({ discounts: rows });
  } catch (e: any) {
    return NextResponse.json({ discounts: [], error: e?.message ?? "DB error" });
  }
}

// POST — create a new discount. `code` is normalized to uppercase + trimmed
// so customer-facing entry is case-insensitive.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").toUpperCase().replace(/\s+/g, "").slice(0, 40);
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const type = body.type === "FIXED" ? "FIXED" : "PERCENT";
  const value = Math.max(1, Math.min(type === "PERCENT" ? 100 : 10_000_000, Math.trunc(Number(body.value ?? 10))));
  const minOrderCents = body.minOrderCents == null ? null : Math.max(0, Math.trunc(Number(body.minOrderCents)));
  const usageLimit = body.usageLimit == null ? null : Math.max(1, Math.trunc(Number(body.usageLimit)));
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  const status = body.status === "DISABLED" ? "DISABLED" : "ACTIVE";

  const id = randomUUID();
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StoreDiscount" (id, "websiteId", code, type, value, "minOrderCents", "usageLimit", "startsAt", "endsAt", status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW(), NOW())`,
      id, auth.website.id, code, type, value, minOrderCents, usageLimit, startsAt, endsAt, status
    );
    return NextResponse.json({ id, code });
  } catch (e: any) {
    if (String(e?.message ?? "").includes("unique")) {
      return NextResponse.json({ error: `Code "${code}" already exists for this store` }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}
