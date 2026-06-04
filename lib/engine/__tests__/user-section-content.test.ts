/**
 * The site shows the user's OWN section headings and body text.
 *
 * Previously the engine captured a section's heading/prose but then synthesised
 * its own copy ("The X Difference", "Ready, Audience?"). Now the user's exact
 * heading and body per section flow through to the rendered content.
 */

import { buildUnderstandingSync } from '../understanding';
import { getLastContentPlan, renderMultiPageSite } from '../html-renderer';
import { SharedContext } from '../core';

const PROMPT = `Create a website for Green Thumb Landscaping.
## Navigation
Home, About, Services, Contact
## Home
### Hero
Headline: "We Make Your Garden Thrive"
Buttons: Get a Quote
## About Us
We are a family-owned landscaping crew. We treat every yard like our own.
## What We Do
Services: Lawn Care, Tree Trimming, Garden Design, Irrigation
## Reach Out
We would love to hear about your project. Call us any weekday and we will come take a look.`;

describe('user section headings + bodies drive the content', () => {
  const u = buildUnderstandingSync(PROMPT);
  renderMultiPageSite(new SharedContext({ userPrompt: PROMPT }), 'Green Thumb', '', u);
  const plan = getLastContentPlan() as any;

  test('about heading + body are the user\'s words', () => {
    expect(plan.aboutHeading.value).toBe('About Us');
    expect(plan.aboutHeading.source).toBe('prompt');
    expect(plan.aboutBody.value).toMatch(/family-owned landscaping crew/);
  });
  test('features heading is the user\'s heading, items are the user\'s services', () => {
    expect(plan.featureHeading.value).toBe('What We Do');
    expect(plan.featureHeading.source).toBe('prompt');
    expect(plan.features.value.map((f: any) => f.title)).toEqual(
      expect.arrayContaining(['Lawn Care', 'Tree Trimming', 'Garden Design']),
    );
  });
  test('contact heading + sub are the user\'s words (custom "Reach Out" title)', () => {
    expect(plan.contactHeading.value).toBe('Reach Out');
    expect(plan.contactHeading.source).toBe('prompt');
    expect(plan.contactSub.value).toMatch(/love to hear about your project/);
    expect(plan.contactSub.source).toBe('prompt');
  });
  test('hero headline is the user\'s, and the CTA is exactly "Get a Quote"', () => {
    expect(plan.heroHeadline.value).toMatch(/We Make Your Garden Thrive/);
    expect(plan.primaryCta.value).toBe('Get a Quote');
  });
});
