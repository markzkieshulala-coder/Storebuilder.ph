"use client";

import { useEffect, useRef, useState } from "react";
import { Palette, X } from "lucide-react";
import { GeneratedWebsite } from "@/lib/ai/generate";

interface Props {
  website: GeneratedWebsite;
  onUpdateWebsite: (updates: Partial<GeneratedWebsite>) => void;
}

// In-canvas theme menu. Lives in the editor topbar so colors are reachable
// directly from the main editor without opening the right panel. Edits write
// to website.colors (global) or to the nav section's styles.background, both
// of which persist via the regular save flow (PATCH /api/websites/[id]).
export default function ThemeMenu({ website, onUpdateWebsite }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function setGlobalColor(key: "background" | "text" | "primary" | "accent" | "secondary", value: string) {
    onUpdateWebsite({ colors: { ...(website.colors || {} as any), [key]: value } } as any);
  }

  function setNavBackground(value: string) {
    const nav = website.sections.find((s) => s.type === "nav");
    if (!nav) return;
    const updated = website.sections.map((s) =>
      s.id === nav.id ? { ...s, styles: { ...(s.styles || {}), background: value } } : s
    );
    onUpdateWebsite({ sections: updated } as any);
  }

  function setSectionStyle(type: string, key: "background" | "color", value: string) {
    const target = website.sections.find((s) => s.type === type);
    if (!target) return;
    const updated = website.sections.map((s) =>
      s.id === target.id ? { ...s, styles: { ...(s.styles || {}), [key]: value } } : s
    );
    onUpdateWebsite({ sections: updated } as any);
  }

  const navSection = website.sections.find((s) => s.type === "nav");
  const footerSection = website.sections.find((s) => s.type === "footer");
  const navBg = (navSection?.styles?.background as string | undefined) || website.colors?.primary || "#1a1a2e";
  const footerBg = (footerSection?.styles?.background as string | undefined) || website.colors?.primary || "#1a1a2e";

  const rows: { key: string; label: string; value: string; apply: (v: string) => void }[] = [
    { key: "background", label: "Page background", value: website.colors?.background || "#0d0d1a", apply: (v) => setGlobalColor("background", v) },
    { key: "text",       label: "Text",            value: website.colors?.text || "#f5f0e8",      apply: (v) => setGlobalColor("text", v) },
    { key: "accent",     label: "Accent / Buttons", value: website.colors?.accent || "#c9a84c",   apply: (v) => setGlobalColor("accent", v) },
    { key: "primary",    label: "Section surface", value: website.colors?.primary || "#1a1a2e",   apply: (v) => setGlobalColor("primary", v) },
    { key: "navbar",     label: "Navbar / Header",  value: navBg,                                 apply: (v) => setNavBackground(v) },
    { key: "footer",     label: "Footer",           value: footerBg,                              apply: (v) => setSectionStyle("footer", "background", v) },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors ${
          open
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
        }`}
        title="Theme colors"
        aria-expanded={open}
      >
        <Palette size={13} />
        <span className="hidden md:inline">Theme</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
          style={{ animation: "fadeIn 0.12s ease-out" }}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-1.5">
              <Palette size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Site Colors</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="p-2 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {rows.map((row) => {
              const display = (row.value || "").slice(0, 7);
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs text-gray-700 font-medium truncate">{row.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">{display}</span>
                    <input
                      type="color"
                      value={display}
                      onChange={(e) => row.apply(e.target.value)}
                      className="w-7 h-7 rounded-md cursor-pointer border border-gray-200 bg-transparent"
                      style={{ padding: "2px" }}
                      title={row.label}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-500">
            Changes apply instantly. Click <span className="font-semibold">Save</span> in the topbar to persist.
          </div>
        </div>
      )}
    </div>
  );
}
