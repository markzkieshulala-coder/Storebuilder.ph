import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserCredits, getNextResetTime } from "@/lib/credits";
import { Plan } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(
    session.user.id,
    session.user.plan as Plan
  );

  return NextResponse.json({
    ...credits,
    resetAt: getNextResetTime().toISOString(),
    plan: session.user.plan,
  });
}
