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
const IMAGE_COUNT = Math.min(8, Math.max(1, Number(process.env.IMAGE_GEN_COUNT || 4)));
// Total wall-clock budget for the whole image phase. Defaults to 180s; raise via
// IMAGE_ENGINE_TIMEOUT_MS if your SD server is slow (a CPU box at 512px/turbo needs
// roughly 20-40s per image, so 4 images can take a couple of minutes on first run).
const TOTAL_BUDGET_MS = Number(process.env.IMAGE_ENGINE_TIMEOUT_MS || 180000);
// Cap the longest image edge. Turbo models are trained at 512px; big canvases are
// off-distribution and brutally slow on CPU. Override with IMAGE_GEN_MAX_DIM.
const MAX_DIMENSION = Math.max(256, Number(process.env.IMAGE_GEN_MAX_DIM || 768));
// Optional explicit diffusion controls (turbo wants very low values).
const STEPS_OVERRIDE = process.env.IMAGE_GEN_STEPS ? Number(process.env.IMAGE_GEN_STEPS) : undefined;
const CFG_OVERRIDE = process.env.IMAGE_GEN_CFG ? Number(process.env.IMAGE_GEN_CFG) : undefined;

const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Reuse a single engine instance so its repetition-guard memory persists across
// generations (varied visuals between sites, not just within one).
let engineSingleton: WebsiteImageEngine | null = null;
function getEngine(): WebsiteImageEngine {
  if (!engineSingleton) engineSingleton = new WebsiteImageEngine();
  return engineSingleton;
}

/**
 * Quick liveness probe against the SD server's A1111-compatible model endpoint.
 * Returns false fast (3s) if the server is down, so we fall back to placeholders
 * immediately instead of stalling site generation on a long connection timeout.
 */
async function isServerLive(): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3000);
  try {
    const url = new URL('/sdapi/v1/sd-models', IMAGE_GEN_URL).toString();
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
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
  if (IMAGE_GEN_DISABLED) {
    console.warn('[image-provider] IMAGE_GEN_ENABLED=0 → skipping image generation, using placeholders');
    return [];
  }

  const request: WebsiteVisualRequest = {
    websitePrompt: puo.originalPrompt,
    brand: brandFromPuo(puo, brandName),
    assetCount: IMAGE_COUNT,
    outputDir: path.join(PUBLIC_DIR, 'generated'),
    modelPreset: (process.env.IMAGE_GEN_PRESET as 'balanced' | 'premium' | 'fast') || 'fast',
    maxDimension: MAX_DIMENSION,
    backend: { type: 'automatic1111', apiUrl: IMAGE_GEN_URL },
  };
  if (STEPS_OVERRIDE !== undefined && !Number.isNaN(STEPS_OVERRIDE)) request.steps = STEPS_OVERRIDE;
  if (CFG_OVERRIDE !== undefined && !Number.isNaN(CFG_OVERRIDE)) request.cfgScale = CFG_OVERRIDE;
  if (brandName) request.siteName = brandName;

  // Fail fast if the SD server isn't reachable, instead of waiting out the whole
  // budget on a TCP timeout. This is the #1 reason sites render with placeholders.
  if (!(await isServerLive())) {
    console.warn(
      `[image-provider] Stable Diffusion server not reachable at ${IMAGE_GEN_URL} → rendering placeholders.\n` +
      `  → Start it: (Windows) cd tools\\image-generator; .\\run.ps1   (macOS/Linux) cd tools/image-generator; ./run.sh\n` +
      `  → Then set IMAGE_GEN_ENABLED=1 and IMAGE_GEN_URL=${IMAGE_GEN_URL} in .env.local and regenerate.`,
    );
    return [];
  }

  const t0 = Date.now();
  console.log(`[image-provider] generating ${IMAGE_COUNT} image(s) via ${IMAGE_GEN_URL} (preset=${request.modelPreset}, maxDim=${MAX_DIMENSION}) …`);

  // Bound the whole phase so a slow/offline model never hangs site generation.
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TOTAL_BUDGET_MS));
  try {
    const result = await Promise.race([getEngine().generate(request), timeout]);
    if (!result) {
      console.warn(
        `[image-provider] image engine timed out after ${TOTAL_BUDGET_MS}ms; rendering placeholders.\n` +
        `  → Your machine is generating slower than the budget. Raise IMAGE_ENGINE_TIMEOUT_MS, lower IMAGE_GEN_COUNT, ` +
        `or lower IMAGE_GEN_MAX_DIM (e.g. 512) in .env.local.`,
      );
      return [];
    }
    const urls = result.assets.map((a) => toPublicUrl(a.filePath));
    console.log(`[image-provider] generated ${urls.length} real image(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${urls.join(', ')}`);
    return urls;
  } catch (err) {
    // SD server offline / request failed → graceful placeholders, never throw.
    console.warn('[image-provider] image engine failed; rendering placeholders:', (err as Error)?.message);
    return [];
  }
}
