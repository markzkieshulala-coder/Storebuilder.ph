"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Save, Globe, CreditCard, Truck, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/manage/ManageShell";

const PAYMENT_OPTIONS = [
  { key: "gcash",    label: "GCash" },
  { key: "maya",     label: "Maya" },
  { key: "grabpay",  label: "GrabPay" },
  { key: "card",     label: "Card (Visa / Mastercard)" },
  { key: "bank",     label: "Online banking" },
  { key: "cod",      label: "Cash on delivery" },
];

export default function StoreSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  const [storeName, setStoreName] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [shippingFlatCents, setShippingFlatCents] = useState(0);
  const [freeShippingMinCents, setFreeShippingMinCents] = useState(0);
  const [shippingPolicy, setShippingPolicy] = useState("");
  const [returnPolicy, setReturnPolicy] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/sites/${id}/manage/settings`)
      .then((r) => r.json())
      .then((d) => {
        setSiteName(d.name ?? null);
        setSubdomain(d.subdomain ?? null);
        const s = d.settings || {};
        setStoreName(s.storeName ?? d.name ?? "");
        setStoreEmail(s.storeEmail ?? "");
        setStorePhone(s.storePhone ?? "");
        setStoreAddress(s.storeAddress ?? "");
        setShippingFlatCents(s.shippingFlatCents ?? 0);
        setFreeShippingMinCents(s.freeShippingMinCents ?? 0);
        setShippingPolicy(s.shippingPolicy ?? "");
        setReturnPolicy(s.returnPolicy ?? "");
        setPaymentMethods(Array.isArray(s.paymentMethods) ? s.paymentMethods : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function togglePayment(key: string) {
    setPaymentMethods((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName, storeEmail, storePhone, storeAddress,
          shippingFlatCents, freeShippingMinCents,
          shippingPolicy, returnPolicy,
          paymentMethods,
        }),
      });
      if (res.ok) toast.success("Settings saved");
      else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Save failed");
      }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="px-4 sm:px-8 py-10 max-w-5xl mx-auto text-[13px] text-gray-400">Loading settings…</div>;

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto">
      <PageHeader
        title="Store settings"
        subtitle="Store info, shipping rules, payment methods, and policies."
        actions={
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-white bg-[#1A1A1A] hover:bg-black disabled:opacity-60"
          >
            <Save size={13} /> {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Store info */}
          <Card title="Store information" Icon={Globe}>
            <Field label="Store name">
              <Input value={storeName} onChange={setStoreName} placeholder={siteName ?? ""} />
            </Field>
            <Field label="Public email" hint="Customers see this on contact forms">
              <Input value={storeEmail} onChange={setStoreEmail} placeholder="hello@yourstore.com" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Phone">
                <Input value={storePhone} onChange={setStorePhone} placeholder="+63 9XX XXX XXXX" />
              </Field>
            </div>
            <Field label="Address">
              <textarea
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
                placeholder="Pickup or HQ address"
              />
            </Field>
          </Card>

          {/* Shipping */}
          <Card title="Shipping" Icon={Truck}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Flat shipping fee (PHP)">
                <PesoInput valueCents={shippingFlatCents} onChange={setShippingFlatCents} />
              </Field>
              <Field label="Free shipping above (PHP)" hint="0 = no free-shipping threshold">
                <PesoInput valueCents={freeShippingMinCents} onChange={setFreeShippingMinCents} />
              </Field>
            </div>
            <Field label="Shipping policy">
              <textarea
                value={shippingPolicy}
                onChange={(e) => setShippingPolicy(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
                placeholder="When do you ship? Which couriers do you use?"
              />
            </Field>
          </Card>

          {/* Policies */}
          <Card title="Policies" Icon={FileText}>
            <Field label="Return policy">
              <textarea
                value={returnPolicy}
                onChange={(e) => setReturnPolicy(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A] resize-y"
                placeholder="How can customers return items? What's your refund window?"
              />
            </Field>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Payments */}
          <Card title="Payment methods" Icon={CreditCard}>
            <p className="text-[11px] text-gray-500 mb-3">Which methods do you accept?</p>
            <div className="space-y-1.5">
              {PAYMENT_OPTIONS.map((p) => {
                const active = paymentMethods.includes(p.key);
                return (
                  <label key={p.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer border ${active ? "border-[#1A1A1A] bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePayment(p.key)}
                      className="rounded"
                    />
                    <span className="text-[13px] text-[#1A1A1A]">{p.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              You configure actual payment-link providers (HitPay, PayMongo) in your global{" "}
              <Link href="/dashboard/settings" className="text-[#1A1A1A] hover:underline font-medium">account settings</Link>.
            </p>
          </Card>

          {/* Site link */}
          <Card title="Storefront" Icon={Globe}>
            <p className="text-[12px] text-gray-500 mb-2">Live URL</p>
            <p className="text-[13px] font-mono text-[#1A1A1A] break-all">{subdomain}.storebuilder.ph</p>
            {subdomain && (
              <a
                href={`https://${subdomain}.storebuilder.ph`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-[#1A1A1A] hover:underline"
              >
                <ExternalLink size={11} /> View live store
              </a>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href={`/editor/${id}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-700 hover:text-[#1A1A1A]"
              >
                Open in editor →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, Icon, children }: { title: string; Icon: any; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-[#1A1A1A] mb-4">
        <Icon size={14} className="text-gray-400" /> {title}
      </h2>
      <div className="space-y-3">{children}</div>
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

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#1A1A1A]"
    />
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
