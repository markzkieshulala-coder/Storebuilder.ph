"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function StatsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto">
        {d.headline && (
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {(d.stats || []).map((s: any, i: number) => (
            <div key={i} className="text-center p-4 sm:p-6 rounded-2xl" style={{ background: `${accent}08` }}>
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 break-words" style={{ color: accent, fontFamily: "var(--heading-font)" }}>{s.value}</div>
              <div className="text-xs sm:text-sm opacity-60 leading-snug" style={{ color: textColor }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
