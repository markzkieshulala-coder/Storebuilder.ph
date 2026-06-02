/**
 * Requirement-Enforcement Tests
 *
 * Verifies the contract the renderer now enforces against the prompt:
 *   • FORBIDDEN sections ("do not include X") are never rendered.
 *   • REQUIRED sections (explicit bullet list) are always rendered.
 *   • Negation never leaks a forbidden word into the required list.
 *   • A fidelity score is produced and reflects actual rendered sections.
 *
 * Anchored on the exact failing prompt the user reported (basketball ecommerce).
 */

import {
  extractRequirements,
  scoreFidelity,
  detectRenderedKinds,
  canonicalKind,
  enforceSections,
} from '../requirements';
import { understandPrompt } from '../nlu';
import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';

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
// 1. Requirement extraction — positive vs negative
// ─────────────────────────────────────────────────────────────────────────────

describe('extractRequirements — negation never becomes a requirement', () => {
  test('forbids testimonials and FAQ from "do not include" lines', () => {
    const req = extractRequirements(BASKETBALL_PROMPT);
    expect(req.forbidden).toContain('testimonials');
    expect(req.forbidden).toContain('faq');
  });

  test('does NOT add forbidden sections to required', () => {
    const req = extractRequirements(BASKETBALL_PROMPT);
    expect(req.required).not.toContain('testimonials');
    expect(req.required).not.toContain('faq');
  });

  test('extracts required sections from the bullet list', () => {
    const req = extractRequirements(BASKETBALL_PROMPT);
    // athletes→team, jerseys/shoes/editions→products, loyalty→pricing,
    // mission→story, instagram→gallery, newsletter, contact page
    expect(req.required).toEqual(expect.arrayContaining([
      'team', 'products', 'pricing', 'story', 'gallery', 'newsletter', 'contact',
    ]));
  });

  test('"no X section" phrasing also forbids', () => {
    const req = extractRequirements('Build a gym site. No testimonials section. No pricing section.');
    expect(req.forbidden).toContain('testimonials');
    expect(req.forbidden).toContain('pricing');
  });

  test('"without X" phrasing forbids', () => {
    const req = extractRequirements('A bakery site without an FAQ and without a newsletter.');
    expect(req.forbidden).toContain('faq');
    expect(req.forbidden).toContain('newsletter');
  });

  test('ordinary prose with "no" is not treated as a forbidding directive', () => {
    // "no-contract" must not strip a real section
    const req = extractRequirements('A gym with no-contract memberships and a pricing page.');
    expect(req.forbidden).not.toContain('pricing');
    expect(req.required).toContain('pricing');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. NLU — forbidden never leaks into sections
// ─────────────────────────────────────────────────────────────────────────────

describe('NLU sections respect negative constraints', () => {
  test('forbidden kinds are absent from nlu.sections', () => {
    const nlu = understandPrompt(BASKETBALL_PROMPT);
    const kinds = (nlu.sections || []).map(s => canonicalKind(s));
    expect(kinds).not.toContain('testimonials');
    expect(kinds).not.toContain('faq');
  });

  test('excludedSections lists the forbidden kinds', () => {
    const nlu = understandPrompt(BASKETBALL_PROMPT);
    expect(nlu.excludedSections).toEqual(expect.arrayContaining(['testimonials', 'faq']));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Rendered output — the contract holds end-to-end
// ─────────────────────────────────────────────────────────────────────────────

describe('Rendered site honours required + forbidden sections', () => {
  const result = renderFor(BASKETBALL_PROMPT);
  // Score only the rendered section bodies (not the full doc whose <style> has class names)
  const sectionsHtml = [result.primaryPage].join('\n');

  test('testimonials section is NOT rendered', () => {
    expect(result.primaryPage).not.toMatch(/What People Say/);
    expect(result.primaryPage).not.toMatch(/class="g3">\s*<div class="testimonial-card/);
  });

  test('FAQ section is NOT rendered', () => {
    expect(result.primaryPage).not.toMatch(/Common Questions/);
    expect(result.primaryPage).not.toMatch(/class="faq-list reveal"><details>/);
  });

  test('fidelity score is 100% with no violations', () => {
    expect(result.fidelity.forbiddenPresent).toEqual([]);
    expect(result.fidelity.requiredMissing).toEqual([]);
    expect(result.fidelity.score).toBe(1);
  });

  test('required sections are all present in the fidelity report', () => {
    expect(result.fidelity.requiredPresent).toEqual(expect.arrayContaining([
      'team', 'products', 'pricing', 'story', 'gallery', 'newsletter', 'contact',
    ]));
  });

  test('products reflect the user catalog, not generic placeholders', () => {
    const html = result.primaryPage;
    expect(html).not.toMatch(/Signature Tee|Everyday Hoodie|Tailored Trousers/);
    expect(html).toMatch(/Jersey|Basketball Shoes|Limited Edition/);
  });

  test('black & gold theme is applied', () => {
    expect(result.primaryPage).toMatch(/#0a0a0|--primary:#0|gold|#caa017|#d4af37/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. enforceSections — unit behaviour
// ─────────────────────────────────────────────────────────────────────────────

describe('enforceSections — drops forbidden, injects required', () => {
  const headingOf = (h: string) => { const m = h.match(/<h2[^>]*>([\s\S]*?)<\/h2>/); return m ? m[1].toLowerCase() : null; };

  test('drops a fragment whose kind is forbidden', () => {
    const rendered = [
      '<section class="newsletter-section"><h2>Join</h2></section>',
      '<section><div class="testimonial-card">x</div></section>',
    ];
    const res = enforceSections(rendered, [], ['testimonials'], () => '', headingOf);
    expect(res.sections.join('')).not.toMatch(/testimonial-card/);
    expect(res.dropped).toContain('testimonials');
  });

  test('injects a required kind that was missing', () => {
    const rendered = ['<section class="newsletter-section"><h2>Join</h2></section>'];
    const res = enforceSections(
      rendered,
      ['gallery'],
      [],
      (kind) => kind === 'gallery' ? '<section><div class="gallery-grid">g</div></section>' : '',
      headingOf,
    );
    expect(res.injected).toContain('gallery');
    expect(res.sections.join('')).toMatch(/gallery-grid/);
  });

  test('never injects a kind that is also forbidden', () => {
    const rendered: string[] = [];
    const res = enforceSections(
      rendered,
      ['testimonials'],
      ['testimonials'],
      () => '<section><div class="testimonial-card">x</div></section>',
      headingOf,
    );
    expect(res.sections.join('')).not.toMatch(/testimonial-card/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. scoreFidelity + detectRenderedKinds — scoring math
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreFidelity', () => {
  test('perfect score when required present and forbidden absent', () => {
    const html = '<section class="newsletter-section"></section><section class="gallery-grid"></section>';
    const res = scoreFidelity({ required: ['newsletter', 'gallery'], forbidden: ['testimonials'], requiredPages: [], forbiddenPages: [], rawRequired: [], rawForbidden: [] }, html);
    expect(res.score).toBe(1);
    expect(res.forbiddenPresent).toEqual([]);
  });

  test('forbidden present is a violation and lowers the score', () => {
    const html = '<section class="newsletter-section"></section><section><div class="testimonial-card"></div></section>';
    const res = scoreFidelity({ required: ['newsletter'], forbidden: ['testimonials'], requiredPages: [], forbiddenPages: [], rawRequired: [], rawForbidden: [] }, html);
    expect(res.forbiddenPresent).toContain('testimonials');
    expect(res.score).toBeLessThan(1);
  });

  test('missing required lowers the score', () => {
    const html = '<section class="newsletter-section"></section>';
    const res = scoreFidelity({ required: ['newsletter', 'gallery'], forbidden: [], requiredPages: [], forbiddenPages: [], rawRequired: [], rawForbidden: [] }, html);
    expect(res.requiredMissing).toContain('gallery');
    expect(res.score).toBe(0.5);
  });

  test('detectRenderedKinds reads section markers, not arbitrary text', () => {
    const kinds = detectRenderedKinds('<section class="newsletter-section"><div class="gallery-grid"></div></section>');
    expect(kinds.has('newsletter')).toBe(true);
    expect(kinds.has('gallery')).toBe(true);
    expect(kinds.has('faq')).toBe(false);
  });
});
