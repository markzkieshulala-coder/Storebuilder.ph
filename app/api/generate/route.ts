import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateWebsite } from "@/lib/ai/generate";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { z } from "zod";

// Allow up to 5 minutes — generation can take 60-90 s with the full system prompt.
export const maxDuration = 300;

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

    // Native Premium Generator — runs the four design skills through Claude
    const { result, usage } = await generateWebsite(prompt, activePlan);

    // Generate unique subdomain
    let subdomain = generateSubdomain(result.name);
    const existing = await prisma.website.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

    // htmlContent is the full self-contained HTML — the editor and all renderers
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
          nativeGenerated: true,
          version: 3,
        },
        htmlContent: result.htmlContent,
        subdomain,
        seoTitle: result.seoTitle,
        seoDesc: result.seoDesc,
        published: false,
      },
    });

    // Log token usage
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

    const err = error as { status?: number; message?: string; error?: { type?: string } };
    const msg: string = err?.message ?? String(error) ?? "";
    console.error("[POST /api/generate] error:", err?.status, msg);

    // Missing or invalid API key
    if (
      err?.status === 401 ||
      msg.toLowerCase().includes("api key") ||
      msg.toLowerCase().includes("api_key") ||
      msg.toLowerCase().includes("authentication") ||
      msg.toLowerCase().includes("x-api-key")
    ) {
      return NextResponse.json(
        { error: "Invalid or missing ANTHROPIC_API_KEY. Check your .env.local file." },
        { status: 500 }
      );
    }
    // Rate limit
    if (err?.status === 429 || msg.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    // Context / token limit
    if (msg.toLowerCase().includes("token") && msg.toLowerCase().includes("limit")) {
      return NextResponse.json(
        { error: "Prompt too long for the model. Try a shorter description." },
        { status: 400 }
      );
    }
    // Timeout
    if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
      return NextResponse.json(
        { error: "Generation timed out. Try a shorter prompt or try again." },
        { status: 503 }
      );
    }
    // In development expose the real error so it's actionable
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        { error: msg || "Unknown generation error", code: "GENERATOR_ERROR" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "Website generation is currently unavailable. Please try again in a few moments.",
        code: "GENERATOR_UNAVAILABLE",
      },
      { status: 503 }
    );
  }
}
