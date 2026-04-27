"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function ProcessSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onSectionClick, onShowToolbar,
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
      <div className="max-w-3xl mx-auto">
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
              <div className="pt-0.5 min-w-0">
                <h3 className="font-bold text-base sm:text-lg mb-1" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{step.title}</h3>
                <p className="text-xs sm:text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
