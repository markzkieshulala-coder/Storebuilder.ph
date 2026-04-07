"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function HeroSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";

  return (
    <section
      className="relative flex items-center justify-center text-center overflow-hidden"
      style={{ minHeight: section.styles?.minHeight || "100vh", background: bg }}
    >
      {/* Background image with overlay */}
      {d.backgroundImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${d.backgroundImage})` }}
          />
          <div className="absolute inset-0" style={{ background: d.overlay || "rgba(0,0,0,0.6)" }} />
        </>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        {d.badge && (
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border" style={{ borderColor: `${accent}40`, color: accent, background: `${accent}15` }}>
            {d.badge}
          </div>
        )}

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-none" style={{ fontFamily: "var(--heading-font)", color: textColor }}>
          {d.headline}
        </h1>

        {d.subheadline && (
          <h2 className="text-xl md:text-2xl font-medium mb-4 opacity-80" style={{ color: textColor }}>
            {d.subheadline}
          </h2>
        )}

        {d.description && (
          <p className="text-base md:text-lg max-w-2xl mx-auto mb-10 opacity-60 leading-relaxed" style={{ color: textColor }}>
            {d.description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {d.ctaPrimary && (
            <a href={d.ctaPrimary.href || "#"} className="px-8 py-4 rounded-xl font-semibold text-lg transition-opacity hover:opacity-90" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
              {d.ctaPrimary.text}
            </a>
          )}
          {d.ctaSecondary && (
            <a href={d.ctaSecondary.href || "#"} className="px-8 py-4 rounded-xl font-semibold text-lg border transition-colors hover:bg-white/5" style={{ borderColor: `${textColor}30`, color: textColor }}>
              {d.ctaSecondary.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
