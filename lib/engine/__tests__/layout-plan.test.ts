/**
 * Layout Plan Tests — Phase 2
 *
 * Verifies that buildLayoutPlan is the sole authority on page structure:
 *  1. Gallery slug is derived from niche/direction, not template defaults
 *  2. hasCart is true for product niches and e-commerce direction
 *  3. hasPricing reflects spec.sections (user-requested), not niche template
 *  4. Hidden page slugs are niche-specific
 *  5. Pages list matches exactly what layoutPlan declares
 *  6. Navigation excludes hidden pages
 *  7. homeSections order respects user's stated clause order
 *  8. Inferred sections (null userOrder) come after user-stated ones
 */

import { buildLayoutPlan } from '../layout';
import { buildWebsiteSpec } from '../spec';
import { buildUnderstandingSync } from '../understanding';

// ── Helpers ──────────────────────────────────────────────────────────────────

function specFor(prompt: string) {
  const puo = buildUnderstandingSync(prompt);
  return { puo, spec: buildWebsiteSpec(prompt, puo) };
}

function planFor(prompt: string, normIndustry: string) {
  const { puo, spec } = specFor(prompt);
  return buildLayoutPlan(prompt, puo, spec, normIndustry);
}

// ── 1. Gallery slug ───────────────────────────────────────────────────────────

describe('buildLayoutPlan — gallery slug', () => {
  test('food niche → "menu"', () => {
    const p = planFor('A ramen restaurant in Manila', 'food');
    expect(p.gallerySlug).toBe('menu');
  });

  test('ecommerce niche → "shop"', () => {
    const p = planFor('An online sneakers shop', 'ecommerce');
    expect(p.gallerySlug).toBe('shop');
  });

  test('photography niche → "work"', () => {
    const p = planFor('A freelance photographer portfolio', 'photography');
    expect(p.gallerySlug).toBe('work');
  });

  test('default → "gallery"', () => {
    const p = planFor('A general consulting firm', 'professional');
    expect(p.gallerySlug).toBe('gallery');
  });
});

// ── 2. hasCart ────────────────────────────────────────────────────────────────

describe('buildLayoutPlan — hasCart', () => {
  test('ecommerce niche → hasCart true', () => {
    const p = planFor('An online fashion store', 'ecommerce');
    expect(p.hasCart).toBe(true);
  });

  test('fashion niche → hasCart true', () => {
    const p = planFor('A streetwear brand', 'fashion');
    expect(p.hasCart).toBe(true);
  });

  test('professional niche → hasCart false', () => {
    const p = planFor('A law firm website', 'professional');
    expect(p.hasCart).toBe(false);
  });

  test('food niche → hasCart false', () => {
    const p = planFor('A ramen restaurant', 'food');
    expect(p.hasCart).toBe(false);
  });
});

// ── 3. hasPricing ─────────────────────────────────────────────────────────────

describe('buildLayoutPlan — hasPricing', () => {
  test('prompt explicitly requests pricing → hasPricing true', () => {
    const prompt = 'A SaaS tool. Include a pricing section with three tiers.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'technology');
    expect(p.hasPricing).toBe(true);
  });

  test('no pricing in prompt → hasPricing false', () => {
    const prompt = 'A bakery website with products and gallery.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'food');
    expect(p.hasPricing).toBe(false);
  });
});

// ── 4. Hidden pages ───────────────────────────────────────────────────────────

describe('buildLayoutPlan — hidden page slugs', () => {
  test('food niche → reservations + our-story', () => {
    const p = planFor('A restaurant website', 'food');
    expect(p.hiddenPrimarySlug).toBe('reservations');
    expect(p.hiddenSecondarySlug).toBe('our-story');
  });

  test('technology niche → demo + case-studies', () => {
    const p = planFor('A SaaS product website', 'technology');
    expect(p.hiddenPrimarySlug).toBe('demo');
    expect(p.hiddenSecondarySlug).toBe('case-studies');
  });

  test('unknown niche → services + team (general fallback)', () => {
    const p = planFor('A website', 'unknown-niche-xyz');
    expect(p.hiddenPrimarySlug).toBe('services');
    expect(p.hiddenSecondarySlug).toBe('team');
  });
});

// ── 5. Pages list ─────────────────────────────────────────────────────────────

describe('buildLayoutPlan — pages list', () => {
  test('always includes home, about, gallery, contact', () => {
    const p = planFor('A bakery', 'food');
    const slugs = p.pages.map(pg => pg.slug);
    expect(slugs).toContain('home');
    expect(slugs).toContain('about');
    expect(slugs).toContain('contact');
    // food → gallery slug is 'menu'
    expect(slugs).toContain('menu');
  });

  test('hasCart true → cart and checkout in pages', () => {
    const p = planFor('An online clothing shop', 'ecommerce');
    const slugs = p.pages.map(pg => pg.slug);
    expect(slugs).toContain('cart');
    expect(slugs).toContain('checkout');
  });

  test('hasCart false → no cart or checkout in pages', () => {
    const p = planFor('A consulting firm', 'professional');
    const slugs = p.pages.map(pg => pg.slug);
    expect(slugs).not.toContain('cart');
    expect(slugs).not.toContain('checkout');
  });

  test('hasPricing true → pricing in pages', () => {
    const prompt = 'A SaaS tool with a pricing section.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'technology');
    expect(p.pages.map(pg => pg.slug)).toContain('pricing');
  });

  test('hidden pages are included in pages list but isHidden=true', () => {
    const p = planFor('A restaurant website', 'food');
    const reservations = p.pages.find(pg => pg.slug === 'reservations');
    expect(reservations).toBeDefined();
    expect(reservations?.isHidden).toBe(true);
    expect(reservations?.isNav).toBe(false);
  });
});

// ── 6. Navigation ─────────────────────────────────────────────────────────────

describe('buildLayoutPlan — navigation', () => {
  test('navigation excludes hidden pages', () => {
    const p = planFor('A restaurant', 'food');
    const navSlugs = p.navigation.map(n => n.href);
    expect(navSlugs).not.toContain('reservations');
    expect(navSlugs).not.toContain('our-story');
  });

  test('navigation excludes checkout (non-nav page)', () => {
    const p = planFor('An online shop', 'ecommerce');
    const navSlugs = p.navigation.map(n => n.href);
    expect(navSlugs).not.toContain('checkout');
  });

  test('navigation includes cart for product niche', () => {
    const p = planFor('An online shop', 'ecommerce');
    const navSlugs = p.navigation.map(n => n.href);
    expect(navSlugs).toContain('cart');
  });

  test('home nav item uses "." as href', () => {
    const p = planFor('A bakery', 'food');
    const home = p.navigation.find(n => n.label === 'Home');
    expect(home?.href).toBe('.');
  });
});

// ── 7. Section order — user intent ───────────────────────────────────────────

describe('buildLayoutPlan — homeSections user-intent order', () => {
  test('user-stated sections get non-null userOrder', () => {
    const prompt = 'A basketball shop. Products. Testimonials. FAQ.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'ecommerce');

    const products     = p.homeSections.find(s => s.kind === 'products');
    const testimonials = p.homeSections.find(s => s.kind === 'testimonials');
    const faq          = p.homeSections.find(s => s.kind === 'faq');

    expect(products?.userOrder).not.toBeNull();
    expect(testimonials?.userOrder).not.toBeNull();
    expect(faq?.userOrder).not.toBeNull();
  });

  test('user clause order is preserved in homeSections sort', () => {
    // User wrote: products first, then testimonials, then faq
    const prompt = 'A basketball gear shop. Products. Testimonials. FAQ.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'ecommerce');

    const userOrderedOnly = p.homeSections.filter(s => s.userOrder !== null);
    // Extract the three we care about
    const productsIdx     = userOrderedOnly.findIndex(s => s.kind === 'products');
    const testimonialsIdx = userOrderedOnly.findIndex(s => s.kind === 'testimonials');
    const faqIdx          = userOrderedOnly.findIndex(s => s.kind === 'faq');

    expect(productsIdx).toBeGreaterThanOrEqual(0);
    if (productsIdx >= 0 && testimonialsIdx >= 0) {
      expect(productsIdx).toBeLessThan(testimonialsIdx);
    }
    if (testimonialsIdx >= 0 && faqIdx >= 0) {
      expect(testimonialsIdx).toBeLessThan(faqIdx);
    }
  });
});

// ── 8. Inferred sections appear after user-stated ─────────────────────────────

describe('buildLayoutPlan — inferred sections last', () => {
  test('all null-userOrder placements follow all non-null-userOrder ones', () => {
    const prompt = 'A coffee shop. Menu. Gallery.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'food');

    let seenNull = false;
    for (const section of p.homeSections) {
      if (section.userOrder === null) {
        seenNull = true;
      } else if (seenNull) {
        // A non-null userOrder after a null — ordering invariant broken
        throw new Error(
          `Non-null userOrder (${section.kind}:${section.userOrder}) found after null-order sections`,
        );
      }
    }
  });
});
