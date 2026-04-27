import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { planSlotLimit } from "@/lib/credits";
import { Plan } from "@prisma/client";
import { randomUUID } from "crypto";

/**
 * POST /api/templates/[slug]/use
 *
 * Clones the source template into a brand-new Website row owned by the
 * current user. The clone has a new id, new subdomain, and is unpublished.
 * It is fully isolated — edits never propagate back to the source.
 *
 * Auth required. Counts against the user's monthly website slot limit.
 *
 * Uses raw SQL because the deployed Prisma client may be older than the
 * schema and miss the templateSlug / templateShared / clonedFromId fields.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to use a template." },
        { status: 401 }
      );
    }

    // Look up the source template via raw SQL
    const sourceRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "userId", name, type, prompt, "jsonContent", thumbnail,
              "seoTitle", "seoDesc", "templateShared"
         FROM "Website"
        WHERE "templateSlug" = $1
        LIMIT 1`,
      params.slug
    );
    const source = sourceRows?.[0];

    if (!source || !source.templateShared) {
      return NextResponse.json(
        { error: "Template not found or no longer shared." },
        { status: 404 }
      );
    }

    if (source.userId === session.user.id) {
      return NextResponse.json(
        { error: "This is your own template. Use Duplicate from your dashboard instead." },
        { status: 400 }
      );
    }

    // Slot limit check
    const plan = (session.user.plan || "FREE") as Plan;
    const websiteCount = await prisma.website.count({ where: { userId: session.user.id } });
    const limit = planSlotLimit(plan);
    if (websiteCount >= limit) {
      return NextResponse.json(
        {
          error: `You've reached your ${limit}-website limit on the ${plan} plan. Delete a website or upgrade to use this template.`,
        },
        { status: 403 }
      );
    }

    // Pick a unique subdomain
    const newName = source.name as string;
    let subdomain = generateSubdomain(newName);
    const subRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM "Website" WHERE subdomain = $1 LIMIT 1`,
      subdomain
    );
    if (subRows?.length) subdomain = `${subdomain}-${Date.now().toString(36)}`;

    // Deep-clone the JSON so source and clone share no references
    const isolatedContent = JSON.parse(JSON.stringify(source.jsonContent));

    // Insert the new row
    const newId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Website"
         (id, "userId", name, type, prompt, "jsonContent", subdomain,
          "seoTitle", "seoDesc", thumbnail, published,
          "clonedFromId", "templateShared", "templateSlug",
          "createdAt", "updatedAt")
       VALUES
         ($1, $2, $3, $4::"WebsiteType", $5, $6::jsonb, $7,
          $8, $9, $10, false,
          $11, false, NULL,
          NOW(), NOW())`,
      newId,
      session.user.id,
      newName,
      source.type,
      source.prompt,
      JSON.stringify(isolatedContent),
      subdomain,
      source.seoTitle,
      source.seoDesc,
      source.thumbnail,
      source.id
    );

    // Bump source's use counter
    await prisma.$executeRawUnsafe(
      `UPDATE "Website" SET "templateUseCount" = "templateUseCount" + 1 WHERE id = $1`,
      source.id
    );

    return NextResponse.json({
      success: true,
      websiteId: newId,
      redirectUrl: `/editor/${newId}`,
    });
  } catch (err: any) {
    console.error("[POST /api/templates/[slug]/use]", err);
    return NextResponse.json(
      { error: "Could not use template: " + (err?.message ?? "unknown") },
      { status: 500 }
    );
  }
}
