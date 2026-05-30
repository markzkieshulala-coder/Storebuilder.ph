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

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { PromptUnderstandingObject } from './prompt-engine';
import { buildImagePrompt } from './image-agent';
import type { ImageRole, ImagePromptSpec } from './image-agent';
import { generateVisualDataUri } from './visual-engine';
import type { VisualPalette } from './visual-engine';

const IMAGE_GEN_URL = process.env.IMAGE_GEN_URL || 'http://127.0.0.1:7860';
// The self-hosted generator is probed automatically. Set IMAGE_GEN_ENABLED=0 to
// skip it entirely and always use the in-process visual engine.
const IMAGE_GEN_DISABLED = process.env.IMAGE_GEN_ENABLED === '0' || process.env.IMAGE_GEN_ENABLED === 'false';
// Per-image generation budget (ms). Keeps the whole request within API maxDuration.
const PER_IMAGE_TIMEOUT = Number(process.env.IMAGE_GEN_TIMEOUT_MS || 25000);
// Overall wall-clock budget for the ENTIRE image phase (ms). Once exceeded we stop
// calling the diffusion server and finish the remaining slots with the instant
// in-process visual engine, so generation never hangs (e.g. on a slow CPU box).
const TOTAL_IMAGE_BUDGET = Number(process.env.IMAGE_GEN_TOTAL_MS || 90000);
// If the diffusion server misses (times out / errors) this many times in a row we
// give up on it for the rest of the site — a slow or unresponsive server should
// cost at most a couple of timeouts, not one per slot.
const MAX_GEN_FAILURES = Number(process.env.IMAGE_GEN_MAX_FAILURES || 2);
// How many DISTINCT images to surface per site (assigned across sections).
const DISTINCT_IMAGES = Number(process.env.IMAGE_GEN_COUNT || 12);

const CACHE_DIR = path.join(process.cwd(), 'public', 'generated');
const PUBLIC_PREFIX = '/generated';

// Slot → role mapping (mirrors the renderer's section ordering).
const SLOT_ROLES: ImageRole[] = ['hero', 'split', 'feature', 'gallery', 'product', 'cta'];

function hashSpec(spec: ImagePromptSpec): string {
  return createHash('sha1').update(`${spec.prompt}|${spec.negative}|${spec.seed}|${spec.width}x${spec.height}`).digest('hex').slice(0, 24);
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

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
        steps: Number(process.env.IMAGE_GEN_STEPS || 6),   // SDXL-Turbo style: few steps
        cfg_scale: Number(process.env.IMAGE_GEN_CFG || 2),
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

/** Save a base64 PNG to the public cache and return its public URL. */
async function persist(b64: string, key: string): Promise<string> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${key}.png`);
  await fs.writeFile(file, Buffer.from(b64, 'base64'));
  return `${PUBLIC_PREFIX}/${key}.png`;
}

// In-process generative visual engine — the guaranteed, always-unique source.
function visualEngine(puo: PromptUnderstandingObject, role: ImageRole, seed: number): string {
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
  });
}

/**
 * Quick liveness probe for the self-hosted generator so we don't pay the full
 * per-image timeout on every slot when it isn't running.
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
 * Produce the full image set for a site. Every image is generated in-house:
 * the self-hosted diffusion generator when it's running, otherwise the
 * in-process visual engine. No third-party image sources are ever contacted.
 * Always returns a usable array — never throws, never repeats.
 */
export async function generateSiteImages(puo: PromptUnderstandingObject, fp: number): Promise<string[]> {
  const results: string[] = [];
  let useGenerator = await generatorAvailable();
  const startedAt = Date.now();
  let consecutiveFailures = 0;

  for (let i = 0; i < DISTINCT_IMAGES; i++) {
    const role = SLOT_ROLES[i % SLOT_ROLES.length];
    // Unique seed per (prompt × slot): different prompts AND different slots
    // never collide, so no two sites and no two sections share a visual.
    const seed = (Math.abs(fp) ^ ((i + 1) * 0x9e3779b1)) >>> 0;

    // Stop using the diffusion server if we've blown the overall time budget —
    // the rest of the slots fall back to the instant visual engine so the whole
    // request always completes promptly. (Cache hits below are still allowed.)
    if (useGenerator && Date.now() - startedAt > TOTAL_IMAGE_BUDGET) {
      useGenerator = false;
    }

    // 1) Self-hosted diffusion generator (photoreal, niche-matched) when live.
    if (useGenerator) {
      try {
        const spec = buildImagePrompt(puo, role, i);
        const key = hashSpec(spec);
        // Cached PNGs are free regardless of budget/failures — always use them.
        if (await fileExists(path.join(CACHE_DIR, `${key}.png`))) { results.push(`${PUBLIC_PREFIX}/${key}.png`); continue; }
        const b64 = await callLocalGenerator(spec);
        if (b64) {
          consecutiveFailures = 0;
          results.push(await persist(b64, key));
          continue;
        }
        // Miss (timeout/error). After a few in a row, give up on the server so a
        // slow/unresponsive box costs a couple of timeouts, not one per slot.
        if (++consecutiveFailures >= MAX_GEN_FAILURES) useGenerator = false;
      } catch {
        if (++consecutiveFailures >= MAX_GEN_FAILURES) useGenerator = false;
      }
    }

    // 2) In-process generative visual engine — always available, always unique.
    results.push(visualEngine(puo, role, seed));
  }

  return results;
}

export { DISTINCT_IMAGES };
