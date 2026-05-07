import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: {
        id: true, status: true, plan: true, billingCycle: true,
        amount: true, currency: true, createdAt: true,
        currentPeriodEnd: true, cancelAtPeriodEnd: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ subscription });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
