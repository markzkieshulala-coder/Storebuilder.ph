"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";
import { ImagePlus } from "lucide-react";

function TeamMemberAvatar({
  sectionId, index, image, name, accent, textColor, isEditable, onImageUpload,
}: {
  sectionId: string;
  index: number;
  image?: string;
  name?: string;
  accent: string;
  textColor: string;
  isEditable: boolean;
  onImageUpload: (sectionId: string, field: string) => void;
}) {
  const drop = useImageDropZone(sectionId, `members.${index}.image`);
  return (
    <div
      className="relative inline-block mb-3 sm:mb-4"
      {...(isEditable ? drop.handlers : {})}
      style={{ outline: drop.active ? "3px dashed #1877F2" : undefined, outlineOffset: drop.active ? "4px" : undefined, borderRadius: 9999 }}
    >
      {image && (
        <img
          src={image}
          alt={name}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto border-2"
          style={{ borderColor: `${accent}40`, maxWidth: "100%" }}
        />
      )}
      {!image && (
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto border-2 flex items-center justify-center"
          style={{ borderColor: `${accent}40`, background: `${accent}15`, color: textColor }}
        >
          {name?.charAt(0) || "?"}
        </div>
      )}
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(sectionId, `members.${index}.image`); }}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "#1877F2", color: "#fff" }}
          title={drop.active ? "Drop image to replace" : "Click or drop image to replace"}
        >
          <ImagePlus size={13} />
        </button>
      )}
    </div>
  );
}

export default function TeamSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onNestedTextChange, onImageUpload, onSectionClick, onShowToolbar,
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
      <div className="max-w-5xl mx-auto relative z-10">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(d.members || []).map((m: any, i: number) => (
            <div key={i} className="text-center p-5 sm:p-6 rounded-2xl border" style={{ background: `${accent}06`, borderColor: `${accent}15` }}>
              <TeamMemberAvatar
                sectionId={section.id}
                index={i}
                image={m.image}
                name={m.name}
                accent={accent}
                textColor={textColor}
                isEditable={isEditable}
                onImageUpload={onImageUpload}
              />
              <h3
                className="font-bold text-base sm:text-lg"
                style={{ color: textColor, fontFamily: "var(--heading-font)", outline: "none", cursor: isEditable ? "text" : undefined }}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => isEditable && onNestedTextChange(section.id, "members", i, "name", e.currentTarget.innerText)}
                onClick={(e) => isEditable && e.stopPropagation()}
              >
                {m.name}
              </h3>
              <p
                className="text-xs sm:text-sm mb-2"
                style={{ color: accent, outline: "none", cursor: isEditable ? "text" : undefined }}
                contentEditable={isEditable}
                suppressContentEditableWarning
                onBlur={(e) => isEditable && onNestedTextChange(section.id, "members", i, "role", e.currentTarget.innerText)}
                onClick={(e) => isEditable && e.stopPropagation()}
              >
                {m.role}
              </p>
              {(m.bio || isEditable) && (
                <p
                  className="text-xs opacity-60 leading-relaxed"
                  style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => isEditable && onNestedTextChange(section.id, "members", i, "bio", e.currentTarget.innerText)}
                  onClick={(e) => isEditable && e.stopPropagation()}
                >
                  {m.bio}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
