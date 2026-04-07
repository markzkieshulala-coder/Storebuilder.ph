import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [userCount, websiteCount, proCount, logs] = await Promise.all([
    prisma.user.count(),
    prisma.website.count(),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.tokenUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
  ]);

  const totalCostUsd = logs.reduce((s, l) => s + l.costUsd, 0);
  const totalCostPhp = logs.reduce((s, l) => s + l.costPhp, 0);

  return NextResponse.json({
    userCount, websiteCount, proCount, totalCostUsd, totalCostPhp,
    estimatedMRR: proCount * 299,
  });
}
