"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";

export default function CTASection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || `linear-gradient(135deg, ${website.colors?.primary || "#1a1a2e"}, #2d1b4e)`;
  const { isEditable, onTextChange, onSectionClick, onShowToolbar } = useEditor();

  function showToolbar(e: React.FocusEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onShowToolbar({ sectionId: section.id, textColor, bgColor: bg, accentColor: accent, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
  }

  const editableProps = (field: string) => isEditable ? {
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onTextChange(section.id, field, e.currentTarget.innerText),
    onFocus: showToolbar,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    style: { outline: "none", cursor: "text" },
  } : {};

  return (
    <section className="py-20 px-6 text-center" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--heading-font)", color: textColor }} {...editableProps("headline")}>
          {d.headline}
        </h2>
        {d.subheadline !== undefined && (
          <p className="text-lg opacity-70 mb-8" style={{ color: textColor }} {...editableProps("subheadline")}>
            {d.subheadline}
          </p>
        )}
        {d.ctaText && (
          <a href={isEditable ? undefined : (d.ctaHref || "#")} className="inline-block px-8 py-4 rounded-xl font-semibold text-lg transition-opacity hover:opacity-80" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
            {d.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
