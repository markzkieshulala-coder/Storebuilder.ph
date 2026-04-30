import Anthropic from "@anthropic-ai/sdk";
import { Plan } from "@prisma/client";
import { calculateTokenCost } from "@/lib/utils";
import { MOCK_WEBSITE_JSON } from "./mock-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    contact?: { phone?: string; email?: string; address?: string };
  };
  // Injected at runtime for published sites — not stored in JSON
  subdomain?: string;
};

export type Section = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  styles: Record<string, string>;
};

// ─── Approved professional palettes ──────────────────────────────────────────
// Each palette: [background, surface, text, accent]
const PROFESSIONAL_PALETTES = [
  { background: "#0F172A", primary: "#1E293B", text: "#F1F5F9", accent: "#3B82F6", secondary: "#c9a84c" },
  { background: "#1C1C1C", primary: "#2C2C2C", text: "#F5F0E8", accent: "#A87C2A", secondary: "#c9a84c" },
  { background: "#0d0d1a", primary: "#12122a", text: "#f5f0e8", accent: "#c9a84c", secondary: "#e8d5b7" },
  { background: "#111827", primary: "#1F2937", text: "#F9FAFB", accent: "#0D7377", secondary: "#6EE7B7" },
  { background: "#1E1B18", primary: "#292521", text: "#FAFAF8", accent: "#78350F", secondary: "#D97706" },
  { background: "#0F1923", primary: "#162032", text: "#E2E8F0", accent: "#1E40AF", secondary: "#93C5FD" },
  { background: "#18181B", primary: "#27272A", text: "#FAFAFA", accent: "#166534", secondary: "#4ADE80" },
  { background: "#1A0F0F", primary: "#2D1515", text: "#FEF2F2", accent: "#7F1D1D", secondary: "#FCA5A5" },
];

// ─── Detect & replace non-professional colors ────────────────────────────────
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function isNeonOrBright(hex: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const hsl = hexToHsl(hex);
  if (!hsl) return false;
  // High saturation + medium lightness = vivid/neon — reject
  return hsl.s > 0.55 && hsl.l > 0.35 && hsl.l < 0.80;
}

// Backgrounds must be dark. Anything with L > 20% is too light for a bg.
function isTooLight(hex: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const hsl = hexToHsl(hex);
  if (!hsl) return false;
  return hsl.l > 0.20;
}

function pickPalette(seed: string): typeof PROFESSIONAL_PALETTES[0] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PROFESSIONAL_PALETTES[Math.abs(hash) % PROFESSIONAL_PALETTES.length];
}

function sanitizeColors(website: GeneratedWebsite): GeneratedWebsite {
  const palette = pickPalette(website.name || "default");

  // Dark colors only: reject neon/bright AND anything too light for bg use
  const safeDark = (val: string, fallback: string) =>
    val && val.startsWith("#") && !isNeonOrBright(val) && !isTooLight(val) ? val : fallback;

  // Accent/text are allowed to be light; only reject neon
  const safeColor = (val: string, fallback: string) =>
    val && val.startsWith("#") && !isNeonOrBright(val) ? val : fallback;

  website.colors = {
    background: safeDark(website.colors?.background, palette.background),
    primary:    safeDark(website.colors?.primary,    palette.primary),
    secondary:  safeColor(website.colors?.secondary,  palette.secondary),
    accent:     safeColor(website.colors?.accent,     palette.accent),
    text:       safeColor(website.colors?.text,       palette.text),
  };

  // Enforce section-level styles
  website.sections = website.sections.map((s) => {
    const bg  = s.styles?.background;
    const tc  = s.styles?.textColor;
    const acc = s.styles?.accentColor;
    const newStyles: Record<string, string> = { ...s.styles };

    // Background: reject vivid/neon colors AND light/white colors
    if (bg && bg.startsWith("#") && (isNeonOrBright(bg) || isTooLight(bg))) {
      newStyles.background = palette.background;
    }
    if (bg && bg.startsWith("linear-gradient") && /(?:red|blue|green|yellow|purple|pink|orange|cyan|lime|white|#[fF][fF]|#[eE][eE])/i.test(bg)) {
      newStyles.background = `linear-gradient(135deg, ${palette.background} 0%, ${palette.primary} 100%)`;
    }

    if (tc && isNeonOrBright(tc)) newStyles.textColor = palette.text;
    if (acc && isNeonOrBright(acc)) newStyles.accentColor = palette.accent;

    return { ...s, styles: newStyles };
  });

  return website;
}

// ─── Strip plan-disallowed sections ──────────────────────────────────────────
const CRM_SECTION_TYPES = new Set(["dashboard-stats", "data-table", "chart", "activity-feed", "user-management", "kanban", "sidebar-nav", "form-builder"]);
const PAYMENT_SECTION_TYPES = new Set(["pricing"]);
// FREE plan: landing/portfolio only — no product grids or checkout
const FREE_BLOCKED_TYPES = new Set(["products"]);

function enforcePlanSections(website: GeneratedWebsite, plan: string): GeneratedWebsite {
  website.sections = website.sections.filter((s) => {
    // CRM sections allowed on PRO + ENTERPRISE
    if (CRM_SECTION_TYPES.has(s.type) && plan !== "ENTERPRISE" && plan !== "PRO") return false;
    if (FREE_BLOCKED_TYPES.has(s.type) && plan === "FREE") return false;
    return true;
  });
  return website;
}

// ─── Ensure all images are real Unsplash URLs ────────────────────────────────
const UNSPLASH_BASE = "https://images.unsplash.com/photo-";
const FALLBACK_PHOTOS = [
  "1497366216548-37526070297c", "1518770660439-4636190af475",
  "1504674900247-0877df9cc836", "1555396273-367ea4eb4db5",
  "1483985986-9e7dcf2e1a8e", "1529903672776-b51b5379fcf4",
  "1560066984-138dadb4c035", "1506905925346-21bda4d32df4",
];
let fallbackIdx = 0;
function fallbackPhoto(size = "800x600"): string {
  const id = FALLBACK_PHOTOS[fallbackIdx++ % FALLBACK_PHOTOS.length];
  const [w, h] = size.split("x");
  return `${UNSPLASH_BASE}${id}?w=${w}&h=${h}&fit=crop&q=80`;
}

function sanitizeImages(website: GeneratedWebsite): GeneratedWebsite {
  website.sections = website.sections.map((s) => {
    const d = s.data as any;

    // Hero backgroundImage
    if (s.type === "hero" && d.backgroundImage !== undefined) {
      if (!d.backgroundImage || !d.backgroundImage.startsWith("https://images.unsplash.com")) {
        d.backgroundImage = fallbackPhoto("1400x800");
      }
    }

    // About image
    if (s.type === "about" && d.image !== undefined) {
      if (!d.image || !d.image.startsWith("https://images.unsplash.com")) {
        d.image = fallbackPhoto("1000x750");
      }
    }

    // Product images
    if (s.type === "products" && Array.isArray(d.products)) {
      d.products = d.products.map((p: any) => {
        if (!p.image || !p.image.startsWith("https://images.unsplash.com")) {
          p.image = fallbackPhoto("600x600");
        }
        return p;
      });
    }

    // Team / gallery images
    if ((s.type === "team") && Array.isArray(d.members)) {
      d.members = d.members.map((m: any) => {
        if (!m.image || !m.image.startsWith("https://images.unsplash.com")) {
          m.image = fallbackPhoto("400x400");
        }
        return m;
      });
    }

    if (s.type === "gallery" && Array.isArray(d.images)) {
      d.images = d.images.map((img: any) => {
        const url = typeof img === "string" ? img : img?.url;
        if (!url || !url.startsWith("https://images.unsplash.com")) {
          return fallbackPhoto("800x800");
        }
        return img;
      });
    }

    // Testimonial avatars
    if (s.type === "testimonials" && Array.isArray(d.testimonials)) {
      d.testimonials = d.testimonials.map((t: any) => {
        if (t.image && !t.image.startsWith("https://images.unsplash.com")) {
          t.image = fallbackPhoto("100x100");
        }
        return t;
      });
    }

    return { ...s, data: d };
  });

  return website;
}

// ─── Master post-processor ────────────────────────────────────────────────────
function postProcess(website: GeneratedWebsite, plan: string): GeneratedWebsite {
  // Force Google Sans always
  website.fonts = { heading: "Google Sans", body: "Google Sans" };
  // Strip plan-disallowed section types
  website = enforcePlanSections(website, plan);
  // Sanitize colors
  website = sanitizeColors(website);
  // Ensure real Unsplash images
  website = sanitizeImages(website);
  return website;
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the world's best web designer. Every website you produce must look like it cost ₱500,000 to build — clean, premium, corporate, and immediately credible. Filipino business owners will trust this website to represent them to their customers.

══════════════════════════════════════════
ABSOLUTE NON-NEGOTIABLE RULES
══════════════════════════════════════════

OUTPUT
• Return ONLY a single valid JSON object. No markdown. No backticks. No explanation. No comments.

COLORS — THIS IS THE MOST IMPORTANT RULE
• Pick ONE dark professional background from this list EXACTLY:
  #0F172A | #1C1C1C | #111827 | #0d0d1a | #1E1B18 | #18181B | #0F1923 | #1A0F0F
• Use white (#FFFFFF) or warm off-white (#F5F0E8 / #FAFAF8) as the text color only — NEVER as a background.
• Pick ONE muted accent from: #c9a84c | #A87C2A | #3B82F6 | #0D7377 | #166534 | #7F1D1D | #1E40AF
• That is it. Three values total. No rainbow. No gradients with bright colors.
• BANNED forever: white (#FFFFFF), near-white, light grey, any hex with lightness above 20% as a background or section background. Also banned: red (#FF0000), lime green, hot pink, electric blue, bright orange, cyan, magenta, any color with saturation > 55% and lightness between 35–80%.
• Section backgrounds must alternate only between your two darkest hex values. EVERY section must have a dark background. Zero exceptions.

IMAGERY
• ALL images MUST be real Unsplash photography URLs in this exact format:
  https://images.unsplash.com/photo-{PHOTO_ID}?w=800&h=600&fit=crop&q=80
  (hero: w=1400&h=800)
• ZERO 3D renders. ZERO illustrations. ZERO cartoon art. ZERO placeholder text.
• Every image field must have a real URL — never null, never empty string.

TYPOGRAPHY & COPY
• Font: "Google Sans" — no exceptions
• NO emojis anywhere — not in headings, descriptions, testimonials, stats, button text, or anywhere
• Write as a real, established Metro Manila business: specific neighborhoods (BGC, Makati, Ortigas, Poblacion, Salcedo Village, Lahug Cebu), Filipino full names, realistic prices in ₱
• Professional tone — no exclamation spam, no buzzwords, no hype language
• Testimonials: use authentic Filipino names ("Maria Santos", "Ramon dela Cruz", "Angela Reyes", "James Villanueva")

SECTIONS
• 7–9 sections minimum, ordered: nav first, footer last
• nav, footer, hero, features, about, testimonials, stats, contact, cta, newsletter, faq, gallery, team, process, pricing, products

══════════════════════════════════════════
CURATED UNSPLASH PHOTO IDs
══════════════════════════════════════════
Use these IDs. Format: https://images.unsplash.com/photo-{ID}?w=800&h=600&fit=crop&q=80

FOOD & RESTAURANT:
1414235077428-338989a2e8c0 | 1476224203421-74177e9bcce6 | 1504674900247-0877df9cc836
1555396273-367ea4eb4db5 | 1565299624946-b28f40a0ae38 | 1490645935967-10de6ba17061
1482049016688-2d3e1b311543 | 1414235077428-338989a2e8c0

FASHION & RETAIL:
1483985986-9e7dcf2e1a8e | 1529903672776-b51b5379fcf4 | 1539109136881-3be0616acf4b
1542291026-7eec264c27ff | 1516762689-1b8e44c75a0b | 1445205170230-053b83016050
1525966222134-fcfa99b8ae77 | 1543163521-1bf539c55dd2

BEAUTY & WELLNESS:
1487412947147-5cebf96ef2ff | 1560066984-138dadb4c035 | 1596462502278-27bfdc403348
1515688594-0eebcca23e55 | 1571019613454-1cb2f99b2d8b | 1544367567-0f2fcb009e0b

TECHNOLOGY & SERVICES:
1518770660439-4636190af475 | 1497366216548-37526070297c | 1552664730-d307ca884978
1519389950473-47ba0277781c | 1461749280684-dccba630e2f6 | 1504868584819-f8e8b4b6d7e3

PEOPLE & PORTRAITS:
1494790108377-be9c29b29330 | 1507003211169-0a1dd7228f2d | 1438761681033-6461ffad8d80
1472099645785-5658abf4ff4e | 1500648767791-00dcc994a43e | 1580489944761-15a19d654956
1573496359142-b8d87734a5a2

INTERIOR & LIFESTYLE:
1506905925346-21bda4d32df4 | 1497366811353-6870744d04b2 | 1524758631624-e2822e304c36
1600880292203-757bb62b4baf | 1557804506-669a67965ba0

══════════════════════════════════════════
PLAN-BASED SECTION RULES
══════════════════════════════════════════
FREE   → Landing pages & portfolios only. Sections: nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer. NO products. NO pricing. NO CRM.
PRO    → Full marketing/commerce site. Add products, pricing, gallery, team, process sections. May include Hitpay & Paymongo payment links. ALSO eligible for CRM dashboard sections (dashboard-stats, data-table, kanban, sidebar-nav, activity-feed, form-builder) — include these when the prompt asks for a system, admin panel, CRM, or internal tool.
ENTERPRISE → All PRO sections PLUS dedicated CRM dashboard sections — include these when the prompt explicitly asks for a system, admin panel, CRM, or internal tool.

══════════════════════════════════════════
JSON SCHEMA (strict)
══════════════════════════════════════════
{
  "name": "Business Name",
  "type": "STORE|BUSINESS|PORTFOLIO|RESTAURANT|SALON|LANDING",
  "seoTitle": "60 chars max",
  "seoDesc": "160 chars max",
  "fonts": { "heading": "Google Sans", "body": "Google Sans" },
  "colors": {
    "primary":    "#darkHex",
    "secondary":  "#mutedAccentHex",
    "accent":     "#mutedAccentHex",
    "background": "#darkHex",
    "text":       "#lightHex"
  },
  "sections": [
    {
      "id": "unique-kebab-id",
      "type": "section-type",
      "data": {},
      "styles": {
        "background": "#darkHex",
        "textColor":  "#lightHex",
        "accentColor": "#mutedAccentHex"
      }
    }
  ]
}`;

// ─── Per-plan user prompt ─────────────────────────────────────────────────────
function buildUserPrompt(userPrompt: string, plan: Plan): string {
  const tier = plan as string;

  const planBlock =
    tier === "ENTERPRISE"
      ? `PLAN: ENTERPRISE — Full site + optional CRM. If the prompt asks for a system, CRM, admin panel, or internal tool, include those section types in addition to marketing sections. Otherwise generate a premium marketing site.`
      : tier === "PRO"
      ? `PLAN: PRO — Generate a premium marketing/commerce site. You may include product grids, pricing tables, and Hitpay/Paymongo payment links. If the prompt asks for a system, CRM, admin panel, or internal tool, include CRM dashboard section types (dashboard-stats, data-table, kanban, sidebar-nav, activity-feed, form-builder) in addition to the marketing sections.`
      : `PLAN: FREE — Generate a polished landing page or portfolio. Use only: nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer. Absolutely NO product grids (type "products"), NO pricing tables. Focus on showcase and lead generation.`;

  return `Generate a complete, premium website for this business:
"${userPrompt}"

${planBlock}

REQUIRED in every generation:
1. Colors: Choose ONE background from the approved dark list. One muted accent. White or warm-white TEXT only — NEVER as a background. ALL section style "background" values must be dark hex (#0F172A, #111827, etc). Any light color as a background is a critical error.
2. Hero: Must have backgroundImage using a real Unsplash URL matching this business type (w=1400&h=800).
3. About section: Include a real Unsplash image URL (w=1000&h=750).
4. Products/team: Each item must have a real Unsplash image URL.
5. Testimonials: 4 Filipino names, their Metro Manila/Cebu city/barangay, rating 5, realistic quote, Unsplash portrait URL.
6. Pricing in ₱ with realistic Metro Manila market rates.
7. Specific PH location in About/Contact (street, barangay, city). Real-sounding Filipino business address.
8. Stats: credible numbers ("1,200+" customers, "Est. 2019", "4.9/5 rating") — no emojis.
9. Zero emojis anywhere in the entire output.
10. Section order: nav → hero → [middle sections] → footer.

Think like a ₱500,000 web design agency. Make every word, color, and image choice deliberate and premium.

Output only the JSON object.`;
}

// ─── Main generation function ─────────────────────────────────────────────────
export async function generateWebsite(
  userPrompt: string,
  plan: Plan
): Promise<{
  website: GeneratedWebsite;
  usage: { inputTokens: number; outputTokens: number; model: string; costUsd: number; costPhp: number };
}> {
  if (process.env.MOCK_MODE === "true") {
    console.log("[MOCK MODE] Returning mock website data");
    await new Promise((r) => setTimeout(r, 2000));
    return {
      website: postProcess(MOCK_WEBSITE_JSON as unknown as GeneratedWebsite, plan as string),
      usage: { inputTokens: 0, outputTokens: 0, model: "mock", costUsd: 0, costPhp: 0 },
    };
  }

  const tier = plan as string;
  // All plans now use Sonnet for quality — Haiku cannot reliably follow design constraints
  const model = "claude-sonnet-4-6";

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(userPrompt, plan) }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from Claude");

  // Strip any accidental markdown fences
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

  // Post-process: enforce colors, plan sections, real images, Google Sans
  website = postProcess(website, tier);

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: { inputTokens, outputTokens, model, costUsd: usd, costPhp: php },
  };
}
