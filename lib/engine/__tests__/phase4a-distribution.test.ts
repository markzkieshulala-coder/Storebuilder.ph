/**
 * Phase 4A distribution audit — niche defaults for visualDensity,
 * animationExpectation, layoutDirection (+ reachable conversionStyle).
 *
 * Each prompt below is intentionally keyword-FREE for these dimensions so the
 * NICHE DEFAULT is what resolves. This proves the per-niche distribution.
 */
import { parsePrompt } from '../prompt-engine/parser';

// One representative head term per niche group (keyword-free for density/anim/layout).
const NICHES: Array<[string, string]> = [
  ['food',         'A restaurant serving seasonal dishes.'],
  ['technology',   'A software company building developer tools.'],
  ['gaming',       'A gaming brand for competitive players.'],
  ['fashion',      'A fashion label with seasonal collections.'],
  ['ecommerce',    'An ecommerce retail brand.'],
  ['photography',  'A photography practice for clients.'],
  ['design',       'A design and architecture practice.'],
  ['sports',       'A fitness gym for serious athletes.'],
  ['law',          'A law firm advising corporate clients.'],
  ['agency',       'A marketing agency for growing brands.'],
  ['health',       'A wellness studio for mindful living.'],
  ['travel',       'A travel resort for unforgettable trips.'],
  ['music',        'A music and entertainment label.'],
  ['education',    'An education provider for lifelong learners.'],
  ['nonprofit',    'A nonprofit serving the community cause.'],
];

describe('Phase 4A — niche default distributions', () => {
  test('print density / animation / layout per niche', () => {
    const rows: string[] = [];
    rows.push('niche        | density   | animation     | layout');
    rows.push('-------------|-----------|---------------|-------------');
    const densCount: Record<string, number> = {};
    const animCount: Record<string, number> = {};
    const layCount: Record<string, number> = {};
    for (const [label, prompt] of NICHES) {
      const puo = parsePrompt(prompt).object;
      const dens = puo.visualDensity;
      const anim = puo.motion.complexity;
      const lay = puo.layout.direction;
      densCount[dens] = (densCount[dens] || 0) + 1;
      animCount[String(anim)] = (animCount[String(anim)] || 0) + 1;
      layCount[lay] = (layCount[lay] || 0) + 1;
      rows.push(`${label.padEnd(12)} | ${String(dens).padEnd(9)} | ${String(anim).padEnd(13)} | ${lay}`);
    }
    rows.push('');
    rows.push('DENSITY distribution:   ' + JSON.stringify(densCount));
    rows.push('ANIMATION distribution: ' + JSON.stringify(animCount));
    rows.push('LAYOUT distribution:    ' + JSON.stringify(layCount));
    console.log('\n' + rows.join('\n') + '\n');

    // No single value should dominate all niches anymore.
    expect(Object.keys(densCount).length).toBeGreaterThan(1);
    expect(Object.keys(animCount).length).toBeGreaterThan(1);
    expect(Object.keys(layCount).length).toBeGreaterThan(1);
  });

  test('dead conversionStyle values are now reachable', () => {
    const checks: Array<[string, string]> = [
      ['editorial',         'A brand focused on thought leadership and long-form content-led marketing.'],
      ['urgency-driven',    'A store with a flash sale, countdown timers, act now while supplies last.'],
      ['community-driven',  'A grassroots movement where members belong together as a community.'],
      ['transparent',       'A service with transparent pricing, no hidden fees, upfront and honest.'],
    ];
    const out: string[] = [];
    for (const [want, prompt] of checks) {
      const puo = parsePrompt(prompt).object;
      out.push(`${want.padEnd(16)} → resolved conversionStyle = ${puo.conversionStyle}`);
      expect(puo.conversionStyle).toBe(want);
    }
    console.log('\nReachable conversionStyle values:\n' + out.join('\n') + '\n');
  });
});
