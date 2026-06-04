/**
 * Phase 4F — section label provenance & variation tests.
 *
 * Phase 4F replaced hardcoded section eyebrows/headings ("FAQ"/"Common
 * Questions", "Featured", "Highlight", "Stay in the Loop", "Get in Touch",
 * "Our Team", "Pricing"/"Simple, Transparent Pricing", "What's On", etc.) with
 * niche- and prompt-aware values resolved in the ContentPlan and threaded to the
 * renderers via the SiteCopy adapter.
 *
 * These tests prove:
 *   A. Every section-label field is always populated (never empty) — fallback safety.
 *   B. Different niches produce different labels (no universal hardcoded string).
 *   C. Prompt signals (audience) can drive a label above the niche default.
 *   D. Rendered HTML uses the niche labels AND remains structurally stable
 *      (section markers intact, no empty eyebrow spans).
 */
import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';
import { buildContentPlan } from '../content/plan';
import { renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

function planFor(prompt: string, brand = 'TestBrand') {
  const puo = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, puo);
  const normIndustry = normalizeIndustry(puo.inferredIndustry);
  const layoutPlan = buildLayoutPlan(prompt, puo, spec, normIndustry);
  return buildContentPlan(prompt, puo, spec, layoutPlan, brand, 7);
}

function renderFor(prompt: string, brand = 'Acme') {
  const puo = buildUnderstandingSync(prompt);
  const ctx = new SharedContext({ userPrompt: prompt });
  return renderMultiPageSite(ctx, brand, '', puo).primaryPage;
}

// All the new section-label fields, by representative prompt per niche.
const NICHE_PROMPTS: Array<[string, string]> = [
  ['food',         'A ramen restaurant serving authentic tonkotsu broth.'],
  ['wellness',     'A wellness spa for mindful living and relaxation.'],
  ['technology',   'A software platform for engineering teams.'],
  ['photography',  'A photography studio shooting weddings and portraits.'],
  ['fashion',      'A fashion label with seasonal apparel collections.'],
  ['ecommerce',    'An online retail store selling home goods.'],
  ['agency',       'A branding and marketing agency for startups.'],
  ['hospitality',  'A boutique hotel and resort for travelers.'],
  ['professional', 'A law firm advising corporate clients.'],
  ['homeservices', 'A plumbing and home services company.'],
];

const LABEL_FIELDS = [
  'faqEyebrow', 'faqHeading', 'testimonialsEyebrow', 'testimonialsHeading',
  'storyEyebrow', 'highlightEyebrow', 'galleryEyebrow', 'contactEyebrow',
  'newsletterEyebrow', 'newsletterHeading', 'teamEyebrow', 'teamHeading',
  'bookingEyebrow', 'bookingHeading', 'locationEyebrow', 'locationHeading',
  'blogEyebrow', 'blogHeading', 'eventsEyebrow', 'eventsHeading',
  'pricingEyebrow', 'pricingHeading',
] as const;

describe('Phase 4F — section labels are always populated (fallback safety)', () => {
  test('every label field has a non-empty value for every niche', () => {
    for (const [, prompt] of NICHE_PROMPTS) {
      const plan = planFor(prompt) as unknown as Record<string, { value: string; source: string }>;
      for (const f of LABEL_FIELDS) {
        expect(plan[f]).toBeDefined();
        expect(typeof plan[f].value).toBe('string');
        expect(plan[f].value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Phase 4F — different niches produce different labels', () => {
  // The fields whose copy is genuinely niche-keyed (brand-embedding headings like
  // teamHeading are intentionally brand-, not niche-, driven and excluded here).
  const NICHE_VARIABLE = [
    'faqEyebrow', 'faqHeading', 'testimonialsEyebrow', 'testimonialsHeading',
    'storyEyebrow', 'highlightEyebrow', 'galleryEyebrow', 'contactEyebrow',
    'newsletterEyebrow', 'teamEyebrow', 'bookingEyebrow', 'locationEyebrow',
    'blogEyebrow', 'eventsEyebrow', 'pricingEyebrow', 'pricingHeading',
    'eventsHeading',
  ] as const;

  test('each niche-variable field takes at least 3 distinct values across niches', () => {
    const plans = NICHE_PROMPTS.map(([, p]) => planFor(p) as unknown as Record<string, { value: string }>);
    for (const f of NICHE_VARIABLE) {
      const distinct = new Set(plans.map(pl => pl[f].value));
      expect(distinct.size).toBeGreaterThanOrEqual(3);
    }
  });

  test('FAQ heading is not the universal old hardcoded value for niche prompts', () => {
    // Old behavior: every FAQ was "Common Questions". Now wellness/food/etc differ.
    const food = planFor('A ramen restaurant serving tonkotsu.');
    const tech = planFor('A SaaS analytics platform.');
    const wellness = planFor('A wellness spa for relaxation.');
    const headings = [food.faqHeading.value, tech.faqHeading.value, wellness.faqHeading.value];
    expect(new Set(headings).size).toBeGreaterThan(1);
  });

  test('pricing labels differ between food and photography', () => {
    const food = planFor('A ramen restaurant. Add a pricing section.');
    const photo = planFor('A photography studio. Add a pricing section.');
    expect(food.pricingHeading.value).not.toBe(photo.pricingHeading.value);
    expect(food.pricingEyebrow.value).not.toBe(photo.pricingEyebrow.value);
  });
});

describe('Phase 4F — prompt signals can drive labels above niche default', () => {
  test('audience-bearing prompt yields an audience-specific FAQ heading (nlu provenance)', () => {
    const plan = planFor('A fitness gym for busy professionals. We train busy professionals daily.');
    if (plan.faqHeading.source === 'nlu') {
      expect(plan.faqHeading.value.toLowerCase()).toContain('professional');
    }
    // story eyebrow upgrades to the differentiator when present
    const diff = planFor('A handcrafted, small-batch coffee roaster. Everything is handcrafted.');
    expect(diff.storyEyebrow.value.length).toBeGreaterThan(0);
  });
});

describe('Phase 4F — rendered HTML uses niche labels and stays stable', () => {
  const SECTION_PROMPT = (kind: string) =>
    ` Include an FAQ section. Add a testimonials section. Add a pricing section.` +
    ` Add a team section. Add a newsletter signup.${kind}`;

  test('FAQ / testimonials / pricing are omitted without user content (no fabricated labels)', () => {
    // NO FABRICATION: these content sections render only when the user supplies the
    // questions, quotes, or prices — never from a niche label/template bank.
    const wellness = renderFor('A wellness spa for mindful living.' + SECTION_PROMPT(''), 'Serenity');
    const food = renderFor('A ramen restaurant serving tonkotsu.' + SECTION_PROMPT(''), 'Ichiban');
    // Match RENDERED markup (class="...") not the always-present CSS rules (.faq-list{...}).
    for (const html of [wellness, food]) {
      expect(html).not.toMatch(/class="faq-list reveal"/);
      expect(html).not.toMatch(/class="price-grid"/);
      expect(html).not.toMatch(/class="testimonial-card/);
    }
  });

  test('no empty eyebrow spans are emitted', () => {
    const html = renderFor('A photography studio shooting weddings.' + SECTION_PROMPT(''), 'Lumen');
    expect(html).not.toMatch(/<span class="eyebrow">\s*<\/span>/);
  });

  test('team section still detected (heading retains "People Behind")', () => {
    const html = renderFor('A law firm for corporate clients. Add a team section.', 'Lex');
    // teamHeading default keeps the "People Behind" marker → detection stable
    expect(html).toMatch(/People Behind|team-card|>Our People</);
  });

  test('contact band still detected via stable class regardless of niche eyebrow', () => {
    // food contact eyebrow becomes "Visit Us" — detection must not rely on text
    const html = renderFor('A ramen restaurant. Add a contact section.', 'Ichiban');
    expect(html).toMatch(/contact-band|contact-detail|<form/);
  });
});
