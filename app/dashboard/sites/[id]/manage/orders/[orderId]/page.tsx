"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Mail, Phone, MapPin, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, pesos, fmtDate } from "@/components/manage/ManageShell";

type Order = {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
  fulfillmentStatus?: "UNFULFILLED" | "FULFILLED" | "PARTIAL";
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  trackingNumber: string | null;
  discountCode: string | null;
  discountCents: number;
  createdAt: string;
  paidAt: string | null;
};

export default function OrderDetailPage() {
  const { id, orderId } = useParams<{ id: string; orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.orders as Order[] | undefined)?.find((o) => o.id === orderId) ?? null;
        setOrder(found);
        if (found) {
          setNotes(found.notes ?? "");
          setTracking(found.trackingNumber ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [id, orderId]);

  async function patch(body: any, successMsg?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.order) setOrder(data.order);
        if (successMsg) toast.success(successMsg);
      } else {
        toast.error(data.error || "Update failed");
      }
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto text-[13px] text-gray-400">Loading order…</div>;
  }
  if (!order) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
        <Link href={`/dashboard/sites/${id}/manage/orders`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
          <ArrowLeft size={12} /> Back to orders
        </Link>
        <p className="text-[14px] text-gray-700">Order not found.</p>
      </div>
    );
  }

  const subtotal = order.unitPriceCents * order.quantity;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <Link href={`/dashboard/sites/${id}/manage/orders`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
        <ArrowLeft size={12} /> Orders
      </Link>

      <PageHeader
        title={`Order #${order.id.slice(-6).toUpperCase()}`}
        subtitle={`Placed ${fmtDate(order.createdAt)}`}
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Items</h2>
              <StatusPill status={order.status} />
            </div>
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{order.productName}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">Qty {order.quantity} × {pesos(order.unitPriceCents)}</p>
                </div>
                <p className="text-[14px] font-mono font-semibold text-[#1A1A1A] tabular-nums">{pesos(subtotal)}</p>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-3 space-y-1.5 text-[13px]">
              <SummaryRow label="Subtotal" value={pesos(subtotal)} />
              {order.discountCents > 0 && (
                <SummaryRow label={`Discount${order.discountCode ? ` (${order.discountCode})` : ""}`} value={`− ${pesos(order.discountCents)}`} />
              )}
              <SummaryRow label="Total" value={pesos(order.totalCents)} bold />
            </div>
          </div>

          {/* Fulfillment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={14} className="text-gray-400" />
              <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Fulfillment</h2>
              <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                order.fulfillmentStatus === "FULFILLED" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]"
              }`}>
                {(order.fulfillmentStatus || "UNFULFILLED").replace("_", " ")}
              </span>
            </div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tracking number</label>
            <div className="flex gap-2">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="e.g. PHLPOST-XXXX-1234"
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
              />
              <button
                onClick={() => patch({ trackingNumber: tracking }, "Tracking updated")}
                disabled={saving}
                className="px-3 py-2 rounded-md text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
              >
                Save
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <FulfillBtn current={order.fulfillmentStatus} val="UNFULFILLED" onClick={() => patch({ fulfillmentStatus: "UNFULFILLED" }, "Marked unfulfilled")} />
              <FulfillBtn current={order.fulfillmentStatus} val="PARTIAL" onClick={() => patch({ fulfillmentStatus: "PARTIAL" }, "Marked partially fulfilled")} />
              <FulfillBtn current={order.fulfillmentStatus} val="FULFILLED" onClick={() => patch({ fulfillmentStatus: "FULFILLED" }, "Marked fulfilled")} />
            </div>
          </div>

          {/* Internal notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-2">Internal notes</label>
            <p className="text-[11px] text-gray-500 mb-3">Only your team sees this — useful for fulfillment context.</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Add a note about this order…"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
            />
            <button
              onClick={() => patch({ notes }, "Notes saved")}
              disabled={saving}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
            >
              <Save size={12} /> Save notes
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">Customer</h2>
            <div className="space-y-2 text-[13px]">
              <p className="font-medium text-[#1A1A1A]">{order.customerName || "Guest checkout"}</p>
              {order.customerEmail && (
                <p className="flex items-center gap-1.5 text-gray-600">
                  <Mail size={11} className="text-gray-400" />
                  <a href={`mailto:${order.customerEmail}`} className="hover:underline">{order.customerEmail}</a>
                </p>
              )}
              {order.customerPhone && (
                <p className="flex items-center gap-1.5 text-gray-600">
                  <Phone size={11} className="text-gray-400" />
                  {order.customerPhone}
                </p>
              )}
            </div>
          </div>

          {/* Status actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">Payment status</h2>
            <div className="grid grid-cols-2 gap-2">
              <StatusBtn current={order.status} val="PENDING"   onClick={() => patch({ status: "PENDING" }, "Marked pending")} />
              <StatusBtn current={order.status} val="PAID"      onClick={() => patch({ status: "PAID" }, "Marked paid")} />
              <StatusBtn current={order.status} val="CANCELLED" onClick={() => patch({ status: "CANCELLED" }, "Marked cancelled")} />
              <StatusBtn current={order.status} val="REFUNDED"  onClick={() => patch({ status: "REFUNDED" }, "Marked refunded")} />
            </div>
            {order.paidAt && (
              <p className="text-[11px] text-gray-500 mt-3">Paid {fmtDate(order.paidAt)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "pt-2 mt-1 border-t border-gray-100" : ""}`}>
      <span className={`${bold ? "font-semibold text-[#1A1A1A]" : "text-gray-500"}`}>{label}</span>
      <span className={`font-mono tabular-nums ${bold ? "font-bold text-[#1A1A1A]" : "text-[#1A1A1A]"}`}>{value}</span>
    </div>
  );
}

function StatusBtn({ current, val, onClick }: { current: string; val: string; onClick: () => void }) {
  const active = current === val;
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
        active ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      {val}
    </button>
  );
}

function FulfillBtn({ current, val, onClick }: { current?: string; val: string; onClick: () => void }) {
  const active = (current || "UNFULFILLED") === val;
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
        active ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
      }`}
    >
      {val.replace("_", " ")}
    </button>
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
