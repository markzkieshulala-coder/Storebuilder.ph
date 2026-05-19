import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhilippineMonth } from "@/lib/credits";

export const dynamic = "force-dynamic";

// POST /api/admin/users/[id]/reset-credits
// Clears the user's website-generation usage for the current PH month so they
// can generate up to their plan's monthly quota again. Optional body field
// `scope: "all"` wipes every historical month instead.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({} as { scope?: string }));
    const scope = body?.scope === "all" ? "all" : "month";

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let deletedCount = 0;
    if (scope === "all") {
      const result = await prisma.creditUsage.deleteMany({ where: { userId: params.id } });
      deletedCount = result.count;
    } else {
      const month = getPhilippineMonth();
      const result = await prisma.creditUsage.deleteMany({
        where: { userId: params.id, date: month },
      });
      deletedCount = result.count;
    }

    return NextResponse.json({ success: true, scope, deletedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
