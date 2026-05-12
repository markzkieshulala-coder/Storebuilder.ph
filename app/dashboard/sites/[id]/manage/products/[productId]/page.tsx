"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Package } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/manage/ManageShell";

type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  trackInventory: boolean;
  imageUrl: string | null;
  category: string | null;
  tags: string | null;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  weightGrams: number | null;
};

export default function ProductEditPage() {
  const { id, productId } = useParams<{ id: string; productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/sites/${id}/manage/products/${productId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.product) {
          setProduct({
            ...d.product,
            priceCents: d.product.priceCents ?? 0,
            stock: d.product.stock ?? 0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id, productId]);

  function setField<K extends keyof Product>(k: K, v: Product[K]) {
    setProduct((p) => (p ? { ...p, [k]: v } : p));
  }

  async function save() {
    if (!product) return;
    if (!product.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description ?? "",
          sku: product.sku ?? "",
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          stock: product.stock,
          trackInventory: product.trackInventory,
          imageUrl: product.imageUrl ?? "",
          category: product.category ?? "",
          tags: product.tags ?? "",
          status: product.status,
          weightGrams: product.weightGrams,
        }),
      });
      const data = await res.json();
      if (res.ok) toast.success("Saved");
      else toast.error(data.error || "Save failed");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/products/${productId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Product deleted");
        router.push(`/dashboard/sites/${id}/manage/products`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Delete failed");
      }
    } finally { setDeleting(false); }
  }

  if (loading) {
    return <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto text-[13px] text-gray-400">Loading product…</div>;
  }
  if (!product) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto">
        <Link href={`/dashboard/sites/${id}/manage/products`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
          <ArrowLeft size={12} /> Products
        </Link>
        <p className="text-[14px] text-gray-700">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <Link href={`/dashboard/sites/${id}/manage/products`} className="text-[12px] text-gray-500 hover:text-[#1A1A1A] flex items-center gap-1 mb-4">
        <ArrowLeft size={12} /> Products
      </Link>

      <PageHeader
        title={product.name || "Untitled product"}
        actions={
          <>
            <button
              onClick={remove}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
            >
              <Save size={12} /> {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <Card title="Product details">
            <Field label="Name">
              <input
                value={product.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
                placeholder="Short, descriptive name"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={product.description ?? ""}
                onChange={(e) => setField("description", e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
                placeholder="What makes this product worth buying?"
              />
            </Field>
            <Field label="Image URL">
              <input
                value={product.imageUrl ?? ""}
                onChange={(e) => setField("imageUrl", e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] font-mono"
              />
              {product.imageUrl && (
                <div className="mt-2 w-24 h-24 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img src={product.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </Field>
          </Card>

          {/* Pricing */}
          <Card title="Pricing">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Price (PHP)">
                <PesoInput valueCents={product.priceCents} onChange={(v) => setField("priceCents", v)} />
              </Field>
              <Field label="Compare-at (PHP)" hint="Show a strikethrough higher price">
                <PesoInput valueCents={product.compareAtCents ?? 0} onChange={(v) => setField("compareAtCents", v > 0 ? v : null)} />
              </Field>
            </div>
          </Card>

          {/* Inventory */}
          <Card title="Inventory">
            <Field label="SKU">
              <input
                value={product.sku ?? ""}
                onChange={(e) => setField("sku", e.target.value)}
                placeholder="ABC-123"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] font-mono"
              />
            </Field>
            <label className="flex items-center gap-2 mt-3 text-[13px] text-gray-700">
              <input
                type="checkbox"
                checked={product.trackInventory}
                onChange={(e) => setField("trackInventory", e.target.checked)}
                className="rounded"
              />
              Track inventory
            </label>
            {product.trackInventory && (
              <Field label="Stock quantity">
                <input
                  type="number"
                  min={0}
                  value={product.stock}
                  onChange={(e) => setField("stock", parseInt(e.target.value, 10) || 0)}
                  className="w-32 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums"
                />
              </Field>
            )}
            <Field label="Weight (grams)" hint="Used for shipping calculations">
              <input
                type="number"
                min={0}
                value={product.weightGrams ?? ""}
                onChange={(e) => setField("weightGrams", e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-32 border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums"
                placeholder="0"
              />
            </Field>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card title="Status">
            <div className="flex flex-col gap-2">
              {(["ACTIVE","DRAFT","ARCHIVED"] as const).map((s) => (
                <label key={s} className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer border ${product.status === s ? "border-[#1A1A1A] bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input type="radio" name="status" checked={product.status === s} onChange={() => setField("status", s)} />
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1A1A]">{s.charAt(0) + s.slice(1).toLowerCase()}</p>
                    <p className="text-[11px] text-gray-500">{s === "ACTIVE" ? "Visible on the storefront" : s === "DRAFT" ? "Hidden from customers" : "Removed from store but kept for records"}</p>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card title="Organization">
            <Field label="Category">
              <input
                value={product.category ?? ""}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="e.g. Apparel, Coffee, Services"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
              />
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <input
                value={product.tags ?? ""}
                onChange={(e) => setField("tags", e.target.value)}
                placeholder="new, best-seller"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
              />
            </Field>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-[14px] font-semibold text-[#1A1A1A] mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {hint && <span className="font-normal text-gray-400 normal-case tracking-normal lowercase ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function PesoInput({ valueCents, onChange }: { valueCents: number; onChange: (cents: number) => void }) {
  const [raw, setRaw] = useState((valueCents / 100).toFixed(2));
  useEffect(() => { setRaw((valueCents / 100).toFixed(2)); }, [valueCents]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">₱</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? Math.round(n * 100) : 0);
        }}
        className="w-full border border-gray-200 rounded-md pl-7 pr-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums"
      />
    </div>
  );
}
