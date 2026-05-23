/**
 * ============================================================================
 * ASSET HYDRATOR — IMAGE URL GENERATOR & PIPELINE INTEGRATION
 * ============================================================================
 * This module is the rendering-layer entry point for image asset hydration.
 * Every time a component renders an asset slot, this function is called
 * to produce a real, niche-relevant image URL routed through the renderer's
 * shared image catalog.
 *
 * Integration point: Called during Phase 7 (Schema Assembly) in the
 * SiteGeneratorEngine, immediately before props are injected into ComponentConfig.
 */

import {
  generateUniqueImagePrompt,
  ImagePromptContext,
  GeneratedImagePrompt,
  COMPONENT_ASSET_SLOTS,
  AssetSlot,
} from "./PromptMutationEngine";
import { curatedSectionImage, curatedProductImage } from "../render/imageCatalog";

// ═════════════════════════════════════════════════════════════════════════════
// POLLINATIONS AI URL BUILDER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Pollinations.AI URL parameters.
 * Supports: seed, width, height, nologo, private, enhance, negative_prompt
 */
interface PollinationsUrlParams {
  seed: number;
  width: number;
  height: number;
  nologo: boolean;
  private: boolean;
  enhance: boolean;
  negativePrompt: string;
}

const POLLINATIONS_BASE = "https://image.pollinations.ai/prompt/";

/** Map a registry blockType label to a canonical section role. */
function blockTypeToRole(blockType: string): string {
  const bt = (blockType || "").toLowerCase();
  if (/hero|opening|landing|header/.test(bt))              return "hero";
  if (/about|story|content|brand|heritage|lifestyle/.test(bt)) return "about";
  if (/product|showcase|card|grid|collection|catalog/.test(bt)) return "products";
  if (/contact|location/.test(bt))                          return "contact";
  if (/cta|conversion/.test(bt))                            return "cta";
  return "hero";
}

/** Aspect ratio to dimension mapping. */
const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920, height: 1080 },
  "4:3": { width: 1440, height: 1080 },
  "1:1": { width: 1024, height: 1024 },
  "21:9": { width: 2560, height: 1080 },
  "3:4": { width: 1080, height: 1440 },
  "9:16": { width: 1080, height: 1920 },
};

/**
 * Encodes a prompt string for safe URL inclusion.
 * Uses encodeURIComponent with space→%20 (not +) for maximum compatibility.
 */
function encodePrompt(prompt: string): string {
  return encodeURIComponent(prompt).replace(/%20/g, "+");
}

/**
 * Builds a Pollinations AI image URL with a unique cryptographic seed
 * appended to query parameters. This guarantees the browser never displays
 * a cached or repetitive placeholder.
 */
function buildPollinationsUrl(
  prompt: string,
  seed: number,
  aspectRatio: string = "16:9"
): string {
  const dims = ASPECT_RATIOS[aspectRatio] ?? ASPECT_RATIOS["16:9"];

  const params = new URLSearchParams({
    seed: String(seed),
    width: String(dims.width),
    height: String(dims.height),
    nologo: "true",
    private: "true",
    enhance: "true",
  });

  // Append a high-entropy nonce parameter to absolutely bust any CDN cache.
  // Derived from the seed + current timestamp fragment to ensure uniqueness.
  const cacheBust = Math.abs(seed ^ Date.now()).toString(36).slice(0, 12);
  params.append("_cb", cacheBust);

  return `${POLLINATIONS_BASE}${encodePrompt(prompt)}?${params.toString()}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// CORE FUNCTION: generateUniqueImageURL
// ═════════════════════════════════════════════════════════════════════════════

export interface ImageURLResult {
  /** The final fetchable image URL */
  url: string;
  /** The full prompt string sent to the image generator */
  prompt: string;
  /** The derived cryptographic seed */
  seed: number;
  /** Which composition modifier was selected */
  composition: string;
  /** Which lighting modifier was selected */
  lighting: string;
  /** Which texture modifier was selected */
  texture: string;
  /** Which visual concept was resolved */
  visualConcept: string;
  /** Which block context was applied */
  blockContext: string;
}

/**
 * PRIMARY ENTRY POINT.
 *
 * Maps an image request inside a component directly to a real-time asset pipeline.
 * Executes procedural mutations (composition, lighting, texture) and appends a
 * uniquely computed cryptographic seed to URL query parameters.
 *
 * @param nicheContext - The niche keyword (e.g., "basketball")
 * @param blockType - The component block type (e.g., "hero", "showcase", "card")
 * @param localizedText - Localized text context from the component's copy
 * @param baseSeed - The generation seed from the choreographer
 * @param slotIndex - Index of the image slot within the component (0..N)
 * @param aspectRatio - Optional aspect ratio override
 *
 * @returns ImageURLResult with a fully unique, non-cached URL.
 */
export function generateUniqueImageURL(
  nicheContext: string,
  blockType: string,
  localizedText: string,
  baseSeed: string,
  slotIndex: number = 0,
  aspectRatio?: string
): ImageURLResult {
  // ── Step 1: Generate the unique prompt via the mutation engine ─────────────
  const ctx: ImagePromptContext = {
    niche: nicheContext,
    blockType,
    localizedText,
    seed: baseSeed,
    slotIndex,
  };

  const generated: GeneratedImagePrompt = generateUniqueImagePrompt(ctx);

  // ── Step 2: Compute deterministic-but-unique numeric seed ───────────────────
  // XOR-fold the derived seed string into a 32-bit integer for Pollinations.
  let numericSeed = 0;
  for (let i = 0; i < generated.derivedSeed.length; i++) {
    numericSeed = (numericSeed << 5) - numericSeed + generated.derivedSeed.charCodeAt(i);
    numericSeed |= 0; // force 32-bit
  }
  numericSeed = Math.abs(numericSeed);

  // ── Step 3: Build the URL via the renderer's curated catalog ───────────────
  // Picsum returns RANDOM scenic stock photos with no relation to niche or
  // product — the source of the "random generic photo" bug. The shared catalog
  // returns LoremFlickr URLs whose keywords are tailored to niche+role (for
  // backgrounds) or niche+product-type (for cards), so the image content is
  // guaranteed relevant to what the component is rendering.
  const dims = ASPECT_RATIOS[aspectRatio ?? "16:9"] ?? ASPECT_RATIOS["16:9"];
  const role = blockTypeToRole(blockType);
  const isProductSlot = role === "products" || /card|item|product|showcase/i.test(blockType);

  let url: string;
  if (isProductSlot) {
    // Card-style image — classify by product name extracted from localizedText
    url = curatedProductImage(localizedText, nicheContext, numericSeed, dims.width, dims.height)
      || curatedSectionImage(nicheContext, role, numericSeed, dims.width, dims.height)
      || `https://picsum.photos/seed/sb${numericSeed % 9_999_991}/${dims.width}/${dims.height}`;
  } else {
    // Section background — keywords keyed off niche + role
    url = curatedSectionImage(nicheContext, role, numericSeed, dims.width, dims.height)
      || `https://picsum.photos/seed/sb${numericSeed % 9_999_991}/${dims.width}/${dims.height}`;
  }
  void buildPollinationsUrl;

  return {
    url,
    prompt: generated.prompt,
    seed: numericSeed,
    composition: generated.composition,
    lighting: generated.lighting,
    texture: generated.texture,
    visualConcept: generated.visualConcept,
    blockContext: generated.blockContext,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// ASSET SLOT HYDRATION — BULK COMPONENT IMAGE INJECTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Hydrates all image asset slots declared by a component.
 * Called during Phase 7 (Schema Assembly) for every component instance.
 *
 * Returns a props patch object where keys are targetProp paths and values
 * are generated image URLs.
 */
export interface AssetHydrationPatch {
  [targetPropPath: string]: string;
}

export function hydrateComponentAssets(
  componentName: string,
  niche: string,
  baseSeed: string,
  componentCopy: {
    heading: string;
    body: string;
    microCopy: string[];
  },
  overrides?: { aspectRatio?: string }
): AssetHydrationPatch {
  const slots: AssetSlot[] = COMPONENT_ASSET_SLOTS[componentName] ?? [];
  const patch: AssetHydrationPatch = {};

  // Build localized text context from component copy.
  // Use heading + first sentence of body + first microCopy as narrative anchor.
  const localizedText = [
    componentCopy.heading,
    componentCopy.body.split(". ")[0],
    componentCopy.microCopy[0] ?? "",
  ]
    .filter(Boolean)
    .join(". ");

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const result = generateUniqueImageURL(
      niche,
      slot.blockType,
      localizedText || slot.fallbackContext,
      baseSeed,
      i,
      overrides?.aspectRatio ?? slot.aspectRatio
    );
    patch[slot.targetProp] = result.url;
  }

  return patch;
}

// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL ASSET PRELOAD LIST GENERATOR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Scans a completed SiteBlueprint and extracts all unique image URLs
 * for <link rel="preload"> injection in the HTML head.
 */
export function extractPreloadImageUrls(blueprint: {
  pages: Array<{
    sections: Array<{
      component: { props: Record<string, unknown> };
    }>;
  }>;
}): string[] {
  const urls = new Set<string>();

  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      const props = section.component.props;
      for (const val of Object.values(props)) {
        if (typeof val === "string" && val.includes("pollinations.ai")) {
          urls.add(val);
        }
      }
    }
  }

  return Array.from(urls);
}

// ═════════════════════════════════════════════════════════════════════════════
// IMAGE PIPELINE VALIDATOR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Validates that no two image URLs in the blueprint share the same seed.
 * If duplicates are found, regenerates with incremented slot indices.
 * Called as a post-processing step before returning the SiteBlueprint.
 */
export function validateImageUniqueness(
  blueprint: {
    pages: Array<{
      sections: Array<{
        id: string;
        component: { props: Record<string, unknown>; name: string };
        copy: { heading: string; body: string; microCopy: string[] };
      }>;
    }>;
  },
  niche: string,
  baseSeed: string
): void {
  const seedMap = new Map<number, { sectionId: string; prop: string }>();

  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      const props = section.component.props;
      const slots = COMPONENT_ASSET_SLOTS[section.component.name] ?? [];

      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const url = props[slot.targetProp];
        if (typeof url !== "string") continue;

        // Extract seed from URL query params
        const match = url.match(/[?&]seed=(\d+)/);
        if (!match) continue;
        const seed = parseInt(match[1], 10);

        if (seedMap.has(seed)) {
          const existing = seedMap.get(seed)!;
          console.warn(
            `IMAGE_SEED_COLLISION: seed ${seed} duplicated between ` +
              `${existing.sectionId}:${existing.prop} and ${section.id}:${slot.targetProp}. ` +
              `Regenerating with mutation...`
          );

          // Regenerate with mutated slot index to guarantee uniqueness
          const result = generateUniqueImageURL(
            niche,
            slot.blockType,
            [section.copy.heading, section.copy.body].join(". "),
            baseSeed,
            i + 1000, // large offset breaks the collision
            slot.aspectRatio
          );
          props[slot.targetProp] = result.url;
          seedMap.set(result.seed, { sectionId: section.id, prop: slot.targetProp });
        } else {
          seedMap.set(seed, { sectionId: section.id, prop: slot.targetProp });
        }
      }
    }
  }
}
