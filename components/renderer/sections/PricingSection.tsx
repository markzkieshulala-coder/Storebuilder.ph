"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Check, ImagePlus } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function PricingSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
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

  const editableNested = (field: string, i: number, key: string, value: string, className: string, style: React.CSSProperties) => (
    <span
      className={className}
      style={{ ...style, outline: "none", cursor: isEditable ? "text" : undefined }}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={(e) => isEditable && onNestedTextChange(section.id, "plans", i, key, e.currentTarget.innerText)}
      onClick={(e) => isEditable && e.stopPropagation()}
    >
      {value}
    </span>
  );

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
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-10 sm:mb-14 lg:mb-16">
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
              className="text-sm sm:text-base opacity-60"
              style={{ color: textColor }}
            >
              {d.subheadline}
            </EditableField>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(d.plans || []).map((plan: any, i: number) => (
            <div key={i} className="p-5 sm:p-7 rounded-2xl border flex flex-col" style={plan.popular ? { borderColor: accent, background: `${accent}08` } : { borderColor: `${accent}20`, background: `${accent}04` }}>
              {plan.popular && (
                <div className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block self-start" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                  POPULAR
                </div>
              )}
              {editableNested("plans", i, "name", plan.name || "", "text-lg sm:text-xl font-bold mb-2 block", { color: textColor, fontFamily: "var(--heading-font)" })}
              <div className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: accent }}>
                {editableNested("plans", i, "price", plan.price || "", "", { color: accent })}
                <span className="text-base font-normal opacity-50 ml-1" style={{ color: textColor }}>
                  {editableNested("plans", i, "period", plan.period || "", "", { color: textColor })}
                </span>
              </div>
              {plan.description !== undefined && (
                editableNested("plans", i, "description", plan.description, "text-xs sm:text-sm opacity-60 mb-5 sm:mb-6 mt-1 block", { color: textColor })
              )}
              <ul className="space-y-2.5 sm:space-y-3 mb-7 sm:mb-8 flex-1">
                {(plan.features || []).map((f: string, j: number) => (
                  <li key={j} className="flex items-start gap-2 text-xs sm:text-sm" style={{ color: textColor }}>
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    <span
                      style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        if (!isEditable) return;
                        const features = [...(plan.features || [])];
                        features[j] = e.currentTarget.innerText;
                        onNestedTextChange(section.id, "plans", i, "features", features as any);
                      }}
                      onClick={(e) => isEditable && e.stopPropagation()}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <a href={plan.ctaHref || "#"}
                className="block text-center py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 min-h-[48px] flex items-center justify-center"
                style={plan.popular ? { background: accent, color: website.colors?.primary || "#1a1a2e" } : { border: `1px solid ${accent}40`, color: textColor }}>
                {editableNested("plans", i, "ctaText", plan.ctaText || "Get started", "", {})}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
