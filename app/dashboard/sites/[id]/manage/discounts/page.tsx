"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Tag, Trash2, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, pesos, fmtDateOnly } from "@/components/manage/ManageShell";

type Discount = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderCents: number | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
};

export default function DiscountsPage() {
  const { id } = useParams<{ id: string }>();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/discounts`);
      const data = await res.json();
      setDiscounts(Array.isArray(data.discounts) ? data.discounts : []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [id]);

  async function remove(discountId: string) {
    if (!confirm("Delete this discount? Customers will no longer be able to use it.")) return;
    const res = await fetch(`/api/sites/${id}/manage/discounts/${discountId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Discount deleted"); load(); }
    else toast.error("Delete failed");
  }

  async function toggle(d: Discount) {
    const next = d.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const res = await fetch(`/api/sites/${id}/manage/discounts/${d.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) { toast.success(next === "ACTIVE" ? "Enabled" : "Disabled"); load(); }
    else toast.error("Update failed");
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Discounts"
        subtitle="Create promo codes customers can apply at checkout."
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black"
          >
            <Plus size={13} /> Create discount
          </button>
        }
      />

      {(showCreate || editing) && (
        <DiscountForm
          siteId={id}
          discount={editing}
          onClose={() => { setShowCreate(false); setEditing(null); }}
          onSaved={() => { load(); setShowCreate(false); setEditing(null); }}
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Loading discounts…</div>
        ) : discounts.length === 0 ? (
          <div className="p-12 text-center">
            <Tag size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-[14px] font-semibold text-[#1A1A1A]">No discounts yet</p>
            <p className="text-[12px] text-gray-500 mt-1 mb-4">Create a percent-off or peso-off promo code for your customers.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black">
              <Plus size={13} /> Create your first discount
            </button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="text-left font-semibold px-4 sm:px-5 py-3">Code</th>
                <th className="text-left font-semibold px-2 py-3">Value</th>
                <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Usage</th>
                <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">Window</th>
                <th className="text-right font-semibold px-4 sm:px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 sm:px-5 py-3">
                    <button onClick={() => setEditing(d)} className="font-mono font-semibold text-[#1A1A1A] hover:underline">
                      {d.code}
                    </button>
                    <CopyCodeBtn code={d.code} />
                  </td>
                  <td className="px-2 py-3 font-medium text-[#1A1A1A]">
                    {d.type === "PERCENT" ? `${d.value}% off` : `${pesos(d.value)} off`}
                    {d.minOrderCents != null && d.minOrderCents > 0 && (
                      <p className="text-[11px] text-gray-400">Min order {pesos(d.minOrderCents)}</p>
                    )}
                  </td>
                  <td className="px-2 py-3 text-gray-700 tabular-nums hidden md:table-cell">
                    {d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""}
                  </td>
                  <td className="px-2 py-3 text-gray-500 hidden sm:table-cell text-[12px]">
                    {d.startsAt ? fmtDateOnly(d.startsAt) : "Anytime"}
                    {" → "}
                    {d.endsAt ? fmtDateOnly(d.endsAt) : "No end"}
                  </td>
                  <td className="px-4 sm:px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => toggle(d)} className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                        d.status === "ACTIVE" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#6B7280]"
                      }`}>
                        {d.status}
                      </button>
                      <button onClick={() => remove(d.id)} className="p-1 rounded hover:bg-red-50 text-red-500" aria-label="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true);
          toast.success(`Copied ${code}`);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700"
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

function DiscountForm({ siteId, discount, onClose, onSaved }: {
  siteId: string;
  discount: Discount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!discount;
  const [code, setCode] = useState(discount?.code ?? "");
  const [type, setType] = useState<"PERCENT" | "FIXED">(discount?.type ?? "PERCENT");
  const [value, setValue] = useState(String(discount?.value ?? 10));
  const [minOrder, setMinOrder] = useState(discount?.minOrderCents != null ? String((discount.minOrderCents / 100).toFixed(2)) : "");
  const [usageLimit, setUsageLimit] = useState(discount?.usageLimit != null ? String(discount.usageLimit) : "");
  const [startsAt, setStartsAt] = useState(discount?.startsAt ? discount.startsAt.slice(0, 10) : "");
  const [endsAt, setEndsAt] = useState(discount?.endsAt ? discount.endsAt.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!code.trim()) { toast.error("Code is required"); return; }
    const v = parseFloat(value);
    if (!Number.isFinite(v) || v <= 0) { toast.error("Value must be positive"); return; }
    setSaving(true);
    try {
      const payload: any = {
        code,
        type,
        value: type === "PERCENT" ? Math.round(v) : Math.round(v * 100),
        minOrderCents: minOrder ? Math.round(parseFloat(minOrder) * 100) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      };
      const url = isEdit ? `/api/sites/${siteId}/manage/discounts/${discount!.id}` : `/api/sites/${siteId}/manage/discounts`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { toast.success(isEdit ? "Updated" : "Discount created"); onSaved(); }
      else toast.error(data.error || "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-[#1A1A1A]">{isEdit ? `Edit ${discount!.code}` : "New discount"}</h2>
        <button onClick={onClose} className="text-[12px] text-gray-500 hover:text-[#1A1A1A]">Cancel</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Lbl>Code</Lbl>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER10" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] font-mono tracking-wider" />
        </div>
        <div>
          <Lbl>Type</Lbl>
          <div className="flex gap-2">
            <button onClick={() => setType("PERCENT")} className={`flex-1 px-3 py-2 rounded-md text-[12px] font-semibold border ${type === "PERCENT" ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-gray-700 border-gray-200"}`}>% off</button>
            <button onClick={() => setType("FIXED")} className={`flex-1 px-3 py-2 rounded-md text-[12px] font-semibold border ${type === "FIXED" ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-gray-700 border-gray-200"}`}>₱ off</button>
          </div>
        </div>
        <div>
          <Lbl>{type === "PERCENT" ? "Percent off" : "Peso off"}</Lbl>
          <div className="relative">
            <input type="number" min={1} step={type === "PERCENT" ? 1 : "0.01"} value={value} onChange={(e) => setValue(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400">{type === "PERCENT" ? "%" : "₱"}</span>
          </div>
        </div>
        <div>
          <Lbl>Minimum order (optional)</Lbl>
          <input type="number" min={0} step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0.00" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums" />
        </div>
        <div>
          <Lbl>Usage limit (optional)</Lbl>
          <input type="number" min={1} value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="Unlimited" className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] tabular-nums" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Lbl>Starts</Lbl>
            <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]" />
          </div>
          <div>
            <Lbl>Ends</Lbl>
            <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-3 py-2 rounded-md text-[12px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">Cancel</button>
        <button onClick={submit} disabled={saving} className="px-3 py-2 rounded-md text-[12px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60">
          {saving ? "Saving…" : isEdit ? "Save changes" : "Create discount"}
        </button>
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{children}</label>;
}
