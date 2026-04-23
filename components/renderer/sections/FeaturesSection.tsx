"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Leaf, Hand, Recycle, Heart, Shield, Star, Zap, Globe, Award, Users, Clock, Truck } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";

const ICON_MAP: Record<string, any> = { leaf: Leaf, hand: Hand, recycle: Recycle, heart: Heart, shield: Shield, star: Star, zap: Zap, globe: Globe, award: Award, users: Users, clock: Clock, truck: Truck };

export default function FeaturesSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const { isEditable, onTextChange, onSectionClick, onShowToolbar } = useEditor();

  function showToolbar(e: React.FocusEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onShowToolbar({ sectionId: section.id, textColor, bgColor: bg, accentColor: accent, rect: { top: r.top, left: r.left, width: r.width, height: r.height } });
  }

  return (
    <section id="features" className="py-24 px-6" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--heading-font)", color: textColor, outline: "none" }}
            contentEditable={isEditable}
            suppressContentEditableWarning
            onBlur={(e) => isEditable && onTextChange(section.id, "headline", e.currentTarget.innerText)}
            onFocus={(e) => isEditable && showToolbar(e)}
            onClick={(e) => isEditable && e.stopPropagation()}
          >
            {d.headline}
          </h2>
          {d.subheadline && <p className="text-lg opacity-60" style={{ color: textColor }}>{d.subheadline}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(d.features || []).map((f: any, i: number) => {
            const Icon = ICON_MAP[f.icon] || Shield;
            return (
              <div key={i} className="p-6 rounded-2xl border transition-colors" style={{ background: `${accent}08`, borderColor: `${accent}15` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${accent}20` }}>
                  <Icon size={22} style={{ color: accent }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{f.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
