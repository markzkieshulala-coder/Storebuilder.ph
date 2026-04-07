import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWebsite } from "@/lib/ai/generate";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(500, "Prompt too long"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to generate a website" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt } = generateSchema.parse(body);

    // Check and consume credit
    const creditCheck = await checkAndConsumeCredit(
      session.user.id,
      session.user.plan as Plan
    );

    if (!creditCheck.success) {
      return NextResponse.json(
        { error: creditCheck.message, code: "CREDIT_LIMIT" },
        { status: 429 }
      );
    }

    // Generate website with AI
    const { website, usage } = await generateWebsite(
      prompt,
      session.user.plan as Plan
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
