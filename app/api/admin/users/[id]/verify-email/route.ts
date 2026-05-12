import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { sendAccountVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Admin-triggered "Send Verification Link" — generates the same 24h token
// and emails it to the target user. Restricted to ADMIN role.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, emailVerified: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "User has no email on file" }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "emailVerifyToken" = $1, "emailVerifyExpires" = $2 WHERE id = $3`,
        token, expires, user.id
      );
    } catch (e) {
      console.error("[admin verify-email] token store:", e);
      return NextResponse.json({ error: "Could not generate token" }, { status: 500 });
    }

    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${base}/auth/verify-email?token=${token}`;

    try {
      await sendAccountVerificationEmail({
        to: user.email,
        name: user.name || user.email,
        verifyUrl,
      });
    } catch (e: any) {
      console.error("[admin verify-email] send failure:", e);
      return NextResponse.json(
        { error: `Email service unavailable: ${e?.message || "unknown error"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification link sent to ${user.email}.`,
      alreadyVerified: !!user.emailVerified,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
