import { stitch, StitchError } from "@google/stitch-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { Plan } from "@prisma/client";
import { calculateTokenCost } from "@/lib/utils";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type StitchWebsite = {
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
  htmlContent: string;
};

export type StitchUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ website: StitchWebsite; usage: StitchUsage }> {
  if (!process.env.STITCH_API_KEY) {
    const err = new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
    throw err;
  }

  // ── Step 1: Stitch generates the visual design skeleton ───────────────────
  let stitchHtmlUrl: string;
  try {
    const project = await stitch.createProject(`StoreBuilder - ${Date.now()}`);
    const screen = await project.generate(
      `Professional website design for: ${userPrompt}. Desktop layout. Modern, clean, high-fidelity.`,
      "DESKTOP"
    );
    stitchHtmlUrl = await screen.getHtml();
    if (!stitchHtmlUrl) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned an empty design.",
        recoverable: true,
      });
    }
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "UNKNOWN_ERROR",
      message: (err as Error)?.message ?? "Stitch design generation failed.",
      recoverable: true,
    });
  }

  // Download the HTML content from Stitch's CDN
  let stitchHtml: string;
  try {
    const res = await fetch(stitchHtmlUrl);
    if (!res.ok) {
      throw new StitchError({
        code: "NETWORK_ERROR",
        message: `Could not download Stitch HTML (${res.status} ${res.statusText}).`,
        recoverable: true,
      });
    }
    stitchHtml = await res.text();
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "NETWORK_ERROR",
      message: (err as Error)?.message ?? "Failed to fetch Stitch HTML.",
      recoverable: true,
    });
  }

  // ── Step 2: Claude fills the Stitch design with real content ──────────────
  const fillPrompt = `You are a professional web developer completing a website for a real business.

BUSINESS DESCRIPTION:
${userPrompt}

STITCH-GENERATED HTML DESIGN:
${stitchHtml}

YOUR JOB:
1. Keep the EXACT HTML structure, CSS, and visual design from Stitch — do NOT change layout, colors, fonts, or spacing
2. Replace every placeholder text, dummy product name, lorem ipsum, and example price with real, relevant content
3. Product names, prices (in Philippine Peso ₱), and descriptions must match the actual business niche
4. Write compelling marketing copy in the tone appropriate for this business
5. All navigation links, headings, CTAs, and footer text must be relevant to this specific business
6. The result must be a production-ready, complete HTML page with no placeholder content remaining

Return ONLY a valid JSON object — no markdown fences, no explanation, nothing else:
{
  "name": "<short business name, max 50 chars>",
  "seoTitle": "<SEO page title, max 60 chars>",
  "seoDesc": "<meta description, max 160 chars>",
  "html": "<the complete filled HTML document as a JSON string>"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: fillPrompt }],
  });

  const rawText =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  // Strip accidental markdown fences
  const jsonStr = rawText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```$/m, "")
    .trim();

  let parsed: { name: string; seoTitle: string; seoDesc: string; html: string };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      "Content fill step returned invalid JSON. Please try again."
    );
  }

  if (!parsed.html) {
    throw new Error("Content fill step returned no HTML. Please try again.");
  }

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, "claude-sonnet-4-6");

  return {
    website: {
      name: parsed.name || "My Website",
      type: inferWebsiteType(userPrompt),
      seoTitle: parsed.seoTitle || parsed.name || "My Website",
      seoDesc: parsed.seoDesc || "",
      htmlContent: parsed.html,
    },
    usage: {
      model: "stitch+claude-sonnet-4-6",
      inputTokens,
      outputTokens,
      costUsd: usd,
      costPhp: php,
    },
  };
}
