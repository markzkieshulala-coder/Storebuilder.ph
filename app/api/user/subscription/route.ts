import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let subscription: any = null;
    try {
      subscription = await prisma.subscription.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        select: {
          id: true, status: true, plan: true, billingCycle: true,
          amount: true, currency: true, createdAt: true,
          currentPeriodEnd: true, cancelAtPeriodEnd: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      subscription = null;
    }

    // Always include user-level pending plan info so the UI can reflect a
    // scheduled cancellation even when there's no Subscription row (e.g. for
    // admin-granted plans without a real PayMongo record).
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true, pendingPlan: true, pendingPlanAt: true },
    });

    return NextResponse.json({
      subscription,
      pending: user
        ? {
            plan: user.plan,
            pendingPlan: user.pendingPlan,
            pendingPlanAt: user.pendingPlanAt,
            planExpiresAt: user.planExpiresAt,
          }
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
