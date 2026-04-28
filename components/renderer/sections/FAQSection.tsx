"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ChevronDown, ImagePlus } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function FAQSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [open, setOpen] = useState<number | null>(null);
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

  const items = d.faqs || d.items || [];
  const arrayKey = d.faqs ? "faqs" : "items";
  const questionKey = items[0]?.question !== undefined ? "question" : "q";
  const answerKey = items[0]?.answer !== undefined ? "answer" : "a";

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
      <div className="max-w-2xl mx-auto relative z-10">
        <EditableField
          {...fieldProps("headline")}
          tag="h2"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 lg:mb-12"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
        >
          {d.headline || "Frequently Asked Questions"}
        </EditableField>
        <div className="space-y-2">
          {items.map((item: any, i: number) => (
            <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: `${accent}20` }}>
              <div
                className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-h-[56px]"
                style={{ color: textColor }}
              >
                <span
                  className="font-medium text-sm sm:text-base flex-1"
                  style={{ outline: "none", cursor: isEditable ? "text" : "pointer" }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, arrayKey, i, questionKey, e.currentTarget.innerText)}
                  onClick={(e) => {
                    if (isEditable) { e.stopPropagation(); return; }
                    setOpen(open === i ? null : i);
                  }}
                >
                  {item.question || item.q}
                </span>
                {!isEditable && (
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="shrink-0"
                    aria-label="Toggle"
                  >
                    <ChevronDown size={18} className={`opacity-50 transition-transform ${open === i ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>
              {(open === i || isEditable) && (
                <div
                  className="px-4 sm:px-6 pb-4 text-xs sm:text-sm opacity-60 leading-relaxed"
                  style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, arrayKey, i, answerKey, e.currentTarget.innerText)}
                  onClick={(e) => isEditable && e.stopPropagation()}
                >
                  {item.answer || item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
