import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, plan: true, role: true,
        image: true, createdAt: true, planExpiresAt: true,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.plan !== undefined) {
      if (!["FREE", "PRO"].includes(body.plan))
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      data.plan = body.plan;
      if (body.billingDate === undefined) {
        if (body.plan === "PRO") {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          data.planExpiresAt = expiresAt;
        } else {
          data.planExpiresAt = null;
        }
      }
    }

    if (body.billingDate !== undefined) {
      data.planExpiresAt = body.billingDate ? new Date(body.billingDate) : null;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!email.includes("@"))
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing && existing.id !== params.id)
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      data.email = email;
    }

    if (body.role !== undefined) {
      if (!["USER", "ADMIN"].includes(body.role))
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      data.role = body.role;
    }

    if (body.location !== undefined) {
      data.location = body.location ? String(body.location).trim() : null;
    }

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "No changes" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, email: true, plan: true, role: true, planExpiresAt: true },
    });

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
