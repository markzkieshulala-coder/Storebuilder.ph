"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ChevronDown } from "lucide-react";

export default function FAQSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [open, setOpen] = useState<number | null>(null);
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 lg:mb-12" style={{ fontFamily: "var(--heading-font)", color: textColor }}>
          {d.headline || "Frequently Asked Questions"}
        </h2>
        <div className="space-y-2">
          {(d.faqs || d.items || []).map((item: any, i: number) => (
            <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: `${accent}20` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-4 sm:px-6 py-4 flex items-center justify-between gap-3 min-h-[56px]"
                style={{ color: textColor }}
              >
                <span className="font-medium text-sm sm:text-base">{item.question || item.q}</span>
                <ChevronDown size={18} className={`opacity-50 transition-transform shrink-0 ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-4 sm:px-6 pb-4 text-xs sm:text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>
                  {item.answer || item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
