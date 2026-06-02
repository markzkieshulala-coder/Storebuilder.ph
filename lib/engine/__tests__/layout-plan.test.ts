/**
 * Layout Plan Tests — Phase 2 + 2B
 *
 * Verifies that buildLayoutPlan is the sole authority on page structure and that
 * NO page exists without a requirement justifying it:
 *  1. Page set is derived from spec.requiredPages (no forced About/Gallery/Contact)
 *  2. No hidden pages are ever generated
 *  3. Gallery page exists ONLY when gallery is required
 *  4. Navigation is derived from spec in user-intent order (pages + anchors)
 *  5. Cart is derived from products + commerce intent, not niche
 *  6. Explicit "X page" requests promote a kind to a standalone page
 *  7. Home section order respects user clause order
 */

import { buildLayoutPlan } from '../layout';
import { buildWebsiteSpec } from '../spec';
import { buildUnderstandingSync } from '../understanding';

function specFor(prompt: string) {
  const puo = buildUnderstandingSync(prompt);
  return { puo, spec: buildWebsiteSpec(prompt, puo) };
}

function planFor(prompt: string, normIndustry: string) {
  const { puo, spec } = specFor(prompt);
  return buildLayoutPlan(prompt, puo, spec, normIndustry);
}

// ── 1. No forced pages ─────────────────────────────────────────────────────────

describe('buildLayoutPlan — no forced page set', () => {
  test('home is always present', () => {
    const p = planFor('A minimal landing page with features.', 'general');
    expect(p.pages.some(pg => pg.kind === 'home')).toBe(true);
  });

  test('no About page unless story/about requested', () => {
    const p = planFor('A bakery. Show me products and a gallery.', 'food');
    expect(p.pages.some(pg => pg.slug === 'about')).toBe(false);
  });

  test('no Contact page unless explicitly requested', () => {
    const p = planFor('A bakery with products.', 'food');
    expect(p.pages.some(pg => pg.kind === 'contact')).toBe(false);
  });

  test('no Gallery page unless gallery requested', () => {
    const p = planFor('A SaaS tool. Include a pricing section.', 'technology');
    expect(p.pages.some(pg => pg.kind === 'gallery')).toBe(false);
    expect(p.gallerySlug).toBe('');
  });
});

// ── 2. No hidden pages ──────────────────────────────────────────────────────────

describe('buildLayoutPlan — hidden pages removed', () => {
  test('food site has no reservations/our-story hidden pages', () => {
    const p = planFor('A restaurant with a menu.', 'food');
    const slugs = p.pages.map(pg => pg.slug);
    expect(slugs).not.toContain('reservations');
    expect(slugs).not.toContain('our-story');
  });

  test('sports site has no programs/coaches hidden pages', () => {
    const p = planFor('A basketball academy. Coaching programs. Online booking.', 'sports');
    const slugs = p.pages.map(pg => pg.slug);
    expect(slugs).not.toContain('programs');
    expect(slugs).not.toContain('coaches');
  });

  test('LayoutPlan exposes no hidden-page fields', () => {
    const p = planFor('A restaurant with a menu.', 'food');
    expect('hiddenPrimarySlug' in p).toBe(false);
    expect('hiddenSecondarySlug' in p).toBe(false);
  });
});

// ── 3. Gallery only when required ───────────────────────────────────────────────

describe('buildLayoutPlan — gallery page', () => {
  test('gallery requested → gallery page exists with niche label', () => {
    const p = planFor('A photographer. Show a gallery of my work.', 'photography');
    const g = p.pages.find(pg => pg.kind === 'gallery');
    expect(g).toBeDefined();
    expect(g?.slug).toBe('work');
  });

  test('gallery not requested → no gallery page', () => {
    const p = planFor('A law firm. Include testimonials.', 'professional');
    expect(p.pages.some(pg => pg.kind === 'gallery')).toBe(false);
  });
});

// ── 4. Navigation derivation ────────────────────────────────────────────────────

describe('buildLayoutPlan — navigation derived from spec', () => {
  test('nav always starts with Home', () => {
    const p = planFor('A bakery with products.', 'food');
    expect(p.navigation[0]).toEqual({ label: 'Home', href: '.' });
  });

  test('page-worthy required section → page nav link', () => {
    const p = planFor('A shop. Products. Online booking.', 'ecommerce');
    const hrefs = p.navigation.map(n => n.href);
    // products → shop page; booking → book page
    expect(hrefs).toContain('shop');
    expect(hrefs).toContain('book');
  });

  test('home-section kind (features) → anchor nav link, not a page', () => {
    const p = planFor('A consultancy. Our services. Client testimonials.', 'professional');
    const featNav = p.navigation.find(n => n.href === '#features');
    expect(featNav).toBeDefined();
    expect(p.pages.some(pg => pg.kind === 'features')).toBe(false);
  });

  test('navigation excludes checkout', () => {
    const p = planFor('An online store. Products. Buy now.', 'ecommerce');
    expect(p.navigation.map(n => n.href)).not.toContain('checkout');
  });
});

// ── 5. Commerce from products + intent ──────────────────────────────────────────

describe('buildLayoutPlan — cart from products + commerce intent', () => {
  test('products + buying verb → hasCart true', () => {
    const p = planFor('A store where customers can buy sneakers online.', 'ecommerce');
    expect(p.hasCart).toBe(true);
    expect(p.pages.some(pg => pg.kind === 'cart')).toBe(true);
    expect(p.pages.some(pg => pg.kind === 'checkout')).toBe(true);
  });

  test('products without commerce intent → no cart', () => {
    const p = planFor('A brand showcase. Featured products and our story.', 'general');
    expect(p.hasCart).toBe(false);
    expect(p.pages.some(pg => pg.kind === 'cart')).toBe(false);
  });

  test('service offerings without a buying verb → no cart (intent gate)', () => {
    // NLU models the firm's services as products, but with no commerce verb the
    // cart must stay off — commerce requires products AND explicit intent.
    const p = planFor('A law firm providing legal representation. Client testimonials.', 'professional');
    expect(p.hasCart).toBe(false);
  });
});

// ── 6. Explicit page requests ───────────────────────────────────────────────────

describe('buildLayoutPlan — explicit page requests (Tier 3)', () => {
  test('"an about page" promotes story to a standalone page', () => {
    const { puo, spec } = specFor('A studio. I want an about page describing our story.');
    expect(spec.requiredPages).toContain('story');
    const p = buildLayoutPlan('A studio. I want an about page describing our story.', puo, spec, 'agency');
    expect(p.pages.some(pg => pg.kind === 'story' && pg.slug === 'about')).toBe(true);
  });

  test('"a contact page" promotes contact to a standalone page', () => {
    const { puo, spec } = specFor('A bakery. Add a contact page.');
    expect(spec.requiredPages).toContain('contact');
    const p = buildLayoutPlan('A bakery. Add a contact page.', puo, spec, 'food');
    expect(p.pages.some(pg => pg.kind === 'contact')).toBe(true);
  });

  test('plain "FAQ" (no page) stays a home section, not a page', () => {
    const { spec } = specFor('A clinic. Include an FAQ.');
    expect(spec.requiredPages).not.toContain('faq');
  });
});

// ── 7. Section order — user intent ──────────────────────────────────────────────

describe('buildLayoutPlan — homeSections user-intent order', () => {
  test('user clause order is preserved', () => {
    const prompt = 'A basketball gear shop. Products. Testimonials. FAQ.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'ecommerce');
    const ordered = p.homeSections.filter(s => s.userOrder !== null);
    const productsIdx     = ordered.findIndex(s => s.kind === 'products');
    const testimonialsIdx = ordered.findIndex(s => s.kind === 'testimonials');
    const faqIdx          = ordered.findIndex(s => s.kind === 'faq');
    if (productsIdx >= 0 && testimonialsIdx >= 0) expect(productsIdx).toBeLessThan(testimonialsIdx);
    if (testimonialsIdx >= 0 && faqIdx >= 0) expect(testimonialsIdx).toBeLessThan(faqIdx);
  });

  test('inferred sections follow user-stated ones', () => {
    const prompt = 'A coffee shop. Menu. Gallery.';
    const { puo, spec } = specFor(prompt);
    const p = buildLayoutPlan(prompt, puo, spec, 'food');
    let seenNull = false;
    for (const s of p.homeSections) {
      if (s.userOrder === null) seenNull = true;
      else if (seenNull) throw new Error(`user-ordered ${s.kind} after inferred sections`);
    }
  });
});
