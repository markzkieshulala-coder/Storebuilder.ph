"use client";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";

export default function GallerySection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const images = d.images || [];

  return (
    <section className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto">
        {d.headline && <h2 className="text-3xl md:text-5xl font-bold text-center mb-12" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img: any, i: number) => (
            <div key={i} className={`rounded-xl overflow-hidden ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
              <img src={typeof img === "string" ? img : img.url} alt={typeof img === "string" ? "" : img.caption || ""} className="w-full h-full object-cover aspect-square hover:scale-105 transition-transform" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
