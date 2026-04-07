"use client";

import { X, Type, Palette, Image } from "lucide-react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

interface Props {
  section: Section;
  website: GeneratedWebsite;
  onUpdate: (updates: Partial<{ data: any; styles: any }>) => void;
  onClose: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  nav: "Navigation", hero: "Hero", features: "Features", products: "Products",
  testimonials: "Testimonials", about: "About", footer: "Footer", newsletter: "Newsletter",
  pricing: "Pricing", faq: "FAQ", stats: "Stats", contact: "Contact",
  cta: "CTA Banner", team: "Team", gallery: "Gallery", process: "Process",
};

export default function PropertiesPanel({ section, website, onUpdate, onClose }: Props) {
  const d = section.data as any;

  function updateData(key: string, value: string) {
    onUpdate({ data: { ...section.data, [key]: value } });
  }

  function updateStyle(key: string, value: string) {
    onUpdate({ styles: { ...section.styles, [key]: value } });
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/6 shrink-0">
        <div>
          <p className="text-sm font-semibold">{SECTION_LABELS[section.type] || section.type}</p>
          <p className="text-xs text-white/30">Properties</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded-lg transition-colors text-white/40 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Background color */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            <Palette size={12} />
            Background
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={section.styles?.background?.startsWith("#") ? section.styles.background : website.colors?.background || "#0d0d1a"}
              onChange={(e) => updateStyle("background", e.target.value)}
              className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={section.styles?.background || ""}
              onChange={(e) => updateStyle("background", e.target.value)}
              placeholder="#000000 or gradient"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500/50 text-white/80 font-mono"
            />
          </div>
        </div>

        {/* Text color */}
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            <Type size={12} />
            Text Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={section.styles?.textColor || website.colors?.text || "#ffffff"}
              onChange={(e) => updateStyle("textColor", e.target.value)}
              className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={section.styles?.textColor || ""}
              onChange={(e) => updateStyle("textColor", e.target.value)}
              placeholder="#ffffff"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500/50 text-white/80 font-mono"
            />
          </div>
        </div>

        {/* Content editing — show editable fields based on section type */}
        {(section.type === "hero" || section.type === "cta") && (
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              <Type size={12} />
              Content
            </label>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Headline</label>
                <textarea
                  value={d.headline || ""}
                  onChange={(e) => updateData("headline", e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 text-white/80 resize-none"
                />
              </div>
              {d.subheadline !== undefined && (
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Subheadline</label>
                  <input
                    value={d.subheadline || ""}
                    onChange={(e) => updateData("subheadline", e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 text-white/80"
                  />
                </div>
              )}
              {d.description !== undefined && (
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Description</label>
                  <textarea
                    value={d.description || ""}
                    onChange={(e) => updateData("description", e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 text-white/80 resize-none"
                  />
                </div>
              )}
              {d.backgroundImage !== undefined && (
                <div>
                  <label className="flex items-center gap-1 text-xs text-white/40 mb-1">
                    <Image size={11} />
                    Background Image URL
                  </label>
                  <input
                    value={d.backgroundImage || ""}
                    onChange={(e) => updateData("backgroundImage", e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-violet-500/50 text-white/80 font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {(section.type === "features" || section.type === "about" || section.type === "stats" || section.type === "newsletter") && (
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              <Type size={12} />
              Headline
            </label>
            <textarea
              value={d.headline || ""}
              onChange={(e) => updateData("headline", e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 text-white/80 resize-none"
            />
          </div>
        )}

        {section.type === "nav" && (
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 block">Logo Text</label>
            <input
              value={d.logo || ""}
              onChange={(e) => updateData("logo", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 text-white/80"
            />
          </div>
        )}
      </div>
    </div>
  );
}
