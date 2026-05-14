/**
 * Stitch → Claude website generation. THIS IS THE ONLY GENERATION PATH.
 *
 *   1. User prompt → Stitch API → full website design (HTML)
 *   2. The FULL, UNMODIFIED Stitch HTML is passed to Claude
 *   3. Claude rebuilds it as clean, production-ready Tailwind HTML with
 *      data-editable attributes — same sections, same order, same text,
 *      same images, same colours. No redesign, no simplification, no skipping.
 *   4. If Claude's output is cut off (stop_reason="max_tokens"), we
 *      AUTOMATICALLY CONTINUE — looping until the document is complete.
 *
 * The old generate.ts pipeline has been removed. There is no fallback.
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

// ─── Brand name extraction ───────────────────────────────────────────────────

function extractBrandName(prompt: string): string | null {
  const patterns = [
    /brand\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /brand\s+name\s+is\s+(.+?)(?:\n|\.|,|$)/i,
    /brand\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /store\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /business\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /company\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /shop\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /called\s+"(.+?)"/i,
    /called\s+'(.+?)'/i,
    /named\s+"(.+?)"/i,
    /named\s+'(.+?)'/i,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1]) return m[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
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

You receive the FULL, UNMODIFIED HTML output of a Google Stitch website. Your task is to rebuild it as clean, production-ready HTML that looks EXACTLY like the Stitch design AND is structured for a drag-and-drop editor.

════════════════════════════════════════════
CRITICAL — NEVER VIOLATE THESE CONTENT RULES
════════════════════════════════════════════
• Copy EVERY text element verbatim — do not add, remove, rewrite, or paraphrase ANY word
• Copy EVERY image src URL EXACTLY as it appears in Stitch — character-for-character identical. NEVER substitute, shorten, omit, or replace with /placeholder.svg, placeholder.com, picsum.photos, lorempixel.com, via.placeholder.com, unsplash.it, or ANY other placeholder. If Stitch has an image URL, it MUST appear in your output unchanged.
• Copy EVERY CSS background-image: url('...') value EXACTLY as it appears — both in <style> blocks AND in inline style="" attributes. NEVER remove, replace, or omit background images.
• Copy EVERY link href exactly — never invent hrefs
• Match EVERY color exactly — extract the hex/rgb from Stitch's CSS and apply identically
• Match EVERY font exactly — copy the Google Fonts <link> tags from Stitch's <head>
• Include EVERY section in the SAME ORDER as Stitch — do not skip, merge, or reorder anything
• Copy ALL prices, names, labels, and UI text verbatim
• Do not redesign. Do not simplify. Do not skip sections. Do not replace with generic layouts.

════════════════════════════════════════════
IMAGE RENDERING — MANDATORY
════════════════════════════════════════════
Every <img> tag MUST have:
• src="<exact URL from Stitch>" — never a placeholder
• A defined display size: use Tailwind classes like w-full h-64 object-cover or explicit style="width:100%;height:300px;object-fit:cover"
• loading="lazy"

Every background image MUST be:
• Set via inline style: style="background-image:url('...');background-size:cover;background-position:center"
• The URL must be verbatim from Stitch's CSS — do not abbreviate, escape, or modify it

If a section in Stitch has a background image/color/gradient, the rebuilt section MUST have an identical background. NEVER leave a section with a plain white/transparent background if Stitch showed it with a visual background.

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
• data-editable="text"      → every <h1> <h2> <h3> <h4> <h5> <p> and text-only <span>
• data-editable="image"     → every <img>
• data-editable="button"    → every <button> and <a> styled as a CTA / action button
• data-editable="link"      → every <a> that is a nav link or plain text link
• data-editable="container" → layout wrapper divs (direct children of section)

════════════════════════════════════════════
STYLING RULES
════════════════════════════════════════════
• Use Tailwind CSS for ALL layout, spacing, and responsive behavior
• Include <script src="https://cdn.tailwindcss.com"></script> in <head>
• For exact brand colors from Stitch that have no standard Tailwind equivalent, use inline style="color:#hex" or style="background-color:#hex"
• Include the Google Fonts <link> tags from Stitch's <head> for exact typography
• Make the site FULLY RESPONSIVE — add sm: md: lg: breakpoints on all sections
• Images MUST use object-fit:cover with defined width/height so they render correctly

════════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════════
• A single, complete, valid HTML document starting with <!DOCTYPE html> and ending with </html>
• Raw HTML only — NO markdown code fences, NO comments outside the HTML, NO explanation
• All <img> tags must use real src URLs from the Stitch HTML — never placeholders
• If your response is cut off, the next message will say "continue". When you see that, OUTPUT ONLY THE CONTINUATION starting from exactly where you stopped — no preamble, no repetition, no closing remarks. Just the remaining HTML so the assembled document is valid.`;

// ─── Continuation-aware Claude call ──────────────────────────────────────────
// Stitch HTML is passed RAW (no truncation, no base64 stripping).
// If Claude hits max_tokens, we loop with a "continue" message until done.

const MAX_CONTINUATIONS = 6; // safety cap so a runaway model can't loop forever

async function buildHtmlWithClaude(
  stitchHtml: string,
  userPrompt: string,
  brandName: string | null
): Promise<{
  html: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Please add it to your environment variables."
    );
  }

  const brandOverride = brandName
    ? `\n\n⚠️ MANDATORY BRAND NAME OVERRIDE ⚠️
The user explicitly specified their brand name as: "${brandName}"
You MUST replace EVERY occurrence of the Stitch-generated brand name with "${brandName}" — in the nav logo, hero heading, page <title>, footer, about section, meta tags, and anywhere else the brand name appears. The user's brand name is FINAL and overrides whatever Stitch generated. Do not use any other brand name.\n`
    : "";

  const initialUserMsg = `Rebuild this Stitch-designed website as clean Tailwind HTML with data-editable attributes.
Follow EVERY instruction in the system prompt exactly. The Stitch HTML below is the COMPLETE, AUTHORITATIVE source — every image URL, color, font, link, and section in your output must come from it verbatim.${brandOverride}
User's original prompt (context only): ${userPrompt}

=== STITCH HTML (raw, full, unmodified) ===
${stitchHtml}`;

  // Model + max_tokens. claude-opus-4-7 supports 32K output, sonnet 4.6 supports 64K.
  const preferredModel = "claude-opus-4-7";
  const fallbackModel = "claude-sonnet-4-6";
  const modelMaxTokens: Record<string, number> = {
    "claude-opus-4-7": 32000,
    "claude-sonnet-4-6": 64000,
  };
  let model = preferredModel;
  let maxTokens = modelMaxTokens[model];

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: initialUserMsg },
  ];

  let assembled = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let attempt = 0;

  while (attempt <= MAX_CONTINUATIONS) {
    attempt++;

    let response: Awaited<ReturnType<typeof anthropic.messages.create>>;
    try {
      response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.1,
        system: REBUILD_SYSTEM,
        messages,
      });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const isModelErr =
        attempt === 1 && (e?.status === 404 || e?.status === 400 || /model/i.test(String(e?.message ?? "")));
      if (!isModelErr) throw err;
      // Fall back to sonnet only on the very first try, then continue normally.
      model = fallbackModel;
      maxTokens = modelMaxTokens[model];
      response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: 0.1,
        system: REBUILD_SYSTEM,
        messages,
      });
    }

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    const block = response.content[0];
    if (!block || block.type !== "text") {
      throw new Error("Unexpected response type from Claude.");
    }
    let chunk = block.text;

    // First chunk may have markdown fence — strip the opening only.
    if (assembled.length === 0 && chunk.trimStart().startsWith("```")) {
      chunk = chunk.replace(/^\s*```(?:html)?\n?/, "");
    }
    // Final chunk may end with a fence — strip the closing.
    if (response.stop_reason !== "max_tokens" && chunk.trimEnd().endsWith("```")) {
      chunk = chunk.replace(/\n?```\s*$/, "");
    }

    assembled += chunk;

    if (response.stop_reason !== "max_tokens") break;

    // Output was cut off — push the partial as the assistant turn and ask
    // for the rest. The system prompt instructs Claude to continue from
    // exactly where it stopped with no preamble.
    messages.push({ role: "assistant", content: block.text });
    messages.push({ role: "user", content: "continue" });
  }

  if (attempt > MAX_CONTINUATIONS) {
    console.warn(`[stitch-generate] Hit ${MAX_CONTINUATIONS} continuation rounds — accepting partial output.`);
  }

  return { html: assembled, model, inputTokens, outputTokens };
}

// ─── Metadata extraction from the rebuilt HTML ───────────────────────────────

function extractMetadata(
  html: string,
  fallbackPrompt: string,
  brandName: string | null
): {
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
  // User's explicit brand name always wins
  const name     = (brandName || h1 || title || fallback).slice(0, 80);
  const seoTitle = (brandName ? `${brandName} — Official Store` : title || name).slice(0, 70);
  const seoDesc  = (desc || `${name} — ${fallbackPrompt}`).slice(0, 200);
  return { name, seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: StitchResult; usage: StitchUsage }> {
  // Extract explicit brand name before calling Stitch so we can override later
  const brandName = extractBrandName(userPrompt);

  // Step 1: Stitch designs the full website
  const stitchHtml = await runStitch(userPrompt);

  // Step 2: Claude builds it (with auto-continuation on truncation)
  const { html, model, inputTokens, outputTokens } = await buildHtmlWithClaude(
    stitchHtml,
    userPrompt,
    brandName
  );

  // Sanity: ensure we got actual HTML
  const builtHtml = html.trim();
  if (!builtHtml.includes("</") || builtHtml.length < 500) {
    throw new Error("Website builder returned invalid output. Please try again.");
  }

  const { name, seoTitle, seoDesc } = extractMetadata(builtHtml, userPrompt, brandName);
  const type = inferWebsiteType(userPrompt);

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
