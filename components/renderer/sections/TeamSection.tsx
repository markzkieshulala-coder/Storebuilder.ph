"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function TeamSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
          {d.subheadline && <p className="opacity-60" style={{ color: textColor }}>{d.subheadline}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(d.members || []).map((m: any, i: number) => (
            <div key={i} className="text-center p-6 rounded-2xl border" style={{ background: `${accent}06`, borderColor: `${accent}15` }}>
              {m.image && <img src={m.image} alt={m.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2" style={{ borderColor: `${accent}40` }} />}
              <h3 className="font-bold text-lg" style={{ color: textColor, fontFamily: "var(--heading-font)" }}>{m.name}</h3>
              <p className="text-sm mb-2" style={{ color: accent }}>{m.role}</p>
              {m.bio && <p className="text-xs opacity-60 leading-relaxed" style={{ color: textColor }}>{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
