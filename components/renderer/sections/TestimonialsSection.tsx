"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Star, Quote } from "lucide-react";

export default function TestimonialsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 sm:mb-14 lg:mb-16" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {(d.testimonials || []).map((t: any, i: number) => (
            <div key={i} className="p-5 sm:p-6 rounded-2xl border" style={{ background: `${accent}08`, borderColor: `${accent}15` }}>
              <Quote size={24} className="mb-3 sm:mb-4 opacity-30" style={{ color: accent }} />
              <p className="text-sm sm:text-base leading-relaxed mb-5 sm:mb-6 opacity-80" style={{ color: textColor }}>&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                {t.image && <img src={t.image} alt={t.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0" />}
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: textColor }}>{t.name}</div>
                  <div className="text-xs opacity-50 truncate" style={{ color: textColor }}>{t.location}</div>
                </div>
                <div className="ml-auto flex gap-0.5 shrink-0">
                  {[...Array(t.rating || 5)].map((_, j) => <Star key={j} size={12} className="fill-current" style={{ color: accent }} />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
