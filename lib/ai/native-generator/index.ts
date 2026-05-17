/**
 * Native Premium Generator
 *
 * Drives the four design skills + their reference docs + component library
 * + asset manifests through Claude to produce a complete, self-contained
 * HTML website from a user prompt.
 *
 * Source of truth: lib/ai/native-generator/system/  (verbatim contents of the
 * uploaded Website Generator System zip). All files in that tree are loaded
 * into the model's system prompt — the model assembles the final HTML from
 * those files, nothing else.
 *
 * Output contract: { result: GenerationResult, usage: GenerationUsage }
 * — identical shape to the retired Stitch pipeline so app/api/generate/route.ts
 * and all downstream consumers require zero changes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Load the full Website Generator System bundle at module init ─────────────

const SYSTEM_DIR = join(process.cwd(), "lib/ai/native-generator/system");

const read = (p: string) => readFileSync(join(SYSTEM_DIR, p), "utf-8");

// 4 skill cores
const SKILL_DESIGN   = read("design-intelligence-engine/SKILL.md");
const SKILL_ASSETS   = read("premium-asset-pipeline/SKILL.md");
const SKILL_COMPILER = read("style-injection-compiler/SKILL.md");
const SKILL_COMPS    = read("universal-component-library/SKILL.md");

// design-intelligence-engine references
const REF_STYLE_EXTRACTION   = read("design-intelligence-engine/references/style-extraction-guide.md");
const REF_WEBSITE_TYPE_REQS  = read("design-intelligence-engine/references/website-type-requirements.md");
const TMPL_UDM_MANIFEST      = read("design-intelligence-engine/assets/manifest-template.json");

// premium-asset-pipeline references
const REF_COPYWRITING_RULES  = read("premium-asset-pipeline/references/copywriting-rules.md");
const TMPL_ACM_MANIFEST      = read("premium-asset-pipeline/assets/asset-manifest-template.json");

// style-injection-compiler references
const REF_BUILD_PIPELINE     = read("style-injection-compiler/references/build-pipeline.md");
const REF_CODEGEN_PATTERNS   = read("style-injection-compiler/references/code-generation-patterns.md");
const REF_LAYOUT_MAPPER      = read("style-injection-compiler/references/layout-hierarchy-mapper.md");
const REF_PAGE_ASSEMBLY      = read("style-injection-compiler/references/page-assembly-rules.md");

// universal-component-library
const GLOBALS_CSS            = read("universal-component-library/assets/globals.css");
const REF_COMPONENT_PATTERNS = read("universal-component-library/references/component-patterns.md");
const COMP_HERO              = read("universal-component-library/assets/components/Hero.tsx");
const COMP_PRODUCT_GRID      = read("universal-component-library/assets/components/ProductGrid.tsx");
const COMP_GALLERY           = read("universal-component-library/assets/components/Gallery.tsx");
const COMP_TESTIMONIALS      = read("universal-component-library/assets/components/Testimonials.tsx");
const COMP_BUTTON            = read("universal-component-library/assets/components/Button.tsx");
const COMP_CARD              = read("universal-component-library/assets/components/Card.tsx");
const COMP_BADGE             = read("universal-component-library/assets/components/Badge.tsx");
const COMP_CONTAINER         = read("universal-component-library/assets/components/Container.tsx");

// ─── Model config ─────────────────────────────────────────────────────────────

// Sonnet is the default: it's 3-5× faster than Opus and fully capable of
// following the SKILL instructions. Override with GENERATOR_MODEL env var.
const MODEL = (process.env.GENERATOR_MODEL ?? "claude-sonnet-4-6") as string;

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
  return `You are the Website Generator System for Storebuilder.ph — a premium AI-powered website builder serving the Philippine market.

Your mission: given a user's text prompt, generate a COMPLETE, SELF-CONTAINED HTML website that looks and feels premium, professional, and publication-ready. Real brand names. Real conversion copy. Real images. Real layouts. No placeholders. No lorem ipsum.

You assemble the final HTML by executing the following four skills in sequence, strictly following their SKILL.md instructions and the supplied reference documents, manifest templates, and component sources. No other source of design knowledge may be used.

═════════════════════════════════════════════════════════════════════════════
SKILL 1 — DESIGN INTELLIGENCE ENGINE
═════════════════════════════════════════════════════════════════════════════
${SKILL_DESIGN}

── Reference: Style Extraction Guide ──
${REF_STYLE_EXTRACTION}

── Reference: Website Type Requirements ──
${REF_WEBSITE_TYPE_REQS}

── Template: UDM (Universal Design Manifest) ──
\`\`\`json
${TMPL_UDM_MANIFEST}
\`\`\`

═════════════════════════════════════════════════════════════════════════════
SKILL 2 — PREMIUM ASSET & COPY PIPELINE
═════════════════════════════════════════════════════════════════════════════
${SKILL_ASSETS}

── Reference: Copywriting Rules ──
${REF_COPYWRITING_RULES}

── Template: ACM (Asset + Copy Manifest) ──
\`\`\`json
${TMPL_ACM_MANIFEST}
\`\`\`

═════════════════════════════════════════════════════════════════════════════
SKILL 3 — STYLE INJECTION COMPILER
═════════════════════════════════════════════════════════════════════════════
${SKILL_COMPILER}

── Reference: Build Pipeline ──
${REF_BUILD_PIPELINE}

── Reference: Layout Hierarchy Mapper ──
${REF_LAYOUT_MAPPER}

── Reference: Page Assembly Rules ──
${REF_PAGE_ASSEMBLY}

── Reference: Code Generation Patterns ──
${REF_CODEGEN_PATTERNS}

═════════════════════════════════════════════════════════════════════════════
SKILL 4 — UNIVERSAL COMPONENT LIBRARY
═════════════════════════════════════════════════════════════════════════════
${SKILL_COMPS}

── Reference: Component Patterns ──
${REF_COMPONENT_PATTERNS}

── CSS Variable System: globals.css ──
Embed this CSS verbatim inside the <style> block in <head>, with token VALUES
updated to match the UDM resolved_tokens for this specific website.

\`\`\`css
${GLOBALS_CSS}
\`\`\`

── Component Source: Hero.tsx (translate to semantic HTML) ──
\`\`\`tsx
${COMP_HERO}
\`\`\`

── Component Source: ProductGrid.tsx ──
\`\`\`tsx
${COMP_PRODUCT_GRID}
\`\`\`

── Component Source: Gallery.tsx ──
\`\`\`tsx
${COMP_GALLERY}
\`\`\`

── Component Source: Testimonials.tsx ──
\`\`\`tsx
${COMP_TESTIMONIALS}
\`\`\`

── Component Source: Button.tsx ──
\`\`\`tsx
${COMP_BUTTON}
\`\`\`

── Component Source: Card.tsx ──
\`\`\`tsx
${COMP_CARD}
\`\`\`

── Component Source: Badge.tsx ──
\`\`\`tsx
${COMP_BADGE}
\`\`\`

── Component Source: Container.tsx ──
\`\`\`tsx
${COMP_CONTAINER}
\`\`\`

═════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (follow exactly — no text before or after)
═════════════════════════════════════════════════════════════════════════════

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

═════════════════════════════════════════════════════════════════════════════
GENERATION RULES (read carefully — these supersede default assumptions)
═════════════════════════════════════════════════════════════════════════════

## RUNTIME ENVIRONMENT
- Output is a single self-contained HTML file rendered inside an iframe (srcDoc)
- NOT a React build — translate the .tsx component sources above into semantic
  HTML + CSS that produces the same visual structure and props
- Do NOT emit React, JSX, imports, or build configuration in the final output

## CSS & STYLING
- All styles go inside ONE <style> block in <head> — no external stylesheets
- Start the <style> block with the full globals.css variable system (with token
  values resolved from the UDM you produce for this website)
- All component styles consume those variables via var(--…)
- @import for Google Fonts goes at the very top of the <style> block
- Every color must be a CSS variable — no hardcoded hex values outside :root

## IMAGES
- Use Unsplash format: https://images.unsplash.com/photo-{PHOTO_ID}?w=1200&h=800&auto=format&fit=crop&q=80
- Use real, specific, high-quality photo IDs that match the website type and industry
- Do NOT use placeholder services (placehold.co, picsum, lorempixel)
- Every <img> must have a descriptive alt attribute

## COPY & BRAND NAME
- Extract the brand name EXACTLY from the user prompt — no paraphrasing, no translation
- Generate conversion-optimized copy following the Copywriting Rules above
- If Philippines-based, use Philippine context (₱ for prices, local references)
- Zero-Placeholder Policy applies — no lorem ipsum, no "Your Brand", no bracketed placeholders

## SECTIONS
Include all applicable sections for the website type, per page-assembly-rules.md:
- Navigation (sticky, responsive, hamburger on mobile via checkbox hack or JS toggle)
- Hero (matches UDM layout variant: split, fullscreen, centered, minimal, editorial, or split-asymmetric)
- Features / Services / Benefits
- Products / Portfolio / Team (as applicable)
- Social proof / Testimonials
- CTA / Newsletter / Contact
- Footer

## data-editable ATTRIBUTES (REQUIRED on all editable elements)
- <section>: data-editable="section" data-section-label="{Section Name}"
- Headings and paragraphs: data-editable="text"
- <img>: data-editable="image"
- <button>: data-editable="button"
- <a>: data-editable="button" (CTA-style) or data-editable="link"

## RESPONSIVE
- Mobile-first using CSS media queries
- Navigation collapses to hamburger on mobile
- Grid columns collapse on small screens
- All text sizes use clamp() per globals.css

## NO REFERENCE IMAGE
- The StyleExtractor stage from SKILL 1 is skipped (no image provided)
- Run IntentParser on the prompt, then apply niche_requirements defaults
- Derive all design tokens from niche + tone inference alone

console.log('[WebsiteGeneratorSystem] active — assembling from system/');
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

  let htmlContent = text.replace(/<!--\s*SITE_META[\s\S]*?-->/, "").trim();

  const fence = htmlContent.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/);
  if (fence) htmlContent = fence[1].trim();

  type = type.toUpperCase().replace(/-/g, "_");

  return { htmlContent, name, type, seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runNativeGenerator(
  userPrompt: string
): Promise<{ result: NativeGenerationResult; usage: NativeGenerationUsage }> {
  console.log(
    "[WebsiteGeneratorSystem] assembling from lib/ai/native-generator/system/ — model:",
    MODEL
  );

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a premium website for the following request:\n\n${userPrompt}`,
        },
      ],
    },
    // 5-minute request timeout — the large system prompt + HTML output can
    // take up to 90 s on Sonnet. Default SDK timeout is 600 s but we set it
    // explicitly so it's visible and intentional.
    { timeout: 300_000 }
  );

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const { htmlContent, name, type, seoTitle, seoDesc } = parseResponse(text);

  const pricing = PRICING[MODEL] ?? PRICING["claude-opus-4-7"];
  const inputTokens  = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * pricing.input + outputTokens * pricing.output;
  const costPhp = costUsd * USD_TO_PHP;

  console.log(
    `[WebsiteGeneratorSystem] done — ${inputTokens} in / ${outputTokens} out — $${costUsd.toFixed(4)} USD`
  );

  return {
    result: { htmlContent, name, type, seoTitle, seoDesc },
    usage:  { model: MODEL, inputTokens, outputTokens, costUsd, costPhp },
  };
}
