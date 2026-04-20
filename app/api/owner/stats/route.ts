import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalUsers, proUsers, totalWebsites, activeSubs, users, subscriptions, websites] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { plan: "PRO" } }),
        prisma.website.count(),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, name: true, email: true, plan: true, createdAt: true, isInfluencer: true,
            _count: { select: { websites: true } },
          },
        }),
        prisma.subscription.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, status: true, plan: true, billingCycle: true,
            amount: true, currency: true, paymongoId: true, createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.website.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          select: {
            id: true, name: true, type: true, published: true,
            subdomain: true, customDomain: true, createdAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        }),
      ]);

    return NextResponse.json({
      stats: { totalUsers, proUsers, totalWebsites, monthlyRevenue: proUsers * 499, activeSubs },
      users,
      subscriptions,
      websites,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
