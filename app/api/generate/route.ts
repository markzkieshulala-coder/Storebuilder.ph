import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWebsiteWithStitch } from "@/lib/ai/stitch-generate";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { StitchError } from "@google/stitch-sdk";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(8000, "Prompt too long"),
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
    const { prompt } = generateSchema.parse(body);

    // Always read the freshest plan from DB — never trust the JWT cookie.
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

    // Check website slot + generation credit
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

    // ── Stitch designs → Claude rebuilds as structured Tailwind HTML ──────────
    const { result, usage } = await generateWebsiteWithStitch(prompt, activePlan);

    // Generate unique subdomain
    let subdomain = generateSubdomain(result.name);
    const existing = await prisma.website.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    // htmlContent is the full structured HTML — the editor and all renderers
    // use this directly. jsonContent stores lightweight metadata only.
    const savedWebsite = await prisma.website.create({
      data: {
        userId: session.user.id,
        name: result.name,
        type: result.type as never,
        prompt,
        jsonContent: {
          name: result.name,
          type: result.type,
          seoTitle: result.seoTitle,
          seoDesc: result.seoDesc,
          stitchGenerated: true,
          version: 2,
        },
        htmlContent: result.htmlContent,
        subdomain,
        seoTitle: result.seoTitle,
        seoDesc: result.seoDesc,
        published: false,
      },
    });

    // Log token usage
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
        seoTitle: result.seoTitle,
        seoDesc: result.seoDesc,
      },
      usage: process.env.NODE_ENV === "development" ? usage : undefined,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    if (error instanceof StitchError) {
      console.error("[POST /api/generate] Stitch error:", error.code, error.message);
      return NextResponse.json(
        {
          error:
            "Website design service is currently unavailable. Please try again in a few moments.",
          code: "STITCH_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const err = error as { status?: number; message?: string };
    console.error("[POST /api/generate] error:", err?.status, err?.message ?? error);
    const msg: string = err?.message ?? "";

    if (msg.includes("STITCH_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "Website design service is currently unavailable. Please try again in a few moments.",
          code: "STITCH_UNAVAILABLE",
        },
        { status: 503 }
      );
    }
    if (msg.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        { error: "AI service not configured. Please set ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }
    if (err?.status === 401 || msg.toLowerCase().includes("authentication")) {
      return NextResponse.json(
        { error: "Invalid API key. Check your environment variables." },
        { status: 500 }
      );
    }
    if (err?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Website design service is currently unavailable. Please try again in a few moments.",
        code: "STITCH_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
