"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { useEditor } from "@/components/editor/EditorContext";
import { ImagePlus } from "lucide-react";

export default function AboutSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const { isEditable, onTextChange, onImageUpload, onSectionClick } = useEditor();

  return (
    <section id="about" className="py-24 px-6" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {(d.image || isEditable) && (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
              {d.image && <img src={d.image} alt={d.headline} className="w-full h-full object-cover" />}
              {isEditable && (
                <button
                  onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "image"); }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: d.image ? "rgba(0,0,0,0.45)" : "rgba(24,119,242,0.1)", color: d.image ? "#fff" : "#1877F2", border: d.image ? "none" : "2px dashed #1877F2", cursor: "pointer" }}
                >
                  <ImagePlus size={22} />
                  {d.image ? "Replace image" : "Upload image"}
                </button>
              )}
            </div>
          )}
          <div>
            <h2
              className="text-3xl md:text-5xl font-bold mb-6"
              style={{ fontFamily: "var(--heading-font)", color: textColor, outline: "none" }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => isEditable && onTextChange(section.id, "headline", e.currentTarget.innerText)}
              onClick={(e) => isEditable && e.stopPropagation()}
            >
              {d.headline}
            </h2>
            <div
              className="text-base leading-relaxed opacity-70 whitespace-pre-line mb-8"
              style={{ color: textColor, outline: "none" }}
              contentEditable={isEditable}
              suppressContentEditableWarning
              onBlur={(e) => isEditable && onTextChange(section.id, "story", e.currentTarget.innerText)}
              onClick={(e) => isEditable && e.stopPropagation()}
            >
              {d.story}
            </div>
            {d.stats && (
              <div className="grid grid-cols-2 gap-4">
                {d.stats.map((s: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: `${accent}12` }}>
                    <div className="text-2xl font-bold" style={{ color: accent, fontFamily: "var(--heading-font)" }}>{s.value}</div>
                    <div className="text-sm opacity-60" style={{ color: textColor }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
