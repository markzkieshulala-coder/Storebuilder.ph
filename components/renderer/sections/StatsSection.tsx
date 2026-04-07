"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function StatsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";

  return (
    <section className="py-20 px-6" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto">
        {d.headline && <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {(d.stats || []).map((s: any, i: number) => (
            <div key={i} className="text-center p-6 rounded-2xl" style={{ background: `${accent}08` }}>
              <div className="text-4xl md:text-5xl font-bold mb-2" style={{ color: accent, fontFamily: "var(--heading-font)" }}>{s.value}</div>
              <div className="text-sm opacity-60" style={{ color: textColor }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
