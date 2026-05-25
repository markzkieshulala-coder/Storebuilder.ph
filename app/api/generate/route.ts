import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWebsite } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const { prompt, businessName } = body;

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

    const brandName = (businessName?.trim() || prompt.trim().split(" ").slice(0, 3).join(" "));

    console.log(`[generate] Starting pipeline for: "${brandName}" — "${prompt.slice(0, 80)}"`);

    // Run the in-process 9-stage orchestration engine (no external AI calls)
    const result = await generateWebsite(prompt.trim(), brandName);

    console.log(`[generate] Pipeline complete. HTML: ${result.html.length} chars, score: ${result.score}`);

    // Determine website type from niche
    const niche = result.niche.toLowerCase();
    const type = niche.includes("portfolio") ? "PORTFOLIO"
      : niche.includes("restaurant") || niche.includes("food") ? "RESTAURANT"
      : "STORE";

    const subdomain = generateSubdomain(brandName);

    // Store in database
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
      JSON.stringify({ artifacts: result.artifacts, prompt, niche: result.niche, score: result.score })
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
      model: "orchestration-engine-v1",
    });

  } catch (err: any) {
    console.error("[POST /api/generate]", err);
    return NextResponse.json(
      { error: `Generation failed: ${err?.message ?? "unknown error"}` },
      { status: 500 }
    );
  }
}
