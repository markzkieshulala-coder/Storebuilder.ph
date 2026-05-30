// ---------------------------------------------------------------------------
// IMAGE PROVIDER  —  integration seam for YOUR OWN image generator
//
// All in-house image/visual engines have been removed (the SVG "visual engine",
// the canvas scene renderer, the diffusion backend, the cache, the neutral
// placeholder). The website generator no longer produces any imagery itself.
//
// This file is the SINGLE place to wire in your own TypeScript / Next.js image
// generator. `generateSiteImages` is awaited once per site (before rendering)
// and its returned URLs/data-URIs are distributed across the page's image slots
// (hero, split, gallery, product cards, CTA, …). Return an empty array to leave
// every slot as a neutral CSS placeholder.
//
// Example wiring:
//
//   export async function generateSiteImages(puo, fp) {
//     const res = await fetch('http://localhost:3001/api/images', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         niche: puo.inferredIndustry,
//         keywords: puo.extractedKeywords,
//         count: 12,
//         seed: fp,
//       }),
//     });
//     if (!res.ok) return [];
//     const { images } = await res.json();   // string[] of URLs or data-URIs
//     return images;
//   }
//
// No third-party image source is contacted from here by default.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';

/**
 * Produce the ordered list of image URLs/data-URIs for a site. The renderer maps
 * them across all image slots. Returning [] leaves slots as neutral CSS blocks.
 *
 * @param puo  the resolved understanding object (niche, keywords, palette, …)
 * @param fp   deterministic per-site fingerprint (use as a seed if you want
 *             reproducible output)
 *
 * TODO: replace the stub below with a call into your own image generator.
 */
export async function generateSiteImages(_puo: PromptUnderstandingObject, _fp: number): Promise<string[]> {
  return [];
}
