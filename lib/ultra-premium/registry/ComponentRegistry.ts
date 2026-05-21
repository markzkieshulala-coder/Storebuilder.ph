/**
 * ============================================================================
 * COMPONENT REGISTRY — INFINITE VARIATION MATRIX
 * ============================================================================
 * This registry defines 25 ultra-premium structural components. Each component
 * exposes N layout variants so the structural choreographer never repeats.
 *
 * RULE: When assembling a site, the choreographer MUST pick a unique
 * combination of components and variants per page, per generation.
 */

import type { ComponentName, ScrollBehavior } from "../types/SiteBlueprint";
export type { ComponentName, ScrollBehavior };

export type ComponentVariant = {
  id: number;
  name: string;
  structuralDiff: string;         // human-readable diff vs base
  gridTemplate?: string;          // CSS grid-template-areas or flex directive
  zIndexLayers?: number[];
  entranceStagger: number;        // ms between child elements
};

export interface ComponentRegistryEntry {
  name: string;
  category: "hero" | "showcase" | "content" | "interactive" | "conversion" | "footer" | "navigation" | "transition";
  description: string;
  minPagesRecommended: number;
  maxInstancesPerPage: number;
  variants: ComponentVariant[];
  propSchema: Record<string, "string" | "number" | "boolean" | "array" | "object">;
  /** Asset slots declare which props receive dynamically generated images. */
  assetSlots?: Array<{
    blockType: string;
    targetProp: string;
    fallbackContext: string;
    aspectRatio?: "16:9" | "4:3" | "1:1" | "21:9" | "3:4" | "9:16";
  }>;
  required3D: boolean;
  requiredShader: boolean;
  scrollBehavior: ScrollBehavior | null;
  responsiveNotes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CinematicHero: ComponentRegistryEntry = {
  name: "CinematicHero",
  category: "hero",
  description: "Full-viewport immersive hero with layered depth, particle fields, and scroll-driven camera movement.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "DuoLayerReveal", structuralDiff: "Text sits above a splitting video plane; video splits vertically on load", entranceStagger: 120 },
    { id: 2, name: "OrbitalDepth", structuralDiff: "Camera orbits a central 3D element while text types in at varying depths", entranceStagger: 200 },
    { id: 3, name: "SplitScreenParallax", structuralDiff: "Left 40% holds typography, right 60% holds full-bleed media with 2x parallax speed", entranceStagger: 150 },
    { id: 4, name: "BottomCrawlReveal", structuralDiff: "Hero text rises from below the fold as user scrolls; media pinned behind", entranceStagger: 180 },
    { id: 5, name: "GlassOverlayFocus", structuralDiff: "Centered frosted-glass card floats above background; background blurs on hover", entranceStagger: 100 },
  ],
  propSchema: { headline: "string", subheadline: "string", ctaPrimary: "string", ctaSecondary: "string", mediaSrc: "string", depthLayers: "number" },
  assetSlots: [
    { blockType: "hero", targetProp: "mediaSrc", fallbackContext: "Cinematic arena wide shot with dramatic court lighting", aspectRatio: "16:9" },
    { blockType: "texture", targetProp: "depthLayers", fallbackContext: "Particle depth-layer texture for volumetric hero background", aspectRatio: "16:9" },
  ],
  required3D: true,
  requiredShader: false,
  scrollBehavior: "pin",
  responsiveNotes: "On mobile, collapse to stacked with media above text; disable 3D on low-power mode.",
};

const AsymmetricTypographyHero: ComponentRegistryEntry = {
  name: "AsymmetricTypographyHero",
  category: "hero",
  description: "Typography-first hero with extreme scale contrast, diagonal alignment, and kinetic letter-spacing.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "DiagonalSlice", structuralDiff: "Text slices along a 15deg diagonal axis; media revealed through the slice gap", entranceStagger: 250 },
    { id: 2, name: "VerticalStackExplosion", structuralDiff: "Letters stack vertically on mobile, explode to horizontal on desktop", entranceStagger: 80 },
    { id: 3, name: "NegativeSpaceAnchor", structuralDiff: "Giant anchor letter fills 80% viewport; smaller text floats in its negative space", entranceStagger: 300 },
    { id: 4, name: "TypeMaskVideo", structuralDiff: "Headline acts as a mask for background video; letters reveal different video regions", entranceStagger: 150 },
    { id: 5, name: "StaggeredBaseline", structuralDiff: "Each word sits on a different baseline height, creating a wave pattern", entranceStagger: 200 },
  ],
  propSchema: { headline: "string", subheadline: "string", anchorChar: "string", colorMode: "string" },
  assetSlots: [
    { blockType: "hero", targetProp: "mediaSrc", fallbackContext: "Dramatic kinetic typography backdrop with abstract architectural forms", aspectRatio: "16:9" },
  ],
  required3D: false,
  requiredShader: true,
  scrollBehavior: "scrub",
  responsiveNotes: "Reduce font-scale ratio by 40% on mobile; ensure minimum 16px body text.",
};

// ─────────────────────────────────────────────────────────────────────────────
// SHOWCASE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const BentoMasonry: ComponentRegistryEntry = {
  name: "BentoMasonry",
  category: "showcase",
  description: "Dense, asymmetric masonry grid with variable aspect ratios and hover-driven content reveals.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "DensePacked", structuralDiff: "12-column CSS grid with span-2/span-3/span-4 tiles; no gaps between tiles", entranceStagger: 100, gridTemplate: "repeat(12, 1fr)" },
    { id: 2, name: "FloatingCards", structuralDiff: "Cards float with variable Z-depth and drop-shadow; staggered margins", entranceStagger: 150, zIndexLayers: [1, 2, 3, 4, 5] },
    { id: 3, name: "RadialOrbit", structuralDiff: "Central hero tile with satellite tiles orbiting on hover; CSS conic gradient background", entranceStagger: 120 },
    { id: 4, name: "AccordionStack", structuralDiff: "Horizontal accordion; clicking a tile expands it to 60% width, compresses neighbors", entranceStagger: 200 },
    { id: 5, name: "ParallaxDepthGrid", structuralDiff: "Each tile lives on a different translateZ layer; mouse parallax shifts them", entranceStagger: 90 },
  ],
  propSchema: { items: "array", columns: "number", gap: "string", aspectRatios: "array" },
  assetSlots: [
    { blockType: "card", targetProp: "items", fallbackContext: "Premium product or showcase tile in bento-grid layout", aspectRatio: "4:3" },
    { blockType: "card", targetProp: "items", fallbackContext: "Secondary bento-grid tile with abstract architectural forms", aspectRatio: "1:1" },
  ],
  required3D: false,
  requiredShader: false,
  scrollBehavior: "parallax",
  responsiveNotes: "On tablet, collapse to 2-column. On mobile, single-column swipeable carousel.",
};

const Fluid3DDisplay: ComponentRegistryEntry = {
  name: "Fluid3DDisplay",
  category: "showcase",
  description: "Three-dimensional carousel or gallery where items float in 3D space with physics-based drag.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "CylinderCarousel", structuralDiff: "Items arranged on a cylinder surface; drag rotates cylinder", entranceStagger: 200 },
    { id: 2, name: "ScatterField", structuralDiff: "Items scattered in 3D volume; click attracts them to a focal plane", entranceStagger: 150 },
    { id: 3, name: "HelixScroll", structuralDiff: "Items form a DNA helix; vertical scroll rotates the helix", entranceStagger: 100 },
    { id: 4, name: "MorphPlane", structuralDiff: "Single plane that morphs geometry between items on navigation click", entranceStagger: 300 },
    { id: 5, name: "GravityWell", structuralDiff: "Items orbit a central gravity point; mouse movement shifts the well", entranceStagger: 120 },
  ],
  propSchema: { items: "array", geometryType: "string", physicsEnabled: "boolean", autoRotate: "boolean" },
  assetSlots: [
    { blockType: "showcase", targetProp: "items", fallbackContext: "3D floating product or showcase item in volumetric space", aspectRatio: "4:3" },
    { blockType: "background", targetProp: "items", fallbackContext: "Atmospheric depth background for 3D floating display environment", aspectRatio: "16:9" },
  ],
  required3D: true,
  requiredShader: true,
  scrollBehavior: "scrub",
  responsiveNotes: "Fallback to 2D swipeable carousel on mobile; reduce particle count by 70%.",
};

const DepthFieldGallery: ComponentRegistryEntry = {
  name: "DepthFieldGallery",
  category: "showcase",
  description: "Image gallery simulating camera depth-of-field: focused image sharp, peripherals blurred.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "HorizontalTrack", structuralDiff: "Images on a horizontal track; focused image scales up 1.2x, peripherals blur", entranceStagger: 180 },
    { id: 2, name: "CircularFocus", structuralDiff: "Images arranged radially; center image in focus, outer ring heavily blurred", entranceStagger: 150 },
    { id: 3, name: "StackOfCards", structuralDiff: "Images stacked like Polaroids; clicking one brings it to front with focus", entranceStagger: 100 },
    { id: 4, name: "ScrollAperture", structuralDiff: "Fixed aperture mask; scroll moves images behind the mask, focus shifts", entranceStagger: 200 },
    { id: 5, name: "DualPlane", structuralDiff: "Foreground and background image layers; parallax separation creates depth illusion", entranceStagger: 120 },
  ],
  propSchema: { images: "array", focusRange: "number", blurAmount: "number", transitionDuration: "number" },
  assetSlots: [
    { blockType: "showcase", targetProp: "images", fallbackContext: "Gallery image with depth-of-field cinematic blur and luxury lighting", aspectRatio: "4:3" },
    { blockType: "showcase", targetProp: "images", fallbackContext: "Secondary gallery frame with bokeh-rich background", aspectRatio: "3:4" },
  ],
  required3D: false,
  requiredShader: true,
  scrollBehavior: "scrub",
  responsiveNotes: "Use CSS filter blur on mobile instead of shader; reduce image count to 6.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const OverlappingSplitReveal: ComponentRegistryEntry = {
  name: "OverlappingSplitReveal",
  category: "content",
  description: "Two-column layout where text and media panels overlap, revealing on scroll.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 3,
  variants: [
    { id: 1, name: "Overlap50", structuralDiff: "Text column overlaps media by 50%; media revealed through text backdrop-filter", entranceStagger: 160 },
    { id: 2, name: "ZigZagFlow", structuralDiff: "Alternating left-right overlap; each section offset by 15vh creating zigzag rhythm", entranceStagger: 140 },
    { id: 3, name: "MaskReveal", structuralDiff: "Media starts masked by text shape; scroll unmasks to full rectangle", entranceStagger: 200 },
    { id: 4, name: "StickyText", structuralDiff: "Text pins while media scrolls past in adjacent column; multiple media blocks", entranceStagger: 180 },
    { id: 5, name: "DiagonalSplit", structuralDiff: "Diagonal clip-path divider between text and media; rotates on hover", entranceStagger: 150 },
  ],
  propSchema: { heading: "string", body: "string", mediaSrc: "string", overlapPercent: "number", alignment: "string" },
  assetSlots: [
    { blockType: "showcase", targetProp: "mediaSrc", fallbackContext: "Editorial split-layout feature image with overlapping text treatment", aspectRatio: "4:3" },
  ],
  required3D: false,
  requiredShader: false,
  scrollBehavior: "scrub",
  responsiveNotes: "On mobile, stack vertically; overlap becomes 0; remove backdrop-filter.",
};

const ParallaxTimeline: ComponentRegistryEntry = {
  name: "ParallaxTimeline",
  category: "content",
  description: "Vertical or horizontal timeline where events have independent parallax speeds.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "CentralSpine", structuralDiff: "Central vertical line with alternating left-right events; line draws on scroll", entranceStagger: 200 },
    { id: 2, name: "StackedCards", structuralDiff: "Events as stacked cards; scroll lifts each card to reveal next", entranceStagger: 250 },
    { id: 3, name: "HorizontalScroll", structuralDiff: "Horizontal scroll container; events move at 0.5x, 1x, 1.5x speeds", entranceStagger: 150 },
    { id: 4, name: "NodeNetwork", structuralDiff: "Events as connected nodes; SVG path draws connections as you scroll", entranceStagger: 180 },
    { id: 5, name: "MilestoneFlags", structuralDiff: "Events as flag markers on a terrain line; terrain undulates", entranceStagger: 120 },
  ],
  propSchema: { events: "array", direction: "string", lineColor: "string", nodeShape: "string" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "velocity",
  responsiveNotes: "Switch to vertical on mobile regardless of desktop direction setting.",
};

const VerticalRhythmStack: ComponentRegistryEntry = {
  name: "VerticalRhythmStack",
  category: "content",
  description: "Tall scrolling section with elements revealed through a strict vertical beat and rhythm.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "BeatDrop", structuralDiff: "Each block drops into place with a spring physics animation; bounces once", entranceStagger: 300 },
    { id: 2, name: "TypewriterColumn", structuralDiff: "Text types in column by column; images fade in after text completes", entranceStagger: 100 },
    { id: 3, name: "AccordionStack", structuralDiff: "Blocks collapse to 4rem height; hover expands to full; only one open at a time", entranceStagger: 200 },
    { id: 4, name: "MasonryReveal", structuralDiff: "Masonry blocks reveal in reading order; stagger follows DOM order not visual", entranceStagger: 80 },
    { id: 5, name: "GradientWipe", structuralDiff: "Each block revealed by a sweeping gradient mask moving left-to-right", entranceStagger: 250 },
  ],
  propSchema: { blocks: "array", rhythmInterval: "number", revealMode: "string" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "snapToSection",
  responsiveNotes: "Reduce rhythm interval by 30% on mobile for faster pacing.",
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const KineticProductGrid: ComponentRegistryEntry = {
  name: "KineticProductGrid",
  category: "interactive",
  description: "E-commerce or portfolio grid where items react to mouse proximity with physics.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "MagneticProximity", structuralDiff: "Items magnetically pull toward cursor within 150px radius; spring return on exit", entranceStagger: 100 },
    { id: 2, name: "RippleExpansion", structuralDiff: "Hovering an item expands it; pushes neighbors away with collision logic", entranceStagger: 120 },
    { id: 3, name: "TiltPerspective", structuralDiff: "Items tilt in 3D toward cursor; maximum 15deg rotation on X/Y axes", entranceStagger: 90 },
    { id: 4, name: "SlotMachine", structuralDiff: "Grid items scroll vertically like slot machine reels on load; settle into grid", entranceStagger: 200 },
    { id: 5, name: "LensMagnify", structuralDiff: "Circular lens follows cursor; items under lens magnify 1.3x with detail reveal", entranceStagger: 150 },
  ],
  propSchema: { items: "array", columns: "number", physicsStrength: "number", hoverEffect: "string" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "parallax",
  responsiveNotes: "Disable physics on touch devices; use tap-to-expand instead.",
};

const OrbitalCarousel: ComponentRegistryEntry = {
  name: "OrbitalCarousel",
  category: "interactive",
  description: "Items arranged on an orbital path; user drags to rotate the orbit.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "EllipticalOrbit", structuralDiff: "Items on an elliptical path; closer items scale up, far items fade", entranceStagger: 180 },
    { id: 2, name: "SaturnRings", structuralDiff: "Multiple concentric rings rotating in opposite directions at different speeds", entranceStagger: 150 },
    { id: 3, name: "FreeOrbit", structuralDiff: "Items in 3D free orbit; mouse drag rotates in any axis", entranceStagger: 200 },
    { id: 4, name: "SpiralPath", structuralDiff: "Items on a 3D spiral; scroll moves camera along the spiral", entranceStagger: 120 },
    { id: 5, name: "GridToOrbit", structuralDiff: "Items start in grid; on interaction, animate to orbital positions", entranceStagger: 300 },
  ],
  propSchema: { items: "array", orbitSpeed: "number", tiltAngle: "number", radius: "number" },
  required3D: true,
  requiredShader: false,
  scrollBehavior: "scrub",
  responsiveNotes: "Reduce to 2D draggable circle on mobile; limit item count to 6.",
};

const PerspectiveGrid: ComponentRegistryEntry = {
  name: "PerspectiveGrid",
  category: "interactive",
  description: "Content items on a 3D perspective grid that folds and unfolds on scroll.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "FoldUnfold", structuralDiff: "Grid starts folded like a map; scroll progressively unfolds sections", entranceStagger: 250 },
    { id: 2, name: "VanishingPoint", structuralDiff: "All grid lines converge to a vanishing point; scroll shifts the VP", entranceStagger: 150 },
    { id: 3, name: "CubeFaces", structuralDiff: "Grid is a cube face; scroll rotates cube to reveal other faces", entranceStagger: 200 },
    { id: 4, name: "OrigamiCrumple", structuralDiff: "Grid crumples into an origami shape on exit; smooths on entrance", entranceStagger: 180 },
    { id: 5, name: "TunnelDepth", structuralDiff: "Grid forms a tunnel; scroll moves camera forward through the tunnel", entranceStagger: 120 },
  ],
  propSchema: { items: "array", perspective: "number", foldOrigin: "string", depth: "number" },
  required3D: true,
  requiredShader: true,
  scrollBehavior: "depthScale",
  responsiveNotes: "Fallback to flat grid with fade-in on mobile; disable WebGL.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSION COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const HolographicCTA: ComponentRegistryEntry = {
  name: "HolographicCTA",
  category: "conversion",
  description: "Call-to-action section with iridescent, light-reactive surfaces and magnetic buttons.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "PrismCard", structuralDiff: "CTA inside a glass card with chromatic aberration edges; light follows mouse", entranceStagger: 200 },
    { id: 2, name: "NeonPulse", structuralDiff: "Button surrounded by pulsing neon rings; rings expand on hover", entranceStagger: 150 },
    { id: 3, name: "SplitDimension", structuralDiff: "CTA text in one dimension, button in another; parallax separates them", entranceStagger: 180 },
    { id: 4, name: "FloatingIsland", structuralDiff: "CTA sits on a floating 3D island; island tilts with mouse movement", entranceStagger: 250 },
    { id: 5, name: "ScanReveal", structuralDiff: "CTA text hidden; a laser-scan line reveals it on scroll entry", entranceStagger: 300 },
  ],
  propSchema: { headline: "string", buttonText: "string", subtext: "string", hologramColor: "string" },
  required3D: false,
  requiredShader: true,
  scrollBehavior: "scrub",
  responsiveNotes: "Reduce shader complexity on mobile; use CSS gradients instead.",
};

const DimensionalCardStack: ComponentRegistryEntry = {
  name: "DimensionalCardStack",
  category: "conversion",
  description: "Stack of cards that fan out, flip, or cascade on interaction.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "FanOut", structuralDiff: "Cards stack centered; hover fans them out like a hand of cards", entranceStagger: 120 },
    { id: 2, name: "CascadeDrop", structuralDiff: "Cards drop one by one from top; settle into a staggered pile", entranceStagger: 200 },
    { id: 3, name: "FlipDeck", structuralDiff: "All cards show backs; click flips one to reveal content", entranceStagger: 150 },
    { id: 4, name: "SpreadGrid", structuralDiff: "Cards animate from a single stack to a full grid on scroll entry", entranceStagger: 100 },
    { id: 5, name: "CarouselStack", structuralDiff: "Cards in 3D stack; swiping moves front card to back with depth transition", entranceStagger: 180 },
  ],
  propSchema: { cards: "array", stackDepth: "number", spreadAngle: "number", flipDuration: "number" },
  required3D: true,
  requiredShader: false,
  scrollBehavior: "scrub",
  responsiveNotes: "On mobile, use swipe gestures; reduce 3D transforms to preserve performance.",
};

const LiquidGlassPanel: ComponentRegistryEntry = {
  name: "LiquidGlassPanel",
  category: "conversion",
  description: "Panel with liquid-glass material: refraction, caustics, and elastic deformation.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "ElasticSheet", structuralDiff: "Glass sheet deforms elastically when cursor pushes; settles back", entranceStagger: 200 },
    { id: 2, name: "CausticPool", structuralDiff: "Glass over a caustic light pool; pool ripples on interaction", entranceStagger: 150 },
    { id: 3, name: "SplitPane", structuralDiff: "Two glass panes with content; dragging divider changes pane sizes", entranceStagger: 180 },
    { id: 4, name: "MagnifyingLens", structuralDiff: "Content behind glass; lens area magnifies with chromatic separation", entranceStagger: 120 },
    { id: 5, name: "FractureReveal", structuralDiff: "Glass starts cracked; scroll progressively heals cracks to reveal content", entranceStagger: 250 },
  ],
  propSchema: { content: "string", glassOpacity: "number", refractionIndex: "number", deformationStrength: "number" },
  required3D: true,
  requiredShader: true,
  scrollBehavior: "scrub",
  responsiveNotes: "Fallback to frosted-glass CSS on mobile; disable refraction shader.",
};

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER & HEADER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CinematicFooter: ComponentRegistryEntry = {
  name: "CinematicFooter",
  category: "footer",
  description: "Grand footer reveal that acts as a final scene: credits, links, and closing statement.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "CurtainReveal", structuralDiff: "Footer is fixed at bottom, revealed as page content scrolls away like a curtain", entranceStagger: 100 },
    { id: 2, name: "EndCredits", structuralDiff: "Links scroll upward like movie credits; centered, monospace typography", entranceStagger: 80 },
    { id: 3, name: "GrandStatement", structuralDiff: "Single giant closing line fills viewport; links arranged in a ring below", entranceStagger: 200 },
    { id: 4, name: "DepthTunnel", structuralDiff: "Footer links arranged in 3D tunnel; scroll moves through tunnel to center", entranceStagger: 150 },
    { id: 5, name: "MinimalBar", structuralDiff: "Ultra-minimal single bar; legal left, social center, tagline right", entranceStagger: 50 },
  ],
  propSchema: { links: "array", tagline: "string", socialLinks: "array", backgroundMedia: "string" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "pin",
  responsiveNotes: "Stack vertically on mobile; reduce font size for credits variant.",
};

const GlitchHeader: ComponentRegistryEntry = {
  name: "GlitchHeader",
  category: "navigation",
  description: "Navigation header with digital-glitch personality: shifts, flickers, and reassembles.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "ChannelSplit", structuralDiff: "Nav items have RGB channel split on hover; offset 3px per channel", entranceStagger: 100 },
    { id: 2, name: "ScanLineCollapse", structuralDiff: "Nav items compress to scan lines on scroll; expand on hover", entranceStagger: 120 },
    { id: 3, name: "TextScramble", structuralDiff: "Nav labels scramble characters on hover, then resolve to target text", entranceStagger: 150 },
    { id: 4, name: "DataMosh", structuralDiff: "Nav background has subtle datamoshing video on active state", entranceStagger: 80 },
    { id: 5, name: "TerminalType", structuralDiff: "Nav items type in like terminal commands; cursor blinks after each", entranceStagger: 200 },
  ],
  propSchema: { items: "array", glitchIntensity: "number", colorShift: "boolean", noiseOverlay: "boolean" },
  required3D: false,
  requiredShader: true,
  scrollBehavior: null,
  responsiveNotes: "Convert to full-screen overlay menu on mobile; keep glitch effects.",
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION & EFFECT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const ChromaticAberrationHero: ComponentRegistryEntry = {
  name: "ChromaticAberrationHero",
  category: "hero",
  description: "Hero where RGB channels separate based on scroll velocity, creating a distorted, high-energy entrance.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "VelocitySplit", structuralDiff: "Channel separation proportional to scroll speed; fast scroll = extreme split", entranceStagger: 100 },
    { id: 2, name: "MouseChromatic", structuralDiff: "RGB channels offset from cursor position; creates color fringes", entranceStagger: 80 },
    { id: 3, name: "ExplodeMerge", structuralDiff: "Image starts with channels fully separated; merges on scroll into focus", entranceStagger: 200 },
    { id: 4, name: "WaveDistort", structuralDiff: "Channels undulate in sine waves at different frequencies", entranceStagger: 150 },
    { id: 5, name: "EdgeFringe", structuralDiff: "Only edges have chromatic aberration; interior remains clean", entranceStagger: 120 },
  ],
  propSchema: { mediaSrc: "string", aberrationStrength: "number", channelOffset: "number", blendMode: "string" },
  required3D: false,
  requiredShader: true,
  scrollBehavior: "velocity",
  responsiveNotes: "Reduce aberration strength by 50% on mobile to prevent nausea.",
};

const TopologyMorph: ComponentRegistryEntry = {
  name: "TopologyMorph",
  category: "transition",
  description: "Section where a 3D mesh morphs its topology in response to scroll, bridging two content areas.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "SphereToTorus", structuralDiff: "Mesh morphs from sphere to torus as user scrolls between sections", entranceStagger: 300 },
    { id: 2, name: "NoiseTerrain", structuralDiff: "Flat plane becomes mountainous terrain; noise amplitude driven by scroll", entranceStagger: 200 },
    { id: 3, name: "SplitMerge", structuralDiff: "Single mesh splits into two, travels apart, then merges into new shape", entranceStagger: 250 },
    { id: 4, name: "CrystalGrowth", structuralDiff: "Seed crystal grows facets as scroll progresses; fully formed at section end", entranceStagger: 180 },
    { id: 5, name: "FluidBlob", structuralDiff: "Blob shape oscillates between 3-5 stable states; scroll snaps to nearest", entranceStagger: 220 },
  ],
  propSchema: { fromGeometry: "string", toGeometry: "string", morphDuration: "number", colorTransition: "boolean" },
  required3D: true,
  requiredShader: true,
  scrollBehavior: "morphTransition",
  responsiveNotes: "Reduce geometry subdivision level by 60% on mobile.",
};

const VelocityMarquee: ComponentRegistryEntry = {
  name: "VelocityMarquee",
  category: "transition",
  description: "Infinite scrolling text band whose speed reacts to scroll velocity or cursor movement.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 2,
  variants: [
    { id: 1, name: "Bidirectional", structuralDiff: "Two bands scrolling opposite directions; velocity affects both", entranceStagger: 50 },
    { id: 2, name: "StretchCompress", structuralDiff: "Text stretches horizontally when scroll speeds up; compresses when slow", entranceStagger: 80 },
    { id: 3, name: "WavePath", structuralDiff: "Text follows a sine wave path; amplitude increases with scroll speed", entranceStagger: 60 },
    { id: 4, name: "OpacityPulse", structuralDiff: "Text pulses in opacity as it passes viewport center", entranceStagger: 100 },
    { id: 5, name: "3DCylinderWrap", structuralDiff: "Text wraps around a 3D cylinder; rotate cylinder with scroll", entranceStagger: 120 },
  ],
  propSchema: { text: "string", speed: "number", direction: "string", velocitySensitivity: "number" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "velocity",
  responsiveNotes: "Reduce text size and speed on mobile; ensure readability.",
};

const HorizonLineScroll: ComponentRegistryEntry = {
  name: "HorizonLineScroll",
  category: "content",
  description: "Content arranged along a horizontal horizon line that the user scrolls through.",
  minPagesRecommended: 1,
  maxInstancesPerPage: 1,
  variants: [
    { id: 1, name: "InfiniteTrack", structuralDiff: "Horizontal infinite scroll; items loop seamlessly", entranceStagger: 100 },
    { id: 2, name: "DepthLayers", structuralDiff: "Multiple horizontal tracks at different depths (z-index); parallax between them", entranceStagger: 120 },
    { id: 3, name: "AccordionExpand", structuralDiff: "Items compressed; hover expands one while compressing neighbors horizontally", entranceStagger: 150 },
    { id: 4, name: "CarouselCylinder", structuralDiff: "Items arranged on a horizontal cylinder; scroll rotates cylinder", entranceStagger: 180 },
    { id: 5, name: "SnapGallery", structuralDiff: "Scroll snaps to item centers; momentum carries to next snap point", entranceStagger: 90 },
  ],
  propSchema: { items: "array", trackHeight: "string", snapPoints: "boolean", loop: "boolean" },
  required3D: false,
  requiredShader: false,
  scrollBehavior: "horizontalShift",
  responsiveNotes: "On mobile, convert to vertical stack with horizontal swipe hints.",
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL REGISTRY EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const COMPONENT_REGISTRY: Record<string, ComponentRegistryEntry> = {
  CinematicHero,
  AsymmetricTypographyHero,
  BentoMasonry,
  Fluid3DDisplay,
  DepthFieldGallery,
  OverlappingSplitReveal,
  ParallaxTimeline,
  VerticalRhythmStack,
  KineticProductGrid,
  OrbitalCarousel,
  PerspectiveGrid,
  HolographicCTA,
  DimensionalCardStack,
  LiquidGlassPanel,
  CinematicFooter,
  GlitchHeader,
  ChromaticAberrationHero,
  TopologyMorph,
  VelocityMarquee,
  HorizonLineScroll,
};

export const HERO_COMPONENTS = ["CinematicHero", "AsymmetricTypographyHero", "ChromaticAberrationHero"];
export const SHOWCASE_COMPONENTS = ["BentoMasonry", "Fluid3DDisplay", "DepthFieldGallery", "KineticProductGrid", "OrbitalCarousel"];
export const CONTENT_COMPONENTS = ["OverlappingSplitReveal", "ParallaxTimeline", "VerticalRhythmStack", "HorizonLineScroll"];
export const CONVERSION_COMPONENTS = ["HolographicCTA", "DimensionalCardStack", "LiquidGlassPanel", "PerspectiveGrid"];
export const FOOTER_COMPONENTS = ["CinematicFooter"];
export const NAVIGATION_COMPONENTS = ["GlitchHeader"];
export const TRANSITION_COMPONENTS = ["TopologyMorph", "VelocityMarquee"];

export const ALL_COMPONENT_NAMES = Object.keys(COMPONENT_REGISTRY) as ComponentName[];

export function getComponentByName(name: ComponentName): ComponentRegistryEntry | undefined {
  return COMPONENT_REGISTRY[name];
}

export function getRandomVariant(name: ComponentName): { component: ComponentRegistryEntry; variant: ComponentVariant } | null {
  const component = getComponentByName(name);
  if (!component) return null;
  const variant = component.variants[Math.floor(Math.random() * component.variants.length)];
  return { component, variant };
}

export function getVariantById(name: ComponentName, variantId: number): ComponentVariant | null {
  const component = getComponentByName(name);
  if (!component) return null;
  return component.variants.find((v) => v.id === variantId) || null;
}
