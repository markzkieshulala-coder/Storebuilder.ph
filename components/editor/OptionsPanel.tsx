"use client";

import { useState } from "react";
import { CreditCard, Store, Palette, Layers, ChevronUp, ChevronDown, Trash2, Copy, Phone, Mail, MapPin } from "lucide-react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";

const PAYMENT_METHODS = [
  { key: "gcash", label: "GCash", emoji: "📱" },
  { key: "paymaya", label: "Maya (PayMaya)", emoji: "💚" },
  { key: "creditCard", label: "Credit / Debit Card", emoji: "💳" },
  { key: "cod", label: "Cash on Delivery", emoji: "🏠" },
  { key: "bankTransfer", label: "Bank Transfer", emoji: "🏦" },
  { key: "grabpay", label: "GrabPay", emoji: "🟢" },
];

const FONTS = [
  "Google Sans", "Roboto", "Inter", "Poppins", "Montserrat",
  "Raleway", "DM Sans", "Outfit", "Nunito", "Lato", "Open Sans",
];

const SECTION_LABELS: Record<string, string> = {
  nav: "Navigation", hero: "Hero", features: "Features", products: "Products",
  testimonials: "Testimonials", about: "About", footer: "Footer", cta: "CTA Banner",
  newsletter: "Newsletter", pricing: "Pricing", faq: "FAQ", stats: "Stats",
  contact: "Contact", team: "Team", gallery: "Gallery", process: "Process",
};

type Tab = "site" | "payments" | "design" | "pages";

interface Props {
  website: GeneratedWebsite;
  onUpdateWebsite: (updates: Partial<GeneratedWebsite>) => void;
  onMoveSection: (id: string, dir: "up" | "down") => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
}

export default function OptionsPanel({ website, onUpdateWebsite, onMoveSection, onDeleteSection, onDuplicateSection }: Props) {
  const [tab, setTab] = useState<Tab>("site");

  const settings = (website as any).settings || {};
  const payments = settings.payments || {};
  const contact = settings.contact || {};

  function updateSettings(key: string, value: any) {
    onUpdateWebsite({ settings: { ...settings, [key]: value } } as any);
  }

  function updateContact(field: string, value: string) {
    updateSettings("contact", { ...contact, [field]: value });
  }

  function togglePayment(method: string) {
    updateSettings("payments", { ...payments, [method]: !payments[method] });
  }

  const inp = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white text-gray-800 transition-colors";
  const lbl = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  const tabs = [
    { id: "site" as Tab, Icon: Store, label: "Site" },
    { id: "payments" as Tab, Icon: CreditCard, label: "Payments" },
    { id: "design" as Tab, Icon: Palette, label: "Design" },
    { id: "pages" as Tab, Icon: Layers, label: "Pages" },
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100 shrink-0">
        {tabs.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              tab === id
                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={14} strokeWidth={tab === id ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* SITE */}
        {tab === "site" && (
          <>
            <div>
              <label className={lbl}>Store Name</label>
              <input value={website.name || ""} onChange={(e) => onUpdateWebsite({ name: e.target.value })} className={inp} placeholder="My Store" />
            </div>
            <div>
              <label className={lbl}>Phone</label>
              <div className="relative">
                <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={contact.phone || ""} onChange={(e) => updateContact("phone", e.target.value)} className={inp + " pl-8"} placeholder="+63 9XX XXX XXXX" />
              </div>
            </div>
            <div>
              <label className={lbl}>Email</label>
              <div className="relative">
                <Mail size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input value={contact.email || ""} onChange={(e) => updateContact("email", e.target.value)} className={inp + " pl-8"} placeholder="hello@mystore.com" />
              </div>
            </div>
            <div>
              <label className={lbl}>Address</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
                <textarea value={contact.address || ""} onChange={(e) => updateContact("address", e.target.value)} className={inp + " pl-8 resize-none"} rows={2} placeholder="BGC, Taguig, Metro Manila" />
              </div>
            </div>
          </>
        )}

        {/* PAYMENTS */}
        {tab === "payments" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 pb-1">Toggle accepted payment methods</p>
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm.key}
                onClick={() => togglePayment(pm.key)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left ${
                  payments[pm.key]
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-150 hover:bg-gray-50 border-gray-200"
                }`}
              >
                <span className="text-base leading-none">{pm.emoji}</span>
                <span className={`flex-1 text-sm font-medium ${payments[pm.key] ? "text-blue-700" : "text-gray-700"}`}>
                  {pm.label}
                </span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  payments[pm.key] ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}>
                  {payments[pm.key] && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* DESIGN */}
        {tab === "design" && (
          <div className="space-y-4">
            <div>
              <label className={lbl}>Heading Font</label>
              <select value={website.fonts?.heading || "Google Sans"} onChange={(e) => onUpdateWebsite({ fonts: { ...website.fonts, heading: e.target.value } })} className={inp}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Body Font</label>
              <select value={website.fonts?.body || "Google Sans"} onChange={(e) => onUpdateWebsite({ fonts: { ...website.fonts, body: e.target.value } })} className={inp}>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Colors</label>
              <div className="grid grid-cols-1 gap-2">
                {(["primary", "secondary", "accent", "background", "text"] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <input
                      type="color"
                      value={website.colors?.[key] || "#000000"}
                      onChange={(e) => onUpdateWebsite({ colors: { ...website.colors, [key]: e.target.value } })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                      style={{ padding: "2px" }}
                    />
                    <span className="text-xs font-medium text-gray-600 capitalize">{key}</span>
                    <span className="ml-auto text-[10px] text-gray-400 font-mono">{website.colors?.[key] || ""}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAGES */}
        {tab === "pages" && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 pb-1">Reorder or remove sections</p>
            {website.sections.map((section, i) => (
              <div
                key={section.id}
                className="group flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all"
              >
                <span className="w-5 h-5 rounded-md bg-white border border-gray-200 text-[10px] font-bold flex items-center justify-center text-gray-400 shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                  {SECTION_LABELS[section.type] || section.type}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onMoveSection(section.id, "up")} disabled={i === 0} className="p-1 hover:bg-white rounded text-gray-400 disabled:opacity-20">
                    <ChevronUp size={11} />
                  </button>
                  <button onClick={() => onMoveSection(section.id, "down")} disabled={i === website.sections.length - 1} className="p-1 hover:bg-white rounded text-gray-400 disabled:opacity-20">
                    <ChevronDown size={11} />
                  </button>
                  <button onClick={() => onDuplicateSection(section.id)} className="p-1 hover:bg-white rounded text-gray-400">
                    <Copy size={11} />
                  </button>
                  <button onClick={() => onDeleteSection(section.id)} className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
