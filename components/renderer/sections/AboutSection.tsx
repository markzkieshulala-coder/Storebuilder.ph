"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function AboutSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section id="about" className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {d.image && (
            <div className="rounded-2xl overflow-hidden aspect-[4/3]">
              <img src={d.image} alt={d.headline} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
            <div className="text-base leading-relaxed opacity-70 whitespace-pre-line mb-8" style={{ color: textColor }}>{d.story}</div>
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
