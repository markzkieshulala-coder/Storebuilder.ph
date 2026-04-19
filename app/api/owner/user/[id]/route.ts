import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, plan: true, role: true,
        image: true, createdAt: true,
        _count: { select: { websites: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, status: true, plan: true, billingCycle: true,
            amount: true, currency: true, paymongoId: true, createdAt: true,
          },
        },
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
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
