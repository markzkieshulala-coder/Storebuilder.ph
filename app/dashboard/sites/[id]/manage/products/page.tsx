"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Package, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, ListSearch, pesos } from "@/components/manage/ManageShell";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  trackInventory: boolean;
  imageUrl: string | null;
  category: string | null;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  updatedAt: string;
};

const STATUSES: { key: "ALL" | Product["status"]; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DRAFT", label: "Draft" },
  { key: "ARCHIVED", label: "Archived" },
];

export default function ProductsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Product["status"]>("ALL");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/products`);
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  async function createProduct() {
    setCreating(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled product", priceCents: 0, stock: 0, status: "DRAFT" }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        router.push(`/dashboard/sites/${id}/manage/products/${data.id}`);
      } else {
        toast.error(data.error || "Could not create product");
      }
    } finally { setCreating(false); }
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const s = q.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        (p.sku || "").toLowerCase().includes(s) ||
        (p.category || "").toLowerCase().includes(s)
      );
    });
  }, [products, q, statusFilter]);

  const counts = useMemo(() => {
    const c = { ALL: products.length, ACTIVE: 0, DRAFT: 0, ARCHIVED: 0 } as Record<string, number>;
    for (const p of products) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [products]);

  const lowStockCount = products.filter((p) => p.trackInventory && p.stock <= 3 && p.status === "ACTIVE").length;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? "" : "s"} in your catalog`}
        actions={
          <button
            onClick={createProduct}
            disabled={creating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60 transition-colors"
          >
            <Plus size={13} /> {creating ? "Creating…" : "Add product"}
          </button>
        }
      />

      {lowStockCount > 0 && (
        <div className="mb-4 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-[12px] text-[#92400E] flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" />
          <span><strong>{lowStockCount}</strong> active product{lowStockCount === 1 ? "" : "s"} running low on stock (≤ 3 units).</span>
        </div>
      )}

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

      <div className="flex items-center gap-2 mb-4">
        <ListSearch value={q} onChange={setQ} placeholder="Search by name, SKU, or category…" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Loading products…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-[14px] font-semibold text-[#1A1A1A]">
              {products.length === 0 ? "No products yet" : "No products match these filters"}
            </p>
            <p className="text-[12px] text-gray-500 mt-1 mb-4">
              {products.length === 0 ? "Add your first product to start selling." : "Try clearing the search or selecting a different status."}
            </p>
            {products.length === 0 && (
              <button
                onClick={createProduct}
                disabled={creating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
              >
                <Plus size={13} /> Add your first product
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="text-left font-semibold px-4 sm:px-5 py-3">Product</th>
                <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">SKU</th>
                <th className="text-right font-semibold px-2 py-3">Price</th>
                <th className="text-right font-semibold px-2 py-3 hidden md:table-cell">Stock</th>
                <th className="text-right font-semibold px-4 sm:px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 sm:px-5 py-3">
                    <Link href={`/dashboard/sites/${id}/manage/products/${p.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                          : <Package size={14} className="text-gray-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[#1A1A1A] truncate">{p.name}</p>
                        {p.category && <p className="text-[11px] text-gray-400 truncate">{p.category}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-2 py-3 text-gray-500 font-mono text-[11px] hidden sm:table-cell">{p.sku || "—"}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums text-[#1A1A1A]">
                    {pesos(p.priceCents)}
                    {p.compareAtCents && p.compareAtCents > p.priceCents && (
                      <p className="text-[10px] text-gray-400 line-through font-normal">{pesos(p.compareAtCents)}</p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums hidden md:table-cell">
                    {p.trackInventory
                      ? <span className={p.stock <= 3 ? "text-[#92400E] font-semibold" : "text-gray-700"}>{p.stock}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right"><ProductStatusPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ProductStatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    ACTIVE:   { bg: "#D1FAE5", fg: "#065F46" },
    DRAFT:    { bg: "#FEF3C7", fg: "#92400E" },
    ARCHIVED: { bg: "#F3F4F6", fg: "#6B7280" },
  };
  const c = map[status] || { bg: "#F3F4F6", fg: "#6B7280" };
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}
