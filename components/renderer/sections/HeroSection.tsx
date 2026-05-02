"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { ImagePlus } from "lucide-react";

export default function HeroSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const {
    isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  return (
    <section
      className="relative flex items-center justify-center text-center overflow-hidden"
      style={{ minHeight: "100svh", background: bg }}
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
          style={{ background: "rgba(24,119,242,0.9)", color: "#fff", cursor: "pointer" }}
        >
          <ImagePlus size={13} /> Change background
        </button>
      )}

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-8 py-16 sm:py-24 lg:py-32">
        {d.badge && (
          <div className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold mb-5 border" style={{ borderColor: `${accent}40`, color: accent, background: `${accent}15` }}>
            {d.badge}
          </div>
        )}

        <EditableField
          sectionId={section.id} field="headline"
          editor={getEditorState(section.id, "headline")}
          isEditable={isEditable} selected={isSelected("headline")}
          onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
          onTextChange={onTextChange} onShowToolbar={onShowToolbar}
          textColor={textColor} bgColor={bg} accentColor={accent}
          tag="h1"
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
        >
          {d.headline}
        </EditableField>

        {d.subheadline !== undefined && (
          <EditableField
            sectionId={section.id} field="subheadline"
            editor={getEditorState(section.id, "subheadline")}
            isEditable={isEditable} selected={isSelected("subheadline")}
            onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
            onTextChange={onTextChange} onShowToolbar={onShowToolbar}
            textColor={textColor} bgColor={bg} accentColor={accent}
            tag="h2"
            className="text-base sm:text-xl md:text-2xl font-medium mb-3 sm:mb-4 opacity-80"
            style={{ color: textColor }}
          >
            {d.subheadline}
          </EditableField>
        )}

        {d.description !== undefined && (
          <EditableField
            sectionId={section.id} field="description"
            editor={getEditorState(section.id, "description")}
            isEditable={isEditable} selected={isSelected("description")}
            onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
            onTextChange={onTextChange} onShowToolbar={onShowToolbar}
            textColor={textColor} bgColor={bg} accentColor={accent}
            tag="p"
            className="text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 opacity-60 leading-relaxed"
            style={{ color: textColor }}
          >
            {d.description}
          </EditableField>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          {d.ctaPrimary && (
            <a
              href={isEditable ? undefined : (d.ctaPrimary.href || "#")}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 text-center"
              style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
            >
              <EditableField
                sectionId={section.id} field="ctaPrimary.text"
                editor={getEditorState(section.id, "ctaPrimary.text")}
                isEditable={isEditable} selected={isSelected("ctaPrimary.text")}
                onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
                onTextChange={onTextChange} onShowToolbar={onShowToolbar}
                textColor={textColor} bgColor={bg} accentColor={accent}
                tag="span"
              >
                {d.ctaPrimary.text}
              </EditableField>
            </a>
          )}
          {d.ctaSecondary && (
            <a
              href={isEditable ? undefined : (d.ctaSecondary.href || "#")}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-semibold text-base border transition-colors hover:bg-white/5 text-center"
              style={{ borderColor: `${textColor}30`, color: textColor }}
            >
              <EditableField
                sectionId={section.id} field="ctaSecondary.text"
                editor={getEditorState(section.id, "ctaSecondary.text")}
                isEditable={isEditable} selected={isSelected("ctaSecondary.text")}
                onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
                onTextChange={onTextChange} onShowToolbar={onShowToolbar}
                textColor={textColor} bgColor={bg} accentColor={accent}
                tag="span"
              >
                {d.ctaSecondary.text}
              </EditableField>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
