"use client";
import { X } from "lucide-react";
import { FloatingToolbarTarget } from "./EditorContext";
import { GeneratedWebsite } from "@/lib/ai/generate";

const FONTS = [
  "Playfair Display", "DM Serif Display", "Cormorant Garamond",
  "Syne", "Bricolage Grotesque", "Inter", "Poppins", "Raleway",
  "Montserrat", "Outfit", "Space Grotesk", "Open Sans",
];

interface Props {
  target: FloatingToolbarTarget;
  website: GeneratedWebsite;
  onUpdateStyle: (sectionId: string, key: string, value: string) => void;
  onUpdateGlobal: (updates: Partial<GeneratedWebsite>) => void;
  onClose: () => void;
}

function safeHex(val: string, fallback: string): string {
  if (!val) return fallback;
  const trimmed = val.trim();
  return trimmed.startsWith("#") && trimmed.length >= 4 ? trimmed.slice(0, 7) : fallback;
}

export default function FloatingToolbar({ target, website, onUpdateStyle, onUpdateGlobal, onClose }: Props) {
  const TOOLBAR_W = 500;
  const TOOLBAR_H = 52;
  const GAP = 10;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const top = Math.max(8, target.rect.top - TOOLBAR_H - GAP);
  const left = Math.min(vw - TOOLBAR_W - 8, Math.max(8, target.rect.left + target.rect.width / 2 - TOOLBAR_W / 2));

  const headingFont = website.fonts?.heading || "Playfair Display";

  return (
    <div
      id="floating-toolbar"
      className="fixed z-[9999] flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{
        top,
        left,
        width: TOOLBAR_W,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      {/* Heading font */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">Font</span>
        <select
          value={headingFont}
          onChange={(e) => onUpdateGlobal({ fonts: { ...website.fonts, heading: e.target.value } })}
          className="flex-1 min-w-0 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
          style={{ fontFamily: headingFont }}
        >
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Text color */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold text-gray-500 select-none">A</span>
        <div className="relative">
          <input
            type="color"
            value={safeHex(target.textColor, "#ffffff")}
            onChange={(e) => onUpdateStyle(target.sectionId, "textColor", e.target.value)}
            className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 bg-transparent"
            style={{ padding: "2px" }}
            title="Text color"
          />
        </div>
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Background color */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-gray-400 select-none">BG</span>
        <input
          type="color"
          value={safeHex(target.bgColor, "#0d0d1a")}
          onChange={(e) => onUpdateStyle(target.sectionId, "background", e.target.value)}
          className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 bg-transparent"
          style={{ padding: "2px" }}
          title="Background color"
        />
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Accent color */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-gray-400 select-none">Accent</span>
        <input
          type="color"
          value={safeHex(target.accentColor, "#c9a84c")}
          onChange={(e) => onUpdateStyle(target.sectionId, "accentColor", e.target.value)}
          className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200 bg-transparent"
          style={{ padding: "2px" }}
          title="Accent color"
        />
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
