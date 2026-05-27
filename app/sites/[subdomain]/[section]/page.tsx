import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { subdomain: string; section: string };
}

// These sub-paths are handled by other routes — don't treat as section pages
const SKIP = new Set(["checkout"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const website = await prisma.website.findUnique({
    where: { subdomain: params.subdomain },
  });
  if (!website) return { title: "Not Found" };
  return {
    title: website.seoTitle || website.name,
    description: website.seoDesc || undefined,
  };
}

export default async function SectionPage({ params }: Props) {
  if (SKIP.has(params.section)) notFound();

  const website = await prisma.website.findFirst({
    where: { subdomain: params.subdomain, published: true },
  });
  if (!website) notFound();

  const json = website.jsonContent as Record<string, unknown> | null;
  if (json?.multipage && json?.pages) {
    const pageHtml = (json.pages as Record<string, string>)[`/${params.section}`];
    if (pageHtml) {
      return (
        <iframe
          srcDoc={pageHtml}
          style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
          title={`${website.name} — ${params.section}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      );
    }
    // Section not found in this multi-page site
    notFound();
  }

  // Legacy single-page sites: any section path redirects to root
  const { redirect } = await import("next/navigation");
  redirect(`/sites/${params.subdomain}`);
}

export const revalidate = 60;
