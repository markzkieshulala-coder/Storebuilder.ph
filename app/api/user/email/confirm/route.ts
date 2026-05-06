import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      pendingEmail: true,
      pendingEmailToken: true,
      pendingEmailExpires: true,
    },
  });
  if (!me?.pendingEmail || !me.pendingEmailToken) {
    return NextResponse.json({ error: "No email change pending." }, { status: 400 });
  }
  if (me.pendingEmailToken !== token) {
    return NextResponse.json({ error: "Invalid or expired confirmation token." }, { status: 400 });
  }
  if (!me.pendingEmailExpires || me.pendingEmailExpires.getTime() < Date.now()) {
    await prisma.user.update({
      where: { id: me.id },
      data: { pendingEmail: null, pendingEmailToken: null, pendingEmailExpires: null },
    });
    return NextResponse.json({ error: "Confirmation link has expired. Please request a new one." }, { status: 400 });
  }

  // Double-check the email isn't snatched in the window between request and confirm.
  const collision = await prisma.user.findUnique({ where: { email: me.pendingEmail } });
  if (collision && collision.id !== me.id) {
    await prisma.user.update({
      where: { id: me.id },
      data: { pendingEmail: null, pendingEmailToken: null, pendingEmailExpires: null },
    });
    return NextResponse.json({ error: "That email was just claimed by another account." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      email: me.pendingEmail,
      emailVerified: new Date(),
      pendingEmail: null,
      pendingEmailToken: null,
      pendingEmailExpires: null,
    },
  });

  return NextResponse.json({ success: true, email: me.pendingEmail });
}
