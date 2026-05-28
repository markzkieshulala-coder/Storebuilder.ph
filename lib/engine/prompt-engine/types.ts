/**
 * Universal Prompt Parser Engine - Core Types
 * A dynamic, template-free design intent extraction system
 */

// ───────────────────────────────────────────────────────────────
// Scalar / Token Types
// ───────────────────────────────────────────────────────────────

export type VisualMood =
  | "dark"
  | "light"
  | "contrast"
  | "muted"
  | "vibrant"
  | "ethereal"
  | "grounded"
  | "dramatic"
  | "soft"
  | "warm"
  | "cold"
  | "neutral";

export type DesignStyle =
  | "minimal"
  | "brutalist"
  | "glassmorphism"
  | "neumorphism"
  | "skeuomorphic"
  | "flat"
  | "material"
  | "cyberpunk"
  | "futuristic"
  | "retro"
  | "vaporwave"
  | "editorial"
  | "corporate"
  | "playful"
  | "artistic"
  | "organic"
  | "industrial"
  | "luxury"
  | "premium"
  | "startup"
  | "enterprise"
  | "cinematic"
  | "high-tech";

export type WebsitePersonality =
  | "bold"
  | "elegant"
  | "aggressive"
  | "friendly"
  | "authoritative"
  | "whimsical"
  | "serious"
  | "approachable"
  | "exclusive"
  | "energetic"
  | "calm"
  | "rebellious"
  | "sophisticated"
  | "youthful"
  | "trustworthy"
  | "innovative"
  | "timeless"
  | "experimental";

export type VisualDensity =
  | "sparse"
  | "airy"
  | "balanced"
  | "dense"
  | "packed"
  | "maximalist"
  | "ultra-sparse";

export type ModernityLevel =
  | "cutting-edge"
  | "modern"
  | "contemporary"
  | "classic"
  | "retro-modern"
  | "timeless"
  | "avant-garde";

export type BusinessTone =
  | "professional"
  | "casual"
  | "formal"
  | "playful"
  | "technical"
  | "luxury"
  | "accessible"
  | "disruptive"
  | "authoritative"
  | "empathetic"
  | "aggressive"
  | "conservative";

export type ConversionStyle =
  | "hard-sell"
  | "soft-sell"
  | "consultative"
  | "editorial"
  | "story-driven"
  | "product-first"
  | "trust-first"
  | "urgency-driven"
  | "community-driven"
  | "transparent";

export type SpacingExpectation =
  | "ultra-tight"
  | "compact"
  | "comfortable"
  | "generous"
  | "expansive"
  | "asymmetric-spacing";

export type AnimationExpectation =
  | "none"
  | "subtle"
  | "moderate"
  | "heavy"
  | "cinematic"
  | "playful"
  | "functional"
  | "reactive"
  | "immersive"
  | "scroll-driven"
  | "micro-interaction-focused";

export type TypographyDirection =
  | "serif-dominant"
  | "sans-dominant"
  | "mono-dominant"
  | "mixed"
  | "display-heavy"
  | "body-focused"
  | "oversized"
  | "tiny"
  | "editorial"
  | "technical"
  | "artistic";

export type CompositionExpectation =
  | "centered"
  | "left-aligned"
  | "right-aligned"
  | "asymmetric"
  | "grid-strict"
  | "freeform"
  | "split"
  | "layered"
  | "diagonal"
  | "radial"
  | "bento"
  | "magazine";

export type LayoutDirection =
  | "single-page"
  | "multi-page"
  | "scrollytelling"
  | "dashboard"
  | "landing"
  | "application"
  | "portfolio"
  | "editorial"
  | "e-commerce"
  | "saas"
  | "lead-gen"
  | "showcase"
  | "documentation"
  | "hybrid";

export type InteractionExpectation =
  | "hover-reactive"
  | "click-driven"
  | "scroll-driven"
  | "gesture-based"
  | "keyboard-focused"
  | "voice-ready"
  | "static"
  | "micro-interaction-heavy"
  | "stateful"
  | "passive";

export type ImageDirection =
  | "photography-heavy"
  | "illustration-heavy"
  | "iconography-heavy"
  | "abstract-visuals"
  | "data-visualization"
  | "3d-rendered"
  | "minimal-imagery"
  | "no-imagery"
  | "mixed-media";

export type BrandingDirection =
  | "logo-centric"
  | "type-centric"
  | "color-centric"
  | "mascot-centric"
  | "symbol-centric"
  | "minimal-branding"
  | "pattern-centric"
  | "photography-centric";

export type MotionDirection =
  | "parallax"
  | "reveal"
  | "continuous"
  | "triggered"
  | "physics-based"
  | "timeline"
  | "ambient"
  | "page-transition"
  | "none";

// ───────────────────────────────────────────────────────────────
// Complex / Vector Types
// ───────────────────────────────────────────────────────────────

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  danger?: string;
  success?: string;
  warning?: string;
  info?: string;
  /** Derived / computed colors */
  derived: Record<string, string>;
}

export interface TypographyConfig {
  family: {
    heading: string;
    body: string;
    accent?: string;
    mono?: string;
  };
  scale: {
    hero: string;      // clamp or fixed
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    body: string;
    small: string;
    caption: string;
  };
  weight: {
    heading: number;
    body: number;
    bold: number;
  };
  lineHeight: {
    heading: number;
    body: number;
    tight: number;
  };
  letterSpacing: {
    heading: string;
    body: string;
    tight: string;
    wide: string;
  };
}

export interface SpacingConfig {
  unit: number;           // base rem unit
  scale: string[];        // spacing tokens (e.g., "0.25rem", "0.5rem"...)
  section: string;        // vertical section gap
  container: string;      // max-width
  gutter: string;         // horizontal page padding
  gridGap: string;
}

export interface BorderRadiusConfig {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
  style: "sharp" | "soft" | "pill" | "organic";
}

export interface ShadowConfig {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow?: string;
  style: "flat" | "soft" | "hard" | "glow" | "neon" | "none";
}

export interface AnimationConfig {
  enabled: boolean;
  complexity: AnimationExpectation;
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    default: string;
    enter: string;
    exit: string;
    bounce: string;
  };
  preferences: {
    prefersReducedMotion: "reduce" | "no-preference" | "always";
    scrollAnimations: boolean;
    hoverEffects: boolean;
    pageTransitions: boolean;
    loadAnimations: boolean;
  };
}

export interface LayoutConfig {
  direction: LayoutDirection;
  containerWidth: "narrow" | "medium" | "wide" | "full" | "bleed";
  sidebar: boolean;
  header: "fixed" | "sticky" | "static" | "hidden" | "floating";
  footer: "full" | "minimal" | "hidden";
  navStyle: "top" | "side" | "bottom" | "floating" | "hamburger" | "mega-menu";
  readingPattern: "F-pattern" | "Z-pattern" | "layer-cake" | "golden-ratio" | "free";
  gridColumns: number;
  mobileFirst: boolean;
}

export interface UXConfig {
  primaryGoal: string;
  targetAudience: string;
  userJourney: string[];
  trustSignals: string[];
  conversionPoints: string[];
  contentStrategy: "product-led" | "story-led" | "data-led" | "community-led" | "expert-led";
  accessibility: {
    targetWCAG: "A" | "AA" | "AAA";
    colorBlindSafe: boolean;
    keyboardNav: boolean;
    screenReaderOptimized: boolean;
  };
  performance: {
    lazyLoadImages: boolean;
    skeletonScreens: boolean;
    infiniteScroll: boolean;
    pagination: boolean;
  };
}

export interface PageStructureItem {
  id: string;
  type: string;
  purpose: string;
  importance: "critical" | "high" | "medium" | "low";
  contentHints: string[];
  layoutHints: string[];
  visualWeight: "heavy" | "medium" | "light";
  order: number;
}

// ───────────────────────────────────────────────────────────────
// PROMPT UNDERSTANDING OBJECT (PUO)
// ───────────────────────────────────────────────────────────────

export interface PromptUnderstandingObject {
  version: string;
  parsedAt: string;
  originalPrompt: string;
  confidence: number;

  // ── Semantic Tokens ──
  visualMood: VisualMood;
  designStyle: DesignStyle;
  websitePersonality: WebsitePersonality;
  visualDensity: VisualDensity;
  modernityLevel: ModernityLevel;
  businessTone: BusinessTone;
  conversionStyle: ConversionStyle;
  artisticDirection: string;

  // ── Direction Objects ──
  layout: LayoutConfig;
  visual: {
    colorPalette: ColorPalette;
    typography: TypographyConfig;
    spacing: SpacingConfig;
    borderRadius: BorderRadiusConfig;
    shadows: ShadowConfig;
    imageDirection: ImageDirection;
    composition: CompositionExpectation;
    visualDensity: VisualDensity;
  };
  ux: UXConfig;
  typography: TypographyConfig; // convenience ref
  composition: {
    type: CompositionExpectation;
    readingPattern: string;
    focalPoints: string[];
    hierarchy: string[];
  };
  motion: AnimationConfig;
  pageStructure: PageStructureItem[];
  branding: {
    direction: BrandingDirection;
    logoStyle: string;
    taglinePresence: boolean;
    socialProofPlacement: string;
    trustIndicators: string[];
  };
  interaction: {
    primary: InteractionExpectation;
    secondary: InteractionExpectation[];
    feedbackStyle: string;
    statefulness: string;
  };

  // ── Raw Extracted Vocabulary ──
  extractedKeywords: string[];
  extractedSentiments: Array<{ word: string; score: number }>;
  rawEntities: Array<{ type: string; value: string; confidence: number }>;

  // ── Metadata ──
  inferredIndustry: string;
  inferredAudience: string;
  inferredGeography?: string;
  inferredLanguage?: string;
  customAttributes: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────
// Parser Configuration
// ───────────────────────────────────────────────────────────────

export interface ParserConfig {
  caseSensitive: boolean;
  synonymExpansion: boolean;
  sentimentAnalysis: boolean;
  entityExtraction: boolean;
  language: string;
  maxTokens: number;
  fallbackDefaults: Partial<PromptUnderstandingObject>;
}

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  caseSensitive: false,
  synonymExpansion: true,
  sentimentAnalysis: true,
  entityExtraction: true,
  language: "en",
  maxTokens: 4096,
  fallbackDefaults: {},
};

// ───────────────────────────────────────────────────────────────
// Parser Result
// ───────────────────────────────────────────────────────────────

export interface ParseResult {
  success: boolean;
  object: PromptUnderstandingObject;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}
