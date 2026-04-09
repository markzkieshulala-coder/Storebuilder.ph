"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Globe,
  ArrowLeft,
  Shield,
} from "lucide-react";

const BLUE = "#1877F2";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/websites", label: "Websites", icon: Globe },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
      style={{ background: "#0F172A" }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Storebuilder.ph" width={26} height={26} />
          <span className="font-bold text-white text-sm">
            Storebuilder<span style={{ color: "#60a5fa" }}>.ph</span>
          </span>
        </Link>
        <div
          className="flex items-center gap-1.5 mt-2.5 px-2 py-1 rounded-md w-fit"
          style={{ background: "rgba(245,158,11,0.12)" }}
        >
          <Shield size={10} style={{ color: "#F59E0B" }} />
          <span className="text-xs font-bold" style={{ color: "#F59E0B" }}>
            ADMIN PANEL
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                isActive
                  ? { background: BLUE, color: "#fff" }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
      </div>
    </aside>
  );
}
