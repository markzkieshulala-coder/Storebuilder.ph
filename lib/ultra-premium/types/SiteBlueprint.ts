/**
 * ============================================================================
 * ULTRA-PREMIUM WEBSITE GENERATOR — TYPESCRIPT SCHEMAS
 * ============================================================================
 * This file defines the strict, high-fidelity JSON schema that guarantees
 * a perfectly typed output for every site generation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ENUMS & NAMESPACE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type NicheVocabularyMap = Record<string, {
  nav: string[];
  buttons: string[];
  labels: string[];
  verbs: string[];
  adjectives: string[];
}>;

export type ComponentName =
  | "CinematicHero"
  | "BentoMasonry"
  | "OverlappingSplitReveal"
  | "AsymmetricTypographyHero"
  | "Fluid3DDisplay"
  | "KineticProductGrid"
  | "VerticalRhythmStack"
  | "HorizonLineScroll"
  | "OrbitalCarousel"
  | "SplitTextReveal"
  | "DepthFieldGallery"
  | "ParallaxTimeline"
  | "LiquidGlassPanel"
  | "MagneticGrid"
  | "CinematicFooter"
  | "GlitchHeader"
  | "PerspectiveGrid"
  | "NeuralNetworkGraph"
  | "VelocityMarquee"
  | "HolographicCTA"
  | "DimensionalCardStack"
  | "ChromaticAberrationHero"
  | "SpatialAudioViz"
  | "TopologyMorph"
  | "CinematicFadeGrid"
  | "HelixScrollShowcase";

export type BackgroundType =
  | "particleField"
  | "gradientMesh"
  | "shaderNoise"
  | "cinematicVideo"
  | "3dGeometry"
  | "strokeReveal"
  | "liquidSimulation"
  | "auroraBorealis"
  | "kineticTypographyField"
  | "nebulaDepth"
  | "glassRefraction";

export type AnimationEntrance =
  | "fadeUp"
  | "clipReveal"
  | "scaleIn"
  | "slideFromLeft"
  | "slideFromRight"
  | "rotateIn"
  | "blurIn"
  | "charStagger"
  | "lineDraw"
  | "morphShape"
  | "liquidMerge"
  | "particleReform";

export type ScrollBehavior =
  | "pin"
  | "scrub"
  | "velocity"
  | "parallax"
  | "horizontalShift"
  | "depthScale"
  | "morphTransition"
  | "snapToSection";

// ─────────────────────────────────────────────────────────────────────────────
// 3D BACKGROUND PARAMETERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ThreeDParams {
  geometry: string;              // e.g., "icosahedron", "torusKnot", "splineTerrain", "morphSphere"
  materialType: "standard" | "physical" | "shader" | "matcap";
  colorPalette: string[];        // hex codes
  animation: {
    type: "orbit" | "pulse" | "morph" | "wind" | "magneticMouse" | "autoRotate";
    speed: number;
    intensity: number;
    mouseInteraction: boolean;
  };
  lighting?: {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; position: [number, number, number] };
    pointLights?: Array<{ color: string; intensity: number; position: [number, number, number] }>;
  };
  postProcessing?: {
    bloom: boolean;
    chromaticAberration: boolean;
    depthOfField: boolean;
    vignette: boolean;
  };
}

export interface ShaderParams {
  shaderName: string;            // e.g., "perlinNoise", "voronoiDisplacement", "fractalBrownian"
  uniforms: Record<string, { type: "float" | "vec2" | "vec3" | "vec4"; value: number | number[] }>;
  blendMode: "normal" | "add" | "multiply" | "overlay" | "screen";
}

export interface BackgroundLayer {
  type: BackgroundType;
  zIndex: number;
  opacity: number;
  params: ThreeDParams | ShaderParams | { videoSrc?: string; playbackRate?: number } | null;
  scrollBehavior: ScrollBehavior | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY & DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

export interface TypographySpec {
  headingFont: string;
  bodyFont: string;
  accentFont: string;
  headingScale: number[];        // modular scale ratios [hero, h1, h2, h3]
  bodySize: string;
  letterSpacing: string;
  lineHeight: number;
  textTransform: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  background: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gradients: Array<{ from: string; to: string; angle: number }>;
}

export interface SpacingScale {
  unit: number;
  scale: string[];               // e.g., ["0.25rem", "0.5rem", "1rem", "2rem", "4rem", "8rem", "16rem"]
  sectionPadding: string;
  containerMaxWidth: string;
  gridGap: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COPYWRITING & MICRO-COPY
// ─────────────────────────────────────────────────────────────────────────────

export interface NicheCopy {
  navigation: string[];
  hero: {
    headline: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badgeLabel?: string;
  };
  sections: Array<{
    componentId: string;
    heading: string;
    body: string;
    cta?: string;
    microCopy: string[];
  }>;
  footer: {
    links: string[];
    copyright: string;
    tagline: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface AssetSlot {
  blockType: string;             // hero | showcase | card | background | thumbnail | banner | portrait | texture | icon | transition
  targetProp: string;            // which prop key receives the generated image URL
  fallbackContext: string;         // default localized text when component copy is absent
  aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | "3:4" | "9:16";
  temperature?: "warm" | "cool" | "neutral" | "dramatic";
  generatedUrl?: string;         // populated during asset hydration (Phase 7)
  generatedPrompt?: string;        // the exact prompt string sent to the image generator
  derivedSeed?: number;            // the cryptographic seed used for this image
}

export interface ComponentConfig {
  name: ComponentName;
  componentId: string;           // UUID-like unique identifier
  props: Record<string, unknown>;
  assetSlots?: AssetSlot[];        // declared by registry; hydrated during schema assembly
  entrance: AnimationEntrance;
  exit?: AnimationEntrance;
  duration: number;              // ms
  staggerDelay?: number;          // ms, for child elements
  scrollTrigger?: {
    trigger: string;
    start: string;
    end?: string;
    scrub?: boolean | number;
    pin?: boolean;
    markers?: boolean;
  };
  background?: BackgroundLayer | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface Section {
  id: string;
  name: string;
  order: number;
  component: ComponentConfig;
  copy: {
    heading: string;
    body: string;
    cta?: string;
    microCopy: string[];
  };
  layoutVariant: number;          // 1..N for same component's structural variants
  responsiveBreak: "mobile" | "tablet" | "desktop" | "ultrawide";
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export interface Page {
  id: string;
  path: string;
  meta: {
    title: string;
    description: string;
    ogImage?: string;
    canonical?: string;
    noIndex?: boolean;
  };
  sections: Section[];
  globalNav: boolean;             // does this page participate in global nav?
  transition: "fade" | "slide" | "morph" | "zoom" | "pageTurn" | "none";
}

// ─────────────────────────────────────────────────────────────────────────────
// SITE BLUEPRINT (ROOT)
// ─────────────────────────────────────────────────────────────────────────────

export interface SiteBlueprint {
  version: "2.0.0-ultra-premium";
  generatedAt: string;            // ISO 8601
  seed: string;                   // generation seed for reproducibility
  niche: string;
  prompt: string;
  theme: {
    typography: TypographySpec;
    colors: ColorPalette;
    spacing: SpacingScale;
    globalBackground: BackgroundLayer | null;
  };
  pages: Page[];
  navigation: {
    items: Array<{
      label: string;
      path: string;
      icon?: string;
      isCta?: boolean;
      dropdown?: Array<{ label: string; path: string }>;
    }>;
    style: "floatingPill" | "minimalBar" | "hamburgerOverlay" | "sidebarDock" | "transparentGlass" | "helixMorph";
    scrollBehavior: "hide" | "shrink" | "glassMorphism" | "colorShift" | "none";
  };
  globalAssets: {
    fonts: string[];
    icons: string[];
    preloadedImages: string[];
    threeDModels?: string[];
  };
  copy: NicheCopy;
  choreographer: {
    usedComponents: ComponentName[];
    variationSeed: string;
    structuralHash: string;       // SHA-like hash of component assembly order
  };
}
