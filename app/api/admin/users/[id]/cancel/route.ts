import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// POST /api/admin/users/[id]/cancel
// Body: { immediate: boolean }
//   immediate=true  → downgrade plan to FREE right now, cancel active sub
//   immediate=false → schedule deferred downgrade (pendingPlan=FREE at period end)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaMigrations();
    const { immediate } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, plan: true, planExpiresAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.plan === "FREE") {
      return NextResponse.json({ error: "User is already on Free plan" }, { status: 400 });
    }

    if (immediate) {
      // Cancel active subscription immediately
      try {
        await prisma.subscription.updateMany({
          where: { userId: params.id, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });
      } catch { /* non-fatal */ }

      // Downgrade plan to FREE now
      await prisma.user.update({
        where: { id: params.id },
        data: {
          plan: "FREE",
          planExpiresAt: null,
          pendingPlan: null,
          pendingPlanAt: null,
        },
      });

      return NextResponse.json({ success: true, immediate: true, plan: "FREE" });
    } else {
      // Deferred: user keeps access until period end
      let activeSub: { id: string; currentPeriodEnd: Date | null } | null = null;
      try {
        activeSub = await prisma.subscription.findFirst({
          where: { userId: params.id, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: { id: true, currentPeriodEnd: true },
        });
      } catch { activeSub = null; }

      const endsAt =
        activeSub?.currentPeriodEnd ??
        user.planExpiresAt ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      if (activeSub) {
        try {
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: { cancelAtPeriodEnd: true, currentPeriodEnd: endsAt },
          });
        } catch { /* legacy DB missing column */ }
      }

      await prisma.user.update({
        where: { id: params.id },
        data: { pendingPlan: "FREE", pendingPlanAt: endsAt },
      });

      return NextResponse.json({
        success: true,
        immediate: false,
        endsAt: endsAt.toISOString(),
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// DELETE → undo a deferred cancel
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaMigrations();
    try {
      await prisma.subscription.updateMany({
        where: { userId: params.id, cancelAtPeriodEnd: true },
        data: { cancelAtPeriodEnd: false },
      });
    } catch { /* legacy DB */ }

    await prisma.user.update({
      where: { id: params.id },
      data: { pendingPlan: null, pendingPlanAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
