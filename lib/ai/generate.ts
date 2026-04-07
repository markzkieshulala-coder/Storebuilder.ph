import Anthropic from "@anthropic-ai/sdk";
import { Plan } from "@prisma/client";
import { calculateTokenCost } from "@/lib/utils";
import { MOCK_WEBSITE_JSON } from "./mock-data";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type GeneratedWebsite = {
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
  fonts: { heading: string; body: string };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  sections: Section[];
};

export type Section = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles: Record<string, string>;
};

const SYSTEM_PROMPT = `You are an elite web designer creating stunning, unique websites for Philippine businesses.

CRITICAL RULES:
1. Output ONLY valid JSON - no markdown, no explanation, no code blocks
2. Every website must feel hand-crafted, unique, and intentional - not generic AI output
3. Use ONLY these fonts: Playfair Display, DM Serif Display, Cormorant Garamond, Syne, Bricolage Grotesque
4. Colors must be bold and intentional - never safe or boring
5. Generate 6-8 unique sections minimum
6. All prices must be in Philippine Peso (₱)
7. Make content specific and realistic, not placeholder text
8. Every section must have unique, creative content matching the business

AVAILABLE SECTION TYPES:
- hero: fullscreen hero with headline, subheading, CTA buttons
- nav: navigation with logo and menu items
- features: grid of features/benefits with icons
- products: product grid with prices in ₱
- testimonials: customer reviews carousel
- about: brand story section
- team: team member grid
- gallery: image gallery (masonry/grid)
- pricing: pricing plans comparison
- faq: accordion FAQ section
- stats: impressive numbers/statistics
- blog: blog post preview cards
- newsletter: email signup section
- contact: contact form with details
- footer: page footer with links
- cta: call-to-action banner
- video: video showcase section
- process: how it works steps
- trust: trust badges and certifications

OUTPUT FORMAT (strict JSON):
{
  "name": "Business Name",
  "type": "STORE|BUSINESS|PORTFOLIO|RESTAURANT|SALON|LANDING",
  "seoTitle": "SEO optimized title under 60 chars",
  "seoDesc": "SEO meta description under 160 chars",
  "fonts": {
    "heading": "Font name for headings",
    "body": "Font name for body text"
  },
  "colors": {
    "primary": "#hexcolor",
    "secondary": "#hexcolor",
    "accent": "#hexcolor",
    "background": "#hexcolor",
    "text": "#hexcolor"
  },
  "sections": [
    {
      "id": "unique-id",
      "type": "section-type",
      "data": { ... section-specific data ... },
      "styles": {
        "background": "#color or gradient string",
        "textColor": "#color",
        "padding": "py-20 or similar"
      }
    }
  ]
}`;

function buildUserPrompt(userPrompt: string): string {
  return `Create a complete, stunning website based on this description: "${userPrompt}"

Requirements:
- Make it unique and memorable, not generic
- Include realistic Philippine-specific content (₱ prices, Philippine locations if relevant)
- Generate 6-8 sections that make sense for this type of business
- Make the design bold and intentional with a strong color palette
- Include specific product names, team names, testimonials, and real-looking content
- First section should always be "nav" then "hero"
- Last section should always be "footer"
- Make testimonials sound authentic with Filipino names

Output only the JSON object, nothing else.`;
}

export async function generateWebsite(
  userPrompt: string,
  plan: Plan
): Promise<{
  website: GeneratedWebsite;
  usage: { inputTokens: number; outputTokens: number; model: string; costUsd: number; costPhp: number };
}> {
  // MOCK MODE - skip API call entirely
  if (process.env.MOCK_MODE === "true") {
    console.log("[MOCK MODE] Returning mock website data");
    await new Promise((r) => setTimeout(r, 2000)); // Simulate delay
    return {
      website: MOCK_WEBSITE_JSON as GeneratedWebsite,
      usage: { inputTokens: 0, outputTokens: 0, model: "mock", costUsd: 0, costPhp: 0 },
    };
  }

  const model =
    plan === Plan.PRO ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(userPrompt) }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse JSON - strip any accidental markdown
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let website: GeneratedWebsite;
  try {
    website = JSON.parse(jsonText);
  } catch {
    throw new Error("Claude returned invalid JSON. Please try again.");
  }

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: { inputTokens, outputTokens, model, costUsd: usd, costPhp: php },
  };
}
