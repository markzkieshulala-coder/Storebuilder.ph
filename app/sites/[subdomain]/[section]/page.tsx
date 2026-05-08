import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import VisitTracker from "@/components/VisitTracker";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { selectSubpageSections, ROUTE_TITLES } from "@/lib/site/pageSections";
import type { Metadata } from "next";

interface Props {
  params: { subdomain: string; section: string };
}

// These sub-paths are handled by other routes — don't treat as sections
const SKIP = new Set(["checkout"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const website = await prisma.website.findUnique({
    where: { subdomain: params.subdomain },
  });
  if (!website) return { title: "Not Found" };
  const title = ROUTE_TITLES[params.section]?.title ?? params.section;
  return {
    title: `${title} — ${website.seoTitle || website.name}`,
    description: ROUTE_TITLES[params.section]?.description || website.seoDesc || undefined,
  };
}

export default async function SectionPage({ params }: Props) {
  if (SKIP.has(params.section)) notFound();

  const website = await prisma.website.findFirst({
    where: { subdomain: params.subdomain, published: true },
  });
  if (!website) notFound();

  const raw = website.jsonContent as GeneratedWebsite;
  const pageSections = selectSubpageSections(raw, params.section);

  const pageContent: GeneratedWebsite = {
    ...raw,
    sections: pageSections,
    subdomain: website.subdomain,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=DM+Serif+Display:ital@0;1&family=Cormorant+Garamond:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&display=swap');
      `}</style>
      <VisitTracker subdomain={website.subdomain!} path={`/${params.section}`} />
      <WebsiteRenderer website={pageContent} />
    </>
  );
}

export const revalidate = 60;
