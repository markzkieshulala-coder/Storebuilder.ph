import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWebsite } from "@/lib/ai/generate";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { z } from "zod";

// Allow long, detailed prompts (≈ up to 1000 words) so users can describe
// their business at length. The previous 500-char cap turned the input into
// a one-liner; the AI now gets enough context to produce a tailored site.
const generateSchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(8000, "Prompt too long"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to generate a website" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt } = generateSchema.parse(body);

    // Always fetch the freshest plan directly from DB — never trust the JWT cookie
    // so that plan upgrades take effect immediately without requiring re-login.
    const freshUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, planExpiresAt: true },
    });

    let activePlan: Plan = freshUser?.plan ?? "FREE";

    // Treat expired paid plans as FREE
    if (activePlan !== "FREE" && freshUser?.planExpiresAt && freshUser.planExpiresAt < new Date()) {
      activePlan = "FREE";
    }

    // Check website slot + generation credit
    const websiteCount = await prisma.website.count({ where: { userId: session.user.id } });
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

    // Generate website with AI using the verified plan
    const { website, usage } = await generateWebsite(
      prompt,
      activePlan
    );

    // Generate unique subdomain
    let subdomain = generateSubdomain(website.name);
    const existing = await prisma.website.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    // Save to database
    const savedWebsite = await prisma.website.create({
      data: {
        userId: session.user.id,
        name: website.name,
        type: website.type as never,
        prompt,
        jsonContent: website as never,
        subdomain,
        seoTitle: website.seoTitle,
        seoDesc: website.seoDesc,
        published: false,
      },
    });

    // Log token usage (skip for mock mode)
    if (usage.model !== "mock") {
      await prisma.tokenUsageLog.create({
        data: {
          userId: session.user.id,
          websiteId: savedWebsite.id,
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: usage.inputTokens + usage.outputTokens,
          costUsd: usage.costUsd,
          costPhp: usage.costPhp,
        },
      });
    }

    return NextResponse.json({
      success: true,
      website: {
        id: savedWebsite.id,
        name: savedWebsite.name,
        subdomain: savedWebsite.subdomain,
        jsonContent: website,
        seoTitle: website.seoTitle,
        seoDesc: website.seoDesc,
      },
      usage: process.env.NODE_ENV === "development" ? usage : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
