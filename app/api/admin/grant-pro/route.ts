import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Updates a user's plan (Free / Pro / Enterprise) and optional influencer flag.
// Kept at the legacy "grant-pro" path for backwards compatibility; the body now
// carries a `plan` field so admins can assign any tier from a single dropdown.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, plan, isInfluencer } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const allowed = ["FREE", "PRO", "ENTERPRISE"] as const;
  type AllowedPlan = (typeof allowed)[number];
  const data: {
    plan?: AllowedPlan;
    planExpiresAt?: Date | null;
    isInfluencer?: boolean;
    pendingPlan?: null;
    pendingPlanAt?: null;
  } = {};

  if (plan !== undefined) {
    if (!allowed.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    data.plan = plan;
    if (plan === "FREE") {
      data.planExpiresAt = null;
    } else {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      data.planExpiresAt = expires;
    }
    // Admin override clears any pending downgrade.
    data.pendingPlan = null;
    data.pendingPlanAt = null;
  }

  if (typeof isInfluencer === "boolean") {
    data.isInfluencer = isInfluencer;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ success: true });
}
