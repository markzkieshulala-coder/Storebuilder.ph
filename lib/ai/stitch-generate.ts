/**
 * Stitch-first website generation pipeline
 *
 * Flow:
 *   1. Build a rich, niche-specific prompt → send to Google Stitch
 *   2. Stitch returns a professionally designed screen
 *   3. Download the screenshot (base64) + HTML (CSS token extraction)
 *   4. Pass screenshot + extracted tokens to Claude Opus (vision)
 *   5. Claude implements the Stitch design as the editable JSON structure
 *   6. Run postProcess WITHOUT color/font sanitization — Stitch owns the palette
 */

import { stitch, StitchError } from "@google/stitch-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { Plan } from "@prisma/client";
import { calculateTokenCost } from "@/lib/utils";
import {
  GeneratedWebsite,
  postProcess,
  inferPhotoCategory,
  getCategoryPhotos,
} from "@/lib/ai/generate";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Stitch prompt builder ─────────────────────────────────────────────────────
// The richer and more specific the Stitch prompt, the better the design output.
function buildStitchPrompt(userPrompt: string): string {
  const q = userPrompt.toLowerCase();

  const isDark =
    /sport|basketball|football|gaming|tech|automotive|tattoo|bar|night|metal|masculine|bold/i.test(q);
  const isStore =
    /store|shop|sell|product|ecommerce|e-commerce|merch|marketplace/i.test(q);
  const isFood =
    /restaurant|cafe|coffee|food|bakery|dining|bistro|menu/i.test(q);
  const isBeauty = /salon|spa|beauty|skincare|wellness|nail|hair/i.test(q);
  const isPortfolio = /portfolio|photography|designer|agency|creative/i.test(q);

  let styleHint = isDark
    ? "Dark background, bold typography, high-contrast hero section, dynamic layout."
    : "Clean white background, elegant typography, generous whitespace, premium feel.";

  if (isFood)
    styleHint =
      "Warm earthy tones, food photography hero, menu grid layout, intimate atmosphere.";
  if (isBeauty)
    styleHint =
      "Soft neutral palette, luxury beauty photography, minimal clean layout, elegant serif headers.";
  if (isPortfolio)
    styleHint =
      "Editorial layout, full-bleed imagery, asymmetric grid, typographic focus.";

  const sections = [
    "sticky navigation bar with logo and CTA button",
    "full-viewport hero section with compelling imagery and bold headline",
    isStore ? "product grid (3–4 columns) with prices and add-to-cart" : "services/features section (3–4 cards)",
    "about section with founder story and team photo",
    "social proof section with customer testimonials",
    isFood ? "menu/specials section" : "statistics/achievements section",
    "call-to-action banner section",
    "footer with links, contact info, and social icons",
  ];

  return `Professional high-fidelity website for: ${userPrompt}.

Design requirements:
- ${styleHint}
- Desktop layout, full-width sections
- Modern premium UI/UX with proper visual hierarchy
- Complete multi-section single-page layout including: ${sections.join(", ")}
- Realistic niche-specific imagery and icons
- Professional color palette with clear primary/secondary/accent colors
- Consistent typography scale: large display headline, section headings, body text
- Proper spacing, padding, and visual breathing room between sections
- Interactive elements: hover states on buttons/cards, smooth visual transitions`;
}

// ── CSS design token extractor ────────────────────────────────────────────────
// Parses raw Stitch HTML to pull out the dominant hex colors and font families.
function extractCssTokens(html: string): { colors: string[]; fonts: string[] } {
  // Collect all hex color values from the document
  const hexMatches = html.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
  const freq: Record<string, number> = {};
  for (const c of hexMatches) {
    const key = c.toLowerCase();
    // Skip pure white/black — too common to be informative
    if (key === "#ffffff" || key === "#000000") continue;
    freq[key] = (freq[key] ?? 0) + 1;
  }
  // Also include near-white and near-black (they ARE informative for palettes)
  const allHex = html.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
  const neutralFreq: Record<string, number> = {};
  for (const c of allHex) {
    const key = c.toLowerCase();
    neutralFreq[key] = (neutralFreq[key] ?? 0) + 1;
  }
  const topColors = Object.entries(neutralFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([c]) => c);

  // Extract font-family declarations
  const fontRaw = html.match(/font-family\s*:\s*([^;{}"']+)/gi) ?? [];
  const fontsSeen = new Map<string, boolean>();
  const fonts: string[] = [];
  for (const m of fontRaw) {
    const f = m
      .replace(/font-family\s*:\s*/i, "")
      .trim()
      .split(",")[0]
      .replace(/['"]/g, "")
      .trim();
    if (
      f.length > 1 &&
      !["serif", "sans-serif", "monospace", "inherit", "initial", "unset"].includes(
        f.toLowerCase()
      ) &&
      !fontsSeen.has(f)
    ) {
      fontsSeen.set(f, true);
      fonts.push(f);
      if (fonts.length >= 4) break;
    }
  }

  return { colors: topColors, fonts };
}

// ── System prompt for the Stitch-guided JSON generation ───────────────────────
const STITCH_SYSTEM_PROMPT = `You are a world-class front-end developer at Metro Manila's top digital studio. You have been given a professionally designed website mockup created by Google Stitch as your visual reference. Your job is to implement that exact design as a structured JSON website — fully editable, with real business content.

══════════════════════════════════════════
YOUR ROLE IN THIS WORKFLOW
══════════════════════════════════════════
• Stitch is the Lead Designer. It already made all visual decisions.
• You are the Developer. Implement exactly what you see in the screenshot.
• Do NOT invent a new design. Faithfully translate the Stitch design into JSON.

══════════════════════════════════════════
DESIGN FIDELITY — NON-NEGOTIABLE
══════════════════════════════════════════
• Extract the EXACT color palette from the screenshot: background, surface, text, primary accent
• Note the typography hierarchy: display size, heading size, body size, weight contrast
• Mirror the section structure: same order, same layout patterns, same visual weight
• Preserve spacing and proportions — generous padding means generous padding in the JSON styles
• The CSS tokens extracted from Stitch HTML are provided as ground truth — use them

══════════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════════
• Return ONLY a single valid JSON object. No markdown fences, no commentary.

══════════════════════════════════════════
JSON SCHEMA
══════════════════════════════════════════
{
  "name": "Brand name (specific to the business)",
  "type": "STORE | BUSINESS | PORTFOLIO | RESTAURANT | SALON | LANDING",
  "seoTitle": "Page title (max 60 chars)",
  "seoDesc": "Meta description (max 160 chars)",
  "fonts": { "heading": "Font name", "body": "Font name" },
  "colors": {
    "background": "#hex",
    "primary": "#hex (surface / card bg)",
    "secondary": "#hex (muted text)",
    "accent": "#hex (CTA buttons, highlights)",
    "text": "#hex (body text)"
  },
  "sections": [
    {
      "id": "unique-slug",
      "type": "nav | hero | about | features | products | testimonials | stats | gallery | process | faq | cta | newsletter | contact | footer",
      "data": { /* section-specific fields — see content rules below */ },
      "styles": {
        "background": "#hex",
        "textColor": "#hex",
        "accentColor": "#hex"
      }
    }
  ]
}

══════════════════════════════════════════
CONTENT RULES
══════════════════════════════════════════
• Write real, specific business content — no lorem ipsum, no "Quality you can trust"
• Filipino market context: Metro Manila neighborhoods, ₱ prices, Filipino names in testimonials
• Every section must be fully populated — no empty strings, no placeholder text
• Images: https://images.unsplash.com/photo-{PHOTO_ID}?w=800&h=600&fit=crop&q=80
  — Hero: w=1400&h=800 | About: w=1000&h=750 | Products/gallery: w=600&h=600 | Avatars: w=100&h=100
  — Use ONLY the approved photo IDs provided in the prompt
  — Every ID used must be different — zero repeats within the site
• Navigation uses page routes, NOT anchors: / | /about | /products | /services | /contact | /gallery
• Prices in ₱ realistic for Metro Manila market

══════════════════════════════════════════
SECTION DATA FIELDS
══════════════════════════════════════════
nav:          { logo, links: [{label, href}], ctaLabel, ctaHref }
hero:         { kicker?, headline, sub, backgroundImage, ctaPrimary: {label, href}, ctaSecondary?: {label, href} }
about:        { heading, body, image, ctaPrimary: {label, href} }
features:     { heading, sub, items: [{icon?, title, description}] }
products:     { heading, sub?, items: [{name, price, description, image}] }
testimonials: { heading, items: [{name, role, quote, image}] }
stats:        { heading, sub?, items: [{value, label}] }
gallery:      { heading, images: [url] }
process:      { heading, sub?, steps: [{title, description}] }
faq:          { heading, items: [{question, answer}] }
cta:          { heading, sub, ctaLabel, ctaHref }
newsletter:   { heading, sub, placeholder?, ctaLabel }
contact:      { heading, sub?, phone?, email?, address?, mapEmbed? }
footer:       { tagline, links: [{label, href}], columns: [{title, links:[{label,href}]}], social?: [{platform,href}] }

══════════════════════════════════════════
PLAN RULES
══════════════════════════════════════════
FREE   → sections: nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer
PRO    → also include: products, pricing, gallery, team, process
ENTERPRISE → same as PRO (dashboard injected automatically after generation)`;

// ── Main entry point ──────────────────────────────────────────────────────────
export async function generateWebsiteWithStitch(
  userPrompt: string,
  plan: Plan
): Promise<{
  website: GeneratedWebsite;
  usage: { model: string; inputTokens: number; outputTokens: number; costUsd: number; costPhp: number };
}> {
  if (!process.env.STITCH_API_KEY) {
    throw new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
  }

  // ── Step 1: Google Stitch generates the visual design ─────────────────────
  let screenshotBase64: string;
  let screenshotMimeType: string;
  let stitchHtml: string;

  try {
    const stitchPrompt = buildStitchPrompt(userPrompt);
    const project = await stitch.createProject(`StoreBuilder-${Date.now()}`);
    const screen = await project.generate(stitchPrompt, "DESKTOP");

    const [imageUrl, htmlUrl] = await Promise.all([
      screen.getImage(),
      screen.getHtml(),
    ]);

    if (!imageUrl) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned no screenshot for this design.",
        recoverable: true,
      });
    }

    // Download both assets in parallel
    const [imgRes, htmlRes] = await Promise.all([
      fetch(imageUrl),
      htmlUrl ? fetch(htmlUrl) : Promise.resolve(null),
    ]);

    if (!imgRes.ok) {
      throw new StitchError({
        code: "NETWORK_ERROR",
        message: `Could not download Stitch screenshot (${imgRes.status}).`,
        recoverable: true,
      });
    }

    const imgBuffer = await imgRes.arrayBuffer();
    screenshotBase64 = Buffer.from(imgBuffer).toString("base64");
    screenshotMimeType = imgRes.headers.get("content-type") ?? "image/png";

    stitchHtml = htmlRes?.ok ? await htmlRes.text() : "";
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "UNKNOWN_ERROR",
      message: (err as Error)?.message ?? "Stitch design generation failed.",
      recoverable: true,
    });
  }

  // ── Step 2: Extract CSS design tokens from Stitch HTML ────────────────────
  const { colors: stitchColors, fonts: stitchFonts } = stitchHtml
    ? extractCssTokens(stitchHtml)
    : { colors: [], fonts: [] };

  // ── Step 3: Prepare photo pool for this niche ─────────────────────────────
  const category = inferPhotoCategory(userPrompt);
  const approvedPhotos = getCategoryPhotos(category, 24);
  const photoHint = approvedPhotos.map((id) => `• ${id}`).join("\n");

  const tier = plan as string;
  const planBlock =
    tier === "ENTERPRISE"
      ? "PLAN: ENTERPRISE — include products, pricing, gallery, team, process sections."
      : tier === "PRO"
      ? "PLAN: PRO — include products, pricing, gallery, team, process sections."
      : "PLAN: FREE — sections ONLY: nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer. No products/pricing.";

  // ── Step 4: Claude Opus implements the Stitch design as JSON ─────────────
  const userContent: Anthropic.MessageParam["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: screenshotMimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
        data: screenshotBase64,
      },
    },
    {
      type: "text",
      text: `The image above is the professionally designed website for the following business:

"${userPrompt}"

IMPLEMENT THIS EXACT DESIGN AS JSON.

════════════════════════════════
STITCH DESIGN TOKENS (use these)
════════════════════════════════
Colors extracted from Stitch CSS:
${stitchColors.length ? stitchColors.join(", ") : "(extract directly from screenshot)"}

Fonts detected from Stitch HTML:
${stitchFonts.length ? stitchFonts.join(", ") : "(extract from screenshot — match the visual typography)"}

════════════════════════════════
${planBlock}
════════════════════════════════

APPROVED PHOTO IDs — USE ONLY THESE (post-processor enforces this):
${photoHint}

Image format:
• Hero: https://images.unsplash.com/photo-{ID}?w=1400&h=800&fit=crop&q=80
• About: ?w=1000&h=750&fit=crop&q=80
• Products/gallery: ?w=600&h=600&fit=crop&q=80
• Avatars: ?w=100&h=100&fit=crop&q=80
• Hero = ID#1 | About = ID#2 | Products = IDs#3–10 | Team/gallery = IDs#11–20 | Avatars = IDs#21–24
• ZERO repeated IDs in a single site.

GENERATION SEED: ${Math.random().toString(36).slice(2, 10)} (produce a unique design each time)

Output ONLY the JSON object. No markdown. No explanation.`,
    },
  ];

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
  const model = "claude-opus-4-7";

  try {
    message = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      system: STITCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err: unknown) {
    // If opus isn't available, fall back to sonnet
    const e = err as { status?: number; message?: string };
    const isModelErr =
      e?.status === 404 ||
      e?.status === 400 ||
      String(e?.message ?? "").toLowerCase().includes("model");
    if (isModelErr) {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: STITCH_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });
    } else {
      throw err;
    }
  }

  const rawText =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";
  const jsonStr = rawText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  let website: GeneratedWebsite;
  try {
    website = JSON.parse(jsonStr);
  } catch {
    throw new Error("Claude returned invalid JSON when implementing the Stitch design.");
  }

  // ── Step 5: postProcess — skip color and font sanitization ────────────────
  // Stitch is the designer. We keep its palette and fonts exactly as Claude
  // extracted them from the screenshot. We still fix images, nav links, and
  // section content completeness.
  website = postProcess(website, plan as string, category, approvedPhotos, {
    skipColorSanitize: true,
    skipFontAssignment: true,
  });

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: {
      model: `stitch+${model}`,
      inputTokens,
      outputTokens,
      costUsd: usd,
      costPhp: php,
    },
  };
}
