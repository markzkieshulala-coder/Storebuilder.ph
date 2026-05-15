import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Serves the current user's avatar. The JWT stores data-URI avatars as a
// reference to this endpoint instead of embedding the bytes (which would
// blow past Node's 8 KB header limit and cause HTTP 431 on every request).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse(null, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { image: true },
  });
  if (!user?.image) return new NextResponse(null, { status: 404 });

  if (user.image.startsWith("data:")) {
    const match = user.image.match(/^data:(.+?);base64,(.+)$/);
    if (!match) return new NextResponse(null, { status: 404 });
    const [, mime, b64] = match;
    return new NextResponse(Buffer.from(b64, "base64"), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  // Plain URL — redirect (Google avatars etc.)
  return NextResponse.redirect(user.image);
}

export async function POST(req: NextRequest) {
  try {
    await ensureSchemaMigrations();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("avatar") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "Only JPG, PNG, and WebP are supported" }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // Update via raw SQL so a missing column elsewhere doesn't trip Prisma's
    // schema validation when it walks the full User model.
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "User" SET "image" = $1 WHERE id = $2`,
        dataUrl,
        session.user.id
      );
    } catch (e) {
      console.error("[avatar upload] raw SQL failed, retrying via Prisma:", e);
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: dataUrl },
      });
    }

    return NextResponse.json({ success: true, image: dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
