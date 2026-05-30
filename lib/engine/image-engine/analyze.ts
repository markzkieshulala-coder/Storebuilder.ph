import crypto from "node:crypto";
import { BrandContext, WebsiteAnalysis, VisualMode } from "./types";

const NICHES: Array<{ name: string; terms: string[]; audience: string; tone: string; palette: string[]; mode: VisualMode }> = [
  {
    name: "SaaS / B2B software",
    terms: ["saas", "software", "platform", "dashboard", "workflow", "automation", "productivity", "b2b", "api", "developer tool", "analytics"],
    audience: "professionals evaluating software and operational tools",
    tone: "clear, modern, trustworthy",
    palette: ["#0F172A", "#2563EB", "#06B6D4", "#E2E8F0"],
    mode: "ui-composite",
  },
  {
    name: "Fintech",
    terms: ["fintech", "finance", "banking", "investment", "payments", "trading", "wealth", "crypto", "loan", "credit"],
    audience: "financial decision-makers and consumers handling money",
    tone: "credible, premium, precise",
    palette: ["#0B1F3A", "#1D4ED8", "#14B8A6", "#F8FAFC"],
    mode: "ui-composite",
  },
  {
    name: "Healthcare",
    terms: ["health", "healthcare", "medical", "clinic", "doctor", "patient", "wellness", "therapy", "telehealth", "pharmacy"],
    audience: "patients, providers, and administrators",
    tone: "calm, reassuring, human",
    palette: ["#0F766E", "#0EA5E9", "#E0F2FE", "#F8FAFC"],
    mode: "photorealistic",
  },
  {
    name: "E-commerce / retail",
    terms: ["shop", "store", "ecommerce", "retail", "product", "catalog", "checkout", "shopping", "brand launch"],
    audience: "online shoppers and retail buyers",
    tone: "polished, conversion-focused, bright",
    palette: ["#111827", "#F97316", "#FDE68A", "#FFF7ED"],
    mode: "photorealistic",
  },
  {
    name: "Travel / hospitality",
    terms: ["travel", "hotel", "resort", "hospitality", "tourism", "adventure", "tour", "vacation", "booking"],
    audience: "travel planners and guests",
    tone: "aspirational, immersive, inviting",
    palette: ["#0EA5E9", "#38BDF8", "#FDE68A", "#FFFFFF"],
    mode: "photorealistic",
  },
  {
    name: "Real estate",
    terms: ["real estate", "property", "home", "apartment", "house", "listing", "broker", "realtor", "mortgage"],
    audience: "buyers, sellers, and property investors",
    tone: "professional, spacious, premium",
    palette: ["#1F2937", "#7C3AED", "#EDE9FE", "#F8FAFC"],
    mode: "photorealistic",
  },
  {
    name: "Fashion / beauty",
    terms: ["fashion", "beauty", "skincare", "cosmetics", "luxury", "style", "makeup", "salon", "wellness brand"],
    audience: "style-conscious consumers",
    tone: "editorial, tactile, aspirational",
    palette: ["#111111", "#D4AF37", "#F5E6E8", "#FAFAFA"],
    mode: "editorial",
  },
  {
    name: "Food / beverage",
    terms: ["restaurant", "cafe", "food", "beverage", "coffee", "tea", "bakery", "dining", "menu", "recipe"],
    audience: "diners and food enthusiasts",
    tone: "warm, sensory, appetizing",
    palette: ["#92400E", "#EA580C", "#FDE68A", "#FFFBEB"],
    mode: "photorealistic",
  },
  {
    name: "Fitness / wellness",
    terms: ["fitness", "gym", "workout", "training", "running", "sports", "health club", "wellness app"],
    audience: "active consumers and wellness seekers",
    tone: "energetic, motivating, clean",
    palette: ["#0F172A", "#22C55E", "#A7F3D0", "#F8FAFC"],
    mode: "photorealistic",
  },
  {
    name: "Creative / agency",
    terms: ["agency", "creative", "branding", "studio", "design", "portfolio", "marketing", "content"],
    audience: "clients seeking creative services",
    tone: "bold, differentiated, design-forward",
    palette: ["#111827", "#8B5CF6", "#EC4899", "#F9FAFB"],
    mode: "abstract",
  },
];

const STYLE_TERMS: Record<string, string[]> = {
  minimal: ["minimal", "clean", "simple", "airy", "spacious", "plain"],
  luxury: ["luxury", "premium", "high-end", "elegant", "refined", "sophisticated"],
  playful: ["playful", "fun", "friendly", "whimsical", "cheerful", "approachable"],
  bold: ["bold", "vibrant", "dramatic", "heroic", "striking", "high contrast"],
  organic: ["organic", "earthy", "natural", "sustainable", "eco", "soft"],
  futuristic: ["futuristic", "tech-forward", "neon", "cyber", "advanced", "innovative"],
  editorial: ["editorial", "magazine", "fashion", "art-directed", "premium photography"],
  corporate: ["corporate", "enterprise", "professional", "business", "trustworthy", "reliable"],
};

const MODE_KEYWORDS: Array<{ mode: VisualMode; terms: string[] }> = [
  { mode: "ui-composite", terms: ["dashboard", "interface", "ui", "screen", "product mockup", "app"] },
  { mode: "illustration", terms: ["illustration", "vector", "icon", "drawing", "flat art"] },
  { mode: "3d-render", terms: ["3d", "render", "isometric", "glossy", "product render"] },
  { mode: "abstract", terms: ["abstract", "shape", "gradient", "background", "texture"] },
  { mode: "editorial", terms: ["editorial", "magazine", "luxury", "fashion", "portrait"] },
  { mode: "photorealistic", terms: ["photo", "photorealistic", "realistic", "lifestyle", "cinematic"] },
];

const COMPOSITION_NOTES = [
  "leave clear negative space for website copy",
  "compose for a landing page hero section",
  "avoid clutter and overly busy backgrounds",
  "use a single strong focal point",
  "make the image feel bespoke rather than templated",
  "ensure the scene reads well at modern website widths",
];

const VISUAL_REQUIREMENT_TERMS = [
  "hero", "banner", "thumbnail", "card", "background", "illustration", "mockup", "infographic", "product shot",
  "lifestyle scene", "abstract backdrop", "feature visual", "editorial image", "custom visual", "visual system"
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s/-]+/g, " ").replace(/\s+/g, " ").trim();
}

function pickWithHighestScore(text: string) {
  let best = NICHES[0];
  let bestScore = 0;
  for (const niche of NICHES) {
    const score = niche.terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
    if (score > bestScore) {
      best = niche;
      bestScore = score;
    }
  }
  return { niche: best, score: bestScore };
}

function detectStyleKeywords(text: string): string[] {
  const result: string[] = [];
  for (const [style, terms] of Object.entries(STYLE_TERMS)) {
    if (terms.some((term) => text.includes(term))) result.push(style);
  }
  return result.length > 0 ? result : ["modern"];
}

function detectVisualMode(text: string, nicheMode: VisualMode): VisualMode {
  for (const mapping of MODE_KEYWORDS) {
    if (mapping.terms.some((term) => text.includes(term))) {
      return mapping.mode;
    }
  }
  return nicheMode;
}

function detectAudience(text: string, nicheAudience: string, brand?: BrandContext): string {
  if (brand?.audience?.trim()) return brand.audience.trim();
  const audienceHints: Array<[string, string]> = [
    ["enterprise", "enterprise buyers and decision-makers"],
    ["consumer", "end consumers"],
    ["patients", "patients and providers"],
    ["founders", "founders and operators"],
    ["developers", "developers and technical teams"],
    ["students", "students and educators"],
  ];
  for (const [term, audience] of audienceHints) {
    if (text.includes(term)) return audience;
  }
  return nicheAudience;
}

function extractColorHints(text: string, brand?: BrandContext): string[] {
  const colors = brand?.colors?.filter(Boolean) ?? [];
  const colorHints = [
    ["blue", "blue"],
    ["teal", "teal"],
    ["green", "green"],
    ["orange", "orange"],
    ["red", "red"],
    ["purple", "purple"],
    ["black", "black"],
    ["white", "white"],
    ["neutral", "neutral"],
    ["earthy", "earthy"],
    ["warm", "warm"],
    ["cool", "cool"],
  ] as const;
  for (const [term, label] of colorHints) {
    if (text.includes(term) && !colors.includes(label)) colors.push(label);
  }
  return colors;
}

function extractConstraints(text: string): string[] {
  const constraints: string[] = [];
  for (const term of VISUAL_REQUIREMENT_TERMS) {
    if (text.includes(term)) constraints.push(`explicit request: ${term}`);
  }
  if (text.includes("no stock")) constraints.push("avoid stock-photo aesthetics");
  if (text.includes("original")) constraints.push("must feel original and bespoke");
  if (text.includes("not repetitive")) constraints.push("avoid repetitive compositions");
  if (text.includes("unique")) constraints.push("generate unique variations");
  if (text.includes("high quality") || text.includes("real")) constraints.push("prioritize realism and quality");
  return constraints;
}

function computeTone(text: string, nicheTone: string, brand?: BrandContext): string {
  if (brand?.tone?.trim()) return brand.tone.trim();
  if (text.includes("luxury") || text.includes("premium")) return "premium and polished";
  if (text.includes("friendly") || text.includes("approachable")) return "friendly and approachable";
  if (text.includes("technical") || text.includes("developer")) return "technical and precise";
  if (text.includes("modern")) return "modern and clean";
  return nicheTone;
}

function keywordTokens(text: string): string[] {
  const normalized = normalize(text);
  const words = normalized.split(/\s+/).filter((word) => word.length > 3);
  const stopwords = new Set(["with", "that", "this", "from", "into", "your", "their", "about", "based", "using", "create", "images", "image", "website", "prompt", "style", "brand", "niche"]);
  const tokens = words.filter((word) => !stopwords.has(word));
  return Array.from(new Set(tokens)).slice(0, 12);
}

function compositionNotes(text: string, niche: string): string[] {
  const notes = [...COMPOSITION_NOTES];
  if (text.includes("hero")) notes.push("optimize for a hero section with impactful framing");
  if (text.includes("card")) notes.push("crop-safe composition for cards and thumbnails");
  if (text.includes("background")) notes.push("keep visual density lower for background usage");
  if (text.includes("ui") || niche.includes("software") || niche.includes("fintech")) notes.push("make room for interface overlays or product copy");
  if (text.includes("lifestyle")) notes.push("use authentic, candid pose and environment details");
  return Array.from(new Set(notes));
}

function detectNicheAndMode(text: string, brand?: BrandContext) {
  const match = pickWithHighestScore(text);
  const nicheMode = detectVisualMode(text, match.niche.mode);
  const styleKeywords = detectStyleKeywords(text);
  const audience = detectAudience(text, match.niche.audience, brand);
  const tone = computeTone(text, match.niche.tone, brand);
  const palette = extractColorHints(text, brand);
  const constraints = extractConstraints(text);
  const tokenList = keywordTokens(text);

  return {
    niche: match.niche.name,
    nicheConfidence: Math.min(0.95, 0.3 + match.score * 0.12),
    primaryAudience: audience,
    tone,
    styleKeywords,
    visualMode: nicheMode,
    colorPalette: palette.length > 0 ? palette : match.niche.palette,
    compositionNotes: compositionNotes(text, match.niche.name),
    contentTokens: tokenList,
    visualConstraints: constraints,
  } satisfies WebsiteAnalysis;
}

function hashText(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function analyzeWebsitePrompt(websitePrompt: string, brand?: BrandContext): WebsiteAnalysis {
  const normalized = normalize(websitePrompt);
  return detectNicheAndMode(normalized, brand);
}

export function buildAnalysisSummary(analysis: WebsiteAnalysis): string {
  return [
    `niche: ${analysis.niche}`,
    `audience: ${analysis.primaryAudience}`,
    `tone: ${analysis.tone}`,
    `styles: ${analysis.styleKeywords.join(", ")}`,
    `mode: ${analysis.visualMode}`,
    `palette: ${analysis.colorPalette.join(", ")}`,
  ].join(" | ");
}

export function promptFingerprint(input: string): string {
  return hashText(normalize(input));
}

export function buildPromptSeedTokens(analysis: WebsiteAnalysis, prompt: string, brand?: BrandContext): string[] {
  const tokens = new Set<string>();
  for (const token of analysis.contentTokens) tokens.add(token);
  for (const style of analysis.styleKeywords) tokens.add(style);
  if (brand?.name) tokens.add(brand.name);
  if (brand?.description) {
    normalize(brand.description)
      .split(" ")
      .filter((part) => part.length > 4)
      .slice(0, 6)
      .forEach((part) => tokens.add(part));
  }
  normalize(prompt)
    .split(" ")
    .filter((part) => part.length > 4)
    .slice(0, 8)
    .forEach((part) => tokens.add(part));
  return Array.from(tokens);
}

export function stableHashToNumber(value: string): number {
  const hex = hashText(value).slice(0, 12);
  return Number.parseInt(hex, 16) || 0;
}
