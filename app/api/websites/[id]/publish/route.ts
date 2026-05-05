import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
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

  // Bust the ISR cache so editor changes appear immediately on the live URL.
  // Without this, /sites/[subdomain] keeps serving the previously cached page
  // for up to `revalidate` seconds after publish.
  try { revalidatePath(`/sites/${updated.subdomain}`); } catch {}

  return NextResponse.json({
    success: true,
    url: `https://${updated.subdomain}.storebuilder.ph`,
    website: updated,
  });
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

  await prisma.website.update({
    where: { id: params.id },
    data: { published: false },
  });

  try { revalidatePath(`/sites/${website.subdomain}`); } catch {}

  return NextResponse.json({ success: true });
}
