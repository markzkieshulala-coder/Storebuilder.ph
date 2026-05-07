import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";

interface Props {
  params: { subdomain: string; section: string };
}

// These sub-paths are handled by other routes — don't treat as sections
const SKIP = new Set(["checkout"]);

// Multi-page nav: each route slug maps to one or more candidate section types,
// in order of preference. We render EVERY matching candidate so a /work page
// on a portfolio site shows gallery + team, while on a store it shows
// products + features. This guarantees the page is never empty even if the
// AI under-generated content for the route.
const ROUTE_TO_TYPES: Record<string, string[]> = {
  about: ["about", "stats", "team"],
  work: ["gallery", "products", "team"],
  gallery: ["gallery"],
  menu: ["products"],
  shop: ["products", "features"],
  store: ["products", "features"],
  products: ["products", "features"],
  services: ["features", "process", "pricing"],
  features: ["features", "process"],
  process: ["process", "features"],
  pricing: ["pricing"],
  team: ["team"],
  faq: ["faq"],
  contact: ["contact", "newsletter"],
  testimonials: ["testimonials"],
  reviews: ["testimonials"],
  blog: ["features"],
};

// Friendly title for the route — used by the synthesized hero when we have to
// fall back to a placeholder page.
const ROUTE_TITLES: Record<string, { title: string; description: string }> = {
  about: { title: "About Us", description: "Learn more about who we are and what we do." },
  work: { title: "Our Work", description: "A selection of recent projects and creative work." },
  gallery: { title: "Gallery", description: "A visual look at the work we've shipped." },
  menu: { title: "Our Menu", description: "Browse what's on offer." },
  shop: { title: "Shop", description: "Featured products available right now." },
  store: { title: "Store", description: "Featured products available right now." },
  products: { title: "Products", description: "Featured products available right now." },
  services: { title: "Our Services", description: "What we offer and how we can help." },
  features: { title: "Features", description: "Everything that's included." },
  process: { title: "Our Process", description: "How we work with you from start to finish." },
  pricing: { title: "Pricing", description: "Simple, transparent pricing for every stage." },
  team: { title: "Our Team", description: "The people behind the work." },
  faq: { title: "Frequently Asked Questions", description: "Common questions, answered." },
  contact: { title: "Contact Us", description: "Get in touch — we'd love to hear from you." },
  testimonials: { title: "Testimonials", description: "What our customers have to say." },
  reviews: { title: "Reviews", description: "What our customers have to say." },
  blog: { title: "Blog", description: "Stories, ideas and updates." },
};

// Build a synthetic hero section for a route that the generated site is
// missing, so the page still has presentable content (no 404, no blank page).
function syntheticHero(routeSlug: string, brand: string): Section {
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

export default async function SectionPage({ params }: Props) {
  if (SKIP.has(params.section)) notFound();

  const website = await prisma.website.findFirst({
    where: { subdomain: params.subdomain, published: true },
  });
  if (!website) notFound();

  const content = website.jsonContent as GeneratedWebsite;
  const all = content.sections;

  // Resolve target sections via the route alias map; fall back to direct
  // type match so older sites (or unmapped slugs) still work. Take ALL
  // matching candidates (not just the first) so route pages stay full.
  const candidateTypes = ROUTE_TO_TYPES[params.section] ?? [params.section];
  const seenIds = new Set<string>();
  const targets: Section[] = [];
  for (const t of candidateTypes) {
    for (const s of all) {
      if (s.type === t && !seenIds.has(s.id)) {
        targets.push(s);
        seenIds.add(s.id);
      }
    }
  }

  // Always include nav + footer; render a synthetic hero if no page content
  // resolved so the route never appears blank.
  const nav = all.find((s) => s.type === "nav");
  const footer = all.find((s) => s.type === "footer");

  const body: Section[] = targets.length > 0
    ? targets
    : [syntheticHero(params.section, content.name || params.subdomain)];

  const pageSections: Section[] = [
    ...(nav ? [nav] : []),
    ...body,
    ...(footer ? [footer] : []),
  ];

  const pageContent: GeneratedWebsite = {
    ...content,
    sections: pageSections,
    subdomain: website.subdomain,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Serif+Display:ital@0;1&family=Cormorant+Garamond:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');
      `}</style>
      <WebsiteRenderer website={pageContent} />
    </>
  );
}

export const revalidate = 60;
