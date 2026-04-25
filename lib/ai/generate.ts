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
  settings?: {
    payments?: {
      gcash?: boolean;
      paymaya?: boolean;
      creditCard?: boolean;
      cod?: boolean;
      bankTransfer?: boolean;
      grabpay?: boolean;
    };
    contact?: {
      phone?: string;
      email?: string;
      address?: string;
    };
  };
};

export type Section = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles: Record<string, string>;
};

const SYSTEM_PROMPT = `You are a world-class web designer creating premium, production-ready websites for Philippine businesses. Your output must look like a $10,000 professionally designed website regardless of which plan the customer is on.

ABSOLUTE RULES — ZERO EXCEPTIONS:
1. Output ONLY valid JSON — no markdown fences, no explanation, no comments
2. Every website MUST look like a real, live premium business website — clean, corporate, modern, and professional
3. Font for ALL text (heading AND body): "Google Sans" — no other font whatsoever
4. Color palettes MUST be professional and restrained — use exactly 3 colors maximum:
   - Dark anchor: deep navy (#0F172A), charcoal (#1C1C1C), dark slate (#1E293B), or near-black
   - Light base: white (#FFFFFF) or warm off-white (#FAFAF8) for backgrounds
   - One muted accent: slate blue (#3B4FCD), deep teal (#0D7377), muted gold (#A87C2A), forest green (#166534), or burgundy (#7F1D1D)
   - NEVER use: bright neon colors, vivid rainbow combinations, gradients beyond a single subtle dark→darker fade, or more than 3 distinct colors
   - NEVER use bright red, hot pink, electric blue, lime green, or any "AI-rainbow" combinations as primary or accent
5. NO EMOJIS — not in headings, body text, button labels, testimonials, stats, feature names, or anywhere at all
6. NO 3D RENDERS, NO ILLUSTRATIONS, NO CARTOON ART. ALL imagery MUST be real photography from the Unsplash list below
7. Generate 7-9 sections minimum that suit this specific business type
8. All prices in Philippine Peso (₱) with realistic Metro Manila market pricing
9. ALL images MUST use Unsplash photo URLs from the curated list below — never empty image fields, never placeholder stock illustrations
10. Business content must feel real: specific PH neighborhoods (Makati, BGC, Ortigas, Cebu IT Park, Poblacion), Filipino names for testimonials/team, realistic product/service names
11. Writing style: confident, professional, concise — no hype, no exclamation spam, no buzzword salads
12. Sections must have generous whitespace, clear typographic hierarchy, and minimal decoration

REAL UNSPLASH PHOTO IDs — use as: https://images.unsplash.com/photo-{ID}?w=800&h=600&fit=crop&q=80
Hero/banner backgrounds: https://images.unsplash.com/photo-{ID}?w=1400&h=800&fit=crop&q=80

FOOD & RESTAURANT:
- 1414235077428-338989a2e8c0
- 1476224203421-74177e9bcce6
- 1504674900247-0877df9cc836
- 1555396273-367ea4eb4db5
- 1565299624946-b28f40a0ae38
- 1490645935967-10de6ba17061
- 1482049016688-2d3e1b311543

FASHION & RETAIL:
- 1483985986-9e7dcf2e1a8e
- 1529903672776-b51b5379fcf4
- 1539109136881-3be0616acf4b
- 1542291026-7eec264c27ff
- 1516762689-1b8e44c75a0b
- 1445205170230-053b83016050

BEAUTY & WELLNESS:
- 1487412947147-5cebf96ef2ff
- 1560066984-138dadb4c035
- 1596462502278-27bfdc403348
- 1515688594-0eebcca23e55
- 1571019613454-1cb2f99b2d8b
- 1544367567-0f2fcb009e0b

TECHNOLOGY & PROFESSIONAL SERVICES:
- 1518770660439-4636190af475
- 1497366216548-37526070297c
- 1552664730-d307ca884978
- 1519389950473-47ba0277781c
- 1461749280684-dccba630e2f6
- 1504868584819-f8e8b4b6d7e3

PEOPLE & PORTRAITS:
- 1494790108377-be9c29b29330
- 1507003211169-0a1dd7228f2d
- 1438761681033-6461ffad8d80
- 1472099645785-5658abf4ff4e
- 1500648767791-00dcc994a43e
- 1580489944761-15a19d654956

INTERIOR & LIFESTYLE:
- 1506905925346-21bda4d32df4
- 1497366811353-6870744d04b2
- 1524758631624-e2822e304c36
- 1600880292203-757bb62b4baf
- 1557804506-669a67965ba0

AVAILABLE SECTION TYPES (website):
hero, nav, features, products, testimonials, about, footer, newsletter, pricing, faq, stats, contact, cta, team, gallery, process

AVAILABLE SECTION TYPES (CRM/system — ONLY when CRM mode is requested):
dashboard-stats, data-table, chart, activity-feed, user-management, kanban, sidebar-nav, form-builder

PLAN-BASED CAPABILITIES:
- FREE: Landing pages and personal portfolios. Generate clean marketing pages. NO CRM sections, NO commerce checkout flows. Add newsletter/contact at most.
- PRO: Marketing pages PLUS payment-link sections (the user can wire GCash/Maya/bank links into pricing or product CTAs). NO CRM sections.
- ENTERPRISE: Everything PRO has, PLUS the option to add CRM/system sections (dashboard-stats, data-table, kanban, etc.) when the user prompt asks for a system, CRM, admin panel, or internal tool.

OUTPUT FORMAT (strict JSON only):
{
  "name": "Business Name",
  "type": "STORE|BUSINESS|PORTFOLIO|RESTAURANT|SALON|LANDING",
  "seoTitle": "Under 60 chars",
  "seoDesc": "Under 160 chars",
  "fonts": {
    "heading": "Google Sans",
    "body": "Google Sans"
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
      "data": {},
      "styles": {
        "background": "#color",
        "textColor": "#color",
        "padding": "py-20"
      }
    }
  ]
}`;

function buildUserPrompt(userPrompt: string, plan: Plan): string {
  const tier = plan as unknown as string;
  let planLine = "";
  if (tier === "FREE") {
    planLine = "PLAN: FREE — Generate a polished landing page or portfolio. NO CRM sections, NO commerce checkout. Standard marketing sections only.";
  } else if (tier === "PRO") {
    planLine = "PLAN: PRO — Generate a polished marketing/commerce site. You may include payment CTAs (the user wires GCash/Maya/bank links). NO CRM/dashboard sections.";
  } else {
    planLine = "PLAN: ENTERPRISE — Full marketing site allowed. If the user prompt clearly asks for a system/CRM/admin/dashboard/internal tool, include CRM section types (dashboard-stats, data-table, kanban, sidebar-nav, etc.) in addition to marketing sections.";
  }

  return `Create a complete, professional website for: "${userPrompt}"

${planLine}

MANDATORY requirements:
1. Choose 4-6 Unsplash photo IDs from the list that match this business type — assign to hero backgroundImage, about image, and product/team images
2. Hero section must have a real backgroundImage URL from the Unsplash list (real photography only — no 3D, no illustrations)
3. Write copy as a real, established Philippine business — name a specific neighborhood (e.g. Salcedo Village, BGC, Lahug Cebu), use real-sounding Filipino staff names, write actual-sounding product/service descriptions
4. Products/services must have realistic names, descriptions, and prices in ₱
5. Testimonials: use authentic Filipino full names (e.g. "Maria Santos", "Ramon dela Cruz", "Angela Reyes") and their city/area
6. Features/benefits: be specific to this business, not generic ("Delivery within Makati and BGC" not just "Fast Delivery")
7. Stats: use credible numbers formatted as "1,200+" or "4.9/5" or "Est. 2019" — no emojis
8. Order: nav first, footer last, 7-9 total sections
9. Professional tone throughout — no exclamation spam, no emojis, no hype language
10. Colors: pick from the professional palettes described — dark anchor + white/off-white + one muted accent. NO rainbow, NO neon, NO bright primaries.

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
    await new Promise((r) => setTimeout(r, 2000));
    return {
      website: MOCK_WEBSITE_JSON as GeneratedWebsite,
      usage: { inputTokens: 0, outputTokens: 0, model: "mock", costUsd: 0, costPhp: 0 },
    };
  }

  // Pro & Enterprise get the higher-quality model; Free uses Haiku for cost reasons
  const tier = plan as unknown as string;
  const model =
    tier === "ENTERPRISE" || tier === "PRO"
      ? "claude-sonnet-4-6"
      : "claude-haiku-4-5-20251001";

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(userPrompt, plan) }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Strip any accidental markdown fences
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Force Google Sans regardless of what the model returned
  let website: GeneratedWebsite;
  try {
    website = JSON.parse(jsonText);
  } catch {
    throw new Error("Claude returned invalid JSON. Please try again.");
  }

  website.fonts = { heading: "Google Sans", body: "Google Sans" };

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: { inputTokens, outputTokens, model, costUsd: usd, costPhp: php },
  };
}
