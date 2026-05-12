"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { TrendingUp, ShoppingBag, Users, Eye } from "lucide-react";
import { PageHeader, pesos } from "@/components/manage/ManageShell";

type ManageData = {
  overview: {
    revenueCents: number;
    orderCount: number;
    paidOrderCount: number;
    customerCount: number;
    visits30d: number;
    dayBuckets: { date: string; visits: number; orders: number }[];
    topReferrers: { host: string; count: number }[];
  };
  orders: any[];
  customers: any[];
};

export default function AnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [id]);

  const avgOrder = useMemo(() => {
    if (!data) return 0;
    const o = data.overview;
    return o.paidOrderCount > 0 ? o.revenueCents / o.paidOrderCount : 0;
  }, [data]);

  // Conversion = paid orders ÷ visitors over the last 30 days.
  const conversion = useMemo(() => {
    if (!data || data.overview.visits30d === 0) return 0;
    return (data.overview.paidOrderCount / data.overview.visits30d) * 100;
  }, [data]);

  if (loading || !data) {
    return <div className="px-4 sm:px-8 py-10 max-w-7xl mx-auto text-[13px] text-gray-400">Loading analytics…</div>;
  }

  const o = data.overview;
  const peak = Math.max(1, ...o.dayBuckets.map((b) => b.visits));

  // Daily revenue series from paid orders
  const revBuckets = (() => {
    const map: Record<string, number> = {};
    for (const ord of data.orders as any[]) {
      if (ord.status !== "PAID") continue;
      const d = new Date(ord.paidAt || ord.createdAt).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + ord.totalCents;
    }
    return o.dayBuckets.map((b) => ({ date: b.date, revenueCents: map[b.date] || 0 }));
  })();
  const peakRev = Math.max(1, ...revBuckets.map((b) => b.revenueCents));

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader title="Analytics" subtitle="Sales, traffic, and conversion across the last 30 days." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <KPI label="Total revenue" value={pesos(o.revenueCents)} Icon={TrendingUp} />
        <KPI label="Paid orders" value={o.paidOrderCount.toLocaleString()} Icon={ShoppingBag} />
        <KPI label="Avg. order value" value={pesos(avgOrder)} Icon={TrendingUp} />
        <KPI label="Conversion rate" value={conversion.toFixed(2) + "%"} Icon={Users} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
        {/* Revenue chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">Revenue</h2>
          <p className="text-[11px] text-gray-500 mb-4">Last 7 days · Paid orders only</p>
          <div className="flex items-end gap-2 h-32 sm:h-40">
            {revBuckets.map((b) => {
              const h = Math.max(2, (b.revenueCents / peakRev) * 100);
              return (
                <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-[#1A1A1A] h-full max-h-full" style={{ height: `${h}%` }} title={pesos(b.revenueCents)} />
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">
                    {new Date(b.date).toLocaleDateString("en-PH", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visits chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">Visits</h2>
          <p className="text-[11px] text-gray-500 mb-4">Last 7 days</p>
          <div className="flex items-end gap-2 h-32 sm:h-40">
            {o.dayBuckets.map((b) => {
              const h = Math.max(2, (b.visits / peak) * 100);
              return (
                <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-gray-300" style={{ height: `${h}%` }} title={`${b.visits} visits`} />
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">
                    {new Date(b.date).toLocaleDateString("en-PH", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">Top referrers</h2>
          <p className="text-[11px] text-gray-500 mb-4">Where your traffic comes from</p>
          {o.topReferrers.length === 0 ? (
            <p className="text-[12px] text-gray-400">No referrer data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {o.topReferrers.map((r) => {
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

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">Top customers</h2>
          <p className="text-[11px] text-gray-500 mb-4">By total spend</p>
          {data.customers.length === 0 ? (
            <p className="text-[12px] text-gray-400">No customer data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {[...data.customers]
                .sort((a: any, b: any) => b.totalSpentCents - a.totalSpentCents)
                .slice(0, 6)
                .map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-[12px]">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-[#1A1A1A] truncate">{c.name || c.email}</p>
                      <p className="text-[11px] text-gray-400">{c.orderCount} orders</p>
                    </div>
                    <p className="font-mono font-semibold text-[#1A1A1A] tabular-nums">{pesos(c.totalSpentCents)}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, Icon }: { label: string; value: string; Icon: any }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <Icon size={14} className="text-gray-300" />
      </div>
      <p className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] leading-none tracking-tight tabular-nums">{value}</p>
    </div>
  );
}
