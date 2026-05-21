/**
 * ============================================================================
 * ULTRA-PREMIUM WEBSITE GENERATOR — SYSTEM ENTRY POINT
 * ============================================================================
 * Exports the public API for generating SiteBlueprint JSON objects.
 */

// ── Type Exports ────────────────────────────────────────────────────────────
export type {
  SiteBlueprint,
  Page,
  Section,
  ComponentConfig,
  AssetSlot,
  BackgroundLayer,
  ThreeDParams,
  ShaderParams,
  TypographySpec,
  ColorPalette,
  SpacingScale,
  NicheCopy,
  ComponentName,
  BackgroundType,
  AnimationEntrance,
  ScrollBehavior,
} from "./types/SiteBlueprint";

// ── Registry Exports ────────────────────────────────────────────────────────
export {
  COMPONENT_REGISTRY,
  HERO_COMPONENTS,
  SHOWCASE_COMPONENTS,
  CONTENT_COMPONENTS,
  CONVERSION_COMPONENTS,
  FOOTER_COMPONENTS,
  NAVIGATION_COMPONENTS,
  TRANSITION_COMPONENTS,
  ALL_COMPONENT_NAMES,
  getComponentByName,
  getRandomVariant,
  getVariantById,
} from "./registry/ComponentRegistry";

export type {
  ComponentRegistryEntry,
  ComponentVariant,
} from "./registry/ComponentRegistry";

// ── Engine Exports ────────────────────────────────────────────────────────────
export { generateSite } from "./engine/SiteGeneratorEngine";

export {
  assembleSite,
  resolveSlot,
} from "./engine/StructuralChoreographer";

export type {
  ChoreographerSeed,
  SiteAssemblyPlan,
  PageAssembly,
} from "./engine/StructuralChoreographer";

export {
  resolveNicheVocabulary,
  validateNoGenericCopy,
  BANNED_GENERIC_WORDS,
  BASKETBALL_VOCAB,
  WATCHMAKING_VOCAB,
  CYBERSECURITY_VOCAB,
} from "./engine/NicheVocabularyEngine";

export type {
  NicheVocabulary,
} from "./engine/NicheVocabularyEngine";

// ── Niche Presets ────────────────────────────────────────────────────────────
export {
  detectNiche,
  getPreset,
  extractBrandName,
  buildGlobalBackground,
} from "./engine/NichePresets";

// ── Asset Pipeline Exports ────────────────────────────────────────────────────
export {
  generateUniqueImageURL,
  hydrateComponentAssets,
  extractPreloadImageUrls,
  validateImageUniqueness,
} from "./pipeline/AssetHydrator";

export type {
  ImageURLResult,
  AssetHydrationPatch,
} from "./pipeline/AssetHydrator";

export {
  generateUniqueImagePrompt,
  COMPONENT_ASSET_SLOTS,
} from "./pipeline/PromptMutationEngine";

export type {
  ImagePromptContext,
  GeneratedImagePrompt,
} from "./pipeline/PromptMutationEngine";
