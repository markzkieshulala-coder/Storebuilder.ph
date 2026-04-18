import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, status: true, user: { select: { id: true } } },
    });

    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    if (sub.status !== "ACTIVE") return NextResponse.json({ error: "Only active subscriptions can be refunded" }, { status: 400 });

    await Promise.all([
      prisma.subscription.update({ where: { id: subscriptionId }, data: { status: "CANCELLED" } }),
      prisma.user.update({ where: { id: sub.user.id }, data: { plan: "FREE" } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
