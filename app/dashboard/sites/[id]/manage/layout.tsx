import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";
import { ensureSchemaMigrations } from "@/lib/db-migrations";
import ManageShell from "@/components/manage/ManageShell";
import { Crown, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  await ensureSchemaMigrations();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/auth/signin?callbackUrl=/dashboard/sites/${params.id}/manage`);

  const website = await prisma.website.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { id: true, name: true, subdomain: true, published: true },
  });
  if (!website) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });

  // Enterprise gate — anyone on a lower plan sees an upgrade screen instead
  // of the management UI. We render this fully here (not inside ManageShell)
  // because there's no point loading the sidebar nav.
  if (!getPlan(user?.plan).canGenerateCRM) {
    return (
      <div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center px-4 py-10" style={{ fontFamily: "'Inter', 'Google Sans', system-ui, sans-serif" }}>
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] mx-auto mb-4 flex items-center justify-center">
            <Crown size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">Store management is an Enterprise feature</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Upgrade to Enterprise to access the full Shopify-style management console — orders,
            products, customers, discounts, analytics, and shipping settings.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A1A1A] text-white text-sm font-semibold hover:bg-black transition-colors"
          >
            View Enterprise plans <ArrowRight size={14} />
          </Link>
          <Link href="/dashboard" className="block mt-4 text-xs text-gray-400 hover:text-gray-600">
            ← Back to all websites
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ManageShell site={website}>
      {children}
    </ManageShell>
  );
}
