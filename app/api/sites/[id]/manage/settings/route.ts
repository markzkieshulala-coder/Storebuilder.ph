import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { authorizeManage } from "@/lib/site/manage-auth";

export const dynamic = "force-dynamic";

// Settings are stored in the website's jsonContent.storeSettings sub-object so
// no extra DB columns are needed. Each call merges the patch into the existing
// settings.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const w = await prisma.website.findUnique({
    where: { id: params.id },
    select: { jsonContent: true, name: true, subdomain: true, customDomain: true },
  });
  const json = (w?.jsonContent ?? {}) as any;
  return NextResponse.json({
    settings: json.storeSettings ?? {},
    name: w?.name ?? null,
    subdomain: w?.subdomain ?? null,
    customDomain: w?.customDomain ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorizeManage(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, any> = {};
  if (typeof body.storeName === "string") patch.storeName = body.storeName.slice(0, 200);
  if (typeof body.storeEmail === "string") patch.storeEmail = body.storeEmail.slice(0, 200);
  if (typeof body.storePhone === "string") patch.storePhone = body.storePhone.slice(0, 80);
  if (typeof body.storeAddress === "string") patch.storeAddress = body.storeAddress.slice(0, 500);
  if (typeof body.currency === "string") patch.currency = body.currency.slice(0, 5);
  if (typeof body.shippingFlatCents === "number") patch.shippingFlatCents = Math.max(0, Math.trunc(body.shippingFlatCents));
  if (typeof body.freeShippingMinCents === "number") patch.freeShippingMinCents = Math.max(0, Math.trunc(body.freeShippingMinCents));
  if (typeof body.shippingPolicy === "string") patch.shippingPolicy = body.shippingPolicy.slice(0, 4000);
  if (typeof body.returnPolicy === "string") patch.returnPolicy = body.returnPolicy.slice(0, 4000);
  if (Array.isArray(body.paymentMethods)) patch.paymentMethods = body.paymentMethods.slice(0, 12);

  const w = await prisma.website.findUnique({
    where: { id: params.id },
    select: { jsonContent: true },
  });
  const json = (w?.jsonContent ?? {}) as any;
  const merged = { ...(json.storeSettings ?? {}), ...patch };
  const newJson = { ...json, storeSettings: merged };

  await prisma.website.update({
    where: { id: params.id },
    data: { jsonContent: newJson },
  });

  return NextResponse.json({ success: true, settings: merged });
}
