import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWebsiteAI } from "@/lib/ai/generate-ai";
import { MissingApiKeyError } from "@/lib/ai/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function generateSubdomain(brandName: string): string {
  return brandName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, businessName } = body as { prompt?: string; businessName?: string };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 8) {
      return NextResponse.json(
        { error: "Please describe your website with at least 8 characters." },
        { status: 400 }
      );
    }

    // Check credits
    const credits = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Credit" WHERE "userId" = $1 LIMIT 1`,
      session.user.id
    ).catch(() => []);

    const credit = credits?.[0];
    if (credit && credit.remaining !== undefined && credit.remaining <= 0 && credit.plan !== "PRO" && credit.plan !== "ENTERPRISE") {
      return NextResponse.json(
        { error: "No generation credits remaining. Please upgrade or wait for reset." },
        { status: 403 }
      );
    }

    const cleanPrompt = prompt.trim();
    const brandName = (businessName?.trim() || cleanPrompt.split(" ").slice(0, 3).join(" "));

    // Generate subdomain first so the renderer can embed correct <base href> links
    const subdomain = generateSubdomain(brandName);

    console.log(`[generate] Hybrid pipeline for "${brandName}" — planning with Claude…`);

    // Hybrid pipeline: Claude interprets the prompt and plans the site (sections,
    // CTAs, copy, exclusions); the deterministic 3D renderer renders that plan
    // verbatim. The site reflects the prompt exactly — no template injection.
    const result = await generateWebsiteAI(cleanPrompt, brandName, subdomain);

    console.log(`[generate] Pipeline complete. Niche="${result.niche}", sections=${(result.artifacts as any)?.plan?.sections?.length ?? "?"}, excluded=${JSON.stringify((result.artifacts as any)?.excluded ?? [])}`);

    // Determine website type from niche
    const niche = result.niche.toLowerCase();
    const type = niche.includes("portfolio") ? "PORTFOLIO"
      : niche.includes("restaurant") || niche.includes("food") ? "RESTAURANT"
      : "STORE";

    // Store in database — jsonContent holds all multi-page HTML for routing
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "Website" (id, name, type, prompt, subdomain, "userId", "htmlContent", "jsonContent", published, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2::"WebsiteType", $3, $4, $5, $6, $7::jsonb, false, NOW(), NOW())
       RETURNING *`,
      brandName,
      type,
      prompt.trim(),
      subdomain,
      session.user.id,
      result.html,
      JSON.stringify({
        multipage: true,
        pages: result.pages,
        nav: result.nav,
        gallerySlug: result.gallerySlug,
        niche: result.niche,
        score: result.score,
        prompt,
      })
    );

    const website = rows?.[0];
    if (!website) {
      throw new Error("Failed to store generated website");
    }

    // Deduct credit if applicable
    if (credit) {
      prisma.$executeRawUnsafe(
        `UPDATE "Credit" SET used = used + 1, remaining = GREATEST(0, remaining - 1), "updatedAt" = NOW() WHERE "userId" = $1`,
        session.user.id
      ).catch(() => {});
    }

    return NextResponse.json({
      website,
      model: "claude-opus-4-8-planner+3d-renderer",
    });

  } catch (err: any) {
    console.error("[POST /api/generate]", err);
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "The site generator is not configured: ANTHROPIC_API_KEY is missing." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: `Generation failed: ${err?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }
}
