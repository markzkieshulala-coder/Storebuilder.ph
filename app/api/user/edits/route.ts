import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEditCredits, consumeEditCredit } from "@/lib/credits";
import { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const credits = await getEditCredits(session.user.id, session.user.plan as Plan);
  return NextResponse.json(credits);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credits = await getEditCredits(session.user.id, session.user.plan as Plan);
  if (!credits.canEdit) {
    return NextResponse.json(
      { error: `Daily edit limit of ${credits.limit} reached. Resets tomorrow.`, code: "EDIT_LIMIT" },
      { status: 429 }
    );
  }

  await consumeEditCredit(session.user.id);
  return NextResponse.json({ success: true, remaining: credits.remaining - 1 });
}
