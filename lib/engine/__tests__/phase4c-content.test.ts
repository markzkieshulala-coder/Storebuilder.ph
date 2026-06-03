/**
 * Phase 4C — niche-aware fallback content for the three components that
 * previously emitted generic startup/SaaS boilerplate regardless of industry:
 *   1. Team roles (renderTeamSection)
 *   2. Pricing fallback tiers (buildNichePricingPlans / nichePricingPlans)
 *   3. Trust strip items (renderStripSection marquee/logo-wall)
 *
 * These tests prove the hardcoded startup roles and the Starter/Professional/
 * Enterprise SaaS pricing ladder are gone from the live path, and that all three
 * surfaces now vary by niche.
 */
import { buildUnderstandingSync } from '../understanding';
import { renderMultiPageSite } from '../html-renderer';
import { buildNichePricingPlans } from '../content';
import { SharedContext } from '../core';

function renderFor(prompt: string, brand = 'Acme') {
  const puo = buildUnderstandingSync(prompt);
  const ctx = new SharedContext({ userPrompt: prompt });
  return renderMultiPageSite(ctx, brand, '', puo).primaryPage;
}
function teamRoles(html: string): string[] {
  return [...html.matchAll(/<h3 style="font-size:var\(--h3-size\)">([^<]+)<\/h3>/g)].map(m => m[1]);
}
function priceNames(html: string): string[] {
  return [...new Set([...html.matchAll(/<div class="price-name">([^<]+)<\/div>/g)].map(m => m[1]))];
}

const TEAM_PROMPT = ' Add a team section.';
const PRICE_PROMPT = ' Add a pricing section.';

describe('Phase 4C — team roles are niche-aware', () => {
  test('restaurant uses kitchen roles, not the startup array', () => {
    const html = renderFor('A ramen restaurant serving tonkotsu.' + TEAM_PROMPT, 'Ichiban');
    const roles = teamRoles(html);
    expect(roles).toEqual(expect.arrayContaining(['Executive Chef', 'Sous Chef']));
    // The old hardcoded startup roles must not appear for a restaurant.
    expect(roles).not.toContain('Creative Lead');
    expect(roles).not.toContain('Head of Operations');
  });

  test('law firm uses legal roles', () => {
    const roles = teamRoles(renderFor('A law firm advising corporate clients.' + TEAM_PROMPT, 'Lex'));
    expect(roles).toEqual(expect.arrayContaining(['Managing Partner', 'Legal Assistant']));
  });

  test('three different niches yield three different role sets', () => {
    const food = teamRoles(renderFor('A bakery selling sourdough.' + TEAM_PROMPT)).join('|');
    const tech = teamRoles(renderFor('A SaaS platform for engineers.' + TEAM_PROMPT)).join('|');
    const law  = teamRoles(renderFor('A law firm for founders.' + TEAM_PROMPT)).join('|');
    expect(new Set([food, tech, law]).size).toBe(3);
  });
});

describe('Phase 4C — pricing fallback is niche-aware (no SaaS ladder)', () => {
  test('restaurant pricing uses menus, not Starter/Professional/Enterprise', () => {
    const names = priceNames(renderFor('A ramen restaurant serving tonkotsu.' + PRICE_PROMPT, 'Ichiban'));
    expect(names).toEqual(['Lunch Menu', 'Dinner Menu', 'Private Dining']);
    expect(names).not.toContain('Professional');
  });

  test('wellness/sports pricing uses memberships', () => {
    const names = priceNames(renderFor('A yoga and pilates studio.' + PRICE_PROMPT, 'Zen'));
    expect(names.some(n => /Membership|Session|Pass/.test(n))).toBe(true);
  });

  test('buildNichePricingPlans never returns the old generic SaaS trio for non-tech niches', () => {
    for (const niche of ['food', 'wellness', 'agency', 'professional', 'hospitality', 'automotive']) {
      const names = buildNichePricingPlans(niche).map(p => p.name);
      expect(names).not.toEqual(['Starter', 'Pro', 'Enterprise']);
      expect(names).not.toEqual(['Starter', 'Professional', 'Enterprise']);
    }
  });

  test('unknown niche falls back to neutral Basic/Standard/Premium (not SaaS)', () => {
    expect(buildNichePricingPlans('something-unknown').map(p => p.name)).toEqual(['Basic', 'Standard', 'Premium']);
  });

  test('returned plans are clones (no shared-array mutation across calls)', () => {
    const a = buildNichePricingPlans('food');
    a[0].features.push('MUTATED');
    const b = buildNichePricingPlans('food');
    expect(b[0].features).not.toContain('MUTATED');
  });
});

describe('Phase 4C — trust strip items are niche-aware', () => {
  // The trust strip (marquee/logo-wall) renders only when the spec includes a
  // stats section AND the composer's deterministic layout selects a marquee
  // variant. Drive several distinct stats-bearing prompts per niche so at least
  // one surfaces the marquee, then assert the items match the niche bank.
  const LEAD_INS = ['A', 'An award-winning', 'A modern', 'A boutique', 'A premium', 'A local', 'A trusted', 'A leading', 'A respected', 'A growing'];
  const TAILS = [' for the modern customer.', ' in the city center.', ' serving the region.', ' built on craft.', ' since 2010.', ' with a loyal following.'];
  // Generate many distinct prompts (each varies the deterministic composer seed)
  // for a niche noun, returning the first one that surfaces a trust marquee.
  function firstMarqueeFor(noun: string): string[] {
    for (const tail of TAILS) {
      for (const lead of LEAD_INS) {
        const p = `${lead} ${noun}${tail} Add a stats section. Show our achievements and numbers.`;
        const html = renderFor(p, 'Brand');
        const items = [...new Set([...html.matchAll(/<span class="marquee-item">([^<]+)<\/span>/g)].map(m => m[1]))];
        if (items.length) return items;
      }
    }
    return [];
  }

  test('technology trust strip uses tech credibility signals', () => {
    const items = firstMarqueeFor('cloud database company');
    expect(items.length).toBeGreaterThan(0);
    expect(items).toContain('99.9% Uptime');
    expect(items).not.toContain('Enterprise Ready'); // old generic item
  });

  test('professional trust strip differs from technology', () => {
    const law = firstMarqueeFor('law firm for founders');
    const tech = firstMarqueeFor('cloud database company');
    expect(law.length).toBeGreaterThan(0);
    expect(tech.length).toBeGreaterThan(0);
    expect(law.join('|')).not.toBe(tech.join('|'));
    expect(law).toContain('Proven Track Record');
  });
});
