import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.plan !== undefined) {
    if (!["FREE", "PRO"].includes(body.plan))
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    data.plan = body.plan;
    if (body.plan === "PRO") {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      data.planExpiresAt = expiresAt;
    } else {
      data.planExpiresAt = null;
    }
  }

  if (body.role !== undefined) {
    if (!["USER", "ADMIN"].includes(body.role))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    data.role = body.role;
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "No changes" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, plan: true, role: true },
  });

  return NextResponse.json({ success: true, user });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === session.user.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
