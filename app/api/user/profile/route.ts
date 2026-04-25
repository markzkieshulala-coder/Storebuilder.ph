import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.any()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, plan: true, settings: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...user,
    settings: (user.settings as any) || {},
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.parse(body);

  const data: any = {};
  if (parsed.name !== undefined) data.name = parsed.name;

  if (parsed.settings !== undefined) {
    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    const merged = { ...((existing?.settings as any) || {}), ...parsed.settings };
    data.settings = merged;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, settings: true },
  });

  return NextResponse.json({
    user,
    settings: (user.settings as any) || {},
  });
}
