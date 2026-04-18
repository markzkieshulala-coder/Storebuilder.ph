import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalUsers, proUsers, totalWebsites, activeSubs, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: "PRO" } }),
      prisma.website.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          createdAt: true,
          _count: { select: { websites: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        proUsers,
        totalWebsites,
        monthlyRevenue: proUsers * 499,
        activeSubs,
      },
      users,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
