import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  return NextResponse.json({ website });
}

export async function PATCH(
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

  const body = await req.json();
  const { jsonContent, name, published, seoTitle, seoDesc, customDomain } = body;

  const updated = await prisma.website.update({
    where: { id: params.id },
    data: {
      ...(jsonContent !== undefined && { jsonContent }),
      ...(name !== undefined && { name }),
      ...(published !== undefined && { published }),
      ...(seoTitle !== undefined && { seoTitle }),
      ...(seoDesc !== undefined && { seoDesc }),
      ...(customDomain !== undefined && { customDomain }),
    },
  });

  return NextResponse.json({ website: updated });
}

export async function DELETE(
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

  await prisma.website.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
