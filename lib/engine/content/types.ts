// ---------------------------------------------------------------------------
// CONTENT PLAN TYPES — Phase 3: provenance-tagged content for all user-facing copy.
//
// ContentPlan is the single source of truth for WHAT copy appears on a site.
// Every field carries a Provenance tag describing where the value came from.
//
// Resolution chain (highest priority first):
//   prompt  → text explicitly stated or paraphrased in the user's prompt
//   nlu     → synthesized from NLU signals (differentiator, audience, etc.)
//   niche   → fallback from industry/niche bank
//   generic → hardcoded safe default (never fabricates business-specific claims)
//   absent  → field has no content; renderer must omit/suppress this section
// ---------------------------------------------------------------------------

export type Provenance = 'prompt' | 'nlu' | 'niche' | 'generic' | 'absent';

/** A provenance-tagged content value. T is the actual value type. */
export interface ContentValue<T> {
  value: T;
  source: Provenance;
  /** Debug label: which signal produced this value. */
  origin?: string;
}

// ── Sub-item types ───────────────────────────────────────────────────────────

export interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
  href: string;
}

export interface StatItem {
  number: string;
  label: string;
}

export interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
}

export interface ProductItem {
  name: string;
  desc: string;
  price: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  featured: boolean;
}

// ── Provenance summary ───────────────────────────────────────────────────────

export interface ProvenanceSummary {
  /** How many fields resolved from prompt-tier signals. */
  promptCount: number;
  /** How many fields resolved from nlu-tier synthesis. */
  nluCount: number;
  /** How many fields fell back to a niche bank. */
  nicheCount: number;
  /** How many fields used a generic default. */
  genericCount: number;
  /** How many fields have no content (absent). */
  absentCount: number;
  /** Fraction of total fields with prompt or nlu sourcing. */
  promptCoverage: number;
}

// ── ContentPlan ──────────────────────────────────────────────────────────────

export interface ContentPlan {
  // Hero
  heroHeadline:   ContentValue<string>;
  heroSub:        ContentValue<string>;
  heroTag:        ContentValue<string>;
  primaryCta:     ContentValue<string>;
  secondaryCta:   ContentValue<string>;

  // Features / services cluster
  sectionEyebrow: ContentValue<string>;
  featureHeading: ContentValue<string>;
  features:       ContentValue<FeatureItem[]>;

  // Trust stats
  stats:          ContentValue<StatItem[]>;

  // Social proof
  testimonials:   ContentValue<TestimonialItem[]>;

  // About / story section
  aboutHeading:   ContentValue<string>;
  aboutBody:      ContentValue<string>;
  aboutBullets:   ContentValue<string[]>;

  // Mission / values section
  missionHeading: ContentValue<string>;
  missionBody:    ContentValue<string>;

  // Gallery / catalog
  galleryHeading: ContentValue<string>;
  products:       ContentValue<ProductItem[] | null>;
  productEyebrow: ContentValue<string>;

  // Contact
  contactHeading: ContentValue<string>;
  contactSub:     ContentValue<string>;

  // CTA section
  ctaHeading:     ContentValue<string>;
  ctaSub:         ContentValue<string>;

  // Footer
  footerTagline:  ContentValue<string>;

  // FAQ section (null = omit section)
  faqs:           ContentValue<FaqItem[] | null>;

  // Pricing section (null = omit section)
  pricingPlans:   ContentValue<PricingPlan[] | null>;

  // Commerce metadata
  startingPrice:  ContentValue<string>;

  // ── Section labels (Phase 4F) ───────────────────────────────────────────────
  // Eyebrows and headings that the section renderers previously hardcoded. Now
  // niche- and prompt-aware so different niches/prompts produce different copy.
  faqEyebrow:            ContentValue<string>;
  faqHeading:            ContentValue<string>;
  testimonialsEyebrow:   ContentValue<string>;
  testimonialsHeading:   ContentValue<string>;
  storyEyebrow:          ContentValue<string>;
  highlightEyebrow:      ContentValue<string>;
  galleryEyebrow:        ContentValue<string>;
  contactEyebrow:        ContentValue<string>;
  newsletterEyebrow:     ContentValue<string>;
  newsletterHeading:     ContentValue<string>;
  teamEyebrow:           ContentValue<string>;
  teamHeading:           ContentValue<string>;
  bookingEyebrow:        ContentValue<string>;
  bookingHeading:        ContentValue<string>;
  locationEyebrow:       ContentValue<string>;
  locationHeading:       ContentValue<string>;
  blogEyebrow:           ContentValue<string>;
  blogHeading:           ContentValue<string>;
  eventsEyebrow:         ContentValue<string>;
  eventsHeading:         ContentValue<string>;
  pricingEyebrow:        ContentValue<string>;
  pricingHeading:        ContentValue<string>;

  // Provenance report
  _provenance: ProvenanceSummary;
}

/** Convenience: unwrap a ContentValue, returning a fallback if absent/null. */
export function unwrap<T>(cv: ContentValue<T>, fallback: T): T {
  return cv.source === 'absent' || cv.value === null || cv.value === undefined
    ? fallback
    : cv.value;
}

/** Compute a ProvenanceSummary from all ContentValues in a ContentPlan. */
export function computeProvenance(plan: Omit<ContentPlan, '_provenance'>): ProvenanceSummary {
  const counts: Record<Provenance, number> = {
    prompt: 0, nlu: 0, niche: 0, generic: 0, absent: 0,
  };
  const allValues = Object.values(plan) as Array<ContentValue<unknown>>;
  for (const cv of allValues) {
    if (cv && typeof cv === 'object' && 'source' in cv) {
      counts[cv.source as Provenance] = (counts[cv.source as Provenance] ?? 0) + 1;
    }
  }
  const total = allValues.filter(v => v && typeof v === 'object' && 'source' in v).length;
  const promptCoverage = total ? (counts.prompt + counts.nlu) / total : 0;
  return {
    promptCount:  counts.prompt,
    nluCount:     counts.nlu,
    nicheCount:   counts.niche,
    genericCount: counts.generic,
    absentCount:  counts.absent,
    promptCoverage,
  };
}
