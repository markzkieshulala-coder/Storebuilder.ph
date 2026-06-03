// ---------------------------------------------------------------------------
// IMAGERY PLANNING — derive content-aware Pexels search queries from a SitePlan.
//
// Each image slot's query is built from the EXACT content that slot displays
// (hero headline, gallery caption, product name) plus the niche, so photos match
// what's on screen. Slots are keyed by index ("hero", "about", "gallery-0",
// "product-0", …) so the renderer can look each one up deterministically. When no
// PEXELS_API_KEY is set (or a slot can't be filled) the renderer falls back to its
// on-brand CSS gradient art — imagery is purely additive.
// ---------------------------------------------------------------------------

import type { ImageRequest } from '../engine/pexels';
import type { SitePlan } from '../ai/site-plan';

const MAX_REQUESTS = 24;

/** Pull a few salient keywords from a string for a tighter image query. */
function kw(s?: string): string {
  return (s || '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(' ')
    .trim();
}

export function planImageRequests(plan: SitePlan): ImageRequest[] {
  const niche = (plan.niche || plan.tagline || 'modern business').trim();
  const reqs: ImageRequest[] = [];

  const hero = plan.sections.find((s) => s.type === 'hero');
  reqs.push({
    key: 'name:hero',
    query: `${niche} ${kw(hero?.heading) || kw(hero?.subheading)}`.trim() || niche,
    orientation: 'landscape',
  });

  const about = plan.sections.find((s) => s.type === 'about');
  if (about) {
    reqs.push({ key: 'name:about', query: `${niche} ${kw(about.heading)}`.trim() || niche, orientation: 'landscape' });
  }

  for (const sec of plan.sections) {
    if (sec.type === 'gallery') {
      (sec.items || []).forEach((it, i) =>
        reqs.push({
          key: `name:gallery-${i}`,
          query: `${kw(it.title) || niche} ${niche}`.trim(),
          orientation: 'landscape',
        }),
      );
    } else if (sec.type === 'products') {
      (sec.items || []).forEach((it, i) =>
        reqs.push({
          key: `name:product-${i}`,
          query: `${(it.title || '').trim()} ${niche}`.trim() || niche,
          orientation: 'squarish',
        }),
      );
    }
  }

  return reqs.slice(0, MAX_REQUESTS);
}
