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
    select: { id: true, name: true, subdomain: true, published: true, type: true },
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
      <div className="min-h-screen bg-[#F5F8FF] flex items-center justify-center px-4 py-10" style={{ fontFamily: "'Inter', 'Google Sans', system-ui, sans-serif" }}>
        <div className="max-w-md w-full bg-white border border-[#E0E7FF] rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#1877F2] mx-auto mb-4 flex items-center justify-center">
            <Crown size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] mb-2">Business Tools is an Enterprise feature</h1>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            Upgrade to Enterprise to access the full management console —
            inbox, orders, products, customers, marketing, analytics, and settings.
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-semibold hover:bg-[#166FE5] transition-colors"
          >
            View Enterprise plans <ArrowRight size={14} />
          </Link>
          <Link href="/dashboard" className="block mt-4 text-xs text-[#94A3B8] hover:text-[#1877F2]">
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
