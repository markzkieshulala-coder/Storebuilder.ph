import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { z } from "zod";
import { generateSite } from "@/lib/ultra-premium/engine/SiteGeneratorEngine";
import { renderBlueprintToHtml } from "@/lib/ultra-premium/render/htmlRenderer";

export const maxDuration = 60;

function inferWebsiteType(niche: string): string {
  const n = (niche || "").toLowerCase();
  if (/restaurant|cafe|coffee|food|bar|bakery|bistro/.test(n)) return "RESTAURANT";
  if (/salon|spa|beauty|barber|nail|hair/.test(n)) return "SALON";
  if (/portfolio|creative|design|photography|art/.test(n)) return "PORTFOLIO";
  if (/store|shop|e.commerce|ecommerce|retail|product|sell|merchandise|jersey|shoe|apparel|basketball/.test(n)) return "STORE";
  if (/landing|launch|coming.soon|waitlist/.test(n)) return "LANDING";
  return "BUSINESS";
}

const generateSchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(8000, "Prompt too long"),
  businessName: z.string().optional(),
  siteSpec: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Please sign in to generate a website" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = generateSchema.parse(body);
    const { prompt, businessName, siteSpec } = parsed;

    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    });

    let activePlan: Plan = freshUser?.plan ?? "FREE";
    if (
      activePlan !== "FREE" &&
      freshUser?.planExpiresAt &&
      freshUser.planExpiresAt < new Date()
    ) {
      activePlan = "FREE";
    }

    const websiteCount = await prisma.website.count({
      where: { userId: session.user.id },
    });
    const creditCheck = await checkAndConsumeCredit(
      session.user.id,
      activePlan,
      websiteCount
    );

    if (!creditCheck.success) {
      return NextResponse.json(
        { error: creditCheck.message, code: "CREDIT_LIMIT" },
        { status: 429 }
      );
    }

    // ── Run the Ultra-Premium Generator ────────────────────────────────────────
    const generatorResult = generateSite(prompt, session.user.id);
    const blueprint = generatorResult.blueprint;

    // ── Render blueprint to editor-compatible HTML ─────────────────────────────
    const htmlContent = renderBlueprintToHtml(blueprint);

    const siteName =
      businessName ||
      (siteSpec as { siteName?: string })?.siteName ||
      blueprint.niche ||
      "Website";

    const industry = (siteSpec as { industry?: string })?.industry || blueprint.niche || "";
    const websiteType =
      inferWebsiteType(industry) !== "BUSINESS"
        ? inferWebsiteType(industry)
        : inferWebsiteType(prompt);

    const seoTitle = `${siteName}${industry ? " — " + industry : ""}`;
    const seoDesc = prompt.slice(0, 160);

    const usage = {
      model: "ultra-premium-3d-engine-v2",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    };

    let subdomain = generateSubdomain(siteName);
    const existing = await prisma.website.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    const savedWebsite = await prisma.website.create({
      data: {
        userId: session.user.id,
        name: siteName,
        type: websiteType as never,
        prompt,
        jsonContent: JSON.parse(JSON.stringify({
          name: siteName,
          type: websiteType,
          seoTitle,
          seoDesc,
          version: 6,
          blueprint,
          passedValidation: generatorResult.passedValidation,
          validationErrors: generatorResult.validationErrors ?? [],
        })),
        // Render the blueprint into HTML so the existing editor + preview +
        // published-site pipeline (which all read htmlContent) keep working.
        htmlContent,
        subdomain,
        seoTitle,
        seoDesc,
        published: false,
      },
    });

    await prisma.tokenUsageLog.create({
      data: {
        userId: session.user.id,
        websiteId: savedWebsite.id,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        totalTokens: 0,
        costUsd: usage.costUsd,
        costPhp: usage.costPhp,
      },
    });

    return NextResponse.json({
      success: true,
      website: {
        id: savedWebsite.id,
        name: savedWebsite.name,
        subdomain: savedWebsite.subdomain,
        seoTitle,
        seoDesc,
      },
      blueprint,
      passedValidation: generatorResult.passedValidation,
      validationErrors: generatorResult.validationErrors,
      generationTimeMs: generatorResult.generationTimeMs,
      usage: process.env.NODE_ENV === "development" ? usage : undefined,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    const err = error as { message?: string };
    const msg = err?.message ?? String(error);
    console.error("[POST /api/generate] error:", msg);
    return NextResponse.json(
      { error: msg || "Generation failed", code: "GENERATION_ERROR" },
      { status: 500 }
    );
  }
}
