import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";

interface Props {
  params: { subdomain: string; section: string };
}

// These sub-paths are handled by other routes — don't treat as sections
const SKIP = new Set(["checkout"]);

export default async function SectionPage({ params }: Props) {
  if (SKIP.has(params.section)) notFound();

  const website = await prisma.website.findFirst({
    where: { subdomain: params.subdomain, published: true },
  });
  if (!website) notFound();

  const content = website.jsonContent as GeneratedWebsite;
  const all = content.sections;

  // Find the target section by type
  const target = all.find((s) => s.type === params.section);
  if (!target) notFound();

  // Build a minimal page: nav (if exists) + target section + footer (if exists, not same as target)
  const nav = all.find((s) => s.type === "nav");
  const footer = all.find((s) => s.type === "footer");

  const pageSections: Section[] = [
    ...(nav ? [nav] : []),
    target,
    ...(footer && footer.id !== target.id ? [footer] : []),
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
