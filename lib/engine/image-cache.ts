// ---------------------------------------------------------------------------
// IMAGE CACHE  —  instant placeholder + background "real photo" upgrade
//
// On CPU-only machines a diffusion model is too slow to run inline while the
// user waits for their site. So we decouple the two:
//
//   1. registerImage(...)  — SYNCHRONOUS. Writes an instant in-house placeholder
//      PNG (from the canvas/visual engine) to /public/generated/<key>.png and
//      returns that stable URL. The page is built immediately, no waiting.
//   2. flushImageUpgrades(...) — runs in the BACKGROUND after the response is
//      sent. For every queued slot it calls the self-hosted diffusion server and
//      OVERWRITES /public/generated/<key>.png with the real photo, atomically.
//      A sidecar <key>.real marker records that the real photo is final.
//
// Because the placeholder and the real photo live at the SAME URL, the site
// "swaps in" the real images the moment they finish — the client just reloads
// the /generated/* URLs with a cache-buster (see the swap script in the
// renderer). Everything is in-house: no third-party image source is contacted.
// ---------------------------------------------------------------------------

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ImagePromptSpec } from './image-agent';

const CACHE_DIR = path.join(process.cwd(), 'public', 'generated');
export const PUBLIC_PREFIX = '/generated';

// Slots awaiting a real-photo upgrade, keyed by cache key (deduped automatically).
const pending = new Map<string, ImagePromptSpec>();
let flushing = false;

export function hashSpec(spec: ImagePromptSpec): string {
  return createHash('sha1')
    .update(`${spec.prompt}|${spec.negative}|${spec.seed}|${spec.width}x${spec.height}`)
    .digest('hex')
    .slice(0, 24);
}

function ensureDir(): void {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch { /* best-effort */ }
}

/**
 * Register one image and get back the string to embed in the HTML.
 *
 *  - If `visualDataUri` is a PNG data-uri AND an `sdSpec` is given, the PNG is
 *    written to /generated/<key>.png as a placeholder, the slot is queued for a
 *    background real-photo upgrade, and that file URL is returned.
 *  - Otherwise (non-PNG visual, e.g. an SVG niche, or no spec) the inline data
 *    uri is returned unchanged — no file, no swap (preserves prior behaviour).
 *
 * Fully synchronous so it can be called from the synchronous HTML renderer.
 */
export function registerImage(visualDataUri: string, sdSpec: ImagePromptSpec | null): string {
  if (!sdSpec || !visualDataUri.startsWith('data:image/png')) return visualDataUri;

  const key = hashSpec(sdSpec);
  const file = path.join(CACHE_DIR, `${key}.png`);
  const realMarker = path.join(CACHE_DIR, `${key}.real`);

  try {
    ensureDir();
    // Finished real photo already on disk → use it, nothing to queue.
    if (fs.existsSync(realMarker) && fs.existsSync(file)) {
      return `${PUBLIC_PREFIX}/${key}.png`;
    }
    // Write the instant placeholder if we don't already have a file there.
    if (!fs.existsSync(file)) {
      const b64 = visualDataUri.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    }
    // Queue (or re-queue) the real-photo upgrade.
    pending.set(key, sdSpec);
    return `${PUBLIC_PREFIX}/${key}.png`;
  } catch {
    return visualDataUri; // any fs failure → fall back to inline, never break
  }
}

export function pendingCount(): number {
  return pending.size;
}

/**
 * Drain the pending queue, generating each real photo via `generate` and
 * overwriting its placeholder in place. Meant to be fire-and-forgotten AFTER the
 * site HTML has been returned. Never throws. Runs at most one drain at a time.
 *
 * @param generate  returns a base64 PNG (no data-uri prefix) or null on failure.
 */
export async function flushImageUpgrades(
  generate: (spec: ImagePromptSpec) => Promise<string | null>,
): Promise<void> {
  if (flushing) return;
  const jobs = Array.from(pending.entries());
  pending.clear();
  if (jobs.length === 0) return;

  flushing = true;
  try {
    for (const [key, spec] of jobs) {
      const file = path.join(CACHE_DIR, `${key}.png`);
      const realMarker = path.join(CACHE_DIR, `${key}.real`);
      try {
        if (fs.existsSync(realMarker)) continue; // already upgraded by a prior run
        const b64 = await generate(spec);
        if (!b64) continue; // server slow/down → keep the placeholder, try next time
        const tmp = `${file}.tmp`;
        fs.writeFileSync(tmp, Buffer.from(b64, 'base64'));
        fs.renameSync(tmp, file);            // atomic swap on disk
        fs.writeFileSync(realMarker, '');    // mark final
      } catch { /* skip this slot, keep going */ }
    }
  } finally {
    flushing = false;
  }
}
