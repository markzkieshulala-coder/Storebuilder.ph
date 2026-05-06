import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cancellation is DEFERRED — we don't downgrade the user immediately. We mark
// the active subscription cancelAtPeriodEnd and stamp pendingPlan=FREE on the
// user, with pendingPlanAt = currentPeriodEnd (or planExpiresAt as fallback).
// The jwt callback in lib/auth.ts resolves the deferred downgrade lazily on
// the next sign-in / session refresh once that date passes.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, plan: true, planExpiresAt: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.plan === "FREE") {
      return NextResponse.json({ error: "Already on Free plan" }, { status: 400 });
    }

    const activeSub = await prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    const endsAt =
      activeSub?.currentPeriodEnd ??
      user.planExpiresAt ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (activeSub) {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { cancelAtPeriodEnd: true, currentPeriodEnd: endsAt },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingPlan: "FREE", pendingPlanAt: endsAt },
    });

    return NextResponse.json({
      success: true,
      message: `Cancellation scheduled. You keep ${user.plan} access until ${endsAt.toISOString().slice(0, 10)}.`,
      endsAt,
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

    await prisma.subscription.updateMany({
      where: { userId: session.user.id, cancelAtPeriodEnd: true },
      data: { cancelAtPeriodEnd: false },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pendingPlan: null, pendingPlanAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
