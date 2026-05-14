/**
 * Stitch-led website generation pipeline.
 *
 *   1. Stitch designs the website (creative direction, layout, palette, copy)
 *   2. We download Stitch's HTML
 *   3. Claude is invoked ONLY as a content converter — it extracts the real
 *      text, images, and section flow from Stitch's HTML and maps them into
 *      our editable section JSON schema. Claude does NOT design anything.
 *   4. Stitch's color palette and font choices are parsed directly from the
 *      HTML's CSS — never substituted by us.
 *
 * The resulting GeneratedWebsite renders through the existing WebsiteRenderer
 * so every editor feature (per-field edit, image drop, theme menu, section
 * resize, add/remove) keeps working unchanged.
 */

import Anthropic from "@anthropic-ai/sdk";
import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";
import {
  GeneratedWebsite,
  Section,
  postProcess,
  inferPhotoCategory,
  getCategoryPhotos,
} from "./generate";
import { calculateTokenCost } from "@/lib/utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StitchUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

// Strip noise so Claude focuses on visible content, not Tailwind utility soup.
function stripStitchHtml(html: string): string {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/\sclass="[^"]*"/gi, "");
  s = s.replace(/\sstyle="[^"]*"/gi, "");
  s = s.replace(/\s(data-[a-z0-9-]+)="[^"]*"/gi, "");
  s = s.replace(/\s(aria-[a-z0-9-]+)="[^"]*"/gi, "");
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) s = bodyMatch[1];
  s = s.replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim();
  return s;
}

// Pull every distinct hex/rgb colour used so Stitch's palette is what the site
// actually uses — we never overwrite it with our own approved-palette list.
function extractStitchColors(rawHtml: string): {
  background?: string;
  text?: string;
  accent?: string;
  primary?: string;
  secondary?: string;
} {
  const buckets = new Map<string, number>();
  const hexRe = /#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(rawHtml))) {
    const hex = normaliseHex(`#${m[1]}`);
    buckets.set(hex, (buckets.get(hex) ?? 0) + 1);
  }
  const rgbRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  while ((m = rgbRe.exec(rawHtml))) {
    const hex = rgbToHex(+m[1], +m[2], +m[3]);
    buckets.set(hex, (buckets.get(hex) ?? 0) + 1);
  }
  if (buckets.size === 0) return {};

  const sorted: Array<[string, number]> = [];
  buckets.forEach((count, hex) => sorted.push([hex, count]));
  sorted.sort((a, b) => b[1] - a[1]);
  let background: string | undefined;
  let text: string | undefined;
  let accent: string | undefined;
  for (const [hex] of sorted) {
    const L = luminance(hex);
    if (!background && (L > 0.9 || L < 0.08)) background = hex;
    if (background && !text && Math.abs(L - luminance(background)) > 0.55) text = hex;
    if (!accent && saturation(hex) > 0.35) accent = hex;
    if (background && text && accent) break;
  }
  background = background ?? sorted[0]?.[0];
  text =
    text ??
    sorted.find(([h]) => Math.abs(luminance(h) - luminance(background!)) > 0.4)?.[0] ??
    sorted[1]?.[0];
  const secondary = sorted.find(([h]) => h !== background && h !== text && h !== accent)?.[0];
  return { background, text, accent, primary: background, secondary };
}

function normaliseHex(hex: string): string {
  let h = hex.toUpperCase();
  if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  return h;
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function saturation(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

// Pull Google Fonts choices out of the <link href="..."> tag so we use the
// exact families Stitch chose for headings and body text.
function extractStitchFonts(rawHtml: string): { heading?: string; body?: string } {
  const families: string[] = [];
  const linkRe = /fonts\.googleapis\.com\/css2\?([^"']+)/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(rawHtml))) {
    const params = m[1].replace(/&amp;/g, "&");
    const familyRe = /family=([^&:]+)/g;
    let f: RegExpExecArray | null;
    while ((f = familyRe.exec(params))) {
      families.push(decodeURIComponent(f[1]).replace(/\+/g, " ").trim());
    }
  }
  const fams: string[] = [];
  const styleFamRe = /font-family\s*:\s*['"]?([^,'";}]+)/gi;
  while ((m = styleFamRe.exec(rawHtml))) {
    const name = m[1].trim();
    if (name && !/^(serif|sans-serif|monospace|var\()/i.test(name)) fams.push(name);
  }
  const seen: Record<string, true> = {};
  const unique: string[] = [];
  for (const f of families.concat(fams)) {
    if (!seen[f]) { seen[f] = true; unique.push(f); }
  }
  const out: { heading?: string; body?: string } = {};
  if (unique[0]) out.heading = unique[0];
  if (unique[1]) out.body = unique[1];
  else if (unique[0]) out.body = unique[0];
  return out;
}

// ─── Stitch fetch ────────────────────────────────────────────────────────────

async function runStitch(userPrompt: string): Promise<string> {
  if (!process.env.STITCH_API_KEY) {
    throw new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
  }
  try {
    const project = await stitch.createProject(`StoreBuilder-${Date.now()}`);
    const screen = await project.generate(userPrompt, "DESKTOP");
    const htmlUrl = await screen.getHtml();
    if (!htmlUrl) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned no design URL.",
        recoverable: true,
      });
    }
    const res = await fetch(htmlUrl);
    if (!res.ok) {
      throw new StitchError({
        code: "NETWORK_ERROR",
        message: `Could not download Stitch design (${res.status} ${res.statusText}).`,
        recoverable: true,
      });
    }
    const html = await res.text();
    if (!html || html.trim().length < 200) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned an empty or truncated design.",
        recoverable: true,
      });
    }
    return html;
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "UNKNOWN_ERROR",
      message: (err as Error)?.message ?? "Stitch design generation failed.",
      recoverable: true,
    });
  }
}

// ─── Content extraction prompt ───────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a CONTENT EXTRACTOR, not a designer or writer.

Your only job: take a Stitch-generated HTML page and map its REAL content into the editable section JSON schema below. You do NOT invent text, rename businesses, rewrite copy, swap images, or make design decisions. Every headline, sentence, product name, price, testimonial quote, image URL, statistic, and label MUST come verbatim from the Stitch HTML. If something is missing, omit the field — never make it up.

═══════════════════════════════════════
SECTION SCHEMA
═══════════════════════════════════════
Each section has: { "id": "<kebab-uuid>", "type": "<one of below>", "data": { ... }, "styles": { } }

Allowed section types (use the SAME ORDER they appear in the Stitch HTML):
- nav        data: { logo, links:[{label,href}], cta:{text,href} }
- hero       data: { badge?, headline, subheadline?, description?, ctaPrimary:{text,href}, ctaSecondary?:{text,href}, backgroundImage? }
- features   data: { headline, subheadline?, features:[{icon?, title, description, image?}] }
- products   data: { headline, subheadline?, products:[{name, price, description?, image}] }
- testimonials data: { headline?, testimonials:[{quote, name, role?, image?}] }
- about      data: { headline, body, image?, stats?:[{value,label}] }
- stats      data: { headline?, stats:[{value,label,description?}] }
- pricing    data: { headline, subheadline?, plans:[{name, price, period?, description?, features:[string], ctaText?}] }
- faq        data: { headline, faqs:[{question, answer}] }
- gallery    data: { headline?, images:[{url, caption?}] }
- team       data: { headline?, members:[{name, role, image?, bio?}] }
- process    data: { headline?, steps:[{title, description}] }
- contact    data: { headline, description?, fields?:[{label,placeholder}], map? }
- newsletter data: { headline, description?, ctaText? }
- cta        data: { headline, description?, ctaPrimary:{text,href} }
- text-block data: { heading?, body }
- image      data: { image, caption? }
- footer     data: { logo?, tagline?, links?:[{heading,items:[{label,href}]}], copyright, social?:[{platform,href}] }

═══════════════════════════════════════
EXTRACTION RULES
═══════════════════════════════════════
1. Walk the HTML in document order. For each visible region, decide which section type best matches its content (a top nav → "nav"; a big hero with one CTA → "hero"; a grid of feature cards → "features"; a grid of products with prices → "products"; etc.).
2. Pull EXACT TEXT from the HTML for every field. Preserve casing, punctuation, currency symbols, line breaks (as spaces).
3. Pull EXACT IMAGE URLS from <img src="…">. If an image is a background-image on a node, copy that URL too. Never substitute or shorten URLs.
4. Pull EXACT LINK HREFS from <a href="…">.
5. If the HTML has no products / features / testimonials etc., DO NOT add that section. Output only what is actually in the HTML.
6. ID format: use a slug + short random suffix (e.g. "hero-7a2k"). No two sections share an id.
7. styles MUST be {} for every section. We compute styles from the page-level palette separately.
8. Return strictly: { "name": "<brand name from HTML>", "type": "<inferred>", "seoTitle": "<title from HTML>", "seoDesc": "<meta description from HTML>", "sections": [...] }
9. The name comes from the <title>, brand name in nav, or H1 — whatever the HTML actually shows. NEVER use the user's raw prompt.

OUTPUT FORMAT
• A single valid JSON object. No markdown fences. No commentary. No explanation. JSON only.`;

function buildExtractionPrompt(strippedHtml: string, fallbackPrompt: string): string {
  const MAX = 80_000;
  const html =
    strippedHtml.length > MAX ? strippedHtml.slice(0, MAX) + "\n<!-- truncated -->" : strippedHtml;
  return `Extract the website below into the section JSON schema. Output JSON only.

Original user prompt (for context, NOT for content): ${fallbackPrompt}

STITCH HTML (the source of every text, image URL, link, and section in your output):
${html}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateWebsiteWithStitch(
  userPrompt: string,
  plan: Plan
): Promise<{
  website: GeneratedWebsite;
  htmlContent: string;
  usage: StitchUsage;
}> {
  // 1. Stitch designs
  const rawHtml = await runStitch(userPrompt);

  // 2. Pull Stitch's actual design tokens out of the HTML
  const stitchColors = extractStitchColors(rawHtml);
  const stitchFonts = extractStitchFonts(rawHtml);

  // 3. Claude converts Stitch's HTML content into editable JSON sections
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please add it to your environment variables."
    );
  }
  const strippedHtml = stripStitchHtml(rawHtml);

  const preferredModel = "claude-opus-4-7";
  const fallbackModel = "claude-sonnet-4-6";
  let model = preferredModel;
  let message: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    message = await anthropic.messages.create({
      model: preferredModel,
      max_tokens: 16000,
      temperature: 0.2,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: buildExtractionPrompt(strippedHtml, userPrompt) }],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const isModelErr =
      e?.status === 404 || e?.status === 400 || /model/i.test(String(e?.message ?? ""));
    if (!isModelErr) throw err;
    model = fallbackModel;
    message = await anthropic.messages.create({
      model: fallbackModel,
      max_tokens: 8192,
      temperature: 0.2,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: buildExtractionPrompt(strippedHtml, userPrompt) }],
    });
  }

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from extractor.");
  }
  let jsonText = block.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  let parsed: {
    name?: string;
    type?: string;
    seoTitle?: string;
    seoDesc?: string;
    sections?: Section[];
  };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Extractor returned invalid JSON. Please try again.");
  }

  // 4. Assemble the GeneratedWebsite using Stitch's tokens — never our own.
  const inferredType = parsed.type || inferWebsiteType(userPrompt);
  const website: GeneratedWebsite = {
    name:
      (parsed.name || "").slice(0, 80) ||
      userPrompt.split(/[.,!?\n]/)[0].trim().slice(0, 50),
    type: inferredType,
    seoTitle: (parsed.seoTitle || parsed.name || "").slice(0, 70),
    seoDesc: (parsed.seoDesc || "").slice(0, 200),
    fonts: {
      heading: stitchFonts.heading || "Inter",
      body: stitchFonts.body || stitchFonts.heading || "Inter",
    },
    colors: {
      primary: stitchColors.primary || stitchColors.background || "#FFFFFF",
      secondary: stitchColors.secondary || stitchColors.accent || "#737373",
      accent: stitchColors.accent || stitchColors.text || "#0A0A0A",
      background: stitchColors.background || "#FFFFFF",
      text: stitchColors.text || "#0A0A0A",
    },
    sections: (parsed.sections || []).map((s) => ({
      ...s,
      styles: s.styles || {},
    })),
  };

  // 5. Post-process: skip colour and font replacement so Stitch's palette and
  //    typography survive untouched. Image sanitisation still runs as a safety
  //    net for any blank image fields Stitch left behind.
  const category = inferPhotoCategory(userPrompt);
  const approvedPhotos = getCategoryPhotos(category, 24);
  const finalWebsite = postProcess(
    website,
    plan as string,
    category,
    approvedPhotos,
    { skipColorSanitize: true, skipFontAssignment: true }
  );

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website: finalWebsite,
    htmlContent: rawHtml,
    usage: {
      model: `stitch+${model}`,
      inputTokens,
      outputTokens,
      costUsd: usd,
      costPhp: php,
    },
  };
}
