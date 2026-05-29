// ---------------------------------------------------------------------------
// IMAGE BACKEND
//
// Sends the image-agent's prompts to YOUR OWN self-hosted image generator
// (Stable Diffusion / SDXL, running on your machine or server — NOT a
// third-party API), caches the results to your own /public/generated folder,
// and embeds them in the site.
//
// If your local generator isn't running (or fails), it transparently falls back
// to the deterministic in-process SVG visual engine so the site never breaks.
//
// Configure the generator endpoint with the IMAGE_GEN_URL env var. The default
// targets an AUTOMATIC1111-compatible API (`/sdapi/v1/txt2img`) at
// http://127.0.0.1:7860, which the reference service in tools/image-generator
// also speaks.
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
const IMAGE_GEN_ENABLED = process.env.IMAGE_GEN_ENABLED === '1' || process.env.IMAGE_GEN_ENABLED === 'true';
// Per-image generation budget (ms). Keeps the whole request within API maxDuration.
const PER_IMAGE_TIMEOUT = Number(process.env.IMAGE_GEN_TIMEOUT_MS || 25000);
// How many DISTINCT images to generate per site (reused across sections). Kept
// small so a request stays within time budget even on modest GPUs.
const DISTINCT_IMAGES = Number(process.env.IMAGE_GEN_COUNT || 6);

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

function svgFallback(puo: PromptUnderstandingObject, role: ImageRole, seed: number): string {
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
 * Produce the full image set for a site. Each entry is either a real generated
 * photo (served from /generated/...) or an SVG data-URI fallback. Always returns
 * a usable array — never throws.
 */
export async function generateSiteImages(puo: PromptUnderstandingObject, fp: number): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < DISTINCT_IMAGES; i++) {
    const role = SLOT_ROLES[i % SLOT_ROLES.length];
    const spec = buildImagePrompt(puo, role, i);
    const seed = (Math.abs(fp) ^ (i * 0x9e3779b1)) >>> 0;

    // 1) cached real image?
    const key = hashSpec(spec);
    const cachedFile = path.join(CACHE_DIR, `${key}.png`);

    if (IMAGE_GEN_ENABLED) {
      try {
        if (await fileExists(cachedFile)) {
          results.push(`${PUBLIC_PREFIX}/${key}.png`);
          continue;
        }
        const b64 = await callLocalGenerator(spec);
        if (b64) {
          results.push(await persist(b64, key));
          continue;
        }
      } catch {
        /* fall through to SVG */
      }
    }

    // 2) deterministic SVG fallback (self-contained, always works)
    results.push(svgFallback(puo, role, seed));
  }

  return results;
}

export { DISTINCT_IMAGES };
