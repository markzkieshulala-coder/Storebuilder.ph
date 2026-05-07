import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInfluencerColumn } from "@/lib/influencer-column";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, plan } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!["FREE", "PRO", "ENTERPRISE"].includes(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();
    const found = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (!found) return NextResponse.json({ error: "No account found with that email address" }, { status: 404 });

    await ensureSchemaMigrations();
    await ensureInfluencerColumn();
    await prisma.$executeRaw`UPDATE "User" SET "isInfluencer" = true WHERE "id" = ${found.id}`;
    const user = await prisma.user.update({
      where: { id: found.id },
      data: { plan: plan as "FREE" | "PRO" | "ENTERPRISE" },
      select: { id: true, email: true, name: true, plan: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await ensureInfluencerColumn();
    await prisma.$executeRaw`UPDATE "User" SET "isInfluencer" = false WHERE "id" = ${userId}`;
    // Remove influencer also reverts plan to FREE (it was set to ENTERPRISE on grant)
    await prisma.user.update({
      where: { id: userId },
      data: { plan: "FREE", planExpiresAt: null },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
