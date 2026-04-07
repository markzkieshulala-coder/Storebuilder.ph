"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { ShoppingCart, Star } from "lucide-react";
import Image from "next/image";

export default function ProductsSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [activeCategory, setActiveCategory] = useState("All");
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.background || "#0d0d1a";
  const products = d.products || [];
  const filtered = activeCategory === "All" ? products : products.filter((p: any) => p.category === activeCategory);

  return (
    <section id="products" className="py-24 px-6" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-3" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{d.headline}</h2>
          {d.subheadline && <p className="text-lg opacity-60 mb-8" style={{ color: textColor }}>{d.subheadline}</p>}
          {d.categories && (
            <div className="flex flex-wrap justify-center gap-3">
              {d.categories.map((cat: string) => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className="px-5 py-2 rounded-full text-sm font-medium transition-all" style={activeCategory === cat ? { background: accent, color: website.colors?.primary || "#1a1a2e" } : { background: `${accent}15`, color: textColor, border: `1px solid ${accent}30` }}>
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product: any) => (
            <div key={product.id} className="group rounded-2xl overflow-hidden border transition-all hover:-translate-y-1" style={{ background: `${accent}06`, borderColor: `${accent}15` }}>
              <div className="relative h-64 overflow-hidden bg-black/20">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                )}
                {product.badge && (
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                    {product.badge}
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "var(--heading-font)", color: textColor }}>{product.name}</h3>
                {product.description && <p className="text-sm opacity-60 mb-3 leading-relaxed" style={{ color: textColor }}>{product.description}</p>}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold" style={{ color: accent }}>₱{product.price?.toLocaleString()}</span>
                    {product.originalPrice && (
                      <span className="ml-2 text-sm line-through opacity-40" style={{ color: textColor }}>₱{product.originalPrice?.toLocaleString()}</span>
                    )}
                  </div>
                  <button className="p-2.5 rounded-xl transition-opacity hover:opacity-80" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                    <ShoppingCart size={18} />
                  </button>
                </div>
                {product.colors && product.colors.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {product.colors.map((c: string) => (
                      <div key={c} className="w-5 h-5 rounded-full border-2 border-white/20 cursor-pointer" style={{ background: c }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
