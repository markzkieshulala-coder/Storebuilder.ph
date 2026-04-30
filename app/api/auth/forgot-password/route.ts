import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalised = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalised } });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({ ok: true });
    }

    // Delete any existing token for this email
    await prisma.verificationToken.deleteMany({ where: { identifier: normalised } });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: normalised, token, expires },
    });

    await sendPasswordResetEmail(normalised, token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
