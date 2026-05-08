"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShoppingBag, Users, MessageSquare, Mail,
  BarChart3, Settings, ExternalLink, Crown, CheckCircle2, XCircle,
  Eye, EyeOff, Trash2, Search, Download, Pencil, X, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

const FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";
const BLUE = "#1877F2";

type ManageData = {
  website: { id: string; name: string; type?: string; subdomain: string | null; published: boolean };
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
  subscribers: any[];
};

type Tab = "overview" | "orders" | "customers" | "marketing" | "analytics" | "settings";

const ALL_TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "orders", label: "Orders", icon: ShoppingBag },
  { key: "customers", label: "Customers", icon: Users },
  { key: "marketing", label: "Marketing", icon: Mail },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

// Sites that don't sell products (portfolio, landing) hide the Orders tab and
// rename Customers/Marketing to fit lead-tracking semantics.
function tabsForType(type: string | undefined): { key: Tab; label: string; icon: any }[] {
  const t = (type || "").toUpperCase();
  if (t === "PORTFOLIO" || t === "LANDING") {
    return [
      { key: "overview", label: "Overview", icon: BarChart3 },
      { key: "customers", label: "Clients", icon: Users },
      { key: "marketing", label: "Inquiries", icon: Mail },
      { key: "analytics", label: "Visitors", icon: BarChart3 },
      { key: "settings", label: "Settings", icon: Settings },
    ];
  }
  if (t === "STORE" || t === "RESTAURANT") {
    return ALL_TABS;
  }
  // BUSINESS / SALON / fallback — keep CRM-style flow but allow orders if any
  return [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "customers", label: "Customers", icon: Users },
    { key: "marketing", label: "Inquiries", icon: Mail },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: Settings },
  ];
}

function pesos(cents: number) {
  return "₱" + (cents / 100).toLocaleString("en-PH", { maximumFractionDigits: 2 });
}

export default function ManageStorePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ msg: string; needsPlan?: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${params.id}/manage`);
      const json = await res.json();
      if (!res.ok) {
        setError({
          msg: json.message || json.error || "Failed to load",
          needsPlan: json.error === "PLAN_REQUIRED",
        });
        return;
      }
      setData(json);
      setError(null);
    } catch (e: any) {
      setError({ msg: e?.message || "Network error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]" style={{ fontFamily: FONT }}>
        <div className="text-sm text-gray-500">Loading store dashboard…</div>
      </div>
    );
  }

  if (error?.needsPlan) {
    return <UpgradeWall onBack={() => router.push("/dashboard")} />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5]" style={{ fontFamily: FONT }}>
        <div className="text-sm text-red-600 mb-3">{error?.msg || "Could not load"}</div>
        <Link href="/dashboard" className="text-sm text-[#1877F2]">← Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]" style={{ fontFamily: FONT }}>
      {/* Header */}
      <header className="bg-white border-b border-[#E4E6EB] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1C1E21] truncate">{data.website.name}</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: "#FEF3C7", color: "#B45309" }}>
                <Crown size={9} /> Enterprise
              </span>
            </div>
            <div className="text-xs text-[#8A8D91] truncate">{(() => {
              const t = (data.website.type || "").toUpperCase();
              if (t === "PORTFOLIO") return "Portfolio management";
              if (t === "RESTAURANT") return "Restaurant management";
              if (t === "SALON") return "Salon management";
              if (t === "STORE") return "Store management";
              if (t === "LANDING") return "Landing page management";
              return "Business management";
            })()}</div>
          </div>
          {data.website.subdomain && data.website.published && (
            <a
              href={`https://${data.website.subdomain}.storebuilder.ph`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50"
            >
              <ExternalLink size={12} /> View live
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="border-t border-[#E4E6EB] overflow-x-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 flex gap-1">
            {tabsForType(data.website.type).map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active ? "border-[#1877F2] text-[#1877F2]" : "border-transparent text-[#65676B] hover:text-[#1C1E21]"
                  }`}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "overview" && <OverviewTab data={data} onTabChange={setTab} />}
        {tab === "orders" && <OrdersTab data={data} reload={load} />}
        {tab === "customers" && <CustomersTab data={data} reload={load} />}
        {tab === "marketing" && <MarketingTab data={data} reload={load} />}
        {tab === "analytics" && <AnalyticsTab data={data} />}
        {tab === "settings" && <SettingsTab data={data} />}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* UPGRADE WALL                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function UpgradeWall({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f2f5] via-white to-amber-50 px-4" style={{ fontFamily: FONT }}>
      <div className="max-w-md w-full bg-white border border-[#E4E6EB] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#FEF3C7" }}>
          <Crown size={22} color="#B45309" />
        </div>
        <h1 className="text-xl font-bold text-[#1C1E21] mb-2">Enterprise feature</h1>
        <p className="text-sm text-[#65676B] leading-relaxed mb-5">
          The store management dashboard — orders, customers, marketing, analytics — is exclusive to the Enterprise plan.
        </p>
        <ul className="space-y-2 mb-6">
          {[
            "CRM & customer database",
            "Order management",
            "Marketing dashboard (newsletter, leads)",
            "Sales analytics & traffic insights",
            "Store settings & business tools",
          ].map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-[#1C1E21]">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "#1877F2" }} /> {f}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50">
            Back
          </button>
          <Link
            href="/pricing"
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: BLUE }}
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* OVERVIEW                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function OverviewTab({ data, onTabChange }: { data: ManageData; onTabChange: (t: Tab) => void }) {
  const o = data.overview;
  const siteType = (data.website.type || "").toUpperCase();
  const isStore = siteType === "STORE" || siteType === "RESTAURANT";
  const isPortfolio = siteType === "PORTFOLIO" || siteType === "LANDING";
  const peakVisits = Math.max(1, ...o.dayBuckets.map((b) => b.visits));

  const cards = isStore ? [
    { label: "Revenue (paid)", value: pesos(o.revenueCents), sub: `${o.paidOrderCount} paid`, color: "#10B981", tab: "orders" as Tab },
    { label: "Orders", value: o.orderCount, sub: `${o.pendingOrderCount} pending`, color: "#1877F2", tab: "orders" as Tab },
    { label: "Customers", value: o.customerCount, sub: "in CRM", color: "#8B5CF6", tab: "customers" as Tab },
    { label: "Subscribers", value: o.subscriberCount, sub: "newsletter", color: "#F59E0B", tab: "marketing" as Tab },
    { label: "Visits (30d)", value: o.visits30d.toLocaleString("en-PH"), sub: "page views", color: "#EC4899", tab: "analytics" as Tab },
    { label: "Messages", value: o.contactCount, sub: "contact form", color: "#06B6D4", tab: "marketing" as Tab },
  ] : isPortfolio ? [
    { label: "Visitors (30d)", value: o.visits30d.toLocaleString("en-PH"), sub: "page views", color: "#1877F2", tab: "analytics" as Tab },
    { label: "Inquiries", value: o.contactCount, sub: "contact form", color: "#8B5CF6", tab: "marketing" as Tab },
    { label: "Clients", value: o.customerCount, sub: "in database", color: "#10B981", tab: "customers" as Tab },
    { label: "Subscribers", value: o.subscriberCount, sub: "newsletter", color: "#F59E0B", tab: "marketing" as Tab },
  ] : [
    { label: "Visitors (30d)", value: o.visits30d.toLocaleString("en-PH"), sub: "page views", color: "#1877F2", tab: "analytics" as Tab },
    { label: "Leads", value: o.contactCount, sub: "inquiries received", color: "#8B5CF6", tab: "marketing" as Tab },
    { label: "Customers", value: o.customerCount, sub: "in CRM", color: "#10B981", tab: "customers" as Tab },
    { label: "Subscribers", value: o.subscriberCount, sub: "newsletter", color: "#F59E0B", tab: "marketing" as Tab },
  ];

  const gridCols = cards.length === 6
    ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
    : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-6">
      <div className={`grid ${gridCols} gap-3`}>
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => onTabChange(c.tab)}
            className="text-left bg-white border border-[#E4E6EB] rounded-2xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="text-xs font-medium text-[#65676B] mb-1.5">{c.label}</div>
            <div className="text-xl font-bold text-[#1C1E21]" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[11px] text-[#8A8D91] mt-0.5">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-day visits trend */}
        <div className="bg-white border border-[#E4E6EB] rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#1C1E21]">Last 7 days</h2>
            <span className="text-xs text-[#65676B]">{isStore ? "visits & orders" : "page views"}</span>
          </div>
          <div className="flex items-end gap-2 h-40">
            {o.dayBuckets.map((b) => (
              <div key={b.date} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full flex flex-col items-center gap-0.5">
                  {isStore && b.orders > 0 && (
                    <div
                      className="w-full rounded-t-md"
                      style={{ background: "#1877F2", height: `${Math.max(4, (b.orders / Math.max(1, peakVisits)) * 140)}px` }}
                      title={`${b.orders} orders`}
                    />
                  )}
                  <div
                    className="w-full rounded-t-md"
                    style={{ background: "#1877F222", height: `${Math.max(2, (b.visits / peakVisits) * 140)}px` }}
                    title={`${b.visits} visits`}
                  />
                </div>
                <div className="text-[10px] text-[#8A8D91] mt-1.5">{b.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top referrers */}
        <div className="bg-white border border-[#E4E6EB] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#1C1E21] mb-3">Top referrers</h2>
          {o.topReferrers.length === 0 ? (
            <div className="text-xs text-[#8A8D91]">No referrer data yet — visits with a referrer will appear here.</div>
          ) : (
            <ul className="space-y-2">
              {o.topReferrers.map((r) => (
                <li key={r.host} className="flex items-center justify-between text-xs">
                  <span className="text-[#1C1E21] truncate">{r.host}</span>
                  <span className="font-semibold text-[#1877F2]">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ORDERS                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
function OrdersTab({ data, reload }: { data: ManageData; reload: () => void }) {
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return data.orders.filter((o) => {
      if (filter === "pending" && o.status !== "PENDING") return false;
      if (filter === "paid" && o.status !== "PAID") return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          (o.productName || "").toLowerCase().includes(s) ||
          (o.customerName || "").toLowerCase().includes(s) ||
          (o.customerEmail || "").toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [data.orders, filter, q]);

  async function update(orderId: string, body: any) {
    const res = await fetch(`/api/sites/${data.website.id}/manage/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error("Could not update order");
      return;
    }
    toast.success("Updated");
    reload();
  }
  async function remove(orderId: string) {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    const res = await fetch(`/api/sites/${data.website.id}/manage/orders/${orderId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Could not delete"); return; }
    toast.success("Order deleted");
    reload();
  }

  function exportCsv() {
    const rows = [
      ["Date", "Product", "Qty", "Total", "Customer", "Email", "Phone", "Status"],
      ...filtered.map((o) => [
        new Date(o.createdAt).toISOString(),
        o.productName,
        o.quantity,
        (o.totalCents / 100).toFixed(2),
        o.customerName || "",
        o.customerEmail || "",
        o.customerPhone || "",
        o.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${data.website.subdomain || "store"}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-[#E4E6EB] rounded-2xl">
      <div className="p-4 border-b border-[#E4E6EB] flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-base font-bold text-[#1C1E21] flex-1">
          Orders <span className="text-[#8A8D91] font-normal">({filtered.length})</span>
        </h2>
        <div className="flex gap-2">
          {(["all", "pending", "paid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-[#1877F2] text-white" : "border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50"}`}
            >
              {f === "all" ? "All" : f === "pending" ? "Pending" : "Paid"}
            </button>
          ))}
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50">
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-[#E4E6EB]">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by product, customer name or email…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E6EB] text-sm outline-none focus:border-[#1877F2]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 text-center text-sm text-[#8A8D91]">
          No orders yet. Once customers checkout from your published site, they&apos;ll appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-[#65676B]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Product</th>
                <th className="text-left px-4 py-2 font-medium">Customer</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-[#E4E6EB] hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-[#65676B] whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1C1E21]">{o.productName}</div>
                    <div className="text-[11px] text-[#8A8D91]">Qty {o.quantity}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#1C1E21] truncate max-w-[180px]">{o.customerName || <span className="text-[#8A8D91]">—</span>}</div>
                    <div className="text-[11px] text-[#8A8D91] truncate max-w-[180px]">{o.customerEmail || ""}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#1C1E21]">{pesos(o.totalCents)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {o.status === "PENDING" && (
                        <button
                          onClick={() => update(o.id, { status: "PAID" })}
                          title="Mark as paid"
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {o.status === "PAID" && (
                        <button
                          onClick={() => update(o.id, { status: "REFUNDED" })}
                          title="Mark as refunded"
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => remove(o.id)}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: "#FEF3C7", color: "#B45309" },
    PAID: { bg: "#D1FAE5", color: "#047857" },
    CANCELLED: { bg: "#FEE2E2", color: "#B91C1C" },
    REFUNDED: { bg: "#E0E7FF", color: "#3730A3" },
  };
  const s = map[status] || map.PENDING;
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CUSTOMERS                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function CustomersTab({ data, reload }: { data: ManageData; reload: () => void }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);

  const filtered = useMemo(() => {
    if (!q) return data.customers;
    const s = q.toLowerCase();
    return data.customers.filter((c) =>
      (c.email || "").toLowerCase().includes(s) ||
      (c.name || "").toLowerCase().includes(s) ||
      (c.tags || "").toLowerCase().includes(s)
    );
  }, [data.customers, q]);

  async function remove(id: string) {
    if (!confirm("Delete this customer? Their order history is kept.")) return;
    const res = await fetch(`/api/sites/${data.website.id}/manage/customers/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Could not delete"); return; }
    toast.success("Customer removed");
    reload();
  }

  function exportCsv() {
    const rows = [
      ["Email", "Name", "Phone", "Orders", "Total spent (PHP)", "Tags", "First seen", "Last seen"],
      ...filtered.map((c) => [
        c.email,
        c.name || "",
        c.phone || "",
        c.orderCount,
        (c.totalSpentCents / 100).toFixed(2),
        c.tags || "",
        new Date(c.firstSeenAt).toISOString(),
        new Date(c.lastSeenAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customers-${data.website.subdomain || "store"}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="bg-white border border-[#E4E6EB] rounded-2xl">
        <div className="p-4 border-b border-[#E4E6EB] flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-base font-bold text-[#1C1E21] flex-1">
            Customers <span className="text-[#8A8D91] font-normal">({filtered.length})</span>
          </h2>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50 self-start sm:self-auto">
            <Download size={12} /> Export CSV
          </button>
        </div>
        <div className="px-4 py-3 border-b border-[#E4E6EB]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, email or tag…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E4E6EB] text-sm outline-none focus:border-[#1877F2]"
            />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#8A8D91]">
            No customers yet. Customers will be added automatically when they checkout, submit a contact form, or subscribe to your newsletter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-[#65676B]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Customer</th>
                  <th className="text-left px-4 py-2 font-medium">Tags</th>
                  <th className="text-right px-4 py-2 font-medium">Orders</th>
                  <th className="text-right px-4 py-2 font-medium">Spent</th>
                  <th className="text-left px-4 py-2 font-medium">Last seen</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-[#E4E6EB] hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1C1E21]">{c.name || c.email}</div>
                      <div className="text-[11px] text-[#8A8D91]">{c.email}</div>
                      {c.phone && <div className="text-[11px] text-[#8A8D91]">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {c.tags ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.split(",").map((t: string) => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: "#E0E7FF", color: "#3730A3" }}>
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[#8A8D91] text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[#1C1E21]">{c.orderCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#1C1E21]">{pesos(c.totalSpentCents)}</td>
                    <td className="px-4 py-3 text-xs text-[#65676B] whitespace-nowrap">
                      {new Date(c.lastSeenAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(c)} title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1877F2]">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => remove(c.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editing && (
        <CustomerEditModal
          customer={editing}
          siteId={data.website.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}

function CustomerEditModal({ customer, siteId, onClose, onSaved }: any) {
  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [tags, setTags] = useState(customer.tags || "");
  const [notes, setNotes] = useState(customer.notes || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/sites/${siteId}/manage/customers/${customer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, tags, notes }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Could not save"); return; }
    toast.success("Customer saved");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#1C1E21]">Edit customer</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[#65676B] mb-1 block">Email</label>
            <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-[#1C1E21]">{customer.email}</div>
          </div>
          {[
            { label: "Name", value: name, set: setName, placeholder: "Customer name" },
            { label: "Phone", value: phone, set: setPhone, placeholder: "+63…" },
            { label: "Tags (comma-separated)", value: tags, set: setTags, placeholder: "vip, repeat, lead" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-xs font-medium text-[#65676B] mb-1 block">{f.label}</label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg border border-[#E4E6EB] text-sm outline-none focus:border-[#1877F2]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-[#65676B] mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-[#E4E6EB] text-sm outline-none focus:border-[#1877F2] resize-none"
              placeholder="Internal notes about this customer…"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: BLUE }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* MARKETING                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function MarketingTab({ data, reload }: { data: ManageData; reload: () => void }) {
  const [sub, setSub] = useState<"contacts" | "subscribers">("contacts");

  async function toggleRead(contactId: string, read: boolean) {
    const res = await fetch(`/api/sites/${data.website.id}/manage/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    if (!res.ok) { toast.error("Could not update"); return; }
    reload();
  }
  async function deleteContact(contactId: string) {
    if (!confirm("Delete this message?")) return;
    const res = await fetch(`/api/sites/${data.website.id}/manage/contacts/${contactId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Could not delete"); return; }
    toast.success("Message deleted");
    reload();
  }

  function exportSubscribers() {
    const rows = [
      ["Email", "Name", "Source", "Subscribed at"],
      ...data.subscribers.map((s) => [s.email, s.name || "", s.source || "", new Date(s.createdAt).toISOString()]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subscribers-${data.website.subdomain || "store"}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["contacts", "subscribers"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${sub === s ? "bg-[#1877F2] text-white" : "bg-white border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50"}`}
          >
            {s === "contacts" ? `Contact messages (${data.contacts.length})` : `Newsletter subscribers (${data.subscribers.length})`}
          </button>
        ))}
      </div>

      {sub === "contacts" && (
        <div className="bg-white border border-[#E4E6EB] rounded-2xl divide-y divide-[#E4E6EB]">
          {data.contacts.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8A8D91]">
              No messages yet. Submissions from your contact form will appear here.
            </div>
          ) : (
            data.contacts.map((c) => (
              <div key={c.id} className={`p-4 ${c.read ? "" : "bg-blue-50/30"}`}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-[#1C1E21]">{c.name}</span>
                      {!c.read && <span className="w-2 h-2 rounded-full bg-[#1877F2]" />}
                    </div>
                    <a href={`mailto:${c.email}`} className="text-xs text-[#1877F2]">{c.email}</a>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-[#8A8D91] mr-2">
                      {new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => toggleRead(c.id, !c.read)}
                      title={c.read ? "Mark as unread" : "Mark as read"}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-[#65676B]"
                    >
                      {c.read ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      onClick={() => deleteContact(c.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[#1C1E21] whitespace-pre-line leading-relaxed">{c.message}</p>
              </div>
            ))
          )}
        </div>
      )}

      {sub === "subscribers" && (
        <div className="bg-white border border-[#E4E6EB] rounded-2xl">
          <div className="p-4 border-b border-[#E4E6EB] flex items-center justify-between">
            <span className="text-sm font-bold text-[#1C1E21]">{data.subscribers.length} subscribers</span>
            <button onClick={exportSubscribers} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E4E6EB] text-[#1C1E21] hover:bg-gray-50">
              <Download size={12} /> Export CSV
            </button>
          </div>
          {data.subscribers.length === 0 ? (
            <div className="p-12 text-center text-sm text-[#8A8D91]">
              No subscribers yet. Newsletter signups from your published site will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-[#65676B]">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Email</th>
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Source</th>
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscribers.map((s) => (
                    <tr key={s.id} className="border-t border-[#E4E6EB]">
                      <td className="px-4 py-3 font-medium text-[#1C1E21]">{s.email}</td>
                      <td className="px-4 py-3 text-[#65676B]">{s.name || "—"}</td>
                      <td className="px-4 py-3 text-[#65676B]">{s.source || "newsletter_section"}</td>
                      <td className="px-4 py-3 text-xs text-[#8A8D91]">{new Date(s.createdAt).toLocaleDateString("en-PH")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ANALYTICS                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
function AnalyticsTab({ data }: { data: ManageData }) {
  const o = data.overview;
  const siteType = (data.website.type || "").toUpperCase();
  const isStore = siteType === "STORE" || siteType === "RESTAURANT";
  const peakVisits = Math.max(1, ...o.dayBuckets.map((b) => b.visits));
  const conversionRate = o.visits30d > 0 ? ((o.paidOrderCount / o.visits30d) * 100).toFixed(2) : "0.00";
  const inquiryRate = o.visits30d > 0 ? ((o.contactCount / o.visits30d) * 100).toFixed(1) : "0.0";
  const subRate = o.visits30d > 0 ? ((o.subscriberCount / o.visits30d) * 100).toFixed(1) : "0.0";

  const statCards = isStore ? [
    { label: "Visits (30d)", value: o.visits30d.toLocaleString("en-PH") },
    { label: "Conversion rate", value: `${conversionRate}%` },
    { label: "Avg order", value: o.paidOrderCount > 0 ? pesos(Math.round(o.revenueCents / o.paidOrderCount)) : pesos(0) },
    { label: "Subscribers / 100 visits", value: subRate },
  ] : [
    { label: "Visits (30d)", value: o.visits30d.toLocaleString("en-PH") },
    { label: "Inquiry rate", value: `${inquiryRate}%` },
    { label: "Subscribers / 100 visits", value: subRate },
    { label: "Total inquiries", value: o.contactCount.toLocaleString("en-PH") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white border border-[#E4E6EB] rounded-2xl p-4">
            <div className="text-xs font-medium text-[#65676B] mb-1">{c.label}</div>
            <div className="text-xl font-bold text-[#1C1E21]">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E4E6EB] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1C1E21] mb-4">7-day traffic</h2>
        <div className="flex items-end gap-2 h-48">
          {o.dayBuckets.map((b) => (
            <div key={b.date} className="flex-1 flex flex-col items-center justify-end">
              <div className="text-[10px] text-[#65676B] mb-1">{b.visits}</div>
              <div className="w-full rounded-t-md transition-all" style={{ background: BLUE, height: `${Math.max(2, (b.visits / peakVisits) * 160)}px` }} />
              <div className="text-[10px] text-[#8A8D91] mt-1.5">{b.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#E4E6EB] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1C1E21] mb-3">Top referrers</h2>
        {o.topReferrers.length === 0 ? (
          <div className="text-sm text-[#8A8D91] py-6 text-center">
            Visits with a referrer URL will appear here. Most direct traffic and mobile-app clicks have no referrer.
          </div>
        ) : (
          <ul className="space-y-2">
            {o.topReferrers.map((r) => (
              <li key={r.host} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <span className="text-sm text-[#1C1E21]">{r.host}</span>
                <span className="font-semibold text-[#1877F2] text-sm">{r.count} visits</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SETTINGS                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
function SettingsTab({ data }: { data: ManageData }) {
  const items = [
    {
      title: "Edit site content",
      desc: "Open the visual editor to change products, prices, text, and images.",
      cta: "Open editor",
      href: `/editor/${data.website.id}`,
      icon: Pencil,
    },
    {
      title: "Site & payment settings",
      desc: "Toggle GCash, GrabPay, COD, and other payment methods inside the editor's site panel.",
      cta: "Open editor → Site",
      href: `/editor/${data.website.id}`,
      icon: Settings,
    },
    {
      title: "Custom domain",
      desc: "Connect your own .com domain (Enterprise & Pro). Configure DNS in account settings.",
      cta: "Account settings",
      href: "/dashboard/settings",
      icon: ExternalLink,
    },
    {
      title: "Account & billing",
      desc: "Manage your Enterprise plan, subscription, and billing.",
      cta: "Manage account",
      href: "/dashboard/settings",
      icon: Crown,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-amber-600" />
          <span className="text-sm font-bold text-[#1C1E21]">Enterprise store</span>
        </div>
        <p className="text-sm text-[#65676B]">
          Your store at <a href={data.website.subdomain ? `https://${data.website.subdomain}.storebuilder.ph` : "#"} className="text-[#1877F2] font-medium" target="_blank" rel="noopener noreferrer">
            {data.website.subdomain ? `${data.website.subdomain}.storebuilder.ph` : "(unpublished)"}
          </a> is using the full Enterprise feature set: CRM, order management, marketing tools, and analytics.
        </p>
      </div>
      {items.map((i) => {
        const Icon = i.icon;
        return (
          <Link
            key={i.title}
            href={i.href}
            className="flex items-center gap-4 bg-white border border-[#E4E6EB] rounded-2xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-[#1877F2] shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#1C1E21]">{i.title}</div>
              <div className="text-xs text-[#65676B] mt-0.5">{i.desc}</div>
            </div>
            <span className="text-xs font-semibold text-[#1877F2] shrink-0 hidden sm:inline">{i.cta} →</span>
          </Link>
        );
      })}
    </div>
  );
}
