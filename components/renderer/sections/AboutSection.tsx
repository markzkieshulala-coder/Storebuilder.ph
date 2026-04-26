"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { ImagePlus } from "lucide-react";

export default function AboutSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar,
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
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {(d.image || isEditable) && (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] w-full">
              {d.image && <img src={d.image} alt={d.headline} className="w-full h-full object-cover" style={{ maxWidth: "100%" }} />}
              {isEditable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "image"); }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: d.image ? "rgba(0,0,0,0.45)" : "rgba(24,119,242,0.1)", color: d.image ? "#fff" : "#1877F2", border: d.image ? "none" : "2px dashed #1877F2", cursor: "pointer" }}
                >
                  <ImagePlus size={22} />
                  {d.image ? "Replace image" : "Upload image"}
                </button>
              )}
            </div>
          )}
          <div>
            <EditableField
              {...fieldProps("headline")}
              tag="h2"
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6"
              style={{ fontFamily: "var(--heading-font)", color: textColor }}
            >
              {d.headline}
            </EditableField>

            <EditableField
              {...fieldProps("story")}
              tag="div"
              className="text-sm sm:text-base leading-relaxed opacity-70 whitespace-pre-line mb-6 sm:mb-8"
              style={{ color: textColor }}
            >
              {d.story}
            </EditableField>

            {d.stats && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {d.stats.map((s: any, i: number) => (
                  <div key={i} className="p-3 sm:p-4 rounded-xl" style={{ background: `${accent}12` }}>
                    <div className="text-xl sm:text-2xl font-bold" style={{ color: accent, fontFamily: "var(--heading-font)" }}>{s.value}</div>
                    <div className="text-xs sm:text-sm opacity-60 mt-0.5" style={{ color: textColor }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
