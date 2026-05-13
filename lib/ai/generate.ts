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
// Strictly minimal/luxury palettes — pure white, black, and warm neutrals.
// No vivid color backgrounds. Accent colors are restrained and used sparingly
// (CTA buttons only). Every palette feels like a real premium business website.
const PROFESSIONAL_PALETTES = [
  // Light luxury (white/off-white backgrounds, black text)
  { background: "#FFFFFF", primary: "#FAFAFA", text: "#0A0A0A", accent: "#0A0A0A", secondary: "#737373" },
  { background: "#FAFAF7", primary: "#F5F2EC", text: "#1A1A1A", accent: "#1A1A1A", secondary: "#8B8378" },
  { background: "#F8F8F8", primary: "#EEEEEE", text: "#111111", accent: "#111111", secondary: "#6B6B6B" },
  { background: "#FFFFFF", primary: "#F4F4F4", text: "#171717", accent: "#262626", secondary: "#A3A3A3" },
  { background: "#FBFAF6", primary: "#F0EDE5", text: "#1C1C1C", accent: "#1C1C1C", secondary: "#9C9384" },
  { background: "#F7F5F1", primary: "#EAE5DD", text: "#171513", accent: "#3F3A33", secondary: "#9A9085" },
  // Dark luxury (true black/charcoal, white text)
  { background: "#000000", primary: "#0A0A0A", text: "#FFFFFF", accent: "#FFFFFF", secondary: "#A3A3A3" },
  { background: "#0A0A0A", primary: "#171717", text: "#FAFAFA", accent: "#E5E5E5", secondary: "#737373" },
  { background: "#111111", primary: "#1C1C1C", text: "#F5F5F5", accent: "#FFFFFF", secondary: "#8A8A8A" },
  { background: "#0F0F0F", primary: "#1A1A1A", text: "#FAFAFA", accent: "#FAFAFA", secondary: "#A0A0A0" },
  // Warm minimal (off-white with deep charcoal)
  { background: "#FAF7F2", primary: "#F0EBE2", text: "#1A1714", accent: "#1A1714", secondary: "#8B8378" },
  { background: "#F5F5F0", primary: "#E8E6DF", text: "#0F0F0F", accent: "#2B2A28", secondary: "#857F76" },
  // Cool minimal (cool grays)
  { background: "#FAFBFC", primary: "#F1F3F5", text: "#0B1015", accent: "#0B1015", secondary: "#6E7681" },
  { background: "#F4F4F5", primary: "#E4E4E7", text: "#09090B", accent: "#18181B", secondary: "#71717A" },
  // Restrained accent (used only on CTAs — body remains neutral)
  { background: "#FFFFFF", primary: "#FAFAFA", text: "#0A0A0A", accent: "#1E40AF", secondary: "#737373" },
  { background: "#FAFAFA", primary: "#F5F5F5", text: "#171717", accent: "#0F172A", secondary: "#737373" },
];

// Style direction hints — randomly injected to push the AI toward different
// design decisions across generations of similar prompts. Every direction
// here must read as PREMIUM / MINIMAL / EDITORIAL — never colorful, never
// "AI-generated cartoon site." Each one suggests a distinct typographic and
// compositional treatment so two consecutive generations don't feel alike.
const STYLE_DIRECTIONS = [
  "Editorial magazine — oversized display type, deep negative space, single full-bleed hero photo, two-column body layout below the fold.",
  "Swiss minimal — strict 12-column grid, restrained type sizes, single muted accent, monochrome photo treatment, abundant breathing room.",
  "Quiet luxury — tight letter-spacing, dark charcoal body, oversized hero portrait anchored to left edge, intimate founder narrative.",
  "Modern tech — geometric layout, monospace numerical labels, single deep navy accent on near-black surfaces, terse confident copy.",
  "Warm artisan — earthy charcoal-and-bronze tone, generous side margins, story-led about section, macro close-up product photography.",
  "Premium hospitality — atmospheric full-bleed photography, strong typographic hierarchy, testimonial-first structure, single warm accent.",
  "Architectural minimalism — long single-column scroll, geometric image crops with asymmetric margins, hairline rules instead of borders.",
  "Documentary editorial — candid real-life photography, human-first copy tone, large pull-quote blocks, high-contrast black-on-white.",
  "Heritage brand — classical proportions, founding-year datestamp, dark charcoal headline weight, monochrome photography.",
  "Brutalist editorial — raw asymmetric grid, oversized condensed uppercase headline, hairline horizontal rules, zero decoration.",
  "Cinematic atmospheric — dim full-bleed hero, dramatic vignette treatment, narrative-driven story arc, single saturated deep accent.",
  "Contemporary studio — bold portrait imagery, modular asymmetric grid, expressive but disciplined typography, clean white surface.",
  "Premium boutique — refined micro-spacing, oversized hero, uppercase tracking on headings, one muted secondary color.",
  "Editorial photo essay — full-bleed images alternating with deeply inset text columns, mono captions, extremely tight body copy.",
  "Restrained corporate — sharp 8pt grid, single accent reserved for CTAs only, everything else pure neutral.",
  "Monochromatic dark — near-black background, white text, single ice-blue or silver accent, dramatic contrast-heavy imagery.",
  "Off-white linen — warm off-white #FAF7F2 background, espresso text, no accent — image contrast does all the work.",
  "Gallery white — pure white canvas, oversized typography, large imagery with generous padding, museum-like spacing.",
  "Compact information-dense — tight grid, small type, many sections visible at once, data-led with clear typographic hierarchy.",
  "Editorial contrast — alternating pure-black and pure-white section backgrounds, bold headline reversal, no soft grays.",
  "Luxury retail — product-first layout, very large product imagery at top, minimal text overlaid on white, clean pricing blocks.",
  "Founder story-first — large single portrait of founder with personal narrative, services secondary, relationship-building tone.",
  "Portfolio grid — masonry-style image layout as hero, brand name restrained in top-left corner, work speaks for itself.",
  "Journalistic — long-form about copy, chapter-like section headers, editorial bylines, pull stats in large numerals.",
  "Dark matter — deep space black background, pure white type, single electric accent only on primary CTA, stark photography.",
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
  "nav → hero → about → gallery → features → process → cta → footer",
  "nav → hero → features → gallery → testimonials → faq → contact → footer",
  "nav → hero → stats → testimonials → about → process → newsletter → footer",
  "nav → hero → about → stats → features → gallery → cta → footer",
  "nav → hero → testimonials → about → stats → process → faq → footer",
  "nav → hero → gallery → testimonials → features → stats → cta → footer",
  "nav → hero → process → about → testimonials → faq → newsletter → footer",
  "nav → hero → features → stats → about → gallery → cta → footer",
];

// Hero composition variants — push the AI to render hero differently each time.
const HERO_COMPOSITIONS = [
  "Full-bleed background photo with a single oversized headline anchored bottom-left and a small accent CTA.",
  "Split layout — headline + 2 short paragraphs on the left, full-height product/lifestyle photo on the right.",
  "Centered minimal — small kicker label, big headline, sub-paragraph, two CTAs side-by-side, photo below the fold.",
  "Asymmetric overlap — headline behind the image, photo offset down-right, micro-stats beneath.",
  "Image-first — large square image takes 60% of viewport, headline + short tagline tucked in the remaining 40%.",
  "Dark overlay full-bleed — atmospheric image with semi-opaque dark overlay, kicker in mono caps, single bold CTA.",
  "Text-dominant — 80% headline typography on white, single portrait image inset at right edge.",
  "Oversized kicker + short headline — large label text (e.g. 'EST. 2018' or niche category), four-word headline beneath, no CTA above fold.",
  "Cinematic letterbox — ultra-wide landscape photo, headline in white at vertical center, no other elements.",
  "Two-column product spotlight — left: headline + short subtext + CTA, right: product or lifestyle photo in a tight frame.",
  "Full-screen photo with headline pinned top-right, sub text bottom-left — diagonal tension layout.",
  "Stacked horizontal bands — narrow dark top band (nav), full-bleed hero image middle, white text block at bottom.",
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
  // Very dark saturated colors (navy, forest green, burgundy) are premium — allow them.
  if (hsl.l < 0.30) return false;
  // Vivid + bright = neon. Reject.
  if (hsl.s > 0.60 && hsl.l > 0.45) return true;
  // Extremely saturated regardless of lightness — reject.
  if (hsl.s > 0.85) return true;
  return false;
}

// Backgrounds must be neutral — either near-white (luxury light) or near-black
// (luxury dark). The mid-grey range (15%–88% lightness) reads "AI template"
// and is rejected.
function isUnprofessionalBg(hex: string): boolean {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return false;
  const hsl = hexToHsl(hex);
  if (!hsl) return false;
  if (hsl.s > 0.10) return true;
  return hsl.l > 0.15 && hsl.l < 0.88;
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

  // Backgrounds must be strictly neutral white/off-white or black/charcoal.
  const safeNeutralBg = (val: string, fallback: string) =>
    val && val.startsWith("#") && !isUnprofessionalBg(val) ? val : fallback;

  // Accent/text/secondary: allow neutral OR a single muted CTA color. Reject
  // anything saturated/vivid.
  const safeColor = (val: string, fallback: string) =>
    val && val.startsWith("#") && !isNeonOrBright(val) ? val : fallback;

  website.colors = {
    background: safeNeutralBg(website.colors?.background, palette.background),
    primary:    safeNeutralBg(website.colors?.primary,    palette.primary),
    secondary:  safeColor(website.colors?.secondary,  palette.secondary),
    accent:     safeColor(website.colors?.accent,     palette.accent),
    text:       safeColor(website.colors?.text,       palette.text),
  };

  const siteAccent = website.colors.accent;
  const siteText = website.colors.text;
  // Reject ALL gradients — premium minimal sites don't use gradient backgrounds.
  const gradientRe = /^\s*(linear|radial|conic)-gradient/i;

  website.sections = website.sections.map((s, idx) => {
    const bg  = s.styles?.background;
    const newStyles: Record<string, string> = { ...s.styles };

    // Reject any gradient — replace with the alternating solid pair
    if (bg && gradientRe.test(bg)) {
      newStyles.background = idx % 2 === 0 ? palette.background : palette.primary;
    } else if (bg && bg.startsWith("#") && isUnprofessionalBg(bg)) {
      // Reject saturated or mid-grey backgrounds
      newStyles.background = idx % 2 === 0 ? palette.background : palette.primary;
    }

    // If background is missing, alternate between background and primary surface
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
    // leather & dress shoes
    "1542291026-7eec264c27ff", "1551232864-3f0890e580d9", "1490481651871-ab68de25d43d",
    "1607082348824-0a96f2a4b9da", "1603808033192-08f7a2a5f1a5", "1584735175097-bcd5629a53e9",
    "1539185100878-f28628d13e5d", "1600269452121-4f2416e55c28", "1491553895911-0055eca6402d",
    "1608231387042-66d1773d3028", "1519415943484-9fa1873496d4", "1606107557195-0e29a4b5b4aa",
    "1556905055-8f358a7a47b2", "1521334884684-d80222895322", "1583759136431-a55e32e4a9c8",
    "1600185365926-3a2ce3cdb9eb", "1559582798-678dfc71ccd8", "1549298916-b41d501d3772",
    // sneakers & casual
    "1595341190-0e38ab913f07", "1568702846114-d9d52ab3bcdf", "1556906785-bb1e50b6b8b0",
    "1510771463591-04ff9ba3e96c", "1591348122397-48b3a3dc2b76", "1595950653106-bac8e5f9a2b0",
    "1582588678413-dbf45f4823e9", "1556908653-8e86b7d0e6df", "1600185367522-b91a3d3042ca",
    "1513104890138-7c749659a591", "1612195409025-c684fcf3a87e", "1507003211169-0a1dd7228f2d",
    // boots & textured materials
    "1570677509-4f1e7f0a7e9a", "1624292087-fb3aaef2b97d", "1602532305019-3dbbd64f9176",
    "1519236564366-f5c81f4f5f82", "1614252235316-8bfab313d581", "1605348438312-3b8c3da1b7bc",
    // cobbler / craft / workshop
    "1621696322156-c89d58c86ef3", "1574180566232-aaad1b5b8450", "1607749860816-a5d4dfd5e4b3",
    "1506439773649-6e0eb8cfb237", "1532009877282-3340270e0529", "1565193566173-7a0ee3dbe261",
  ],
  fashion: [
    // editorial lookbook
    "1483985986-9e7dcf2e1a8e", "1529903672776-b51b5379fcf4", "1445205170230-053b83016050",
    "1567401893414-76b7b1e5a7a5", "1576566588028-4147f3842f27", "1516762689-1b8e44c75a0b",
    "1525507119428-b1f248080c57", "1558618666-fcd25c85cd64", "1554290712-e640351074bd",
    "1434389677669-e08b4cac3105", "1469334031218-e382a71b716b", "1509631179647-0177331693ae",
    "1517428084727-ff65e139a29e", "1586297135537-9b5cfd5d0203", "1496747488704-06a9c4f1add1",
    "1475180429745-5d1e68e31cd1", "1490481651871-ab68de25d43d", "1539109136881-3be0616acf4b",
    // street style / model shots
    "1515886657613-9f3515b0c78f", "1508214751196-22927d55b97d", "1490707842-8c0a8fa3c2bf",
    "1524504388940-b1c1722653e4", "1584043718892-a4e2e8ab1042", "1541101767792-f9b2b1c4f127",
    "1503341504253-dff4815485f1", "1485230895905-ec40ba36b9bc", "1562572159-4edb4f26e2d5",
    "1614093302611-ad3d26b7b31a", "1496079509898-20e5a3fc1d0e", "1512316609839-ce654a9fd0b8",
    // fabric textures / flat lays
    "1558769132-cb1aea153895", "1530025809667-f3aeee396bcf", "1495474472287-4d71bcdd2085",
    "1521572163474-6864f9cf17ab", "1603400521630-9f2de124b33b", "1467043153537-a4fba2cd39ef",
  ],
  food: [
    // plated dishes & fine dining
    "1414235077428-338989a2e8c0", "1476224203421-74177e9bcce6", "1504674900247-0877df9cc836",
    "1555396273-367ea4eb4db5", "1565299624946-b28f40a0ae38", "1490645935967-10de6ba17061",
    "1517248135467-4c7edcad34c4", "1559925393-8be0ec4767c8", "1546069901-ba9599a7e63c",
    "1565958011703-44f9829ba187", "1551024601-bec78aea704b", "1498837167922-ddd27525d352",
    "1424847651672-bf20a4b0982b", "1540189549336-e6e99c3679fe", "1485921325833-c519f76c4927",
    "1473093226589-8e0c6927e2f0", "1512621776951-a57141f2eefd", "1504564266660-7f5f4a5fa7ff",
    "1550966871-3ed3cdb5ed0c", "1534482421-64566f976cfa",
    // cafe & bakery
    "1509042438644-03b8e48b9df3", "1495474472287-4d71bcdd2085", "1542314831-068cd1dbfeeb",
    "1481931098730-318b6f776db0", "1517433670267-305172d1699a", "1606787364406-a3c3c1952e0b",
    "1495147466023-ac5c588e2e94", "1568901346375-23c9450c58cd", "1559056189-7d92b12862f4",
    "1571091718767-18b5b1457add", "1534040385115-33dcb3f21137", "1504388535701-3f72cb39a5af",
  ],
  beauty: [
    // skincare & products
    "1560066984-138dadb4c035", "1570172619644-dfd03ed5d881", "1522337360788-8b13dee7a37e",
    "1516975080664-ed2fc6a32937", "1512290923902-8a9f81dc236c", "1522338242992-e1f1c1b65a39",
    "1519824187-d30049d47b50", "1616394584738-fc6e612e71b9", "1599566150163-29194dcaad36",
    "1526413232644-8a7f3d23a04b", "1607748851610-cef42b53c18e", "1518459439390-bd1e3c5cac2f",
    "1598300042247-d088f8ab3a91", "1588776814546-daab30f11f40", "1611073615830-b3a79be91b0d",
    // salon & treatment
    "1515377905703-c4788e51af15", "1582095133179-bfd5a1b6cd60", "1540555700478-4be289fbecef",
    "1559762384-1b1f534e5a26", "1516841273335-e04b7dc3f29e", "1582037928769-181f13fc44e7",
    "1611336273904-de0b0e0eedb1", "1535585209876-c1b4b8bfc05d", "1598440947619-2c35fc9aa908",
    // spa & wellness atmosphere
    "1544161513-0179fe746fd5", "1600334129128-685f39be5481", "1614253901-5b3b5c3fad12",
    "1571019613454-1cb2f99b2d8b", "1544367567-0f2fcb009e0b", "1596462502278-27bfdc403348",
    "1515688594-0eebcca23e55", "1487412947147-5cebf96ef2ff", "1519415943484-9fa1873496d4",
  ],
  tech: [
    // workspace & desk setups
    "1518770660439-4636190af475", "1497366216548-37526070297c", "1519389950473-47ba0277781c",
    "1461749280684-dccba630e2f6", "1581291518857-4e27b48ff24e", "1499951360447-b19be8fe80f5",
    "1486312338219-ce68d2c6f44d", "1517048676732-d65bc937f952", "1504868584819-f8e8b4b6d7e3",
    "1516116216624-53ad0573a9c6", "1531297484001-80022131f5a1", "1558494949-ef010cbdcc31",
    "1553877522-43269d4ea984", "1498050108023-c5249f4df085", "1451187580459-43490279c0fa",
    "1550751827-4bd374c3f58b", "1563770660941-10a27b6e73fd", "1517373116369-9bdb8cdc2f9a",
    "1580894894513-541e088a3209", "1504384308090-c894fdcc538d",
    // developer & software
    "1593642632559-0c6d3fc62b89", "1587620962725-abab7fe55159", "1531403009284-440f080d1e12",
    "1552664730-d307ca884978", "1521791136064-7986c2920216", "1555421689-3596236e427f",
    "1574717024453-354056aafa98", "1607799279861-4dd421888d00", "1542831010-ee7bf77da4a9",
    "1537432376769-00f5c2f4c8d2", "1629654297299-c8506221ca97", "1610563166150-b34b5703a6a2",
  ],
  portfolio: [
    // creative studio & equipment
    "1513475382585-d06e58bcb0e0", "1547891654-e66ed7ebb968", "1561070791-2526d30994b8",
    "1502691876148-a84978e59af8", "1499781350541-7783f6c6a0c8", "1551038247-3d9af20df552",
    "1534447677768-be436bb09401", "1524758631624-e2822e304c36", "1600880292203-757bb62b4baf",
    "1557804506-669a67965ba0", "1497366811353-6870744d04b2", "1513519245088-8b16c46c7ab1",
    "1481627834876-b7833e8f5a27", "1460661419201-fd4cecdf8a8b", "1456926631375-92c8ce872def",
    "1471897488348-1f7c9c7f1a63", "1507721999473-8ff76701704d", "1520085601670-ee14aa5fa3e2",
    "1558618666-fcd25c85cd64", "1554290712-e640351074bd",
    // photography / videography
    "1516259762381-22954d7d3ad2", "1517960813568-27820b2fa5cd", "1543269865-cbf427effbad",
    "1452587925148-ce544e77e70d", "1534655088264-f5f6bda6fa7b", "1576671414432-78c7ca295958",
    "1587578855966-97e4c9eb56e0", "1606406054219-619c4e9d87e7", "1609348262030-cf0a3cd8b7fc",
    "1550938498-ab43a42d9c8d", "1481162854517-d9be8c4a9f08", "1603481588273-2f7786ba4505",
  ],
  interior: [
    // living rooms & furniture
    "1486325212027-8081e485255e", "1502602898657-3e91760cbb34", "1507089947368-19c1da9775ae",
    "1486718448742-163732cd1544", "1497366754035-f200968a6e72", "1555041469-a586c61ea9bc",
    "1560185127-6a5ac5f39d69", "1585128792020-2ea88b98f8bb", "1493809842364-78817add7ffb",
    "1556020685-bfb6b8e2fb9e", "1616486448229-72a87b5d5041", "1600210492493-0946911123ea",
    "1600596542815-0c35f65a7b0b", "1567038327802-9b1d1e28d8e7", "1615874959474-d609969a20ed",
    "1584622650111-993a426fbf0a", "1560448204-e02f11c3d0e2", "1556912167-f556b55b23d5",
    "1550226891-ef0b7a2d0d34", "1534430480872-3498386ece01",
    // kitchens, dining, bedrooms
    "1556909114-f6e7ad7d3136", "1558618666-fcd25c85cd64", "1505692952047-1a78307da8d2",
    "1564078516393-cf04bd966897", "1507652313519-cda5a2b95d94", "1618221195710-dd6b41faaeaa",
    "1549497538-10d0464ac18c", "1576698483491-8c43f0862543", "1598928506311-c55ded91a20c",
    "1590381105924-c72589b9ef3f", "1604709177225-055f99402ea3", "1582037928769-181f13fc44e7",
  ],
  health: [
    // gym & fitness
    "1524178232363-1fb2b075b655", "1523050854058-8df90110c9f1", "1517836357463-d25dfeac3438",
    "1549737328-b0a28445d6a9", "1507120878965-54b2d3939100", "1540339832862-474599807c3b",
    "1544198365-f5d60b6d8190", "1519311726-d61bde75f1c0", "1518310383802-640c2de311b2",
    "1534438327015-2e4dee4ce60e", "1584464491033-f628beba22af", "1574680096145-d05b474e2155",
    "1540497077302-073d6b8ee1e0", "1529516222807-2536f98c9b4e", "1572521165-1416b9869d02",
    "1521791136064-7986c2920216", "1548534228-56f94a0aa55c", "1576678927484-cc907957088c",
    "1506126279646-a697353d3166",
    // yoga & wellness
    "1544161513-0179fe746fd5", "1516310502399-09f4e3a9e2e5", "1539794830-405e1ccd3a73",
    "1571019613914-f86c7f5f5e18", "1571019614099-cf8c2c1cd40d", "1546483875-ad9f36d26a85",
    "1537368910025-700350fe46c7", "1559595500-e15296b8b2b4", "1558016283-4f0e04d0c3e1",
    "1518611012118-696072aa579a", "1506905925346-21bda4d32df4", "1547592166-23ac88de23eb",
  ],
  coffee: [
    // cafe interiors & atmosphere
    "1509042438644-03b8e48b9df3", "1495474472287-4d71bcdd2085", "1542314831-068cd1dbfeeb",
    "1481931098730-318b6f776db0", "1517433670267-305172d1699a", "1555951015-6da899b5c2cd",
    "1493857671505-72967e2e2760", "1521017432531-fbd92d768814", "1501339847302-ac426a4a7cbb",
    "1461023058943-07fcbe16d735", "1495615080073-6b4b3ef22246", "1569598119741-b3f73af12c77",
    // espresso / latte art / beans
    "1510972525817-7b1bb1b69e18", "1554118811-1e0d58224f24", "1495474472287-4d71bcdd2085",
    "1525362081669-2b476bb628c3", "1511920183355-89db95e5fb28", "1587734195503-904fca47e0e9",
    "1568651985836-b04fd09e4ba3", "1442512435317-3b08e7b1e736", "1509042438644-03b8e48b9df3",
    "1518057532296-7449abc37d9c", "1434389677669-e08b4cac3105", "1502781252888-9143e6ea9b09",
    // barista at work
    "1602985429285-5d9c2986d6de", "1497515114865-36b3e5f39e30", "1558618666-fcd25c85cd64",
    "1508666185905-466023ab3ec8", "1436076863939-06870fe779c2", "1607012987-5a78a65a3c53",
  ],
  jewelry: [
    // rings, necklaces, earrings
    "1515562141207-7a88fb7ce338", "1603161168305-79da6e10258b", "1573408301185-9521e7d27212",
    "1587304540539-18c547aeba49", "1605100804763-247f67b3557e", "1611085583191-a3b181a88558",
    "1617038260897-41a533e3f0d8", "1598560917505-59118b0eb7b4", "1605100804763-247f67b3557e",
    "1581252177561-25ae2a7d0a6a", "1522312346375-d1a52e2b99b3", "1608042314955-7818e3aead46",
    // flat-lay on marble / minimal surfaces
    "1602143407151-7f4bda0f1f13", "1507699522086-f7a3131c4395", "1558618048-fcd4737cdbe5",
    "1614252235316-8bfab313d581", "1594995846645-4abed5d2b979", "1617704548623-340376e0b05c",
    "1599643477877-530eb83abc8e", "1616763289969-14f7e08568ae", "1603298512564-09b0ea0b5f63",
    "1573676048-82b7ef26498c", "1589810635657-cf433f5fcab2", "1580706483913-b6ea7db26e87",
    "1543294001-f1cd7ea5b9fc", "1612278675554-489b31a5dd5a", "1615751283042-e9e578011eea",
  ],
  restaurant: [
    // upscale dining & plating
    "1414235077428-338989a2e8c0", "1555396273-367ea4eb4db5", "1517248135467-4c7edcad34c4",
    "1559925393-8be0ec4767c8", "1565958011703-44f9829ba187", "1551024601-bec78aea704b",
    "1498837167922-ddd27525d352", "1540189549336-e6e99c3679fe", "1512621776951-a57141f2eefd",
    "1550966871-3ed3cdb5ed0c",
    // restaurant interiors & ambiance
    "1414235077428-338989a2e8c0", "1559056189-7d92b12862f4", "1571091718767-18b5b1457add",
    "1534040385115-33dcb3f21137", "1504388535701-3f72cb39a5af", "1455619452474-d73300d61ebb",
    "1414235077428-338989a2e8c0", "1466978913421-dad2ebd01d17", "1504674900247-0877df9cc836",
    "1476224203421-74177e9bcce6", "1490645935967-10de6ba17061", "1568901346375-23c9450c58cd",
    // chef & kitchen
    "1543353071-087092ec393a", "1466978913421-dad2ebd01d17", "1504439898-d0bb1c60a5f1",
    "1530062845289-9109b2c9d409", "1601050690597-df0568f70950", "1607877742574-a75abb0f426e",
  ],
  events: [
    // weddings & celebrations
    "1519741497674-611481863552", "1464366400600-7168b8af9bc3", "1519741497674-611481863552",
    "1519225421980-9eab9f9c1d72", "1464366400600-7168b8af9bc3", "1515934733-9f9bce3f8b5b",
    "1527529482837-4698179dc6ce", "1465495976277-a703f73bec8a", "1606800052052-943a01aef71b",
    "1583939003579-730e3918a45a", "1532635240-cdd5bd4e6b19",
    // venue & florals
    "1519741497674-611481863552", "1526047932273-341f2a7631f9", "1527529482837-4698179dc6ce",
    "1516051662689-12edbf34bcf8", "1600334129128-685f39be5481", "1511795409834-ef04bbd61622",
    "1519225421980-9eab9f9c1d72", "1507003211169-0a1dd7228f2d", "1552673352-aeff79d678e7",
    "1465495976277-a703f73bec8a", "1519741497674-611481863552", "1606800052052-943a01aef71b",
    // event decor & atmosphere
    "1540575467063-b3a1aeb66497", "1501281668745-b526be2f353b", "1551818255-a7060ae81f6e",
    "1530026405591-2b4b24cf35e9", "1519225421980-9eab9f9c1d72", "1515934733-9f9bce3f8b5b",
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
    "1600596542815-0c35f65a7b0b", "1521737711867-e3b97375f902", "1556742049-0cfed4f719b8",
    "1611532736597-de2d4265fba3", "1519831307965-2b22a0b27f43", "1504439898-d0bb1c60a5f1",
    "1579389083395-4507e98f5e67", "1542744173-8e7e53415bb0", "1530099163-39c0b00f9f24",
  ],
};

// Infer which photo category best matches a generation prompt.
function inferPhotoCategory(userPrompt: string): string {
  const q = userPrompt.toLowerCase();
  if (/shoe|sneaker|footwear|boot|sandal|heel|leather shoe|calzado|sapatos|cobbler|cordwainer|loafer|oxford|derby/.test(q)) return "footwear";
  if (/jewelry|jewellery|ring|necklace|earring|bracelet|gold|silver|diamond|gemstone|accessory|accessories|alahas/.test(q)) return "jewelry";
  if (/wedding|event|party|celebration|catering event|venue|florals|flowers|anniversary|debut|baptism/.test(q)) return "events";
  if (/coffee shop|cafe|barista|espresso|latte|cappuccino|brew|kape|coffeehouse/.test(q)) return "coffee";
  if (/restaurant|dining|bistro|brasserie|tasting menu|fine dining|diner|eatery/.test(q)) return "restaurant";
  if (/food|bakery|catering|cuisine|bar|kain|lutuin|pagkain|restaurant|pastry|bake|bread|dessert|cake/.test(q)) return "food";
  if (/fashion|clothing|apparel|boutique|wear|dress|shirt|terno|blouse|skirt|pants|jeans|suit|streetwear|couture|luto|damit/.test(q)) return "fashion";
  if (/salon|spa|beauty|skincare|hair|nail|lash|brow|ganda|aesthetics|wellness clinic|facial|waxing|massage|blow dry/.test(q)) return "beauty";
  if (/tech|software|app|dev|digital|it services|web agency|startup|saas|platform|coding|programmer|cybersecurity|cloud/.test(q)) return "tech";
  if (/portfolio|photography|photographer|videographer|creative|artist|design studio|illustration|graphic|content creator|filmmaker/.test(q)) return "portfolio";
  if (/interior|furniture|home decor|renovation|architecture|condo|real estate|property|staging|modular/.test(q)) return "interior";
  if (/gym|fitness|workout|health|yoga|pilates|sports|training|coach|nutrition|crossfit|martial arts|boxing|muay thai/.test(q)) return "health";
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

function sanitizeImages(website: GeneratedWebsite, approvedIds?: Set<string>): GeneratedWebsite {
  // Track every image URL we keep for this site so two different roles
  // never end up with the same Unsplash photo. When we detect a repeat we
  // swap it for a fresh fallback so each section visually feels distinct.
  const used = new Set<string>();
  const photoIdOf = (url: string): string => {
    const m = url.match(/photo-([a-zA-Z0-9-]+)/);
    return m ? m[1] : url;
  };
  const nextUnused = (size: string): string => {
    for (let i = 0; i < 12; i++) {
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
  };
  const claim = (url: string | undefined, size: string): string => {
    if (!url || !url.startsWith("https://images.unsplash.com")) {
      return nextUnused(size);
    }
    const id = photoIdOf(url);
    // If an approved set is provided, reject any photo not in it — this
    // guarantees the AI only uses the rotating per-generation pool we injected
    // into the prompt, preventing repetition across generations.
    if (approvedIds && !approvedIds.has(id)) {
      return nextUnused(size);
    }
    if (used.has(id)) {
      return nextUnused(size);
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
  const fillStr = (val: any, fallback: string) =>
    typeof val === "string" && val.trim().length > 0 ? val : fallback;

  website.sections = website.sections.map((s) => {
    const d = { ...((s.data || {}) as any) };

    if (s.type === "hero") {
      d.headline = fillStr(d.headline, `${brand}`);
      d.subheadline = fillStr(d.subheadline ?? d.sub ?? d.subtitle, "Crafted with care for the Metro Manila market — premium quality, honest service.");
      if (!d.ctaPrimary || typeof d.ctaPrimary !== "object") {
        d.ctaPrimary = { label: "Get in touch", href: "/contact" };
      } else {
        d.ctaPrimary.label = fillStr(d.ctaPrimary.label, "Get in touch");
        d.ctaPrimary.href = fillStr(d.ctaPrimary.href, "/contact");
      }
    }

    if (s.type === "about") {
      d.heading = fillStr(d.heading ?? d.title, "About us");
      d.body = fillStr(d.body ?? d.description, `${brand} is an independent Metro Manila brand built around craft, care, and honest service. We work closely with our clients to deliver work that lasts and is genuinely useful — no shortcuts, no fluff.`);
      if (!d.ctaPrimary || typeof d.ctaPrimary !== "object") {
        d.ctaPrimary = { label: "Learn more", href: "/about" };
      }
    }

    if (s.type === "gallery") {
      d.heading = fillStr(d.heading ?? d.title, "Selected work");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "A small selection of recent projects.");
      const arr = Array.isArray(d.images) ? d.images : [];
      while (arr.length < 6) {
        arr.push({ url: fallbackPhoto("800x800"), caption: "" });
      }
      d.images = arr;
    }

    if (s.type === "team") {
      d.heading = fillStr(d.heading ?? d.title, "The team");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "The people behind the work.");
      const members = Array.isArray(d.members) ? d.members : [];
      const roles = ["Founder", "Creative Director", "Lead Designer", "Account Manager"];
      const names = ["Maria Santos", "Ramon dela Cruz", "Angela Reyes", "James Villanueva"];
      const bios = [
        "Leads strategy and client direction across every engagement.",
        "Heads the creative direction with a focus on minimal, lasting design.",
        "Owns the day-to-day craft and detailing of every project.",
        "Manages partnerships and keeps timelines honest.",
      ];
      while (members.length < 3) {
        const i = members.length;
        members.push({
          name: names[i] ?? `Team Member ${i + 1}`,
          role: roles[i] ?? "Team Member",
          image: fallbackPhoto("400x400"),
          bio: bios[i] ?? "",
        });
      }
      // Fill missing fields on existing members too
      d.members = members.map((m: any, i: number) => ({
        ...m,
        name: fillStr(m?.name, names[i] ?? `Team Member ${i + 1}`),
        role: fillStr(m?.role, roles[i] ?? "Team Member"),
        bio: fillStr(m?.bio, bios[i] ?? ""),
      }));
    }

    if (s.type === "testimonials") {
      d.heading = fillStr(d.heading ?? d.title, "What clients say");
      const items = Array.isArray(d.testimonials) ? d.testimonials : [];
      const defaults = [
        { name: "Maria Santos",     role: "Client",       quote: `Working with ${brand} was a great experience — clear, on time, and professional.` },
        { name: "Ramon dela Cruz",  role: "Customer",     quote: `${brand} delivered exactly what we asked for. We'll be back for the next project.` },
        { name: "Angela Reyes",     role: "Repeat Buyer", quote: `Highly recommended. Quality and service that's hard to find in Metro Manila.` },
      ];
      while (items.length < 3) {
        items.push({ ...(defaults[items.length] ?? defaults[0]), image: fallbackPhoto("100x100") });
      }
      d.testimonials = items.map((t: any, i: number) => ({
        ...t,
        name: fillStr(t?.name, defaults[i % 3].name),
        role: fillStr(t?.role, defaults[i % 3].role),
        quote: fillStr(t?.quote, defaults[i % 3].quote),
      }));
    }

    if (s.type === "features") {
      d.heading = fillStr(d.heading ?? d.title, "What we offer");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "A focused set of services we deliver consistently well.");
      const items = Array.isArray(d.features) ? d.features : [];
      const titles = ["Quality First", "Trusted Partner", "On-Time Delivery", "Clear Pricing", "Local Expertise", "Honest Service"];
      const descs = [
        "Built to last, designed with care, and shipped without compromise.",
        "We work closely with you from brief to handover — no surprises.",
        "Realistic timelines we actually meet, not aspirational ones.",
        "Transparent rates with no hidden fees or upsells.",
        "Built and run by Filipino craftspeople for the local market.",
        "If something isn't right, we make it right — that's it.",
      ];
      while (items.length < 3) {
        const i = items.length;
        items.push({
          title: titles[i] ?? `Feature ${i + 1}`,
          description: descs[i] ?? descs[0],
          icon: ["star", "shield-check", "clock", "tag", "map-pin", "heart"][i] ?? "check",
        });
      }
      d.features = items.map((f: any, i: number) => ({
        ...f,
        title: fillStr(f?.title, titles[i] ?? `Feature ${i + 1}`),
        description: fillStr(f?.description, descs[i] ?? descs[0]),
      }));
    }

    if (s.type === "stats") {
      d.heading = fillStr(d.heading ?? d.title, "By the numbers");
      const items = Array.isArray(d.stats) ? d.stats : [];
      const defaults = [
        { value: "120+", label: "Projects Delivered" },
        { value: "8 yrs", label: "Industry Experience" },
        { value: "98%",  label: "Client Satisfaction" },
        { value: "24/7", label: "Support Coverage" },
      ];
      while (items.length < 3) items.push(defaults[items.length] ?? defaults[0]);
      d.stats = items.map((st: any, i: number) => ({
        value: fillStr(st?.value, defaults[i % 4].value),
        label: fillStr(st?.label, defaults[i % 4].label),
      }));
    }

    if (s.type === "faq") {
      d.heading = fillStr(d.heading ?? d.title, "Questions");
      const items = Array.isArray(d.faqs) ? d.faqs : [];
      const defaults = [
        { question: "How long does a project take?",       answer: "Most engagements run 2–6 weeks depending on scope. We confirm a timeline at the start." },
        { question: "Do you work with small businesses?",  answer: "Yes — most of our clients are independent Filipino brands and small teams." },
        { question: "How do payments work?",                answer: "We invoice in two milestones. Online payment via PayMongo or bank transfer." },
        { question: "Where are you based?",                  answer: "Metro Manila — we work with clients across the Philippines and remotely." },
      ];
      while (items.length < 4) items.push(defaults[items.length] ?? defaults[0]);
      d.faqs = items.map((q: any, i: number) => ({
        question: fillStr(q?.question, defaults[i % 4].question),
        answer: fillStr(q?.answer, defaults[i % 4].answer),
      }));
    }

    if (s.type === "cta") {
      d.heading = fillStr(d.heading ?? d.title, "Let's work together");
      d.subheading = fillStr(d.subheading ?? d.subtitle ?? d.body, "Tell us about your project — we'll reply within one business day.");
      if (!d.ctaPrimary || typeof d.ctaPrimary !== "object") {
        d.ctaPrimary = { label: "Get in touch", href: "/contact" };
      } else {
        d.ctaPrimary.label = fillStr(d.ctaPrimary.label, "Get in touch");
        d.ctaPrimary.href = fillStr(d.ctaPrimary.href, "/contact");
      }
    }

    if (s.type === "newsletter") {
      d.heading = fillStr(d.heading ?? d.title, "Stay in touch");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "Occasional updates on new work and availability. No spam.");
      d.placeholder = fillStr(d.placeholder, "you@example.com");
      d.buttonLabel = fillStr(d.buttonLabel ?? d.cta, "Subscribe");
    }

    if (s.type === "contact") {
      d.heading = fillStr(d.heading ?? d.title, "Contact");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "We reply within one business day.");
    }

    if (s.type === "process") {
      d.heading = fillStr(d.heading ?? d.title, "How we work");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "A simple, transparent process from first call to delivery.");
      const steps = Array.isArray(d.steps) ? d.steps : [];
      const titles = ["Discovery", "Design", "Build", "Deliver"];
      const descs = [
        "We start with a call to understand your goals, audience, and constraints.",
        "We propose a clear direction backed by references and a written brief.",
        "We build the work with regular check-ins so nothing surprises you.",
        "We hand off, train your team, and stay available for questions afterward.",
      ];
      while (steps.length < 3) {
        const i = steps.length;
        steps.push({ title: titles[i], description: descs[i] });
      }
      d.steps = steps.map((st: any, i: number) => ({
        ...st,
        title: fillStr(st?.title, titles[i] ?? `Step ${i + 1}`),
        description: fillStr(st?.description, descs[i] ?? descs[0]),
      }));
    }

    if (s.type === "pricing") {
      d.heading = fillStr(d.heading ?? d.title, "Pricing");
      d.subheading = fillStr(d.subheading ?? d.subtitle, "Transparent rates. No hidden fees.");
      const plans = Array.isArray(d.plans) ? d.plans : [];
      d.plans = plans.map((p: any) => ({
        ...p,
        name: fillStr(p?.name, "Plan"),
        price: fillStr(p?.price, "₱0"),
        description: fillStr(p?.description, "Includes everything you need to get started."),
      }));
    }

    if (s.type === "products") {
      d.heading = fillStr(d.heading ?? d.title, "Featured products");
      const products = Array.isArray(d.products) ? d.products : [];
      d.products = products.map((p: any) => ({
        ...p,
        name: fillStr(p?.name, "Product"),
        description: fillStr(p?.description, "Crafted with care and built to last."),
      }));
    }

    if (s.type === "footer") {
      d.tagline = fillStr(d.tagline ?? d.description, `${brand} — built in Metro Manila.`);
    }

    return { ...s, data: d };
  });
  return website;
}

// ─── Enterprise: auto-inject business management sections ────────────────────
// When plan=ENTERPRISE, the generated site automatically gains a "management
// suite" presentation — two sections (stats + features) inserted before the
// footer that describe and link to the /dashboard manage panel. Uses existing
// renderer components so nothing new needs to be built.
function injectEnterpriseSections(website: GeneratedWebsite): GeneratedWebsite {
  if (!website.sections || website.sections.length === 0) return website;

  const bg = website.colors?.background ?? "#111827";
  const primary = website.colors?.primary ?? "#1F2937";
  const text = website.colors?.text ?? "#F9FAFB";
  const accent = website.colors?.accent ?? "#c9a84c";

  const hasProducts = website.sections.some((s) => s.type === "products");
  const footerIdx = website.sections.findIndex((s) => s.type === "footer");

  // Choose insertion point: just before footer (or end of array)
  const insertAt = footerIdx !== -1 ? footerIdx : website.sections.length;

  // --- Business KPI stats ---
  const statsSection: Section = {
    id: "enterprise-kpi-stats",
    type: "stats",
    data: {
      title: "Built-In Business Intelligence",
      subtitle: "Your Enterprise plan comes with a full management suite — orders, customers, analytics, and marketing in one place.",
      stats: [
        { value: "Orders", label: "Tracked automatically from checkout" },
        { value: "CRM", label: "Customer profiles built from every sale" },
        { value: "Analytics", label: "Live traffic & conversion data" },
        { value: "Marketing", label: "Newsletter & contact management" },
      ],
    },
    styles: { background: bg, textColor: text, accentColor: accent },
  };

  // --- Management features grid ---
  const featuresSection: Section = {
    id: "enterprise-management-features",
    type: "features",
    data: {
      title: hasProducts
        ? "Shopify-Level Store Management"
        : "Enterprise Business Management",
      subtitle: hasProducts
        ? "Every order, customer, and peso tracked automatically. Access your dashboard from anywhere."
        : "A complete business operations suite built into your website — no third-party tools required.",
      features: [
        {
          title: "Order Management",
          description: "Real-time order tracking from placement to fulfilment. Mark paid, cancelled, or refunded with one click. Export to CSV.",
          icon: "shopping-bag",
        },
        {
          title: "Customer CRM",
          description: "Automatic customer profiles from orders, contact forms, and newsletter signups. Tags, notes, lifetime value tracking.",
          icon: "users",
        },
        {
          title: "Sales Analytics",
          description: "7-day revenue trends, average order value, conversion rates, and top referral sources — updated in real time.",
          icon: "bar-chart-2",
        },
        {
          title: "Marketing Hub",
          description: "View all contact enquiries, manage newsletter subscribers, and export leads to CSV for email campaigns.",
          icon: "mail",
        },
        {
          title: "Store Settings",
          description: "Configure payment methods (GCash, Maya, COD, bank transfer), business contact info, and site branding.",
          icon: "settings",
        },
        {
          title: "Traffic Intelligence",
          description: "Page visit tracking, referral source breakdown, and visitor geography — no third-party scripts or cookies.",
          icon: "globe",
        },
      ],
    },
    styles: { background: primary, textColor: text, accentColor: accent },
  };

  website.sections = [
    ...website.sections.slice(0, insertAt),
    statsSection,
    featuresSection,
    ...website.sections.slice(insertAt),
  ];

  return website;
}

// ─── Master post-processor ────────────────────────────────────────────────────
function postProcess(
  website: GeneratedWebsite,
  plan: string,
  category = "general",
  approvedPhotos?: string[]
): GeneratedWebsite {
  // Build the approved-ID set for this generation. When provided, sanitizeImages
  // will REJECT any photo the AI returned that isn't in this set — guaranteeing
  // that every image on the site comes from the rotating pool we injected into
  // the prompt, not from the AI's training-data "known" Unsplash URLs.
  let approvedIds: Set<string> | undefined;
  if (approvedPhotos && approvedPhotos.length > 0) {
    approvedIds = new Set(approvedPhotos);
    // Point the fallback pool at exactly these approved photos (shuffled) so
    // replacement images also come from the same curated set.
    _photoPool = shuffle([...approvedPhotos]);
    _photoIdx = 0;
  } else {
    resetPhotoPool(category);
  }

  // Pick a varied but premium font pair each generation
  const FONT_PAIRS = [
    { heading: "Inter",           body: "Inter" },
    { heading: "DM Serif Display",body: "DM Sans" },
    { heading: "Playfair Display", body: "Inter" },
    { heading: "Cormorant Garant", body: "DM Sans" },
    { heading: "Syne",             body: "Inter" },
    { heading: "Fraunces",         body: "Outfit" },
    { heading: "Outfit",           body: "Outfit" },
    { heading: "Plus Jakarta Sans",body: "Plus Jakarta Sans" },
    { heading: "DM Sans",          body: "DM Sans" },
    { heading: "Space Grotesk",    body: "Inter" },
  ];
  const fontPair = FONT_PAIRS[Math.floor(Math.random() * FONT_PAIRS.length)];
  website.fonts = fontPair;
  // Strip plan-disallowed section types
  website = enforcePlanSections(website, plan);
  // Sanitize colors
  website = sanitizeColors(website);
  // Ensure real Unsplash images (enforce approved set)
  website = sanitizeImages(website, approvedIds);
  // Fill empty visual sections (gallery / team / testimonials / faq / stats)
  website = ensureSectionContent(website);
  // Re-run image sanitization after content fill
  website = sanitizeImages(website, approvedIds);
  // Rewrite anchor links into multi-page routes
  website = normalizeNavLinks(website);
  return website;
}

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the lead creative director at Metro Manila's most awarded digital design agency. You produce bespoke premium websites for Filipino businesses — the kind that win design awards and command ₱500,000+ agency fees. Every output you produce MUST feel unique, hand-crafted, and completely specific to the business described. A generic "AI-generated" output means the client lost money and trust.

══════════════════════════════════════════
DESIGN PHILOSOPHY
══════════════════════════════════════════
• SPECIFICITY above all. A leather shoe cobbler and a sneaker reseller must look completely different. A BGC law firm and a Poblacion tattoo studio must feel worlds apart.
• Premium means restraint. White space, confident typography, and real photography do all the work.
• Every section must feel intentional — not filler. If you wouldn't show it to a client, don't output it.
• Copy is direct and specific. No clichés, no "elevate your brand," no exclamation marks.
• Photography tells the story. Every image must visually match the SPECIFIC business — not generic stock.

══════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE
══════════════════════════════════════════

OUTPUT FORMAT
• Return ONLY a single valid JSON object. No markdown fences, no backticks, no commentary, no explanation.

COLORS
• TWO allowed modes — pick based on the business personality:
   (A) LIGHT MINIMAL — pure white/off-white bg, deep black/charcoal text — for luxury, beauty, fashion, food
   (B) DARK MINIMAL — pure black/near-black bg, white text — for tech, automotive, nightlife, premium menswear
• APPROVED light backgrounds: #FFFFFF | #FAFAFA | #FAFAF7 | #FBFAF6 | #F8F8F8 | #F7F5F1 | #F5F5F0
• APPROVED dark backgrounds: #000000 | #0A0A0A | #0F0F0F | #111111 | #171717 | #18181B
• Text: #0A0A0A–#1A1A1A on light | #FFFFFF–#F5F5F5 on dark
• ONE accent color for CTAs only. Choose intelligently for the brand:
  — Deep navy #1E40AF for professional/corporate
  — Espresso #1A1714 for artisan/food
  — Forest green #166534 for wellness/organic
  — Burgundy #7F1D1D for premium hospitality
  — Slate #0F172A for minimal/tech
  — Or pure black/white if truly minimal
• ZERO gradients. ZERO mid-grey backgrounds (reads as AI template). ZERO vivid or neon colors.
• Each section background alternates only between your two main neutrals (background and primary surface).

IMAGERY
• ALL images: https://images.unsplash.com/photo-{PHOTO_ID}?w=800&h=600&fit=crop&q=80
• Hero image: w=1400&h=800 | About/team: w=1000&h=750 | Products/gallery: w=600&h=600 | Avatars: w=100&h=100
• EVERY image must be a different ID — zero repeats within a site
• Images MUST match the niche: shoe store = shoe photography, coffee = cafe/espresso, fitness = gym/active
• NO illustrations, NO 3D renders, NO cartoons, NO placeholder text in images

CONTENT — ZERO BLANK SECTIONS
• Hero: kicker (optional, 2–4 words), headline (5–10 powerful words), sub (15–25 words, specific to business), primary CTA (label + href)
• About: heading, 3 paragraphs (total 80–140 words), authentic founder/origin story with specific details, CTA
• Features: heading + sub, then 4–6 items each with title (2–4 words) AND description (15–25 words, service-specific)
• Products/Pricing: every item has name, price in ₱ (realistic for Metro Manila), 1-sentence specific description
• Stats: heading, sub, then 3–5 stats with BOTH a concrete value AND a specific meaningful label
• Testimonials: 3–4 entries, each with Filipino name, role/relationship, quote (20–40 words, specific, believable)
• Process: heading + sub, then 3–5 steps with specific title and 15–20 word description
• FAQ: heading, 4–6 Q&A pairs, each answer 2–3 sentences specific to this business
• CTA: bold action-oriented headline (not generic), sub-text (1 sentence), one button
• Footer: brand name, tagline (5–8 words), contact info (real-looking Metro Manila address + phone), 3 link columns

COPY QUALITY — NON-NEGOTIABLE
• BANNED phrases: "Crafted with passion", "Quality you can trust", "Elevate your", "Where dreams", "Experience the difference", "Made with love", "Premium quality", "World-class", "Take your business to the next level"
• Write SPECIFIC copy: "Full-grain Derby oxfords finished in Horween leather, resolable for life" beats "Quality footwear for everyone"
• Filipino context: BGC / Makati / Salcedo / Poblacion / Lahug / IT Park Cebu neighborhoods, Philippine peso prices, Filipino names
• Prices must be realistic: salon blow-dry ₱350–₱600, leather shoes ₱5,500–₱18,000, web dev project ₱25,000–₱120,000
• Business name: invent a specific Filipino brand name that clearly signals the niche

NAVIGATION (CRITICAL — multi-page routing)
• Nav uses page ROUTES, never "#" scroll anchors:
  / | /about | /work | /services | /menu | /products | /gallery | /contact | /pricing | /process | /team
• Pick 4–5 appropriate nav links for the business type. ctaHref must also be a real route.

SECTION COMPLETENESS CHECK
Before outputting, verify each section:
✓ Does it have a heading? ✓ Does it have body copy or items? ✓ Are all items populated (no empty strings)?
✓ Do all images have URLs? ✓ Are all CTAs labeled and linked? ✓ Does the copy match THIS specific business?

══════════════════════════════════════════
PLAN-BASED SECTIONS
══════════════════════════════════════════
FREE   → nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer ONLY. No products, no pricing.
PRO    → Add products, pricing, gallery, team, process. Include Hitpay/Paymongo payment links in product descriptions.
ENTERPRISE → All PRO sections. The business management suite (CRM/orders/analytics) is injected automatically — do NOT include dashboard sections.

══════════════════════════════════════════
JSON SCHEMA
══════════════════════════════════════════
{
  "name": "Business Name",
  "type": "STORE|BUSINESS|PORTFOLIO|RESTAURANT|SALON|LANDING",
  "seoTitle": "Specific 55-60 char title with brand name and niche",
  "seoDesc": "Specific 140-160 char description mentioning location and key service",
  "fonts": { "heading": "font-name", "body": "font-name" },
  "colors": {
    "primary":    "#hex",
    "secondary":  "#hex",
    "accent":     "#hex",
    "background": "#hex",
    "text":       "#hex"
  },
  "sections": [
    {
      "id": "unique-kebab-id",
      "type": "section-type",
      "data": { /* all fields populated — NEVER empty strings or null */ },
      "styles": {
        "background":  "#hex",
        "textColor":   "#hex",
        "accentColor": "#hex"
      }
    }
  ]
}`;

// ─── Niche-specific content hints ────────────────────────────────────────────
const NICHE_CONTENT_HINTS: Record<string, string> = {
  footwear: `NICHE CONTEXT — Footwear / Shoes:
• Product ideas: Full-grain Derby oxfords (₱9,800), suede Chelsea boots (₱11,500), Goodyear-welted loafers (₱14,200), custom MTO (₱18,000+)
• Features: "Goodyear-welted construction", "Museum-calf leather", "Leather insole & lining", "Resolable for decades", "Width fitting (E–EEE)"
• Stats examples: "340 pairs delivered | 12 leather selections | 4-week lead time | 100% resolable"
• About: founding story tied to a specific craft tradition (Marikina, Cebu, or imported European lasts)
• Testimonials: buyers who mention durability, fit, or the resoling service — NOT generic compliments`,
  jewelry: `NICHE CONTEXT — Jewelry / Accessories:
• Product ideas: 18K gold solitaire ring (₱28,000), sterling silver hoop earrings (₱4,500), layered necklace set (₱6,800), bespoke engagement ring (₱55,000+)
• Features: "Hallmarked 18K gold", "Conflict-free stones", "Custom engraving", "Lifetime resizing", "Certificate of authenticity"
• Stats examples: "180+ bespoke pieces | 3 generations of craftsmen | 6-week custom lead time"
• About: family goldsmith background, Binondo / Carriedo / Cebu origin story
• Testimonials: couples mentioning engagement rings, mothers gifting daughters — specific emotional context`,
  coffee: `NICHE CONTEXT — Coffee Shop / Cafe:
• Product ideas: Single-origin pour-over ₱180, Cortado ₱155, Cold brew flight ₱220, Croissant (house-baked) ₱95, Pasta del dia ₱285
• Features: "Direct-trade Benguet & Mt. Apo beans", "In-house roastery", "All-day brunch menu", "Private event bookings", "Monthly cupping sessions"
• Stats examples: "4 origins roasted weekly | 2 espresso machines | Open 7am–9pm daily"
• About: founder who sourced beans from Benguet highlands, built a neighborhood third-place, community-led
• Testimonials: regulars who mention their "usual" order, remote workers who love the WiFi, nearby office teams`,
  restaurant: `NICHE CONTEXT — Restaurant / Dining:
• Product ideas (menu): Tasting menu 5 courses ₱1,800/pax, A la carte mains ₱380–₱680, Curated wine pairing ₱950
• Features: "Seasonal tasting menu", "Private dining room (up to 12 pax)", "Wine cellar 200+ labels", "Chef's table experience"
• Stats examples: "Serving BGC since 2019 | 4.9 stars (380 reviews) | 5-course tasting menu every Friday"
• About: head chef's culinary background (training in Tokyo / Barcelona / Batangas), farm-to-table sourcing story
• Testimonials: diners describing specific dishes and the occasion (anniversary, business dinner)`,
  fashion: `NICHE CONTEXT — Fashion / Clothing:
• Product ideas: Structured linen blazer ₱4,200, Premium cotton tee ₱1,200, Wide-leg trousers ₱3,500, Silk midi dress ₱5,800
• Features: "Philippine-woven fabrics", "Slow-fashion production", "Small-batch drops", "Free alterations within 14 days", "Deadstock fabric collections"
• Stats examples: "120 pieces per drop | 6 collections yearly | Made-to-order 3-week lead"
• About: designer's training (FDCP / Esmod Manila / self-taught), mission around Philippine textiles
• Testimonials: customers citing specific fit, the fabric quality, or the brand's sustainability stance`,
  beauty: `NICHE CONTEXT — Beauty / Salon / Spa:
• Service ideas: Keratin treatment ₱3,500, Signature facial ₱1,800, Lash extension set ₱2,200, Full-body massage 90min ₱2,500, Brow lamination ₱1,200
• Features: "Korean skincare protocols", "Formaldehyde-free treatments", "Private treatment rooms", "Book online in 60 seconds", "Consultation included in first visit"
• Stats examples: "2,400+ clients served | 97% rebooking rate | 8 certified therapists"
• About: founder's aesthetics background, training abroad (Korea, Japan), focus on skin health not just appearance
• Testimonials: clients mentioning specific results (skin tone improvement, lash retention), or the relaxing environment`,
  tech: `NICHE CONTEXT — Tech / Software / Digital Agency:
• Service ideas: Custom web development ₱45,000–₱150,000, Mobile app MVP ₱120,000–₱350,000, UI/UX audit ₱25,000, Monthly retainer ₱35,000/mo
• Features: "Agile 2-week sprints", "Dedicated account manager", "Source code ownership", "Post-launch support 90 days", "ISO 27001-aligned security"
• Stats examples: "47 products shipped | 3 years average client tenure | 100% on-time delivery rate"
• About: founding team from local startups / outsourcing background, pivoted to product-led work, based in BGC or Ortigas
• Testimonials: CTOs or founders citing specific outcomes (revenue growth, app store rating, launch timeline)`,
  portfolio: `NICHE CONTEXT — Creative Portfolio / Photography / Design Studio:
• Service ideas: Brand identity package ₱35,000, Commercial photography ₱18,000/day, Video production ₱85,000, Retainer ₱25,000/mo
• Features: "2-week brand delivery", "Unlimited revisions (3 rounds)", "Raw files included", "Licensing options available", "Rush 72hr turnaround"
• Stats examples: "85 brands launched | 12 industry awards | 6 years in the industry"
• About: solo founder or small studio, specific design philosophy, named clients or industry verticals
• Testimonials: brand owners describing the transformation, not just "great work"`,
  interior: `NICHE CONTEXT — Interior Design / Architecture / Home:
• Service ideas: Full condo fit-out ₱180,000–₱450,000, Space planning ₱35,000, FF&E sourcing ₱55,000, Commercial fit-out per sqm ₱15,000–₱28,000
• Features: "3D visualization included", "Material sourcing local + imported", "Project management end-to-end", "6-year contractor relationships", "Post-move-in adjustments"
• Stats examples: "62 projects delivered | ₱2.3M average project value | 3-month avg turnaround"
• About: lead designer's background (UP Architecture, De La Salle, or international), specific design philosophy (Japandi, tropical modern, etc.)
• Testimonials: homeowners citing specific rooms, the stress-free process, or the 3D visualization that helped them commit`,
  health: `NICHE CONTEXT — Fitness / Gym / Wellness:
• Service ideas: Monthly unlimited membership ₱2,800, 10-session PT package ₱12,000, Drop-in class ₱450, Nutrition consult ₱1,800
• Features: "NSCA-certified trainers", "Programming for beginners to competitive athletes", "Nutrition coaching add-on", "Online training available", "Free trial class"
• Stats examples: "320 active members | 8 certified coaches | 18 classes weekly"
• About: founder's fitness journey (competitive athlete, recovering from injury, changed careers), community-first mission
• Testimonials: members citing specific fitness milestones, weight loss numbers, or the coach's programming`,
  events: `NICHE CONTEXT — Events / Wedding / Celebrations:
• Service ideas: Intimate wedding package ₱85,000 (50 pax), Full production wedding ₱350,000–₱800,000, Corporate event ₱45,000/day, Debut package ₱65,000
• Features: "In-house florals + styling", "Venue sourcing & negotiation", "Day-of coordination team", "Timeline down to 15-minute blocks", "Post-event album add-on"
• Stats examples: "140 weddings coordinated | 4.9 avg client rating | 6 preferred vendor partners"
• About: lead coordinator's background (started as stylist, moved to planning), specific wedding aesthetic specialties (garden, beach, intimate civil)
• Testimonials: couples citing specific moments that were saved by the coordinator, not just "perfect day"`,
};

// ─── Per-plan user prompt ─────────────────────────────────────────────────────
function buildUserPrompt(userPrompt: string, plan: Plan, category = "general", categoryPhotos?: string[]): string {
  const tier = plan as string;

  const planBlock =
    tier === "ENTERPRISE"
      ? `PLAN: ENTERPRISE — Full premium marketing/commerce site. Include products, pricing, gallery, team, process sections as appropriate. Business management dashboard (CRM, orders, analytics) is auto-injected by the platform after generation — do NOT generate dashboard sections.`
      : tier === "PRO"
      ? `PLAN: PRO — Full premium marketing/commerce site. Include product grids, pricing tables, gallery, team, and process sections. Include Hitpay & Paymongo payment links in product/pricing descriptions.`
      : `PLAN: FREE — Polished landing page or portfolio. Sections ONLY: nav, hero, features, about, testimonials, stats, contact, newsletter, cta, footer. STRICTLY NO products (type "products") or pricing tables.`;

  const styleHint = STYLE_DIRECTIONS[Math.floor(Math.random() * STYLE_DIRECTIONS.length)];
  const layoutHint = SECTION_LAYOUT_VARIANTS[Math.floor(Math.random() * SECTION_LAYOUT_VARIANTS.length)];
  const heroHint = HERO_COMPOSITIONS[Math.floor(Math.random() * HERO_COMPOSITIONS.length)];
  const variantSeed = Math.random().toString(36).slice(2, 10);
  const timestamp = Date.now().toString(36);

  const suggestedBg = PROFESSIONAL_PALETTES[Math.floor(Math.random() * PROFESSIONAL_PALETTES.length)].background;
  // Richer set of brand-appropriate accent options (now allowed by updated color sanitizer)
  const suggestedAccents = ["#1E40AF","#0F172A","#166534","#7F1D1D","#1A1714","#2B2A28","#0D7377","#1B4332","#374151","#1C1917","#0C4A6E","#4A1942","#064E3B","#450A0A"];
  const suggestedAccent = suggestedAccents[Math.floor(Math.random() * suggestedAccents.length)];

  const photos = categoryPhotos ?? getCategoryPhotos(category, 24);
  const photoHint = photos.map((id) => `• ${id}`).join("\n");

  // Niche imaging directive
  const nicheImageDir: Record<string, string> = {
    footwear:   "Shoe & leather goods photography ONLY: product flat-lays on marble/concrete, close-up stitching/welt detail, lifestyle worn shots on editorial surfaces, cobbler workshop scenes.",
    jewelry:    "Jewelry photography ONLY: macro ring/necklace shots on marble surfaces, model wrist/neck editorial shots, gemstone close-ups, velvet presentation boxes.",
    coffee:     "Cafe & coffee photography ONLY: espresso extraction, latte art, barista hands at work, cafe interior ambiance, pastry close-ups, beans on rustic surfaces.",
    restaurant: "Upscale restaurant photography ONLY: artfully plated dishes, dining room ambiance, chef at pass, ingredient preparation, wine/cocktail close-ups.",
    fashion:    "Fashion editorial photography ONLY: model lookbook shots, styled flat-lays, fabric texture close-ups, studio lighting setups, street style editorial.",
    beauty:     "Beauty & wellness photography ONLY: skincare products on clean surfaces, treatment room interior, model close-up skin/hair, spa atmosphere, product texture shots.",
    tech:       "Tech workspace photography ONLY: dual-monitor developer setups, focused programmer close-ups, modern office environments, UI on screen, server/hardware details.",
    portfolio:  "Creative studio photography ONLY: camera equipment, printing/finishing craft, designer at work, mood boards pinned to wall, editorial production scenes.",
    interior:   "Interior design photography ONLY: beautifully lit room scenes, furniture vignettes, architectural exteriors, lifestyle home, material texture close-ups.",
    health:     "Fitness & wellness photography ONLY: gym equipment, athletes in motion, yoga poses in clean spaces, nutrition flat-lays, active lifestyle outdoor shots.",
    events:     "Events & celebration photography ONLY: floral arrangements, venue decor, couple editorial, reception ambiance, wedding detail shots (rings, cake, table).",
    general:    "Professional business photography matching the specific niche. Avoid generic stock — find shots that show the actual product, service, or environment.",
  };
  const nicheDirective = nicheImageDir[category] || nicheImageDir.general;
  const nicheHints = NICHE_CONTENT_HINTS[category] || "";

  return `TASK: Generate a unique, premium, complete website for this specific business:

"${userPrompt}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${planBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERATION FINGERPRINT (each generation must be unique):
Seed: ${variantSeed} | Time: ${timestamp}
This is a FRESH generation. If you generated a similar business before, this site MUST use completely different: business name, copy, section order, color mode, imagery, typography treatment, and brand story.

MANDATORY DESIGN DIRECTION:
• Visual style: ${styleHint}
• Section sequence: ${layoutHint}
• Hero composition: ${heroHint}
• Palette: background ${suggestedBg} | accent ${suggestedAccent} (choose the nearest approved values)
• Color mode: decide LIGHT vs DARK based on what suits this specific business's personality

${nicheHints ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${nicheHints}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : ""}

PHOTOGRAPHY DIRECTION:
${nicheDirective}

APPROVED PHOTO IDs — USE ONLY THESE 24 IDs (post-processor rejects any other ID):
${photoHint}

Image format:
• Hero: https://images.unsplash.com/photo-{ID}?w=1400&h=800&fit=crop&q=80
• About/feature image: ?w=1000&h=750&fit=crop&q=80
• Products / gallery / team: ?w=600&h=600&fit=crop&q=80
• Testimonial avatars: ?w=100&h=100&fit=crop&q=80
• Hero = ID #1 | About = ID #2 | Products = IDs #3–#10 | Team/gallery = IDs #11–#20 | Avatars = IDs #21–#24
• ZERO repeated IDs within a single site.

COPY RULES:
• Invent a specific Filipino brand name matching the niche (not "Premium Shop PH" or "Quality Goods")
• Location: one specific Metro Manila or Visayas neighborhood (BGC, Salcedo, Poblacion, Makati CBD, Lahug Cebu, IT Park, Smallville Iloilo — rotate, never BGC every time)
• Filipino names for testimonials: use less-common names (Carmela, Rodrigo, Jasper, Leonora, Renz, Corazon, Benedict, Maricris) — NOT Maria Santos or Juan dela Cruz
• Prices in ₱ matching Metro Manila market rates for this niche (see niche context above)
• Stats: concrete numbers matching a real business at this scale
• Hero headline: 5–10 words, specific, powerful — avoid "Your vision, our craft" type fillers
• About body: 3 short paragraphs with a real founding story, specific details, a person's name

COMPLETENESS CHECKLIST — every section MUST pass before output:
□ hero: headline + sub + backgroundImage + ctaPrimary (label + href)
□ about: heading + body (3 paragraphs) + image + ctaPrimary
□ features: heading + sub + 4–6 items each with title + description (15+ words)
□ testimonials: 3–4 items each with name + role + quote (20+ words) + image
□ stats: heading + sub + 3–5 items each with value + label
□ products/pricing: every item has name + price + description
□ process: heading + 3–5 steps each with title + description
□ faq: heading + 4+ Q&A pairs
□ footer: tagline + address + phone + 3 link columns

Output ONLY the JSON object. No markdown. No explanation.`;
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

  // Pre-compute the photo pool for this generation (24 IDs, rotating offset).
  // The SAME list is injected into the prompt AND used by the post-processor to
  // validate/replace images — guaranteeing every photo comes from the approved
  // rotating set, not the AI's training-data "known" Unsplash URLs.
  const thisGenerationPhotos = getCategoryPhotos(category, 24);

  if (process.env.MOCK_MODE === "true") {
    console.log("[MOCK MODE] Returning mock website data");
    await new Promise((r) => setTimeout(r, 2000));
    return {
      website: postProcess(MOCK_WEBSITE_JSON as unknown as GeneratedWebsite, plan as string, category, thisGenerationPhotos),
      usage: { inputTokens: 0, outputTokens: 0, model: "mock", costUsd: 0, costPhp: 0 },
    };
  }

  const tier = plan as string;
  const model = "claude-opus-4-7";

  const message = await client.messages.create({
    model,
    max_tokens: 16000,
    temperature: 1,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(userPrompt, plan, category, thisGenerationPhotos) }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type from AI provider");

  // Strip any accidental markdown fences
  let jsonText = content.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let website: GeneratedWebsite;
  try {
    website = JSON.parse(jsonText);
  } catch {
    throw new Error("AI provider returned invalid JSON. Please try again.");
  }

  // Post-process with the pre-computed photo list so the approved-ID enforcement
  // in sanitizeImages() uses exactly the IDs we told the AI to use.
  website = postProcess(website, tier, category, thisGenerationPhotos);

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const { usd, php } = calculateTokenCost(inputTokens, outputTokens, model);

  return {
    website,
    usage: { inputTokens, outputTokens, model, costUsd: usd, costPhp: php },
  };
}
