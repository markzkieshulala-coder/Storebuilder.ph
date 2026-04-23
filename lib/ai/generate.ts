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

const SYSTEM_PROMPT = `You are an elite web designer creating stunning, production-ready websites for Philippine businesses.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown, no explanation, no code blocks
2. Every website must look like a LIVE, professional site — not an AI demo or wireframe
3. Use ONLY these fonts: Playfair Display, DM Serif Display, Cormorant Garamond, Syne, Bricolage Grotesque
4. Colors must be bold and intentional — never safe or boring
5. Generate 7-9 unique sections minimum
6. All prices must be in Philippine Peso (₱) with realistic market pricing
7. ALL images MUST use real Unsplash photo URLs from the curated list below — never leave image fields empty
8. Content must be hyper-realistic: real-sounding business names, addresses, staff names, product names
9. All layouts must be mobile-first and fully responsive (hero text scales from 40px mobile to 80px desktop)

REAL UNSPLASH PHOTO IDs — use these as: https://images.unsplash.com/photo-{ID}?w=800&h=600&fit=crop&q=80
For wider hero backgrounds use: https://images.unsplash.com/photo-{ID}?w=1400&h=800&fit=crop&q=80

FOOD & RESTAURANT:
- 1414235077428-338989a2e8c0 (restaurant food spread)
- 1476224203421-74177e9bcce6 (Asian cuisine plating)
- 1504674900247-0877df9cc836 (healthy meal bowl)
- 1555396273-367ea4eb4db5 (upscale restaurant interior)
- 1565299624946-b28f40a0ae38 (pizza close-up)
- 1490645935967-10de6ba17061 (salad bowl)
- 1482049016688-2d3e1b311543 (breakfast spread)

FASHION & CLOTHING:
- 1483985986-9e7dcf2e1a8e (fashion shopping bags)
- 1529903672776-b51b5379fcf4 (model in stylish outfit)
- 1539109136881-3be0616acf4b (clothing detail)
- 1542291026-7eec264c27ff (sneakers product shot)
- 1516762689-1b8e44c75a0b (jewelry accessories)
- 1445205170230-053b83016050 (fashion lifestyle)

BEAUTY & WELLNESS:
- 1487412947147-5cebf96ef2ff (makeup and cosmetics)
- 1560066984-138dadb4c035 (salon interior)
- 1596462502278-27bfdc403348 (skincare products)
- 1515688594-0eebcca23e55 (beauty treatment)
- 1571019613454-1cb2f99b2d8b (fitness workout)
- 1544367567-0f2fcb009e0b (wellness spa)

TECHNOLOGY & BUSINESS:
- 1518770660439-4636190af475 (tech circuit board)
- 1497366216548-37526070297c (modern office)
- 1552664730-d307ca884978 (business team meeting)
- 1519389950473-47ba0277781c (startup workspace)
- 1461749280684-dccba630e2f6 (code on screen)
- 1504868584819-f8e8b4b6d7e3 (laptop workspace)

PEOPLE & PORTRAITS:
- 1494790108377-be9c29b29330 (woman professional headshot)
- 1507003211169-0a1dd7228f2d (man professional headshot)
- 1438761681033-6461ffad8d80 (woman smiling)
- 1472099645785-5658abf4ff4e (man casual portrait)
- 1500648767791-00dcc994a43e (man with glasses)
- 1580489944761-15a19d654956 (woman confident pose)

LIFESTYLE & GENERAL:
- 1506905925346-21bda4d32df4 (scenic Philippines landscape)
- 1557804506-669a67965ba0 (abstract business)
- 1497366811353-6870744d04b2 (modern interior)
- 1524758631624-e2822e304c36 (product flat lay)
- 1600880292203-757bb62b4baf (clean product mockup)

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
  return `Create a complete, live-looking professional website for: "${userPrompt}"

MANDATORY requirements — no exceptions:
1. Pick 4-6 Unsplash photo IDs from the list above that best match this business type and assign them to: hero backgroundImage, about image, and product/team images
2. All hero sections need a backgroundImage with a real Unsplash URL
3. Write copy as if this is a real, established Philippine business — specific neighborhood (Makati, BGC, Cebu, etc.), real-sounding staff names, actual-sounding product descriptions
4. Products must have realistic names, descriptions, prices in ₱, and images from the Unsplash list
5. Testimonials must use authentic Filipino full names (e.g. "Maria Santos", "Juan dela Cruz", "Angela Reyes") and specific locations
6. Features/benefits must be concrete and business-specific, not generic ("Fast Delivery" → "Same-day delivery within BGC, Makati, and Pasig")
7. Stats must look real: format as "1,200+" or "4.9★" or "Since 2018"
8. Generate 7-9 sections that make sense for this exact type of business
9. First section: nav → hero, last section: footer
10. Design must use a strong, intentional color palette — not white-and-blue or generic corporate

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
