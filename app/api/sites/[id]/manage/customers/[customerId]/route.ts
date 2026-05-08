import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { getPlan } from "@/lib/plans";

async function authorize(siteId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 as const };
  const website = await prisma.website.findFirst({
    where: { id: siteId, userId: session.user.id },
    select: { id: true },
  });
  if (!website) return { error: "Not found", status: 404 as const };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
  if (!getPlan(user?.plan).canGenerateCRM) return { error: "Enterprise plan required", status: 403 as const };
  return { website };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; customerId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorize(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const data: any = {};
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 4000);
  if (body.tags !== undefined) data.tags = String(body.tags).slice(0, 200);
  if (body.name !== undefined) data.name = String(body.name).slice(0, 200);
  if (body.phone !== undefined) data.phone = String(body.phone).slice(0, 50);

  const customer = await prisma.storeCustomer.update({
    where: { id: params.customerId },
    data,
  });
  return NextResponse.json({ customer });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; customerId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorize(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await prisma.storeCustomer.delete({ where: { id: params.customerId } });
  return NextResponse.json({ success: true });
}
