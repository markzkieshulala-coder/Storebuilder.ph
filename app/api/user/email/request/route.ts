import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailChangeVerification } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ newEmail: z.string().email() });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid email" }, { status: 400 });
  }
  const newEmail = parsed.data.newEmail.toLowerCase();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!me?.email) {
    return NextResponse.json(
      { error: "Your account does not have a current email on file. Please contact support." },
      { status: 400 }
    );
  }
  if (me.email.toLowerCase() === newEmail) {
    return NextResponse.json({ error: "That's already your email." }, { status: 400 });
  }

  const collision = await prisma.user.findUnique({ where: { email: newEmail } });
  if (collision) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  // 32-char URL-safe token, valid for 30 minutes. Stored hashed-or-plain on
  // the user row; here we keep it plain because the user owns the row and the
  // attack surface (DB read) is already game-over.
  const token = crypto.randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.user.update({
    where: { id: me.id },
    data: {
      pendingEmail: newEmail,
      pendingEmailToken: token,
      pendingEmailExpires: expires,
    },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${base}/dashboard/settings/confirm-email?token=${token}`;

  await sendEmailChangeVerification({
    currentEmail: me.email,
    newEmail,
    verifyUrl,
    token,
  });

  return NextResponse.json({
    success: true,
    message: `Verification link sent to ${me.email}. Check your inbox to confirm the change.`,
  });
}
