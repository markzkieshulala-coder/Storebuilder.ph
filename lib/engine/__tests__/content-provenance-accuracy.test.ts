/**
 * Content Provenance ACCURACY Tests — Phase 3C
 *
 * Phase 3 attached a provenance tag to every ContentPlan field. The verification
 * audit found several tags were *inaccurate*: niche-bank products (and content
 * derived from them) were labeled 'prompt'. These tests lock in the invariant that
 * a 'prompt' tag means the value genuinely came from the user's prompt text.
 *
 * Core invariants:
 *  A. A keyword-only business-type prompt ("a ramen shop") gets NO products section.
 *  B. When a products section is requested but the user listed no items, the catalog
 *     is sourced 'niche' — NEVER 'prompt'.
 *  C. User-listed items ARE sourced 'prompt'.
 *  D. features / testimonials / galleryHeading are not labeled 'prompt' purely
 *     because a niche-bank catalog exists.
 *  E. 'prompt'-tagged hero/about copy actually contains the user's words.
 */

import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';
import { buildContentPlan } from '../content/plan';

function planFor(prompt: string, brand = 'TestBrand') {
  const puo = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, puo);
  const normIndustry = normalizeIndustry(puo.inferredIndustry);
  const layoutPlan = buildLayoutPlan(prompt, puo, spec, normIndustry);
  return buildContentPlan(prompt, puo, spec, layoutPlan, brand, 7);
}

// ── A. Keyword-only business type must NOT fabricate a catalog (D6 leak) ───────

describe('provenance accuracy — D6 catalog leak closed', () => {
  test('"a ramen shop" (business-type noun, no items listed) → products absent', () => {
    const plan = planFor('A ramen shop. We serve authentic 18-hour tonkotsu broth.');
    expect(plan.products.source).toBe('absent');
    expect(plan.products.value).toBeNull();
  });

  test('"a coffee shop" → products absent (shop is a business type, not a request)', () => {
    const plan = planFor('A coffee shop. Cozy neighbourhood spot for great mornings.');
    expect(plan.products.source).toBe('absent');
  });

  test('a generic restaurant prompt → products absent', () => {
    const plan = planFor('A restaurant. Warm hospitality and seasonal cooking.');
    expect(plan.products.source).toBe('absent');
  });
});

// ── B. Requested-but-unlisted catalog is 'niche', never 'prompt' ───────────────

describe('provenance accuracy — niche catalog is never labeled prompt', () => {
  test('explicit "view our menu" with no items listed → products sourced niche', () => {
    const plan = planFor('A restaurant. View our menu. Book a table.');
    if (plan.products.source !== 'absent') {
      expect(plan.products.source).toBe('niche');
      expect(plan.products.source).not.toBe('prompt');
    }
  });

  test('explicit "products" request with no items → never prompt-sourced', () => {
    const plan = planFor('A boutique. Browse our products.');
    expect(plan.products.source).not.toBe('prompt');
  });
});

// ── C. User-listed items ARE prompt-sourced ───────────────────────────────────

describe('provenance accuracy — user-listed items are prompt', () => {
  test('inline "we offer X, Y, Z" → products prompt with the user names', () => {
    const plan = planFor('Sweet Dreams Bakery. We offer Birthday Cakes, Wedding Cakes, and Cupcakes.');
    expect(plan.products.source).toBe('prompt');
    const names = (plan.products.value ?? []).map(p => p.name.toLowerCase()).join(' ');
    expect(names).toMatch(/birthday|wedding|cupcake/);
  });
});

// ── D. Derived content not falsely 'prompt' from a niche catalog ───────────────

describe('provenance accuracy — derived fields honest when catalog is niche', () => {
  test('sparse service prompt: features/testimonials/gallery not labeled prompt', () => {
    const plan = planFor('A law firm. Expert legal counsel for corporate clients.');
    // No descriptive selling points and no user-listed products → these must not
    // claim prompt provenance off the back of a niche product bank.
    expect(plan.features.source).not.toBe('prompt');
    expect(plan.testimonials.source).not.toBe('prompt');
    expect(plan.galleryHeading.source).not.toBe('prompt');
  });

  test('descriptive sentences → features prompt; testimonials stay absent (never fabricated)', () => {
    const plan = planFor('A ramen shop. Features section. Testimonials. We serve authentic 18-hour tonkotsu broth. Slow-cooked pork bone soup.');
    expect(plan.features.source).toBe('prompt');
    // Testimonials are NEVER fabricated, even when the section is requested.
    expect(plan.testimonials.source).toBe('absent');
  });
});

// ── E. 'prompt'-tagged copy really contains the user's words ───────────────────

describe('provenance accuracy — prompt tag implies user text present', () => {
  test('prompt-tagged hero sub contains user vocabulary', () => {
    const plan = planFor('A bakery. We bake 48-hour fermented sourdough by hand every morning.');
    if (plan.heroSub.source === 'prompt') {
      expect(plan.heroSub.value.toLowerCase()).toMatch(/bake|sourdough|ferment|hand|morning/);
    }
  });

  test('prompt-tagged about body contains user vocabulary', () => {
    const plan = planFor('A yoga studio. We teach trauma-informed somatic yoga. Small classes of six.');
    if (plan.aboutBody.source === 'prompt') {
      expect(plan.aboutBody.value.toLowerCase()).toMatch(/yoga|trauma|somatic|class|six/);
    }
  });
});
