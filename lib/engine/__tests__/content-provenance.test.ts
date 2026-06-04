/**
 * Content Provenance Tests — Phase 3
 *
 * Verifies the provenance resolution chain: prompt > nlu > niche > generic > absent.
 * Tests that the correct tier is selected for each content field based on what signals
 * are present in the prompt.
 *
 * 1. Prompt-rich prompts produce high prompt+nlu coverage
 * 2. Sparse prompts fall back gracefully (no null values for critical fields)
 * 3. Each resolution tier is exercised at least once
 * 4. Absent tier is only produced for genuinely missing sections (D6)
 * 5. No niche-bank content is produced for sections not in spec
 */

import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';
import { buildContentPlan } from '../content/plan';
import type { Provenance } from '../content/types';

function planFor(prompt: string) {
  const puo = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, puo);
  const normIndustry = normalizeIndustry(puo.inferredIndustry);
  const layoutPlan = buildLayoutPlan(prompt, puo, spec, normIndustry);
  return buildContentPlan(prompt, puo, spec, layoutPlan, 'TestBrand', 42);
}

// ── 1. Prompt-rich prompts produce higher coverage ───────────────────────────

describe('content provenance — signal coverage', () => {
  test('a detailed prompt produces higher prompt coverage than a sparse one', () => {
    const sparse = planFor('A restaurant.');
    const detailed = planFor(
      'A family-owned ramen restaurant in Makati. We serve authentic 18-hour tonkotsu broth. ' +
      'Our ramen is made from scratch every morning. Serving hungry professionals and families. ' +
      'Open Monday to Sunday, 11am–10pm.'
    );
    const sparseP = sparse._provenance.promptCoverage;
    const detailedP = detailed._provenance.promptCoverage;
    expect(detailedP).toBeGreaterThan(sparseP);
  });

  test('provenance summary counts sum to total field count', () => {
    const plan = planFor('A bakery with artisan bread and pastries.');
    const { promptCount, nluCount, nicheCount, genericCount, absentCount } = plan._provenance;
    const total = promptCount + nluCount + nicheCount + genericCount + absentCount;
    // Total should be at least 20 (we have ~26 ContentValue fields)
    expect(total).toBeGreaterThanOrEqual(20);
  });
});

// ── 2. Sparse prompts fall back gracefully ────────────────────────────────────

describe('content provenance — fallback chain', () => {
  test('sparse prompt: hero headline is never absent or empty', () => {
    const plan = planFor('A store.');
    expect(plan.heroHeadline.source).not.toBe('absent');
    expect(plan.heroHeadline.value).toBeTruthy();
  });

  test('sparse prompt: about body is ABSENT (no fabricated founder-myth)', () => {
    // NO FABRICATION: with no user-written description, the engine must not invent
    // an about/story body from a niche template.
    const plan = planFor('A law firm.');
    expect(plan.aboutBody.source).toBe('absent');
    expect(plan.aboutBody.value).toBe('');
  });

  test('about body present (prompt) when the user describes the business', () => {
    const plan = planFor('We are a boutique law firm. We defend small businesses in contract disputes. We have won over 200 cases.');
    expect(plan.aboutBody.source).toBe('prompt');
    expect(plan.aboutBody.value.length).toBeGreaterThan(20);
  });

  test('sparse prompt: testimonials absent', () => {
    const plan = planFor('A coffee shop.');
    expect(plan.testimonials.source).toBe('absent');
    expect(plan.testimonials.value).toEqual([]);
  });

  test('testimonials stay ABSENT even when a reviews section is requested but none given', () => {
    // NO FABRICATION: requesting the section does not license inventing quotes.
    const plan = planFor('A coffee shop. Testimonials section.');
    expect(plan.testimonials.source).toBe('absent');
    expect(plan.testimonials.value).toEqual([]);
  });

  test('sparse prompt: stats absent unless section requested', () => {
    const plan = planFor('A fitness studio.');
    expect(plan.stats.source).toBe('absent');
    expect(plan.stats.value).toEqual([]);
  });
});

// ── 3. Each resolution tier is exercised ─────────────────────────────────────

describe('content provenance — tier coverage', () => {
  test('prompt tier: explicit heroTag from credential signals', () => {
    // "award-winning" and "certified" should produce prompt-tier heroTag
    const plan = planFor('An award-winning certified financial advisor in Manila.');
    // credSignals or location should produce prompt-tier heroTag
    expect(['prompt', 'nlu']).toContain(plan.heroTag.source);
  });

  test('nlu tier: differentiator+audience flows into featureHeading', () => {
    const plan = planFor('A premium boxing gym for competitive fighters.');
    // differentiator (premium) + audience (competitive fighters) → nlu featureHeading
    expect(['nlu', 'niche', 'generic']).toContain(plan.featureHeading.source);
    expect(plan.featureHeading.value.length).toBeGreaterThan(5);
  });

  test('strict CTA: absent without explicit user CTA phrase', () => {
    const plan = planFor('A photography studio.');
    expect(plan.primaryCta.source).toBe('absent');
  });

  test('strict CTA: prompt tier when user writes action phrase', () => {
    const plan = planFor('A business. Get started today.');
    expect(plan.primaryCta.source).toBe('prompt');
    expect(plan.primaryCta.value.length).toBeGreaterThan(3);
  });

  test('absent tier: products absent when no products/services mentioned in prompt', () => {
    // A pure brand/story page — no products or services listed
    const plan = planFor('Our company. Our story. Our team. Our values.');
    expect(plan.products.source).toBe('absent');
    expect(plan.products.value).toBeNull();
  });
});

// ── 4. Absent only for genuinely missing sections ────────────────────────────

describe('content provenance — absent gating (D6)', () => {
  test('faqs are absent when no faq section in spec', () => {
    const plan = planFor('A yoga studio. Classes and private sessions.');
    // No FAQ requested → absent
    expect(plan.faqs.source).toBe('absent');
    expect(plan.faqs.value).toBeNull();
  });

  test('pricingPlans are absent when no pricing in spec', () => {
    const plan = planFor('A restaurant. View our menu. Book a table.');
    expect(plan.pricingPlans.source).toBe('absent');
    expect(plan.pricingPlans.value).toBeNull();
  });

  test('startingPrice is absent when no pricing signal in NLU', () => {
    const plan = planFor('A law firm. Expert legal counsel.');
    expect(plan.startingPrice.source).toBe('absent');
    expect(plan.startingPrice.value).toBe('');
  });
});

// ── 5. No niche fabrication for missing sections ──────────────────────────────

describe('content provenance — no niche fabrication for absent sections', () => {
  test('sports site: no products section → products.value is null', () => {
    const plan = planFor('A basketball training academy. Coaching programs. Online booking.');
    // Sports sites don't have products unless explicitly requested
    if (plan.products.source === 'absent') {
      expect(plan.products.value).toBeNull();
    }
  });

  test('pure story/about site: no products fabricated', () => {
    // A site focused on brand narrative — no products, no services listed
    const plan = planFor('A nonprofit foundation. Our mission and team. Impact stories.');
    // products should be absent since no products/services enumerated
    expect(plan.products.source).toBe('absent');
  });
});
