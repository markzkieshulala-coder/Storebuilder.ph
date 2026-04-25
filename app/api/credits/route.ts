import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits, getEditCredits, getNextResetTime, planSlotLimit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";
import { getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.plan as Plan;
  const planInfo = getPlan(plan);

  const [credits, editCredits, websiteCount] = await Promise.all([
    getUserCredits(session.user.id, plan),
    getEditCredits(session.user.id, plan),
    prisma.website.count({ where: { userId: session.user.id } }),
  ]);

  const slotLimit = planSlotLimit(plan);

  return NextResponse.json({
    ...credits,
    resetAt: getNextResetTime().toISOString(),
    plan,
    planLabel: planInfo.label,
    features: planInfo,
    slots: { used: websiteCount, limit: slotLimit, remaining: Math.max(0, slotLimit - websiteCount) },
    edits: editCredits,
    editLimit: 999999,
  });
}
