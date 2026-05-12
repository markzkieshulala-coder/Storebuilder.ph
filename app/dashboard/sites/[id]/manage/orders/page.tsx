"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, Filter, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, ListSearch, pesos, fmtDate } from "@/components/manage/ManageShell";

type Order = {
  id: string;
  productName: string;
  quantity: number;
  totalCents: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  fulfillmentStatus?: "UNFULFILLED" | "FULFILLED" | "PARTIAL";
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  paidAt: string | null;
};

const STATUSES: { key: "ALL" | Order["status"]; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "PENDING", label: "Pending" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "REFUNDED", label: "Refunded" },
];

export default function OrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Order["status"]>("ALL");

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d.orders) ? d.orders : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "ALL" && o.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const s = q.trim().toLowerCase();
      return (
        o.id.toLowerCase().includes(s) ||
        (o.customerName || "").toLowerCase().includes(s) ||
        (o.customerEmail || "").toLowerCase().includes(s) ||
        (o.productName || "").toLowerCase().includes(s)
      );
    });
  }, [orders, q, statusFilter]);

  const counts = useMemo(() => {
    const c = { ALL: orders.length, PAID: 0, PENDING: 0, CANCELLED: 0, REFUNDED: 0 } as Record<string, number>;
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  function exportCsv() {
    if (filtered.length === 0) { toast.error("Nothing to export"); return; }
    const header = ["Order","Date","Customer","Email","Product","Qty","Total (PHP)","Status","Paid at"];
    const rows = filtered.map((o) => [
      o.id, fmtDate(o.createdAt), o.customerName || "", o.customerEmail || "",
      o.productName, o.quantity, (o.totalCents / 100).toFixed(2), o.status, o.paidAt ? fmtDate(o.paidAt) : "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} orders`);
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Orders"
        subtitle="Every order that came through your storefront."
        actions={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-[#1A1A1A] bg-white border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Download size={13} /> Export
          </button>
        }
      />

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto -mx-2 px-2">
        {STATUSES.map((s) => {
          const active = statusFilter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-[#1A1A1A] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {s.label}
              <span className={`ml-1.5 text-[11px] ${active ? "text-white/70" : "text-gray-400"}`}>{counts[s.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <ListSearch value={q} onChange={setQ} placeholder="Search by order ID, customer name, email, or product…" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Loading orders…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-[14px] font-semibold text-[#1A1A1A]">No orders match these filters</p>
            <p className="text-[12px] text-gray-500 mt-1">Try clearing the search or selecting a different status.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="text-left font-semibold px-4 sm:px-5 py-3">Order</th>
                <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left font-semibold px-2 py-3">Customer</th>
                <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Product</th>
                <th className="text-right font-semibold px-2 py-3">Total</th>
                <th className="text-right font-semibold px-4 sm:px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 sm:px-5 py-3">
                    <Link href={`/dashboard/sites/${id}/manage/orders/${o.id}`} className="font-medium text-[#1A1A1A] hover:underline tabular-nums">
                      #{o.id.slice(-6).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-gray-500 hidden sm:table-cell text-[12px] whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  <td className="px-2 py-3 text-[#1A1A1A] truncate max-w-[180px]">
                    {o.customerName || <span className="text-gray-400">Guest</span>}
                    <p className="text-[11px] text-gray-400 truncate">{o.customerEmail || ""}</p>
                  </td>
                  <td className="px-2 py-3 text-gray-700 hidden md:table-cell truncate max-w-[200px]">
                    {o.productName} <span className="text-gray-400">× {o.quantity}</span>
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-[#1A1A1A] tabular-nums">{pesos(o.totalCents)}</td>
                  <td className="px-4 sm:px-5 py-3 text-right"><StatusPill status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
