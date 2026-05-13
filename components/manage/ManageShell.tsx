"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home, ShoppingBag, Package, Users, Megaphone, Tag,
  BarChart3, Settings, ExternalLink, ArrowLeft, ChevronRight,
  Menu, X, Search, Store, Briefcase, Inbox, Image as ImageIcon,
  FileText, MessageSquare,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

// Two-column management shell — blue & white branded, fixed left nav, scrollable
// main content. Every /dashboard/sites/[id]/manage/* page renders inside this
// layout via the layout.tsx file. The nav is customised per website type so a
// Portfolio gets project/inquiry-focused tools and a Store gets commerce tools.

export type SiteHeader = {
  id: string;
  name: string;
  subdomain: string | null;
  published: boolean;
  type?: string | null;
};

type NavItem = { href: string; label: string; Icon: any };

// Nav builder — different website types see different tools so the management
// console matches what the site actually does. Inbox/Customers/Analytics/
// Settings/Marketing are shared across every type.
function navForType(type: string | null | undefined): NavItem[] {
  const t = (type || "").toUpperCase();

  if (t === "PORTFOLIO") {
    return [
      { href: "",            label: "Overview",   Icon: Home },
      { href: "/inbox",      label: "Inbox",      Icon: Inbox },
      { href: "/customers",  label: "Contacts",   Icon: Users },
      { href: "/products",   label: "Projects",   Icon: Briefcase },
      { href: "/marketing",  label: "Marketing",  Icon: Megaphone },
      { href: "/analytics",  label: "Analytics",  Icon: BarChart3 },
      { href: "/settings",   label: "Settings",   Icon: Settings },
    ];
  }

  if (t === "BUSINESS" || t === "LANDING" || t === "PERSONAL") {
    return [
      { href: "",            label: "Overview",   Icon: Home },
      { href: "/inbox",      label: "Inbox",      Icon: Inbox },
      { href: "/customers",  label: "Leads",      Icon: Users },
      { href: "/marketing",  label: "Marketing",  Icon: Megaphone },
      { href: "/analytics",  label: "Analytics",  Icon: BarChart3 },
      { href: "/settings",   label: "Settings",   Icon: Settings },
    ];
  }

  // STORE / RESTAURANT / SALON / default → full commerce nav
  return [
    { href: "",            label: "Home",       Icon: Home },
    { href: "/orders",     label: "Orders",     Icon: ShoppingBag },
    { href: "/products",   label: "Products",   Icon: Package },
    { href: "/customers",  label: "Customers",  Icon: Users },
    { href: "/inbox",      label: "Inbox",      Icon: Inbox },
    { href: "/marketing",  label: "Marketing",  Icon: Megaphone },
    { href: "/discounts",  label: "Discounts",  Icon: Tag },
    { href: "/analytics",  label: "Analytics",  Icon: BarChart3 },
    { href: "/settings",   label: "Settings",   Icon: Settings },
  ];
}

// Friendly label for the brand row — e.g. "Portfolio" vs "Store" — so the
// console reads like a tool for that specific kind of site.
function typeLabel(type: string | null | undefined): string {
  const t = (type || "").toUpperCase();
  if (t === "PORTFOLIO") return "Portfolio";
  if (t === "BUSINESS") return "Business";
  if (t === "LANDING") return "Landing";
  if (t === "PERSONAL") return "Personal";
  if (t === "RESTAURANT") return "Restaurant";
  if (t === "SALON") return "Salon";
  if (t === "STORE") return "Store";
  return "Site";
}

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
    <div className="min-h-screen bg-[#F5F8FF]" style={{ fontFamily: "'Inter', 'Google Sans', system-ui, -apple-system, sans-serif" }}>
      {/* ── Top bar (mobile) — blue header to match brand ── */}
      <div className="lg:hidden sticky top-0 z-40 h-14 bg-white text-[#0F172A] flex items-center px-3 gap-2 border-b border-[#E0E7FF]">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-[#EFF4FF] text-[#1877F2]" aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#1877F2] flex items-center justify-center">
            <Store size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold truncate text-[#0F172A]">{site?.name || typeLabel(site?.type)}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell compact />
          {site?.subdomain && (
            <a
              href={`https://${site.subdomain}.storebuilder.ph`}
              target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-md hover:bg-[#EFF4FF] text-[#1877F2]"
              aria-label="View live site"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* ── Desktop floating notification bell (top-right) ── */}
      <div className="hidden lg:flex fixed top-4 right-6 z-40 items-center gap-2">
        <div className="bg-white border border-[#E0E7FF] rounded-full px-1 py-0.5 shadow-sm">
          <NotificationBell />
        </div>
      </div>

      {/* ── Sidebar (mobile drawer) — white with blue accents ── */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-[#0F172A]/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white text-[#0F172A] z-50 lg:hidden flex flex-col border-r border-[#E0E7FF]">
            <SidebarBody site={site} base={base} pathname={pathname} onItemClick={() => setMobileOpen(false)} />
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[#EFF4FF] text-[#1877F2]">
              <X size={16} />
            </button>
          </aside>
        </>
      )}

      {/* ── Sidebar (desktop, fixed) — clean white w/ blue rail ── */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-60 bg-white text-[#0F172A] z-30 flex-col border-r border-[#E0E7FF]">
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

  const nav = navForType(site?.type);
  const label = typeLabel(site?.type);

  return (
    <>
      {/* Brand row */}
      <div className="px-4 py-4 border-b border-[#E0E7FF] flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#1877F2] flex items-center justify-center shrink-0">
          <Store size={16} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight truncate text-[#0F172A]">{site?.name || label}</p>
          <p className="text-[10px] text-[#64748B] truncate">{site?.subdomain ? `${site.subdomain}.storebuilder.ph` : label + " tools"}</p>
        </div>
      </div>

      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        onClick={onItemClick}
        className="mx-3 mt-3 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-[#64748B] hover:text-[#1877F2] hover:bg-[#EFF4FF] transition-colors"
      >
        <ArrowLeft size={12} /> All websites
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5">
        {nav.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={`${base}${href}`}
              onClick={onItemClick}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors ${
                active
                  ? "bg-[#1877F2] text-white font-semibold"
                  : "text-[#475569] hover:bg-[#EFF4FF] hover:text-[#1877F2]"
              }`}
            >
              <Icon size={14} className={active ? "text-white" : "text-[#64748B]"} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-white/80" />}
            </Link>
          );
        })}
      </nav>

      {/* View live + plan footer */}
      <div className="px-3 py-3 border-t border-[#E0E7FF] flex flex-col gap-2 bg-[#F8FAFF]">
        {site?.subdomain && site.published && (
          <a
            href={`https://${site.subdomain}.storebuilder.ph`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] text-[#1877F2] hover:bg-[#EFF4FF] font-medium transition-colors"
          >
            <ExternalLink size={12} /> View live site
          </a>
        )}
        <div className="px-2.5 py-1.5 rounded-md bg-white border border-[#E0E7FF]">
          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Plan</p>
          <p className="text-[11px] font-semibold text-[#1877F2]">Enterprise</p>
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
        <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#64748B] mt-1">{subtitle}</p>}
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
