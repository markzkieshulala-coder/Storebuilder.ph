import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { sendPaymentRemovalConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

// POST: Initiates payment-method removal. Sends a 30-minute confirmation
// link to the user's current email. Removal only completes when the user
// clicks the link.
export async function POST(_req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });
    if (!me?.email) return NextResponse.json({ error: "No email on file" }, { status: 400 });

    // Check there is actually something to remove.
    let hasMethod = false;
    try {
      const subs = await prisma.subscription.findFirst({
        where: { userId: me.id, paymongoId: { not: null } },
        select: { id: true },
      });
      hasMethod = !!subs;
    } catch { /* ignore */ }
    if (!hasMethod) {
      return NextResponse.json({ error: "No saved payment method to remove." }, { status: 400 });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "paymentRemovalToken" = $1, "paymentRemovalExpires" = $2 WHERE id = $3`,
        token, expires, me.id
      );
    } catch (e) {
      console.error("[payment-remove] token store:", e);
      return NextResponse.json({ error: "Could not store removal token." }, { status: 500 });
    }

    const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${base}/dashboard/settings/confirm-payment-removal?token=${token}`;

    try {
      await sendPaymentRemovalConfirmation({
        to: me.email,
        name: me.name || me.email,
        verifyUrl,
      });
    } catch (e: any) {
      console.error("[payment-remove] email:", e);
      return NextResponse.json(
        { error: `Email service unavailable: ${e?.message || "unknown error"}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Confirmation link sent to ${me.email}. Open it within 30 minutes to remove your payment method.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
