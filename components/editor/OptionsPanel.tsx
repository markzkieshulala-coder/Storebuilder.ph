"use client";

import { useState } from "react";
import { CreditCard, Store, Layers, ChevronUp, ChevronDown, Trash2, Copy, Phone, Mail, MapPin, Link as LinkIcon, ExternalLink, ArrowRight } from "lucide-react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";

const PAYMENT_METHODS = [
  { key: "hitpay", label: "Hitpay", linkKey: "hitpayLink", placeholder: "https://hitpay.example/link" },
  { key: "paymongo", label: "Paymongo", linkKey: "paymongoLink", placeholder: "https://pm.link/your-link" },
];

const SECTION_LABELS: Record<string, string> = {
  nav: "Navigation", hero: "Hero", features: "Features", products: "Products",
  testimonials: "Testimonials", about: "About", footer: "Footer", cta: "CTA Banner",
  newsletter: "Newsletter", pricing: "Pricing", faq: "FAQ", stats: "Stats",
  contact: "Contact", team: "Team", gallery: "Gallery", process: "Process",
};

type Tab = "pages" | "site" | "payments";

interface Props {
  website: GeneratedWebsite;
  onUpdateWebsite: (updates: Partial<GeneratedWebsite>) => void;
  onMoveSection: (id: string, dir: "up" | "down") => void;
  onDeleteSection: (id: string) => void;
  onDuplicateSection: (id: string) => void;
  onScrollToSection?: (sectionId: string) => void;
  // Restrict which tabs are visible. Defaults to all three for back-compat.
  // Pass ["pages"] for the left panel and ["site", "payments"] for the right.
  visibleTabs?: Tab[];
}

export default function OptionsPanel({ website, onUpdateWebsite, onMoveSection, onDeleteSection, onDuplicateSection, onScrollToSection, visibleTabs }: Props) {
  const allowed: Tab[] = visibleTabs && visibleTabs.length > 0 ? visibleTabs : ["pages", "site", "payments"];
  const [tab, setTab] = useState<Tab>(allowed[0]);

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

  function setPaymentLink(linkKey: string, value: string) {
    updateSettings("payments", { ...payments, [linkKey]: value });
  }

  const inp = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white text-gray-800 transition-colors";
  const lbl = "block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  const tabs = ([
    { id: "pages" as Tab, Icon: Layers, label: "Pages" },
    { id: "site" as Tab, Icon: Store, label: "Site" },
    { id: "payments" as Tab, Icon: CreditCard, label: "Payments" },
  ] as const).filter((t) => allowed.includes(t.id));
  const showTabBar = tabs.length > 1;

  // Get nav section links for "Website Pages" list
  const navSection = website.sections.find((s) => s.type === "nav");
  const navLinks: { label: string; href: string }[] = (navSection?.data as any)?.links || [];

  // Find the section matching a nav href (e.g. "#about" → section.type === "about")
  function findSectionForHref(href: string): Section | undefined {
    const type = href.replace(/^#/, "");
    // Try matching by type first, then by id
    return website.sections.find((s) => s.type === type) || website.sections.find((s) => s.id === type);
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      {/* Tab bar — hidden when only one tab is allowed (e.g. left panel = pages-only) */}
      {showTabBar && (
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
      )}
      {!showTabBar && tabs[0] && (() => {
        const Icon = tabs[0].Icon;
        return (
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Icon size={14} className="text-gray-500" />
              {tabs[0].label}
            </h2>
          </div>
        );
      })()}

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
          <div className="space-y-3">
            <p className="text-xs text-gray-400 pb-1">Toggle accepted payment methods and add your own checkout links</p>
            {PAYMENT_METHODS.map((pm) => (
              <div key={pm.key} className="space-y-2">
                <button
                  onClick={() => togglePayment(pm.key)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all text-left ${
                    payments[pm.key]
                      ? "bg-blue-50 border-blue-300"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span className={`flex-1 text-sm font-medium ${payments[pm.key] ? "text-blue-700" : "text-gray-700"}`}>
                    {pm.label}
                  </span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    payments[pm.key] ? "bg-blue-600 border-blue-600" : "border-gray-300"
                  }`}>
                    {payments[pm.key] && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
                {payments[pm.key] && (
                  <div className="pl-2 pr-1">
                    <label className={lbl}>{pm.label} payment link</label>
                    <div className="relative">
                      <LinkIcon size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        value={payments[pm.linkKey] || ""}
                        onChange={(e) => setPaymentLink(pm.linkKey, e.target.value)}
                        className={inp + " pl-8"}
                        placeholder={pm.placeholder}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PAGES */}
        {tab === "pages" && (
          <div className="space-y-4">
            {/* Website Pages from nav */}
            {navLinks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Website Pages</p>
                <div className="space-y-1">
                  {navLinks.map((link, i) => {
                    const matched = findSectionForHref(link.href);
                    return (
                      <div
                        key={i}
                        className="group flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer"
                        onClick={() => matched && onScrollToSection && onScrollToSection(matched.id)}
                        title={matched ? `Scroll to ${link.label}` : link.label}
                      >
                        <ArrowRight size={12} className="text-gray-300 group-hover:text-blue-400 shrink-0 transition-colors" />
                        <span className="flex-1 text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate transition-colors">
                          {link.label}
                        </span>
                        {link.href && (
                          <span className="text-[10px] text-gray-300 group-hover:text-blue-300 shrink-0 transition-colors">
                            {link.href}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Sections */}
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">All Sections</p>
              <div className="space-y-1">
                {website.sections.map((section, i) => (
                  <div
                    key={section.id}
                    className="group flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                    onClick={() => onScrollToSection && onScrollToSection(section.id)}
                  >
                    <span className="w-5 h-5 rounded-md bg-white border border-gray-200 text-[10px] font-bold flex items-center justify-center text-gray-400 shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                      {SECTION_LABELS[section.type] || section.type}
                    </span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onMoveSection(section.id, "up"); }} disabled={i === 0} className="p-1 hover:bg-white rounded text-gray-400 disabled:opacity-20">
                        <ChevronUp size={11} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onMoveSection(section.id, "down"); }} disabled={i === website.sections.length - 1} className="p-1 hover:bg-white rounded text-gray-400 disabled:opacity-20">
                        <ChevronDown size={11} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDuplicateSection(section.id); }} className="p-1 hover:bg-white rounded text-gray-400">
                        <Copy size={11} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id); }} className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
