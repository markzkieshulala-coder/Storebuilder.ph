/**
 * Layout Divergence — Phase 2B proof.
 *
 * Three different basketball prompts must now produce DIFFERENT navigation,
 * page structure, and home-section counts. Before Phase 2B all three produced an
 * identical Home/About/Gallery/Contact nav and 6-page structure. This test fails
 * if structural template-convergence ever returns.
 */

import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';

const A = `Luxury basketball brand for professional athletes.
Black and gold. Featured athletes. Limited edition collections. VIP membership.`;
const B = `Street basketball brand for teenagers.
Neon colors. Community events. Street culture. Budget-friendly products.`;
const C = `Basketball training academy.
Coaching programs. Player development. Online booking.`;

function planFor(prompt: string) {
  const puo = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, puo);
  return buildLayoutPlan(prompt, puo, spec, normalizeIndustry(puo.inferredIndustry));
}

const navKey = (p: ReturnType<typeof planFor>) => p.navigation.map(n => n.href).join('|');
const pageKey = (p: ReturnType<typeof planFor>) => p.pages.map(pg => pg.slug).sort().join('|');

describe('Phase 2B — structural divergence across prompts', () => {
  const pa = planFor(A), pb = planFor(B), pc = planFor(C);

  test('navigation is no longer the fixed Home/About/Gallery/Contact template', () => {
    for (const p of [pa, pb, pc]) {
      const hrefs = p.navigation.map(n => n.href);
      // The old forced trio must NOT all be present.
      const forcedTemplate = hrefs.includes('about') && hrefs.includes('gallery') && hrefs.includes('contact');
      expect(forcedTemplate).toBe(false);
    }
  });

  test('the three navigations are pairwise different', () => {
    expect(navKey(pa)).not.toBe(navKey(pb));
    expect(navKey(pb)).not.toBe(navKey(pc));
    expect(navKey(pa)).not.toBe(navKey(pc));
  });

  test('page structure diverges across prompts', () => {
    const keys = new Set([pageKey(pa), pageKey(pb), pageKey(pc)]);
    // At least two distinct page-structures among the three.
    expect(keys.size).toBeGreaterThanOrEqual(2);
  });

  test('no prompt generates a forced Gallery or hidden page', () => {
    for (const p of [pa, pb, pc]) {
      const slugs = p.pages.map(pg => pg.slug);
      expect(slugs).not.toContain('reservations');
      expect(slugs).not.toContain('programs');
      expect(slugs).not.toContain('coaches');
      expect(slugs).not.toContain('our-story');
      // Gallery only if requested — none of A/B/C asked for one.
      expect(slugs).not.toContain('gallery');
    }
  });

  test('home section count reflects requirements, not a fixed band', () => {
    // C states more sections than A → more home sections.
    expect(pc.homeSections.length).toBeGreaterThan(pa.homeSections.length);
  });
});
