import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// GET /api/user/payment-method/confirm?token=...
// Completes payment-method removal initiated by POST /api/user/payment-method/remove.
// Authenticates by the token only (so the link from email works even if not signed in).
// On success: clears paymongoId on active subscriptions, cancels them, and
// returns the user to a confirmation screen.
export async function GET(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<{ id: string; paymentRemovalExpires: Date | null }[]>(
      `SELECT id, "paymentRemovalExpires" FROM "User" WHERE "paymentRemovalToken" = $1 LIMIT 1`,
      token
    );
    const row = rows[0];
    if (!row) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    if (row.paymentRemovalExpires && new Date(row.paymentRemovalExpires) < new Date()) {
      return NextResponse.json({ error: "This link has expired. Request a new one." }, { status: 400 });
    }

    // Clear payment method + cancel active subs + downgrade to FREE.
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Subscription" SET "paymongoId" = NULL, status = 'CANCELLED' WHERE "userId" = $1 AND status = 'ACTIVE'`,
        row.id
      );
    } catch (e) { console.error("[payment-confirm] sub clear:", e); }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET plan = 'FREE', "planExpiresAt" = NULL, "pendingPlan" = NULL, "pendingPlanAt" = NULL,
         "paymentRemovalToken" = NULL, "paymentRemovalExpires" = NULL WHERE id = $1`,
        row.id
      );
    } catch (e) { console.error("[payment-confirm] user clear:", e); }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Confirmation failed" }, { status: 500 });
  }
}
