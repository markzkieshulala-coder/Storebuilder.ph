import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInfluencerColumn } from "@/lib/influencer-column";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { getPhilippineMonth, planSlotLimit } from "@/lib/credits";
import { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureInfluencerColumn();

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, emailVerified: true, plan: true, role: true,
        image: true, createdAt: true, planExpiresAt: true,
        _count: { select: { websites: true } },
        websites: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, name: true, type: true, published: true,
            subdomain: true, customDomain: true, createdAt: true,
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch subscriptions — try with new columns first, fall back without them
    let subscriptions: any[] = [];
    try {
      subscriptions = await prisma.subscription.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, plan: true, billingCycle: true,
          amount: true, currency: true, paymongoId: true, createdAt: true,
          cancelAtPeriodEnd: true, currentPeriodEnd: true,
        },
      });
    } catch {
      try {
        subscriptions = await prisma.subscription.findMany({
          where: { userId: params.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true, status: true, plan: true, billingCycle: true,
            amount: true, currency: true, paymongoId: true, createdAt: true,
          },
        });
        subscriptions = subscriptions.map((s) => ({ ...s, cancelAtPeriodEnd: false, currentPeriodEnd: null }));
      } catch { subscriptions = []; }
    }

    // isInfluencer
    const infRows = await prisma.$queryRaw<{ isInfluencer: boolean }[]>`SELECT "isInfluencer" FROM "User" WHERE "id" = ${params.id}`;
    const isInfluencer = infRows[0]?.isInfluencer ?? false;

    // Deferred-cancel state via raw SQL — graceful when columns absent
    let pendingPlan: string | null = null;
    let pendingPlanAt: Date | null = null;
    try {
      const pRows = await prisma.$queryRawUnsafe<{ pendingPlan: string | null; pendingPlanAt: Date | null }[]>(
        `SELECT "pendingPlan"::text AS "pendingPlan", "pendingPlanAt" FROM "User" WHERE id = $1 LIMIT 1`,
        params.id
      );
      pendingPlan = pRows[0]?.pendingPlan ?? null;
      pendingPlanAt = pRows[0]?.pendingPlanAt ?? null;
    } catch { /* columns absent */ }

    // Location via raw SQL
    let location: string | null = null;
    try {
      const locRows = await prisma.$queryRawUnsafe<{ location: string | null }[]>(
        `SELECT "location" FROM "User" WHERE id = $1 LIMIT 1`,
        params.id
      );
      location = locRows[0]?.location ?? null;
    } catch { /* column absent */ }

    // Current-month website generation usage (the same counter that
    // /api/generate consumes against). Surfaced so admins can see the
    // user's quota state and reset it from the UI.
    const month = getPhilippineMonth();
    const usageRow = await prisma.creditUsage.findUnique({
      where: { userId_date: { userId: params.id, date: month } },
      select: { count: true },
    });
    const genUsed = usageRow?.count ?? 0;
    const genLimit = planSlotLimit(user.plan as Plan);
    const generation = {
      month,
      used: genUsed,
      limit: genLimit,
      remaining: Math.max(0, genLimit - genUsed),
    };

    return NextResponse.json({
      user: { ...user, isInfluencer, location, subscriptions, pendingPlan, pendingPlanAt, generation },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureSchemaMigrations();
    await ensureInfluencerColumn();
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.plan !== undefined) {
      if (!["FREE", "PRO", "ENTERPRISE"].includes(body.plan))
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      data.plan = body.plan;
      if (body.billingDate === undefined) {
        if (body.plan === "FREE") {
          data.planExpiresAt = null;
        } else {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          data.planExpiresAt = expiresAt;
        }
      }
    }

    if (body.billingDate !== undefined) {
      data.planExpiresAt = body.billingDate ? new Date(body.billingDate) : null;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!email.includes("@"))
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing && existing.id !== params.id)
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      data.email = email;
    }

    if (body.role !== undefined) {
      if (!["USER", "ADMIN"].includes(body.role))
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      data.role = body.role;
    }

    if (body.location !== undefined) {
      data.location = body.location ? String(body.location).trim() : null;
    }

    // isInfluencer handled separately via raw SQL because the column isn't
    // part of the Prisma schema yet. When flipping to true we also bump the
    // plan to ENTERPRISE (and a 1-year expiry) so the user gets the benefits
    // associated with that tier.
    const isInfluencerUpdate = typeof body.isInfluencer === "boolean" ? body.isInfluencer : null;
    if (isInfluencerUpdate === true && body.plan === undefined) {
      data.plan = "ENTERPRISE";
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      data.planExpiresAt = expiresAt;
    }
    if (isInfluencerUpdate === false && body.plan === undefined) {
      data.plan = "FREE";
      data.planExpiresAt = null;
    }

    if (Object.keys(data).length === 0 && isInfluencerUpdate === null)
      return NextResponse.json({ error: "No changes" }, { status: 400 });

    let user = null;
    if (Object.keys(data).length > 0) {
      user = await prisma.user.update({
        where: { id: params.id },
        data,
        select: { id: true, email: true, plan: true, role: true, planExpiresAt: true },
      });
    }

    if (isInfluencerUpdate !== null) {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "isInfluencer" = $1 WHERE id = $2`,
        isInfluencerUpdate,
        params.id
      );
    }

    return NextResponse.json({ success: true, user, isInfluencer: isInfluencerUpdate });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
