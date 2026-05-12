"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, ShoppingBag, Users, Package, Mail, BarChart3, Eye,
  ArrowUpRight, Plus, ChevronRight, AlertCircle,
} from "lucide-react";
import { PageHeader, pesos, fmtDate } from "@/components/manage/ManageShell";

type ManageData = {
  website: { id: string; name: string; subdomain: string | null; published: boolean };
  overview: {
    revenueCents: number;
    orderCount: number;
    paidOrderCount: number;
    pendingOrderCount: number;
    customerCount: number;
    subscriberCount: number;
    contactCount: number;
    visits30d: number;
    dayBuckets: { date: string; visits: number; orders: number }[];
    topReferrers: { host: string; count: number }[];
  };
  orders: any[];
  customers: any[];
  contacts: any[];
};

export default function ManageHomePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch((e) => setError(e.message));
    fetch(`/api/sites/${id}/manage/products`)
      .then((r) => r.json())
      .then((d) => setProductCount(Array.isArray(d.products) ? d.products.length : 0))
      .catch(() => setProductCount(0));
  }, [id]);

  if (error) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-7xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-gray-200" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-xl border border-gray-200" />
        </div>
      </div>
    );
  }

  const o = data.overview;
  const peak = Math.max(1, ...o.dayBuckets.map((b) => b.visits));
  const avgOrder = o.paidOrderCount > 0 ? o.revenueCents / o.paidOrderCount : 0;

  const kpis = [
    { label: "Total sales", value: pesos(o.revenueCents), sub: `${o.paidOrderCount} paid orders`, Icon: TrendingUp },
    { label: "Orders", value: o.orderCount.toLocaleString(), sub: `${o.pendingOrderCount} pending`, Icon: ShoppingBag },
    { label: "Customers", value: o.customerCount.toLocaleString(), sub: `${o.subscriberCount} subscribers`, Icon: Users },
    { label: "Visitors (30d)", value: o.visits30d.toLocaleString(), sub: `${o.contactCount} contact messages`, Icon: Eye },
  ];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title={`Welcome back, ${data.website.name}`}
        subtitle="Here's what's happening across your store today."
        actions={
          <Link href={`/dashboard/sites/${id}/manage/products`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black transition-colors">
            <Plus size={13} /> Add product
          </Link>
        }
      />

      {!data.website.published && (
        <div className="mb-5 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] p-3.5 text-[13px] text-[#92400E] flex items-center gap-2.5">
          <AlertCircle size={15} className="shrink-0" />
          <span>Your store is not published yet — publish it from the website editor so customers can buy.</span>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{k.label}</p>
              <k.Icon size={14} className="text-gray-300" />
            </div>
            <p className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] leading-none tracking-tight">{k.value}</p>
            <p className="text-[11px] text-gray-500 mt-2">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Sales chart + Top referrers */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5 mb-5 sm:mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Visits & orders</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Last 7 days</p>
            </div>
            <Link href={`/dashboard/sites/${id}/manage/analytics`} className="text-[12px] font-medium text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1">
              Open analytics <ArrowUpRight size={11} />
            </Link>
          </div>
          <div className="flex items-end gap-1.5 sm:gap-3 h-32 sm:h-40 mt-2">
            {o.dayBuckets.map((b) => {
              const visitH = Math.max(2, (b.visits / peak) * 100);
              const orderH = Math.max(0, (b.orders / Math.max(1, peak)) * 100);
              return (
                <div key={b.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex flex-col items-stretch h-full justify-end gap-0.5">
                    {b.orders > 0 && (
                      <div className="w-full rounded-t bg-[#1A1A1A]" style={{ height: `${orderH}%` }} title={`${b.orders} orders`} />
                    )}
                    <div className="w-full rounded-t bg-gray-200 group-hover:bg-gray-300 transition-colors" style={{ height: `${visitH}%` }} title={`${b.visits} visits`} />
                  </div>
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">
                    {new Date(b.date).toLocaleDateString("en-PH", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-200" /> Visits</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#1A1A1A]" /> Orders</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">Top referrers</h2>
          <p className="text-[11px] text-gray-500 mb-4">Where your traffic comes from</p>
          {o.topReferrers.length === 0 ? (
            <p className="text-[12px] text-gray-400">No referrer data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {o.topReferrers.slice(0, 6).map((r) => {
                const max = Math.max(...o.topReferrers.map((x) => x.count));
                const pct = Math.max(4, (r.count / max) * 100);
                return (
                  <div key={r.host}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="text-[#1A1A1A] truncate pr-2 font-medium">{r.host}</span>
                      <span className="text-gray-500 tabular-nums">{r.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-[#1A1A1A]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent orders + Quick stats */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Recent orders</h2>
            <Link href={`/dashboard/sites/${id}/manage/orders`} className="text-[12px] font-medium text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {data.orders.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <ShoppingBag size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-[13px] text-gray-500">No orders yet</p>
              <p className="text-[11px] text-gray-400 mt-1">Orders appear here when customers check out from your store.</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left font-semibold px-4 sm:px-5 py-2.5">Order</th>
                  <th className="text-left font-semibold px-2 py-2.5">Customer</th>
                  <th className="text-right font-semibold px-2 py-2.5">Total</th>
                  <th className="text-right font-semibold px-4 sm:px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.slice(0, 8).map((o) => (
                  <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 sm:px-5 py-3">
                      <Link href={`/dashboard/sites/${id}/manage/orders/${o.id}`} className="font-medium text-[#1A1A1A] hover:underline">
                        #{o.id.slice(-6).toUpperCase()}
                      </Link>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(o.createdAt)}</p>
                    </td>
                    <td className="px-2 py-3 text-gray-700 truncate max-w-[160px]">{o.customerName || o.customerEmail || "—"}</td>
                    <td className="px-2 py-3 text-right font-mono text-[#1A1A1A]">{pesos(o.totalCents)}</td>
                    <td className="px-4 sm:px-5 py-3 text-right"><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">Quick stats</h2>
          <div className="space-y-3">
            <Stat label="Average order value" value={pesos(avgOrder)} />
            <Stat label="Products in catalog" value={productCount == null ? "—" : productCount.toLocaleString()} />
            <Stat label="Newsletter subscribers" value={o.subscriberCount.toLocaleString()} />
            <Stat label="Contact messages" value={o.contactCount.toLocaleString()} />
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Shortcuts</p>
            <div className="space-y-1">
              <ShortcutLink href={`/dashboard/sites/${id}/manage/products`} label="Manage products" Icon={Package} />
              <ShortcutLink href={`/dashboard/sites/${id}/manage/discounts`} label="Create a discount" Icon={ChevronRight} />
              <ShortcutLink href={`/dashboard/sites/${id}/manage/marketing`} label="Email subscribers" Icon={Mail} />
              <ShortcutLink href={`/dashboard/sites/${id}/manage/settings`} label="Store settings" Icon={BarChart3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-[#1A1A1A] tabular-nums">{value}</span>
    </div>
  );
}

function ShortcutLink({ href, label, Icon }: { href: string; label: string; Icon: any }) {
  return (
    <Link href={href} className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-md text-[12px] text-gray-600 hover:text-[#1A1A1A] hover:bg-gray-50 transition-colors">
      <Icon size={12} />
      <span>{label}</span>
      <ChevronRight size={11} className="ml-auto text-gray-300" />
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    PAID:      { bg: "#D1FAE5", fg: "#065F46" },
    PENDING:   { bg: "#FEF3C7", fg: "#92400E" },
    CANCELLED: { bg: "#FEE2E2", fg: "#991B1B" },
    REFUNDED:  { bg: "#E0E7FF", fg: "#3730A3" },
  };
  const c = map[status] || { bg: "#F3F4F6", fg: "#6B7280" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}
