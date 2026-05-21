/**
 * ============================================================================
 * NICHE PRESETS — Real niche-specific content used by the generator
 * ============================================================================
 * Each preset provides the concrete tokens the generator needs to produce
 * believable, niche-aware output: product banks, theme palettes, hero copy
 * templates, and image-prompt seeds.
 *
 * The NicheVocabularyEngine handles micro-copy (nav, buttons, labels). This
 * file handles macro-copy (headlines, body, product names, theme tokens).
 */

import type { TypographySpec, ColorPalette, BackgroundLayer } from "../types/SiteBlueprint";

export interface NichePreset {
  /** Canonical niche key used by NICHE_VISUAL_MAP & VOCABULARY_MAP */
  key: string;

  /** Default site/brand name format when none is provided */
  brandFormat: (productHint: string) => string;

  /** Hero copy generator — returns a fully composed hero block */
  hero: (brandName: string, productHint: string) => {
    headline: string;
    subheadline: string;
    badge: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };

  /** Section heading templates keyed by component category */
  sectionHeadings: {
    showcase: string[];
    content: string[];
    conversion: string[];
    interactive: string[];
    footer: string[];
  };

  /** Body copy templates (use {{brand}}, {{verb}}, {{adj}} as tokens) */
  bodyTemplates: string[];

  /** Real product/item names — used to populate showcase/grid items */
  productNames: string[];

  /** Image keyword used to enrich Pollinations prompts (e.g. "NBA basketball jersey") */
  imageKeyword: string;

  /** Theme tokens */
  theme: {
    typography: TypographySpec;
    colors: ColorPalette;
  };

  /** Price tier (PHP) — used by store/showcase components */
  priceRange: [number, number];

  /** Currency symbol */
  currency: string;

  /** Footer copyright tagline */
  copyrightTagline: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// BASKETBALL PRESET
// ─────────────────────────────────────────────────────────────────────────────

const BASKETBALL: NichePreset = {
  key: "basketball",
  brandFormat: (hint) => hint || "Hardwood Authority",
  hero: (brand, hint) => ({
    headline: `Command the Court`,
    subheadline: `From Lakers jerseys to Curry sneakers, every piece in the ${brand} collection is certified authentic, sourced directly from official NBA and Nike partners. Free metro-wide delivery on orders over ₱5,000.`,
    badge: "OFFICIAL NBA RETAILER",
    ctaPrimary: "ENTER THE ARENA",
    ctaSecondary: "BROWSE THE ROSTER",
  }),
  sectionHeadings: {
    showcase: [
      "Top Basketball Gear",
      "The Starting Lineup",
      "Court-Tested Essentials",
      "Authentic Jerseys & Sneakers",
    ],
    content: [
      "Built for the Hardwood",
      "Worn by the Greats",
      "Performance-Engineered",
    ],
    conversion: [
      "Suit Up for the Season",
      "Join the Roster",
      "Lock In Your Locker",
    ],
    interactive: [
      "Player Spotlight",
      "Signature Collection",
    ],
    footer: ["Game Day Ready"],
  },
  bodyTemplates: [
    "Heat-pressed numbers. Dri-FIT mesh. Official on-court silhouette. Every {{brand}} piece is engineered for the hardwood that demands it.",
    "Full-foot Zoom Air cushioning with carbon-fiber propulsion plate. Court-tested explosive responsiveness from the players who define the era.",
    "Embroidered team logos and official NBA holographic tags guarantee authenticity on every {{brand}} drop.",
  ],
  productNames: [
    "Nike Air Jordan 37 High",
    "LeBron James Lakers Jersey",
    "Steph Curry Warriors #30",
    "Kobe Bryant Mamba Edition",
    "Giannis Bucks Authentic Jersey",
    "KD Brooklyn Nets Swingman",
    "Luka Mavericks City Edition",
    "Tatum Celtics Statement Jersey",
    "Air Jordan 1 Retro High OG",
    "Curry Flow 11 Performance",
    "LeBron 21 Court Purple",
    "KD 16 Aunt Pearl",
  ],
  imageKeyword:
    "professional product photography of authentic NBA basketball jersey or Nike basketball sneaker on premium studio backdrop",
  theme: {
    typography: {
      headingFont: "Bebas Neue",
      bodyFont: "Inter",
      accentFont: "JetBrains Mono",
      headingScale: [4.5, 3.25, 2.25, 1.5],
      bodySize: "1rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.5,
      textTransform: "none",
    },
    colors: {
      primary: "#FF4D00",
      secondary: "#0B0B0E",
      accent: "#FFC107",
      surface: "#15151A",
      background: "#0A0A0C",
      textPrimary: "#FFFFFF",
      textSecondary: "#C8C8CC",
      textMuted: "#7A7A82",
      gradients: [
        { from: "#FF4D00", to: "#FFC107", angle: 135 },
        { from: "#0B0B0E", to: "#1F1F26", angle: 180 },
      ],
    },
  },
  priceRange: [2800, 12500],
  currency: "₱",
  copyrightTagline: "Official basketball gear, court-certified authentic.",
};

// ─────────────────────────────────────────────────────────────────────────────
// WATCHMAKING PRESET
// ─────────────────────────────────────────────────────────────────────────────

const WATCHMAKING: NichePreset = {
  key: "watchmaking",
  brandFormat: (hint) => hint || "Atelier Chronos",
  hero: (brand, _hint) => ({
    headline: "Time, Engineered",
    subheadline: `Each ${brand} timepiece is hand-finished in our Geneva atelier, certified by COSC, and accompanied by a master horologist's signed inspection card. Reserve a private viewing.`,
    badge: "SWISS MADE · COSC CERTIFIED",
    ctaPrimary: "ENTER THE ATELIER",
    ctaSecondary: "BOOK A PRIVATE VIEWING",
  }),
  sectionHeadings: {
    showcase: ["The Masterworks Vault", "Hand-Finished Movements", "Heritage Collection"],
    content: ["Geneva-Crafted, Always", "Three Hundred Hours of Craft"],
    conversion: ["Reserve Your Timepiece", "Commission Bespoke"],
    interactive: ["Movement Anatomy", "The Horologist's Bench"],
    footer: ["Maintaining Excellence"],
  },
  bodyTemplates: [
    "Hand-finished perlage and Côtes de Genève striping. {{brand}} timepieces are assembled by a single master across 300+ hours.",
    "Tourbillon escapement, sapphire crystal exhibition caseback, and 18k rose gold rotor — visible craftsmanship in every {{brand}} reference.",
  ],
  productNames: [
    "Heritage Tourbillon 42mm",
    "Perpetual Calendar Moonphase",
    "Marine Chronometer Limited",
    "Atelier Reserve 38mm",
    "Grand Complication Skeleton",
    "Le Brassus Minute Repeater",
  ],
  imageKeyword:
    "luxury Swiss mechanical wristwatch macro photography on polished walnut surface with brass instrument props",
  theme: {
    typography: {
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      accentFont: "Cormorant Garamond",
      headingScale: [4, 3, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "0.02em",
      lineHeight: 1.7,
      textTransform: "none",
    },
    colors: {
      primary: "#C9A961",
      secondary: "#0F0E0C",
      accent: "#F5E6C8",
      surface: "#1A1816",
      background: "#0A0908",
      textPrimary: "#F5F0E6",
      textSecondary: "#B8AE99",
      textMuted: "#6B6356",
      gradients: [
        { from: "#C9A961", to: "#F5E6C8", angle: 135 },
        { from: "#0F0E0C", to: "#1A1816", angle: 180 },
      ],
    },
  },
  priceRange: [85000, 1450000],
  currency: "₱",
  copyrightTagline: "Hand-finished in Geneva. Maintained for generations.",
};

// ─────────────────────────────────────────────────────────────────────────────
// FASHION / APPAREL PRESET
// ─────────────────────────────────────────────────────────────────────────────

const FASHION: NichePreset = {
  key: "fashion",
  brandFormat: (hint) => hint || "Maison Atelier",
  hero: (brand, _hint) => ({
    headline: "Cut From the Season",
    subheadline: `${brand} produces ready-to-wear in capsule drops of 40 pieces each — each silhouette draped, tested, and finished by our atelier seamstresses.`,
    badge: "FALL · WINTER · ATELIER",
    ctaPrimary: "ENTER THE WARDROBE",
    ctaSecondary: "VIEW THE LOOKBOOK",
  }),
  sectionHeadings: {
    showcase: ["The Capsule Drop", "Atelier Edits", "Runway Translations"],
    content: ["Draped, Not Drafted", "Made in 40-Piece Capsules"],
    conversion: ["Reserve The Piece", "Request a Fitting"],
    interactive: ["Lookbook Spread", "The Cutter's Notes"],
    footer: ["Worn Properly"],
  },
  bodyTemplates: [
    "Italian double-face wool. Hand-stitched bound buttonholes. {{brand}} produces no more than 40 of each silhouette.",
    "Each piece passes through three rounds of fitting — toile, muslin, final cloth — before it ever reaches the rack.",
  ],
  productNames: [
    "Double-Breasted Cashmere Coat",
    "Silk Charmeuse Slip Dress",
    "Italian Wool Trouser",
    "Hand-Knit Mohair Sweater",
    "Belted Trench Reissue",
    "Cropped Tuxedo Jacket",
  ],
  imageKeyword:
    "editorial fashion lookbook photography of premium ready-to-wear silhouette on minimalist concrete studio",
  theme: {
    typography: {
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      accentFont: "Italiana",
      headingScale: [4.25, 3, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "0",
      lineHeight: 1.7,
      textTransform: "none",
    },
    colors: {
      primary: "#1A1A1A",
      secondary: "#F5F0EA",
      accent: "#8B5E3C",
      surface: "#FAF7F2",
      background: "#FFFEFB",
      textPrimary: "#1A1A1A",
      textSecondary: "#4A4A4A",
      textMuted: "#8A8A8A",
      gradients: [
        { from: "#F5F0EA", to: "#FAF7F2", angle: 180 },
      ],
    },
  },
  priceRange: [4500, 85000],
  currency: "₱",
  copyrightTagline: "Made in capsules. Worn for years.",
};

// ─────────────────────────────────────────────────────────────────────────────
// RESTAURANT / FOOD PRESET
// ─────────────────────────────────────────────────────────────────────────────

const RESTAURANT: NichePreset = {
  key: "food",
  brandFormat: (hint) => hint || "Tabula Rasa",
  hero: (brand, _hint) => ({
    headline: "Tasting Menu, Reimagined",
    subheadline: `${brand} runs a single seating each evening — ten courses, twelve guests, one open kitchen. Reservations open four weeks in advance.`,
    badge: "ONE SEATING · TEN COURSES",
    ctaPrimary: "RESERVE A TABLE",
    ctaSecondary: "VIEW THE TASTING MENU",
  }),
  sectionHeadings: {
    showcase: ["Tonight's Plates", "The Open Kitchen", "Signature Courses"],
    content: ["Sourced Within 50km", "From the Brigade"],
    conversion: ["Book a Seating", "Join the Waitlist"],
    interactive: ["Wine Pairing Notes", "The Pass"],
    footer: ["From Our Brigade"],
  },
  bodyTemplates: [
    "Aged miso, charred leek, smoked beef tendon. {{brand}}'s ten-course progression is rewritten every twenty-eight days.",
    "Producers within fifty kilometers. Foraged ingredients. A wine list curated by Master Sommelier Ana Reyes.",
  ],
  productNames: [
    "Smoked Wagyu Tartare",
    "Charred Leek Beurre Blanc",
    "Aged Miso Black Cod",
    "Foraged Mushroom Consommé",
    "Hand-Cut Tagliatelle al Tartufo",
    "Pressed Duck à l'Orange",
  ],
  imageKeyword:
    "fine dining tasting menu plated course photography with shallow depth of field on dark slate surface",
  theme: {
    typography: {
      headingFont: "Playfair Display",
      bodyFont: "Inter",
      accentFont: "Italiana",
      headingScale: [4, 2.75, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "0.01em",
      lineHeight: 1.7,
      textTransform: "none",
    },
    colors: {
      primary: "#8B2E2E",
      secondary: "#1C1410",
      accent: "#D4A574",
      surface: "#26201B",
      background: "#15100C",
      textPrimary: "#F5EBD9",
      textSecondary: "#C8B89A",
      textMuted: "#7A6E5A",
      gradients: [
        { from: "#8B2E2E", to: "#D4A574", angle: 135 },
        { from: "#15100C", to: "#26201B", angle: 180 },
      ],
    },
  },
  priceRange: [4800, 12500],
  currency: "₱",
  copyrightTagline: "One seating. Ten courses. Twelve guests.",
};

// ─────────────────────────────────────────────────────────────────────────────
// SALON / BEAUTY PRESET
// ─────────────────────────────────────────────────────────────────────────────

const SALON: NichePreset = {
  key: "salon",
  brandFormat: (hint) => hint || "Suite Twelve",
  hero: (brand, _hint) => ({
    headline: "Quietly Transformative",
    subheadline: `${brand} is a four-chair atelier — every appointment is private, every consultation is unhurried, every formula is mixed for one head of hair only.`,
    badge: "FOUR CHAIRS · PRIVATE BOOKINGS",
    ctaPrimary: "RESERVE A CHAIR",
    ctaSecondary: "MEET THE STYLISTS",
  }),
  sectionHeadings: {
    showcase: ["Before / After Gallery", "Signature Services", "The Stylist Bench"],
    content: ["Color, Engineered for You", "Cut by Master Stylists"],
    conversion: ["Book Your Appointment", "Begin Your Consultation"],
    interactive: ["Color Chart Atelier", "The Refinery"],
    footer: ["Quietly Crafted"],
  },
  bodyTemplates: [
    "Custom-mixed color, single-process or balayage, with no shared bowls. {{brand}} works one head at a time.",
    "Hand-tailored cuts by Master Stylist Marie Lavin. Each consultation includes a thirty-minute scalp analysis.",
  ],
  productNames: [
    "Signature Balayage",
    "Master Cut & Style",
    "Brazilian Smoothing Treatment",
    "Color Correction Service",
    "Bridal Hair Architecture",
    "Scalp Restoration Therapy",
  ],
  imageKeyword:
    "luxury salon interior portrait of stylist working with client at marble vanity with brass fixtures",
  theme: {
    typography: {
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      accentFont: "Italiana",
      headingScale: [4, 2.75, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "0.01em",
      lineHeight: 1.7,
      textTransform: "none",
    },
    colors: {
      primary: "#B8927A",
      secondary: "#2A211C",
      accent: "#E8D5C2",
      surface: "#F5EFE8",
      background: "#FBF7F2",
      textPrimary: "#2A211C",
      textSecondary: "#5A4D44",
      textMuted: "#8E7E72",
      gradients: [
        { from: "#E8D5C2", to: "#F5EFE8", angle: 135 },
      ],
    },
  },
  priceRange: [1800, 8500],
  currency: "₱",
  copyrightTagline: "Four chairs. Quiet rooms. Considered work.",
};

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO / CREATIVE PRESET
// ─────────────────────────────────────────────────────────────────────────────

const PORTFOLIO: NichePreset = {
  key: "portfolio",
  brandFormat: (hint) => hint || "Studio Vector",
  hero: (brand, _hint) => ({
    headline: "Selected Works, 2019 — Now",
    subheadline: `${brand} is an independent design practice working with founders and culture-led brands on identity systems, editorial direction, and product surfaces.`,
    badge: "INDEPENDENT PRACTICE",
    ctaPrimary: "VIEW THE INDEX",
    ctaSecondary: "BEGIN A PROJECT",
  }),
  sectionHeadings: {
    showcase: ["Selected Projects", "Recent Identity Systems", "Editorial Direction"],
    content: ["Process, In Three Phases", "Working Together"],
    conversion: ["Begin a Project", "Send a Brief"],
    interactive: ["Case Study Index", "The Studio Method"],
    footer: ["Now Booking 2027"],
  },
  bodyTemplates: [
    "Identity systems for culture-led brands. {{brand}} works in small engagements — one project at a time, six months minimum.",
    "Founder-led, no account managers. Direct collaboration from kickoff to final delivery.",
  ],
  productNames: [
    "Identity System — Hivemind",
    "Editorial Direction — Wax No. 03",
    "Product Surface — Strata App",
    "Wayfinding — Museum of Tides",
    "Packaging System — Salt House",
    "Brand Language — Tessera",
  ],
  imageKeyword:
    "design studio portfolio editorial spread photography of identity system mockups on cool grey concrete surface",
  theme: {
    typography: {
      headingFont: "Inter",
      bodyFont: "Inter",
      accentFont: "JetBrains Mono",
      headingScale: [4.5, 3, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.5,
      textTransform: "none",
    },
    colors: {
      primary: "#FF4500",
      secondary: "#0A0A0A",
      accent: "#F5F5F0",
      surface: "#161616",
      background: "#0A0A0A",
      textPrimary: "#F5F5F0",
      textSecondary: "#A8A8A0",
      textMuted: "#666660",
      gradients: [
        { from: "#FF4500", to: "#F5F5F0", angle: 135 },
      ],
    },
  },
  priceRange: [85000, 850000],
  currency: "₱",
  copyrightTagline: "An independent design practice.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CYBERSECURITY / SAAS PRESET
// ─────────────────────────────────────────────────────────────────────────────

const CYBERSECURITY: NichePreset = {
  key: "cybersecurity",
  brandFormat: (hint) => hint || "Sentinel Mesh",
  hero: (brand, _hint) => ({
    headline: "Continuous Threat Containment",
    subheadline: `${brand} operates an autonomous detection mesh across endpoint, identity, and cloud — surfacing real attacker behavior before it becomes a breach.`,
    badge: "SOC 2 TYPE II · ISO 27001",
    ctaPrimary: "REQUEST A WALKTHROUGH",
    ctaSecondary: "DOWNLOAD THE WHITEPAPER",
  }),
  sectionHeadings: {
    showcase: ["The Detection Mesh", "Live Threat Feed", "Coverage Matrix"],
    content: ["How the Mesh Operates", "Tuned to Your Stack"],
    conversion: ["Book a Threat Briefing", "Begin a Trial"],
    interactive: ["Attack Path Explorer", "The Red Team Lab"],
    footer: ["Operating Around the Clock"],
  },
  bodyTemplates: [
    "Autonomous behavioral detection across endpoints, identity providers, and cloud control planes. {{brand}} learns your environment in 48 hours.",
    "Real attacker telemetry — not signature matching. Curated by our in-house red team operators.",
  ],
  productNames: [
    "Mesh — Endpoint Sensor",
    "Mesh — Identity Sentinel",
    "Mesh — Cloud Posture",
    "Mesh — Detection Studio",
    "Mesh — Threat Intel Feed",
    "Mesh — Response Runbook",
  ],
  imageKeyword:
    "abstract dark cybersecurity dashboard visualization with neon green data streams over dark obsidian network mesh",
  theme: {
    typography: {
      headingFont: "Inter",
      bodyFont: "Inter",
      accentFont: "JetBrains Mono",
      headingScale: [4, 2.75, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.6,
      textTransform: "none",
    },
    colors: {
      primary: "#00FFA3",
      secondary: "#050608",
      accent: "#00C2FF",
      surface: "#0F1318",
      background: "#050608",
      textPrimary: "#E8F5EE",
      textSecondary: "#8FA3A5",
      textMuted: "#4D5C5E",
      gradients: [
        { from: "#00FFA3", to: "#00C2FF", angle: 135 },
        { from: "#050608", to: "#0F1318", angle: 180 },
      ],
    },
  },
  priceRange: [0, 0],
  currency: "USD",
  copyrightTagline: "Continuous threat containment.",
};

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FALLBACK PRESET (premium ecommerce)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_STORE: NichePreset = {
  key: "store",
  brandFormat: (hint) => hint || "The House",
  hero: (brand, hint) => ({
    headline: `Curated by ${brand}`,
    subheadline: `A small house of ${hint || "considered objects"}. Every piece is selected one at a time, photographed in our own studio, and shipped in compostable wrapping.`,
    badge: "INDEPENDENT · CURATED",
    ctaPrimary: "BROWSE THE EDIT",
    ctaSecondary: "THE STORY",
  }),
  sectionHeadings: {
    showcase: ["The Current Edit", "Recently Added", "Editor's Picks"],
    content: ["Selected, Not Stocked", "From the Studio"],
    conversion: ["Begin Your Cart", "Subscribe to the Drop"],
    interactive: ["Curator's Notes", "The Index"],
    footer: ["With Care"],
  },
  bodyTemplates: [
    "Considered objects, one at a time. {{brand}} curates a small monthly edit — never restocking the same piece twice.",
    "Photographed in our own studio. Wrapped in compostable paper. Shipped within seventy-two hours.",
  ],
  productNames: [
    "House Edition No. 01",
    "Editor's Pick — Walnut",
    "Limited Series Object",
    "House Edition No. 02",
    "Studio Drop — Brass",
    "Editor's Pick — Linen",
  ],
  imageKeyword:
    "premium curated product still life editorial photography on warm beige studio paper",
  theme: {
    typography: {
      headingFont: "Cormorant Garamond",
      bodyFont: "Inter",
      accentFont: "JetBrains Mono",
      headingScale: [4, 2.75, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.65,
      textTransform: "none",
    },
    colors: {
      primary: "#D87C3D",
      secondary: "#1F1A14",
      accent: "#E8D5BB",
      surface: "#28221A",
      background: "#191510",
      textPrimary: "#F5EBD9",
      textSecondary: "#C8B89A",
      textMuted: "#7A6E5A",
      gradients: [
        { from: "#D87C3D", to: "#E8D5BB", angle: 135 },
        { from: "#191510", to: "#28221A", angle: 180 },
      ],
    },
  },
  priceRange: [1200, 28000],
  currency: "₱",
  copyrightTagline: "Curated with care. Shipped with intent.",
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY + DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export const NICHE_PRESETS: Record<string, NichePreset> = {
  basketball: BASKETBALL,
  watchmaking: WATCHMAKING,
  fashion: FASHION,
  food: RESTAURANT,
  restaurant: RESTAURANT,
  salon: SALON,
  beauty: SALON,
  portfolio: PORTFOLIO,
  creative: PORTFOLIO,
  cybersecurity: CYBERSECURITY,
  saas: CYBERSECURITY,
  security: CYBERSECURITY,
  store: DEFAULT_STORE,
  ecommerce: DEFAULT_STORE,
};

/** Niche detection keyword map — checked in declared order, so most specific first. */
const NICHE_KEYWORDS: Array<[RegExp, string]> = [
  [/\b(basketball|nba|jersey|sneaker|hoops?|jordan|lakers|bulls|curry|lebron)\b/i, "basketball"],
  [/\b(watch(es|making|maker)?|timepiece|horolog(y|er|ist)|chronograph|tourbillon|geneva|swiss\s*made)\b/i, "watchmaking"],
  [/\b(cyber\w*|security|infosec|saas|threat|defen[cs]e|encryption|firewall|endpoint|pentest|penetration\s*test|soc|siem|edr|xdr|mfa|zero[-\s]?trust)\b/i, "cybersecurity"],
  [/\b(restaurant|cafe|caf[eé]|bakery|food|dining|kitchen|menu|chef|bistro|tasting)\b/i, "food"],
  [/\b(salon|spa|beauty|hair|barber|nail|makeup|skincare|stylist)\b/i, "salon"],
  [/\b(portfolio|designer|artist|photographer|creative|illustration|studio)\b/i, "portfolio"],
  [/\b(fashion|apparel|clothing|runway|couture|boutique|garment|tailor)\b/i, "fashion"],
  [/\b(store|shop|e-?commerce|retail|marketplace|brand|product)\b/i, "store"],
];

/** Detect niche from prompt; returns canonical key or "store" as default */
export function detectNiche(prompt: string): string {
  const text = prompt.toLowerCase();
  for (const [regex, key] of NICHE_KEYWORDS) {
    if (regex.test(text)) return key;
  }
  return "store";
}

/** Get the resolved preset for a niche (with safe default) */
export function getPreset(niche: string): NichePreset {
  return NICHE_PRESETS[niche.toLowerCase()] ?? DEFAULT_STORE;
}

/** Extract a brand/site name heuristic from the user prompt */
export function extractBrandName(prompt: string): string {
  // Look for "called X", "named X", "for X", first quoted phrase
  const quoted = prompt.match(/['"]([^'"]+)['"]/);
  if (quoted) return quoted[1].trim();
  const named = prompt.match(/\b(?:called|named)\s+([A-Z][\w'\-&\s]{1,40})/i);
  if (named) return named[1].trim();
  // Otherwise: use the prompt's significant nouns (first 2-3 capitalized words)
  const caps = prompt.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g);
  if (caps && caps[0]) return caps[0];
  // Fallback: niche-specific default in caller
  return "";
}

/** Build the global background layer for a niche (real Three.js params) */
export function buildGlobalBackground(niche: string): BackgroundLayer {
  const preset = getPreset(niche);
  const palette = [
    preset.theme.colors.primary,
    preset.theme.colors.accent,
    preset.theme.colors.secondary,
  ];
  return {
    type: "nebulaDepth",
    zIndex: -1,
    opacity: 0.6,
    params: {
      geometry: niche === "cybersecurity" ? "particleCloud" : "icosahedron",
      materialType: "standard",
      colorPalette: palette,
      animation: {
        type: niche === "basketball" ? "wind" : niche === "cybersecurity" ? "magneticMouse" : "orbit",
        speed: 0.4,
        intensity: 0.8,
        mouseInteraction: true,
      },
      lighting: {
        ambient: { color: preset.theme.colors.secondary, intensity: 0.5 },
        directional: {
          color: preset.theme.colors.primary,
          intensity: 1.4,
          position: [5, 10, 7] as [number, number, number],
        },
      },
      postProcessing: {
        bloom: true,
        chromaticAberration: niche === "cybersecurity",
        depthOfField: true,
        vignette: true,
      },
    },
    scrollBehavior: "parallax",
  };
}
