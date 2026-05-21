import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import VisitTracker from "@/components/VisitTracker";
import type { Metadata } from "next";
import { UltraPremiumRenderer } from "@/components/ultra-premium/UltraPremiumRenderer";
import type { SiteBlueprint } from "@/components/ultra-premium/types/blueprint";

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
    where: { subdomain: params.subdomain, published: true },
  });

  if (!website) notFound();

  // Use htmlContent first — this matches what the editor shows
  if (website.htmlContent) {
    return (
      <>
        <VisitTracker subdomain={website.subdomain!} path="/" />
        <iframe
          srcDoc={website.htmlContent}
          style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
          title={website.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </>
    );
  }

  // Fallback: blueprint-based rendering for sites without htmlContent
  const json = website.jsonContent as Record<string, unknown> | null;
  const blueprint = json?.blueprint as SiteBlueprint | undefined;
  if (blueprint) {
    return (
      <>
        <VisitTracker subdomain={website.subdomain!} path="/" />
        <UltraPremiumRenderer blueprint={blueprint} />
      </>
    );
  }

  notFound();
}

export const revalidate = 60;
