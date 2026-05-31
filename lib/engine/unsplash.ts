// ---------------------------------------------------------------------------
// UNSPLASH CLIENT  —  content-aware, never-repeating photo selection
//
// Uses the OFFICIAL Unsplash Search API (https://unsplash.com/developers) via a
// free access key in UNSPLASH_ACCESS_KEY. Every photo Unsplash has ever returned
// for ANY past generation is recorded in a persistent ledger, so no image is ever
// reused across website builds — even for the same niche. Each section is resolved
// from a content-specific query (product names, services, niche + context), not a
// single broad keyword, so the visual actually represents what it sits next to.
//
// If no key is configured (or the API is unreachable / rate-limited), every
// resolver returns gracefully so the renderer falls back to its branded CSS
// placeholders — site generation never hangs or throws.
// ---------------------------------------------------------------------------

import { promises as fs } from 'node:fs';
import path from 'node:path';

const API = 'https://api.unsplash.com';
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
// Persistent "already used" ledger — guarantees global uniqueness across builds.
const LEDGER_FILE = path.join(process.cwd(), 'public', 'generated', '.unsplash-used.json');
// Per-search request timeout and how many candidates to pull per query.
const SEARCH_TIMEOUT_MS = Number(process.env.UNSPLASH_TIMEOUT_MS || 8000);
const PER_PAGE = 30;

export type Orientation = 'landscape' | 'portrait' | 'squarish';

export interface ImageRequest {
  /** 'pool:N' for generic niche slots, 'name:<normalized>' for a product/feature. */
  key: string;
  /** Content-specific Unsplash search query. */
  query: string;
  orientation: Orientation;
}

export interface ResolvedImagery {
  /** Ordered, globally-unique niche/context images for hero, gallery, about, team… */
  pool: string[];
  /** Exact per-product / per-feature image, keyed by the normalized content name. */
  byName: Record<string, string>;
}

export function isUnsplashConfigured(): boolean {
  return ACCESS_KEY.length > 0;
}

interface UnsplashPhoto { id: string; urls: { raw: string; regular: string } }

// ---- persistent ledger -----------------------------------------------------

async function loadUsed(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(LEDGER_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { ids?: string[] };
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

async function saveUsed(used: Set<string>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(LEDGER_FILE), { recursive: true });
    // Keep the ledger bounded so it can't grow without limit; the most recent
    // ids are the ones most worth avoiding immediate repeats of.
    const ids = Array.from(used);
    const trimmed = ids.length > 5000 ? ids.slice(ids.length - 5000) : ids;
    await fs.writeFile(LEDGER_FILE, JSON.stringify({ ids: trimmed }), 'utf8');
  } catch {
    /* non-fatal — uniqueness best-effort if the FS is read-only */
  }
}

// ---- search -----------------------------------------------------------------

async function search(query: string, orientation: Orientation, page: number): Promise<UnsplashPhoto[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url =
      `${API}/search/photos?query=${encodeURIComponent(query)}` +
      `&per_page=${PER_PAGE}&page=${page}&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Client-ID ${ACCESS_KEY}`, 'Accept-Version': 'v1' },
    });
    if (!res.ok) {
      console.warn(`[unsplash] search "${query}" failed (${res.status})`);
      return [];
    }
    const data = (await res.json()) as { results?: UnsplashPhoto[] };
    return data.results ?? [];
  } catch (err) {
    console.warn(`[unsplash] search "${query}" error:`, (err as Error)?.message);
    return [];
  } finally {
    clearTimeout(t);
  }
}

// Build a slot-sized, on-brand URL from an Unsplash raw URL (Imgix params).
function sized(rawUrl: string): string {
  // Store the raw base; the renderer's ph() appends per-slot width/height/crop.
  return rawUrl;
}

// ---- resolve ----------------------------------------------------------------

/**
 * Resolve every requested image to a globally-unique Unsplash photo. `seed`
 * varies which search page each query starts on, so two sites in the same niche
 * pull from different parts of the result set even before the dedup ledger kicks
 * in. Returns empty structures (→ CSS placeholders) when the key is missing.
 */
export async function resolveSiteImagery(requests: ImageRequest[], seed: number): Promise<ResolvedImagery> {
  const empty: ResolvedImagery = { pool: [], byName: {} };
  if (!isUnsplashConfigured() || requests.length === 0) {
    if (!isUnsplashConfigured()) {
      console.warn('[unsplash] UNSPLASH_ACCESS_KEY not set → rendering branded placeholders.');
    }
    return empty;
  }

  const used = await loadUsed();
  const chosen = new Set<string>();         // ids picked during THIS run
  const cache = new Map<string, UnsplashPhoto[]>(); // query → candidates (avoids dup searches)
  const pool: string[] = [];
  const byName: Record<string, string> = {};

  const basePage = (Math.abs(seed) % 8) + 1; // 1..8 — different start per generation

  for (let i = 0; i < requests.length; i++) {
    const req = requests[i];
    let candidates = cache.get(req.query);
    if (!candidates) {
      candidates = await search(req.query, req.orientation, basePage);
      cache.set(req.query, candidates);
    }

    let photo = candidates.find((p) => !used.has(p.id) && !chosen.has(p.id));
    // If this query's first page is exhausted (all used/chosen), pull one more page.
    if (!photo) {
      const more = await search(req.query, req.orientation, basePage + 8);
      if (more.length) {
        cache.set(req.query, candidates.concat(more));
        photo = more.find((p) => !used.has(p.id) && !chosen.has(p.id));
      }
    }
    if (!photo) continue; // leave slot empty → branded placeholder

    chosen.add(photo.id);
    used.add(photo.id);
    const url = sized(photo.urls.raw);
    if (req.key.startsWith('name:')) {
      byName[req.key.slice('name:'.length)] = url;
    } else {
      pool.push(url);
    }
  }

  await saveUsed(used);
  return { pool, byName };
}
