import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || password.length < 8) {
      return NextResponse.json({ error: "Token and a password of at least 8 characters are required" }, { status: 400 });
    }

    const vt = await prisma.verificationToken.findUnique({ where: { token } });

    if (!vt) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }
    if (vt.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    await prisma.user.updateMany({
      where: { email: vt.identifier },
      data: { password: hashed },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
