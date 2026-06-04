/**
 * Strict Generation — the site contains ONLY what the prompt requested.
 *
 * Guards against the reported regression where bare prompts produced unrequested
 * pages (auto-promoted /work, /menu), unrequested CTA/contact bands, and
 * niche-default buttons ("Start a Project", "View Menu", "Get in Touch").
 */

import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

function render(prompt: string, brand = 'Studio') {
  const u = buildUnderstandingSync(prompt);
  const res = renderMultiPageSite(new SharedContext({ userPrompt: prompt }), brand, '', u);
  const buttons = [...new Set(
    [...res.primaryPage.matchAll(/class="btn[^"]*"[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  )];
  return { u, res, html: res.primaryPage, buttons, pages: Object.keys(res.pages) };
}

describe('bare prompt → single page, no fabricated buttons/pages', () => {
  const { html, buttons, pages } = render('Social Media Manager Freelancer Portfolio');

  test('exactly one page — no auto-promoted /work page', () => {
    expect(pages).toEqual(['/']);
  });

  test('no fabricated CTA buttons (none were requested)', () => {
    expect(buttons).toEqual([]);
    expect(html).not.toMatch(/Start a Project|Get in Touch|Learn More|View Menu/i);
  });

  test('detected as socialmedia, not SaaS', () => {
    const { u } = render('Social Media Manager Freelancer Portfolio');
    expect(u.inferredIndustry).toBe('socialmedia');
  });
});

describe('multi-section clause is fully honoured (no under-generation)', () => {
  const prompt = 'A bakery. Only show a menu and a contact section. No testimonials. No about section. No pricing.';
  const spec = buildWebsiteSpec(prompt, buildUnderstandingSync(prompt));

  test('"a menu and a contact section" → BOTH products and contact required', () => {
    expect(spec.sections).toContain('products');
    expect(spec.sections).toContain('contact');
  });

  test('forbidden sections are excluded', () => {
    expect(spec.sections).not.toContain('testimonials');
    expect(spec.sections).not.toContain('pricing');
    expect(spec.sections).not.toContain('story');
  });

  test('renders as a single page (no auto /menu page)', () => {
    const { pages } = render(prompt, 'Sweet Crumb');
    expect(pages).toEqual(['/']);
  });
});

describe('explicit user CTA is rendered verbatim', () => {
  test('"Add a Hire Me button" → Hire Me appears', () => {
    const { html } = render(
      'A portfolio for a freelance social media manager. Add a "Hire Me" button. Include a gallery.',
    );
    expect(html).toContain('Hire Me');
  });
});
