/**
 * Phase 1 — WebsiteSpec Tests
 *
 * Proves four properties of the new architecture:
 *   1. Required sections come from WebsiteSpec (not from the layout graph).
 *   2. Forbidden sections come from WebsiteSpec (absolute authority).
 *   3. composeLayoutGraph cannot add sections absent from WebsiteSpec.
 *   4. enforceSections performs zero corrections for the basketball prompt.
 *
 * Anchored on the same basketball ecommerce prompt used in the existing
 * requirement-enforcement test suite.
 */

import { buildWebsiteSpec } from '../spec';
import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';
import { detectRenderedKinds } from '../requirements';

const BASKETBALL_PROMPT = `Build a premium basketball ecommerce website.

Requirements:

- Black and gold theme
- Featured athletes section
- Jersey collections
- Basketball shoes catalog
- Loyalty rewards program
- Limited edition products
- About our mission section
- Instagram gallery
- Newsletter signup
- Contact page

Do not include testimonials.
Do not include FAQs.
Do not include generic placeholder content.`;

function renderFor(prompt: string, brand = 'Brand') {
  const puo = buildUnderstandingSync(prompt);
  const ctx = new SharedContext({ userPrompt: prompt });
  return renderMultiPageSite(ctx, brand, '', puo);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. buildWebsiteSpec — source of truth construction
// ─────────────────────────────────────────────────────────────────────────────

describe('buildWebsiteSpec — basketball prompt', () => {
  const puo = buildUnderstandingSync(BASKETBALL_PROMPT);
  const spec = buildWebsiteSpec(BASKETBALL_PROMPT, puo);

  test('forbidden sections come from prompt directives', () => {
    expect(spec.forbiddenSections).toContain('testimonials');
    expect(spec.forbiddenSections).toContain('faq');
  });

  test('forbidden sections are never in sections', () => {
    for (const kind of spec.forbiddenSections) {
      expect(spec.sections).not.toContain(kind);
    }
  });

  test('required sections are present in spec.sections', () => {
    // athletes → team, jersey/shoes/editions → products, loyalty → pricing,
    // mission → story, instagram → gallery, newsletter, contact
    expect(spec.sections).toEqual(expect.arrayContaining([
      'team', 'products', 'pricing', 'story', 'gallery', 'newsletter', 'contact',
    ]));
  });

  test('spec.sections has no duplicates', () => {
    expect(spec.sections.length).toBe(new Set(spec.sections).size);
  });

  test('spec.forbiddenSections has no duplicates', () => {
    expect(spec.forbiddenSections.length).toBe(new Set(spec.forbiddenSections).size);
  });
});

describe('buildWebsiteSpec — negation handling', () => {
  test('"do not include X" makes X forbidden, not required', () => {
    const puo = buildUnderstandingSync('A gym site. Do not include testimonials.');
    const spec = buildWebsiteSpec('A gym site. Do not include testimonials.', puo);
    expect(spec.forbiddenSections).toContain('testimonials');
    expect(spec.sections).not.toContain('testimonials');
  });

  test('"without X" makes X forbidden', () => {
    const puo = buildUnderstandingSync('A bakery site without an FAQ and without a newsletter.');
    const spec = buildWebsiteSpec('A bakery site without an FAQ and without a newsletter.', puo);
    expect(spec.forbiddenSections).toContain('faq');
    expect(spec.forbiddenSections).toContain('newsletter');
  });

  test('ordinary prose "no-contract" does not forbid pricing', () => {
    const prompt = 'A gym with no-contract memberships and a pricing page.';
    const puo = buildUnderstandingSync(prompt);
    const spec = buildWebsiteSpec(prompt, puo);
    expect(spec.forbiddenSections).not.toContain('pricing');
    expect(spec.sections).toContain('pricing');
  });

  test('forbidden beats NLU inference — if prompt forbids X and NLU infers X, X is forbidden', () => {
    // The NLU would infer testimonials for many ecommerce prompts. The prompt
    // explicitly forbids them. The spec must honour the prompt over NLU.
    const puo = buildUnderstandingSync(BASKETBALL_PROMPT);
    const spec = buildWebsiteSpec(BASKETBALL_PROMPT, puo);
    expect(spec.forbiddenSections).toContain('testimonials');
    expect(spec.sections).not.toContain('testimonials');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Required sections come from WebsiteSpec
// ─────────────────────────────────────────────────────────────────────────────

describe('Required sections — source is WebsiteSpec, not the layout graph', () => {
  const result = renderFor(BASKETBALL_PROMPT);
  const allSectionsHtml = [result.primaryPage].join('\n');

  test('team section is rendered (spec required it — graph never generates team nodes)', () => {
    // The layout graph has no "team" node type. If team appears, it was built by
    // the spec-driven construction step, proving spec — not the graph — owns inclusion.
    expect(allSectionsHtml).toMatch(/People Behind|Our Team/);
  });

  test('newsletter section is rendered (spec required it — graph has no newsletter node type)', () => {
    expect(allSectionsHtml).toMatch(/newsletter-section/);
  });

  test('pricing section is OMITTED — loyalty/rewards implies pricing but no prices were given', () => {
    // NO FABRICATION: the engine does not invent a Basic/Pro price ladder.
    // Match the rendered element (class="price-grid"), not the CSS rule (.price-grid).
    expect(allSectionsHtml).not.toMatch(/class="price-grid"/);
  });

  test('fidelity report has no missing required sections and no forbidden present', () => {
    // Fidelity requires only the sections that actually carry prompt-derived
    // content; content-empty requested sections (pricing/story) are omitted.
    expect(result.fidelity.requiredMissing).toEqual([]);
    expect(result.fidelity.forbiddenPresent).toEqual([]);
    expect(result.fidelity.score).toBe(1);
  });

  test('everything the fidelity report marks present is genuinely a requested section', () => {
    for (const kind of result.fidelity.requiredPresent) {
      expect(result.spec.sections).toContain(kind);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. composeLayoutGraph cannot add sections not present in WebsiteSpec
// ─────────────────────────────────────────────────────────────────────────────

describe('composeLayoutGraph — cannot override WebsiteSpec forbidden sections', () => {
  const result = renderFor(BASKETBALL_PROMPT);

  test('testimonials are absent — graph list-nodes were pre-filtered before rendering', () => {
    // The graph may compose list nodes. The pre-filter in buildHomeMain removes
    // them when their kind is in spec.forbiddenSections — before renderNode runs.
    // Check the HTML attribute (class="testimonial-card"), NOT the CSS class
    // selector (.testimonial-card{...}) which always appears in the stylesheet.
    expect(result.primaryPage).not.toMatch(/class="testimonial-card"/);
    expect(result.primaryPage).not.toMatch(/What People Say/);
  });

  test('faq is absent — graph accordion-list-nodes were pre-filtered before rendering', () => {
    expect(result.primaryPage).not.toMatch(/class="faq-list reveal"><details>/);
    expect(result.primaryPage).not.toMatch(/Common Questions/);
  });

  test('fidelity report shows no forbidden sections rendered', () => {
    expect(result.fidelity.forbiddenPresent).toEqual([]);
  });

  test('spec.forbiddenSections contains testimonials and faq', () => {
    expect(result.spec.forbiddenSections).toContain('testimonials');
    expect(result.spec.forbiddenSections).toContain('faq');
  });

  test('spec.sections does not contain any forbidden kind', () => {
    const forbidden = new Set(result.spec.forbiddenSections);
    for (const kind of result.spec.sections) {
      expect(forbidden.has(kind)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. enforceSections performs zero corrections for the basketball prompt
// ─────────────────────────────────────────────────────────────────────────────

describe('enforceSections — zero corrections after Phase 1', () => {
  const result = renderFor(BASKETBALL_PROMPT);

  test('enforceSections dropped nothing — pre-filter removed forbidden before rendering', () => {
    expect(result.homeEnforcement.dropped).toEqual([]);
  });

  test('enforceSections injected nothing — spec-driven construction covered all required kinds', () => {
    expect(result.homeEnforcement.injected).toEqual([]);
  });

  test('homeEnforcement is a complete no-op (both arrays empty)', () => {
    expect(result.homeEnforcement.dropped.length + result.homeEnforcement.injected.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. detectRenderedKinds — the detection layer used by WebsiteSpec construction
// ─────────────────────────────────────────────────────────────────────────────

describe('detectRenderedKinds — section markers are accurate', () => {
  test('newsletter-section marker detects newsletter', () => {
    const html = '<section class="newsletter-section signal-section"><h2>Join</h2></section>';
    expect(detectRenderedKinds(html).has('newsletter')).toBe(true);
  });

  test('team markers detect team section', () => {
    const html = '<section><div class="sec-head"><span>Our Team</span><h2>The People Behind Brand</h2></div></section>';
    expect(detectRenderedKinds(html).has('team')).toBe(true);
  });

  test('price-grid detects pricing', () => {
    const html = '<div class="price-grid"><div class="price-card">...</div></div>';
    expect(detectRenderedKinds(html).has('pricing')).toBe(true);
  });

  test('faq-list detects faq but only via the structural marker, not class in stylesheet', () => {
    const structuralFaq = '<div class="faq-list reveal"><details><summary>Q</summary><p>A</p></details></div>';
    const stylesheetClass = '.faq-list { display: flex; }';
    expect(detectRenderedKinds(structuralFaq).has('faq')).toBe(true);
    expect(detectRenderedKinds(stylesheetClass).has('faq')).toBe(false);
  });
});
