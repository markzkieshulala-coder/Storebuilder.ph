import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import VisitTracker from "@/components/VisitTracker";
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

  if (!website || !website.htmlContent) notFound();

  // Stitch-generated sites: htmlContent IS the website. Render it directly.
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

// ISR — revalidate published sites every 60 seconds
export const revalidate = 60;
