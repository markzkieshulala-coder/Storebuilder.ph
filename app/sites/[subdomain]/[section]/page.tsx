import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: { subdomain: string; section: string };
}

// These sub-paths are handled by other routes — don't treat as section redirects
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

  // All Stitch-generated sites are self-contained single-page HTML files.
  // Internal navigation (to sections like /about, /products) is handled
  // within the iframe on the main page. Redirect back to the root.
  redirect(`/sites/${params.subdomain}`);
}

export const revalidate = 60;
