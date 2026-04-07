"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Check } from "lucide-react";

export default function PricingSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";

  return (
    <section id="pricing" className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
          {d.subheadline && <p className="opacity-60" style={{ color: textColor }}>{d.subheadline}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(d.plans || []).map((plan: any, i: number) => (
            <div key={i} className="p-8 rounded-2xl border" style={plan.popular ? { borderColor: accent, background: `${accent}08` } : { borderColor: `${accent}20`, background: `${accent}04` }}>
              {plan.popular && <div className="text-xs font-bold px-3 py-1 rounded-full mb-4 inline-block" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>POPULAR</div>}
              <h3 className="text-xl font-bold mb-2" style={{ color: textColor, fontFamily: "var(--heading-font)" }}>{plan.name}</h3>
              <div className="text-4xl font-bold mb-1" style={{ color: accent }}>
                {plan.price}
                <span className="text-lg font-normal opacity-50 ml-1" style={{ color: textColor }}>{plan.period}</span>
              </div>
              {plan.description && <p className="text-sm opacity-60 mb-6" style={{ color: textColor }}>{plan.description}</p>}
              <ul className="space-y-3 mb-8">
                {(plan.features || []).map((f: string, j: number) => (
                  <li key={j} className="flex items-start gap-2 text-sm" style={{ color: textColor }}>
                    <Check size={16} className="mt-0.5 shrink-0" style={{ color: accent }} />
                    {f}
                  </li>
                ))}
              </ul>
              <a href={plan.ctaHref || "#"} className="block text-center py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80" style={plan.popular ? { background: accent, color: website.colors?.primary || "#1a1a2e" } : { border: `1px solid ${accent}40`, color: textColor }}>
                {plan.ctaText || "Get started"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
