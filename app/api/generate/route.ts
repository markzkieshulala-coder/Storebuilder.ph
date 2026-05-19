import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAndConsumeCredit } from "@/lib/credits";
import { prisma } from "@/lib/prisma";
import { generateSubdomain } from "@/lib/utils";
import { Plan } from "@prisma/client";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

// Inline premium-core.css into the generated HTML so the page is self-contained.
// The engine emits a relative <link href="css/premium-core.css"> which resolves
// fine at /index.html but breaks in srcdoc iframes and published subdomains.
let _premiumCssCache: string | null = null;
function inlinePremiumCss(html: string): string {
  try {
    if (_premiumCssCache === null) {
      const cssPath = path.join(process.cwd(), "public", "css", "premium-core.css");
      _premiumCssCache = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
    }
    if (!_premiumCssCache) return html;
    const styleBlock = `<style data-premium-core="inline">\n${_premiumCssCache}\n</style>`;
    const linked = html.replace(/<link[^>]+premium-core\.css[^>]*>/gi, styleBlock);
    if (linked !== html) return linked;
    // No link tag found — inject before </head>
    return html.replace(/<\/head>/i, styleBlock + "\n</head>");
  } catch {
    return html;
  }
}

// Map an industry/niche string to a valid Prisma WebsiteType enum value.
function inferWebsiteType(niche: string): string {
  const n = (niche || "").toLowerCase();
  if (/restaurant|cafe|coffee|food|bar|bakery|bistro/.test(n)) return "RESTAURANT";
  if (/salon|spa|beauty|barber|nail|hair/.test(n)) return "SALON";
  if (/portfolio|creative|design|photography|art/.test(n)) return "PORTFOLIO";
  if (/store|shop|e.commerce|ecommerce|retail|product|sell|merchandise|jersey|shoe|apparel/.test(n)) return "STORE";
  if (/landing|launch|coming.soon|waitlist/.test(n)) return "LANDING";
  return "BUSINESS";
}

// The server-side Native Premium Generator was retired. All HTML is now
// compiled in the browser by public/js/ (intelligence-engine →
// layout-compiler → virtual-router → system-gateway). This route only
// accepts the precompiled HTML and persists it.
const generateSchema = z.object({
  prompt: z.string().min(5, "Prompt too short").max(8000, "Prompt too long"),
  precompiledHtml: z.string().min(500, "Precompiled HTML is required and must be at least 500 characters"),
  businessName: z.string().optional(),
  mdxGenerated: z.boolean().optional(),
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
    const { prompt, precompiledHtml, businessName, mdxGenerated, siteSpec } = parsed;

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

    const siteName = businessName || (siteSpec as { siteName?: string })?.siteName || "Website";
    const industry = (siteSpec as { industry?: string })?.industry || "";

    // Prefer the industry label from siteSpec; fall back to scanning the prompt.
    const websiteType = inferWebsiteType(industry) !== "BUSINESS"
      ? inferWebsiteType(industry)
      : inferWebsiteType(prompt);

    // Inline premium-core.css so the saved HTML is fully self-contained and
    // renders with all 3D styles in the editor srcdoc iframe, published pages, etc.
    const finalHtml = inlinePremiumCss(precompiledHtml);

    const result = {
      htmlContent: finalHtml,
      name: siteName,
      type: websiteType,
      seoTitle: `${siteName}${industry ? " — " + industry : ""}`,
      seoDesc: prompt.slice(0, 160),
    };
    const usage = { model: "ultra-premium-3d-engine", inputTokens: 0, outputTokens: 0, costUsd: 0, costPhp: 0 };

    let subdomain = generateSubdomain(result.name);
    const existing = await prisma.website.findUnique({ where: { subdomain } });
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }

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
          mdxGenerated: !!mdxGenerated,
          version: 5,
        },
        htmlContent: result.htmlContent,
        subdomain,
        seoTitle: result.seoTitle,
        seoDesc: result.seoDesc,
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
    const err = error as { message?: string };
    const msg = err?.message ?? String(error);
    console.error("[POST /api/generate] error:", msg);
    return NextResponse.json(
      { error: msg || "Unable to save website", code: "PERSIST_ERROR" },
      { status: 500 }
    );
  }
}
