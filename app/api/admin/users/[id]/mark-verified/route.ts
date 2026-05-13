import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

// POST /api/admin/users/[id]/mark-verified
// Body: { accountId: string }
// Admin-only "Verify by Account ID" — directly flips emailVerified on the
// target user. Requires the admin to type the user's account ID to confirm
// they meant THIS user (a small footgun guard so a misclick can't verify
// the wrong account).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if ((session as any).user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const provided: string = String(body?.accountId ?? "").trim();
    if (!provided) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }
    if (provided !== params.id) {
      return NextResponse.json({ error: "Account ID does not match this user" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true, message: "User was already verified" });
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({
      success: true,
      alreadyVerified: false,
      message: `${user.email || "User"} marked verified.`,
    });
  } catch (e: any) {
    console.error("[admin mark-verified]", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
