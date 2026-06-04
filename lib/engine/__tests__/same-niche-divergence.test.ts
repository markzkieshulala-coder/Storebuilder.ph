/**
 * Same-Niche Divergence (rendered HTML)
 *
 * Two different businesses in the SAME niche must not produce a templated,
 * near-identical page. Asserts the rendered home documents diverge in hero copy,
 * body content, and overall structure — driven by each prompt, not a fixed
 * per-niche template.
 */

import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';

function render(prompt: string, brand: string): string {
  const u = buildUnderstandingSync(prompt);
  return renderMultiPageSite(new SharedContext({ userPrompt: prompt }), brand, '', u).primaryPage;
}

/** First <h1> text. */
function h1(html: string): string {
  return (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();
}
/** Ordered list of <h2> headings — a proxy for section structure. */
function h2s(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
}

describe('same niche, different prompts → different sites', () => {
  // Two distinct coffee shops (same niche), different positioning/products.
  const A = render(
    'Roast & Co, a third-wave specialty coffee roaster for serious home brewers. ' +
      'We sell single-origin beans, pour-over kits, and subscriptions. Calm, editorial tone.',
    'Roast & Co',
  );
  const B = render(
    'Buzz Hub, a vibrant student cafe near campus famous for iced lattes, bubble waffles, ' +
      'and late-night study hours. Playful, energetic vibe.',
    'Buzz Hub',
  );

  test('hero headlines differ', () => {
    expect(h1(A)).not.toBe(h1(B));
    expect(h1(A).length).toBeGreaterThan(0);
    expect(h1(B).length).toBeGreaterThan(0);
  });

  test('section heading structure is not an identical template', () => {
    expect(h2s(A).join('|')).not.toBe(h2s(B).join('|'));
  });

  test('rendered bodies are substantially different', () => {
    // Visible copy only — strip the shared CSS/JS (identical design system) so we
    // measure CONTENT divergence, not boilerplate.
    const visible = (html: string) =>
      html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const textA = visible(A);
    const textB = visible(B);
    expect(textA).not.toBe(textB);
    const wordsA = new Set(textA.toLowerCase().split(' ').filter(w => w.length > 3));
    const wordsB = new Set(textB.toLowerCase().split(' ').filter(w => w.length > 3));
    const shared = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    // Jaccard similarity of meaningful words should be well under half — the two
    // sites are genuinely distinct, not a per-niche template with swapped nouns.
    expect(shared / union).toBeLessThan(0.5);
  });

  test('neither page fabricates a Learn More button', () => {
    expect(A).not.toMatch(/Learn More/i);
    expect(B).not.toMatch(/Learn More/i);
  });
});
