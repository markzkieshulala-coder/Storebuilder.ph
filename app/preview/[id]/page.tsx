import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UltraPremiumRenderer } from "@/components/ultra-premium/UltraPremiumRenderer";
import type { SiteBlueprint } from "@/components/ultra-premium/types/blueprint";
import { renderBlueprintToHtml } from "@/lib/ultra-premium/render/htmlRenderer";
import type { SiteBlueprint as RendererBlueprint } from "@/lib/ultra-premium/types/SiteBlueprint";

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

  const json = website.jsonContent as Record<string, unknown> | null;
  const blueprint = json?.blueprint as RendererBlueprint | undefined;

  // If blueprint exists, always re-render with the correct website.name so old
  // websites with stale brand names / generic images are fixed on every view.
  if (blueprint) {
    const freshHtml = renderBlueprintToHtml(blueprint, website.name);

    // Background-persist the fresh HTML so the editor also picks up the fix.
    if (!blueprint.brandName) {
      prisma.$executeRawUnsafe(
        `UPDATE "Website" SET "htmlContent" = $1, "updatedAt" = NOW() WHERE id = $2`,
        freshHtml,
        website.id
      ).catch(() => {});
    }

    return (
      <iframe
        srcDoc={freshHtml}
        style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
        title={website.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  // Fallback: cached htmlContent for sites whose blueprint was lost
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

  // Legacy React renderer fallback (pre-htmlContent sites)
  const legacyBlueprint = json?.blueprint as SiteBlueprint | undefined;
  if (legacyBlueprint) {
    return <UltraPremiumRenderer blueprint={legacyBlueprint} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          This website can&apos;t be previewed
        </h1>
        <p className="text-sm text-gray-500">
          It was created with an older format. Please regenerate it from the
          dashboard.
        </p>
      </div>
    </div>
  );
}
