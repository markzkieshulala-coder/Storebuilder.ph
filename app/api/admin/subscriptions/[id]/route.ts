import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["ACTIVE", "CANCELLED", "EXPIRED", "PENDING"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const sub = await prisma.subscription.update({
    where: { id: params.id },
    data: { status },
  });

  // Sync the user's plan when subscription status changes
  if (status === "ACTIVE") {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await prisma.user.update({
      where: { id: sub.userId },
      data: { plan: "PRO", planExpiresAt: expiresAt },
    });
  } else if (status === "CANCELLED" || status === "EXPIRED") {
    // Only downgrade if no other active subscription exists
    const otherActive = await prisma.subscription.count({
      where: { userId: sub.userId, status: "ACTIVE", id: { not: params.id } },
    });
    if (otherActive === 0) {
      await prisma.user.update({
        where: { id: sub.userId },
        data: { plan: "FREE", planExpiresAt: null },
      });
    }
  }

  return NextResponse.json({ success: true });
}
