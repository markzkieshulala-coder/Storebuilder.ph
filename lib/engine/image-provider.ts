// ---------------------------------------------------------------------------
// IMAGE PROVIDER  —  bridges the website generator to Unsplash
//
// The renderer produces a content-aware image PLAN (one query per section,
// derived from the actual product names / services / niche / branding it is about
// to render — see planSiteImagery in html-renderer.ts). This provider hands that
// plan to the Unsplash client, which resolves each query to a globally-unique
// photo (never reused across builds, see lib/engine/unsplash.ts) and returns the
// resolved imagery for injection into the page.
//
// Robustness: network calls are bounded by a total timeout and always degrade to
// empty imagery (→ branded CSS placeholders) so site generation never hangs or
// throws — e.g. when UNSPLASH_ACCESS_KEY is unset or the API is rate-limited.
// ---------------------------------------------------------------------------

import { resolveSiteImagery, isUnsplashConfigured } from './unsplash';
import type { ImageRequest, ResolvedImagery } from './unsplash';

// Total wall-clock budget for the whole image phase across all Unsplash calls.
const TOTAL_BUDGET_MS = Number(process.env.UNSPLASH_BUDGET_MS || 30000);

const EMPTY: ResolvedImagery = { pool: [], byName: {} };

/**
 * Resolve a content-aware image plan to globally-unique Unsplash photos.
 * Returns empty imagery (→ branded placeholders) if disabled, timed out, or the
 * Unsplash request failed.
 */
export async function fetchSiteImagery(requests: ImageRequest[], seed: number): Promise<ResolvedImagery> {
  if (!isUnsplashConfigured()) {
    console.warn(
      '[image-provider] UNSPLASH_ACCESS_KEY not set → branded placeholders.\n' +
      '  → Get a free key at https://unsplash.com/developers and add UNSPLASH_ACCESS_KEY=... to .env.local',
    );
    return EMPTY;
  }
  if (requests.length === 0) return EMPTY;

  const t0 = Date.now();
  console.log(`[image-provider] resolving ${requests.length} image(s) via Unsplash …`);

  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TOTAL_BUDGET_MS));
  try {
    const result = await Promise.race([resolveSiteImagery(requests, seed), timeout]);
    if (!result) {
      console.warn(`[image-provider] Unsplash phase timed out after ${TOTAL_BUDGET_MS}ms; using placeholders.`);
      return EMPTY;
    }
    const count = result.pool.length + Object.keys(result.byName).length;
    console.log(`[image-provider] resolved ${count} unique image(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    return result;
  } catch (err) {
    console.warn('[image-provider] Unsplash resolve failed; using placeholders:', (err as Error)?.message);
    return EMPTY;
  }
}
