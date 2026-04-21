import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
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

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: dataUrl },
    });

    return NextResponse.json({ success: true, image: dataUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
