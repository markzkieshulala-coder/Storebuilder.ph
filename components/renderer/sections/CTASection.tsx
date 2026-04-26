"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function CTASection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || `linear-gradient(135deg, ${website.colors?.primary || "#1a1a2e"}, #2d1b4e)`;
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
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24 text-center" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-2xl mx-auto">
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
            {d.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
