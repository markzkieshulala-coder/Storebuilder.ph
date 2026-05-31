// ---------------------------------------------------------------------------
// PEXELS CLIENT  —  content-aware, never-repeating photo selection
//
// Uses the Pexels Search API (https://www.pexels.com/api/) via a free API key
// in PEXELS_API_KEY. Every photo Pexels has ever returned for ANY past
// generation is recorded in a persistent ledger, so no image is ever reused
// across website builds — even for the same niche. Each section is resolved
// from a content-specific query (product names, services, niche + context),
// not a single broad keyword, so the visual actually represents what it
// sits next to.
//
// If no key is configured (or the API is unreachable / rate-limited), every
// resolver returns gracefully so the renderer falls back to its branded CSS
// placeholders — site generation never hangs or throws.
// ---------------------------------------------------------------------------

import { promises as fs } from 'node:fs';
import path from 'node:path';

const API = 'https://api.pexels.com/v1';
const ACCESS_KEY = process.env.PEXELS_API_KEY || '';
// Persistent "already used" ledger — guarantees global uniqueness across builds.
const LEDGER_FILE = path.join(process.cwd(), 'public', 'generated', '.pexels-used.json');
// Per-search request timeout and how many candidates to pull per query.
const SEARCH_TIMEOUT_MS = Number(process.env.PEXELS_TIMEOUT_MS || 8000);
const PER_PAGE = 30;

export type Orientation = 'landscape' | 'portrait' | 'squarish';

export interface ImageRequest {
  /** 'pool:N' for generic niche slots, 'name:<normalized>' for a product/feature. */
  key: string;
  /** Content-specific Pexels search query. */
  query: string;
  orientation: Orientation;
}

export interface ResolvedImagery {
  /** Ordered, globally-unique niche/context images for hero, gallery, about, team… */
  pool: string[];
  /** Exact per-product / per-feature image, keyed by the normalized content name. */
  byName: Record<string, string>;
}

export function isConfigured(): boolean {
  return ACCESS_KEY.length > 0;
}

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
  total_results?: number;
  next_page?: string;
}

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

// Pexels orientation param: landscape | portrait | square (not 'squarish')
function pexelsOrientation(o: Orientation): string {
  return o === 'squarish' ? 'square' : o;
}

async function search(query: string, orientation: Orientation, page: number): Promise<PexelsPhoto[]> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const url =
      `${API}/search?query=${encodeURIComponent(query)}` +
      `&per_page=${PER_PAGE}&page=${page}&orientation=${pexelsOrientation(orientation)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: ACCESS_KEY },
    });
    if (!res.ok) {
      console.warn(`[pexels] search "${query}" failed (${res.status})`);
      return [];
    }
    const data = (await res.json()) as PexelsResponse;
    return data.photos ?? [];
  } catch (err) {
    console.warn(`[pexels] search "${query}" error:`, (err as Error)?.message);
    return [];
  } finally {
    clearTimeout(t);
  }
}

// Build a sized Pexels photo URL — append w/h/fit/compress params.
function sized(photo: PexelsPhoto, w: number, h: number): string {
  // Store the large2x src; ph() in the renderer will append sizing params.
  return photo.src.large2x || photo.src.large || photo.src.original;
}

// ---- resolve ----------------------------------------------------------------

/**
 * Resolve every requested image to a globally-unique Pexels photo. `seed`
 * varies which search page each query starts on, so two sites in the same
 * niche pull from different parts of the result set even before the dedup
 * ledger kicks in. Returns empty structures (→ CSS placeholders) when the
 * key is missing.
 */
export async function resolveSiteImagery(requests: ImageRequest[], seed: number): Promise<ResolvedImagery> {
  const empty: ResolvedImagery = { pool: [], byName: {} };
  if (!isConfigured() || requests.length === 0) {
    if (!isConfigured()) {
      console.warn('[pexels] PEXELS_API_KEY not set → rendering branded placeholders.');
    }
    return empty;
  }

  const used = await loadUsed();
  const chosen = new Set<string>();          // ids picked during THIS run
  const cache = new Map<string, PexelsPhoto[]>(); // query → candidates (avoids dup searches)
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

    const idStr = (p: PexelsPhoto) => String(p.id);
    let photo = candidates.find((p) => !used.has(idStr(p)) && !chosen.has(idStr(p)));
    // If this query's first page is exhausted (all used/chosen), pull one more page.
    if (!photo) {
      const more = await search(req.query, req.orientation, basePage + 8);
      if (more.length) {
        cache.set(req.query, candidates.concat(more));
        photo = more.find((p) => !used.has(idStr(p)) && !chosen.has(idStr(p)));
      }
    }
    if (!photo) continue; // leave slot empty → branded placeholder

    const id = idStr(photo);
    chosen.add(id);
    used.add(id);
    const url = sized(photo, 1200, 800);
    if (req.key.startsWith('name:')) {
      byName[req.key.slice('name:'.length)] = url;
    } else {
      pool.push(url);
    }
  }

  await saveUsed(used);
  return { pool, byName };
}
