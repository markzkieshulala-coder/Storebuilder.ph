"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";
import { ImagePlus } from "lucide-react";

export default function CTASection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || `linear-gradient(135deg, ${website.colors?.primary || "#1a1a2e"}, #2d1b4e)`;
  const {
    isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();
  const bgDrop = useImageDropZone(section.id, "backgroundImage");

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  const fieldProps = (field: string) => ({
    sectionId: section.id, field,
    editor: getEditorState(section.id, field),
    isEditable, selected: isSelected(field),
    onSelect: onSelectField, onUpdateEditor, onResetEditor,
    onTextChange, onShowToolbar,
    textColor, bgColor: bg, accentColor: accent,
  });

  return (
    <section
      className="relative py-14 px-4 sm:py-20 sm:px-6 lg:py-24 text-center overflow-hidden"
      style={{ background: bg }}
      onClick={() => isEditable && onSectionClick(section.id)}
      {...(isEditable ? bgDrop.handlers : {})}
    >
      {d.backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${d.backgroundImage})` }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
        </>
      )}
      {isEditable && bgDrop.active && (
        <div
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
          style={{ background: "rgba(24,119,242,0.18)", border: "3px dashed #1877F2" }}
        >
          <div className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2">
            <ImagePlus size={15} /> Drop image to set as background
          </div>
        </div>
      )}
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "backgroundImage"); }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(24,119,242,0.9)", color: "#fff", cursor: "pointer" }}
        >
          <ImagePlus size={13} /> Change background <span className="opacity-70 ml-1">or drop</span>
        </button>
      )}
      <div className="max-w-2xl mx-auto relative z-10">
        <EditableField
          {...fieldProps("headline")}
          tag="h2"
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
        >
          {d.headline}
        </EditableField>

        {d.subheadline !== undefined && (
          <EditableField
            {...fieldProps("subheadline")}
            tag="p"
            className="text-sm sm:text-base lg:text-lg opacity-70 mb-7 sm:mb-8"
            style={{ color: textColor }}
          >
            {d.subheadline}
          </EditableField>
        )}

        {d.ctaText && (
          <a
            href={isEditable ? undefined : (d.ctaHref || "#")}
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-xl font-semibold text-base transition-opacity hover:opacity-80 min-h-[52px]"
            style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
          >
            <EditableField
              {...fieldProps("ctaText")}
              tag="span"
            >
              {d.ctaText}
            </EditableField>
          </a>
        )}
      </div>
    </section>
  );
}
