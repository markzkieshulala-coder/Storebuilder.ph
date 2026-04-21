import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activeSub = await prisma.subscription.findFirst({
      where: { userId: session.user.id, status: "ACTIVE" },
      select: { id: true },
    });
    if (!activeSub) return NextResponse.json({ error: "No active subscription found" }, { status: 400 });

    await prisma.$transaction([
      prisma.subscription.update({ where: { id: activeSub.id }, data: { status: "CANCELLED" } }),
      prisma.user.update({ where: { id: session.user.id }, data: { plan: "FREE", planExpiresAt: null } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
