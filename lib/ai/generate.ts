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
// Expanded palette for variety across generations.
const PROFESSIONAL_PALETTES = [
  { background: "#0F172A", primary: "#1E293B", text: "#F1F5F9", accent: "#3B82F6", secondary: "#c9a84c" },
  { background: "#1C1C1C", primary: "#2C2C2C", text: "#F5F0E8", accent: "#A87C2A", secondary: "#c9a84c" },
  { background: "#0d0d1a", primary: "#12122a", text: "#f5f0e8", accent: "#c9a84c", secondary: "#e8d5b7" },
  { background: "#111827", primary: "#1F2937", text: "#F9FAFB", accent: "#0D7377", secondary: "#6EE7B7" },
  { background: "#1E1B18", primary: "#292521", text: "#FAFAF8", accent: "#78350F", secondary: "#D97706" },
  { background: "#0F1923", primary: "#162032", text: "#E2E8F0", accent: "#1E40AF", secondary: "#93C5FD" },
  { background: "#18181B", primary: "#27272A", text: "#FAFAFA", accent: "#166534", secondary: "#4ADE80" },
  { background: "#1A0F0F", primary: "#2D1515", text: "#FEF2F2", accent: "#7F1D1D", secondary: "#FCA5A5" },
  // Additions for variety
  { background: "#0A1929", primary: "#132F4C", text: "#E7EBF0", accent: "#0288D1", secondary: "#5EEAD4" },
  { background: "#161616", primary: "#212121", text: "#EDEDED", accent: "#525252", secondary: "#A3A3A3" },
  { background: "#1B1A2E", primary: "#26233A", text: "#EFEDE2", accent: "#9F86C0", secondary: "#BE95C4" },
  { background: "#0C2818", primary: "#143C26", text: "#E8F5E9", accent: "#2E7D32", secondary: "#81C784" },
  { background: "#1F1A17", primary: "#2B2522", text: "#FAF1E6", accent: "#B8860B", secondary: "#DAA520" },
  { background: "#120E1F", primary: "#1E1832", text: "#E0DDF5", accent: "#5B21B6", secondary: "#A78BFA" },
  { background: "#0E1A1F", primary: "#162932", text: "#E0F2F1", accent: "#00838F", secondary: "#80CBC4" },
  { background: "#1A1014", primary: "#2A1820", text: "#FCE4EC", accent: "#AD1457", secondary: "#F48FB1" },
];

// Style direction hints — randomly injected to push the AI toward different
// design decisions across generations of similar prompts.
const STYLE_DIRECTIONS = [
  "Editorial magazine layout — large serif-style type, generous whitespace, full-bleed hero photography.",
  "Minimal swiss design — strong grid, restrained typography, lots of negative space, single accent color.",
  "Bold corporate — confident headlines, asymmetric hero composition, two-tone alternating sections.",
  "Boutique luxury — refined spacing, subtle gold/cream accents, oversized hero, intimate copy tone.",
  "Modern tech — sharp geometric shapes, monochrome palette with single bright accent, terse confident copy.",
  "Warm artisan — earthy tones, hand-crafted feel, story-driven about section, premium product close-ups.",
  "Premium hospitality — atmospheric photography, evocative copy, strong CTA buttons, testimonial-led.",
  "Quiet confidence — small type, lots of breathing room, monochrome photography, no exclamation marks.",
  "Heritage brand — classical proportions, founding-story emphasis, vintage-inspired details.",
  "Contemporary studio — bold portrait imagery, modular grid sections, expressive headline typography.",
  "Brutalist editorial — raw asymmetric grid, strong horizontal rules, oversized typography blocks.",
  "Soft neo-brand — soft glow gradients within dark, micro-interactions, friendly product copy.",
  "Cinematic atmospheric — dim lighting hero, dramatic close-ups, story arcs across sections.",
  "Documentary photo — black-and-white people imagery, real-life compositions, deeply human copy tone.",
  "Architectural minimalism — long whitespace columns, geometric photo crops, minimalist gold lines.",
];

// Section ordering variants — break up the predictable nav→hero→features→…→footer pattern.
const SECTION_LAYOUT_VARIANTS = [
  "nav → hero → about → features → testimonials → stats → cta → footer",
  "nav → hero → features → about → process → testimonials → contact → footer",
  "nav → hero → stats → features → gallery → testimonials → newsletter → footer",
  "nav → hero → about → testimonials → features → faq → cta → footer",
  "nav → hero → process → features → about → stats → contact → footer",
  "nav → hero → features → testimonials → about → newsletter → cta → footer",
  "nav → hero → about → process → stats → testimonials → faq → cta → footer",
  "nav → hero → gallery → about → features → stats → newsletter → footer",
  "nav → hero → testimonials → features → about → process → cta → footer",
  "nav → hero → stats → about → gallery → features → testimonials → cta → footer",
];

// Hero composition variants — push the AI to render hero differently each time.
const HERO_COMPOSITIONS = [
  "Full-bleed background photo with a single oversized headline anchored bottom-left and a small accent CTA.",
  "Split layout — headline + 2 short paragraphs on the left, full-height product/lifestyle photo on the right.",
  "Centered minimal — small kicker label, big headline, sub-paragraph, two CTAs side-by-side, photo below the fold.",
  "Asymmetric overlap — headline behind the image, photo offset down-right, micro-stats beneath.",
  "Image-first — large square image takes 60% of viewport, headline + short tagline tucked in the remaining 40%.",
  "Gradient overlay full-bleed — atmospheric image with darkened gradient, kicker, headline, sub, single CTA.",
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

// Round-robin so each successive postProcess call picks a different palette,
// even when the AI returns the same name twice in a row.
let _paletteCursor = Math.floor(Math.random() * PROFESSIONAL_PALETTES.length);
function pickPalette(_seed: string): typeof PROFESSIONAL_PALETTES[0] {
  const p = PROFESSIONAL_PALETTES[_paletteCursor % PROFESSIONAL_PALETTES.length];
  _paletteCursor = (_paletteCursor + 1 + Math.floor(Math.random() * 3)) % PROFESSIONAL_PALETTES.length;
  return p;
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

// Larger curated pool — Fisher-Yates shuffled per generation so two consecutive
// generations of the same business type rarely reuse the same fallback photos.
const FALLBACK_PHOTOS = [
  // generic editorial / product / interior
  "1497366216548-37526070297c", "1518770660439-4636190af475",
  "1504674900247-0877df9cc836", "1555396273-367ea4eb4db5",
  "1483985986-9e7dcf2e1a8e", "1529903672776-b51b5379fcf4",
  "1560066984-138dadb4c035", "1506905925346-21bda4d32df4",
  "1414235077428-338989a2e8c0", "1476224203421-74177e9bcce6",
  "1565299624946-b28f40a0ae38", "1490645935967-10de6ba17061",
  "1482049016688-2d3e1b311543", "1539109136881-3be0616acf4b",
  "1542291026-7eec264c27ff", "1516762689-1b8e44c75a0b",
  "1445205170230-053b83016050", "1525966222134-fcfa99b8ae77",
  "1543163521-1bf539c55dd2", "1487412947147-5cebf96ef2ff",
  "1596462502278-27bfdc403348", "1515688594-0eebcca23e55",
  "1571019613454-1cb2f99b2d8b", "1544367567-0f2fcb009e0b",
  "1552664730-d307ca884978", "1519389950473-47ba0277781c",
  "1461749280684-dccba630e2f6", "1504868584819-f8e8b4b6d7e3",
  "1497366811353-6870744d04b2", "1524758631624-e2822e304c36",
  "1600880292203-757bb62b4baf", "1557804506-669a67965ba0",
];

function shuffledPhotos(): string[] {
  const arr = [...FALLBACK_PHOTOS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Per-generation rotating photo pool — set once at the start of postProcess
// and consumed sequentially for every fallback so a single site never uses
// the same photo twice for different roles.
let _photoPool: string[] = [];
let _photoIdx = 0;
function resetPhotoPool() { _photoPool = shuffledPhotos(); _photoIdx = 0; }
function fallbackPhoto(size = "800x600"): string {
  if (_photoPool.length === 0) resetPhotoPool();
  const id = _photoPool[_photoIdx++ % _photoPool.length];
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

// ─── Normalize navigation hrefs to multi-page routes ─────────────────────────
// Map common section names / anchor strings to canonical page routes so that
// older generations (or AI slip-ups) using "#about" still produce a working
// multi-page nav.
const ANCHOR_ROUTE_MAP: Record<string, string> = {
  home: "/",
  hero: "/",
  about: "/about",
  story: "/about",
  work: "/work",
  portfolio: "/work",
  gallery: "/gallery",
  menu: "/menu",
  shop: "/products",
  store: "/products",
  products: "/products",
  product: "/products",
  service: "/services",
  services: "/services",
  process: "/process",
  pricing: "/pricing",
  plans: "/pricing",
  team: "/team",
  faq: "/faq",
  contact: "/contact",
  reach: "/contact",
  testimonials: "/testimonials",
  reviews: "/testimonials",
  blog: "/blog",
};

function normalizeHref(href: unknown): string | undefined {
  if (typeof href !== "string") return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  // Already a real path / external URL → keep as-is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) return trimmed;
  // Strip leading "#" or "scroll-to-" / "scrollTo:" prefixes
  const key = trimmed.replace(/^#+/, "").replace(/^scroll-?to[:-]?/i, "").trim().toLowerCase();
  if (!key || key === "/") return "/";
  if (ANCHOR_ROUTE_MAP[key]) return ANCHOR_ROUTE_MAP[key];
  // Last resort — turn whatever they gave us into a route slug
  const slug = key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `/${slug}` : "/";
}

function normalizeNavLinks(website: GeneratedWebsite): GeneratedWebsite {
  website.sections = website.sections.map((s) => {
    const d = (s.data || {}) as any;

    // Nav: rewrite link hrefs and ctaHref
    if (s.type === "nav") {
      if (Array.isArray(d.links)) {
        d.links = d.links.map((l: any) => ({
          ...l,
          href: normalizeHref(l?.href ?? l?.label) ?? "/",
        }));
      }
      if (d.ctaHref !== undefined) d.ctaHref = normalizeHref(d.ctaHref) ?? "/contact";
    }

    // Footer columns can also carry link arrays
    if (s.type === "footer" && Array.isArray(d.columns)) {
      d.columns = d.columns.map((col: any) => ({
        ...col,
        links: Array.isArray(col?.links)
          ? col.links.map((l: any) => ({ ...l, href: normalizeHref(l?.href ?? l?.label) ?? "/" }))
          : col?.links,
      }));
    }

    // Hero / CTA primary & secondary buttons
    if ((s.type === "hero" || s.type === "cta") ) {
      if (d.ctaPrimary && typeof d.ctaPrimary === "object" && d.ctaPrimary.href !== undefined) {
        d.ctaPrimary.href = normalizeHref(d.ctaPrimary.href) ?? "/";
      }
      if (d.ctaSecondary && typeof d.ctaSecondary === "object" && d.ctaSecondary.href !== undefined) {
        d.ctaSecondary.href = normalizeHref(d.ctaSecondary.href) ?? "/";
      }
      if (typeof d.ctaHref === "string") d.ctaHref = normalizeHref(d.ctaHref) ?? "/";
    }

    return { ...s, data: d };
  });
  return website;
}

// ─── Master post-processor ────────────────────────────────────────────────────
function postProcess(website: GeneratedWebsite, plan: string): GeneratedWebsite {
  // Reset rotating photo pool for this generation so different runs don't
  // collapse to the same fallback IDs.
  resetPhotoPool();
  // Force Google Sans always
  website.fonts = { heading: "Google Sans", body: "Google Sans" };
  // Strip plan-disallowed section types
  website = enforcePlanSections(website, plan);
  // Sanitize colors
  website = sanitizeColors(website);
  // Ensure real Unsplash images
  website = sanitizeImages(website);
  // Rewrite anchor links into multi-page routes
  website = normalizeNavLinks(website);
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
• Pick ONE dark professional background from this expanded approved list (vary your pick each generation, do not always reuse the same one):
  #0F172A | #1C1C1C | #111827 | #0d0d1a | #1E1B18 | #18181B | #0F1923 | #1A0F0F
  #0A1929 | #161616 | #1B1A2E | #0C2818 | #1F1A17 | #120E1F | #0E1A1F | #1A1014
• Use white (#FFFFFF) or warm off-white (#F5F0E8 / #FAFAF8 / #E0DDF5 / #FCE4EC) as the text color only — NEVER as a background.
• Pick ONE muted accent that complements the background, from: #c9a84c | #A87C2A | #3B82F6 | #0D7377 | #166534 | #7F1D1D | #1E40AF | #0288D1 | #525252 | #9F86C0 | #2E7D32 | #B8860B | #5B21B6 | #00838F | #AD1457
• Three values total per site (background, primary surface, accent). No rainbow. No gradients with bright colors.
• BANNED forever: white (#FFFFFF), near-white, light grey, any hex with lightness above 20% as a background or section background. Also banned: red (#FF0000), lime green, hot pink, electric blue, bright orange, cyan, magenta, any color with saturation > 55% and lightness between 35–80%.
• Section backgrounds must alternate only between your two darkest hex values. EVERY section must have a dark background. Zero exceptions.
• Across multiple generations of the same business type, you MUST pick a different background palette each time — do not default to the first one in the list.

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

NAVIGATION — MULTI-PAGE ARCHITECTURE (CRITICAL)
• The nav MUST use page routes — NOT scroll-to-section anchors. Each nav link opens a separate page.
• Nav links MUST use these EXACT page-route hrefs (no "#" anchors, no "scroll" hrefs):
  - { "label": "Home",    "href": "/" }
  - { "label": "About",   "href": "/about" }
  - { "label": "Work",    "href": "/work" }       (or "Gallery" → "/gallery", "Menu" → "/menu", "Shop" → "/products")
  - { "label": "Services","href": "/services" }   (or "Process" → "/process", "Pricing" → "/pricing")
  - { "label": "Contact", "href": "/contact" }
• Pick 4–5 nav items appropriate for the business type. NEVER produce hrefs like "#about", "#contact", "#hero" — these break the multi-page routing.
• ctaHref on the nav must also be a real route (e.g. "/contact") or "#" if there is no destination.
• HOMEPAGE = preview sections only. The homepage shows a hero + SHORT previews of about / featured work / services / a strong CTA, then footer. Each nav target is a separate full page on its own route.
• When a homepage preview section corresponds to a nav target (e.g. an "about" preview points to /about), the section's CTA button href must point to that page route, not an anchor.

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

  // Pick a fresh style direction + section layout + hero composition for THIS
  // generation so two similar prompts don't produce identical-looking sites.
  const styleHint = STYLE_DIRECTIONS[Math.floor(Math.random() * STYLE_DIRECTIONS.length)];
  const layoutHint = SECTION_LAYOUT_VARIANTS[Math.floor(Math.random() * SECTION_LAYOUT_VARIANTS.length)];
  const heroHint = HERO_COMPOSITIONS[Math.floor(Math.random() * HERO_COMPOSITIONS.length)];
  const variantSeed = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);

  // Suggest a starting palette so even when the AI ignores variety
  // instructions, the post-processor diverges from previous generations.
  const suggestedBg = PROFESSIONAL_PALETTES[Math.floor(Math.random() * PROFESSIONAL_PALETTES.length)].background;
  const suggestedAccents = ["#c9a84c", "#A87C2A", "#3B82F6", "#0D7377", "#166534", "#7F1D1D", "#1E40AF", "#0288D1", "#9F86C0", "#2E7D32", "#B8860B", "#5B21B6", "#00838F", "#AD1457"];
  const suggestedAccent = suggestedAccents[Math.floor(Math.random() * suggestedAccents.length)];

  return `Generate a completely fresh, premium website for this business:
"${userPrompt}"

${planBlock}

GENERATION ID (proves this is a new generation, not a cached one):
• Variant seed: ${variantSeed}
• Timestamp: ${timestamp}
• MUST treat this as a new design pass with different copy + imagery from any previous generation.

DESIGN DIRECTION FOR THIS GENERATION (mandatory — do NOT default to a familiar layout):
• Visual style: ${styleHint}
• Section flow: ${layoutHint}
• Hero composition: ${heroHint}
• Suggested starting palette: background ${suggestedBg}, accent ${suggestedAccent} (you may pick from the approved list, but DO NOT repeat the most common palette).

IMAGE VARIETY (critical):
• Hero, about, products, team, gallery — every image must be a DIFFERENT photo ID. Never reuse the same photo for two roles.
• Pick photo IDs that genuinely match the BUSINESS TYPE in the prompt — coffee shop must use coffee/cafe imagery, not generic stock.
• Across multiple generations of similar prompts, pick DIFFERENT photo IDs. Do not reuse the same hero image you used last time.

COPY VARIETY (critical):
• Business name: invent a fresh, plausible Filipino brand name — do NOT recycle names from previous generations. Avoid generic words like "Co.", "Studio", "House", "Hub" unless they fit the brand.
• Headlines: write entirely fresh for this specific business. Banned generic phrases: "Crafted with passion", "Quality you can trust", "Where dreams begin", "Your journey starts here", "Experience the difference", "Made with love", "Excellence redefined".
• Testimonial names: rotate broadly — banned overused names: "Maria Santos", "Juan dela Cruz", "Anna Reyes", "Jose Garcia". Use other authentic Filipino names instead.
• Stats: pick distinct, plausible numbers each generation (e.g. years founded, customer count, locations, ratings).
• Pricing in ₱ with realistic Metro Manila market rates — vary the price points across generations.

REQUIRED IN EVERY GENERATION:
1. Colors: Pick a dark background that is DIFFERENT from common defaults (avoid #0F172A and #0d0d1a unless they uniquely fit). All section "background" values must be dark hex.
2. Hero: backgroundImage must be a real Unsplash URL matching the business type (w=1400&h=800).
3. About section: real Unsplash image URL (w=1000&h=750) — DIFFERENT from hero.
4. Products/team: every item gets a UNIQUE photo URL.
5. Testimonials: 4 entries with rotated Filipino names + Metro Manila/Cebu barangay + rating 5 + distinct quote + Unsplash portrait URL.
6. Specific PH location in About/Contact — pick a DIFFERENT neighborhood each generation (BGC, Salcedo Village, Poblacion Makati, Ortigas, Kapitolyo, Tomas Morato, Lahug Cebu, IT Park Cebu, Iloilo Smallville, Davao Lanang, etc.).
7. Zero emojis anywhere.
8. Section order: must follow the section flow above, starting with nav and ending with footer.
9. Navigation MUST use page-route hrefs only ("/", "/about", "/work", "/services", "/process", "/pricing", "/contact"). No "#" anchors anywhere in nav links or in hero/about/cta button hrefs. The homepage is just previews; full content lives at the corresponding /route.

Think like a ₱500,000 web design agency that has NEVER produced this exact layout before. Every word, color, and image choice must feel hand-tailored to THIS business — not a template.

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
    // Higher temperature → more variety in copy/colors/layout across generations.
    // The schema is enforced via post-processing so we can afford the looseness.
    temperature: 1,
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
