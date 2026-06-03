// ---------------------------------------------------------------------------
// ADAPTER — Phase 3: ContentPlan → SiteCopy bridge.
//
// contentPlanToSiteCopy is a COMPATIBILITY ADAPTER only. It converts the
// provenance-tagged ContentPlan back into the flat SiteCopy shape that the
// existing section renderers in html-renderer.ts consume.
//
// This adapter will be deleted in Phase 5 when section renderers are updated
// to consume ContentPlan directly.
// ---------------------------------------------------------------------------

import type { ContentPlan } from './types';

/**
 * The shape that html-renderer.ts section builders expect.
 * Mirrors the SiteCopy interface in html-renderer.ts.
 */
export interface SiteCopyLike {
  heroHeadline: string;
  heroSub: string;
  heroTag: string;
  primaryCta: string;
  secondaryCta: string;
  sectionEyebrow: string;
  featureHeading: string;
  features: Array<{ icon: string; title: string; desc: string; href: string }>;
  stats: Array<{ number: string; label: string }>;
  testimonials: Array<{ quote: string; name: string; role: string }>;
  aboutHeading: string;
  aboutBody: string;
  aboutBullets: string[];
  missionHeading: string;
  missionBody: string;
  galleryHeading: string;
  gallerySlug: string;
  contactHeading: string;
  contactSub: string;
  ctaHeading: string;
  ctaSub: string;
  footerTagline: string;
  pricingPlans: Array<{ name: string; price: string; period: string; desc: string; features: string[]; featured: boolean }> | null;
  faqs: Array<{ q: string; a: string }> | null;
  products: Array<{ name: string; desc: string; price: string }> | null;
  productEyebrow: string;
  startingPrice: string;
  hiddenPrimarySlug: string;
  hiddenSecondarySlug: string;
  hiddenPrimaryCtaLabel: string;
  hiddenSecondaryCtaLabel: string;
  // Section labels (Phase 4F)
  faqEyebrow: string;
  faqHeading: string;
  testimonialsEyebrow: string;
  testimonialsHeading: string;
  storyEyebrow: string;
  highlightEyebrow: string;
  galleryEyebrow: string;
  contactEyebrow: string;
  newsletterEyebrow: string;
  newsletterHeading: string;
  teamEyebrow: string;
  teamHeading: string;
  bookingEyebrow: string;
  bookingHeading: string;
  locationEyebrow: string;
  locationHeading: string;
  blogEyebrow: string;
  blogHeading: string;
  eventsEyebrow: string;
  eventsHeading: string;
  pricingEyebrow: string;
  pricingHeading: string;
}

/**
 * Convert a ContentPlan to the flat SiteCopy shape consumed by html-renderer.ts.
 * gallerySlug is the placeholder — renderMultiPageSiteInner overwrites it with
 * the LayoutPlan's resolved CTA targets (same as before Phase 3).
 */
export function contentPlanToSiteCopy(plan: ContentPlan, gallerySlug = 'gallery'): SiteCopyLike {
  return {
    heroHeadline:   plan.heroHeadline.value,
    heroSub:        plan.heroSub.value,
    heroTag:        plan.heroTag.value,
    primaryCta:     plan.primaryCta.value,
    secondaryCta:   plan.secondaryCta.value,
    sectionEyebrow: plan.sectionEyebrow.value,
    featureHeading: plan.featureHeading.value,
    features:       plan.features.value,
    stats:          plan.stats.value,
    testimonials:   plan.testimonials.value,
    aboutHeading:   plan.aboutHeading.value,
    aboutBody:      plan.aboutBody.value,
    aboutBullets:   plan.aboutBullets.value,
    missionHeading: plan.missionHeading.value,
    missionBody:    plan.missionBody.value,
    galleryHeading: plan.galleryHeading.value,
    gallerySlug,
    contactHeading: plan.contactHeading.value,
    contactSub:     plan.contactSub.value,
    ctaHeading:     plan.ctaHeading.value,
    ctaSub:         plan.ctaSub.value,
    footerTagline:  plan.footerTagline.value,
    pricingPlans:   plan.pricingPlans.value,
    faqs:           plan.faqs.value,
    products:       plan.products.value,
    productEyebrow: plan.productEyebrow.value,
    startingPrice:  plan.startingPrice.value,
    // Placeholder CTA targets — overwritten by renderMultiPageSiteInner from the LayoutPlan
    hiddenPrimarySlug:    gallerySlug,
    hiddenSecondarySlug:  gallerySlug,
    hiddenPrimaryCtaLabel:   plan.secondaryCta.value || 'Learn More',
    hiddenSecondaryCtaLabel: plan.secondaryCta.value || 'Learn More',
    // Section labels (Phase 4F)
    faqEyebrow:          plan.faqEyebrow.value,
    faqHeading:          plan.faqHeading.value,
    testimonialsEyebrow: plan.testimonialsEyebrow.value,
    testimonialsHeading: plan.testimonialsHeading.value,
    storyEyebrow:        plan.storyEyebrow.value,
    highlightEyebrow:    plan.highlightEyebrow.value,
    galleryEyebrow:      plan.galleryEyebrow.value,
    contactEyebrow:      plan.contactEyebrow.value,
    newsletterEyebrow:   plan.newsletterEyebrow.value,
    newsletterHeading:   plan.newsletterHeading.value,
    teamEyebrow:         plan.teamEyebrow.value,
    teamHeading:         plan.teamHeading.value,
    bookingEyebrow:      plan.bookingEyebrow.value,
    bookingHeading:      plan.bookingHeading.value,
    locationEyebrow:     plan.locationEyebrow.value,
    locationHeading:     plan.locationHeading.value,
    blogEyebrow:         plan.blogEyebrow.value,
    blogHeading:         plan.blogHeading.value,
    eventsEyebrow:       plan.eventsEyebrow.value,
    eventsHeading:       plan.eventsHeading.value,
    pricingEyebrow:      plan.pricingEyebrow.value,
    pricingHeading:      plan.pricingHeading.value,
  };
}
