"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function ProcessSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
          {d.subheadline && <p className="opacity-60" style={{ color: textColor }}>{d.subheadline}</p>}
        </div>
        <div className="space-y-8">
          {(d.steps || []).map((step: any, i: number) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                {i + 1}
              </div>
              <div className="pt-1.5">
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{step.title}</h3>
                <p className="text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
