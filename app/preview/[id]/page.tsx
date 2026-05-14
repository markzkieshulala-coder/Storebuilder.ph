import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const website = await prisma.website.findUnique({ where: { id: params.id } });
  if (!website) return {};
  return {
    title: website.seoTitle || website.name,
    description: website.seoDesc || undefined,
  };
}

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const website = await prisma.website.findUnique({ where: { id: params.id } });
  if (!website) notFound();

  // jsonContent is the editable source of truth — what the editor edits is
  // what we render here. The raw Stitch HTML is kept on the row as a fidelity
  // reference only; we don't render it directly because that would diverge
  // from the editor's view.
  const content = website.jsonContent as GeneratedWebsite;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Serif+Display&family=Cormorant+Garamond:wght@300;400;600&family=Syne:wght@400;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap');
      `}</style>
      <WebsiteRenderer website={content} isPreview />
    </>
  );
}
