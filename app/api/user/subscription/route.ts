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
      // Legacy DB — try the same query without the new columns
      try {
        subscription = await prisma.subscription.findFirst({
          where: { userId: session.user.id, status: "ACTIVE" },
          select: {
            id: true, status: true, plan: true, billingCycle: true,
            amount: true, currency: true, createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        if (subscription) {
          subscription.currentPeriodEnd = null;
          subscription.cancelAtPeriodEnd = false;
        }
      } catch { subscription = null; }
    }

    // Read user core fields — never includes pendingPlan in the select
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    });

    // Read pendingPlan/pendingPlanAt via raw SQL so a missing column never 500s.
    let pendingPlan: string | null = null;
    let pendingPlanAt: Date | null = null;
    try {
      const rows = await prisma.$queryRawUnsafe<{ pendingPlan: string | null; pendingPlanAt: Date | null }[]>(
        `SELECT "pendingPlan"::text AS "pendingPlan", "pendingPlanAt" FROM "User" WHERE id = $1 LIMIT 1`,
        session.user.id
      );
      pendingPlan = rows[0]?.pendingPlan ?? null;
      pendingPlanAt = rows[0]?.pendingPlanAt ?? null;
    } catch { /* columns absent */ }

    // Derived server-side flag so the UI doesn't need to re-implement the logic.
    // Covers three paths:
    //   1. Subscription-level deferred cancel (cancelAtPeriodEnd=true)
    //   2. User-level deferred cancel (pendingPlan=FREE)
    //   3. planExpiresAt fallback when pendingPlan column write failed
    const isCancelScheduled = !!(
      subscription?.cancelAtPeriodEnd ||
      pendingPlan === "FREE" ||
      (pendingPlan === null && user?.planExpiresAt && user.plan !== "FREE")
    );

    return NextResponse.json({
      subscription,
      pending: user
        ? {
            plan: user.plan,
            pendingPlan,
            pendingPlanAt,
            planExpiresAt: user.planExpiresAt,
            isCancelScheduled,
          }
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
