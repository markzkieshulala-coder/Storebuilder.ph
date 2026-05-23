import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
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

  if (website.htmlContent) {
    return (
      <iframe
        srcDoc={website.htmlContent}
        style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
        title={website.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          This website can&apos;t be previewed
        </h1>
        <p className="text-sm text-gray-500">
          It was created with an older format. Please regenerate it from the dashboard.
        </p>
      </div>
    </div>
  );
}
