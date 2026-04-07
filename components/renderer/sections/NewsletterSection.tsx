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
    <section className="py-20 px-6" style={{ background: bg }}>
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `${accent}20` }}>
          <Mail size={24} style={{ color: accent }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
        {d.incentive && <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4" style={{ background: `${accent}20`, color: accent }}>{d.incentive}</div>}
        {d.subheadline && <p className="opacity-60 mb-8" style={{ color: textColor }}>{d.subheadline}</p>}
        {!submitted ? (
          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={d.placeholder || "Your email address"}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-violet-400/50 text-sm"
            />
            <button onClick={() => setSubmitted(true)} className="px-5 py-3 rounded-xl font-semibold text-sm" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
              {d.ctaText || "Subscribe"}
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl text-sm" style={{ background: `${accent}15`, color: accent }}>
            🎉 You&apos;re subscribed! Check your inbox.
          </div>
        )}
        {d.privacy && <p className="text-xs opacity-30 mt-3" style={{ color: textColor }}>{d.privacy}</p>}
      </div>
    </section>
  );
}
