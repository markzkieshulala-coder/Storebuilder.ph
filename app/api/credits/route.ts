import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits, getEditCredits, getNextResetTime, FREE_SLOT_LIMIT, PRO_SLOT_LIMIT, FREE_DAILY_EDIT_LIMIT, PRO_DAILY_EDIT_LIMIT } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.plan as Plan;
  const [credits, editCredits, websiteCount] = await Promise.all([
    getUserCredits(session.user.id, plan),
    getEditCredits(session.user.id, plan),
    prisma.website.count({ where: { userId: session.user.id } }),
  ]);

  const slotLimit = plan === Plan.PRO ? PRO_SLOT_LIMIT : FREE_SLOT_LIMIT;

  return NextResponse.json({
    ...credits,
    resetAt: getNextResetTime().toISOString(),
    plan,
    slots: { used: websiteCount, limit: slotLimit, remaining: Math.max(0, slotLimit - websiteCount) },
    edits: editCredits,
    editLimit: plan === Plan.PRO ? PRO_DAILY_EDIT_LIMIT : FREE_DAILY_EDIT_LIMIT,
  });
}
