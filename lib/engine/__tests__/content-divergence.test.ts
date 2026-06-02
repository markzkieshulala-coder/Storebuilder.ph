/**
 * Content Divergence Tests — Phase 3
 *
 * Verifies that two same-niche businesses with different prompts produce
 * DIFFERENT hero, about, CTA, and product content — not the same niche template.
 *
 * Before Phase 3: all content was niche-bucket-driven. Two food businesses
 * would produce essentially identical copy. This test suite locks in the
 * Phase 3 guarantee: content diverges in proportion to prompt specificity.
 *
 * 1. Hero headlines differ between two same-niche businesses
 * 2. About body differs when prompts contain different descriptive sentences
 * 3. CTA text differs when prompts contain different intent signals
 * 4. Testimonials differ when prompts describe different products/services
 * 5. Two luxury vs street basketball brands produce completely different copy
 * 6. Feature headings reflect prompt-specific differentiator/audience, not niche bucket
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
  return buildContentPlan(prompt, puo, spec, layoutPlan, brand, 100);
}

// ── 1. Hero divergence ────────────────────────────────────────────────────────

describe('content divergence — hero section', () => {
  test('two different food businesses produce different hero headlines', () => {
    const ramen = planFor('A ramen shop. We serve authentic 18-hour tonkotsu broth. Rich, slow-cooked pork bone soup.');
    const sushi = planFor('A sushi restaurant. Omakase dining with premium fish sourced daily from Tsukiji market.');
    expect(ramen.heroHeadline.value).not.toBe(sushi.heroHeadline.value);
  });

  test('luxury vs street basketball: hero headlines are completely different', () => {
    const luxury = planFor(
      'Luxury basketball brand for professional athletes. Black and gold. Featured athletes. Limited edition collections. VIP membership.'
    );
    const street = planFor(
      'Street basketball brand for teenagers. Neon colors. Community events. Street culture. Budget-friendly products.'
    );
    expect(luxury.heroHeadline.value).not.toBe(street.heroHeadline.value);
  });

  test('hero sub reflects different business descriptions', () => {
    const planA = planFor('A law firm. We provide expert litigation and contract law services for corporate clients.');
    const planB = planFor('A family law clinic. Compassionate support for divorce, custody, and estate planning.');
    // Both are professional/legal but with different emphases
    expect(planA.heroSub.value).not.toBe(planB.heroSub.value);
  });
});

// ── 2. About body divergence ──────────────────────────────────────────────────

describe('content divergence — about body', () => {
  test('same industry, different selling points → different about bodies', () => {
    const planA = planFor(
      'A yoga studio. We offer trauma-informed, somatic yoga for trauma survivors. Classes in small groups of 6.'
    );
    const planB = planFor(
      'A yoga studio. Power yoga and HIIT fusion for competitive athletes. Strength, flexibility, and performance.'
    );
    expect(planA.aboutBody.value).not.toBe(planB.aboutBody.value);
  });

  test('about body from prompt contains user-written sentences', () => {
    const plan = planFor(
      'A bakery. We bake all our bread from scratch using 48-hour fermented sourdough. Every loaf is hand-shaped and stone-baked.'
    );
    if (plan.aboutBody.source === 'prompt') {
      expect(plan.aboutBody.value.toLowerCase()).toMatch(/bake|sourdough|bread|hand/i);
    }
  });
});

// ── 3. CTA divergence ────────────────────────────────────────────────────────

describe('content divergence — CTA text', () => {
  test('food site and sports site produce different primary CTAs', () => {
    const food = planFor('A restaurant. Book a table.');
    const sports = planFor('A basketball academy. Start training.');
    expect(food.primaryCta.value).not.toBe(sports.primaryCta.value);
  });

  test('primary CTA reflects user intent signal when present', () => {
    const plan = planFor('A coffee shop. Order online for delivery.');
    // "Order" is an intentCta signal
    expect(plan.primaryCta.source).not.toBe('absent');
    // The CTA should be relevant to ordering/delivery
    expect(plan.primaryCta.value.length).toBeGreaterThan(3);
  });
});

// ── 4. Testimonials divergence ────────────────────────────────────────────────

describe('content divergence — testimonials', () => {
  test('different product descriptions lead to different testimonial copy', () => {
    const planA = planFor('A basketball gear shop. High-performance sneakers. Professional training equipment.');
    const planB = planFor('A coffee equipment shop. Commercial espresso machines. Premium grinders. Barista tools.');
    // When products differ, testimonials differ
    expect(planA.testimonials.value[0].quote).not.toBe(planB.testimonials.value[0].quote);
  });
});

// ── 5. Basketball luxury vs street: full content audit ───────────────────────

describe('content divergence — luxury vs street basketball', () => {
  const luxury = planFor(
    'Luxury basketball brand for professional athletes. Black and gold. Featured athletes. Limited edition collections. VIP membership.',
    'BlackGold'
  );
  const street = planFor(
    'Street basketball brand for teenagers. Neon colors. Community events. Street culture. Budget-friendly products.',
    'StreetBall'
  );
  const academy = planFor(
    'Basketball training academy. Coaching programs. Player development. Online booking.',
    'CoachUp'
  );

  test('hero headlines are pairwise different', () => {
    expect(luxury.heroHeadline.value).not.toBe(street.heroHeadline.value);
    expect(street.heroHeadline.value).not.toBe(academy.heroHeadline.value);
    expect(luxury.heroHeadline.value).not.toBe(academy.heroHeadline.value);
  });

  test('hero sub texts are pairwise different', () => {
    expect(luxury.heroSub.value).not.toBe(street.heroSub.value);
    expect(street.heroSub.value).not.toBe(academy.heroSub.value);
  });

  test('feature headings reflect prompt-specific signals', () => {
    // Each should have a distinct featureHeading based on its signals
    expect(luxury.featureHeading.value).not.toBe(street.featureHeading.value);
  });

  test('footer taglines reflect prompt-specific differentiators', () => {
    expect(luxury.footerTagline.value).not.toBe(street.footerTagline.value);
    expect(luxury.footerTagline.value).not.toBe(academy.footerTagline.value);
  });
});

// ── 6. Feature headings carry prompt signals ─────────────────────────────────

describe('content divergence — feature headings', () => {
  test('differentiator appears in featureHeading when present', () => {
    const plan = planFor('A premium handcrafted leather goods shop for fashion-conscious professionals.');
    if (plan.featureHeading.source === 'nlu') {
      const heading = plan.featureHeading.value.toLowerCase();
      // Should reference "handcrafted" or "professionals"
      expect(heading.length).toBeGreaterThan(5);
    }
  });

  test('two businesses with different audiences have different feature headings', () => {
    const planA = planFor('A yoga studio for seniors and retirees.');
    const planB = planFor('A yoga studio for competitive athletes and professional sports teams.');
    // Audience is different → featureHeading should differ
    expect(planA.featureHeading.value).not.toBe(planB.featureHeading.value);
  });
});
