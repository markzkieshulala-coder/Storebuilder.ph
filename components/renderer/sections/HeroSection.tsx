"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import { ImagePlus } from "lucide-react";

export default function HeroSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const { isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar } = useEditor();

  function showToolbar(e: React.FocusEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onShowToolbar({ sectionId: section.id, textColor, bgColor: bg, accentColor: accent, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
  }

  const editableProps = (field: string) => isEditable ? {
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onTextChange(section.id, field, e.currentTarget.innerText),
    onFocus: showToolbar,
    style: { outline: "none", cursor: "text" },
  } : {};

  return (
    <section
      className="relative flex items-center justify-center text-center overflow-hidden"
      style={{ minHeight: section.styles?.minHeight || "100vh", background: bg }}
      onClick={() => isEditable && onSectionClick(section.id)}
    >
      {d.backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${d.backgroundImage})` }} />
          <div className="absolute inset-0" style={{ background: d.overlay || "rgba(0,0,0,0.55)" }} />
        </>
      )}

      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "backgroundImage"); }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(24,119,242,0.9)", color: "#fff", border: "none", cursor: "pointer" }}
        >
          <ImagePlus size={13} /> Change background
        </button>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-24 w-full">
        {d.badge && (
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border" style={{ borderColor: `${accent}40`, color: accent, background: `${accent}15` }}>
            {d.badge}
          </div>
        )}

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight" style={{ fontFamily: "var(--heading-font)", color: textColor }} {...editableProps("headline")}>
          {d.headline}
        </h1>

        {d.subheadline !== undefined && (
          <h2 className="text-lg sm:text-xl md:text-2xl font-medium mb-4 opacity-80" style={{ color: textColor }} {...editableProps("subheadline")}>
            {d.subheadline}
          </h2>
        )}

        {d.description !== undefined && (
          <p className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-10 opacity-60 leading-relaxed" style={{ color: textColor }} {...editableProps("description")}>
            {d.description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {d.ctaPrimary && (
            <a href={isEditable ? undefined : (d.ctaPrimary.href || "#")} className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-opacity hover:opacity-90 text-center" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
              <span {...editableProps("ctaPrimary.text")}>{d.ctaPrimary.text}</span>
            </a>
          )}
          {d.ctaSecondary && (
            <a href={isEditable ? undefined : (d.ctaSecondary.href || "#")} className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg border transition-colors hover:bg-white/5 text-center" style={{ borderColor: `${textColor}30`, color: textColor }}>
              <span {...editableProps("ctaSecondary.text")}>{d.ctaSecondary.text}</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
