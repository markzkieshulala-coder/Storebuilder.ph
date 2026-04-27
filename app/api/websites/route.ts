import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const websites = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, name, type, subdomain, "customDomain", published,
              "seoTitle", thumbnail, "createdAt", "updatedAt"
         FROM "Website"
        WHERE "userId" = $1
        ORDER BY "updatedAt" DESC`,
      session.user.id
    );

    return NextResponse.json({ websites });
  } catch (err: any) {
    console.error("[GET /api/websites]", err);
    return NextResponse.json(
      { error: "Could not load websites: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
