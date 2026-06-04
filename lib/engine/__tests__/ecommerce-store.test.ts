/**
 * E-commerce store generation.
 *
 * From the basketball-store brief: a prompt that sells products must produce a
 * working store — real listed categories with PRICES, Add-to-Cart, a cart icon,
 * and a checkout route — WITHOUT design-spec text leaking into the content.
 */

import { buildUnderstandingSync } from '../understanding';
import { getLastContentPlan, renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

const STORE = `Create a premium eCommerce website for a basketball store.
Store Name: Elite Court Basketball
## Design Style
* Modern sports eCommerce design.
* Strong basketball atmosphere with action photography, courts, arenas, and athletes.
* Dark accents combined with energetic basketball-orange highlights.
* Fully responsive for desktop, tablet, and mobile.
## Navigation
Only include:
* Home
* About Us
* Shoes
* Jerseys
* Contact
No additional navigation items.
## Home Page
### Hero Section
Headline: "Dominate Every Game In Elite Basketball Gear"
Buttons: Shop Shoes, Shop Jerseys
## About Us Page
### Our Story
"A basketball-focused brand built for athletes, fans, and anyone passionate about the game."
## Shoes Page
Categories: Performance Basketball Shoes, High Top Basketball Shoes, Signature Player Shoes
Add to Cart button. Checkout.
## Visual Requirements
* High-resolution basketball photography.`;

function render() {
  const u = buildUnderstandingSync(STORE);
  const res = renderMultiPageSite(new SharedContext({ userPrompt: STORE }), 'Elite Court Basketball', '', u);
  return { res, html: res.primaryPage, plan: getLastContentPlan() as any };
}

describe('store has functional commerce', () => {
  const { res, html, plan } = render();

  test('lists the user\'s real product categories', () => {
    const names = (plan.products.value ?? []).map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Performance Basketball Shoes', 'High Top Basketball Shoes']));
  });
  test('every product has a price', () => {
    for (const p of plan.products.value ?? []) expect(p.price).toMatch(/[$₱]\s?\d/);
  });
  test('Add to Cart, cart icon, and a checkout route exist', () => {
    expect(html).toMatch(/Add to Cart/);
    expect(html).toMatch(/sb-cart-count/);
    expect(html).toMatch(/data-route="checkout"/);
  });
  test('nav routes to separate Shoes and Jerseys pages', () => {
    const byLabel = Object.fromEntries(res.nav.map((n: any) => [n.label, n.href]));
    expect(byLabel['Shoes']).toBeTruthy();
    expect(byLabel['Jerseys']).toBeTruthy();
    expect(byLabel['Shoes']).not.toBe(byLabel['Jerseys']);
  });
});

describe('design specs never become store content', () => {
  const { html } = render();
  const visible = html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  test('no design/visual instructions in the visible content', () => {
    expect(visible).not.toMatch(/Strong basketball atmosphere/i);
    expect(visible).not.toMatch(/Dark accents combined/i);
    expect(visible).not.toMatch(/Modern sports eCommerce/i);
    expect(visible).not.toMatch(/responsive for desktop/i);
    expect(visible).not.toMatch(/Ready,?\s*Desktop/i);
  });
});
