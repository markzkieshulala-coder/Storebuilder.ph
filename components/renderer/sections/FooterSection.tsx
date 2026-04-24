"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Instagram, Facebook } from "lucide-react";

export default function FooterSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || "#080814";
  const linkGroups = d.links || {};

  return (
    <footer className="pt-12 pb-6 px-4 sm:pt-16 sm:pb-8 sm:px-6 border-t" style={{ background: bg, borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="text-lg sm:text-xl font-bold mb-2" style={{ fontFamily: "var(--heading-font)", color: accent }}>{d.logo || website.name}</div>
            {d.tagline && <p className="text-xs sm:text-sm opacity-50 mb-4 leading-relaxed" style={{ color: textColor }}>{d.tagline}</p>}
            <div className="flex gap-3">
              {d.social?.instagram && (
                <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }} aria-label="Instagram">
                  <Instagram size={15} style={{ color: accent }} />
                </a>
              )}
              {d.social?.facebook && (
                <a href="#" className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }} aria-label="Facebook">
                  <Facebook size={15} style={{ color: accent }} />
                </a>
              )}
            </div>
          </div>

          {Object.entries(linkGroups).map(([groupName, links]) => (
            <div key={groupName}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4 opacity-40" style={{ color: textColor }}>{groupName}</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                {(links as any[]).map((link: any) => (
                  <li key={link.label}>
                    <a href={link.href || "#"} className="text-xs sm:text-sm opacity-60 hover:opacity-100 transition-opacity block min-h-[28px] flex items-center" style={{ color: textColor }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-5 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs opacity-30 text-center sm:text-left" style={{ color: textColor }}>{d.copyright || `© ${new Date().getFullYear()} ${website.name}. All rights reserved.`}</p>
          <p className="text-xs opacity-20" style={{ color: textColor }}>Built with Storebuilder.ph</p>
        </div>
      </div>
    </footer>
  );
}
