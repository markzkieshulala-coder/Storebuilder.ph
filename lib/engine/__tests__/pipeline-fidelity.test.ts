/**
 * Pipeline Fidelity Tests
 *
 * Verifies that user requirements stated in prompts are preserved throughout
 * the entire generation pipeline: NLU extraction → PUO fold → site copy → HTML.
 *
 * Each test corresponds to a root cause identified in the pipeline audit:
 *  1. NLU field extraction accuracy
 *  2. Brand name opening-line detection
 *  3. Stats — no fabricated numbers when user provided none
 *  4. FAQ — omitted when user didn't request it
 *  5. Testimonials — neutral names, not fabricated identities
 *  6. About — synthesised from NLU signals, not pure template
 *  7. Ghost pipeline bypass — SharedContext builds without running orchestrator
 */

import { understandPrompt } from '../nlu';
import { buildUnderstandingSync } from '../understanding';
import { SharedContext } from '../core';
import { renderMultiPageSite } from '../html-renderer';

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Call the full NLU + parser + fold stack synchronously and return the merged PUO. */
function nluFor(prompt: string) {
  return buildUnderstandingSync(prompt);
}

/** Build a real SharedContext and render a site from a prompt + optional understanding. */
function renderFor(prompt: string, brand: string, understanding = nluFor(prompt)) {
  const ctx = new SharedContext({ userPrompt: prompt });
  return renderMultiPageSite(ctx, brand, '', understanding);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NLU field extraction
// ─────────────────────────────────────────────────────────────────────────────

describe('NLU extraction — field accuracy', () => {
  const BAKERY_PROMPT = `Sweet Dreams Bakery. We specialize in custom cakes and pastries for birthdays, weddings, and special occasions. Our kitchen is located in Makati. Open Monday to Saturday 9am-8pm. Call us at 0917-555-1234.`;

  test('extracts brand name from opening-line format "[Brand]. We..."', () => {
    const nlu = understandPrompt(BAKERY_PROMPT);
    expect(nlu.brandName).toBe('Sweet Dreams Bakery');
  });

  test('extracts location from "located in [City]"', () => {
    const nlu = understandPrompt(BAKERY_PROMPT);
    expect(nlu.location).toBe('Makati');
  });

  test('extracts operating hours', () => {
    const nlu = understandPrompt(BAKERY_PROMPT);
    expect(nlu.operatingHours).toBeDefined();
    expect(nlu.operatingHours).toMatch(/9am/i);
  });

  test('extracts phone number', () => {
    const nlu = understandPrompt(BAKERY_PROMPT);
    expect(nlu.phone).toBeDefined();
    expect(nlu.phone).toContain('0917');
  });

  test('extracts audience from explicit "for [audience]"', () => {
    const nlu = understandPrompt('Ramen Tanaka. We serve authentic ramen for students and young professionals in BGC.');
    expect(nlu.audience).toMatch(/student|young professional/i);
  });

  test('infers audience from product names', () => {
    const nlu = understandPrompt('Bliss Spa offers a Couples Package, Bridal Package, and Corporate Wellness program.');
    expect(nlu.audience).toMatch(/couples|bridal/i);
  });

  test('extracts selling points from first-person sentences', () => {
    const nlu = understandPrompt('We serve authentic Japanese ramen crafted from an 18-hour pork bone broth.');
    expect(nlu.sellingPoints).toBeDefined();
    expect(nlu.sellingPoints!.length).toBeGreaterThan(0);
    expect(nlu.sellingPoints![0]).toMatch(/18-hour|broth|authentic/i);
  });

  test('extracts starting price', () => {
    const nlu = understandPrompt('Massage sessions starting at ₱2,500 per session.');
    expect(nlu.startingPrice).toBeDefined();
    expect(nlu.startingPrice).toContain('2,500');
  });

  test('extracts inline product price', () => {
    const nlu = understandPrompt('We offer Swedish Massage (₱2,500), Hot Stone Massage (₱3,000), and Facial (₱1,500).');
    const products = nlu.products;
    expect(products).toBeDefined();
    const swedish = products!.find(p => /swedish/i.test(p.name));
    expect(swedish).toBeDefined();
    expect(swedish!.price).toBeTruthy();
  });

  test('extracts differentiator', () => {
    const nlu = understandPrompt('We are an award-winning bakery specializing in artisan sourdough.');
    expect(nlu.differentiator).toMatch(/award-winning|artisan/i);
  });

  test('detects FAQ section request', () => {
    const nlu = understandPrompt('Build a website for my gym. Include a FAQ section and a Pricing page.');
    expect(nlu.sections).toBeDefined();
    expect(nlu.sections!.some(s => /faq/i.test(s))).toBe(true);
  });

  test('detects booking intent CTA', () => {
    const nlu = understandPrompt('Book online at sweetdreamsbakery.ph');
    expect(nlu.intentCta).toBe('Book Now');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Brand name — opening-line format
// ─────────────────────────────────────────────────────────────────────────────

describe('Brand name — opening-line extraction', () => {
  test('"BrandName. We ..." format', () => {
    const nlu = understandPrompt('Ramen Tanaka. We serve authentic Japanese ramen in BGC.');
    expect(nlu.brandName).toBe('Ramen Tanaka');
  });

  test('"BrandName. Our ..." format', () => {
    const nlu = understandPrompt('Luna Studio. Our photography captures the moments that matter most.');
    expect(nlu.brandName).toBe('Luna Studio');
  });

  test('"BrandName. I ..." format', () => {
    const nlu = understandPrompt('Mark Fitness. I offer personal training for beginners and advanced athletes.');
    expect(nlu.brandName).toBe('Mark Fitness');
  });

  test('does not extract generic words as brand name', () => {
    const nlu = understandPrompt('Build a website for my bakery.');
    expect(nlu.brandName).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Stats — no fabrication
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSiteCopy — stats without fabricated numbers', () => {
  test('stat fallback does not contain fabricated bakery counts', () => {
    const result = renderFor(
      'Sweet Dreams Bakery. We specialize in custom cakes for birthdays and weddings in Makati.',
      'Sweet Dreams Bakery',
    );
    const html = result.primaryPage;
    // These specific fabricated numbers from the old stat bank should NOT appear
    expect(html).not.toMatch(/200\+\s*<[^>]*>\s*Menu Items/);
    expect(html).not.toMatch(/10\+\s*<[^>]*>\s*Years Open/);
  });

  test('real stats from prompt appear in generated site', () => {
    const result = renderFor(
      'Tanaka Ramen. We have served guests since 2010. Rated 5 stars.',
      'Tanaka Ramen',
    );
    const html = result.primaryPage;
    // Year-derived stat should appear (years in business from "since 2010")
    const currentYear = new Date().getFullYear();
    const yearsInBusiness = currentYear - 2010;
    expect(html).toContain(String(yearsInBusiness));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. FAQ — omitted when not requested
// ─────────────────────────────────────────────────────────────────────────────

describe('FAQ section — only shown when requested', () => {
  test('FAQ accordion content is absent when user did not request it', () => {
    const result = renderFor(
      'Sweet Dreams Bakery. Custom cakes and pastries in Makati.',
      'Sweet Dreams Bakery',
    );
    // faq-list CSS exists in stylesheet; check the rendered section's <details> items instead
    expect(result.primaryPage).not.toMatch(/<div class="faq-list reveal"><details>/);
  });

  test('FAQ accordion content appears when user explicitly requests it', () => {
    const result = renderFor(
      'Build a spa website. Include a FAQ section with common questions about pricing and bookings.',
      'Bliss Spa',
    );
    // Should have actual FAQ details/summary elements in a faq-list div
    expect(result.primaryPage).toMatch(/<div class="faq-list reveal"><details>/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Testimonials — neutral names
// ─────────────────────────────────────────────────────────────────────────────

describe('Testimonials — no fabricated person identities', () => {
  test('testimonial names are neutral role-based identifiers', () => {
    const result = renderFor(
      'Bliss Spa. We offer Swedish massage and hot stone therapy in Makati.',
      'Bliss Spa',
    );
    const html = result.primaryPage;
    // The old fabricated names should NOT appear
    const fabricatedNames = ['Alex Chen', 'Sarah Miller', 'Marcus Johnson', 'Priya Sharma',
      "James O'Brien", 'David Kim', 'Rachel Wong', 'Nathan Brooks'];
    for (const name of fabricatedNames) {
      expect(html).not.toContain(name);
    }
    // Should contain neutral identifiers
    expect(html).toMatch(/A (Happy|Satisfied|Verified|Regular|Loyal|Weekly|Local|Devoted|Returning) (Customer|Client|Guest|Buyer|Visitor|Patron)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. About section — NLU signal synthesis
// ─────────────────────────────────────────────────────────────────────────────

describe('About section — synthesised from NLU signals', () => {
  test('user selling points appear verbatim in about section', () => {
    const result = renderFor(
      'Sweet Dreams Bakery. We specialize in custom cakes and pastries for birthdays and weddings. We bake everything fresh daily.',
      'Sweet Dreams Bakery',
    );
    expect(result.primaryPage).toMatch(/speciali[sz]e in custom cakes|bake everything fresh/i);
  });

  test('brand name from opening-line appears throughout the site', () => {
    const result = renderFor(
      'Ramen Tanaka. We serve authentic Japanese ramen made from an 18-hour pork bone broth.',
      'Ramen Tanaka',
    );
    expect(result.primaryPage).toContain('Ramen Tanaka');
  });

  test('location appears in contact section when extracted', () => {
    // Uses "located in" phrasing which matches the extractLocation pattern
    const result = renderFor(
      'Sweet Dreams Bakery. Our kitchen is located in Makati. Open Monday to Saturday.',
      'Sweet Dreams Bakery',
    );
    expect(result.primaryPage).toContain('Makati');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Ghost pipeline bypass — SharedContext
// ─────────────────────────────────────────────────────────────────────────────

describe('Ghost pipeline bypass — SharedContext', () => {
  test('SharedContext builds synchronously without errors', () => {
    const ctx = new SharedContext({
      userPrompt: 'Bakery website for Sweet Dreams in Makati',
      constraints: {
        targetFramework: 'react',
        motionComplexity: 'high',
        responsiveBreakpoints: ['mobile', 'tablet', 'desktop'],
        accessibilityLevel: 'wcag2-aa',
      },
    });
    expect(ctx.errors).toHaveLength(0);
    expect(ctx.input.userPrompt).toBe('Bakery website for Sweet Dreams in Makati');
  });

  test('SharedContext has correct input userPrompt', () => {
    const prompt = 'Ramen Tanaka website';
    const ctx = new SharedContext({ userPrompt: prompt });
    expect(ctx.input.userPrompt).toBe(prompt);
  });

  test('SharedContext getArtifact returns undefined for unset keys', () => {
    const ctx = new SharedContext({ userPrompt: 'test' });
    expect(ctx.getArtifact('planning')).toBeUndefined();
    expect(ctx.getArtifact('scoring')).toBeUndefined();
  });

  test('SharedContext setArtifact and getArtifact work round-trip', () => {
    const ctx = new SharedContext({ userPrompt: 'test' });
    ctx.setArtifact('test-key', { value: 42 });
    expect(ctx.getArtifact('test-key')).toEqual({ value: 42 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. End-to-end fidelity — user intent preservation
// ─────────────────────────────────────────────────────────────────────────────

describe('End-to-end fidelity — prompt intent in generated site', () => {
  const FULL_PROMPT = `Sweet Dreams Bakery. We specialize in custom cakes and pastries for birthdays, weddings, and special occasions. Our kitchen is located in Makati. Open Monday to Saturday 9am-8pm. We offer Birthday Cakes, Wedding Cakes, Cupcakes, and Pastry Boxes.`;

  test('brand name from opening-line appears in generated HTML', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    expect(result.primaryPage).toContain('Sweet Dreams Bakery');
  });

  test('location from prompt appears in generated HTML', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    expect(result.primaryPage).toContain('Makati');
  });

  test('operating hours from prompt appear in generated HTML', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    expect(result.primaryPage).toMatch(/9am|9 am|open.*monday/i);
  });

  test('user-listed products appear in generated HTML', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    const html = result.primaryPage;
    const hasProduct = /birthday cake|wedding cake|cupcake|pastry box/i.test(html);
    expect(hasProduct).toBe(true);
  });

  test('user selling points appear in about section', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    expect(result.primaryPage).toMatch(/speciali[sz]e in custom cakes|birthdays|weddings/i);
  });

  test('FAQ accordion content is absent when not requested', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    // faq-list CSS is always in stylesheet; check that no <details> items were rendered
    expect(result.primaryPage).not.toMatch(/<div class="faq-list reveal"><details>/);
  });

  test('stat numbers are not fabricated when user provided none', () => {
    const result = renderFor(FULL_PROMPT, 'Sweet Dreams Bakery');
    expect(result.primaryPage).not.toMatch(/200\+\s*<[^>]*>\s*Menu Items/);
    expect(result.primaryPage).not.toMatch(/10\+\s*<[^>]*>\s*Years Open/);
    expect(result.primaryPage).not.toMatch(/50M\+.*Revenue Generated/i);
  });
});
