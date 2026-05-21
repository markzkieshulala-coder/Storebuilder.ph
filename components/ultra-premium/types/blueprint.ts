/**
 * ============================================================================
 * FRONTEND BLUEPRINT TYPES — Exact mirror of backend SiteBlueprint schema
 * ============================================================================
 * These types guarantee full end-to-end type safety between the generator
 * and the rendering framework.
 */

export type ComponentName =
  | "CinematicHero"
  | "AsymmetricTypographyHero"
  | "ChromaticAberrationHero"
  | "BentoMasonry"
  | "Fluid3DDisplay"
  | "DepthFieldGallery"
  | "OverlappingSplitReveal"
  | "ParallaxTimeline"
  | "VerticalRhythmStack"
  | "HorizonLineScroll"
  | "KineticProductGrid"
  | "OrbitalCarousel"
  | "PerspectiveGrid"
  | "HolographicCTA"
  | "DimensionalCardStack"
  | "LiquidGlassPanel"
  | "CinematicFooter"
  | "GlitchHeader"
  | "TopologyMorph"
  | "VelocityMarquee";

export type AnimationEntrance =
  | "fadeUp" | "clipReveal" | "scaleIn" | "slideFromLeft" | "slideFromRight"
  | "rotateIn" | "blurIn" | "charStagger" | "lineDraw" | "morphShape" | "liquidMerge" | "particleReform";

export type ScrollBehavior =
  | "pin" | "scrub" | "velocity" | "parallax" | "horizontalShift" | "depthScale" | "morphTransition" | "snapToSection";

export type PageTransition = "fade" | "slide" | "morph" | "zoom" | "pageTurn" | "none";

export type NavStyle = "floatingPill" | "minimalBar" | "hamburgerOverlay" | "sidebarDock" | "transparentGlass" | "helixMorph";

export interface AssetSlot {
  blockType: string;
  targetProp: string;
  fallbackContext: string;
  aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | "3:4" | "9:16";
  temperature?: "warm" | "cool" | "neutral" | "dramatic";
  generatedUrl?: string;
  generatedPrompt?: string;
  derivedSeed?: number;
}

export interface ComponentConfig {
  name: ComponentName;
  componentId: string;
  props: Record<string, unknown>;
  assetSlots?: AssetSlot[];
  entrance: AnimationEntrance;
  exit?: AnimationEntrance;
  duration: number;
  staggerDelay?: number;
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

export interface BackgroundLayer {
  type: string;
  zIndex: number;
  opacity: number;
  params: any;
  scrollBehavior: ScrollBehavior | null;
}

export interface ThreeDParams {
  geometry: string;
  materialType: "standard" | "physical" | "shader" | "matcap";
  colorPalette: string[];
  animation: {
    type: string;
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
  fragmentShader?: string;
  vertexShader?: string;
  uniforms?: Record<string, any>;
  intensity?: number;
  speed?: number;
  [key: string]: any;
}

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
  layoutVariant: number;
  responsiveBreak: "mobile" | "tablet" | "desktop" | "ultrawide";
}

export interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

export interface Page {
  id: string;
  path: string;
  meta: PageMeta;
  sections: Section[];
  globalNav: boolean;
  transition: PageTransition;
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  isCta?: boolean;
  dropdown?: Array<{ label: string; path: string }>;
}

export interface Theme {
  typography: {
    headingFont: string;
    bodyFont: string;
    accentFont: string;
    headingScale: number[];
    bodySize: string;
    letterSpacing: string;
    lineHeight: number;
    textTransform: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    background: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    gradients: Array<{ from: string; to: string; angle: number }>;
  };
  spacing: {
    unit: number;
    scale: string[];
    sectionPadding: string;
    containerMaxWidth: string;
    gridGap: string;
  };
  globalBackground: BackgroundLayer | null;
}

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

export interface SiteBlueprint {
  version: string;
  generatedAt: string;
  seed: string;
  niche: string;
  prompt: string;
  theme: Theme;
  pages: Page[];
  navigation: {
    items: NavItem[];
    style: NavStyle;
    scrollBehavior: string;
  };
  globalAssets: {
    fonts: string[];
    icons: string[];
    preloadedImages: Array<{ url: string; seed: number }>;
    threeDModels?: string[];
  };
  copy: NicheCopy;
  choreographer: {
    usedComponents: ComponentName[];
    variationSeed: string;
    structuralHash: string;
  };
}
