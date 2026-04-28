"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { ImagePlus } from "lucide-react";

export default function ProcessSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onNestedTextChange, onImageUpload, onSectionClick, onShowToolbar,
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
    textColor, bgColor: bg, accentColor: accent,
  });

  return (
    <section className="relative py-14 px-4 sm:py-20 sm:px-6 lg:py-24 overflow-hidden" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      {d.backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${d.backgroundImage})` }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
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
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
          <EditableField
            {...fieldProps("headline")}
            tag="h2"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3"
            style={{ fontFamily: "var(--heading-font)", color: textColor }}
          >
            {d.headline}
          </EditableField>
          {d.subheadline !== undefined && (
            <EditableField
              {...fieldProps("subheadline")}
              tag="p"
              className="text-sm sm:text-base opacity-60"
              style={{ color: textColor }}
            >
              {d.subheadline}
            </EditableField>
          )}
        </div>
        <div className="space-y-5 sm:space-y-8">
          {(d.steps || []).map((step: any, i: number) => (
            <div key={i} className="flex gap-4 sm:gap-6 items-start">
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
              >
                {i + 1}
              </div>
              <div className="pt-0.5 min-w-0 flex-1">
                <h3
                  className="font-bold text-base sm:text-lg mb-1"
                  style={{ fontFamily: "var(--heading-font)", color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, "steps", i, "title", e.currentTarget.innerText)}
                  onClick={(e) => isEditable && e.stopPropagation()}
                >
                  {step.title}
                </h3>
                <p
                  className="text-xs sm:text-sm opacity-60 leading-relaxed"
                  style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, "steps", i, "description", e.currentTarget.innerText)}
                  onClick={(e) => isEditable && e.stopPropagation()}
                >
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
