import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const website = await prisma.website.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const updated = await prisma.website.update({
    where: { id: params.id },
    data: { published: true },
  });

  return NextResponse.json({
    success: true,
    url: `https://${updated.subdomain}.storebuilder.ph`,
    website: updated,
  });
}
