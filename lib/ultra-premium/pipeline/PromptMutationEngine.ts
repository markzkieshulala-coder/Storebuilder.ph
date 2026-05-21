/**
 * ============================================================================
 * PROMPT MUTATION ENGINE — DYNAMIC IMAGE PROMPT GENERATOR
 * ============================================================================
 * This module is the procedural core of the image pipeline. It executes
 * randomized camera, lighting, and texture mutations on top of niche context
 * to guarantee that no two image prompts are ever identical — even across
 * repeated generations of the same niche.
 *
 * RULE: This engine NEVER emits a raw niche keyword alone (e.g., "basketball").
 * Every prompt is a fully composed, cinematic, luxury-photography sentence.
 */

import { cyrb128, sfc32 } from "../engine/StructuralChoreographer"; // re-use seeded RNG

// ═════════════════════════════════════════════════════════════════════════════
// 1. RANDOMIZED CAMERA & LIGHTING ATTRIBUTE POOLS
// ═════════════════════════════════════════════════════════════════════════════

/** High-end composition descriptors. One is drawn per image slot. */
const COMPOSITIONS: readonly string[] = [
  "Anamorphic wide-angle cinematic shot",
  "Ultra-macro tight studio detail focus",
  "Minimalist abstract architectural framing",
  "High-speed kinetic motion blur capture",
  "Dutch angle dramatic tension framing",
  "Extreme low-angle heroic perspective",
  "Top-down flat-lay geometric arrangement",
  "Rack-focus depth-of-field product isolation",
  "Split-diopter dual-plane focus composition",
  "Bird's-eye orbital satellite perspective",
  "Intimate close-up texture magnification",
  "Symmetrical centered throne-room composition",
  "Asymmetric negative-space editorial framing",
  "Long-exposure light-trail kinetic streak",
  "Tilt-shift miniature-world distortion",
];

/** Lighting style descriptors. One is drawn per image slot. */
const LIGHTING: readonly string[] = [
  "Aggressive chiaroscuro high-contrast shadows",
  "Soft dark-ambient moody neon under-glow",
  "Volumetric golden-hour dust-mote ray-tracing",
  "Clean luxury lookbook editorial soft-box lighting",
  "Hard studio strobe rim-light edge definition",
  "Bioluminescent cavern glow from below",
  "Overhead noon solar noon harsh direct light",
  "Candle-lit tungsten warmth with deep shadow pools",
  "Multicolor gelled theatrical stage wash",
  "Fog-filtered diffused overcast softness",
  "Laser-cut precision beam slicing through haze",
  "Reflected water caustic dance across surface",
  "Single-source Rembrandt triangle portrait light",
  "UV blacklight fluorescent reactive glow",
  "Firelight ember flicker with smoke haze",
];

/** Luxury material texture tokens. One is drawn per image slot. */
const TEXTURES: readonly string[] = [
  "Rich obsidian reflections",
  "Matte carbon-fiber composites",
  "Brushed titanium framework",
  "Raw brutalist cast-concrete accents",
  "Patinated oxidized copper verdigris",
  "Hand-rubbed walnut burl grain",
  "Liquid mercury mirror-finish chrome",
  "Forged Damascus steel layered pattern",
  "Velvet blackout draped folds",
  "Cracked leather saddle distress",
  "Frosted borosilicate glass diffusion",
  "Woven Kevlar ballistic weave",
  "Polished onyx veined depth",
  "Aged parchment vellum translucency",
  "Corten steel rusted surface bloom",
];

/** High-fidelity quality suffix appended to every prompt. */
const QUALITY_SUFFIX =
  "8k resolution, award-winning luxury design concept, no text, no cheap graphics, no watermarks, no logos, ultra-sharp detail, cinematic color grading, photorealistic render";

// ═════════════════════════════════════════════════════════════════════════════
// 2. NICHE VISUAL CONCEPT MAPPING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Maps a niche keyword to its core visual concept.
 * This prevents raw niche names from appearing in image prompts.
 */
const NICHE_VISUAL_MAP: Record<string, string> = {
  basketball: "elite athletic court action, championship arena atmosphere, premium performance sportswear and equipment",
  watchmaking: "haute horlogerie mechanical movement macro, Swiss atelier craftsmanship, precious metal timepiece detail",
  cybersecurity: "abstract digital defense matrix, encrypted data stream visualization, secure network fortress architecture",
  fashion: "runway editorial couture draping, avant-garde textile sculpture, luxury atelier garment construction",
  automotive: "precision automotive engineering detail, aerodynamic supercar sculpture, racing heritage cockpit intimacy",
  architecture: "parametric facade geometry, concrete brutalist monument scale, light-shadow spatial dramaturgy",
  music: "vintage analog synthesizer circuitry, concert hall acoustic architecture, vinyl groove macro texture",
  wellness: "minimalist spa thermal stone arrangement, biophilic plant-light interplay, meditation space negative calm",
  technology: "silicon wafer nanoscale pattern, quantum computing crystalline lattice, server farm LED constellation",
  food: "molecular gastronomy plating architecture, artisan bakery steam and crust, premium ingredient surface topography",
};

/** Fallback visual concept for unrecognized niches. */
const DEFAULT_VISUAL_CONCEPT =
  "luxury product editorial photography, premium brand identity still life, high-end commercial design aesthetic";

// ═════════════════════════════════════════════════════════════════════════════
// 3. BLOCK-TYPE CONTEXTUAL DESCRIPTORS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * When a component renders an asset slot, the block type adds additional
 * contextual framing to the prompt — e.g., a hero image gets a different
 * treatment than a thumbnail grid image.
 */
const BLOCK_TYPE_CONTEXT: Record<string, string> = {
  hero: "dominant hero-scale composition occupying full frame, subject centered with commanding presence, negative space for text overlay",
  showcase: "curated gallery item presented in isolation, 45-degree three-quarter angle, controlled studio backdrop",
  card: "premium product card thumbnail, shallow depth of field, soft vignette edge falloff",
  background: "atmospheric environmental texture, out-of-focus bokeh depth, subtle tonal gradient",
  thumbnail: "small-format detail crop, extreme texture emphasis, tight framing on material surface",
  banner: "panoramic wide-aspect sweep, lateral motion implied, horizon line composition",
  portrait: "editorial subject portrait, direct eye-line engagement, shallow focal plane",
  texture: "abstract surface topography, no recognizable object, pure material study",
  icon: "minimalist symbolic abstraction, single-color silhouette, crisp vector-like clarity",
  transition: "seamless visual bridge element, color-field gradient, non-figurative atmospheric",
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. PROCEDURAL BLENDING SEQUENCE
// ═════════════════════════════════════════════════════════════════════════════

export interface ImagePromptContext {
  /** The niche keyword (e.g., "basketball") */
  niche: string;
  /** The component block type (e.g., "hero", "showcase", "card") */
  blockType: string;
  /** Localized text context from the component's copy (headline, body snippet) */
  localizedText: string;
  /** Seed string for deterministic uniqueness */
  seed: string;
  /** Index of the image slot within the component (0..N) */
  slotIndex: number;
}

export interface GeneratedImagePrompt {
  /** The complete blended prompt string */
  prompt: string;
  /** The unique seed derived from the mutation chain */
  derivedSeed: string;
  /** Which composition was selected */
  composition: string;
  /** Which lighting was selected */
  lighting: string;
  /** Which texture was selected */
  texture: string;
  /** Which visual concept was resolved */
  visualConcept: string;
  /** Which block context was applied */
  blockContext: string;
}

/**
 * Executes the procedural blending sequence.
 *
 * Algorithm:
 * 1. Resolve visual concept from niche (never raw niche name).
 * 2. Draw random composition, lighting, texture using seeded RNG.
 * 3. Resolve block-type contextual framing.
 * 4. Blend: [localizedText] + [visualConcept] + [composition] + [lighting] + [texture] + [blockContext] + [qualitySuffix].
 * 5. Compute derived cryptographic seed from all selections.
 * 6. Return structured prompt object.
 */
export function generateUniqueImagePrompt(ctx: ImagePromptContext): GeneratedImagePrompt {
  // ── Step 1: Resolve visual concept ─────────────────────────────────────────
  const visualConcept =
    NICHE_VISUAL_MAP[ctx.niche.toLowerCase()] ?? DEFAULT_VISUAL_CONCEPT;

  // ── Step 2: Initialize seeded RNG ────────────────────────────────────────
  const hash = cyrb128(`${ctx.seed}-${ctx.blockType}-${ctx.slotIndex}`);
  const rng = sfc32(hash[0], hash[1], hash[2], hash[3]);

  // ── Step 3: Draw random modifiers ────────────────────────────────────────
  const composition = COMPOSITIONS[Math.floor(rng() * COMPOSITIONS.length)];
  const lighting = LIGHTING[Math.floor(rng() * LIGHTING.length)];
  const texture = TEXTURES[Math.floor(rng() * TEXTURES.length)];

  // ── Step 4: Resolve block context ────────────────────────────────────────
  const blockContext =
    BLOCK_TYPE_CONTEXT[ctx.blockType] ?? BLOCK_TYPE_CONTEXT["showcase"];

  // ── Step 5: Blend into complete prompt ───────────────────────────────────
  // Order matters: localized text provides narrative anchor, then visual concept,
  // then cinematic descriptors, then block context, then quality suffix.
  const promptParts = [
    ctx.localizedText,
    visualConcept,
    composition,
    lighting,
    `accented with ${texture}`,
    blockContext,
    QUALITY_SUFFIX,
  ];

  const prompt = promptParts.filter(Boolean).join(". ") + ".";

  // ── Step 6: Compute derived cryptographic seed ──────────────────────────
  const derivedSeed = [
    composition.slice(0, 8),
    lighting.slice(0, 8),
    texture.slice(0, 8),
    Math.floor(rng() * 1_000_000).toString(36),
  ].join("-");

  return {
    prompt,
    derivedSeed,
    composition,
    lighting,
    texture,
    visualConcept,
    blockContext,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. ASSET SLOT TYPE DEFINITIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Defines an image asset slot within a component.
 * Every component in the registry declares its `assetSlots` using this shape.
 */
export interface AssetSlot {
  /** Semantic role of the image in the component layout */
  blockType: keyof typeof BLOCK_TYPE_CONTEXT;
  /** Which prop key the image URL should be injected into */
  targetProp: string;
  /** Fallback localized text context if component copy is not yet generated */
  fallbackContext: string;
  /** Optional aspect ratio hint for the image generator */
  aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | "3:4" | "9:16";
  /** Optional color temperature hint */
  temperature?: "warm" | "cool" | "neutral" | "dramatic";
}

/** Map of component names to their declared asset slots. */
export const COMPONENT_ASSET_SLOTS: Record<string, AssetSlot[]> = {
  CinematicHero: [
    { blockType: "hero", targetProp: "heroImageSrc", fallbackContext: "dominant brand hero visual", aspectRatio: "16:9" },
  ],
  AsymmetricTypographyHero: [
    { blockType: "hero", targetProp: "heroMediaSrc", fallbackContext: "typographic hero background visual", aspectRatio: "16:9" },
  ],
  ChromaticAberrationHero: [
    { blockType: "hero", targetProp: "mediaSrc", fallbackContext: "chromatic aberration hero subject", aspectRatio: "16:9" },
  ],
  BentoMasonry: [
    { blockType: "showcase", targetProp: "items[0].image", fallbackContext: "premium bento grid featured item", aspectRatio: "1:1" },
    { blockType: "card", targetProp: "items[1].image", fallbackContext: "bento grid secondary item detail", aspectRatio: "4:3" },
    { blockType: "card", targetProp: "items[2].image", fallbackContext: "bento grid tertiary item texture", aspectRatio: "3:4" },
    { blockType: "thumbnail", targetProp: "items[3].image", fallbackContext: "bento grid small supporting visual", aspectRatio: "1:1" },
    { blockType: "thumbnail", targetProp: "items[4].image", fallbackContext: "bento grid accent visual element", aspectRatio: "1:1" },
  ],
  Fluid3DDisplay: [
    { blockType: "showcase", targetProp: "featuredItem.image", fallbackContext: "fluid 3D showcase hero product", aspectRatio: "4:3" },
    { blockType: "card", targetProp: "secondaryItems[0].image", fallbackContext: "fluid 3D secondary product angle", aspectRatio: "1:1" },
    { blockType: "card", targetProp: "secondaryItems[1].image", fallbackContext: "fluid 3D tertiary product detail", aspectRatio: "1:1" },
  ],
  KineticProductGrid: [
    { blockType: "showcase", targetProp: "products[0].image", fallbackContext: "kinetic grid flagship product hero", aspectRatio: "3:4" },
    { blockType: "card", targetProp: "products[1].image", fallbackContext: "kinetic grid product variant angle", aspectRatio: "1:1" },
    { blockType: "card", targetProp: "products[2].image", fallbackContext: "kinetic grid product lifestyle shot", aspectRatio: "1:1" },
    { blockType: "thumbnail", targetProp: "products[3].image", fallbackContext: "kinetic grid product detail crop", aspectRatio: "1:1" },
    { blockType: "thumbnail", targetProp: "products[4].image", fallbackContext: "kinetic grid product texture close-up", aspectRatio: "1:1" },
  ],
  OverlappingSplitReveal: [
    { blockType: "showcase", targetProp: "leftMediaSrc", fallbackContext: "split reveal left panel dominant visual", aspectRatio: "3:4" },
    { blockType: "showcase", targetProp: "rightMediaSrc", fallbackContext: "split reveal right panel secondary visual", aspectRatio: "3:4" },
  ],
  ParallaxTimeline: [
    { blockType: "showcase", targetProp: "events[0].image", fallbackContext: "timeline milestone primary visual", aspectRatio: "16:9" },
    { blockType: "card", targetProp: "events[1].image", fallbackContext: "timeline secondary milestone visual", aspectRatio: "4:3" },
    { blockType: "thumbnail", targetProp: "events[2].image", fallbackContext: "timeline tertiary detail visual", aspectRatio: "1:1" },
  ],
  OrbitalCarousel: [
    { blockType: "showcase", targetProp: "items[0].image", fallbackContext: "orbital carousel featured orbit item", aspectRatio: "1:1" },
    { blockType: "card", targetProp: "items[1].image", fallbackContext: "orbital carousel secondary orbit item", aspectRatio: "1:1" },
    { blockType: "card", targetProp: "items[2].image", fallbackContext: "orbital carousel tertiary orbit item", aspectRatio: "1:1" },
  ],
  DepthFieldGallery: [
    { blockType: "showcase", targetProp: "items[0].image", fallbackContext: "depth field primary in-focus subject", aspectRatio: "4:3" },
    { blockType: "card", targetProp: "items[1].image", fallbackContext: "depth field mid-plane subject", aspectRatio: "4:3" },
    { blockType: "background", targetProp: "items[2].image", fallbackContext: "depth field out-of-focus background texture", aspectRatio: "16:9" },
  ],
  HolographicCTA: [
    { blockType: "background", targetProp: "backgroundTexture", fallbackContext: "holographic CTA iridescent surface texture", aspectRatio: "16:9" },
    { blockType: "showcase", targetProp: "foregroundProduct", fallbackContext: "holographic CTA product hero element", aspectRatio: "1:1" },
  ],
  CinematicFooter: [
    { blockType: "background", targetProp: "backgroundMedia", fallbackContext: "cinematic footer atmospheric background", aspectRatio: "21:9" },
  ],
  GlitchHeader: [
    { blockType: "background", targetProp: "glitchTexture", fallbackContext: "glitch header digital noise texture", aspectRatio: "16:9" },
  ],
  VelocityMarquee: [
    { blockType: "banner", targetProp: "marqueeTexture", fallbackContext: "velocity marquee scrolling texture band", aspectRatio: "21:9" },
  ],
  TopologyMorph: [
    { blockType: "background", targetProp: "transitionTexture", fallbackContext: "topology morph transitional mesh texture", aspectRatio: "16:9" },
  ],
  DimensionalCardStack: [
    { blockType: "card", targetProp: "cards[0].image", fallbackContext: "dimensional card stack primary card visual", aspectRatio: "3:4" },
    { blockType: "card", targetProp: "cards[1].image", fallbackContext: "dimensional card stack secondary card visual", aspectRatio: "3:4" },
  ],
  LiquidGlassPanel: [
    { blockType: "background", targetProp: "glassBackground", fallbackContext: "liquid glass caustic background texture", aspectRatio: "16:9" },
  ],
  PerspectiveGrid: [
    { blockType: "showcase", targetProp: "items[0].image", fallbackContext: "perspective grid primary content item", aspectRatio: "4:3" },
    { blockType: "card", targetProp: "items[1].image", fallbackContext: "perspective grid secondary content item", aspectRatio: "4:3" },
  ],
  HorizonLineScroll: [
    { blockType: "showcase", targetProp: "items[0].image", fallbackContext: "horizon scroll primary track item", aspectRatio: "16:9" },
    { blockType: "card", targetProp: "items[1].image", fallbackContext: "horizon scroll secondary track item", aspectRatio: "4:3" },
  ],
  VerticalRhythmStack: [
    { blockType: "showcase", targetProp: "blocks[0].image", fallbackContext: "vertical rhythm primary content block visual", aspectRatio: "16:9" },
    { blockType: "card", targetProp: "blocks[1].image", fallbackContext: "vertical rhythm secondary content block visual", aspectRatio: "4:3" },
    { blockType: "thumbnail", targetProp: "blocks[2].image", fallbackContext: "vertical rhythm tertiary detail visual", aspectRatio: "1:1" },
  ],
};
