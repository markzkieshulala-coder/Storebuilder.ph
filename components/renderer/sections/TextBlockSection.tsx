"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function TextBlockSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#0F172A";
  const accent = section.styles?.accentColor || website.colors?.accent || "#0F172A";
  const bg = section.styles?.background || website.colors?.background || "#FFFFFF";
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
    <section
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      style={{ background: bg, color: textColor }}
      onClick={() => isEditable && onSectionClick(section.id)}
    >
      <div className="max-w-3xl mx-auto">
        {d.heading !== undefined && (
          <EditableField
            {...fieldProps("heading")}
            tag="h2"
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 leading-tight"
            style={{ fontFamily: "var(--heading-font)", color: textColor }}
          >
            {d.heading}
          </EditableField>
        )}
        {d.body !== undefined && (
          <EditableField
            {...fieldProps("body")}
            tag="p"
            className="text-base sm:text-lg leading-relaxed opacity-80 whitespace-pre-line"
            style={{ color: textColor }}
          >
            {d.body}
          </EditableField>
        )}
      </div>
    </section>
  );
}
