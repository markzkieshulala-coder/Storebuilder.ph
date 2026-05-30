// ---------------------------------------------------------------------------
// IMAGE PROVIDER  —  bridges the website generator to the Website Image Engine
//
// This is the single seam between the deterministic site generator and the
// uploaded Website Image Engine (lib/engine/image-engine). They run as ONE
// system: the site generator resolves the prompt into a PromptUnderstandingObject
// (niche, palette, mood, keywords); this provider hands that brief to the image
// engine, which analyses it and generates real, unique, niche-matched photos via
// your local Stable Diffusion (Automatic1111) server, writing PNGs into
// public/generated. The returned public URLs are injected into the rendered page.
//
// Robustness: image generation runs against a local model and can be slow or
// offline. We bound it with a total timeout and always fall back to an empty
// list (→ neutral CSS placeholders) so site generation NEVER hangs or breaks.
// No third-party image source is contacted — only your own local SD server.
// ---------------------------------------------------------------------------

import path from 'path';
import type { PromptUnderstandingObject } from './prompt-engine';
import { WebsiteImageEngine } from './image-engine';
import type { BrandContext, WebsiteVisualRequest } from './image-engine/types';

// Your local Automatic1111 / Stable Diffusion server (same one tools/image-generator runs).
const IMAGE_GEN_URL = process.env.IMAGE_GEN_URL || 'http://127.0.0.1:7860';
// Set IMAGE_GEN_ENABLED=0 to skip generation entirely and render neutral placeholders.
const IMAGE_GEN_DISABLED = process.env.IMAGE_GEN_ENABLED === '0' || process.env.IMAGE_GEN_ENABLED === 'false';
// How many distinct images to generate per site (engine caps at 8).
const IMAGE_COUNT = Math.min(8, Math.max(1, Number(process.env.IMAGE_GEN_COUNT || 6)));
// Total wall-clock budget for the whole image phase. On a slow CPU, exceeding
// this falls back to placeholders rather than blocking the page.
const TOTAL_BUDGET_MS = Number(process.env.IMAGE_ENGINE_TIMEOUT_MS || 180000);

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Reuse a single engine instance so its repetition-guard memory persists across
// generations (varied visuals between sites, not just within one).
let engineSingleton: WebsiteImageEngine | null = null;
function getEngine(): WebsiteImageEngine {
  if (!engineSingleton) engineSingleton = new WebsiteImageEngine();
  return engineSingleton;
}

/** Convert an absolute file path under /public into a web URL (/generated/x.png). */
function toPublicUrl(filePath: string): string {
  const rel = path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/');
  return '/' + rel;
}

/** Build the image engine's brand context from the resolved understanding. */
function brandFromPuo(puo: PromptUnderstandingObject, brandName?: string): BrandContext {
  const cp = puo.visual.colorPalette;
  const colors = [cp.primary, cp.secondary, cp.accent].filter(Boolean) as string[];
  const brand: BrandContext = {
    colors,
    tone: String(puo.visualMood || ''),
    existingVisualNotes: String(puo.designStyle || ''),
  };
  if (brandName) brand.name = brandName;
  if (puo.inferredIndustry) brand.description = `${puo.inferredIndustry} website`;
  return brand;
}

/**
 * Produce the ordered list of image URLs for a site by running the Website Image
 * Engine against the resolved prompt understanding. Returns [] (→ neutral CSS
 * placeholders) if generation is disabled, times out, or the SD server is down.
 */
export async function generateSiteImages(
  puo: PromptUnderstandingObject,
  _fp: number,
  brandName?: string,
): Promise<string[]> {
  if (IMAGE_GEN_DISABLED) return [];

  const request: WebsiteVisualRequest = {
    websitePrompt: puo.originalPrompt,
    brand: brandFromPuo(puo, brandName),
    assetCount: IMAGE_COUNT,
    outputDir: path.join(PUBLIC_DIR, 'generated'),
    modelPreset: (process.env.IMAGE_GEN_PRESET as 'balanced' | 'premium' | 'fast') || 'premium',
    backend: { type: 'automatic1111', apiUrl: IMAGE_GEN_URL },
  };
  if (brandName) request.siteName = brandName;

  // Bound the whole phase so a slow/offline model never hangs site generation.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TOTAL_BUDGET_MS));
  try {
    const result = await Promise.race([getEngine().generate(request), timeout]);
    if (!result) {
      console.warn('[image-provider] image engine timed out; rendering neutral placeholders');
      return [];
    }
    return result.assets.map((a) => toPublicUrl(a.filePath));
  } catch (err) {
    // SD server offline / request failed → graceful placeholders, never throw.
    console.warn('[image-provider] image engine unavailable; rendering neutral placeholders:', (err as Error)?.message);
    return [];
  }
}
