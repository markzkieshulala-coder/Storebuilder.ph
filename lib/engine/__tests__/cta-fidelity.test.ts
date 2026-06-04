/**
 * CTA / Button Fidelity Tests
 *
 * Locks in the prompt-driven button contract:
 *  1. When the user names NO call-to-action, the engine never fabricates a
 *     secondary "Learn More" button anywhere on the page.
 *  2. The hero / closing band still carry ONE niche-relevant primary action.
 *  3. When the user names explicit buttons, those exact labels are rendered.
 *  4. A user-named secondary button is honoured; absent otherwise.
 */

import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';

function renderFor(prompt: string, brand: string): string {
  const understanding = buildUnderstandingSync(prompt);
  const ctx = new SharedContext({ userPrompt: prompt });
  return renderMultiPageSite(ctx, brand, '', understanding).primaryPage;
}

describe('CTA fidelity — no fabricated buttons', () => {
  const NO_CTA_PROMPT =
    'A cozy neighbourhood coffee shop serving single-origin espresso and fresh pastries. ' +
    'Warm, minimal design. Include an about section and a menu.';

  test('never renders a fabricated "Learn More" button when no CTA was requested', () => {
    const html = renderFor(NO_CTA_PROMPT, 'Bean & Brew');
    expect(html).not.toMatch(/Learn More/i);
  });

  test('renders NO hero/CTA button when the prompt names none (strict, no fabrication)', () => {
    // A non-commerce prompt that requests no CTA must not invent one. The hero has
    // no button, and a menu with no shopping intent has no Add-to-Cart.
    const html = renderFor(NO_CTA_PROMPT, 'Bean & Brew');
    const buttons = [...html.matchAll(/class="btn[^"]*"[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    expect(buttons).toEqual([]);
  });

  test('does not render empty button anchors', () => {
    const html = renderFor(NO_CTA_PROMPT, 'Bean & Brew');
    // No anchor/button whose visible label is empty or only an arrow.
    expect(html).not.toMatch(/class="btn[^"]*">\s*(?:→)?\s*<\/a>/);
  });
});

describe('CTA fidelity — exact user buttons', () => {
  test('renders the exact primary and secondary labels the user named', () => {
    const prompt =
      'A ramen restaurant in Cebu. Add an "Order Now" button and a "Reserve a Table" button. ' +
      'Include a menu and contact section.';
    const html = renderFor(prompt, 'Ichiban Ramen');
    expect(html).toContain('Order Now');
    expect(html).toContain('Reserve a Table');
  });

  test('honours a single user CTA without inventing a second one', () => {
    const prompt =
      'A SaaS analytics platform for small teams. Add a button that says "Start Free Trial". ' +
      'Keep it focused with a features section.';
    const html = renderFor(prompt, 'Metricly');
    expect(html).toContain('Start Free Trial');
    expect(html).not.toMatch(/Learn More/i);
  });

  test('a builder directive never leaks into page content (feature/heading)', () => {
    const prompt =
      'A SaaS analytics platform for small teams. Add a button that says "Start Free Trial". ' +
      'Include a pricing section and use a dark theme.';
    const html = renderFor(prompt, 'Metricly');
    // The instruction sentence must not appear as a heading or body paragraph.
    expect(html).not.toMatch(/<h[1-4][^>]*>\s*Add a button/i);
    expect(html).not.toMatch(/Add a button that says/i);
    expect(html).not.toMatch(/use a dark theme/i);
  });
});
