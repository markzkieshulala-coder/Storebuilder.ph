// ---------------------------------------------------------------------------
// LAYOUT PLAN — Phase 2: single authority on page structure.
//
// LayoutPlan owns every structural decision that was previously scattered
// across html-renderer.ts as ad-hoc niche checks:
//
//   • Which pages exist and their slugs
//   • Which pages appear in the navigation
//   • Which pages are hidden (reachable from CTAs, not from nav)
//   • Gallery page URL slug
//   • Whether the site has cart + checkout pages
//   • Whether the site has a pricing page
//   • Home-page section ordering — user's stated order, then inferred
//
// Previously owned by (now unreachable after this phase):
//   • detectGallerySlug()            — gallery URL logic
//   • HIDDEN_PAGE_MAP / getHiddenPageConfig()  — hidden page slugs
//   • isProductBiz / PRODUCT_NICHES  — cart page gate
//   • fixed routes array in renderMultiPageSiteInner — page set
//   • diversity engine               — combats convergence by symptom
//
// buildLayoutPlan is the single call that replaces all of them. The renderer
// iterates layoutPlan.pages instead of building routes ad-hoc.
// ---------------------------------------------------------------------------

import { extractRequirements, type SectionKind } from './requirements';
import type { PromptUnderstandingObject } from './prompt-engine';
import type { WebsiteSpec } from './spec';

// ── Public types ─────────────────────────────────────────────────────────────

export interface SectionPlacement {
  kind: SectionKind;
  /**
   * Zero-based index of this kind in the user's positive-clause list.
   * null = kind was inferred (NLU or niche-fill), not explicitly stated.
   */
  userOrder: number | null;
  source: 'required' | 'inferred';
}

export interface PageSpec {
  slug: string;
  label: string;
  /** Appears in the top navigation. */
  isNav: boolean;
  /** Reachable from section CTAs only; not listed in nav. */
  isHidden: boolean;
}

export interface LayoutPlan {
  /** Home-page sections in user-intent order (null-order sections last). */
  homeSections: SectionPlacement[];
  /** All pages for the SPA, including hidden. */
  pages: PageSpec[];
  /** Top-nav items derived from nav pages. */
  navigation: Array<{ label: string; href: string }>;
  /** URL slug for the gallery/portfolio/menu/shop page. */
  gallerySlug: string;
  /** True → build cart + checkout pages and a Cart nav item. */
  hasCart: boolean;
  /** True → build a pricing page and a Pricing nav item. */
  hasPricing: boolean;
  /** Slug for the niche primary hidden page (e.g. 'reservations', 'demo'). */
  hiddenPrimarySlug: string;
  /** Slug for the niche secondary hidden page (e.g. 'our-story', 'process'). */
  hiddenSecondarySlug: string;
}

// ── Private constants ─────────────────────────────────────────────────────────

// Niches whose primary commerce model is selling physical/digital products.
// These get cart + checkout pages.
const PRODUCT_NICHES = new Set([
  'ecommerce', 'fashion', 'jewelry', 'florist', 'craft', 'pet',
  'beauty', 'retail', 'shop', 'store', 'dessert', 'juicebar', 'bakery', 'coffee',
]);

// Hidden page slugs per normalized industry. Hidden pages are bundled in the SPA
// but unreachable from navigation — only reachable via section CTAs.
const HIDDEN_SLUG_MAP: Record<string, { primary: string; secondary: string }> = {
  food:        { primary: 'reservations', secondary: 'our-story'    },
  technology:  { primary: 'demo',         secondary: 'case-studies' },
  photography: { primary: 'services',     secondary: 'process'      },
  portfolio:   { primary: 'services',     secondary: 'process'      },
  fashion:     { primary: 'lookbook',     secondary: 'new-arrivals'  },
  ecommerce:   { primary: 'new-arrivals', secondary: 'lookbook'      },
  sports:      { primary: 'programs',     secondary: 'coaches'       },
  agency:      { primary: 'services',     secondary: 'process'       },
  general:     { primary: 'services',     secondary: 'team'          },
};

function gallerySlugFor(direction: string, normIndustry: string): string {
  if (direction === 'portfolio' || normIndustry === 'photography' || normIndustry === 'design') return 'work';
  if (direction === 'e-commerce' || normIndustry === 'ecommerce' || normIndustry === 'fashion') return 'shop';
  if (normIndustry === 'food') return 'menu';
  return 'gallery';
}

function galleryLabelFor(slug: string): string {
  if (slug === 'menu')    return 'Menu';
  if (slug === 'shop')    return 'Shop';
  if (slug === 'work')    return 'Work';
  return 'Gallery';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the LayoutPlan for one render.
 *
 * @param prompt        The raw user prompt (for user-intent clause ordering).
 * @param puo           Resolved understanding (for layout direction + industry).
 * @param spec          WebsiteSpec (source of truth for required/forbidden sections).
 * @param normIndustry  Already-normalized industry string (caller computes to avoid
 *                      circular import — normalizeIndustry lives in html-renderer.ts).
 */
export function buildLayoutPlan(
  prompt: string,
  puo: PromptUnderstandingObject,
  spec: WebsiteSpec,
  normIndustry: string,
): LayoutPlan {

  // ── 1. User intent order ────────────────────────────────────────────────────
  // extractRequirements preserves positive-clause order, so required[i] is the
  // i-th section the user mentioned. Build kind → clause-index lookup.
  const { required: userRequired } = extractRequirements(prompt);
  const userOrderMap = new Map<SectionKind, number>();
  userRequired.forEach((k, i) => userOrderMap.set(k, i));

  // ── 2. Homepage section placements ─────────────────────────────────────────
  // spec.sections already omits forbidden and deduplicates. Augment each with
  // its user-stated position (null if the NLU inferred it rather than the user
  // writing it explicitly).
  const homeSections: SectionPlacement[] = spec.sections.map(kind => ({
    kind,
    userOrder: userOrderMap.has(kind) ? userOrderMap.get(kind)! : null,
    source: userOrderMap.has(kind) ? 'required' : 'inferred',
  }));
  // Stable sort: user-ordered first (ascending clause index), inferred last.
  homeSections.sort((a, b) => {
    if (a.userOrder === null && b.userOrder === null) return 0;
    if (a.userOrder === null) return 1;
    if (b.userOrder === null) return -1;
    return a.userOrder - b.userOrder;
  });

  // ── 3. Structural flags ─────────────────────────────────────────────────────
  const direction     = puo.layout?.direction || '';
  const gallerySlug   = gallerySlugFor(direction, normIndustry);
  const galleryLabel  = galleryLabelFor(gallerySlug);
  const hasCart       = PRODUCT_NICHES.has(normIndustry) || direction === 'e-commerce';
  const hasPricing    = spec.sections.includes('pricing');

  // ── 4. Hidden pages ─────────────────────────────────────────────────────────
  const hiddenCfg          = HIDDEN_SLUG_MAP[normIndustry] ?? HIDDEN_SLUG_MAP.general;
  const hiddenPrimarySlug   = hiddenCfg.primary;
  const hiddenSecondarySlug = hiddenCfg.secondary;

  // ── 5. Page set ─────────────────────────────────────────────────────────────
  const pages: PageSpec[] = [
    { slug: 'home',      label: 'Home',         isNav: true,  isHidden: false },
    { slug: 'about',     label: 'About',        isNav: true,  isHidden: false },
    { slug: gallerySlug, label: galleryLabel,   isNav: true,  isHidden: false },
    { slug: 'contact',   label: 'Contact',      isNav: true,  isHidden: false },
  ];
  if (hasPricing) {
    // Insert Pricing before Contact
    pages.splice(3, 0, { slug: 'pricing', label: 'Pricing', isNav: true, isHidden: false });
  }
  if (hasCart) {
    pages.push({ slug: 'cart',     label: 'Cart',     isNav: true,  isHidden: false });
    pages.push({ slug: 'checkout', label: 'Checkout', isNav: false, isHidden: false });
  }
  // Hidden pages — bundled in SPA but absent from nav
  pages.push({ slug: hiddenPrimarySlug,   label: hiddenPrimarySlug.replace(/-/g, ' '),   isNav: false, isHidden: true });
  pages.push({ slug: hiddenSecondarySlug, label: hiddenSecondarySlug.replace(/-/g, ' '), isNav: false, isHidden: true });

  // ── 6. Navigation ───────────────────────────────────────────────────────────
  const navigation = pages
    .filter(p => p.isNav && !p.isHidden)
    .map(p => ({ label: p.label, href: p.slug === 'home' ? '.' : p.slug }));

  return {
    homeSections,
    pages,
    navigation,
    gallerySlug,
    hasCart,
    hasPricing,
    hiddenPrimarySlug,
    hiddenSecondarySlug,
  };
}
