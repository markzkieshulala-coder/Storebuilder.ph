/**
 * Niche Classification
 *
 * Guards the fix for the reported bug: a "Social Media Manager Freelancer
 * Portfolio" was being classified (and rendered) as a SaaS website. Generic tech
 * words ("platform", "analytics", "dashboard") must not hijack a clearly-named
 * business, and genuine software prompts must still detect as SaaS.
 */

import { understandPrompt } from '../nlu';
import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';

const niche = (p: string) => understandPrompt(p).industry;

describe('social media / marketing → NOT saas', () => {
  const cases = [
    'Social Media Manager Freelancer Portfolio',
    'Social media manager who manages content, analytics, and campaigns for brands across platforms',
    'I help businesses manage their social media platforms with content scheduling and engagement analytics',
    'Freelance social media manager specializing in Instagram growth, content strategy, and paid ad campaigns',
    'Social media management services for small businesses — strategy, scheduling, analytics dashboards',
    'Social media manager and content creator helping startups grow their online presence',
  ];
  for (const p of cases) {
    test(`"${p.slice(0, 48)}…" is socialmedia, not saas`, () => {
      const n = niche(p);
      expect(n).toBe('socialmedia');
      expect(n).not.toBe('saas');
    });
  }

  test('renders a social/agency site (no SaaS-only chrome) and no fabricated CTA', () => {
    const prompt = 'Social Media Manager Freelancer Portfolio';
    const u = buildUnderstandingSync(prompt);
    expect(u.inferredIndustry).toBe('socialmedia');
    const html = renderMultiPageSite(new SharedContext({ userPrompt: prompt }), 'Studio', '', u).primaryPage;
    expect(html).not.toMatch(/Learn More/i);
    // The directive/role words must not surface as feature/heading copy.
    expect(html).not.toMatch(/Freelance Brand|Proven Portfolio/i);
  });
});

describe('genuine software prompts still detect as tech', () => {
  // Both saas and startup share broad "saas" → technology; either is acceptable.
  const techish = (p: string) => ['saas', 'startup', 'ai'].includes(niche(p));
  test('SaaS / software prompts stay tech', () => {
    expect(techish('A SaaS product. Features. Pricing.')).toBe(true);
    expect(techish('A software company building developer tools')).toBe(true);
    expect(techish('A software platform for engineering teams')).toBe(true);
  });
});

describe('incidental "social media" mention does not flip the niche', () => {
  test('a restaurant that mentions social media stays food', () => {
    expect(niche('A cozy restaurant with seasonal dishes — follow us on social media')).not.toBe('socialmedia');
  });
});
