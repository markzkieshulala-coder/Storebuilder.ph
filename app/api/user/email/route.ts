import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@"))
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

    const normalized = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
    if (existing && existing.id !== session.user.id)
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    await prisma.user.update({ where: { id: session.user.id }, data: { email: normalized } });
    return NextResponse.json({ success: true, email: normalized });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
