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
  } : {};

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24 text-center" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-2xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
          {...editableProps("headline")}
        >
          {d.headline}
        </h2>
        {d.subheadline !== undefined && (
          <p
            className="text-sm sm:text-base lg:text-lg opacity-70 mb-7 sm:mb-8"
            style={{ color: textColor }}
            {...editableProps("subheadline")}
          >
            {d.subheadline}
          </p>
        )}
        {d.ctaText && (
          <a
            href={isEditable ? undefined : (d.ctaHref || "#")}
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-80 min-h-[52px]"
            style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
          >
            {d.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
