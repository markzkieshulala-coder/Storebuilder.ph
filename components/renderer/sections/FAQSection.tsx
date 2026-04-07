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
    <section id="faq" className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline || "FAQ"}</h2>
        <div className="space-y-2">
          {(d.faqs || d.items || []).map((item: any, i: number) => (
            <div key={i} className="rounded-xl overflow-hidden border" style={{ borderColor: `${accent}20` }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full text-left px-6 py-4 flex items-center justify-between transition-colors hover:bg-white/3" style={{ color: textColor }}>
                <span className="font-medium text-sm">{item.question || item.q}</span>
                <ChevronDown size={18} className={`opacity-50 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-sm opacity-60 leading-relaxed" style={{ color: textColor }}>
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
