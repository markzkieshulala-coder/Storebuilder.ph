"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, ShoppingBag, Save } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, pesos, fmtDate, fmtDateOnly } from "@/components/manage/ManageShell";

type Customer = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  totalSpentCents: number;
  orderCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  tags: string | null;
  notes: string | null;
};

export default function CustomerDetailPage() {
  const { id, customerId } = useParams<{ id: string; customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => {
        const c = (d.customers as Customer[] | undefined)?.find((c) => c.id === customerId) ?? null;
        setCustomer(c);
        if (c) {
          setTags(c.tags ?? "");
          setNotes(c.notes ?? "");
        }
        // Filter orders by this customer's email
        const email = c?.email;
        setOrders(Array.isArray(d.orders) ? d.orders.filter((o: any) => o.customerEmail === email) : []);
      })
      .finally(() => setLoading(false));
  }, [id, customerId]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags, notes }),
      });
      if (res.ok) toast.success("Saved");
      else toast.error("Save failed");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto text-[13px] text-gray-400">Loading customer…</div>;
  if (!customer) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
        <Link href={`/dashboard/sites/${id}/manage/customers`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
          <ArrowLeft size={12} /> Customers
        </Link>
        <p className="text-[14px] text-gray-700">Customer not found.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <Link href={`/dashboard/sites/${id}/manage/customers`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
        <ArrowLeft size={12} /> Customers
      </Link>

      <PageHeader
        title={customer.name || customer.email}
        subtitle={customer.name ? customer.email : undefined}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KPI label="Total spent" value={pesos(customer.totalSpentCents)} />
        <KPI label="Orders" value={customer.orderCount.toLocaleString()} />
        <KPI label="First order" value={fmtDateOnly(customer.firstSeenAt)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Order history */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-[14px] font-semibold text-[#1A1A1A]">Order history</h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-10 text-center">
                <ShoppingBag size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[13px] text-gray-500">No orders for this customer yet.</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <th className="text-left font-semibold px-5 py-2.5">Order</th>
                    <th className="text-left font-semibold px-2 py-2.5">Product</th>
                    <th className="text-right font-semibold px-2 py-2.5">Total</th>
                    <th className="text-right font-semibold px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/sites/${id}/manage/orders/${o.id}`} className="font-medium text-[#1A1A1A] hover:underline">
                          #{o.id.slice(-6).toUpperCase()}
                        </Link>
                        <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(o.createdAt)}</p>
                      </td>
                      <td className="px-2 py-3 truncate max-w-[200px] text-gray-700">{o.productName}</td>
                      <td className="px-2 py-3 text-right font-mono text-[#1A1A1A]">{pesos(o.totalCents)}</td>
                      <td className="px-5 py-3 text-right"><StatusPill status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-2">Internal notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Notes about this customer (only your team sees this)…"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
            />
            <button
              onClick={save}
              disabled={saving}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
            >
              <Save size={12} /> Save changes
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-3">Contact</h2>
            <div className="space-y-2 text-[13px]">
              <p className="flex items-center gap-1.5 text-gray-700">
                <Mail size={11} className="text-gray-400" />
                <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a>
              </p>
              {customer.phone && (
                <p className="flex items-center gap-1.5 text-gray-700">
                  <Phone size={11} className="text-gray-400" /> {customer.phone}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-[14px] font-semibold text-[#1A1A1A] mb-2">Tags</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vip, repeat, wholesale"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Comma-separated. Used to segment customers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-[18px] sm:text-[22px] font-bold text-[#1A1A1A] tabular-nums mt-2">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    PAID: { bg: "#D1FAE5", fg: "#065F46" }, PENDING: { bg: "#FEF3C7", fg: "#92400E" },
    CANCELLED: { bg: "#FEE2E2", fg: "#991B1B" }, REFUNDED: { bg: "#E0E7FF", fg: "#3730A3" },
  };
  const c = map[status] || { bg: "#F3F4F6", fg: "#6B7280" };
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: c.bg, color: c.fg }}>{status}</span>;
}
