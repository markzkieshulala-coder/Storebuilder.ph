import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// DELETE /api/admin/users/[id]/payment-method
// Body: { confirm: "ACCOUNT_ID" } — admin must echo the target user's ID
// as a final guard against accidental clicks.
// Removes the saved paymongoId from all the user's subscriptions and
// cancels any active subscription. Downgrades the user to FREE.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== params.id) {
      return NextResponse.json(
        { error: "Confirmation mismatch: re-type the user's Account ID exactly to confirm." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Subscription" SET "paymongoId" = NULL, status = 'CANCELLED' WHERE "userId" = $1 AND status = 'ACTIVE'`,
        user.id
      );
    } catch (e) { console.error("[admin payment-remove] sub clear:", e); }

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET plan = 'FREE', "planExpiresAt" = NULL, "pendingPlan" = NULL, "pendingPlanAt" = NULL WHERE id = $1`,
        user.id
      );
    } catch (e) { console.error("[admin payment-remove] user clear:", e); }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
