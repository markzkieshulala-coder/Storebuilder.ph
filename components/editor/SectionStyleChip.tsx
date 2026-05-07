"use client";

import { useEffect, useRef, useState } from "react";
import { Paintbrush, X } from "lucide-react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

interface Props {
  section: Section;
  website: GeneratedWebsite;
  onUpdate: (sectionId: string, key: string, value: string) => void;
  // Whether the chip is in a hover-revealed state. The chip itself is always
  // mounted but only paints when visible to keep the DOM cheap.
  visible: boolean;
}

function safeHex(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  return trimmed.startsWith("#") && trimmed.length >= 7 ? trimmed.slice(0, 7) : fallback;
}

// A small "paint bucket" chip that floats in the top-right of a section while
// hovered. Clicking it opens a popover with background / text / accent colour
// pickers scoped to THIS section — so users can change any section's colours
// directly on the canvas, without going through the topbar Theme menu.
export default function SectionStyleChip({ section, website, onUpdate, visible }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // If the chip is hidden AND the popover is closed, don't paint at all.
  // Once the popover is open we keep it visible even if the user moves the
  // cursor off the section — closing happens on click-outside.
  if (!visible && !open) return null;

  const bg = safeHex(section.styles?.background as string | undefined, website.colors?.background || "#0d0d1a");
  const text = safeHex(section.styles?.textColor as string | undefined, website.colors?.text || "#ffffff");
  const accent = safeHex(section.styles?.accentColor as string | undefined, website.colors?.accent || "#c9a84c");

  return (
    <div
      ref={ref}
      className="absolute top-2 right-2 z-[60]"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Section colours"
        className={`flex items-center gap-1 rounded-full text-xs font-semibold transition-all ${
          open
            ? "bg-blue-600 text-white px-3 py-1.5 shadow-lg"
            : "bg-white/95 backdrop-blur text-gray-700 px-2.5 py-1.5 shadow-md hover:bg-white"
        }`}
        style={{
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: open ? "0 6px 20px rgba(24,119,242,0.4)" : "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <Paintbrush size={12} />
        <span>Colours</span>
      </button>

      {open && (
        <div
          className="absolute top-9 right-0 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              Section · {section.type}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-2 space-y-1.5">
            {[
              { key: "background", label: "Background", value: bg },
              { key: "textColor",  label: "Text",       value: text },
              { key: "accentColor", label: "Accent",    value: accent },
            ].map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-700 font-medium truncate">{row.label}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-gray-400 font-mono uppercase">{row.value}</span>
                  <input
                    type="color"
                    value={row.value}
                    onChange={(e) => onUpdate(section.id, row.key, e.target.value)}
                    className="w-7 h-7 rounded-md cursor-pointer border border-gray-200 bg-transparent"
                    style={{ padding: "2px" }}
                    title={row.label}
                  />
                </div>
              </div>
            ))}
            {/* Reset to default — clears section override so it falls back to website.colors */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(section.id, "background", "");
                onUpdate(section.id, "textColor", "");
                onUpdate(section.id, "accentColor", "");
              }}
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Reset to site theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
