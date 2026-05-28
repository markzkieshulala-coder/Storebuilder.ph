/**
 * Universal Dynamic Layout Composer Engine - Type System
 * Generates a unique Layout Graph for every prompt — no shared skeletons.
 */

// ───────────────────────────────────────────────────────────────
// Layout Node Types — Spatial Primitives (not content-specific)
// ───────────────────────────────────────────────────────────────

export type LayoutNodeType =
  | "hero"         // dominant, usually full-bleed
  | "stage"        // content-forward, flexible role
  | "cluster"      // grouped content (features, products, etc.)
  | "strip"        // horizontal band (testimonials, logos, stats)
  | "split"        // two-panel layout
  | "layer"        // stacked/overlapping depth
  | "pivot"        // asymmetrical focal point
  | "gallery"      // media-dominant grid
  | "list"         // vertical sequence
  | "tile"         // card-based grid
  | "frame"        // contained / bordered section
  | "fold"         // visual break / transition
  | "cascade"      // waterfall / masonry
  | "orbit"        // radial composition
  | "slice"        // diagonal composition
  | "matrix"        // dense data grid
  | "chamber"       // enclosed / immersive space
  | "plaza"         // open, sparse, breathing room
  | "spire"         // tall vertical emphasis
  | "bridge"        // connecting two sections
  | "signal";       // CTA / conversion point

export type HeroVariant =
  | "dominant"     // massive, edge-to-edge
  | "centerpiece"  // centered, constrained
  | "asymmetric"   // offset focal point
  | "split-screen" // left/right hero
  | "layered"      // depth, overlapping elements
  | "immersive";    // full viewport, minimal text

export type SplitVariant =
  | "equal"        // 50/50
  | "heavy-left"   // 60/40 or 70/30
  | "heavy-right"
  | "thirds"
  | "golden";       // golden ratio

export type ClusterVariant =
  | "grid"
  | "bento"
  | "masonry"
  | "orbit"
  | "radial"
  | "stagger"
  | "stacked-cards";

export type StripVariant =
  | "marquee"
  | "ribbon"
  | "bar"
  | "divider"
  | "stats-row"
  | "logo-wall";

export type GalleryVariant =
  | "masonry"
  | "uniform"
  | "panorama"
  | "filmstrip"
  | "scattered";

export type SignalVariant =
  | "banner"
  | "modal"
  | "inline"
  | "sticky"
  | "floating"
  | "full-bleed"
  | "corner";

// ───────────────────────────────────────────────────────────────
// Layout Edge Types — Flow & Rhythm Relationships
// ───────────────────────────────────────────────────────────────

export type EdgeType =
  | "sequence"    // standard vertical flow
  | "contrast"    // sharp visual break
  | "continuation" // seamless, same rhythm
  | "reveal"      // scroll-triggered appearance
  | "fold"        // intentional visual break / transition
  | "echo"        // repeats pattern with variation
  | "inversion"   // flips layout (e.g. left/right swap)
  | "compression" // tighter spacing
  | "expansion";  // wider spacing

export interface LayoutEdge {
  from: string;
  to: string;
  type: EdgeType;
  weight: number;       // 0-1, how strong the relationship
  spacingMultiplier: number; // relative to base spacing
}

// ───────────────────────────────────────────────────────────────
// Layout Node — A section in the graph
// ───────────────────────────────────────────────────────────────

export type Depth = "surface" | "elevated" | "floating" | "immersed";

export type Density = "sparse" | "balanced" | "dense" | "packed";

export type VisualWeight = "light" | "medium" | "heavy" | "dominant";

export type Rhythm = "steady" | "accelerating" | "decelerating" | "pulsing" | "irregular";

export interface LayoutNode {
  id: string;
  type: LayoutNodeType;
  variant: string;            // specific variant of the node type
  depth: Depth;
  density: Density;
  visualWeight: VisualWeight;
  rhythm: Rhythm;
  span: "full" | "contained" | "bleed" | "inset";
  height: "auto" | "tall" | "short" | "viewport" | "golden";
  composition: CompositionProfile;
  grid: GridSpec;
  spacing: SpacingSpec;
  focalPoint: FocalPoint;
  zIndex: number;
  mediaPlacement: MediaPlacement;
  ctaPlacement?: CtaPlacement;
  children?: LayoutNode[];    // nested nodes for complex compositions
}

// ───────────────────────────────────────────────────────────────
// Composition Profile — Unique per layout
// ───────────────────────────────────────────────────────────────

export type BalanceType =
  | "symmetric"
  | "asymmetric-left"
  | "asymmetric-right"
  | "asymmetric-top"
  | "asymmetric-bottom"
  | "radial"
  | "diagonal-tl-br"
  | "diagonal-tr-bl"
  | "freeform";

export type TensionLevel = "calm" | "mild" | "tense" | "dramatic";

export interface FocalPoint {
  x: "left" | "center" | "right";
  y: "top" | "center" | "bottom";
  offsetX: number; // 0-1, fine-tuned offset
  offsetY: number;
}

export interface CompositionProfile {
  balance: BalanceType;
  tension: TensionLevel;
  primaryAxis: "horizontal" | "vertical" | "diagonal" | "radial";
  secondaryAxis?: "horizontal" | "vertical";
  focalPoints: FocalPoint[];
  negativeSpaceRatio: number; // 0-1
  alignment: "strict" | "loose" | "broken";
}

// ───────────────────────────────────────────────────────────────
// Grid Specification — Dynamic per layout
// ───────────────────────────────────────────────────────────────

export interface GridSpec {
  type: "uniform" | "masonry" | "bento" | "asymmetric" | "freeform" | "radial" | "diagonal";
  columns: number;            // base columns
  columnsMobile: number;
  columnsTablet: number;
  columnsDesktop: number;
  columnsWide: number;
  gap: string;
  gapMobile: string;
  rowHeight?: string;         // for uniform grids
  minItemWidth?: string;      // for masonry
  maxItemWidth?: string;
  autoFlow: "row" | "column" | "dense";
  alignment: "start" | "center" | "stretch" | "baseline";
}

// ───────────────────────────────────────────────────────────────
// Spacing Specification — Dynamic rhythm
// ───────────────────────────────────────────────────────────────

export type SpacingRhythm = "even" | "accelerating" | "decelerating" | "breathing" | "staccato" | "wave";

export interface SpacingSpec {
  before: string;
  after: string;
  internal: string;
  rhythm: SpacingRhythm;
  // Procedurally generated scale
  scale: string[];
}

// ───────────────────────────────────────────────────────────────
// Media Placement — Where imagery lives
// ───────────────────────────────────────────────────────────────

export type MediaPlacement =
  | "background"
  | "inline-left"
  | "inline-right"
  | "inline-top"
  | "inline-bottom"
  | "overlay"
  | "surrounding"
  | "contained"
  | "scattered"
  | "none";

// ───────────────────────────────────────────────────────────────
// CTA Placement — Conversion point positioning
// ───────────────────────────────────────────────────────────────

export type CtaPlacement =
  | "inline"
  | "floating"
  | "sticky-bottom"
  | "sticky-top"
  | "full-bleed"
  | "corner"
  | "center"
  | "sidebar";

// ───────────────────────────────────────────────────────────────
// Layout Graph — The complete output
// ───────────────────────────────────────────────────────────────

export interface LayoutGraph {
  version: string;
  generatedAt: string;
  seed: string;               // hash of the original prompt
  promptFingerprint: string;  // compressed hash for comparison

  // ── Graph Structure ──
  nodes: LayoutNode[];
  edges: LayoutEdge[];

  // ── System-Level Specs ──
  gridSystem: GridSystem;
  spacingRhythm: SpacingRhythmSpec;
  visualHierarchy: VisualHierarchy;
  compositionProfile: GlobalCompositionProfile;
  flowProfile: FlowProfile;

  // ── Metadata ──
  nodeCount: number;
  maxDepth: number;
  hasNesting: boolean;
  complexity: "simple" | "moderate" | "complex" | "rich";
}

// ───────────────────────────────────────────────────────────────
// Global System Specs
// ───────────────────────────────────────────────────────────────

export interface GridSystem {
  baseUnit: string;
  maxWidth: string;
  gutter: string;
  columnCount: number;
  breakpoints: Record<string, string>;
  behavior: "fixed" | "fluid" | "hybrid" | "elastic";
}

export interface SpacingRhythmSpec {
  pattern: SpacingRhythm;
  base: string;
  ratio: number;              // multiplicative ratio between steps
  values: string[];           // e.g. ["1rem", "1.618rem", "2.618rem", ...]
  sectionSpacing: string[];   // spacing before each section
}

export interface VisualHierarchy {
  levels: number;
  dominantElement: string;    // node ID
  secondaryElements: string[];
  tertiaryElements: string[];
  rhythm: Rhythm;
  progression: "gradual" | "stepped" | "explosive" | "wave";
}

export interface GlobalCompositionProfile {
  overallBalance: BalanceType;
  primaryAxis: "horizontal" | "vertical" | "diagonal" | "radial";
  pacing: "fast" | "medium" | "slow" | "variable";
  tensionCurve: number[];     // per-section tension level (0-1)
  densityCurve: number[];     // per-section density (0-1)
}

export interface FlowProfile {
  direction: "vertical" | "horizontal" | "diagonal" | "spiral" | "zigzag";
  scrollBehavior: "smooth" | "snap" | "free" | "pinned";
  sectionTransitions: EdgeType[];
  readingPattern: "F" | "Z" | "layer-cake" | "golden" | "chaos" | "radial" | "diagonal";
}

// ───────────────────────────────────────────────────────────────
// Composer Input / Output
// ───────────────────────────────────────────────────────────────

export interface ComposerInput {
  puo: {
    visualMood: string;
    designStyle: string;
    websitePersonality: string;
    visualDensity: string;
    layoutDirection: string;
    modernityLevel: string;
    businessTone: string;
    conversionStyle: string;
    motion: { complexity: string; enabled: boolean };
    composition: { type: string; readingPattern: string };
    pageStructure: Array<{ id: string; type: string; importance: string; order: number }>;
    originalPrompt: string;
  };
}

export interface ComposerResult {
  success: boolean;
  graph: LayoutGraph;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

// ───────────────────────────────────────────────────────────────
// Utility types for renderer
// ───────────────────────────────────────────────────────────────

export type LayoutPrimitive =
  | { type: "stack"; direction: "vertical" | "horizontal"; gap: string; align?: string; children: LayoutPrimitive[] }
  | { type: "grid"; spec: GridSpec; children: LayoutPrimitive[] }
  | { type: "split"; variant: SplitVariant; ratio: number[]; children: LayoutPrimitive[] }
  | { type: "layer"; zIndexes: number[]; children: LayoutPrimitive[] }
  | { type: "offset"; x: string; y: string; child: LayoutPrimitive }
  | { type: "bleed"; child: LayoutPrimitive }
  | { type: "inset"; padding: string; child: LayoutPrimitive }
  | { type: "media"; placement: MediaPlacement; aspectRatio?: string }
  | { type: "text"; weight: VisualWeight; level: number }
  | { type: "cta"; placement: CtaPlacement }
  | { type: "node-ref"; nodeId: string };
