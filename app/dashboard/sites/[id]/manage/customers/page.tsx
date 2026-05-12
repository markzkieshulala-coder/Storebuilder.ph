"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users, Download } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, ListSearch, pesos, fmtDateOnly } from "@/components/manage/ManageShell";

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
};

export default function CustomersPage() {
  const { id } = useParams<{ id: string }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => setCustomers(Array.isArray(d.customers) ? d.customers : []))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    if (!q.trim()) return customers;
    const s = q.trim().toLowerCase();
    return customers.filter((c) =>
      c.email.toLowerCase().includes(s) ||
      (c.name || "").toLowerCase().includes(s) ||
      (c.phone || "").toLowerCase().includes(s)
    );
  }, [customers, q]);

  function exportCsv() {
    if (filtered.length === 0) { toast.error("Nothing to export"); return; }
    const header = ["Name","Email","Phone","Orders","Total spent (PHP)","First order","Last seen","Tags"];
    const rows = filtered.map((c) => [
      c.name || "", c.email, c.phone || "", c.orderCount,
      (c.totalSpentCents / 100).toFixed(2),
      fmtDateOnly(c.firstSeenAt), fmtDateOnly(c.lastSeenAt), c.tags || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} customers`);
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length === 1 ? "" : "s"} in your CRM`}
        actions={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-[#1A1A1A] bg-white border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Download size={13} /> Export
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-4">
        <ListSearch value={q} onChange={setQ} placeholder="Search by name, email, or phone…" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Loading customers…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-[14px] font-semibold text-[#1A1A1A]">No customers yet</p>
            <p className="text-[12px] text-gray-500 mt-1">Customers appear here automatically after their first order.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="text-left font-semibold px-4 sm:px-5 py-3">Customer</th>
                <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Phone</th>
                <th className="text-right font-semibold px-2 py-3">Orders</th>
                <th className="text-right font-semibold px-2 py-3">Total spent</th>
                <th className="text-right font-semibold px-4 sm:px-5 py-3 hidden sm:table-cell">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 sm:px-5 py-3">
                    <Link href={`/dashboard/sites/${id}/manage/customers/${c.id}`} className="font-medium text-[#1A1A1A] hover:underline">
                      {c.name || c.email}
                    </Link>
                    {c.name && <p className="text-[11px] text-gray-400">{c.email}</p>}
                  </td>
                  <td className="px-2 py-3 text-gray-500 hidden md:table-cell">{c.phone || "—"}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-[#1A1A1A]">{c.orderCount}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums text-[#1A1A1A]">{pesos(c.totalSpentCents)}</td>
                  <td className="px-4 sm:px-5 py-3 text-right text-gray-500 hidden sm:table-cell text-[12px]">{fmtDateOnly(c.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
