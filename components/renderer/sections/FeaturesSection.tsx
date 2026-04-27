"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Leaf, Hand, Recycle, Heart, Shield, Star, Zap, Globe, Award, Users, Clock, Truck } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

const ICON_MAP: Record<string, any> = { leaf: Leaf, hand: Hand, recycle: Recycle, heart: Heart, shield: Shield, star: Star, zap: Zap, globe: Globe, award: Award, users: Users, clock: Clock, truck: Truck };

export default function FeaturesSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
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
      <div className="max-w-6xl mx-auto">
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
              className="text-sm sm:text-base lg:text-lg opacity-60 max-w-2xl mx-auto"
              style={{ color: textColor }}
            >
              {d.subheadline}
            </EditableField>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(d.features || []).map((f: any, i: number) => {
            const Icon = ICON_MAP[f.icon] || Shield;
            return (
              <div key={i} className="p-5 sm:p-6 rounded-2xl border transition-colors" style={{ background: `${accent}08`, borderColor: `${accent}15` }}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4" style={{ background: `${accent}20` }}>
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-2" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{f.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
