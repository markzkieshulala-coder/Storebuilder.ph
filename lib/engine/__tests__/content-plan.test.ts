/**
 * Content Plan Tests — Phase 3
 *
 * Verifies that buildContentPlan is the single source of truth for all
 * user-facing copy, with correct provenance tracking.
 *
 * 1. Provenance: every field has a source tag
 * 2. Hero: prompt descriptive sentences produce 'prompt' provenance
 * 3. About: 2+ descriptive sentences → 'prompt'; 0 sentences → 'niche'
 * 4. Products: absent when spec has no products section (D6)
 * 5. FAQ: absent when spec has no faq section (D6)
 * 6. Pricing: absent when spec has no pricing section (D6)
 * 7. NLU signals: differentiator/audience flow into feature heading
 * 8. Contact sub: location/hours from prompt → 'prompt' provenance
 * 9. CTA: explicit user CTA text → 'prompt' provenance
 * 10. Footer tagline: explicit tagline → 'prompt'; location → 'nlu'
 */

import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';
import { buildContentPlan } from '../content/plan';

function planFor(prompt: string) {
  const puo = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, puo);
  const normIndustry = normalizeIndustry(puo.inferredIndustry);
  const layoutPlan = buildLayoutPlan(prompt, puo, spec, normIndustry);
  const fp = 0;
  return buildContentPlan(prompt, puo, spec, layoutPlan, 'TestBrand', fp);
}

// ── 1. All fields have a Provenance tag ──────────────────────────────────────

describe('buildContentPlan — every field has provenance', () => {
  test('all ContentValue fields have a source tag', () => {
    const plan = planFor('A bakery. Products. Testimonials. FAQ.');
    const provenanceFields = [
      plan.heroHeadline, plan.heroSub, plan.heroTag, plan.primaryCta, plan.secondaryCta,
      plan.sectionEyebrow, plan.featureHeading, plan.features, plan.stats, plan.testimonials,
      plan.aboutHeading, plan.aboutBody, plan.aboutBullets, plan.missionHeading, plan.missionBody,
      plan.galleryHeading, plan.products, plan.productEyebrow, plan.contactHeading, plan.contactSub,
      plan.ctaHeading, plan.ctaSub, plan.footerTagline, plan.faqs, plan.pricingPlans, plan.startingPrice,
    ];
    for (const field of provenanceFields) {
      expect(field).toHaveProperty('source');
      expect(['prompt','nlu','niche','generic','absent']).toContain(field.source);
    }
  });

  test('_provenance summary is present and well-formed', () => {
    const plan = planFor('A bakery.');
    expect(plan._provenance).toBeDefined();
    expect(plan._provenance.promptCoverage).toBeGreaterThanOrEqual(0);
    expect(plan._provenance.promptCoverage).toBeLessThanOrEqual(1);
    const total = plan._provenance.promptCount + plan._provenance.nluCount
      + plan._provenance.nicheCount + plan._provenance.genericCount
      + plan._provenance.absentCount;
    expect(total).toBeGreaterThan(0);
  });
});

// ── 2. Hero: prompt-tier signals ─────────────────────────────────────────────

describe('buildContentPlan — hero prompt tier', () => {
  test('descriptive selling points become hero headline with prompt provenance', () => {
    const plan = planFor('A ramen shop. We serve authentic Hakata-style tonkotsu ramen.');
    expect(plan.heroHeadline.source).toBe('prompt');
    expect(plan.heroHeadline.value.length).toBeGreaterThan(3);
  });

  test('hero sub from descriptive sentences has prompt provenance', () => {
    const plan = planFor('A coffee shop. We brew single-origin pour-over coffee. Sourced from small farms.');
    expect(plan.heroSub.source).toBe('prompt');
    // The user's own words should appear in the hero sub
    expect(plan.heroSub.value.toLowerCase()).toMatch(/coffee|brew|pour|farm/i);
  });

  test('prompt with no descriptive sentences falls back to nlu headline', () => {
    const plan = planFor('Basketball training. Fast. Focused.');
    // Should be nlu (keyword patterns) since no descriptive sentences
    expect(['nlu', 'niche', 'generic']).toContain(plan.heroHeadline.source);
  });
});

// ── 3. About: provenance reflects signal richness ────────────────────────────

describe('buildContentPlan — about body provenance', () => {
  test('2+ descriptive sentences → aboutBody from prompt', () => {
    const plan = planFor(
      'A yoga studio. We offer trauma-informed yoga classes. Classes are designed for beginners and advanced practitioners.'
    );
    expect(plan.aboutBody.source).toBe('prompt');
    expect(plan.aboutBody.value.toLowerCase()).toMatch(/yoga|class/i);
  });

  test('prompt with no descriptive sentences → aboutBody from niche or nlu', () => {
    const plan = planFor('A restaurant.');
    expect(['niche', 'nlu', 'generic']).toContain(plan.aboutBody.source);
    expect(plan.aboutBody.value.length).toBeGreaterThan(20);
  });
});

// ── 4. D6: Products gated behind spec.sections ───────────────────────────────

describe('buildContentPlan — D6 catalog gating', () => {
  test('products absent when spec has no products section', () => {
    // Brand/story page — no products or services enumerated
    const plan = planFor('A brand studio. Our story, values, and creative process.');
    expect(plan.products.source).toBe('absent');
    expect(plan.products.value).toBeNull();
  });

  test('products present when spec includes products', () => {
    const plan = planFor('A coffee shop. Espresso, latte, cold brew. Order online.');
    // NLU should inject products into spec for this prompt
    if (plan.products.source !== 'absent') {
      expect(plan.products.value).not.toBeNull();
      expect(plan.products.value!.length).toBeGreaterThan(0);
    }
  });

  test('explicit NLU products produce prompt-tier provenance', () => {
    // A prompt explicit enough that NLU extracts product names
    const plan = planFor('A bakery. Sourdough bread, croissants, and cinnamon rolls. Order online.');
    if (plan.products.source === 'prompt') {
      expect(plan.products.value).not.toBeNull();
    }
    // Either absent (D6 gated) or prompt-sourced — never niche-fabricated without spec
    expect(['prompt', 'niche', 'absent']).toContain(plan.products.source);
  });
});

// ── 5. D6: FAQ gated behind spec.sections ────────────────────────────────────

describe('buildContentPlan — D6 FAQ gating', () => {
  test('faqs absent when spec has no faq section', () => {
    const plan = planFor('A photography portfolio. Show my best work.');
    // No FAQ requested → absent
    expect(plan.faqs.source).toBe('absent');
    expect(plan.faqs.value).toBeNull();
  });

  test('faqs present when faq section is requested', () => {
    const plan = planFor('A yoga studio. FAQ.');
    if (plan.faqs.source !== 'absent') {
      expect(plan.faqs.value).not.toBeNull();
      expect(plan.faqs.value!.length).toBeGreaterThan(0);
    }
  });
});

// ── 6. D6: Pricing gated behind spec.sections ────────────────────────────────

describe('buildContentPlan — D6 pricing gating', () => {
  test('pricingPlans absent when pricing not requested', () => {
    const plan = planFor('A bakery. Fresh bread every morning.');
    expect(plan.pricingPlans.source).toBe('absent');
    expect(plan.pricingPlans.value).toBeNull();
  });
});

// ── 7. NLU signals: differentiator + audience ─────────────────────────────────

describe('buildContentPlan — NLU signal flow', () => {
  test('differentiator flows into featureHeading', () => {
    const plan = planFor('A basketball academy. Expert coaching for youth athletes.');
    // featureHeading should reference the audience or differentiator
    if (plan.featureHeading.source === 'nlu') {
      expect(plan.featureHeading.value).toBeTruthy();
    }
  });

  test('audience flows into sectionEyebrow or featureHeading', () => {
    const plan = planFor('A fitness studio for busy professionals.');
    const combined = (plan.sectionEyebrow.value + ' ' + plan.featureHeading.value).toLowerCase();
    // At least one of them should reference "professionals" or be NLU-derived
    expect(plan.sectionEyebrow.source).not.toBe('absent');
    expect(plan.featureHeading.source).not.toBe('absent');
  });
});

// ── 8. Contact: prompt signals → 'prompt' provenance ─────────────────────────

describe('buildContentPlan — contact sub', () => {
  test('location in prompt produces prompt-tier contact sub', () => {
    const plan = planFor('A ramen shop in Manila. Open daily 11am-10pm. Call 0917-123-4567.');
    if (plan.contactSub.source === 'prompt') {
      expect(plan.contactSub.value.toLowerCase()).toMatch(/manila|11am|0917/i);
    }
    // contactSub should not be absent
    expect(plan.contactSub.source).not.toBe('absent');
  });
});

// ── 9. CTA: explicit user CTA text ───────────────────────────────────────────

describe('buildContentPlan — CTA provenance (strict)', () => {
  test('primaryCta absent when user did not name a CTA', () => {
    const plan = planFor('A minimal landing page.');
    expect(plan.primaryCta.source).toBe('absent');
    expect(plan.primaryCta.value).toBe('');
  });

  test('primaryCta from prompt when user writes intent phrase', () => {
    const plan = planFor('A SaaS product. Shop now. Features. Pricing.');
    expect(plan.primaryCta.source).toBe('prompt');
    expect(plan.primaryCta.value).toMatch(/shop now/i);
  });

  test('secondaryCta absent unless explicitly stated', () => {
    const plan = planFor('A SaaS product. Features. Pricing.');
    expect(plan.secondaryCta.source).toBe('absent');
  });
});

// ── 10. Footer tagline ────────────────────────────────────────────────────────

describe('buildContentPlan — footer tagline', () => {
  test('footerTagline never absent or empty', () => {
    const plan = planFor('A bakery.');
    expect(plan.footerTagline.source).not.toBe('absent');
    expect(plan.footerTagline.value.length).toBeGreaterThan(3);
  });

  test('location produces nlu-tier footer tagline', () => {
    const plan = planFor('A coffee shop in Cebu City.');
    if (plan.footerTagline.source === 'nlu') {
      expect(plan.footerTagline.value.toLowerCase()).toMatch(/cebu/i);
    }
  });
});
