import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import VisitTracker from "@/components/VisitTracker";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { selectHomepageSections } from "@/lib/site/pageSections";
import type { Metadata } from "next";

interface Props {
  params: { subdomain: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const website = await prisma.website.findUnique({
    where: { subdomain: params.subdomain },
  });
  if (!website) return { title: "Not Found" };

  return {
    title: website.seoTitle || website.name,
    description: website.seoDesc || undefined,
    openGraph: {
      title: website.seoTitle || website.name,
      description: website.seoDesc || undefined,
      type: "website",
    },
  };
}

export default async function SubdomainPage({ params }: Props) {
  const website = await prisma.website.findFirst({
    where: {
      subdomain: params.subdomain,
      published: true,
    },
  });

  if (!website) notFound();

  // jsonContent is the editable source of truth — what the user edits is what
  // gets published. The raw Stitch HTML is stored separately as a fidelity
  // reference and never rendered directly here.
  const raw = website.jsonContent as GeneratedWebsite;
  const homepageSections = selectHomepageSections(raw);
  const content: GeneratedWebsite = {
    ...raw,
    sections: homepageSections,
    subdomain: website.subdomain,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=DM+Serif+Display:ital@0;1&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Syne:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,200;12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap');
      `}</style>
      <VisitTracker subdomain={website.subdomain!} path="/" />
      <WebsiteRenderer website={content} />
    </>
  );
}

// ISR — revalidate published sites every 60 seconds
export const revalidate = 60;
