"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, ShoppingBag, Package, Users, Megaphone, Tag,
  BarChart3, Settings, ExternalLink, ArrowLeft, ChevronRight,
  Menu, X, Sparkles, Search,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// Shopify-style two-column shell — fixed left nav, scrollable main content.
// Every /dashboard/sites/[id]/manage/* page renders inside this layout via
// the layout.tsx file. Active route is highlighted from `usePathname()` so
// links work as real Next.js navigation (URL changes, browser history works).

export type SiteHeader = {
  id: string;
  name: string;
  subdomain: string | null;
  published: boolean;
};

const NAV: { href: string; label: string; Icon: any; badge?: string }[] = [
  { href: "",            label: "Home",       Icon: Home },
  { href: "/orders",     label: "Orders",     Icon: ShoppingBag },
  { href: "/products",   label: "Products",   Icon: Package },
  { href: "/customers",  label: "Customers",  Icon: Users },
  { href: "/marketing",  label: "Marketing",  Icon: Megaphone },
  { href: "/discounts",  label: "Discounts",  Icon: Tag },
  { href: "/analytics",  label: "Analytics",  Icon: BarChart3 },
  { href: "/settings",   label: "Settings",   Icon: Settings },
];

export default function ManageShell({
  site,
  children,
}: {
  site: SiteHeader | null;
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/dashboard/sites/${params.id}/manage`;

  // Close mobile drawer whenever the route changes.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F1F1F1]" style={{ fontFamily: "'Inter', 'Google Sans', system-ui, -apple-system, sans-serif" }}>
      {/* ── Top bar (mobile) ── */}
      <div className="lg:hidden sticky top-0 z-40 h-14 bg-[#1A1A1A] text-white flex items-center px-3 gap-2 border-b border-black">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-white/10" aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#5B8DEF]/20 border border-[#5B8DEF]/40 flex items-center justify-center">
            <Sparkles size={13} className="text-[#5B8DEF]" />
          </div>
          <span className="text-sm font-semibold truncate">{site?.name || "Store"}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="bg-white/10 rounded-full">
            <NotificationBell compact />
          </div>
          {site?.subdomain && (
            <a
              href={`https://${site.subdomain}.storebuilder.ph`}
              target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-white/10"
              aria-label="View store"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* ── Desktop floating notification bell (top-right) ── */}
      <div className="hidden lg:flex fixed top-4 right-6 z-40 items-center gap-2">
        <div className="bg-white border border-gray-200 rounded-full px-1 py-0.5 shadow-sm">
          <NotificationBell />
        </div>
      </div>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-[#1A1A1A] text-white z-50 lg:hidden flex flex-col">
            <SidebarBody site={site} base={base} pathname={pathname} onItemClick={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/10">
              <X size={16} />
            </button>
          </aside>
        </>
      )}

      {/* ── Sidebar (desktop, fixed) ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 bg-[#1A1A1A] text-white z-30 flex-col">
        <SidebarBody site={site} base={base} pathname={pathname} />
      </aside>

      {/* ── Main content ── */}
      <main className="lg:ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function SidebarBody({ site, base, pathname, onItemClick }: {
  site: SiteHeader | null;
  base: string;
  pathname: string;
  onItemClick?: () => void;
}) {
  function isActive(href: string) {
    const full = `${base}${href}`;
    if (href === "") return pathname === full || pathname === full + "/";
    return pathname === full || pathname.startsWith(full + "/");
  }

  return (
    <>
      {/* Brand row */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[#5B8DEF]/20 border border-[#5B8DEF]/40 flex items-center justify-center shrink-0">
          <Sparkles size={14} className="text-[#5B8DEF]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight truncate">{site?.name || "Store"}</p>
          <p className="text-[10px] text-white/50 truncate">{site?.subdomain ? `${site.subdomain}.storebuilder.ph` : "—"}</p>
        </div>
      </div>

      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        onClick={onItemClick}
        className="mx-3 mt-3 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
      >
        <ArrowLeft size={12} /> All websites
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${base}${href}`}
              onClick={onItemClick}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                active
                  ? "bg-white/12 text-white font-medium"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={14} className={active ? "text-white" : "text-white/55"} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-white/40" />}
            </Link>
          );
        })}
      </nav>

      {/* View store + plan footer */}
      <div className="px-3 py-3 border-t border-white/10 flex flex-col gap-2">
        {site?.subdomain && site.published && (
          <a
            href={`https://${site.subdomain}.storebuilder.ph`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={12} /> View live store
          </a>
        )}
        <div className="px-2.5 py-1.5 rounded-md bg-white/5">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Plan</p>
          <p className="text-[11px] font-semibold text-white">Enterprise</p>
        </div>
      </div>
    </>
  );
}

// Page header used by every manage page — title, optional subtitle, and a
// trailing actions slot. Keeps the visual rhythm consistent.
export function PageHeader({
  title, subtitle, actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-[20px] sm:text-[22px] font-bold text-[#1A1A1A] leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#6B7280] mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// Toolbar input used in list pages (orders/products/customers).
export function ListSearch({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 sm:max-w-sm">
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search…"}
        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-[#1A1A1A] transition-colors"
      />
    </div>
  );
}

export const pesos = (cents: number) =>
  "₱" + (cents / 100).toLocaleString("en-PH", { maximumFractionDigits: 2 });

export const fmtDate = (d: Date | string) => new Date(d).toLocaleString("en-PH", {
  timeZone: "Asia/Manila",
  month: "short", day: "numeric", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});

export const fmtDateOnly = (d: Date | string) => new Date(d).toLocaleDateString("en-PH", {
  timeZone: "Asia/Manila",
  month: "short", day: "numeric", year: "numeric",
});
