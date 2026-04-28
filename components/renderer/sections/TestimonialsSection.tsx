"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Star, Quote, ImagePlus } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function TestimonialsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
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
      <div className="max-w-6xl mx-auto relative z-10">
        <EditableField
          {...fieldProps("headline")}
          tag="h2"
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 sm:mb-14 lg:mb-16"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
        >
          {d.headline}
        </EditableField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {(d.testimonials || []).map((t: any, i: number) => (
            <div key={i} className="p-5 sm:p-6 rounded-2xl border" style={{ background: `${accent}08`, borderColor: `${accent}15` }}>
              <Quote size={24} className="mb-3 sm:mb-4 opacity-30" style={{ color: accent }} />
              <p
                className="text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 opacity-80"
                style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => isEditable && onNestedTextChange(section.id, "testimonials", i, "text", e.currentTarget.innerText)}
                onClick={(e) => isEditable && e.stopPropagation()}
              >
                {t.text}
              </p>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {t.image && <img src={t.image} alt={t.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover" />}
                  {!t.image && (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center" style={{ background: `${accent}25`, color: textColor }}>
                      {t.name?.charAt(0) || "?"}
                    </div>
                  )}
                  {isEditable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, `testimonials.${i}.image`); }}
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: "#1877F2", color: "#fff" }}
                      title="Replace photo"
                    >
                      <ImagePlus size={9} />
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-bold text-sm truncate"
                    style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => isEditable && onNestedTextChange(section.id, "testimonials", i, "name", e.currentTarget.innerText)}
                    onClick={(e) => isEditable && e.stopPropagation()}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-xs opacity-50 truncate"
                    style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => isEditable && onNestedTextChange(section.id, "testimonials", i, "location", e.currentTarget.innerText)}
                    onClick={(e) => isEditable && e.stopPropagation()}
                  >
                    {t.location}
                  </div>
                </div>
                <div className="ml-auto flex gap-0.5 shrink-0">
                  {[...Array(t.rating || 5)].map((_, j) => <Star key={j} size={12} className="fill-current" style={{ color: accent }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
