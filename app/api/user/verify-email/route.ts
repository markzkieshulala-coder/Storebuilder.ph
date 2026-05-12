import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { sendAccountVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST /api/user/verify-email
// Generates a 24h token, stores it on the User row, and emails the user a
// "Tap this link to verify your account" message. Re-callable — every call
// invalidates the previous token (we overwrite it).
export async function POST(_req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
    if (!me?.email) {
      return NextResponse.json(
        { error: "Your account does not have an email on file." },
        { status: 400 }
      );
    }
    if (me.emailVerified) {
      return NextResponse.json(
        { success: true, alreadyVerified: true, message: "Your email is already verified." }
      );
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "emailVerifyToken" = $1, "emailVerifyExpires" = $2 WHERE id = $3`,
        token, expires, me.id
      );
    } catch (e) {
      console.error("[verify-email] token store:", e);
      return NextResponse.json(
        { error: "Could not generate verification token. Please try again." },
        { status: 500 }
      );
    }

    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${base}/auth/verify-email?token=${token}`;

    try {
      await sendAccountVerificationEmail({
        to: me.email,
        name: me.name || me.email,
        verifyUrl,
      });
    } catch (e: any) {
      console.error("[verify-email] send failure:", e);
      return NextResponse.json(
        { error: `Email service unavailable: ${e?.message || "unknown error"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Verification link sent to ${me.email}. Check your inbox — the link expires in 24 hours.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// GET /api/user/verify-email?token=... — public, completes verification
// (also reachable via the /auth/verify-email page which calls this).
export async function GET(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<{ id: string; emailVerifyExpires: Date | null; email: string | null }[]>(
      `SELECT id, "emailVerifyExpires", email FROM "User" WHERE "emailVerifyToken" = $1 LIMIT 1`,
      token
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    if (row.emailVerifyExpires && new Date(row.emailVerifyExpires) < new Date()) {
      return NextResponse.json({ error: "This link has expired. Request a new one." }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "emailVerified" = NOW(), "emailVerifyToken" = NULL, "emailVerifyExpires" = NULL WHERE id = $1`,
      row.id
    );

    return NextResponse.json({ success: true, email: row.email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Verification failed" }, { status: 500 });
  }
}
