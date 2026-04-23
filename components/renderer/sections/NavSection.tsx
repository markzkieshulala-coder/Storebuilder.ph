"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/components/editor/EditorContext";

export default function NavSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const bg = section.styles?.background || "transparent";
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = website.colors?.secondary || "#c9a84c";
  const { isEditable, onTextChange, onSectionClick } = useEditor();

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: bg === "transparent" ? "rgba(0,0,0,0.7)" : bg, backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      onClick={() => isEditable && onSectionClick(section.id)}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <span
            className="text-xl font-bold tracking-wider"
            style={{ fontFamily: "var(--heading-font)", color: accent }}
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={(e) => isEditable && onTextChange(section.id, "logo", e.currentTarget.innerText)}
            onClick={(e) => isEditable && e.stopPropagation()}
          >
            {d.logo || website.name}
          </span>
          {d.logoSubtext && <span className="ml-2 text-xs opacity-40" style={{ color: textColor }}>{d.logoSubtext}</span>}
        </div>

        <div className="hidden md:flex items-center gap-8">
          {(d.links || []).map((link: any) => (
            <a key={link.label} href={isEditable ? undefined : link.href} className="text-sm opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {d.showCart && (
            <button className="relative p-2 opacity-70 hover:opacity-100" style={{ color: textColor }}>
              <ShoppingCart size={20} />
            </button>
          )}
          {d.ctaText && (
            <a href={isEditable ? undefined : (d.ctaHref || "#")} className="hidden md:block px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
              {d.ctaText}
            </a>
          )}
          <button className="md:hidden p-2" style={{ color: textColor }} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden px-6 pb-4 border-t border-white/5" style={{ background: website.colors?.primary || "#1a1a2e" }}>
          {(d.links || []).map((link: any) => (
            <a key={link.label} href={link.href} className="block py-3 text-sm opacity-70 hover:opacity-100 border-b border-white/5" style={{ color: textColor }}>
              {link.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
