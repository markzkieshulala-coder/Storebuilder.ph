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
import { buildImagePrompt, buildSearchQuery, curatedPhotoIds } from './image-agent';
import type { ImageRole, ImagePromptSpec } from './image-agent';
import { generateVisualDataUri } from './visual-engine';
import type { VisualPalette } from './visual-engine';

// Optional stock-photo search keys. When set, the engine fetches REAL photos
// matched to the prompt's exact subject. When absent, it uses the curated
// keyless Unsplash CDN library (still real photos, matched by sub-niche).
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const PEXELS_KEY = process.env.PEXELS_API_KEY || '';
const SEARCH_TIMEOUT = Number(process.env.IMAGE_SEARCH_TIMEOUT_MS || 8000);

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

// Build a sized real-photo URL from a curated Unsplash CDN id.
function curatedUrl(id: string, w = 1200, h = 800): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80&h=${h}`;
}

// Keyword search against Unsplash (if a key is configured). Returns a real CDN
// photo URL matched to the query, or null.
async function searchUnsplash(query: string, seed: number): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT);
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const data = await res.json() as { results?: Array<{ urls?: { regular?: string; raw?: string } }> };
    const list = data.results || [];
    if (!list.length) return null;
    const pick = list[Math.abs(seed) % list.length];
    return pick?.urls?.regular || pick?.urls?.raw || null;
  } catch { return null; } finally { clearTimeout(timer); }
}

// Keyword search against Pexels (if a key is configured).
async function searchPexels(query: string, seed: number): Promise<string | null> {
  if (!PEXELS_KEY) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT);
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
      { headers: { Authorization: PEXELS_KEY }, signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const data = await res.json() as { photos?: Array<{ src?: { large2x?: string; large?: string } }> };
    const list = data.photos || [];
    if (!list.length) return null;
    const pick = list[Math.abs(seed) % list.length];
    return pick?.src?.large2x || pick?.src?.large || null;
  } catch { return null; } finally { clearTimeout(timer); }
}

/**
 * Produce the full image set for a site. Returns REAL photographs by default
 * (keyword-searched when an API key is set, otherwise the curated sub-niche
 * Unsplash CDN library), the self-hosted generator when enabled, and the
 * SVG engine only as a last resort. Always returns a usable array — never throws.
 */
export async function generateSiteImages(puo: PromptUnderstandingObject, fp: number): Promise<string[]> {
  const results: string[] = [];
  const curated = curatedPhotoIds(puo);   // ordered real-photo ids matched to the niche

  for (let i = 0; i < DISTINCT_IMAGES; i++) {
    const role = SLOT_ROLES[i % SLOT_ROLES.length];
    const seed = (Math.abs(fp) ^ (i * 0x9e3779b1)) >>> 0;

    // 1) Self-hosted generator (most specific) — only when explicitly enabled.
    if (IMAGE_GEN_ENABLED) {
      try {
        const spec = buildImagePrompt(puo, role, i);
        const key = hashSpec(spec);
        if (await fileExists(path.join(CACHE_DIR, `${key}.png`))) { results.push(`${PUBLIC_PREFIX}/${key}.png`); continue; }
        const b64 = await callLocalGenerator(spec);
        if (b64) { results.push(await persist(b64, key)); continue; }
      } catch { /* fall through */ }
    }

    // 2) Keyword stock search (exact subject match) when a key is configured.
    try {
      const q = buildSearchQuery(puo, i);
      const found = (await searchUnsplash(q, seed)) || (await searchPexels(q, seed));
      if (found) { results.push(found); continue; }
    } catch { /* fall through */ }

    // 3) Curated real-photo library (keyless, reliable, sub-niche matched).
    if (curated.length) { results.push(curatedUrl(curated[i % curated.length])); continue; }

    // 4) SVG art — last resort only.
    results.push(svgFallback(puo, role, seed));
  }

  return results;
}

export { DISTINCT_IMAGES };
