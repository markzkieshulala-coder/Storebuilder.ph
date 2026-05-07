import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cancellation is DEFERRED — we don't downgrade the user immediately. We mark
// the active subscription cancelAtPeriodEnd and stamp pendingPlan=FREE on the
// user, with pendingPlanAt = currentPeriodEnd (or planExpiresAt as fallback).
// The jwt callback in lib/auth.ts resolves the deferred downgrade lazily on
// the next sign-in / session refresh once that date passes.
//
// Defensive notes:
// - The Subscription update is wrapped so a missing/legacy column (e.g. on a
//   DB that hasn't received `prisma db push` for cancelAtPeriodEnd yet) doesn't
//   500 the whole request — the user.pendingPlan stamp is the source of truth.
// - The endpoint also succeeds idempotently if a cancellation is already
//   pending, so the UI never shows a confusing error on a double click.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, planExpiresAt: true, pendingPlan: true, pendingPlanAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.plan === "FREE") {
      return NextResponse.json({ error: "Already on Free plan" }, { status: 400 });
    }

    let activeSub: { id: string; currentPeriodEnd: Date | null } | null = null;
    try {
      activeSub = await prisma.subscription.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, currentPeriodEnd: true },
      });
    } catch {
      activeSub = null;
    }

    const endsAt =
      activeSub?.currentPeriodEnd ??
      user.planExpiresAt ??
      user.pendingPlanAt ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (activeSub) {
      try {
        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: { cancelAtPeriodEnd: true, currentPeriodEnd: endsAt },
        });
      } catch {
        // Column missing on legacy DB — fall back to user-level stamp only.
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingPlan: "FREE", pendingPlanAt: endsAt },
    });

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
      await prisma.subscription.updateMany({
        where: { userId: session.user.id, cancelAtPeriodEnd: true },
        data: { cancelAtPeriodEnd: false },
      });
    } catch {
      // Column missing — undoing only the user-level pending stamp is enough.
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { pendingPlan: null, pendingPlanAt: null },
    });

    return NextResponse.json({ success: true, cancelAtPeriodEnd: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
