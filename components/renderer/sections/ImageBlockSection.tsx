"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";
import { ImagePlus } from "lucide-react";

export default function ImageBlockSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#0F172A";
  const accent = section.styles?.accentColor || website.colors?.accent || "#0F172A";
  const bg = section.styles?.background || website.colors?.background || "#FFFFFF";
  const {
    isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();
  const drop = useImageDropZone(section.id, "image");

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  return (
    <section
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8"
      style={{ background: bg, color: textColor }}
      onClick={() => isEditable && onSectionClick(section.id)}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="relative aspect-[16/9] sm:aspect-[16/9] rounded-lg overflow-hidden bg-black/5"
          {...(isEditable ? drop.handlers : {})}
          style={{ outline: drop.active ? "3px dashed #1877F2" : undefined, outlineOffset: drop.active ? "-3px" : undefined }}
        >
          {d.image ? (
            <img src={d.image} alt={d.caption || ""} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
              <ImagePlus size={32} />
              <span className="text-xs">Click to add image</span>
            </div>
          )}
          {isEditable && (
            <button
              onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "image"); }}
              className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium opacity-0 hover:opacity-100 transition-opacity"
              style={{ background: "rgba(24,119,242,0.85)", color: "#fff" }}
            >
              <ImagePlus size={16} /> {d.image ? "Replace image (or drop)" : "Upload image (or drop)"}
            </button>
          )}
        </div>
        {d.caption !== undefined && (
          <EditableField
            sectionId={section.id} field="caption"
            editor={getEditorState(section.id, "caption")}
            isEditable={isEditable} selected={isSelected("caption")}
            onSelect={onSelectField} onUpdateEditor={onUpdateEditor} onResetEditor={onResetEditor}
            onTextChange={onTextChange} onShowToolbar={onShowToolbar}
            textColor={textColor} bgColor={bg} accentColor={accent}
            tag="p"
            className="mt-3 text-sm text-center opacity-60"
            style={{ color: textColor }}
          >
            {d.caption}
          </EditableField>
        )}
      </div>
    </section>
  );
}
