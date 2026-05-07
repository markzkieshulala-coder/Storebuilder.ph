import { GeneratedWebsite, Section } from "@/lib/ai/generate";
import { normalizeNavLinks } from "@/lib/site/normalizeLinks";

// Multi-page nav: each route slug maps to one or more candidate section types,
// in order of preference. Used by /sites/[subdomain]/[section] to render every
// matching section so a route page is never empty.
export const ROUTE_TO_TYPES: Record<string, string[]> = {
  about:       ["about", "stats", "team"],
  work:        ["gallery", "products", "team"],
  gallery:     ["gallery"],
  menu:        ["products"],
  shop:        ["products", "features"],
  store:       ["products", "features"],
  products:    ["products", "features"],
  services:    ["features", "process", "pricing"],
  features:    ["features", "process"],
  process:     ["process", "features"],
  pricing:     ["pricing"],
  team:        ["team"],
  faq:         ["faq"],
  contact:     ["contact", "newsletter"],
  testimonials: ["testimonials"],
  reviews:     ["testimonials"],
  blog:        ["features"],
};

// Section types that are dedicated to specific sub-pages (not duplicated on
// the homepage). The homepage gets its OWN curated set — see selectHomepage.
const SUBPAGE_ONLY_TYPES = new Set([
  "pricing", "faq", "process", "contact", "team", "gallery", "products", "stats",
]);

// Friendly title for an unmapped route — used by the synthesized hero.
export const ROUTE_TITLES: Record<string, { title: string; description: string }> = {
  about:       { title: "About Us", description: "Learn more about who we are and what we do." },
  work:        { title: "Our Work", description: "A selection of recent projects and creative work." },
  gallery:     { title: "Gallery", description: "A visual look at the work we've shipped." },
  menu:        { title: "Our Menu", description: "Browse what's on offer." },
  shop:        { title: "Shop", description: "Featured products available right now." },
  store:       { title: "Store", description: "Featured products available right now." },
  products:    { title: "Products", description: "Featured products available right now." },
  services:    { title: "Our Services", description: "What we offer and how we can help." },
  features:    { title: "Features", description: "Everything that's included." },
  process:     { title: "Our Process", description: "How we work with you from start to finish." },
  pricing:     { title: "Pricing", description: "Simple, transparent pricing for every stage." },
  team:        { title: "Our Team", description: "The people behind the work." },
  faq:         { title: "Frequently Asked Questions", description: "Common questions, answered." },
  contact:     { title: "Contact Us", description: "Get in touch — we'd love to hear from you." },
  testimonials: { title: "Testimonials", description: "What our customers have to say." },
  reviews:     { title: "Reviews", description: "What our customers have to say." },
  blog:        { title: "Blog", description: "Stories, ideas and updates." },
};

export function syntheticHero(routeSlug: string, brand: string): Section {
  const meta = ROUTE_TITLES[routeSlug] ?? { title: brand, description: `${brand} — ${routeSlug}` };
  return {
    id: `synthetic-hero-${routeSlug}`,
    type: "hero",
    data: {
      headline: meta.title,
      subheadline: brand,
      description: meta.description,
      backgroundImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&h=800&fit=crop&q=80",
    },
    styles: {},
  };
}

// Pick the first occurrence of a section type (id-deduped).
function firstOf(all: Section[], type: string, seenIds: Set<string>): Section | undefined {
  for (const s of all) {
    if (s.type === type && !seenIds.has(s.id)) return s;
  }
  return undefined;
}

// Curated homepage layout: nav → hero → about preview → features preview →
// testimonials → cta → newsletter → footer. Homepage NEVER duplicates content
// from dedicated sub-pages (pricing/faq/process/contact/team/gallery/products
// stay on their own pages).
export function selectHomepageSections(website: GeneratedWebsite): Section[] {
  if (!website || !Array.isArray(website.sections)) return [];
  const normalized = normalizeNavLinks(website);
  const all = normalized.sections || [];
  const nav = all.find((s) => s.type === "nav");
  const footer = all.find((s) => s.type === "footer");
  const seen = new Set<string>();
  const out: Section[] = [];
  if (nav) { out.push(nav); seen.add(nav.id); }

  const HOMEPAGE_ORDER = ["hero", "about", "features", "testimonials", "cta", "newsletter"];
  for (const type of HOMEPAGE_ORDER) {
    const s = firstOf(all, type, seen);
    if (s) { out.push(s); seen.add(s.id); }
  }

  // Fallback: if the AI under-generated and we got nothing between nav+footer,
  // synthesize a homepage hero so the page never appears blank.
  if (out.length === (nav ? 1 : 0)) {
    out.push(syntheticHero("/", website.name || "Welcome"));
  }

  if (footer) out.push(footer);
  return out;
}

// Sub-page layout: ALL matching candidate types from ROUTE_TO_TYPES (so
// /work shows gallery + products + team if all exist), framed by nav + footer.
// Falls back to a synthetic hero so the route never 404s.
export function selectSubpageSections(
  website: GeneratedWebsite,
  routeSlug: string
): Section[] {
  if (!website || !Array.isArray(website.sections)) {
    return [syntheticHero(routeSlug, website?.name || "")];
  }
  const normalized = normalizeNavLinks(website);
  const all = normalized.sections || [];
  const nav = all.find((s) => s.type === "nav");
  const footer = all.find((s) => s.type === "footer");

  const candidateTypes = ROUTE_TO_TYPES[routeSlug] ?? [routeSlug];
  const seen = new Set<string>();
  const targets: Section[] = [];
  for (const t of candidateTypes) {
    for (const s of all) {
      if (s.type === t && !seen.has(s.id)) {
        targets.push(s);
        seen.add(s.id);
      }
    }
  }

  const body = targets.length > 0
    ? targets
    : [syntheticHero(routeSlug, website.name || "")];

  return [
    ...(nav ? [nav] : []),
    ...body,
    ...(footer ? [footer] : []),
  ];
}

export { SUBPAGE_ONLY_TYPES };
