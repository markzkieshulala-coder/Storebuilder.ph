"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function NavSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const bg = section.styles?.background || "transparent";
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = website.colors?.secondary || "#c9a84c";
  const {
    isEditable, onTextChange, onNestedTextChange, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  const fieldProps = (field: string) => ({
    sectionId: section.id, field,
    editor: getEditorState(section.id, field),
    isEditable, selected: isSelected(field),
    onSelect: onSelectField, onUpdateEditor, onResetEditor,
    onTextChange, onShowToolbar,
    textColor, bgColor: bg === "transparent" ? "rgba(0,0,0,0.75)" : bg, accentColor: accent,
  });

  const editableLink = (label: string, i: number, className: string, onClickAfter?: () => void) => (
    <span
      className={className}
      style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : "pointer" }}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={(e) => isEditable && onNestedTextChange(section.id, "links", i, "label", e.currentTarget.innerText)}
      onClick={(e) => {
        if (isEditable) { e.stopPropagation(); return; }
        onClickAfter?.();
      }}
    >
      {label}
    </span>
  );

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      style={{ background: bg === "transparent" ? "rgba(0,0,0,0.75)" : bg, backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      onClick={() => isEditable && onSectionClick(section.id)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 sm:flex-none">
          <EditableField
            {...fieldProps("logo")}
            tag="span"
            className="text-base sm:text-xl font-bold tracking-wide block truncate"
            style={{ fontFamily: "var(--heading-font)", color: accent }}
          >
            {d.logo || website.name}
          </EditableField>
          {d.logoSubtext && <span className="hidden sm:inline ml-2 text-xs opacity-40" style={{ color: textColor }}>{d.logoSubtext}</span>}
        </div>

        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {(d.links || []).map((link: any, i: number) => (
            <a key={i} href={isEditable ? undefined : link.href}
              className="text-sm opacity-70 hover:opacity-100 transition-opacity whitespace-nowrap"
              style={{ color: textColor }}
              onClick={(e) => isEditable && e.preventDefault()}>
              {editableLink(link.label, i, "")}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {d.showCart && (
            <button className="p-2 opacity-70 hover:opacity-100" style={{ color: textColor }}>
              <ShoppingCart size={18} />
            </button>
          )}
          {d.ctaText && (
            <a href={isEditable ? undefined : (d.ctaHref || "#")}
              className="hidden md:inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-opacity whitespace-nowrap"
              style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
              <EditableField
                {...fieldProps("ctaText")}
                tag="span"
              >
                {d.ctaText}
              </EditableField>
            </a>
          )}
          <button
            className="md:hidden p-2 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
            style={{ color: textColor }}
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t" style={{ background: website.colors?.primary || "#1a1a2e", borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="px-4 pb-4">
            {(d.links || []).map((link: any, i: number) => (
              <a key={i} href={link.href}
                className="flex items-center min-h-[48px] text-sm opacity-70 hover:opacity-100 border-b transition-opacity"
                style={{ color: textColor, borderColor: "rgba(255,255,255,0.06)" }}
                onClick={(e) => { if (!isEditable) setMenuOpen(false); else e.preventDefault(); }}>
                {editableLink(link.label, i, "")}
              </a>
            ))}
            {d.ctaText && (
              <a href={d.ctaHref || "#"}
                className="flex items-center justify-center mt-4 min-h-[48px] rounded-xl text-sm font-semibold"
                style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
                onClick={() => setMenuOpen(false)}>
                {d.ctaText}
              </a>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
