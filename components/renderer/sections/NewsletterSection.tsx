"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Mail } from "lucide-react";

export default function NewsletterSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || "#1a1a2e";

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }}>
      <div className="max-w-xl mx-auto text-center">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 sm:mb-6" style={{ background: `${accent}20` }}>
          <Mail size={22} style={{ color: accent }} />
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
        {d.incentive && (
          <div className="inline-block px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-3" style={{ background: `${accent}20`, color: accent }}>
            {d.incentive}
          </div>
        )}
        {d.subheadline && <p className="text-sm sm:text-base opacity-60 mb-6 sm:mb-8" style={{ color: textColor }}>{d.subheadline}</p>}
        {!submitted ? (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={d.placeholder || "Your email address"}
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none min-h-[48px]"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: textColor }}
            />
            <button
              onClick={() => setSubmitted(true)}
              className="px-6 py-3 rounded-xl font-semibold text-sm min-h-[48px] whitespace-nowrap"
              style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
            >
              {d.ctaText || "Subscribe"}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl text-sm" style={{ background: `${accent}15`, color: accent }}>
            You&apos;re subscribed! Check your inbox.
          </div>
        )}
        {d.privacy && <p className="text-xs opacity-30 mt-3" style={{ color: textColor }}>{d.privacy}</p>}
      </div>
    </section>
  );
}
