/**
 * Native Premium Generator
 *
 * Runs the four design skills (design-intelligence-engine, premium-asset-pipeline,
 * style-injection-compiler, universal-component-library) through Claude to produce
 * a complete, self-contained HTML website from a user prompt.
 *
 * Output contract: { result: GenerationResult, usage: GenerationUsage }
 * — identical shape to the retired Stitch pipeline so app/api/generate/route.ts
 * and all downstream consumers require zero changes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Load skills once at module init (server-side only) ───────────────────────

const SKILLS_DIR = join(process.cwd(), "lib/ai/native-generator/skills");
const ASSETS_DIR = join(process.cwd(), "lib/ai/native-generator/assets");

const SKILL_DESIGN    = readFileSync(join(SKILLS_DIR, "design-intelligence-engine.md"),   "utf-8");
const SKILL_ASSETS    = readFileSync(join(SKILLS_DIR, "premium-asset-pipeline.md"),       "utf-8");
const SKILL_COMPILER  = readFileSync(join(SKILLS_DIR, "style-injection-compiler.md"),     "utf-8");
const SKILL_COMPS     = readFileSync(join(SKILLS_DIR, "universal-component-library.md"),  "utf-8");
const GLOBALS_CSS     = readFileSync(join(ASSETS_DIR, "globals.css"),                     "utf-8");

// ─── Model config ─────────────────────────────────────────────────────────────

// Override with GENERATOR_MODEL env var if you want a different model.
const MODEL = (process.env.GENERATOR_MODEL ?? "claude-opus-4-7") as string;

// Pricing per token (defaults for claude-opus-4-7; overridden per model below)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7":   { input: 15   / 1_000_000, output: 75  / 1_000_000 },
  "claude-sonnet-4-6": { input: 3    / 1_000_000, output: 15  / 1_000_000 },
  "claude-haiku-4-5-20251001": { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};
const USD_TO_PHP = 57;

// ─── Output types ─────────────────────────────────────────────────────────────

export type NativeGenerationResult = {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
};

export type NativeGenerationUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

// ─── System prompt (built once per process) ───────────────────────────────────

function buildSystemPrompt(): string {
  return `You are the Native Premium Generator for Storebuilder.ph — a premium AI-powered website builder serving the Philippine market.

Your mission: given a user's text prompt, generate a COMPLETE, SELF-CONTAINED HTML website that looks and feels premium, professional, and publication-ready. Real brand names. Real conversion copy. Real images. Real layouts. No placeholders. No lorem ipsum.

You execute the following design skills in sequence:

---
# SKILL 1 — DESIGN INTELLIGENCE ENGINE
${SKILL_DESIGN}

---
# SKILL 2 — PREMIUM ASSET & COPY PIPELINE
${SKILL_ASSETS}

---
# SKILL 3 — STYLE INJECTION COMPILER
${SKILL_COMPILER}

---
# SKILL 4 — UNIVERSAL COMPONENT LIBRARY
${SKILL_COMPS}

---
# CSS VARIABLE SYSTEM (globals.css)
Embed the following in a <style> block in <head>, with token values updated to match the website's UDM resolved_tokens:

${GLOBALS_CSS}

---
# OUTPUT FORMAT (follow exactly — no text before or after)

<!-- SITE_META
name: {exact brand/business/store name from the user prompt — NEVER invent or change names}
type: {STORE|PORTFOLIO|SAAS|BLOG|LANDING|RESTAURANT|AGENCY|EDUCATION|REAL_ESTATE}
seoTitle: {compelling page title, 50–60 chars}
seoDesc: {compelling meta description, 140–160 chars}
-->
<!DOCTYPE html>
<html lang="en">
…full website HTML…
</html>

---
# GENERATION RULES

## CSS & STYLING
- All styles go inside ONE <style> block in <head> — no external stylesheets
- Start the <style> block with the full globals.css variable system (updated tokens)
- Then add component styles that consume those variables via var(--…)
- Include @import for Google Fonts at the very top of the <style> block
- Every color must be a CSS variable — no hardcoded hex values outside :root

## IMAGES
- Use Unsplash: https://images.unsplash.com/photo-{PHOTO_ID}?w=1200&h=800&auto=format&fit=crop&q=80
- Use real, specific, high-quality photo IDs from your knowledge that match the website type and industry
- Do NOT use placeholder image services (placehold.co, picsum, lorempixel, etc.)
- Every <img> must have a descriptive alt attribute

## COPY & BRAND NAME
- Extract the brand name EXACTLY from the user prompt — no paraphrasing, no translation
- Generate professional, conversion-optimized copy using the NicheCopywriter skill
- If the business is Philippines-based, use Philippine context (₱ for prices, local references)
- No lorem ipsum, no "Company Name", no "Your Brand"

## SECTIONS (include all applicable for the website type)
- Navigation (sticky, responsive with hamburger on mobile via checkbox hack or JS toggle)
- Hero (large, impactful, matches UDM layout variant)
- Features / Services / Benefits (3–6 items with icons or images)
- Products / Portfolio / Team (as applicable, minimum 3–4 items)
- Social proof / Testimonials (3 quotes, realistic names and companies)
- CTA / Newsletter / Contact section
- Footer (links, contact info, copyright)

## data-editable ATTRIBUTES (required on ALL editable elements)
- <section>: data-editable="section" data-section-label="{Section Name}"
- Headings and paragraphs: data-editable="text"
- <img>: data-editable="image"
- <button>: data-editable="button"
- <a>: data-editable="button" (if CTA-style) or data-editable="link"

## RESPONSIVE
- Mobile-first using CSS media queries
- Navigation collapses to hamburger on mobile
- Grid columns collapse on small screens
- All text sizes are fluid (clamp() already set in globals.css variables)

## NO REFERENCE IMAGE
- The StyleExtractor stage is skipped (no image provided)
- Run IntentParser on the prompt, then apply niche_requirements defaults
- Derive all design tokens from the niche + tone inference alone

console.log('[NativeGenerator] Native Premium Generator active');
`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

// ─── Response parsing ─────────────────────────────────────────────────────────

function parseResponse(text: string): {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
} {
  // Extract <!-- SITE_META ... --> block
  const metaMatch = text.match(/<!--\s*SITE_META\s*([\s\S]*?)-->/);

  let name     = "My Website";
  let type     = "LANDING";
  let seoTitle = "";
  let seoDesc  = "";

  if (metaMatch) {
    const meta = metaMatch[1];
    name     = meta.match(/name:\s*(.+)/)?.[1]?.trim()     ?? name;
    type     = meta.match(/type:\s*(.+)/)?.[1]?.trim()     ?? type;
    seoTitle = meta.match(/seoTitle:\s*(.+)/)?.[1]?.trim() ?? name;
    seoDesc  = meta.match(/seoDesc:\s*(.+)/)?.[1]?.trim()  ?? "";
  }

  // Strip the metadata comment — everything else is the HTML
  let htmlContent = text.replace(/<!--\s*SITE_META[\s\S]*?-->/, "").trim();

  // Strip markdown code fences if Claude wrapped the HTML
  const fence = htmlContent.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/);
  if (fence) htmlContent = fence[1].trim();

  // Normalize type to uppercase
  type = type.toUpperCase().replace(/-/g, "_");

  return { htmlContent, name, type, seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runNativeGenerator(
  userPrompt: string
): Promise<{ result: NativeGenerationResult; usage: NativeGenerationUsage }> {
  console.log("[NativeGenerator] Native Premium Generator active — model:", MODEL);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a premium website for the following request:\n\n${userPrompt}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const { htmlContent, name, type, seoTitle, seoDesc } = parseResponse(text);

  // Cost calculation
  const pricing = PRICING[MODEL] ?? PRICING["claude-opus-4-7"];
  const inputTokens  = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output;
  const costPhp = costUsd * USD_TO_PHP;

  console.log(
    `[NativeGenerator] done — ${inputTokens} in / ${outputTokens} out — $${costUsd.toFixed(4)} USD`
  );

  return {
    result: { htmlContent, name, type, seoTitle, seoDesc },
    usage:  { model: MODEL, inputTokens, outputTokens, costUsd, costPhp },
  };
}
