import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// POST /api/admin/users/[id]/cancel
// Body: { immediate: boolean }
//   immediate=true  → downgrade plan to FREE right now, cancel active sub
//   immediate=false → schedule deferred downgrade (pendingPlan=FREE at period end)
//
// All operations on pendingPlan / cancelAtPeriodEnd / currentPeriodEnd run as
// raw SQL inside try/catch so a missing column on a legacy DB never 500s.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaMigrations();
    const { immediate } = await req.json().catch(() => ({} as any));

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, plan: true, planExpiresAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.plan === "FREE") {
      return NextResponse.json({ error: "User is already on Free plan" }, { status: 400 });
    }

    if (immediate) {
      try {
        await prisma.subscription.updateMany({
          where: { userId: params.id, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });
      } catch (e) { console.error("[admin cancel] sub cancel:", e); }

      await prisma.user.update({
        where: { id: params.id },
        data: { plan: "FREE", planExpiresAt: null },
      });

      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "pendingPlan" = NULL, "pendingPlanAt" = NULL WHERE id = $1`,
          params.id
        );
      } catch { /* legacy DB */ }

      return NextResponse.json({ success: true, immediate: true, plan: "FREE" });
    }

    // Deferred
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
        await prisma.$executeRawUnsafe(
          `UPDATE "Subscription" SET "cancelAtPeriodEnd" = true, "currentPeriodEnd" = $1 WHERE id = $2`,
          endsAt, activeSub.id
        );
      } catch (e) { console.error("[admin cancel] sub deferred:", e); }
    }

    let pendingWritten = false;
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "pendingPlan" = 'FREE'::"Plan", "pendingPlanAt" = $1 WHERE id = $2`,
        endsAt, params.id
      );
      pendingWritten = true;
    } catch (e) { console.error("[admin cancel] pendingPlan write:", e); }

    if (!pendingWritten) {
      try {
        await prisma.user.update({
          where: { id: params.id },
          data: { planExpiresAt: endsAt },
        });
      } catch (e) { console.error("[admin cancel] planExpiresAt fallback:", e); }
    }

    return NextResponse.json({
      success: true,
      immediate: false,
      endsAt: endsAt.toISOString(),
    });
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
      await prisma.$executeRawUnsafe(
        `UPDATE "Subscription" SET "cancelAtPeriodEnd" = false WHERE "userId" = $1 AND "cancelAtPeriodEnd" = true`,
        params.id
      );
    } catch { /* legacy DB */ }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "pendingPlan" = NULL, "pendingPlanAt" = NULL WHERE id = $1`,
        params.id
      );
    } catch { /* legacy DB */ }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
