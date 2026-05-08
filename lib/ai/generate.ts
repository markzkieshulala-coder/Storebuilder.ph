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
// design decisions across generations of similar prompts. Every direction
// here must read as PREMIUM / MINIMAL / EDITORIAL — never colorful, never
// "AI-generated cartoon site." Each one suggests a distinct typographic and
// compositional treatment so two consecutive generations don't feel alike.
const STYLE_DIRECTIONS = [
  "Editorial magazine — oversized serif-style display type, deep negative space, single full-bleed hero photo, two-column body layout below.",
  "Swiss minimal — strict 12-column grid, restrained type sizes, single muted accent, monochrome photo treatment, lots of breathing room.",
  "Quiet luxury — tight letter-spacing, subdued cream/gold accent on charcoal, oversized hero portrait, intimate narrative copy.",
  "Modern tech — geometric layout, monospace numerical labels, single saturated accent on near-black surfaces, dense product specs, terse confident copy.",
  "Warm artisan — earthy charcoal-and-bronze palette, generous side margins, story-led about section, close-up macro product photography.",
  "Premium hospitality — atmospheric darker photography, strong typographic hierarchy, testimonial-led, single warm gold accent.",
  "Architectural minimalism — long single-column flow, geometric image crops with asymmetric margins, minimalist hairline rules instead of borders.",
  "Documentary editorial — black-and-white portrait imagery, real-life candid compositions, human-first copy tone, large quote blocks.",
  "Heritage corporate — classical proportions, founding-year date plates, restrained serif headers, monochrome photography with subtle grain.",
  "Brutalist editorial — raw asymmetric grid, oversized condensed display type, hairline horizontal rules between sections, no decorative elements.",
  "Cinematic atmospheric — dim full-bleed hero, dramatic vignette gradient, story arc across sections, narrative-driven copy.",
  "Contemporary studio — bold portrait imagery, modular asymmetric grid, expressive but disciplined display typography, no decorative gradients.",
  "Premium boutique — refined spacing, oversized hero, intimate letterspacing on display headers, single muted secondary color.",
  "Editorial photo essay — full-bleed images alternating with deeply set text columns, image captions in mono, tight body copy.",
  "Restrained corporate — Inter-style sans, sharp 8pt grid, single accent reserved for CTAs only, everything else neutral.",
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

  // Enforce section-level styles. We collapse every section to use the SAME
  // accent (the site-level accent) so a generation that used five different
  // bright colors across sections becomes a unified premium look.
  const siteAccent = website.colors.accent;
  const siteText = website.colors.text;

  website.sections = website.sections.map((s, idx) => {
    const bg  = s.styles?.background;
    const newStyles: Record<string, string> = { ...s.styles };

    // Background: reject vivid/neon colors AND light/white colors
    if (bg && bg.startsWith("#") && (isNeonOrBright(bg) || isTooLight(bg))) {
      newStyles.background = palette.background;
    }
    if (bg && bg.startsWith("linear-gradient") && /(?:red|blue|green|yellow|purple|pink|orange|cyan|lime|white|#[fF][fF]|#[eE][eE])/i.test(bg)) {
      newStyles.background = `linear-gradient(135deg, ${palette.background} 0%, ${palette.primary} 100%)`;
    }

    // If background is missing, alternate between the two darkest values for
    // a disciplined editorial rhythm.
    if (!newStyles.background) {
      newStyles.background = idx % 2 === 0 ? palette.background : palette.primary;
    }

    // Force ALL sections to share the same accent + text — premium look means
    // no rainbow per-section accent variation.
    newStyles.accentColor = siteAccent;
    newStyles.textColor = siteText;

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

// ── Per-category curated pools ────────────────────────────────────────────────
// Each pool has ~25 IDs that clearly match the business niche. During prompt
// building we inject a ROTATING SUBSET of 12 so two consecutive generations of
// "sneaker store" get DIFFERENT photo IDs. The sanitizer also uses the same
// pool as its fallback so off-category AI photos are replaced with ones that
// actually match the brand.
const CATEGORY_PHOTO_POOLS: Record<string, string[]> = {
  footwear: [
    "1542291026-7eec264c27ff", "1551232864-3f0890e580d9", "1490481651871-ab68de25d43d",
    "1607082348824-0a96f2a4b9da", "1542291026-7eec264c27ff", "1603808033192-08f7a2a5f1a5",
    "1584735175097-bcd5629a53e9", "1542291026-7eec264c27ff", "1539185100878-f28628d13e5d",
    "1600269452121-4f2416e55c28", "1491553895911-0055eca6402d", "1539185100878-f28628d13e5d",
    "1608231387042-66d1773d3028", "1519415943484-9fa1873496d4", "1606107557195-0e29a4b5b4aa",
    "1542291026-7eec264c27ff", "1556905055-8f358a7a47b2", "1521334884684-d80222895322",
    "1583759136431-a55e32e4a9c8", "1600185365926-3a2ce3cdb9eb", "1559582798-678dfc71ccd8",
    "1543163521-1bf539c55dd2", "1525966222134-fcfa99b8ae77", "1483985988355-763728e1935b",
    "1549298916-b41d501d3772",
  ],
  fashion: [
    "1483985986-9e7dcf2e1a8e", "1529903672776-b51b5379fcf4", "1445205170230-053b83016050",
    "1567401893414-76b7b1e5a7a5", "1576566588028-4147f3842f27", "1516762689-1b8e44c75a0b",
    "1525507119428-b1f248080c57", "1558618666-fcd25c85cd64", "1554290712-e640351074bd",
    "1487412947147-5cebf96ef2ff", "1596462502278-27bfdc403348", "1515688594-0eebcca23e55",
    "1552664730-d307ca884978", "1571019613454-1cb2f99b2d8b", "1544367567-0f2fcb009e0b",
    "1434389677669-e08b4cac3105", "1469334031218-e382a71b716b", "1509631179647-0177331693ae",
    "1517428084727-ff65e139a29e", "1586297135537-9b5cfd5d0203", "1509631179647-0177331693ae",
    "1496747488704-06a9c4f1add1", "1475180429745-5d1e68e31cd1", "1490481651871-ab68de25d43d",
    "1539109136881-3be0616acf4b",
  ],
  food: [
    "1414235077428-338989a2e8c0", "1476224203421-74177e9bcce6", "1504674900247-0877df9cc836",
    "1555396273-367ea4eb4db5", "1565299624946-b28f40a0ae38", "1490645935967-10de6ba17061",
    "1482049016688-2d3e1b311543", "1517248135467-4c7edcad34c4", "1559925393-8be0ec4767c8",
    "1546069901-ba9599a7e63c", "1565958011703-44f9829ba187", "1551024601-bec78aea704b",
    "1498837167922-ddd27525d352", "1424847651672-bf20a4b0982b", "1540189549336-e6e99c3679fe",
    "1485921325833-c519f76c4927", "1473093226589-8e0c6927e2f0", "1512621776951-a57141f2eefd",
    "1490818715327-e7843b5df685", "1504564266660-7f5f4a5fa7ff", "1534482421-64566f976cfa",
    "1525351484163-7529414344d8", "1482049016688-2d3e1b311543", "1414235077428-338989a2e8c0",
    "1550966871-3ed3cdb5ed0c",
  ],
  beauty: [
    "1560066984-138dadb4c035", "1571019613454-1cb2f99b2d8b", "1544367567-0f2fcb009e0b",
    "1487412947147-5cebf96ef2ff", "1596462502278-27bfdc403348", "1515688594-0eebcca23e55",
    "1570172619644-dfd03ed5d881", "1522337360788-8b13dee7a37e", "1519415943484-9fa1873496d4",
    "1516975080664-ed2fc6a32937", "1512290923902-8a9f81dc236c", "1522338242992-e1f1c1b65a39",
    "1487412947147-5cebf96ef2ff", "1519824187-d30049d47b50", "1616394584738-fc6e612e71b9",
    "1599566150163-29194dcaad36", "1526413232644-8a7f3d23a04b", "1607748851610-cef42b53c18e",
    "1516975080664-ed2fc6a32937", "1518459439390-bd1e3c5cac2f", "1598300042247-d088f8ab3a91",
    "1596462502278-27bfdc403348", "1588776814546-daab30f11f40", "1570172619644-dfd03ed5d881",
    "1611073615830-b3a79be91b0d",
  ],
  tech: [
    "1518770660439-4636190af475", "1497366216548-37526070297c", "1552664730-d307ca884978",
    "1519389950473-47ba0277781c", "1461749280684-dccba630e2f6", "1581291518857-4e27b48ff24e",
    "1593642632559-0c6d3fc62b89", "1587620962725-abab7fe55159", "1531403009284-440f080d1e12",
    "1499951360447-b19be8fe80f5", "1486312338219-ce68d2c6f44d", "1517048676732-d65bc937f952",
    "1504868584819-f8e8b4b6d7e3", "1516116216624-53ad0573a9c6", "1531297484001-80022131f5a1",
    "1558494949-ef010cbdcc31", "1504384308090-c894fdcc538d", "1553877522-43269d4ea984",
    "1498050108023-c5249f4df085", "1451187580459-43490279c0fa", "1550751827-4bd374c3f58b",
    "1504384308090-c894fdcc538d", "1563770660941-10a27b6e73fd", "1517373116369-9bdb8cdc2f9a",
    "1580894894513-541e088a3209",
  ],
  portfolio: [
    "1513475382585-d06e58bcb0e0", "1547891654-e66ed7ebb968", "1561070791-2526d30994b8",
    "1502691876148-a84978e59af8", "1516259762381-22954d7d3ad2", "1499781350541-7783f6c6a0c8",
    "1551038247-3d9af20df552", "1534447677768-be436bb09401", "1524758631624-e2822e304c36",
    "1600880292203-757bb62b4baf", "1557804506-669a67965ba0", "1497366811353-6870744d04b2",
    "1558618666-fcd25c85cd64", "1554290712-e640351074bd", "1516259762381-22954d7d3ad2",
    "1513519245088-8b16c46c7ab1", "1481627834876-b7833e8f5a27", "1460661419201-fd4cecdf8a8b",
    "1456926631375-92c8ce872def", "1471897488348-1f7c9c7f1a63", "1507721999473-8ff76701704d",
    "1517960813568-27820b2fa5cd", "1451187580459-43490279c0fa", "1520085601670-ee14aa5fa3e2",
    "1543269865-cbf427effbad",
  ],
  interior: [
    "1486325212027-8081e485255e", "1502602898657-3e91760cbb34", "1507089947368-19c1da9775ae",
    "1486718448742-163732cd1544", "1497366754035-f200968a6e72", "1555041469-a586c61ea9bc",
    "1524758631624-e2822e304c36", "1600880292203-757bb62b4baf", "1557804506-669a67965ba0",
    "1558618666-fcd25c85cd64", "1560185127-6a5ac5f39d69", "1585128792020-2ea88b98f8bb",
    "1493809842364-78817add7ffb", "1556020685-bfb6b8e2fb9e", "1616486448229-72a87b5d5041",
    "1600210492493-0946911123ea", "1600596542815-0c35f65a7b0b", "1567038327802-9b1d1e28d8e7",
    "1615874959474-d609969a20ed", "1584622650111-993a426fbf0a", "1596700348-30ce42a01ae5",
    "1560448204-e02f11c3d0e2", "1556912167-f556b55b23d5", "1550226891-ef0b7a2d0d34",
    "1534430480872-3498386ece01",
  ],
  health: [
    "1524178232363-1fb2b075b655", "1571019613454-1cb2f99b2d8b", "1544367567-0f2fcb009e0b",
    "1523050854058-8df90110c9f1", "1517836357463-d25dfeac3438", "1549737328-b0a28445d6a9",
    "1507120878965-54b2d3939100", "1571019613914-f86c7f5f5e18", "1540339832862-474599807c3b",
    "1544198365-f5d60b6d8190", "1571019614099-cf8c2c1cd40d", "1546483875-ad9f36d26a85",
    "1571019613454-1cb2f99b2d8b", "1519311726-d61bde75f1c0", "1518310383802-640c2de311b2",
    "1534438327015-2e4dee4ce60e", "1584464491033-f628beba22af", "1574680096145-d05b474e2155",
    "1540497077302-073d6b8ee1e0", "1529516222807-2536f98c9b4e", "1572521165-1416b9869d02",
    "1521791136064-7986c2920216", "1548534228-56f94a0aa55c", "1576678927484-cc907957088c",
    "1506126279646-a697353d3166",
  ],
  // General fallback — editorial / business / varied
  general: [
    "1497366216548-37526070297c", "1506905925346-21bda4d32df4", "1524758631624-e2822e304c36",
    "1600880292203-757bb62b4baf", "1557804506-669a67965ba0", "1497366811353-6870744d04b2",
    "1494790108377-be9c29b29330", "1500648767791-00dcc994a43e", "1438761681033-6461ffad8d80",
    "1472099645785-5658abf4ff4e", "1573496359142-b8d87734a5a2", "1607746882042-944635dfe10e",
    "1513475382585-d06e58bcb0e0", "1547891654-e66ed7ebb968", "1516259762381-22954d7d3ad2",
    "1502691876148-a84978e59af8", "1519741497674-611481863552", "1464366400600-7168b8af9bc3",
    "1525966222134-fcfa99b8ae77", "1543163521-1bf539c55dd2", "1461749280684-dccba630e2f6",
    "1519389950473-47ba0277781c", "1551038247-3d9af20df552", "1534447677768-be436bb09401",
    "1600596542815-0c35f65a7b0b",
  ],
};

// Infer which photo category best matches a generation prompt.
function inferPhotoCategory(userPrompt: string): string {
  const q = userPrompt.toLowerCase();
  if (/shoe|sneaker|footwear|boot|sandal|heel|leather shoe|calzado|sapatos/.test(q)) return "footwear";
  if (/fashion|clothing|apparel|boutique|wear|dress|shirt|terno|thus|blouse|skirt|pants|jeans|suit/.test(q)) return "fashion";
  if (/food|restaurant|cafe|coffee|bakery|catering|dining|cuisine|bar|bistro|kain|lutuin|pagkain|resto/.test(q)) return "food";
  if (/salon|spa|beauty|skincare|hair|nail|lash|brow|ganda|aesthetics|wellness clinic/.test(q)) return "beauty";
  if (/tech|software|app|dev|digital|it services|web agency|startup|saas|platform|coding|programmer/.test(q)) return "tech";
  if (/portfolio|photography|photographer|videographer|creative|artist|design studio|illustration/.test(q)) return "portfolio";
  if (/interior|furniture|home decor|renovation|architecture|condo|real estate|property/.test(q)) return "interior";
  if (/gym|fitness|workout|health|yoga|pilates|sports|training|coach|nutrition/.test(q)) return "health";
  return "general";
}

// Shuffle an array in-place (Fisher-Yates).
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Pick a rotating subset of photo IDs from a category pool so two consecutive
// generations of the same niche always get different photos injected.
let _categoryOffset: Record<string, number> = {};
function getCategoryPhotos(category: string, count = 12): string[] {
  const pool = CATEGORY_PHOTO_POOLS[category] || CATEGORY_PHOTO_POOLS.general;
  const offset = (_categoryOffset[category] ?? 0) % pool.length;
  _categoryOffset[category] = (offset + count) % pool.length;
  // Rotate around the pool instead of always starting at 0
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  return shuffle(rotated).slice(0, count);
}

// All categories merged — used as the shared fallback pool.
const ALL_CATEGORY_IDS = Object.values(CATEGORY_PHOTO_POOLS).flat();
// Deduplicate
const FALLBACK_PHOTOS = Array.from(new Set(ALL_CATEGORY_IDS));

function shuffledPhotos(category?: string): string[] {
  // Prefer category-specific photos first in the pool, then general variety
  const catPhotos = category ? (CATEGORY_PHOTO_POOLS[category] || []) : [];
  const others = FALLBACK_PHOTOS.filter((id) => !catPhotos.includes(id));
  return shuffle([...catPhotos, ...shuffle(others)]);
}

// Per-generation rotating photo pool — set once at the start of postProcess.
let _photoPool: string[] = [];
let _photoIdx = 0;
function resetPhotoPool(category?: string) { _photoPool = shuffledPhotos(category); _photoIdx = 0; }
function fallbackPhoto(size = "800x600"): string {
  if (_photoPool.length === 0) resetPhotoPool();
  const id = _photoPool[_photoIdx++ % _photoPool.length];
  const [w, h] = size.split("x");
  return `${UNSPLASH_BASE}${id}?w=${w}&h=${h}&fit=crop&q=80`;
}

function sanitizeImages(website: GeneratedWebsite): GeneratedWebsite {
  // Track every image URL we keep for this site so two different roles
  // never end up with the same Unsplash photo. When we detect a repeat we
  // swap it for a fresh fallback so each section visually feels distinct.
  const used = new Set<string>();
  const photoIdOf = (url: string): string => {
    const m = url.match(/photo-([a-zA-Z0-9-]+)/);
    return m ? m[1] : url;
  };
  const claim = (url: string | undefined, size: string): string => {
    if (!url || !url.startsWith("https://images.unsplash.com")) {
      const next = fallbackPhoto(size);
      used.add(photoIdOf(next));
      return next;
    }
    const id = photoIdOf(url);
    if (used.has(id)) {
      // Generate a new, unseen fallback. Photo pool is already shuffled
      // per-generation so a few attempts are enough to find a fresh ID.
      for (let i = 0; i < 8; i++) {
        const next = fallbackPhoto(size);
        const nextId = photoIdOf(next);
        if (!used.has(nextId)) {
          used.add(nextId);
          return next;
        }
      }
      const next = fallbackPhoto(size);
      used.add(photoIdOf(next));
      return next;
    }
    used.add(id);
    return url;
  };

  website.sections = website.sections.map((s) => {
    const d = s.data as any;

    // Hero backgroundImage
    if (s.type === "hero" && d.backgroundImage !== undefined) {
      d.backgroundImage = claim(d.backgroundImage, "1400x800");
    }

    // About image
    if (s.type === "about" && d.image !== undefined) {
      d.image = claim(d.image, "1000x750");
    }

    // Product images
    if (s.type === "products" && Array.isArray(d.products)) {
      d.products = d.products.map((p: any) => {
        p.image = claim(p.image, "600x600");
        return p;
      });
    }

    // Team / gallery images
    if ((s.type === "team") && Array.isArray(d.members)) {
      d.members = d.members.map((m: any) => {
        m.image = claim(m.image, "400x400");
        return m;
      });
    }

    if (s.type === "gallery" && Array.isArray(d.images)) {
      d.images = d.images.map((img: any) => {
        const url = typeof img === "string" ? img : img?.url;
        const next = claim(url, "800x800");
        if (typeof img === "string") return next;
        return { ...(img || {}), url: next };
      });
    }

    // Testimonial avatars
    if (s.type === "testimonials" && Array.isArray(d.testimonials)) {
      d.testimonials = d.testimonials.map((t: any) => {
        if (t.image !== undefined) t.image = claim(t.image, "100x100");
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

// Fill in defaults for visually-driven sections that the AI under-generated
// (e.g., a gallery with zero images, a team with zero members). This prevents
// "blank" sub-pages on portfolio sites where /work or /team would otherwise
// render an empty card.
function ensureSectionContent(website: GeneratedWebsite): GeneratedWebsite {
  const brand = (website as any).name || "Studio";
  website.sections = website.sections.map((s) => {
    const d = { ...((s.data || {}) as any) };

    if (s.type === "gallery") {
      const arr = Array.isArray(d.images) ? d.images : [];
      while (arr.length < 6) {
        arr.push({ url: fallbackPhoto("800x800"), caption: "" });
      }
      d.images = arr;
    }

    if (s.type === "team") {
      const members = Array.isArray(d.members) ? d.members : [];
      const roles = ["Founder", "Creative Director", "Lead Designer", "Account Manager"];
      const names = ["Maria Santos", "Ramon dela Cruz", "Angela Reyes", "James Villanueva"];
      while (members.length < 3) {
        const i = members.length;
        members.push({
          name: names[i] ?? `Team Member ${i + 1}`,
          role: roles[i] ?? "Team Member",
          image: fallbackPhoto("400x400"),
          bio: "",
        });
      }
      d.members = members;
    }

    if (s.type === "testimonials") {
      const items = Array.isArray(d.testimonials) ? d.testimonials : [];
      const defaults = [
        { name: "Maria Santos",     role: "Client",       quote: `Working with ${brand} was a great experience — clear, on time, and professional.` },
        { name: "Ramon dela Cruz",  role: "Customer",     quote: `${brand} delivered exactly what we asked for. We'll be back for the next project.` },
        { name: "Angela Reyes",     role: "Repeat Buyer", quote: `Highly recommended. Quality and service that's hard to find in Metro Manila.` },
      ];
      while (items.length < 3) {
        items.push({ ...defaults[items.length] ?? defaults[0], image: fallbackPhoto("100x100") });
      }
      d.testimonials = items;
    }

    if (s.type === "features") {
      const items = Array.isArray(d.features) ? d.features : [];
      while (items.length < 3) {
        items.push({
          title: ["Quality First", "Trusted Partner", "On-Time Delivery"][items.length] ?? "Feature",
          description: "Built to last, designed with care, and shipped without compromise.",
          icon: ["star", "shield-check", "clock"][items.length] ?? "check",
        });
      }
      d.features = items;
    }

    if (s.type === "stats") {
      const items = Array.isArray(d.stats) ? d.stats : [];
      const defaults = [
        { value: "120+", label: "Projects Delivered" },
        { value: "8 yrs", label: "Industry Experience" },
        { value: "98%",  label: "Client Satisfaction" },
        { value: "24/7", label: "Support Coverage" },
      ];
      while (items.length < 3) items.push(defaults[items.length] ?? defaults[0]);
      d.stats = items;
    }

    if (s.type === "faq") {
      const items = Array.isArray(d.faqs) ? d.faqs : [];
      const defaults = [
        { question: "How long does a project take?",       answer: "Most engagements run 2–6 weeks depending on scope. We confirm a timeline at the start." },
        { question: "Do you work with small businesses?",  answer: "Yes — most of our clients are independent Filipino brands and small teams." },
        { question: "How do payments work?",                answer: "We invoice in two milestones. Online payment via PayMongo or bank transfer." },
      ];
      while (items.length < 3) items.push(defaults[items.length] ?? defaults[0]);
      d.faqs = items;
    }

    return { ...s, data: d };
  });
  return website;
}

// ─── Master post-processor ────────────────────────────────────────────────────
function postProcess(website: GeneratedWebsite, plan: string, category = "general"): GeneratedWebsite {
  // Reset rotating photo pool for this generation, biased toward category photos
  // so fallback replacements visually match the business niche.
  resetPhotoPool(category);
  // Force Google Sans always
  website.fonts = { heading: "Google Sans", body: "Google Sans" };
  // Strip plan-disallowed section types
  website = enforcePlanSections(website, plan);
  // Sanitize colors
  website = sanitizeColors(website);
  // Ensure real Unsplash images
  website = sanitizeImages(website);
  // Fill empty visual sections (gallery / team / testimonials / faq / stats)
  website = ensureSectionContent(website);
  // Re-run image sanitization in case ensureSectionContent injected fallbacks
  // that collide with already-claimed photo IDs (extremely unlikely with the
  // shuffled pool, but keeps the invariant: no two sections share the same
  // Unsplash photo).
  website = sanitizeImages(website);
  // Rewrite anchor links into multi-page routes
  website = normalizeNavLinks(website);
  return website;
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior art director at a top Manila design agency producing a premium custom website worth ₱500,000. The output must feel hand-crafted, minimal, and editorial — NEVER "AI-generated," NEVER colorful, NEVER template-y. Filipino business owners will trust this to represent their brand to real customers.

══════════════════════════════════════════
DESIGN PHILOSOPHY (READ FIRST)
══════════════════════════════════════════
• Premium > flashy. Restraint > decoration. Editorial > marketing.
• ONE accent color used sparingly (CTAs only). The rest is neutral dark surfaces with light typography.
• Generous whitespace, disciplined typographic hierarchy, asymmetric editorial layouts.
• Photography does the work — no illustrations, no abstract gradients, no decorative shapes.
• Copy is calm and confident. No exclamation marks. No buzzwords. No emojis. No "elevate your X."
• If the result feels "AI-generated" or "colorful template," you have failed. It must feel hand-curated.

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
• Use the accent ONLY on primary CTA buttons and a single hero number/highlight. Everything else stays in the dark+light pair. NEVER paint multiple sections in different accent colors.
• BANNED forever: white (#FFFFFF), near-white, light grey, any hex with lightness above 20% as a background or section background. Also banned: red (#FF0000), lime green, hot pink, electric blue, bright orange, cyan, magenta, any color with saturation > 55% and lightness between 35–80%.
• Section backgrounds must alternate only between your two darkest hex values. EVERY section must have a dark background. Zero exceptions.
• Across multiple generations of the same business type, you MUST pick a different background palette each time — do not default to the first one in the list.

IMAGERY
• ALL images MUST be real Unsplash photography URLs in this exact format:
  https://images.unsplash.com/photo-{PHOTO_ID}?w=800&h=600&fit=crop&q=80
  (hero: w=1400&h=800)
• ZERO 3D renders. ZERO illustrations. ZERO cartoon art. ZERO placeholder text.
• Every image field must have a real URL — never null, never empty string.
• EVERY image must visually match the business type — coffee shop = coffee/cafe imagery, salon = beauty/wellness, dev studio = workspace/tech, fashion brand = apparel/editorial. Generic stock photos that don't match are a failure.
• Within ONE site: every photo must be a unique ID — the hero photo, about photo, products photos, team photos, gallery photos, testimonial avatars MUST all be different IDs.
• Across DIFFERENT generations: rotate completely. Do not reuse the same hero photo ID you might have used in a previous run for the same category.

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
function buildUserPrompt(userPrompt: string, plan: Plan, category = "general"): string {
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

  // Inject a ROTATING subset of category-appropriate photo IDs. Different each
  // call so two generations of "sneaker store" get different photo IDs even
  // though they share the same niche category.
  const categoryPhotos = getCategoryPhotos(category, 12);
  const photoHint = categoryPhotos.map((id) => `• ${id}`).join("\n");

  // Niche-specific imaging directive based on inferred category
  const nicheImageDir: Record<string, string> = {
    footwear: "Footwear and shoe photography: product flat-lays, close-up stitching detail, lifestyle shots of shoes being worn, editorial styled on minimalist surfaces. NO food, nature, or portrait photos.",
    fashion: "Fashion/apparel editorial photography: model lookbooks, styled flat-lays, studio lighting, fabric texture close-ups. NO unrelated business or tech photos.",
    food: "Food and beverage photography: plated dishes, barista at work, cafe interiors, ingredient close-ups, kitchen scenes, restaurant ambiance shots. NO shoes or abstract photos.",
    beauty: "Beauty and wellness photography: skincare products, salon interiors, treatment rooms, model close-ups, spa atmosphere, clean white-and-soft aesthetic. NO food or tech photos.",
    tech: "Technology and professional services photography: workspace setups, laptops and dual-monitors, focused developers, office environments, meeting rooms. NO fashion or food.",
    portfolio: "Creative portfolio photography: studio work setups, camera equipment, mood boards, creative in action, editorial production scenes. NO unrelated stock photos.",
    interior: "Interior design and architecture photography: beautifully lit room scenes, furniture vignettes, architectural exteriors, lifestyle home photography. NO fashion or tech.",
    health: "Health, fitness and wellness photography: gym equipment, active lifestyle shots, yoga sessions, athletic wear in motion, nutrition flat-lays. NO fashion retail or food restaurant.",
    general: "Business lifestyle photography: professional environments, people in meeting or working, contemporary office spaces, confident portraits. Match the specific niche in the prompt.",
  };
  const nicheDirective = nicheImageDir[category] || nicheImageDir.general;

  return `Generate a completely fresh, premium website for this business:
"${userPrompt}"

${planBlock}

GENERATION ID (unique — forces a truly different design each run):
• Variant seed: ${variantSeed} | Timestamp: ${timestamp}
• This is generation N+1. You have NEVER made this exact site before. The layout, copy, colors, section order, and imagery MUST differ from any previous run.

DESIGN DIRECTION — MANDATORY, DO NOT DEFAULT TO FAMILIAR TEMPLATES:
• Visual style archetype: ${styleHint}
• Section sequence for homepage: ${layoutHint}
• Hero composition: ${heroHint}
• Starting palette suggestion: background ${suggestedBg}, accent ${suggestedAccent}
  (choose from approved list, but NEVER use the same background you used last time for this niche)

NICHE-SPECIFIC IMAGERY (absolutely required):
${nicheDirective}

APPROVED PHOTO IDs FOR THIS GENERATION (use THESE specific IDs, not ones you know from training):
${photoHint}

FORMAT: https://images.unsplash.com/photo-{ID}?w=800&h=600&fit=crop&q=80
Hero: w=1400&h=800. About: w=1000&h=750. Products/team: w=600&h=600.

CRITICAL IMAGE RULES:
• Use ONLY photo IDs from the approved list above for the HERO and ABOUT images.
• For products/team/gallery, use ADDITIONAL IDs from the list (different from hero/about).
• Every image field in the JSON must be a unique, different ID — never repeat.
• NEVER use photo IDs you used in a previous generation for the same category.

COPY VARIETY (no templates, no recycled phrases):
• Business name: invent a fresh Filipino brand name that FEELS like this specific niche — leather shoes ≠ sneakers, Italian resto ≠ BBQ.
• BANNED headline phrases: "Crafted with passion", "Quality you can trust", "Where dreams begin", "Experience the difference", "Made with love", "Excellence redefined", "Elevate your".
• Testimonials: 4 different Filipino names — BANNED: "Maria Santos", "Juan dela Cruz". Use uncommon Filipino names.
• Stats: real-feeling numbers specific to THIS business (not generic 1000+ customers).
• Prices in ₱ realistic for Metro Manila market, varied per product.
• Location: pick a specific PH neighborhood DIFFERENT each generation (BGC, Poblacion, Salcedo, Lahug, IT Park, Smallville, Lanang).

REQUIRED IN EVERY GENERATION:
1. Section order: follow "${layoutHint}" — starting nav, ending footer.
2. Nav hrefs: only real page routes ("/", "/about", "/work", "/services", "/pricing", "/contact"). NO "#" anchors.
3. Hero backgroundImage: from the approved IDs above (w=1400&h=800).
4. About image: different approved ID (w=1000&h=750).
5. Zero emojis. Professional tone throughout.

Think like a ₱500,000 agency producing a fully bespoke site for THIS exact business — not a template. Output only the JSON object.`;
}

// ─── Main generation function ─────────────────────────────────────────────────
export async function generateWebsite(
  userPrompt: string,
  plan: Plan
): Promise<{
  website: GeneratedWebsite;
  usage: { inputTokens: number; outputTokens: number; model: string; costUsd: number; costPhp: number };
}> {
  const category = inferPhotoCategory(userPrompt);

  if (process.env.MOCK_MODE === "true") {
    console.log("[MOCK MODE] Returning mock website data");
    await new Promise((r) => setTimeout(r, 2000));
    return {
      website: postProcess(MOCK_WEBSITE_JSON as unknown as GeneratedWebsite, plan as string, category),
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
    messages: [{ role: "user", content: buildUserPrompt(userPrompt, plan, category) }],
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
  website = postProcess(website, tier, category);

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: { inputTokens, outputTokens, model, costUsd: usd, costPhp: php },
  };
}
