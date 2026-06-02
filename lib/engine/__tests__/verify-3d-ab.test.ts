import { buildUnderstandingSync } from '../understanding';
import { buildWebsiteSpec } from '../spec';

const cases = [
  ['Yoga studio',   'A yoga studio. We teach Hatha and Vinyasa. Small classes.'],
  ['Photography',   'A photography studio. We shoot weddings and portraits.'],
  ['Restaurant',    'A ramen shop. We serve authentic 18-hour tonkotsu broth.'],
  ['General biz',   'A plumbing company. Fast reliable service.'],
  ['Stats request', 'A SaaS product. Show our key stats. Metrics that matter.'],
  ['No stats req',  'A yoga studio. Book a session online.'],
];

describe('Phase 3D Fix A+B — spec sections after removing NICHE_IMPLICIT_SECTIONS', () => {
  for (const [label, prompt] of cases) {
    test(`${label} — sections logged`, () => {
      const puo = buildUnderstandingSync(prompt);
      const spec = buildWebsiteSpec(prompt, puo);
      console.log(`\n${label}:`);
      console.log('  spec.sections:', spec.sections.join(', ') || '(none)');
      console.log('  spec.requiredPages:', spec.requiredPages.join(', ') || '(none)');
      const llmSections = (puo.customAttributes as { llm?: { sections?: string[] } })?.llm?.sections ?? [];
      console.log('  llm.sections:', llmSections.join(', ') || '(none)');
    });
  }

  test('yoga has no pricing section', () => {
    const puo = buildUnderstandingSync('A yoga studio. We teach Hatha and Vinyasa. Small classes.');
    const spec = buildWebsiteSpec('A yoga studio. We teach Hatha and Vinyasa. Small classes.', puo);
    expect(spec.sections).not.toContain('pricing');
    expect(spec.requiredPages).not.toContain('pricing');
  });

  test('photography has no gallery section unless requested', () => {
    const puo = buildUnderstandingSync('A photography studio. We shoot weddings and portraits.');
    const spec = buildWebsiteSpec('A photography studio. We shoot weddings and portraits.', puo);
    expect(spec.sections).not.toContain('gallery');
    expect(spec.requiredPages).not.toContain('gallery');
  });

  test('restaurant has no location section from niche', () => {
    const puo = buildUnderstandingSync('A ramen shop. We serve authentic 18-hour tonkotsu broth.');
    const spec = buildWebsiteSpec('A ramen shop. We serve authentic 18-hour tonkotsu broth.', puo);
    expect(spec.sections).not.toContain('location');
  });

  test('explicit stats request → stats in spec.sections', () => {
    const prompt = 'A SaaS product. Show our key stats. Metrics that matter.';
    const puo = buildUnderstandingSync(prompt);
    const spec = buildWebsiteSpec(prompt, puo);
    expect(spec.sections).toContain('stats');
  });
});
