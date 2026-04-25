import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { planSlotLimit } from "@/lib/credits";
import { Plan } from "@prisma/client";

/**
 * POST /api/templates/[slug]/use
 *
 * Clones the source template into a brand-new Website row owned by the
 * current user. The clone has a new id, new subdomain, and is unpublished.
 * It is fully isolated — edits never propagate back to the source.
 *
 * Auth required. Counts against the user's monthly website slot limit.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in to use a template." }, { status: 401 });
  }

  const source = await prisma.website.findUnique({
    where: { templateSlug: params.slug },
    select: {
      id: true,
      userId: true,
      name: true,
      type: true,
      prompt: true,
      jsonContent: true,
      thumbnail: true,
      seoTitle: true,
      seoDesc: true,
      templateShared: true,
    },
  });

  if (!source || !source.templateShared) {
    return NextResponse.json({ error: "Template not found or no longer shared." }, { status: 404 });
  }

  // Don't let the original owner clone their own template (no value)
  if (source.userId === session.user.id) {
    return NextResponse.json(
      { error: "This is your own template. Use Duplicate from your dashboard instead." },
      { status: 400 }
    );
  }

  // Enforce the cloning user's own monthly website limit
  const plan = (session.user.plan || "FREE") as Plan;
  const websiteCount = await prisma.website.count({ where: { userId: session.user.id } });
  const limit = planSlotLimit(plan);
  if (websiteCount >= limit) {
    return NextResponse.json(
      { error: `You've reached your ${limit}-website limit on the ${plan} plan. Delete a website or upgrade to use this template.` },
      { status: 403 }
    );
  }

  const newName = source.name;
  let subdomain = generateSubdomain(newName);
  const existing = await prisma.website.findUnique({ where: { subdomain } });
  if (existing) subdomain = `${subdomain}-${Date.now().toString(36)}`;

  // Create a fully independent copy. New owner. New subdomain. Unpublished.
  // The jsonContent is deep-copied via JSON serialization to ensure no shared
  // references with the source row.
  const isolatedContent = JSON.parse(JSON.stringify(source.jsonContent));

  const clone = await prisma.website.create({
    data: {
      userId: session.user.id,
      name: newName,
      type: source.type,
      prompt: source.prompt,
      jsonContent: isolatedContent,
      subdomain,
      seoTitle: source.seoTitle,
      seoDesc: source.seoDesc,
      thumbnail: source.thumbnail,
      published: false,
      // tracking only — does NOT create a relation back to the source
      clonedFromId: source.id,
      // never enable template sharing on the clone automatically
      templateShared: false,
      templateSlug: null,
    },
  });

  // Bump the source's use counter (informational only)
  await prisma.website.update({
    where: { id: source.id },
    data: { templateUseCount: { increment: 1 } },
  });

  return NextResponse.json({
    success: true,
    websiteId: clone.id,
    redirectUrl: `/editor/${clone.id}`,
  });
}
