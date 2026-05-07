import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.any()).optional(),
});

export const dynamic = "force-dynamic";

// Read settings via raw SQL so a missing column never crashes the request.
async function readSettings(userId: string): Promise<Record<string, any>> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ settings: any }[]>(
      `SELECT "settings" FROM "User" WHERE id = $1 LIMIT 1`,
      userId
    );
    return (rows[0]?.settings as Record<string, any>) || {};
  } catch {
    return {};
  }
}

async function writeSettings(userId: string, settings: Record<string, any>): Promise<boolean> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "User" SET "settings" = $1::jsonb WHERE id = $2`,
      JSON.stringify(settings),
      userId
    );
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  await ensureSchemaMigrations();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, plan: true },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await readSettings(session.user.id);

  return NextResponse.json({
    ...user,
    settings,
  });
}

export async function PATCH(req: NextRequest) {
  await ensureSchemaMigrations();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.parse(body);

  // Name update via Prisma (column always exists)
  if (parsed.name !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.name },
      select: { id: true },
    });
  }

  // Settings merged via raw SQL — column may have just been added by migrations
  let mergedSettings: Record<string, any> = {};
  if (parsed.settings !== undefined) {
    const existing = await readSettings(session.user.id);
    mergedSettings = { ...existing, ...parsed.settings };
    await writeSettings(session.user.id, mergedSettings);
  } else {
    mergedSettings = await readSettings(session.user.id);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({
    user,
    settings: mergedSettings,
  });
}
