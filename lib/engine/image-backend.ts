// ---------------------------------------------------------------------------
// IMAGE BACKEND
//
// Produces every image for a generated site WITHOUT any third-party source.
// No Unsplash, no Pexels, no stock-photo APIs, no shared CDN library.
//
// Two in-house paths, in priority order:
//   1. Your OWN self-hosted diffusion generator (Stable Diffusion / SDXL),
//      reachable at IMAGE_GEN_URL. Produces photoreal, niche-matched images and
//      caches them to /public/generated. Used automatically when the service is
//      running.
//   2. The in-process generative VISUAL ENGINE (lib/engine/visual-engine.ts) —
//      synthesizes premium branded SVG artwork from the same understanding that
//      drives the layout. It is ALWAYS available, needs no network, and is seeded
//      per (prompt-fingerprint × slot) so every image is UNIQUE — two sites in
//      the same niche never get the same visual, and no image repeats within a
//      site. This is the guaranteed source; the site can never break or fall back
//      to a repeated stock photo.
//
// Configure the optional self-hosted generator with IMAGE_GEN_URL (defaults to an
// AUTOMATIC1111-compatible API at http://127.0.0.1:7860, which the reference
// service in tools/image-generator also speaks). When it is unreachable the
// engine transparently uses the in-process visual engine.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';
import { buildImagePrompt } from './image-agent';
import type { ImageRole, ImagePromptSpec } from './image-agent';
import { generateVisualDataUri } from './visual-engine';
import type { VisualPalette } from './visual-engine';
import { registerImage, flushImageUpgrades } from './image-cache';

const IMAGE_GEN_URL = process.env.IMAGE_GEN_URL || 'http://127.0.0.1:7860';
// The self-hosted generator is probed automatically. Set IMAGE_GEN_ENABLED=0 to
// skip it entirely and always use the in-process visual engine.
const IMAGE_GEN_DISABLED = process.env.IMAGE_GEN_ENABLED === '0' || process.env.IMAGE_GEN_ENABLED === 'false';
// Per-image generation budget (ms) for the BACKGROUND upgrade pass. Generous, as
// it no longer blocks the page response — the user already has their site.
const PER_IMAGE_TIMEOUT = Number(process.env.IMAGE_GEN_TIMEOUT_MS || 120000);
// How many DISTINCT site-level images to surface (assigned across sections).
const DISTINCT_IMAGES = Number(process.env.IMAGE_GEN_COUNT || 12);

// Slot → role mapping (mirrors the renderer's section ordering).
const SLOT_ROLES: ImageRole[] = ['hero', 'split', 'feature', 'gallery', 'product', 'cta'];

/**
 * Call the local AUTOMATIC1111-compatible generator. Returns a base64 PNG
 * (without data-uri prefix) or null on any failure/timeout.
 */
async function callLocalGenerator(spec: ImagePromptSpec): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PER_IMAGE_TIMEOUT);
  try {
    const res = await fetch(`${IMAGE_GEN_URL}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: spec.prompt,
        negative_prompt: spec.negative,
        seed: spec.seed,
        width: spec.width,
        height: spec.height,
        steps: Number(process.env.IMAGE_GEN_STEPS || 4),   // turbo models: few steps
        cfg_scale: Number(process.env.IMAGE_GEN_CFG || 1),
        sampler_name: process.env.IMAGE_GEN_SAMPLER || 'Euler a',
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = await res.json() as { images?: string[] };
    const b64 = data.images?.[0];
    return b64 ? b64.replace(/^data:image\/\w+;base64,/, '') : null;
  } catch {
    return null; // generator not running / timed out / network error
  } finally {
    clearTimeout(timer);
  }
}

// In-process generative visual engine — the guaranteed, always-unique source.
function visualEngine(puo: PromptUnderstandingObject, role: ImageRole, seed: number, subject?: string): string {
  const cp = puo.visual.colorPalette;
  const palette: VisualPalette = {
    primary: cp.primary, secondary: cp.secondary, accent: cp.accent,
    background: cp.background, surface: cp.surface, text: cp.text, muted: cp.muted,
  };
  return generateVisualDataUri({
    palette,
    mood: puo.visualMood as string,
    style: puo.designStyle as string,
    niche: puo.inferredIndustry.toLowerCase(),
    rawNiche: puo.inferredIndustry.toLowerCase(),
    keywords: puo.extractedKeywords.map(k => k.toLowerCase()),
    seed,
    role,
    subject,
  });
}

/**
 * Quick liveness probe for the self-hosted generator so the background pass can
 * skip work entirely when the diffusion server isn't running.
 */
async function generatorAvailable(): Promise<boolean> {
  if (IMAGE_GEN_DISABLED) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(`${IMAGE_GEN_URL}/sdapi/v1/sd-models`, { signal: ctrl.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Produce the full site-level image set. Returns INSTANTLY: every slot gets an
 * in-house placeholder (the generative visual engine) written to the public
 * cache, and — when the self-hosted diffusion server is running — is queued for
 * a background real-photo upgrade (see startBackgroundImageUpgrade). Never
 * throws, never repeats, never contacts a third-party source.
 */
export async function generateSiteImages(puo: PromptUnderstandingObject, fp: number): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < DISTINCT_IMAGES; i++) {
    const role = SLOT_ROLES[i % SLOT_ROLES.length];
    // Unique seed per (prompt × slot): different prompts AND different slots
    // never collide, so no two sites and no two sections share a visual.
    const seed = (Math.abs(fp) ^ ((i + 1) * 0x9e3779b1)) >>> 0;

    const visual = visualEngine(puo, role, seed);
    // The SD spec to upgrade this slot to a real photo (used by the bg pass).
    const spec = buildImagePrompt(puo, role, i);
    // registerImage writes the instant placeholder + queues the upgrade; for
    // non-PNG visuals it just returns the inline data uri (no swap).
    results.push(registerImage(visual, spec));
  }

  return results;
}

/**
 * Generate an in-house product/feature image keyed to a specific NAME (e.g.
 * "Single Origin Espresso"). Returns instantly with a placeholder and queues the
 * real-photo upgrade. Called from the synchronous renderer.
 */
export function productImage(puo: PromptUnderstandingObject, name: string, seed: number): string {
  const visual = visualEngine(puo, 'product', seed, name);
  const spec = buildImagePrompt(puo, 'product', seed, name);
  return registerImage(visual, spec);
}

/**
 * Fire-and-forget the background real-photo upgrade. Call AFTER the site HTML
 * has been produced. If the diffusion server isn't running this is a no-op
 * (placeholders remain). Safe to call on every generation; never throws.
 */
export function startBackgroundImageUpgrade(): void {
  void (async () => {
    try {
      if (!(await generatorAvailable())) return;
      await flushImageUpgrades(callLocalGenerator);
    } catch { /* background best-effort */ }
  })();
}

export { DISTINCT_IMAGES };
