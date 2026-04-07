"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Star, Quote } from "lucide-react";

export default function TestimonialsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-16" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(d.testimonials || []).map((t: any, i: number) => (
            <div key={i} className="p-6 rounded-2xl border" style={{ background: `${accent}08`, borderColor: `${accent}15` }}>
              <Quote size={28} className="mb-4 opacity-30" style={{ color: accent }} />
              <p className="text-base leading-relaxed mb-6 opacity-80" style={{ color: textColor }}>&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                {t.image && <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover" />}
                <div>
                  <div className="font-bold text-sm" style={{ color: textColor }}>{t.name}</div>
                  <div className="text-xs opacity-50" style={{ color: textColor }}>{t.location}</div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(t.rating || 5)].map((_, j) => <Star key={j} size={14} className="fill-current" style={{ color: accent }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
