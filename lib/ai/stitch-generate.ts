/**
 * Stitch-led website generation — new pipeline.
 *
 * Workflow (do NOT revert to any prior approach):
 *   1. Stitch API generates the full website HTML (it is the designer)
 *   2. We pass the FULL Stitch HTML to Claude
 *   3. Claude REBUILDS it as clean, structured Tailwind HTML with
 *      data-editable attributes on every editable element
 *   4. The result is stored as htmlContent and served/edited directly
 *
 * Claude never designs. It only builds what Stitch designed.
 * The output is a complete HTML document, structured for the drag-and-drop
 * editor (section → container → element hierarchy, data-editable attributes).
 */

import Anthropic from "@anthropic-ai/sdk";
import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";
import { calculateTokenCost } from "@/lib/utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StitchResult = {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
};

export type StitchUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

// ─── Type inference ───────────────────────────────────────────────────────────

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

// ─── Stitch SDK call ──────────────────────────────────────────────────────────

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

// ─── Claude system prompt ─────────────────────────────────────────────────────

const REBUILD_SYSTEM = `You are a WEBSITE BUILDER, not a designer.

You receive the full HTML output of a Google Stitch website. Your task is to rebuild it as clean, production-ready HTML that looks EXACTLY like the Stitch design AND is structured for a drag-and-drop editor.

════════════════════════════════════════════
CRITICAL — NEVER VIOLATE THESE CONTENT RULES
════════════════════════════════════════════
• Copy EVERY text element verbatim — do not add, remove, rewrite, or paraphrase ANY word
• Copy EVERY image src URL exactly as it appears in Stitch — never substitute or shorten
• Copy EVERY link href exactly — never invent hrefs
• Match EVERY color exactly — extract the hex/rgb from Stitch's CSS and apply identically
• Match EVERY font exactly — copy the Google Fonts <link> tags from Stitch's <head>
• Include EVERY section in the SAME ORDER as Stitch — do not skip or reorder anything
• Copy ALL prices, names, labels, and UI text verbatim

════════════════════════════════════════════
STRUCTURE — MANDATORY PATTERN FOR EVERY SECTION
════════════════════════════════════════════
Every top-level visible region (nav, hero, features, products, testimonials, gallery, about, contact, footer, etc.) MUST follow this exact pattern:

<section id="<kebab-name>" data-editable="section" data-section-index="<0-based-n>" class="<tailwind>">
  <div data-editable="container" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- child elements with data-editable attributes below -->
  </div>
</section>

For <nav> and <footer>, use the appropriate semantic tag but still include data-editable="section":
  <nav data-editable="section" data-section-index="0" ...>
  <footer data-editable="section" data-section-index="N" ...>

Assign data-editable values like this:
• data-editable="text"   → every <h1> <h2> <h3> <h4> <h5> <p> and text-only <span>
• data-editable="image"  → every <img>
• data-editable="button" → every <button> and <a> styled as a CTA / action button
• data-editable="link"   → every <a> that is a nav link or plain text link
• data-editable="container" → layout wrapper divs (direct children of section)

════════════════════════════════════════════
STYLING RULES
════════════════════════════════════════════
• Use Tailwind CSS for ALL layout, spacing, and responsive behavior
• Include <script src="https://cdn.tailwindcss.com"></script> in <head>
• For exact brand colors from Stitch that have no standard Tailwind equivalent, use inline style="color:#hex" or style="background-color:#hex"
• Include the Google Fonts <link> tags from Stitch's <head> for exact typography
• Make the site FULLY RESPONSIVE — add sm: md: lg: breakpoints on all sections
• Images MUST use object-fit: cover and defined dimensions so they render correctly

════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════
• A single, complete, valid HTML document (<!DOCTYPE html> … </html>)
• No markdown code fences — raw HTML only
• No comments or explanations outside of the HTML
• All <img> tags must have real src URLs from Stitch (never use placeholder URLs)`;

function buildRebuildPrompt(stitchHtml: string, userPrompt: string): string {
  // Keep base64 images truncated to avoid blowing the context window.
  const cleaned = stitchHtml.replace(
    /src="data:image\/[^"]{200,}"/gi,
    'src="data:image/removed-base64"'
  );
  // Cap input — Stitch outputs are usually <100KB of HTML
  const MAX = 120_000;
  const html = cleaned.length > MAX
    ? cleaned.slice(0, MAX) + "\n<!-- ...stitch output truncated... -->"
    : cleaned;

  return `Rebuild this Stitch-designed website as clean Tailwind HTML with data-editable attributes.
Follow EVERY instruction in the system prompt exactly.

User's original prompt (context only — content must come from Stitch HTML): ${userPrompt}

=== STITCH HTML (source of all content, structure, colors, fonts, images) ===
${html}`;
}

// ─── Metadata extraction from the rebuilt HTML ───────────────────────────────

function extractMetadata(html: string, fallbackPrompt: string): {
  name: string;
  seoTitle: string;
  seoDesc: string;
} {
  const decode = (s: string) =>
    s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch  = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  const h1Match    = html.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i);

  const title = titleMatch?.[1] ? decode(titleMatch[1]) : "";
  const desc  = descMatch?.[1]  ? decode(descMatch[1])  : "";
  const h1    = h1Match?.[1]    ? decode(h1Match[1])    : "";

  const fallback = fallbackPrompt.split(/[.,!?\n]/)[0].trim().slice(0, 50);
  const name     = (h1 || title || fallback).slice(0, 80);
  const seoTitle = (title || name).slice(0, 70);
  const seoDesc  = (desc || `${name} — ${fallbackPrompt}`).slice(0, 200);
  return { name, seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: StitchResult; usage: StitchUsage }> {
  // Step 1: Stitch designs the full website
  const stitchHtml = await runStitch(userPrompt);

  // Step 2: Claude rebuilds it as clean Tailwind HTML + data-editable structure
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please add it to your environment variables."
    );
  }

  const preferredModel = "claude-opus-4-7";
  const fallbackModel  = "claude-sonnet-4-6";
  let model = preferredModel;
  let message: Awaited<ReturnType<typeof anthropic.messages.create>>;

  try {
    message = await anthropic.messages.create({
      model: preferredModel,
      max_tokens: 32000,
      temperature: 0.1,
      system: REBUILD_SYSTEM,
      messages: [{ role: "user", content: buildRebuildPrompt(stitchHtml, userPrompt) }],
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const isModelErr =
      e?.status === 404 || e?.status === 400 || /model/i.test(String(e?.message ?? ""));
    if (!isModelErr) throw err;
    model = fallbackModel;
    message = await anthropic.messages.create({
      model: fallbackModel,
      max_tokens: 16000,
      temperature: 0.1,
      system: REBUILD_SYSTEM,
      messages: [{ role: "user", content: buildRebuildPrompt(stitchHtml, userPrompt) }],
    });
  }

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from AI provider.");

  let builtHtml = block.text.trim();
  // Strip any accidental markdown fences Claude may emit
  if (builtHtml.startsWith("```")) {
    builtHtml = builtHtml.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  }

  // Sanity: ensure we got actual HTML
  if (!builtHtml.includes("</") || builtHtml.length < 500) {
    throw new Error("Website builder returned invalid output. Please try again.");
  }

  const { name, seoTitle, seoDesc } = extractMetadata(builtHtml, userPrompt);
  const type = inferWebsiteType(userPrompt);

  const inputTokens  = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    result: { htmlContent: builtHtml, name, type, seoTitle, seoDesc },
    usage: {
      model: `stitch+${model}`,
      inputTokens,
      outputTokens,
      costUsd: usd,
      costPhp: php,
    },
  };
}
