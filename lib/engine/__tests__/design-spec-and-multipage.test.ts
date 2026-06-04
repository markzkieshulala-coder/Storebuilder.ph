/**
 * Design specs never become content; explicit nav routes to separate pages.
 *
 * Guards two reported bugs from a Facebook-style social-media brief:
 *  1. Design/visual instructions ("Primary colors: …", "card-based design",
 *     "clean typography", "mobile-first") leaked into the About body and feature
 *     cards, and "mobile" became the differentiator ("What Makes Us Mobile").
 *  2. Explicit nav items did not route to their own pages.
 */

import { buildUnderstandingSync } from '../understanding';
import { getLastContentPlan, renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

const PROMPT = `Create a modern personal portfolio website for a freelance social media manager.
Name: Kate Smith – Social Media Freelancer
Inspired by Facebook's clean UI design.
Primary colors: White, Facebook Blue (#1877F2), and light gray accents.
Light card-based design with soft borders and subtle shadows.
Clean typography similar to modern social platforms.
Fully responsive (mobile-first design).
Navigation:
Home
About Me
Services
Contact
About Me: I am a freelance social media manager, not an agency. I grow brands on Instagram and TikTok.
Services: Social Media Management, Content Strategy, Community Engagement, Content Scheduling.`;

function render() {
  const u = buildUnderstandingSync(PROMPT);
  const res = renderMultiPageSite(new SharedContext({ userPrompt: PROMPT }), 'Kate Smith', '', u);
  // Visible content only — exclude the always-present CSS and JS.
  const visible = res.primaryPage.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ');
  return { res, visible, plan: getLastContentPlan() as any };
}

describe('design specifications never appear as business content', () => {
  const { visible, plan } = render();
  test('no design-spec text leaks into the visible content', () => {
    expect(visible).not.toMatch(/Primary colors/i);
    expect(visible).not.toMatch(/card-based design/i);
    expect(visible).not.toMatch(/#1877F2/);
    expect(visible).not.toMatch(/typography similar/i);
    expect(visible).not.toMatch(/soft borders/i);
    expect(visible).not.toMatch(/What Makes Us Mobile/i);
  });
  test('about body is the user\'s own words, not design specs', () => {
    expect(plan.aboutBody.value).toMatch(/freelance social media manager/i);
    expect(plan.aboutBody.value).not.toMatch(/colou?r|card|typography|responsive/i);
  });
  test('feature cards are the listed services', () => {
    const titles = plan.features.value.map((f: any) => f.title);
    expect(titles).toEqual(expect.arrayContaining(['Social Media Management', 'Content Strategy']));
    expect(titles.join(' ')).not.toMatch(/colou?r|card|typography|primary/i);
  });
});

describe('explicit nav routes to separate pages', () => {
  const { res } = render();
  test('nav items point at page slugs, not in-page anchors', () => {
    const byLabel = Object.fromEntries(res.nav.map((n: any) => [n.label, n.href]));
    expect(byLabel['About Me']).toBe('about-me');
    expect(byLabel['Services']).toBe('services');
    expect(byLabel['Contact']).toBe('contact');
  });
  test('the SPA contains a route for each nav page', () => {
    const routes = [...res.primaryPage.matchAll(/data-route="([^"]*)"/gi)].map(m => m[1]);
    expect(routes).toEqual(expect.arrayContaining(['home', 'about-me', 'services', 'contact']));
  });
});
