import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

// Two cancellation modes:
//   POST   { immediate: true }  → downgrade to FREE NOW; cancel active sub
//   POST   { immediate: false } → deferred (default); keep access until period end
//   DELETE                       → undo deferred cancel
//
// Designed to never 500 even when the DB is missing pendingPlan/pendingPlanAt
// columns: every operation that touches those columns is wrapped in raw SQL
// with try/catch fallbacks. As a last resort, we persist the cancel intent via
// `planExpiresAt` so the auth.ts JWT callback can still complete the downgrade.
export async function POST(req: Request) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const immediate = !!body?.immediate;

    // Read user WITHOUT pendingPlan in select — never crashes on legacy DB
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, planExpiresAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.plan === "FREE") {
      return NextResponse.json({ error: "Already on Free plan" }, { status: 400 });
    }

    // ── Immediate cancel ────────────────────────────────────────────────────
    if (immediate) {
      try {
        await prisma.subscription.updateMany({
          where: { userId: user.id, status: "ACTIVE" },
          data: { status: "CANCELLED" },
        });
      } catch (e) { console.error("[cancel] sub cancel failed:", e); }

      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "FREE", planExpiresAt: null },
      });

      // Best-effort: clear pending fields if they exist
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET "pendingPlan" = NULL, "pendingPlanAt" = NULL WHERE id = $1`,
          user.id
        );
      } catch { /* columns missing — fine */ }

      return NextResponse.json({ success: true, immediate: true, plan: "FREE" });
    }

    // ── Deferred cancel ─────────────────────────────────────────────────────
    let activeSub: { id: string; currentPeriodEnd: Date | null } | null = null;
    try {
      activeSub = await prisma.subscription.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
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
      } catch (e) { console.error("[cancel] sub deferred update:", e); }
    }

    // Try to set pendingPlan via raw SQL — graceful when the column is absent.
    let pendingWritten = false;
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "pendingPlan" = 'FREE'::"Plan", "pendingPlanAt" = $1 WHERE id = $2`,
        endsAt, user.id
      );
      pendingWritten = true;
    } catch (e) { console.error("[cancel] pendingPlan write:", e); }

    // Fallback: at minimum stamp planExpiresAt so the JWT callback can
    // still complete the downgrade once the date passes.
    if (!pendingWritten) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { planExpiresAt: endsAt },
        });
      } catch (e) { console.error("[cancel] planExpiresAt fallback:", e); }
    }

    return NextResponse.json({
      success: true,
      message: `Cancellation scheduled. You keep ${user.plan} access until ${endsAt.toISOString().slice(0, 10)}.`,
      endsAt,
      cancelAtPeriodEnd: true,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// Undo a scheduled cancellation while still in the current billing period.
export async function DELETE() {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Subscription" SET "cancelAtPeriodEnd" = false WHERE "userId" = $1 AND "cancelAtPeriodEnd" = true`,
        session.user.id
      );
    } catch { /* legacy DB */ }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "pendingPlan" = NULL, "pendingPlanAt" = NULL WHERE id = $1`,
        session.user.id
      );
    } catch { /* legacy DB */ }

    return NextResponse.json({ success: true, cancelAtPeriodEnd: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
