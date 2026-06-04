/**
 * Explicit Navigation is authoritative.
 *
 * When the user types a navigation list, the site's nav must be EXACTLY that list
 * (same labels, same order, Contact included) — never the engine's auto-detected
 * sections (no surprise Gallery/Features/Visit/Cart), and the section set is
 * restricted to those nav items.
 */

import { extractNavItems } from '../prompt-copy';
import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';
import { buildLayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';

function planFor(prompt: string) {
  const u = buildUnderstandingSync(prompt);
  const spec = buildWebsiteSpec(prompt, u);
  return {
    spec,
    plan: buildLayoutPlan(prompt, u, spec, normalizeIndustry(u.inferredIndustry)),
  };
}

const COFFEE = `Create a coffee shop website. Business Name: Blue Brew Coffee.
Navigation:
Home
About Us
Menu
Contact

Hero headline "Fresh Coffee, Great Conversations". Primary CTA: View Menu. Secondary CTA: Visit Us Today.
About Us: We are a family-run coffee shop. We roast premium beans.
Menu: Espresso, Latte, Mocha.
Contact: address, phone, hours, map location.`;

const SOCIAL = `Create a personal portfolio for a freelance social media manager. Name: Kate Smith.
Navigation:
Home
About Me
Services
Contact

Hero headline "I Help Businesses Grow". Primary CTA: Hire Me.
About Me: I am a freelance social media manager.
Services: Social Media Management, Content Strategy.
Contact: form.`;

describe('extractNavItems', () => {
  test('parses a newline navigation list', () => {
    expect(extractNavItems(COFFEE)).toEqual(['Home', 'About Us', 'Menu', 'Contact']);
  });
  test('parses a second list with different items', () => {
    expect(extractNavItems(SOCIAL)).toEqual(['Home', 'About Me', 'Services', 'Contact']);
  });
});

describe('navigation honours the explicit list exactly', () => {
  test('coffee: nav is exactly Home/About Us/Menu/Contact (no Visit, no Cart)', () => {
    const { plan } = planFor(COFFEE);
    expect(plan.navigation.map(n => n.label)).toEqual(['Home', 'About Us', 'Menu', 'Contact']);
    // Contact is present; the auto-detected location ("map") did NOT add a "Visit".
    expect(plan.navigation.some(n => /visit/i.test(n.label))).toBe(false);
    // A menu with prices is not a store — no Cart was added.
    expect(plan.navigation.some(n => /cart/i.test(n.label))).toBe(false);
    expect(plan.hasCart).toBe(false);
  });

  test('social: nav is exactly Home/About Me/Services/Contact (no Gallery/Features)', () => {
    const { plan } = planFor(SOCIAL);
    expect(plan.navigation.map(n => n.label)).toEqual(['Home', 'About Me', 'Services', 'Contact']);
    expect(plan.navigation.some(n => /gallery|features/i.test(n.label))).toBe(false);
  });
});

describe('every nav item maps to a real section', () => {
  // The explicit nav is additive: nav order/labels are authoritative, and each
  // navigable item has a corresponding section so its anchor scrolls.
  test('coffee: story/products/contact sections exist for About Us/Menu/Contact', () => {
    const { spec } = planFor(COFFEE);
    expect(spec.sections).toEqual(expect.arrayContaining(['story', 'products', 'contact']));
  });
  test('social: story/features/contact sections exist for About Me/Services/Contact', () => {
    const { spec } = planFor(SOCIAL);
    expect(spec.sections).toEqual(expect.arrayContaining(['story', 'features', 'contact']));
  });
});
