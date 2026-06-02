/**
 * Universal Dynamic Layout Composer Engine
 * Generates a completely unique Layout Graph for every prompt.
 * NO shared skeletons. NO template reuse. Procedurally composed.
 */

import {
  ComposerInput,
  ComposerResult,
  LayoutGraph,
  LayoutNode,
  LayoutNodeType,
  LayoutEdge,
  EdgeType,
  GridSpec,
  SpacingSpec,
  CompositionProfile,
  FocalPoint,
  GridSystem,
  SpacingRhythmSpec,
  VisualHierarchy,
  GlobalCompositionProfile,
  FlowProfile,
  Depth,
  Density,
  VisualWeight,
  Rhythm,
  BalanceType,
  TensionLevel,
  HeroVariant,
  SplitVariant,
  ClusterVariant,
  StripVariant,
  GalleryVariant,
  SignalVariant,
  SpacingRhythm,
  MediaPlacement,
  CtaPlacement,
} from "./types";

// ───────────────────────────────────────────────────────────────
// Seeded Deterministic PRNG (so same prompt = same layout)
// ───────────────────────────────────────────────────────────────

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

function makeRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ───────────────────────────────────────────────────────────────
// SEED-DRIVEN SELECTION HELPERS
// ───────────────────────────────────────────────────────────────

function pick<T>(rng: () => number, options: T[]): T {
  return options[Math.floor(rng() * options.length)];
}

function weightedPick<T>(rng: () => number, options: Array<{ value: T; weight: number }>): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let r = rng() * total;
  for (const opt of options) {
    r -= opt.weight;
    if (r <= 0) return opt.value;
  }
  return options[options.length - 1].value;
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rangeMap(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

// ───────────────────────────────────────────────────────────────
// SEMANTIC MAPPING TABLES
// Each prompt fingerprint creates a unique path through these
// ───────────────────────────────────────────────────────────────

const HERO_VARIANTS_BY_STYLE: Record<string, HeroVariant[]> = {
  minimal: ["centerpiece", "immersive"],
  brutalist: ["dominant", "asymmetric"],
  glassmorphism: ["layered", "immersive"],
  neumorphism: ["centerpiece", "layered"],
  cyberpunk: ["dominant", "layered", "immersive"],
  futuristic: ["layered", "immersive", "asymmetric"],
  editorial: ["centerpiece", "asymmetric"],
  corporate: ["centerpiece", "split-screen"],
  luxury: ["centerpiece", "immersive"],
  playful: ["asymmetric", "dominant"],
  artistic: ["asymmetric", "layered"],
  cinematic: ["immersive", "dominant"],
  startup: ["dominant", "asymmetric"],
  enterprise: ["centerpiece", "split-screen"],
  high_tech: ["layered", "dominant"],
};

const DEFAULT_HERO_VARIANTS: HeroVariant[] = ["dominant", "centerpiece", "asymmetric", "split-screen", "layered", "immersive"];

const CLUSTER_VARIANTS_BY_DENSITY: Record<string, ClusterVariant[]> = {
  sparse: ["stacked-cards", "stagger"],
  balanced: ["grid", "bento", "stagger"],
  dense: ["bento", "masonry", "grid"],
  packed: ["masonry", "grid", "radial"],
};

const STRIP_VARIANTS: StripVariant[] = ["marquee", "ribbon", "bar", "stats-row", "logo-wall", "divider"];

const GALLERY_VARIANTS_BY_STYLE: Record<string, GalleryVariant[]> = {
  editorial: ["filmstrip", "masonry"],
  brutalist: ["scattered", "uniform"],
  luxury: ["panorama", "uniform"],
  minimal: ["uniform", "masonry"],
  artistic: ["scattered", "masonry"],
  cinematic: ["panorama", "filmstrip"],
  playful: ["scattered", "masonry"],
};
const DEFAULT_GALLERY_VARIANTS: GalleryVariant[] = ["uniform", "masonry", "panorama", "filmstrip", "scattered"];

const SIGNAL_VARIANTS: SignalVariant[] = ["banner", "inline", "sticky", "floating", "full-bleed", "corner", "modal"];

const DEPTHS: Depth[] = ["surface", "elevated", "floating", "immersed"];
const DENSITIES: Density[] = ["sparse", "balanced", "dense", "packed"];
const VISUAL_WEIGHTS: VisualWeight[] = ["light", "medium", "heavy", "dominant"];
const RHYTHMS: Rhythm[] = ["steady", "accelerating", "decelerating", "pulsing", "irregular"];
const BALANCE_TYPES: BalanceType[] = [
  "symmetric", "asymmetric-left", "asymmetric-right", "asymmetric-top", "asymmetric-bottom",
  "radial", "diagonal-tl-br", "diagonal-tr-bl", "freeform",
];
const TENSION_LEVELS: TensionLevel[] = ["calm", "mild", "tense", "dramatic"];
const EDGE_TYPES: EdgeType[] = ["sequence", "contrast", "continuation", "reveal", "fold", "echo", "inversion", "compression", "expansion"];
const SPACING_RHYTHMS: SpacingRhythm[] = ["even", "accelerating", "decelerating", "breathing", "staccato", "wave"];
const MEDIA_PLACEMENTS: MediaPlacement[] = [
  "background", "inline-left", "inline-right", "inline-top", "inline-bottom",
  "overlay", "surrounding", "contained", "scattered", "none",
];
const CTA_PLACEMENTS: CtaPlacement[] = ["inline", "floating", "sticky-bottom", "full-bleed", "center", "corner", "sidebar"];

// ───────────────────────────────────────────────────────────────
// COMPOSITION SEEDING
// The prompt fingerprint drives ALL procedural choices
// ───────────────────────────────────────────────────────────────

interface CompositionSeed {
  rng: () => number;
  promptHash: number;
  density: Density;
  complexity: "simple" | "moderate" | "complex" | "rich";
  primaryAxis: "horizontal" | "vertical" | "diagonal" | "radial";
  globalBalance: BalanceType;
  rhythm: SpacingRhythm;
  gridType: GridSpec["type"];
  baseColumns: number;
  ctaCount: number;
  nestingProbability: number;
  inversionProbability: number;
  foldProbability: number;
}

function deriveCompositionSeed(input: ComposerInput, rng: () => number, promptHash: number): CompositionSeed {
  const p = input.puo;

  // Density from PUO
  const densityMap: Record<string, Density> = {
    sparse: "sparse", airy: "sparse", "ultra-sparse": "sparse",
    balanced: "balanced",
    dense: "dense", packed: "dense", maximalist: "packed",
  };
  const density = densityMap[p.visualDensity] || "balanced";

  // Complexity from layout direction
  const complexityMap: Record<string, "simple" | "moderate" | "complex" | "rich"> = {
    "single-page": "simple",
    "landing": "moderate",
    "lead-gen": "moderate",
    "showcase": "moderate",
    "multi-page": "complex",
    "saas": "complex",
    "e-commerce": "rich",
    "application": "rich",
    "dashboard": "rich",
    "editorial": "complex",
    "portfolio": "moderate",
    "scrollytelling": "complex",
  };
  const complexity = complexityMap[p.layoutDirection] || "moderate";

  // Primary axis from design style and mood
  const axisWeights: Array<{ value: "horizontal" | "vertical" | "diagonal" | "radial"; weight: number }> = [
    { value: "horizontal", weight: p.designStyle === "editorial" || p.designStyle === "cinematic" ? 0.8 : 0.3 },
    { value: "vertical", weight: p.designStyle === "minimal" || p.designStyle === "startup" ? 0.7 : 0.4 },
    { value: "diagonal", weight: p.designStyle === "artistic" || p.designStyle === "brutalist" ? 0.6 : 0.15 },
    { value: "radial", weight: p.designStyle === "playful" || p.designStyle === "futuristic" ? 0.4 : 0.1 },
  ];
  const primaryAxis = weightedPick(rng, axisWeights);

  // Global balance — seeded
  const balanceWeights = BALANCE_TYPES.map((b) => ({
    value: b,
    weight: b === "symmetric" && p.designStyle === "corporate" ? 0.6 : rng() * 0.3 + 0.1,
  }));
  const globalBalance = weightedPick(rng, balanceWeights);

  // Spacing rhythm — derived from personality
  const rhythmMap: Record<string, SpacingRhythm[]> = {
    energetic: ["staccato", "accelerating"],
    calm: ["even", "decelerating", "breathing"],
    aggressive: ["staccato", "wave"],
    playful: ["wave", "breathing"],
    elegant: ["even", "decelerating"],
    experimental: ["staccato", "wave"],
  };
  const personalityRhythms = rhythmMap[p.websitePersonality] || SPACING_RHYTHMS;
  const rhythm = pick(rng, personalityRhythms);

  // Grid type from style
  const gridWeights: Array<{ value: GridSpec["type"]; weight: number }> = [
    { value: "uniform", weight: p.designStyle === "minimal" || p.designStyle === "corporate" ? 0.8 : 0.3 },
    { value: "masonry", weight: p.designStyle === "artistic" || p.designStyle === "editorial" ? 0.7 : 0.2 },
    { value: "bento", weight: p.designStyle === "startup" || p.designStyle === "saas" ? 0.6 : 0.2 },
    { value: "asymmetric", weight: p.designStyle === "brutalist" || p.designStyle === "artistic" ? 0.7 : 0.15 },
    { value: "freeform", weight: p.designStyle === "experimental" || p.designStyle === "artistic" ? 0.5 : 0.1 },
    { value: "radial", weight: p.designStyle === "playful" || p.designStyle === "futuristic" ? 0.4 : 0.05 },
    { value: "diagonal", weight: p.designStyle === "brutalist" || p.designStyle === "artistic" ? 0.3 : 0.05 },
  ];
  const gridType = weightedPick(rng, gridWeights);

  // Base columns from density
  let baseColumns = 3;
  if (density === "sparse") baseColumns = 1;
  if (density === "balanced") baseColumns = 2 + Math.floor(rng() * 2); // 2-3
  if (density === "dense") baseColumns = 3 + Math.floor(rng() * 2);   // 3-4
  if (density === "packed") baseColumns = 4 + Math.floor(rng() * 2);   // 4-5

  // CTA count from conversion style
  const ctaMap: Record<string, number> = {
    "hard-sell": 4,
    "soft-sell": 1,
    consultative: 2,
    editorial: 0,
    "story-driven": 1,
    "product-first": 2,
    "trust-first": 1,
    "urgency-driven": 3,
    "community-driven": 1,
    transparent: 1,
  };
  const ctaCount = ctaMap[p.conversionStyle] ?? 1;

  return {
    rng,
    promptHash,
    density,
    complexity,
    primaryAxis,
    globalBalance,
    rhythm,
    gridType,
    baseColumns,
    ctaCount,
    nestingProbability: complexity === "rich" ? 0.4 : complexity === "complex" ? 0.25 : complexity === "moderate" ? 0.15 : 0.05,
    inversionProbability: complexity === "rich" ? 0.3 : 0.15,
    foldProbability: complexity === "rich" || complexity === "complex" ? 0.25 : 0.1,
  };
}

// ───────────────────────────────────────────────────────────────
// NODE FACTORIES — Create nodes with unique profiles
// ───────────────────────────────────────────────────────────────

function createHeroNode(seed: CompositionSeed, index: number): LayoutNode {
  const { rng, density, primaryAxis, globalBalance } = seed;

  const variants = HERO_VARIANTS_BY_STYLE[seed.globalBalance] || DEFAULT_HERO_VARIANTS;
  const variant = pick(rng, variants);

  const heroSpan = (variant === "immersive" ? "bleed" : variant === "dominant" ? "full" : pick(rng, ["full", "contained", "bleed"])) as LayoutNode["span"];
  const heroHeight = (variant === "immersive" ? "viewport" : variant === "dominant" ? "tall" : pick(rng, ["tall", "golden", "auto"])) as LayoutNode["height"];

  return {
    id: `hero-${index}`,
    type: "hero",
    variant,
    depth: pick(rng, ["surface", "immersed", "floating"]),
    density: density === "packed" ? "dense" : density === "dense" ? "balanced" : "sparse",
    visualWeight: "dominant",
    rhythm: pick(rng, RHYTHMS),
    span: heroSpan,
    height: heroHeight,
    composition: {
      balance: globalBalance,
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis: primaryAxis === "diagonal" ? pick(rng, ["horizontal", "vertical"]) : primaryAxis,
      focalPoints: generateFocalPoints(rng, 1, globalBalance),
      negativeSpaceRatio: rangeMap(rng, 0.3, 0.7),
      alignment: variant === "asymmetric" ? "loose" : variant === "layered" ? "broken" : "strict",
    },
    grid: generateGridSpec(seed, true),
    spacing: generateSpacingSpec(seed, "hero"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 10,
    mediaPlacement: pick(rng, ["background", "overlay", "surrounding", "contained"]),
    ctaPlacement: pick(rng, CTA_PLACEMENTS),
  };
}

function createClusterNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density, primaryAxis, globalBalance } = seed;
  const variants = CLUSTER_VARIANTS_BY_DENSITY[density] || CLUSTER_VARIANTS_BY_DENSITY["balanced"];
  const variant = pick(rng, variants);

  return {
    id: `cluster-${role}-${index}`,
    type: "cluster",
    variant,
    depth: pick(rng, DEPTHS),
    density,
    visualWeight: pick(rng, ["medium", "heavy"]),
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["full", "contained", "bleed"]),
    height: "auto",
    composition: {
      balance: pick(rng, ["symmetric", "asymmetric-left", "asymmetric-right"]),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis,
      focalPoints: generateFocalPoints(rng, 2, globalBalance),
      negativeSpaceRatio: rangeMap(rng, 0.1, 0.4),
      alignment: pick(rng, ["strict", "loose"]),
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "cluster"),
    focalPoint: { x: "center", y: "top", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, MEDIA_PLACEMENTS),
  };
}

function createStageNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density, primaryAxis } = seed;

  return {
    id: `stage-${role}-${index}`,
    type: "stage",
    variant: pick(rng, ["dominant", "centerpiece", "asymmetric"]),
    depth: pick(rng, ["surface", "elevated", "floating"]),
    density: density === "sparse" ? "sparse" : "balanced",
    visualWeight: pick(rng, ["medium", "heavy"]),
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["full", "contained"]),
    height: pick(rng, ["auto", "tall", "golden"]),
    composition: {
      balance: pick(rng, BALANCE_TYPES),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis,
      focalPoints: generateFocalPoints(rng, 1, "symmetric"),
      negativeSpaceRatio: rangeMap(rng, 0.2, 0.6),
      alignment: pick(rng, ["strict", "loose"]),
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "stage"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 2,
    mediaPlacement: pick(rng, ["inline-left", "inline-right", "inline-top", "contained"]),
  };
}

function createSplitNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density, primaryAxis } = seed;
  const variant = pick(rng, ["equal", "heavy-left", "heavy-right", "thirds", "golden"] as SplitVariant[]);

  return {
    id: `split-${role}-${index}`,
    type: "split",
    variant,
    depth: pick(rng, DEPTHS),
    density: density === "packed" ? "dense" : "balanced",
    visualWeight: pick(rng, ["medium", "heavy"]),
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["full", "contained", "inset"]),
    height: pick(rng, ["auto", "tall", "golden"]),
    composition: {
      balance: variant === "equal" ? "symmetric" : variant === "thirds" ? "symmetric" : pick(rng, ["asymmetric-left", "asymmetric-right"]),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis: "horizontal",
      focalPoints: generateFocalPoints(rng, 2, "symmetric"),
      negativeSpaceRatio: rangeMap(rng, 0.15, 0.4),
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "split"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, ["inline-left", "inline-right", "contained"]),
  };
}

function createStripNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density } = seed;
  const variant = pick(rng, STRIP_VARIANTS);

  return {
    id: `strip-${role}-${index}`,
    type: "strip",
    variant,
    depth: pick(rng, DEPTHS),
    density: density === "packed" ? "dense" : density === "sparse" ? "sparse" : "balanced",
    visualWeight: "light",
    rhythm: variant === "marquee" ? "pulsing" : "steady",
    span: variant === "marquee" || variant === "divider" ? "bleed" : pick(rng, ["full", "contained", "bleed"]),
    height: variant === "divider" ? "short" : pick(rng, ["short", "auto"]),
    composition: {
      balance: "symmetric",
      tension: "calm",
      primaryAxis: "horizontal",
      focalPoints: [],
      negativeSpaceRatio: variant === "divider" ? 0.9 : rangeMap(rng, 0.3, 0.6),
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "strip"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, ["inline-left", "inline-right", "contained", "none"]),
  };
}

function createGalleryNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density } = seed;
  const variants = GALLERY_VARIANTS_BY_STYLE[seed.globalBalance] || DEFAULT_GALLERY_VARIANTS;
  const variant = pick(rng, variants);

  return {
    id: `gallery-${role}-${index}`,
    type: "gallery",
    variant,
    depth: pick(rng, DEPTHS),
    density,
    visualWeight: "heavy",
    rhythm: variant === "scattered" ? "irregular" : pick(rng, RHYTHMS),
    span: variant === "panorama" ? "bleed" : pick(rng, ["full", "contained", "bleed"]),
    height: variant === "panorama" ? "tall" : variant === "filmstrip" ? "short" : "auto",
    composition: {
      balance: variant === "scattered" ? "freeform" : pick(rng, ["symmetric", "asymmetric-left"]),
      tension: variant === "scattered" ? "dramatic" : pick(rng, TENSION_LEVELS),
      primaryAxis: "horizontal",
      focalPoints: generateFocalPoints(rng, 3, "symmetric"),
      negativeSpaceRatio: variant === "scattered" ? rangeMap(rng, 0.1, 0.3) : rangeMap(rng, 0.1, 0.2),
      alignment: variant === "scattered" ? "loose" : "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "gallery"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: "surrounding",
  };
}

function createSignalNode(seed: CompositionSeed, index: number): LayoutNode {
  const { rng } = seed;
  const variant = pick(rng, SIGNAL_VARIANTS);

  return {
    id: `signal-${index}`,
    type: "signal",
    variant,
    depth: pick(rng, ["elevated", "floating"]),
    density: "sparse",
    visualWeight: "heavy",
    rhythm: "pulsing",
    span: variant === "full-bleed" ? "bleed" : variant === "sticky" ? "full" : pick(rng, ["contained", "inset"]),
    height: variant === "modal" ? "auto" : variant === "full-bleed" ? "tall" : "short",
    composition: {
      balance: "symmetric",
      tension: "tense",
      primaryAxis: "horizontal",
      focalPoints: [{ x: "center", y: "center", offsetX: 0, offsetY: 0 }],
      negativeSpaceRatio: 0.5,
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "signal"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 20,
    mediaPlacement: "none",
    ctaPlacement: variant === "sticky" ? "sticky-bottom" : variant === "corner" ? "corner" : "center",
  };
}

function createFrameNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density, primaryAxis } = seed;

  return {
    id: `frame-${role}-${index}`,
    type: "frame",
    variant: pick(rng, ["bordered", "shadowed", "minimal", "card"]),
    depth: pick(rng, DEPTHS),
    density,
    visualWeight: "medium",
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["contained", "inset"]),
    height: pick(rng, ["auto", "tall"]),
    composition: {
      balance: pick(rng, BALANCE_TYPES),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis,
      focalPoints: generateFocalPoints(rng, 1, "symmetric"),
      negativeSpaceRatio: rangeMap(rng, 0.2, 0.5),
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "frame"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, MEDIA_PLACEMENTS),
  };
}

function createListNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density } = seed;

  return {
    id: `list-${role}-${index}`,
    type: "list",
    variant: pick(rng, ["timeline", "accordion", "cards", "bare"]),
    depth: pick(rng, DEPTHS),
    density,
    visualWeight: "medium",
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["full", "contained"]),
    height: "auto",
    composition: {
      balance: pick(rng, ["symmetric", "asymmetric-left"]),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis: "vertical",
      focalPoints: [],
      negativeSpaceRatio: density === "sparse" ? rangeMap(rng, 0.4, 0.7) : rangeMap(rng, 0.1, 0.3),
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "list"),
    focalPoint: { x: "left", y: "top", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, ["inline-left", "inline-right", "contained", "none"]),
  };
}

function createFoldNode(seed: CompositionSeed, index: number): LayoutNode {
  const { rng } = seed;
  return {
    id: `fold-${index}`,
    type: "fold",
    variant: pick(rng, ["spacer", "divider", "transition", "color-shift"]),
    depth: "surface",
    density: "sparse",
    visualWeight: "light",
    rhythm: "steady",
    span: "bleed",
    height: "short",
    composition: {
      balance: "symmetric",
      tension: "calm",
      primaryAxis: "horizontal",
      focalPoints: [],
      negativeSpaceRatio: 0.8,
      alignment: "strict",
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "fold"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 0,
    mediaPlacement: "none",
  };
}

function createTileNode(seed: CompositionSeed, index: number, role: string): LayoutNode {
  const { rng, density } = seed;

  return {
    id: `tile-${role}-${index}`,
    type: "tile",
    variant: pick(rng, ["uniform", "mixed", "featured", "scattered"]),
    depth: pick(rng, DEPTHS),
    density,
    visualWeight: pick(rng, ["medium", "heavy"]),
    rhythm: pick(rng, RHYTHMS),
    span: pick(rng, ["full", "contained", "bleed"]),
    height: pick(rng, ["auto", "tall"]),
    composition: {
      balance: pick(rng, BALANCE_TYPES),
      tension: pick(rng, TENSION_LEVELS),
      primaryAxis: "horizontal",
      focalPoints: generateFocalPoints(rng, 2, "symmetric"),
      negativeSpaceRatio: rangeMap(rng, 0.1, 0.3),
      alignment: pick(rng, ["strict", "loose"]),
    },
    grid: generateGridSpec(seed, false),
    spacing: generateSpacingSpec(seed, "tile"),
    focalPoint: { x: "center", y: "center", offsetX: 0, offsetY: 0 },
    zIndex: 1,
    mediaPlacement: pick(rng, MEDIA_PLACEMENTS),
  };
}

// ───────────────────────────────────────────────────────────────
// GRID SPEC GENERATOR — Unique per layout
// ───────────────────────────────────────────────────────────────

function generateGridSpec(seed: CompositionSeed, isHero: boolean): GridSpec {
  const { rng, baseColumns, gridType, density } = seed;

  let columns = baseColumns;
  if (isHero) columns = Math.max(1, Math.min(3, Math.floor(rng() * 2) + 1));

  const gapMap = { sparse: "2rem", balanced: "1.5rem", dense: "1rem", packed: "0.5rem" };
  const baseGap = gapMap[density] || "1.5rem";

  return {
    type: gridType,
    columns,
    columnsMobile: Math.max(1, Math.floor(columns / 2)),
    columnsTablet: Math.max(1, columns - 1),
    columnsDesktop: columns,
    columnsWide: columns,
    gap: baseGap,
    gapMobile: `calc(${baseGap} * 0.5)`,
    rowHeight: gridType === "uniform" ? pick(rng, ["auto", "200px", "300px", "400px"]) : undefined,
    minItemWidth: gridType === "masonry" ? "250px" : undefined,
    maxItemWidth: gridType === "masonry" ? "500px" : undefined,
    autoFlow: gridType === "masonry" ? "dense" : "row",
    alignment: pick(rng, ["start", "center", "stretch"]),
  };
}

// ───────────────────────────────────────────────────────────────
// SPACING SPEC GENERATOR — Unique rhythm per layout
// ───────────────────────────────────────────────────────────────

function generateSpacingSpec(seed: CompositionSeed, role: string): SpacingSpec {
  const { rng, rhythm, density } = seed;

  const baseMap: Record<Density, string> = { sparse: "6rem", balanced: "4rem", dense: "2rem", packed: "1rem" };
  const base = baseMap[density];

  const ratio = rhythm === "accelerating" ? 1.618 : rhythm === "decelerating" ? 1 / 1.618 : rhythm === "wave" ? rangeMap(rng, 1.2, 2.0) : 1.0;

  const count = role === "hero" ? 4 : role === "fold" ? 2 : 5;
  const scale: string[] = [];
  let current = parseFloat(base);
  for (let i = 0; i < count; i++) {
    scale.push(`${current}rem`);
    if (rhythm === "staccato") {
      current = current * (rng() > 0.5 ? 1.618 : 0.618);
    } else if (rhythm === "wave") {
      current = current * (Math.sin(i * Math.PI / 2) > 0 ? ratio : 1 / ratio);
    } else {
      current = current * ratio;
    }
    current = Math.max(0.5, current);
  }

  const before = role === "hero" ? "0" : scale[Math.floor(rng() * scale.length)];
  const after = role === "fold" ? "0" : scale[Math.floor(rng() * scale.length)];

  return {
    before,
    after,
    internal: scale[0],
    rhythm,
    scale,
  };
}

// ───────────────────────────────────────────────────────────────
// FOCAL POINT GENERATOR
// ───────────────────────────────────────────────────────────────

function generateFocalPoints(rng: () => number, count: number, balance: BalanceType): FocalPoint[] {
  const points: FocalPoint[] = [];
  for (let i = 0; i < count; i++) {
    const x = balance.startsWith("asymmetric")
      ? (balance.includes("left") ? "left" : balance.includes("right") ? "right" : pick(rng, ["left", "right"]))
      : balance === "radial"
      ? "center"
      : pick(rng, ["left", "center", "right"]);
    const y = balance.includes("top")
      ? "top"
      : balance.includes("bottom")
      ? "bottom"
      : pick(rng, ["top", "center", "bottom"]);

    points.push({
      x: x as FocalPoint["x"],
      y: y as FocalPoint["y"],
      offsetX: rangeMap(rng, -0.2, 0.2),
      offsetY: rangeMap(rng, -0.2, 0.2),
    });
  }
  return points;
}

// ───────────────────────────────────────────────────────────────
// EDGE GENERATOR — Creates unique flow relationships
// ───────────────────────────────────────────────────────────────

function generateEdges(nodes: LayoutNode[], seed: CompositionSeed): LayoutEdge[] {
  const { rng, foldProbability, inversionProbability, complexity } = seed;
  const edges: LayoutEdge[] = [];

  const sorted = [...nodes].sort((a, b) => {
    const aNum = parseInt(a.id.split("-")[a.id.split("-").length - 1] || "0");
    const bNum = parseInt(b.id.split("-")[b.id.split("-").length - 1] || "0");
    return aNum - bNum;
  });

  let lastType: string | null = null;

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];

    let edgeType: EdgeType = "sequence";
    let spacingMultiplier = 1.0;

    // Folds between different node types (create visual breaks)
    if (lastType && from.type !== to.type && rng() < foldProbability) {
      edgeType = "fold";
      spacingMultiplier = 1.5;
    }
    // Inversion (flip left/right or top/bottom visual weight)
    else if (rng() < inversionProbability) {
      edgeType = "inversion";
      spacingMultiplier = 1.2;
    }
    // Echo (similar pattern with variation)
    else if (lastType === to.type) {
      edgeType = "echo";
      spacingMultiplier = 0.9;
    }
    // Compression/expansion rhythm
    else if (from.density === "sparse" && to.density === "dense") {
      edgeType = "compression";
      spacingMultiplier = 0.7;
    } else if (from.density === "dense" && to.density === "sparse") {
      edgeType = "expansion";
      spacingMultiplier = 1.5;
    }
    // Contrast between visual weights
    else if (Math.abs(VISUAL_WEIGHTS.indexOf(from.visualWeight) - VISUAL_WEIGHTS.indexOf(to.visualWeight)) >= 2) {
      edgeType = "contrast";
      spacingMultiplier = 1.3;
    }
    // Rich layouts get reveals
    else if (complexity === "rich" && rng() < 0.3) {
      edgeType = "reveal";
      spacingMultiplier = 1.0;
    }

    edges.push({
      from: from.id,
      to: to.id,
      type: edgeType,
      weight: rangeMap(rng, 0.3, 1.0),
      spacingMultiplier,
    });

    lastType = to.type;
  }

  return edges;
}

// ───────────────────────────────────────────────────────────────
// MAIN COMPOSITION ALGORITHM
// Assembles a unique layout graph from semantic fingerprint
// ───────────────────────────────────────────────────────────────

function composeLayoutGraph(input: ComposerInput, seed: CompositionSeed): LayoutGraph {
  const { rng, complexity, primaryAxis, globalBalance, rhythm, gridType, baseColumns, ctaCount, nestingProbability, density } = seed;
  const p = input.puo;

  const nodes: LayoutNode[] = [];

  // ── 1. HERO ── (always present, always first)
  nodes.push(createHeroNode(seed, 0));

  // ── 2. TRUST STRIP ── (optional, high-conversion layouts)
  if (p.conversionStyle === "trust-first" || p.conversionStyle === "hard-sell" || rng() < 0.5) {
    nodes.push(createStripNode(seed, 0, "trust"));
  }

  // ── 3. CONTENT SEQUENCE ── (assembled from a PROMPT-WEIGHTED bag, so two
  //    prompts — even in the same niche — get materially different section
  //    compositions, not the same fixed 7 types reshuffled.)
  const contentNodes: LayoutNode[] = [];
  type NodeFactory = (s: CompositionSeed, i: number, r: string) => LayoutNode;
  const factories: Record<string, NodeFactory> = {
    cluster: (s, i, r) => createClusterNode(s, i, r),
    stage:   (s, i, r) => createStageNode(s, i, r),
    split:   (s, i, r) => createSplitNode(s, i, r),
    gallery: (s, i, r) => createGalleryNode(s, i, r),
    tile:    (s, i, r) => createTileNode(s, i, r),
    frame:   (s, i, r) => createFrameNode(s, i, r),
    list:    (s, i, r) => createListNode(s, i, r),
  };

  // When allowedSectionKinds is provided, suppress node types whose semantic
  // kind the caller has forbidden.  The 'list' type maps to either 'faq' or
  // 'testimonials' — remove it when neither is permitted so the graph never
  // produces nodes that buildHomeMain would have to discard.
  const allowed = input.allowedSectionKinds;
  if (allowed) {
    const listAllowed = allowed.includes('faq') || allowed.includes('testimonials');
    if (!listAllowed) delete (factories as Record<string, unknown>).list;
  }

  const typeKeys = Object.keys(factories);

  // Per-section affinity by design style + layout direction. Visual niches lean
  // on gallery/stage/frame; product niches on gallery/tile; app/SaaS on
  // cluster/list. A per-pick rng jitter keeps every bag prompt-specific.
  const style = p.designStyle || "";
  const dir = p.layoutDirection || "";
  const visualStyle = /editorial|artistic|cinematic|luxury|minimal/.test(style);
  const productDir = /e-commerce|showcase|portfolio/.test(dir);
  const appDir = /saas|application|dashboard|landing|lead-gen/.test(dir);
  const baseWeights: Record<string, number> = {
    cluster: appDir ? 1.6 : 1.0,
    stage:   visualStyle ? 1.3 : 0.9,
    split:   1.1,
    gallery: productDir || visualStyle ? 1.7 : 0.8,
    tile:    productDir ? 1.6 : 1.0,
    frame:   visualStyle ? 1.3 : 0.9,
    list:    appDir ? 1.4 : 1.0,
  };

  // How many content sections — a PROMPT-SEEDED value inside the complexity band,
  // not one fixed number per niche, so section COUNT also varies prompt-to-prompt.
  const contentRange: Record<string, [number, number]> = {
    simple: [2, 3], moderate: [3, 5], complex: [5, 7], rich: [6, 9],
  };
  const [loCount, hiCount] = contentRange[complexity] ?? [3, 5];
  const targetContent = loCount + Math.floor(rng() * (hiCount - loCount + 1));

  // Weighted picking with per-use decay + no immediate repeats: varied yet able to
  // feature a favored type twice (with a different variant) when the bag warrants.
  const liveWeights: Record<string, number> = { ...baseWeights };
  let lastKey = "";
  for (let i = 0; i < targetContent; i++) {
    const opts = typeKeys
      .filter((k) => k !== lastKey)
      .map((k) => ({ value: k, weight: Math.max(0.05, liveWeights[k] * (0.85 + rng() * 0.3)) }));
    const key = weightedPick(rng, opts);
    liveWeights[key] *= 0.45; // decay so the sequence keeps moving across types
    lastKey = key;
    const node = factories[key](seed, i, `content-${i}`);

    // Some nodes may be nested (children) — child types drawn freely from the bag.
    if (rng() < nestingProbability) {
      const childCount = Math.floor(rng() * 2) + 1;
      node.children = [];
      for (let j = 0; j < childCount; j++) {
        const childKey = pick(rng, typeKeys);
        const child = factories[childKey](seed, j, `nested-${i}-${j}`);
        child.span = "inset";
        child.depth = "elevated";
        node.children.push(child);
      }
    }

    contentNodes.push(node);
  }

  // Insert folds for complex/rich layouts (visual breaks)
  if (complexity === "complex" || complexity === "rich") {
    const foldPositions: number[] = [];
    const numFolds = complexity === "rich" ? 3 : 2;
    for (let i = 0; i < numFolds; i++) {
      const pos = Math.floor(rng() * (contentNodes.length - 1)) + 1;
      if (!foldPositions.includes(pos)) foldPositions.push(pos);
    }
    foldPositions.sort((a, b) => a - b);

    let offset = 0;
    for (const pos of foldPositions) {
      contentNodes.splice(pos + offset, 0, createFoldNode(seed, offset));
      offset++;
    }
  }

  nodes.push(...contentNodes);

  // ── 4. CTAs ── (placed strategically)
  for (let i = 0; i < ctaCount; i++) {
    const signal = createSignalNode(seed, i);
    // Place CTAs at different positions based on conversion style
    let insertIndex: number;
    if (p.conversionStyle === "hard-sell" || p.conversionStyle === "urgency-driven") {
      insertIndex = i === 0 ? 2 : nodes.length - 2;
    } else if (p.conversionStyle === "soft-sell" || p.conversionStyle === "story-driven") {
      insertIndex = Math.floor(nodes.length / 2);
    } else {
      insertIndex = Math.floor(rng() * (nodes.length - 2)) + 1;
    }
    nodes.splice(insertIndex, 0, signal);
  }

  // ── 5. FINAL FOLD + FOOTER PLACEHOLDER ──
  if (complexity !== "simple") {
    nodes.push(createFoldNode(seed, 99));
  }

  // ── 6. EDGES ── (flow relationships)
  const edges = generateEdges(nodes, seed);

  // ── 7. GLOBAL SYSTEM SPECS ──
  const maxWidthMap = { sparse: "800px", balanced: "1200px", dense: "1440px", packed: "100%" };

  const gridSystem: GridSystem = {
    baseUnit: "0.25rem",
    maxWidth: maxWidthMap[density] || "1200px",
    gutter: density === "sparse" ? "3rem" : density === "balanced" ? "2rem" : "1rem",
    columnCount: baseColumns * 4,
    breakpoints: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    behavior: density === "packed" ? "fluid" : pick(rng, ["fixed", "fluid", "hybrid"]),
  };

  const ratio = rhythm === "accelerating" ? 1.618 : rhythm === "decelerating" ? 1 / 1.618 : rhythm === "wave" ? rangeMap(rng, 1.2, 2.0) : 1.0;

  const spacingRhythm: SpacingRhythmSpec = {
    pattern: rhythm,
    base: density === "sparse" ? "4rem" : density === "balanced" ? "3rem" : "2rem",
    ratio,
    values: ["1rem", "1.5rem", "2.25rem", "3.375rem", "5.063rem"],
    sectionSpacing: nodes.map((n) => n.spacing.after),
  };

  const dominantIdx = nodes.findIndex((n) => n.visualWeight === "dominant");
  const visualHierarchy: VisualHierarchy = {
    levels: 3 + (complexity === "rich" ? 2 : complexity === "complex" ? 1 : 0),
    dominantElement: nodes[dominantIdx]?.id || nodes[0]?.id,
    secondaryElements: nodes.filter((n) => n.visualWeight === "heavy").map((n) => n.id),
    tertiaryElements: nodes.filter((n) => n.visualWeight === "medium").map((n) => n.id),
    rhythm: pick(rng, RHYTHMS),
    progression: pick(rng, ["gradual", "stepped", "explosive", "wave"]),
  };

  const tensionCurve = nodes.map((n) => {
    const tensionVal = TENSION_LEVELS.indexOf(n.composition.tension);
    return tensionVal / (TENSION_LEVELS.length - 1);
  });

  const densityCurve = nodes.map((n) => {
    const densityVal = DENSITIES.indexOf(n.density);
    return densityVal / (DENSITIES.length - 1);
  });

  const globalComposition: GlobalCompositionProfile = {
    overallBalance: globalBalance,
    primaryAxis,
    pacing: complexity === "rich" ? "variable" : complexity === "complex" ? "medium" : "fast",
    tensionCurve,
    densityCurve,
  };

  const flowProfile: FlowProfile = {
    direction: primaryAxis === "radial" ? "spiral" : primaryAxis === "horizontal" ? "horizontal" : primaryAxis === "diagonal" ? "diagonal" : "vertical",
    scrollBehavior: p.motion.complexity === "scroll-driven" || p.motion.complexity === "cinematic" ? "pinned" : pick(rng, ["smooth", "free"]),
    sectionTransitions: edges.map((e) => e.type),
    readingPattern: pick(rng, ["F", "Z", "layer-cake", "golden", "chaos"]),
  };

  // Calculate prompt fingerprint for deduplication / comparison
  const promptFingerprint = `${p.visualMood}-${p.designStyle}-${p.layoutDirection}-${p.visualDensity}-${seed.promptHash}`;

  return {
    version: "2.0.0",
    generatedAt: new Date().toISOString(),
    seed: String(seed.promptHash),
    promptFingerprint,

    nodes,
    edges,

    gridSystem,
    spacingRhythm,
    visualHierarchy,
    compositionProfile: globalComposition,
    flowProfile,

    nodeCount: nodes.length,
    maxDepth: Math.max(...nodes.map((n) => n.zIndex)),
    hasNesting: nodes.some((n) => !!n.children),
    complexity,
  };
}

// ───────────────────────────────────────────────────────────────
// PUBLIC API
// ───────────────────────────────────────────────────────────────

export function composeLayout(input: ComposerInput): ComposerResult {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Seed from prompt + metadata
    const promptHash = hashString(input.puo.originalPrompt + input.puo.visualMood + input.puo.designStyle);
    const rng = makeRNG(promptHash);

    // Derive composition seed from prompt fingerprint
    const seed = deriveCompositionSeed(input, rng, promptHash);

    // Generate unique layout graph
    const graph = composeLayoutGraph(input, seed);

    return {
      success: true,
      graph,
      warnings,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success: false,
      graph: {} as LayoutGraph,
      warnings,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// Utility: Compare two layout graphs for uniqueness
export function compareLayoutGraphs(a: LayoutGraph, b: LayoutGraph): {
  identical: boolean;
  differences: string[];
} {
  const differences: string[] = [];

  if (a.nodeCount !== b.nodeCount) {
    differences.push(`node count: ${a.nodeCount} vs ${b.nodeCount}`);
  }
  if (a.maxDepth !== b.maxDepth) {
    differences.push(`max depth: ${a.maxDepth} vs ${b.maxDepth}`);
  }
  if (a.hasNesting !== b.hasNesting) {
    differences.push(`nesting: ${a.hasNesting} vs ${b.hasNesting}`);
  }
  if (a.complexity !== b.complexity) {
    differences.push(`complexity: ${a.complexity} vs ${b.complexity}`);
  }
  if (a.compositionProfile.primaryAxis !== b.compositionProfile.primaryAxis) {
    differences.push(`primary axis: ${a.compositionProfile.primaryAxis} vs ${b.compositionProfile.primaryAxis}`);
  }
  if (a.compositionProfile.overallBalance !== b.compositionProfile.overallBalance) {
    differences.push(`balance: ${a.compositionProfile.overallBalance} vs ${b.compositionProfile.overallBalance}`);
  }

  const aTypes = a.nodes.map((n) => n.type).join(",");
  const bTypes = b.nodes.map((n) => n.type).join(",");
  if (aTypes !== bTypes) {
    differences.push(`node types differ`);
  }

  return {
    identical: differences.length === 0,
    differences,
  };
}
