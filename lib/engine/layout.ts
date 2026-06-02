// ---------------------------------------------------------------------------
// LAYOUT PLAN — Phase 2 + 2B: single authority on page structure.
//
// LayoutPlan owns every structural decision. After Phase 2B, NONE of these are
// template- or niche-forced — they are all derived from the WebsiteSpec (which is
// itself derived from explicit requirements + NLU):
//
//   • Which pages exist          ← spec.requiredPages (+ home, + commerce)
//   • Which pages are in nav      ← derived from spec, in user-intent order
//   • Home-page section order     ← spec.sections in user clause order
//   • Whether the site has cart   ← products required + commerce intent
//   • Navigation anchors          ← required home sections that are not pages
//
// REMOVED in Phase 2B (no longer template/niche-driven):
//   • Forced Home/About/Gallery/Contact page set
//   • HIDDEN_SLUG_MAP + niche-generated hidden pages
//   • gallerySlug / hasCart from niche classification
//
// A page exists ONLY when a requirement justifies it. Home is the single
// unconditional page (the SPA root).
// ---------------------------------------------------------------------------

import { extractRequirements, type SectionKind } from './requirements';
import type { PromptUnderstandingObject } from './prompt-engine';
import type { WebsiteSpec } from './spec';

// ── Public types ─────────────────────────────────────────────────────────────

export interface SectionPlacement {
  kind: SectionKind;
  /** Index of this kind in the user's positive-clause list; null = inferred. */
  userOrder: number | null;
  source: 'required' | 'inferred';
}

/** A REAL page in the SPA. Nav anchors are NOT pages — see LayoutPlan.navigation. */
export interface PageSpec {
  slug: string;
  label: string;
  /** What the renderer must build: a section kind, the home root, or commerce. */
  kind: 'home' | 'cart' | 'checkout' | SectionKind;
  /** Appears as a page link in the top navigation. */
  isNav: boolean;
}

export interface LayoutPlan {
  /** Home-page sections in user-intent order (null-order sections last). */
  homeSections: SectionPlacement[];
  /** All real pages, home first. No hidden pages exist after Phase 2B. */
  pages: PageSpec[];
  /** Top-nav items: page links + in-page anchors, in user-intent order. */
  navigation: Array<{ label: string; href: string }>;
  /** Slug of the gallery page if one exists, else ''. */
  gallerySlug: string;
  /** True → cart + checkout pages and a Cart nav item exist. */
  hasCart: boolean;
  /** True → a pricing page exists. */
  hasPricing: boolean;
  /** Primary section-CTA target (a real page slug or '#anchor' or '.'). */
  primaryCtaTarget: string;
  /** Secondary section-CTA target (a real page slug or '#anchor' or '.'). */
  secondaryCtaTarget: string;
}

// ── Page registry ──────────────────────────────────────────────────────────────
// Maps a page-worthy kind → { slug, label }. Niche is consulted for LABELING ONLY
// (Menu vs Shop), never for whether the page exists.

function productsPage(normIndustry: string): { slug: string; label: string } {
  if (normIndustry === 'food') return { slug: 'menu', label: 'Menu' };
  return { slug: 'shop', label: 'Shop' };
}

function galleryPage(normIndustry: string, direction: string): { slug: string; label: string } {
  if (direction === 'portfolio' || normIndustry === 'photography' || normIndustry === 'design') {
    return { slug: 'work', label: 'Work' };
  }
  if (normIndustry === 'fashion') return { slug: 'lookbook', label: 'Lookbook' };
  return { slug: 'gallery', label: 'Gallery' };
}

const STATIC_PAGE: Partial<Record<SectionKind, { slug: string; label: string }>> = {
  pricing: { slug: 'pricing', label: 'Pricing' },
  blog:    { slug: 'blog',    label: 'Blog' },
  events:  { slug: 'events',  label: 'Events' },
  booking: { slug: 'book',    label: 'Book' },
  contact: { slug: 'contact', label: 'Contact' },
  story:   { slug: 'about',   label: 'About' },
  team:    { slug: 'team',    label: 'Team' },
  faq:     { slug: 'faq',     label: 'FAQ' },
};

function pageSpecFor(kind: SectionKind, normIndustry: string, direction: string): { slug: string; label: string } | null {
  if (kind === 'products') return productsPage(normIndustry);
  if (kind === 'gallery')  return galleryPage(normIndustry, direction);
  return STATIC_PAGE[kind] ?? null;
}

// Required home sections that are NOT pages but DO warrant a nav anchor.
// Excluded: pure-chrome or footer-handled kinds.
const NO_ANCHOR = new Set<SectionKind>(['cta', 'newsletter', 'stats', 'contact', 'booking']);

// Anchor label for a home section in the nav.
const ANCHOR_LABEL: Partial<Record<SectionKind, string>> = {
  features:     'Features',
  story:        'About',
  team:         'Team',
  testimonials: 'Reviews',
  faq:          'FAQ',
  gallery:      'Gallery',
  products:     'Products',
  pricing:      'Pricing',
  events:       'Events',
  location:     'Visit',
  blog:         'Blog',
};

// Commerce intent — verbs/nouns that signal an actual store, not just a catalog.
const COMMERCE_INTENT = /\b(buy|shop|store|purchase|checkout|check\s*out|add\s*to\s*cart|cart|order|sell|sale|for\s*sale|in\s*stock|shipping|deliver(?:y)?|merch|payment|ecommerce|e-commerce)\b/i;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the LayoutPlan for one render.
 *
 * @param prompt        Raw user prompt (for user-intent clause ordering + commerce intent).
 * @param puo           Resolved understanding (for layout direction).
 * @param spec          WebsiteSpec — source of truth for sections AND pages.
 * @param normIndustry  Normalized industry (for page LABELING only).
 */
export function buildLayoutPlan(
  prompt: string,
  puo: PromptUnderstandingObject,
  spec: WebsiteSpec,
  normIndustry: string,
): LayoutPlan {
  const direction = puo.layout?.direction || '';

  // ── 1. User intent order ────────────────────────────────────────────────────
  const { required: userRequired } = extractRequirements(prompt);
  const userOrderMap = new Map<SectionKind, number>();
  userRequired.forEach((k, i) => userOrderMap.set(k, i));

  // ── 2. Homepage section placements (user-ordered, inferred last) ─────────────
  const homeSections: SectionPlacement[] = spec.sections.map(kind => ({
    kind,
    userOrder: userOrderMap.has(kind) ? userOrderMap.get(kind)! : null,
    source: (userOrderMap.has(kind) ? 'required' : 'inferred') as 'required' | 'inferred',
  }));
  homeSections.sort((a, b) => {
    if (a.userOrder === null && b.userOrder === null) return 0;
    if (a.userOrder === null) return 1;
    if (b.userOrder === null) return -1;
    return a.userOrder - b.userOrder;
  });

  // ── 3. Commerce ─────────────────────────────────────────────────────────────
  // Derived from a products requirement + commerce intent — NEVER from niche name.
  const hasProducts = spec.sections.includes('products');
  const hasCart = hasProducts && (direction === 'e-commerce' || COMMERCE_INTENT.test(prompt));

  // ── 4. Pages ────────────────────────────────────────────────────────────────
  // Home is the only unconditional page. Every other page comes from
  // spec.requiredPages, in user-intent order. forbiddenPages already subtracted.
  const pageKinds = new Set(spec.requiredPages);
  const pages: PageSpec[] = [
    { slug: 'home', label: 'Home', kind: 'home', isNav: true },
  ];

  // Order page-worthy kinds by user intent (fall back to spec order).
  const orderedPageKinds = [...pageKinds].sort((a, b) => {
    const oa = userOrderMap.has(a) ? userOrderMap.get(a)! : Number.MAX_SAFE_INTEGER;
    const ob = userOrderMap.has(b) ? userOrderMap.get(b)! : Number.MAX_SAFE_INTEGER;
    return oa - ob;
  });

  let gallerySlug = '';
  let hasPricing = false;
  for (const kind of orderedPageKinds) {
    const ps = pageSpecFor(kind, normIndustry, direction);
    if (!ps) continue;
    pages.push({ slug: ps.slug, label: ps.label, kind, isNav: true });
    if (kind === 'gallery') gallerySlug = ps.slug;
    if (kind === 'pricing') hasPricing = true;
  }

  // Commerce pages — appended after content pages. Checkout is never in nav.
  if (hasCart) {
    if (!pages.some(p => p.kind === 'products')) {
      // products required but not yet a page (e.g. forbidden as page but commerce on)
      const ps = productsPage(normIndustry);
      pages.push({ slug: ps.slug, label: ps.label, kind: 'products', isNav: true });
    }
    pages.push({ slug: 'cart',     label: 'Cart',     kind: 'cart',     isNav: true });
    pages.push({ slug: 'checkout', label: 'Checkout', kind: 'checkout', isNav: false });
  }

  // ── 5. Navigation — page links + in-page anchors, in user-intent order ───────
  const pageByKind = new Map<SectionKind, PageSpec>();
  for (const p of pages) {
    if (p.kind !== 'home' && p.kind !== 'cart' && p.kind !== 'checkout') {
      pageByKind.set(p.kind, p);
    }
  }
  const navigation: Array<{ label: string; href: string }> = [
    { label: 'Home', href: '.' },
  ];
  for (const placement of homeSections) {
    const k = placement.kind;
    const page = pageByKind.get(k);
    if (page) {
      navigation.push({ label: page.label, href: page.slug });
    } else if (!NO_ANCHOR.has(k)) {
      navigation.push({ label: ANCHOR_LABEL[k] ?? cap(k), href: '#' + k });
    }
  }
  if (hasCart) navigation.push({ label: 'Cart', href: 'cart' });

  // ── 6. Section-CTA targets — always real, never a niche-invented page ────────
  const primaryCtaTarget = resolvePrimaryTarget(pages, homeSections);
  const secondaryCtaTarget = resolveSecondaryTarget(pages, homeSections, primaryCtaTarget);

  return {
    homeSections,
    pages,
    navigation,
    gallerySlug,
    hasCart,
    hasPricing,
    primaryCtaTarget,
    secondaryCtaTarget,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Primary CTA → the most action-oriented page that exists, else a home anchor.
const PRIMARY_PREF: Array<PageSpec['kind']> = ['products', 'booking', 'pricing', 'gallery', 'events', 'blog'];
function resolvePrimaryTarget(pages: PageSpec[], homeSections: SectionPlacement[]): string {
  for (const pref of PRIMARY_PREF) {
    const hit = pages.find(p => p.kind === pref);
    if (hit) return hit.slug;
  }
  // No action page — anchor to the first required home section, else home root.
  const firstSection = homeSections.find(s => s.kind !== 'cta');
  return firstSection ? '#' + firstSection.kind : '.';
}

// Secondary CTA → contact page if one exists, else a different home anchor, else home.
function resolveSecondaryTarget(pages: PageSpec[], homeSections: SectionPlacement[], primary: string): string {
  const contact = pages.find(p => p.kind === 'contact');
  if (contact) return contact.slug;
  for (const s of homeSections) {
    if (s.kind === 'cta') continue;
    const anchor = '#' + s.kind;
    if (anchor !== primary) return anchor;
  }
  return '.';
}
