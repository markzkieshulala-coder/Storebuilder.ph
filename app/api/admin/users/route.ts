import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureInfluencerColumn } from "@/lib/influencer-column";

function isAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  return session?.user?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureInfluencerColumn();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        createdAt: true,
        planExpiresAt: true,
        _count: { select: { websites: true, subscriptions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Fetch isInfluencer for the page of users
  const ids = users.map((u) => u.id);
  let influencerMap: Record<string, boolean> = {};
  if (ids.length > 0) {
    const rows = await prisma.$queryRawUnsafe<{ id: string; isInfluencer: boolean }[]>(
      `SELECT id, "isInfluencer" FROM "User" WHERE id = ANY($1::text[])`,
      ids
    );
    for (const r of rows) influencerMap[r.id] = r.isInfluencer;
  }

  const enriched = users.map((u) => ({ ...u, isInfluencer: influencerMap[u.id] ?? false }));

  return NextResponse.json({ users: enriched, total, page, limit });
}
