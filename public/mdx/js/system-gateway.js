/**
 * system-gateway.js — Unified Website System Generator Controller
 *
 * Pipeline:
 *   1. ArchitecturePlanner   — maps the prompt into a multi-page site spec
 *   2. ImagePromptBuilder    — writes image prompts per section
 *   3. /api/generate         — Storebuilder.ph backend compiles + persists
 *
 * All intelligence runs client-side; only the final compile+persist step
 * hits the server so zero extra API cost is added.
 */

/* ─── ArchitecturePlanner ──────────────────────────────────────────────────── */

const INDUSTRY_MAP = {
  fashion:       { label: "Fashion & Apparel",  pages: ["Collection", "Lookbook", "About", "Contact"] },
  jewelry:       { label: "Fine Jewelry",        pages: ["Collection", "Atelier", "About", "Contact"] },
  interiors:     { label: "Interiors & Design",  pages: ["Portfolio", "Services", "About", "Contact"] },
  wellness:      { label: "Wellness & Beauty",   pages: ["Services", "Rituals", "About", "Contact"] },
  food:          { label: "Food & Hospitality",  pages: ["Menu", "Reservations", "About", "Contact"] },
  tech:          { label: "Technology & SaaS",   pages: ["Features", "Pricing", "About", "Contact"] },
  automotive:    { label: "Automotive",          pages: ["Showroom", "Models", "About", "Contact"] },
  art:           { label: "Art & Creative",      pages: ["Gallery", "Process", "About", "Contact"] },
  professional:  { label: "Professional Services", pages: ["Services", "Case Studies", "About", "Contact"] },
  default:       { label: "Business",            pages: ["Services", "Work", "About", "Contact"] },
};

const TONE_PALETTES = {
  luxury:   { primary: "#0B0B0C", accent: "#C9A96E", bg: "#F8F6F1", text: "#1A1A1A", muted: "#6B6B6B" },
  minimal:  { primary: "#111111", accent: "#4A4A4A", bg: "#FFFFFF", text: "#111111", muted: "#888888" },
  bold:     { primary: "#0D0D2B", accent: "#FF3F5B", bg: "#FFFFFF", text: "#0D0D2B", muted: "#5A5A7A" },
  warm:     { primary: "#2C1810", accent: "#D4833A", bg: "#FDF8F0", text: "#2C1810", muted: "#8B6B55" },
  modern:   { primary: "#0F172A", accent: "#6366F1", bg: "#FFFFFF", text: "#0F172A", muted: "#64748B" },
  timeless: { primary: "#1C1917", accent: "#A8896C", bg: "#FAFAF8", text: "#1C1917", muted: "#78716C" },
};

function detectIndustry(prompt) {
  const p = prompt.toLowerCase();
  if (/fashion|apparel|cloth|wear|dress|style|couture/.test(p)) return "fashion";
  if (/jewel|ring|necklace|diamond|gem|atelier/.test(p)) return "jewelry";
  if (/interior|design|architect|decor|furnish|space/.test(p)) return "interiors";
  if (/wellness|spa|beauty|salon|skincare|yoga|meditat/.test(p)) return "wellness";
  if (/food|restaurant|cafe|kitchen|cuisine|dining|chef/.test(p)) return "food";
  if (/tech|saas|software|platform|app|startup|digital/.test(p)) return "tech";
  if (/auto|car|vehicle|motor|drive/.test(p)) return "automotive";
  if (/art|gallery|creative|studio|photograph|film/.test(p)) return "art";
  if (/consult|law|finance|accounting|professional|firm/.test(p)) return "professional";
  return "default";
}

function detectTone(prompt) {
  const p = prompt.toLowerCase();
  if (/luxury|premium|haute|bespoke|exclusive|artisan|curator/.test(p)) return "luxury";
  if (/minimal|clean|simple|sleek|pure|understated/.test(p)) return "minimal";
  if (/bold|dynamic|vibrant|disrupt|edge/.test(p)) return "bold";
  if (/warm|cozy|comfort|welcom|homey|rustic/.test(p)) return "warm";
  if (/modern|innovative|cutting.edge|next.gen|future/.test(p)) return "modern";
  return "timeless";
}

function extractBusinessName(prompt) {
  const patterns = [
    /(?:called|named)\s+["']?([A-Z][A-Za-z0-9\s&'.]{2,40})["']?/,
    /(?:brand|business|store|shop)\s+(?:name\s*)?[:\-]\s*["']?([A-Z][A-Za-z0-9\s&'.]{2,40})["']?/,
    /(?:for\s+)["']?([A-Z][A-Za-z][A-Za-z0-9\s&'.]{1,30})["']?(?:\s*,|\s+(?:a|an|the|website|brand))/,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1]) return m[1].trim().replace(/['"]+/g, "").slice(0, 60);
  }
  const cap = prompt.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
  if (cap?.[1] && cap[1].length > 2 && !["Create","Make","Build","Generate","Design","A","An","The"].includes(cap[1])) {
    return cap[1].slice(0, 40);
  }
  return "My Brand";
}

function planArchitecture(prompt) {
  const industry = detectIndustry(prompt);
  const tone = detectTone(prompt);
  const cfg = INDUSTRY_MAP[industry];
  const palette = TONE_PALETTES[tone];
  const businessName = extractBusinessName(prompt);

  const routes = ["/", ...cfg.pages.map(p => `/${p.toLowerCase().replace(/\s+/g, "-")}`)];
  const pages = cfg.pages.map((label, i) => ({
    route: routes[i + 1],
    label,
    sections: buildSections(industry, label),
  }));
  // Home is always first
  pages.unshift({
    route: "/",
    label: "Home",
    sections: ["Hero", "Features", cfg.pages[0], "Testimonials"],
  });

  return { businessName, industry: cfg.label, tone, palette, pages, routes };
}

function buildSections(industry, pageLabel) {
  const map = {
    Collection: ["Product Grid", "Product Detail", "Care Guide"],
    Lookbook:   ["Editorial Images", "Seasonal Story", "Shop This Look"],
    Services:   ["Service Cards", "Process Steps", "Packages"],
    Portfolio:  ["Project Gallery", "Case Study", "Results"],
    Menu:       ["Menu Categories", "Signature Dishes", "Seasonal Specials"],
    Reservations: ["Booking Form", "Private Events", "FAQ"],
    Features:   ["Feature Grid", "Comparison Table", "Integrations"],
    Pricing:    ["Plan Cards", "Feature Comparison", "Enterprise CTA"],
    About:      ["Brand Story", "Team", "Values"],
    Contact:    ["Contact Form", "Location", "Response Promise"],
    Gallery:    ["Masonry Grid", "Exhibition Info", "Artist Statement"],
    Showroom:   ["Model Cards", "Configurator CTA", "Test Drive"],
  };
  return map[pageLabel] || ["Content Section", "CTA"];
}

/* ─── ImagePromptBuilder ───────────────────────────────────────────────────── */

function buildImagePrompts(architecture, userPrompt) {
  const { businessName, industry, tone } = architecture;

  const styleGuide = {
    luxury:   "cinematic studio photography, dramatic chiaroscuro lighting, rich textures, editorial composition, 8K detail",
    minimal:  "clean flat lay, soft natural light, white negative space, precise alignment, editorial minimalism",
    bold:     "high contrast vibrant commercial photography, dynamic angles, punchy color grading",
    warm:     "golden hour natural light, warm tones, intimate atmosphere, lifestyle photography",
    modern:   "clean architectural photography, cool tones, geometric composition, professional product photography",
    timeless: "classic studio photography, neutral tones, balanced composition, timeless elegance",
  }[tone] || "professional photography, clean composition";

  return architecture.pages.flatMap(page =>
    page.sections.map(section => ({
      page: page.label,
      section,
      prompt: `${businessName} — ${section} — ${industry} brand — ${styleGuide} — shot for ${page.label} page hero — no text overlays, no watermarks, high resolution`,
    }))
  );
}

/* ─── SiteSpec Builder ─────────────────────────────────────────────────────── */

function buildSiteSpec(architecture, imagePrompts) {
  const { businessName, industry, tone, palette, pages } = architecture;
  return {
    businessName,
    industry,
    tone,
    colors: palette,
    typography: {
      heading: tone === "luxury" ? "'Playfair Display', Georgia, serif" : "'Inter', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
      scale: { hero: "clamp(3rem,7vw,6rem)", h1: "clamp(2rem,4vw,3.5rem)", h2: "clamp(1.5rem,3vw,2.5rem)" },
    },
    pages: pages.map(p => ({
      route: p.route,
      label: p.label,
      sections: p.sections,
      imageAssets: imagePrompts.filter(ip => ip.page === p.label),
    })),
    generatedAt: new Date().toISOString(),
    version: "2.0",
  };
}

/* ─── GatewayConnector — event system ─────────────────────────────────────── */

class EventBus {
  constructor() { this._listeners = {}; }
  on(event, fn) { (this._listeners[event] = this._listeners[event] || []).push(fn); return this; }
  emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }
}

/* ─── Main GatewayConnector ────────────────────────────────────────────────── */

export class SystemGateway extends EventBus {
  constructor(options = {}) {
    super();
    this.apiBase = options.apiBase || "";
    this.authToken = options.authToken || null;
  }

  /**
   * Full pipeline: PLAN → IMAGE_PROMPTS → SPEC → COMPILE → PERSIST
   */
  async generateWebsiteSystem(prompt, options = {}) {
    const startTime = Date.now();
    this.emit("pipeline:start", { prompt });

    try {
      // Stage 1 — ArchitecturePlanner
      this.emit("pipeline:stage", { stage: "PLAN", message: "Planning multi-page architecture..." });
      const architecture = planArchitecture(prompt);
      this.emit("pipeline:result", { stage: "PLAN", data: architecture });

      // Stage 2 — ImagePromptBuilder
      this.emit("pipeline:stage", { stage: "PROMPTS", message: "Generating image prompts per section..." });
      const imagePrompts = buildImagePrompts(architecture, prompt);
      this.emit("pipeline:result", { stage: "PROMPTS", data: imagePrompts });

      // Stage 3 — StrictSpec
      this.emit("pipeline:stage", { stage: "SPEC", message: "Compiling site specification..." });
      const siteSpec = buildSiteSpec(architecture, imagePrompts);
      this.emit("pipeline:result", { stage: "SPEC", data: siteSpec });

      // Stage 4 — Compile + Persist via Storebuilder API
      this.emit("pipeline:stage", { stage: "COMPILE", message: "Compiling & persisting website..." });
      const compiledSite = await this._callGenerateAPI(prompt, siteSpec, options);
      this.emit("pipeline:result", { stage: "COMPILE", data: compiledSite });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const result = { architecture, imagePrompts, siteSpec, compiledSite, elapsed };
      this.emit("pipeline:complete", result);
      return result;

    } catch (err) {
      this.emit("pipeline:error", { message: err.message, stage: err.stage || "UNKNOWN" });
      throw err;
    }
  }

  async _callGenerateAPI(prompt, siteSpec, options) {
    const headers = { "Content-Type": "application/json" };
    if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;

    const body = {
      prompt,
      siteSpec,
      businessName: siteSpec.businessName,
      ...options,
    };

    const res = await fetch(`${this.apiBase}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = new Error(`API error ${res.status}: ${await res.text()}`);
      err.stage = "COMPILE";
      throw err;
    }

    return res.json();
  }

  /** Quick health check */
  async health() {
    try {
      const res = await fetch(`${this.apiBase}/api/generate`, { method: "HEAD" });
      return { ok: res.ok, status: res.status };
    } catch {
      return { ok: false, status: 0 };
    }
  }
}
