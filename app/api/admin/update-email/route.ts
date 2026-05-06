import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  userId: z.string().min(1),
  // The admin must re-type the target user's Account ID (= User.id) before
  // we'll change their primary email. This is a guardrail against accidentally
  // editing the wrong row.
  accountIdConfirm: z.string().min(1),
  newEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { userId, accountIdConfirm, newEmail } = parsed.data;

  if (accountIdConfirm.trim() !== userId.trim()) {
    return NextResponse.json({ error: "Account ID does not match. Email change blocked." }, { status: 400 });
  }

  // Reject if another account already owns this email.
  const collision = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } });
  if (collision && collision.id !== userId) {
    return NextResponse.json({ error: "That email is already in use by another account." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email: newEmail.toLowerCase(),
      // Clear any pending self-service email change since admin is overriding.
      pendingEmail: null,
      pendingEmailToken: null,
      pendingEmailExpires: null,
    },
  });

  return NextResponse.json({ success: true });
}
