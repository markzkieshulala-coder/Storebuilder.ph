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
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!getPlan(user?.plan).canGenerateCRM) {
    return { error: "Enterprise plan required", status: 403 as const };
  }
  return { website, userId: session.user.id };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string; orderId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorize(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json();
  const data: any = {};
  if (body.status && ["PENDING", "PAID", "CANCELLED", "REFUNDED"].includes(body.status)) {
    data.status = body.status;
    if (body.status === "PAID") data.paidAt = new Date();
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 4000);

  const order = await prisma.storeOrder.update({
    where: { id: params.orderId },
    data,
  });

  // If marking paid, increment customer totalSpent
  if (body.status === "PAID" && order.customerEmail) {
    try {
      await prisma.storeCustomer.update({
        where: { websiteId_email: { websiteId: auth.website.id, email: order.customerEmail.toLowerCase() } },
        data: { totalSpentCents: { increment: order.totalCents } },
      });
    } catch {/* customer might not exist if email was missing; ignore */}
  }

  return NextResponse.json({ order });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; orderId: string } }) {
  await ensureSchemaMigrations();
  const auth = await authorize(params.id);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await prisma.storeOrder.delete({ where: { id: params.orderId } });
  return NextResponse.json({ success: true });
}
