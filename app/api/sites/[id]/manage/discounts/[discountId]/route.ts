import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; discountId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const vals: any[] = [];
  let p = 1;
  function push(col: string, v: any) { sets.push(`"${col}" = $${p++}`); vals.push(v); }

  if (typeof body.code === "string") push("code", body.code.toUpperCase().replace(/\s+/g, "").slice(0, 40));
  if (body.type === "FIXED" || body.type === "PERCENT") push("type", body.type);
  if (body.value != null) push("value", Math.max(1, Math.trunc(Number(body.value))));
  if (body.minOrderCents !== undefined) push("minOrderCents", body.minOrderCents == null ? null : Math.max(0, Math.trunc(Number(body.minOrderCents))));
  if (body.usageLimit !== undefined) push("usageLimit", body.usageLimit == null ? null : Math.max(1, Math.trunc(Number(body.usageLimit))));
  if (body.startsAt !== undefined) push("startsAt", body.startsAt ? new Date(body.startsAt) : null);
  if (body.endsAt !== undefined) push("endsAt", body.endsAt ? new Date(body.endsAt) : null);
  if (body.status === "ACTIVE" || body.status === "DISABLED") push("status", body.status);

  if (sets.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  sets.push(`"updatedAt" = NOW()`);
  vals.push(params.discountId, auth.website.id);

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "StoreDiscount" SET ${sets.join(", ")} WHERE id = $${p++} AND "websiteId" = $${p}`,
      ...vals
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; discountId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StoreDiscount" WHERE id = $1 AND "websiteId" = $2`,
      params.discountId, auth.website.id
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "DB error" }, { status: 500 });
  }
}
