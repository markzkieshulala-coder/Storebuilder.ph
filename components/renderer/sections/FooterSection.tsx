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
    <footer className="pt-16 pb-8 px-6 border-t" style={{ background: bg, borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-xl font-bold mb-2" style={{ fontFamily: "var(--heading-font)", color: accent }}>{d.logo || website.name}</div>
            {d.tagline && <p className="text-sm opacity-50 mb-4 leading-relaxed" style={{ color: textColor }}>{d.tagline}</p>}
            <div className="flex gap-3">
              {d.social?.instagram && (
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Instagram size={16} style={{ color: accent }} />
                </a>
              )}
              {d.social?.facebook && (
                <a href="#" className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Facebook size={16} style={{ color: accent }} />
                </a>
              )}
            </div>
          </div>

          {/* Link groups */}
          {Object.entries(linkGroups).map(([groupName, links]) => (
            <div key={groupName}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4 opacity-40" style={{ color: textColor }}>{groupName}</h4>
              <ul className="space-y-2">
                {(links as any[]).map((link: any) => (
                  <li key={link.label}>
                    <a href={link.href || "#"} className="text-sm opacity-60 hover:opacity-100 transition-opacity" style={{ color: textColor }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <p className="text-xs opacity-30" style={{ color: textColor }}>{d.copyright || `© ${new Date().getFullYear()} ${website.name}`}</p>
          <p className="text-xs opacity-20" style={{ color: textColor }}>Built with Storebuilder.ph</p>
        </div>
      </div>
    </footer>
  );
}
