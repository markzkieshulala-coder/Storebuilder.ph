"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";
import { ImagePlus } from "lucide-react";

function GalleryImageTile({
  sectionId, index, url, caption, isEditable, isFirst, onImageUpload,
}: {
  sectionId: string;
  index: number;
  url: string;
  caption?: string;
  isEditable: boolean;
  isFirst: boolean;
  onImageUpload: (sectionId: string, field: string) => void;
}) {
  const drop = useImageDropZone(sectionId, `images.${index}.url`);
  return (
    <div
      className={`relative group rounded-xl overflow-hidden ${isFirst ? "sm:col-span-2 sm:row-span-2" : ""}`}
      {...(isEditable ? drop.handlers : {})}
      style={{ outline: drop.active ? "3px dashed #1877F2" : undefined, outlineOffset: drop.active ? "-3px" : undefined }}
    >
      <img
        src={url}
        alt={caption || ""}
        className="w-full h-full object-cover aspect-square hover:scale-105 transition-transform"
        style={{ maxWidth: "100%" }}
      />
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(sectionId, `images.${index}.url`); }}
          className={`absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium transition-opacity ${drop.active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          style={{ background: drop.active ? "rgba(24,119,242,0.92)" : "rgba(24,119,242,0.75)", color: "#fff", cursor: "pointer" }}
        >
          <ImagePlus size={16} /> {drop.active ? "Drop to replace" : "Replace image (or drop)"}
        </button>
      )}
    </div>
  );
}

export default function GallerySection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const images = d.images || [];
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
      className="relative py-14 px-4 sm:py-20 sm:px-6 lg:py-24 overflow-hidden"
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
      <div className="max-w-6xl mx-auto relative z-10">
        {(d.headline || isEditable) && (
          <EditableField
            {...fieldProps("headline")}
            tag="h2"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12"
            style={{ fontFamily: "var(--heading-font)", color: textColor }}
          >
            {d.headline}
          </EditableField>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {images.map((img: any, i: number) => {
            const url = typeof img === "string" ? img : img.url;
            const caption = typeof img === "string" ? "" : (img.caption || "");
            return (
              <GalleryImageTile
                key={i}
                sectionId={section.id}
                index={i}
                url={url}
                caption={caption}
                isEditable={isEditable}
                isFirst={i === 0}
                onImageUpload={onImageUpload}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
