/**
 * Structured-brief parser — the deterministic front-end that reproduces the
 * user's explicit document (pages, sections, fields, lists) instead of inferring
 * from keywords or substituting templates.
 */

import { parseBrief } from '../brief/parse';
import { buildUnderstandingSync } from '../understanding';
import { getLastContentPlan, renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

const STORE = `Create a premium eCommerce website for a basketball store.
Store Name: Elite Court Basketball
## Design Style
* Modern sports eCommerce design.
* Strong basketball atmosphere with action photography, courts, arenas, and athletes.
* Dark accents combined with energetic basketball-orange highlights.
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
Subheadline: "Shop premium basketball shoes and authentic jerseys."
Buttons: Shop Shoes, Shop Jerseys
## About Us Page
### Our Story
"A basketball-focused brand built for athletes, fans, and anyone passionate about the game."
## Shoes Page
Categories: Performance Basketball Shoes, Signature Player Shoes, High Top Basketball Shoes
## Jerseys Page
Categories: NBA Jerseys, Retro Jerseys, City Edition Jerseys
## Contact Page
Contact Form with Name, Email, Subject, Message.
## Visual Requirements
* High-resolution basketball photography.`;

describe('parseBrief extracts the document exactly', () => {
  const b = parseBrief(STORE);
  test('recognises it as a structured brief', () => {
    expect(b.isStructured).toBe(true);
  });
  test('captures the hero headline + subheadline the user wrote', () => {
    const hero = b.sections.find(s => s.kind === 'hero' && s.headline);
    expect(hero?.headline).toMatch(/Dominate Every Game/);
    expect(hero?.subheadline).toMatch(/premium basketball shoes/);
  });
  test('captures the Our Story body', () => {
    const story = b.sections.find(s => s.kind === 'story' && s.body);
    expect(story?.body).toMatch(/basketball-focused brand/);
  });
  test('captures product categories from Shoes and Jerseys pages', () => {
    const items = b.sections.filter(s => s.kind === 'products').flatMap(s => s.items);
    expect(items).toEqual(expect.arrayContaining(['Performance Basketball Shoes', 'NBA Jerseys']));
  });
  test('ignores design/visual blocks entirely', () => {
    const allText = b.sections.map(s => s.body + ' ' + s.items.join(' ')).join(' ');
    expect(allText).not.toMatch(/Strong basketball atmosphere|Dark accents|Modern sports/i);
  });
});

describe('the brief drives the generated site faithfully', () => {
  const u = buildUnderstandingSync(STORE);
  const res = renderMultiPageSite(new SharedContext({ userPrompt: STORE }), 'Elite Court Basketball', '', u);
  const plan = getLastContentPlan() as any;

  test('nav is exactly the user\'s list', () => {
    expect(res.nav.map((n: any) => n.label)).toEqual(['Home', 'About Us', 'Shoes', 'Jerseys', 'Contact']);
  });
  test('hero + about come from the brief, not a template', () => {
    expect(plan.heroHeadline.value).toMatch(/Dominate Every Game/);
    expect(plan.aboutBody.value).toMatch(/basketball-focused brand/);
  });
  test('products are the user\'s categories, each priced', () => {
    const names = (plan.products.value ?? []).map((p: any) => p.name);
    expect(names).toEqual(expect.arrayContaining(['Performance Basketball Shoes', 'NBA Jerseys']));
    for (const p of plan.products.value ?? []) expect(p.price).toMatch(/[$₱]\s?\d/);
  });
  test('no design-spec text leaks into the visible content', () => {
    const vis = res.primaryPage.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
    expect(vis).not.toMatch(/Strong basketball atmosphere|Dark accents combined|Modern sports eCommerce/i);
  });
});
