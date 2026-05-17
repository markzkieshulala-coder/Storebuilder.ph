import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// One-shot recovery endpoint. Sets User.image = NULL for the given email
// ONLY IF the current value is a data URI. Used to break the HTTP 431 loop
// caused by base64 avatars being copied into the JWT cookie. Does not delete
// any other user data — email, password, websites, settings are untouched.
//
// Usage: GET /api/admin/fix-avatar?email=you@example.com
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "Missing ?email=<your-email> query parameter" },
      { status: 400 }
    );
  }

  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; image: string | null }[]>(
      `SELECT id, image FROM "User" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      email
    );
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: "No account with that email" }, { status: 404 });
    }

    const wasDataUri = !!user.image?.startsWith("data:");
    const sizeBytes = user.image?.length ?? 0;

    if (!wasDataUri) {
      return NextResponse.json({
        ok: true,
        cleared: false,
        message: "Avatar is not a data URI — nothing to clear",
        currentImage: user.image ? "(URL)" : "(null)",
      });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET image = NULL, "updatedAt" = NOW() WHERE id = $1`,
      user.id
    );

    return NextResponse.json({
      ok: true,
      cleared: true,
      message:
        "Cleared data-URI avatar from your account. All other data preserved. " +
        "You can now sign in. Re-upload an avatar from Settings any time.",
      bytesFreed: sizeBytes,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to clear avatar" },
      { status: 500 }
    );
  }
}
