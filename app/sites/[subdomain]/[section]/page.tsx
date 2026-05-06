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
// in order of preference. The first type that exists in the site's section
// list is rendered as the page body. This lets nav like /work resolve to a
// "gallery" section on a portfolio site or "products" on a store.
const ROUTE_TO_TYPES: Record<string, string[]> = {
  about: ["about"],
  work: ["gallery", "products", "team"],
  gallery: ["gallery"],
  menu: ["products"],
  shop: ["products"],
  store: ["products"],
  products: ["products"],
  services: ["features", "process"],
  features: ["features"],
  process: ["process"],
  pricing: ["pricing"],
  team: ["team"],
  faq: ["faq"],
  contact: ["contact"],
  testimonials: ["testimonials"],
  reviews: ["testimonials"],
  blog: [],
};

export default async function SectionPage({ params }: Props) {
  if (SKIP.has(params.section)) notFound();

  const website = await prisma.website.findFirst({
    where: { subdomain: params.subdomain, published: true },
  });
  if (!website) notFound();

  const content = website.jsonContent as GeneratedWebsite;
  const all = content.sections;

  // Resolve target sections via the route alias map; fall back to direct
  // type match so older sites (or unmapped slugs) still work.
  const candidateTypes = ROUTE_TO_TYPES[params.section] ?? [params.section];
  const targets = candidateTypes
    .map((t) => all.find((s) => s.type === t))
    .filter((s): s is Section => Boolean(s));

  if (targets.length === 0) notFound();

  // Build a minimal page: nav (if exists) + target section(s) + footer (if exists, not same as target)
  const nav = all.find((s) => s.type === "nav");
  const footer = all.find((s) => s.type === "footer");
  const targetIds = new Set(targets.map((t) => t.id));

  const pageSections: Section[] = [
    ...(nav ? [nav] : []),
    ...targets,
    ...(footer && !targetIds.has(footer.id) ? [footer] : []),
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
