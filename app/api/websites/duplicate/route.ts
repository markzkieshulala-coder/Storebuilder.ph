import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateSubdomain } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { websiteId } = await req.json();

  const src = await prisma.website.findFirst({
    where: { id: websiteId, userId: session.user.id },
  });
  if (!src) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newName = `${src.name} (Copy)`;
  let subdomain = generateSubdomain(newName);
  const existing = await prisma.website.findUnique({ where: { subdomain } });
  if (existing) subdomain = `${subdomain}-${Date.now().toString(36)}`;

  const dup = await prisma.website.create({
    data: {
      userId: session.user.id,
      name: newName,
      type: src.type,
      prompt: src.prompt,
      jsonContent: src.jsonContent === null ? Prisma.JsonNull : (src.jsonContent as Prisma.InputJsonValue),
      subdomain,
      seoTitle: src.seoTitle,
      seoDesc: src.seoDesc,
      published: false,
    },
  });

  return NextResponse.json({ website: dup });
}
