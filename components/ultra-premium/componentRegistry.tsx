"use client";
/**
 * ============================================================================
 * COMPONENT REGISTRY — Blueprint Name → React Component Mapping
 * ============================================================================
 * Every component name declared in the backend `ComponentRegistry` has a
 * corresponding React implementation here. The `SectionRenderer` looks up
 * section.name and renders the mapped component, passing section props.
 *
 * In production, each key maps to a lazy-loaded chunk for tree-shaking.
 */

import React from "react";
import type { SectionRendererProps } from "./SectionRenderer";

// ── PLACEHOLDER SECTION COMPONENTS ─────────────────────────────────────────
// These are minimal, production-grade skeletons. Each component receives
// the full Section object via props and is responsible for rendering its
// own markup, applying entrance data-animate attributes, and consuming
// assetSlots for images.

const CinematicHero: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
    {section.component.assetSlots?.map((slot, i) =>
      slot.generatedUrl ? (
        <img
          key={i}
          src={slot.generatedUrl}
          alt={slot.generatedPrompt ?? ""}
          className="absolute inset-0 w-full h-full object-cover"
          data-animate
        />
      ) : null
    )}
    <div className="relative z-10 text-center" data-animate>
      <h1 className="text-6xl md:text-9xl font-bold tracking-tighter uppercase">
        {section.copy.heading}
      </h1>
      <p className="mt-4 text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
        {section.copy.body}
      </p>
      {section.copy.cta && (
        <button className="mt-8 px-8 py-3 bg-white text-black text-sm font-bold tracking-widest uppercase rounded-full hover:scale-105 transition-transform">
          {section.copy.cta}
        </button>
      )}
    </div>
  </div>
);

const BentoMasonry: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-24 px-6 md:px-12">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">
      {(section.component.props.items as any[])?.map((item: any, i: number) => (
        <div
          key={i}
          className={`relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/30 transition-all ${
            i === 0 ? "md:col-span-2 md:row-span-2" : ""
          }`}
          data-animate
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title ?? ""}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="absolute inset-0 p-6 flex flex-col justify-end">
            <h3 className="text-xl font-bold uppercase tracking-wide">
              {item.title ?? ""}
            </h3>
          </div>
        </div>
      )) ?? null}
    </div>
  </div>
);

const OverlappingSplitReveal: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12 overflow-hidden">
    <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-0 items-center">
      <div className="relative z-10 md:-mr-24" data-animate>
        <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">
          {section.copy.heading}
        </h2>
        <p className="mt-6 text-white/70 text-lg leading-relaxed max-w-md">
          {section.copy.body}
        </p>
        {section.copy.cta && (
          <button className="mt-8 text-sm font-bold tracking-widest uppercase underline underline-offset-8 decoration-white/40 hover:decoration-white transition-colors">
            {section.copy.cta}
          </button>
        )}
      </div>
      <div className="relative" data-animate>
        {section.component.assetSlots?.[0]?.generatedUrl && (
          <img
            src={section.component.assetSlots[0].generatedUrl}
            alt={section.component.assetSlots[0].generatedPrompt ?? ""}
            className="w-full h-[500px] object-cover rounded-2xl"
          />
        )}
      </div>
    </div>
  </div>
);

const AsymmetricTypographyHero: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-screen w-full flex items-end pb-24 px-6 md:px-12 overflow-hidden">
    <div className="max-w-7xl w-full" data-animate>
      <h1 className="text-[12vw] md:text-[10vw] font-black leading-[0.85] tracking-tighter uppercase">
        {section.copy.heading}
      </h1>
      <p className="mt-8 text-xl md:text-2xl text-white/60 max-w-xl">
        {section.copy.body}
      </p>
    </div>
  </div>
);

const Fluid3DDisplay: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden">
    <div className="text-center" data-animate>
      <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter">
        {section.copy.heading}
      </h2>
      <p className="mt-4 text-white/60 text-lg">{section.copy.body}</p>
    </div>
  </div>
);

const KineticProductGrid: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-24 px-6 md:px-12">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
      {(section.component.props.items as any[])?.map((item: any, i: number) => (
        <div
          key={i}
          className="group relative aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:scale-[1.02] transition-transform duration-500"
          data-animate
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title ?? ""}
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
            />
          )}
          <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent">
            <span className="text-xs font-bold tracking-widest uppercase text-white/50">
              {item.tag ?? ""}
            </span>
            <span className="text-lg font-bold uppercase">{item.title ?? ""}</span>
          </div>
        </div>
      )) ?? null}
    </div>
  </div>
);

const VerticalRhythmStack: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12 space-y-24">
    {(section.component.props.blocks as any[])?.map((block: any, i: number) => (
      <div key={i} className="max-w-4xl mx-auto" data-animate>
        <h3 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
          {block.heading ?? ""}
        </h3>
        <p className="mt-4 text-white/60 text-lg leading-relaxed">
          {block.body ?? ""}
        </p>
      </div>
    )) ?? (
      <div className="max-w-4xl mx-auto" data-animate>
        <h3 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
          {section.copy.heading}
        </h3>
        <p className="mt-4 text-white/60 text-lg leading-relaxed">
          {section.copy.body}
        </p>
      </div>
    )}
  </div>
);

const HorizonLineScroll: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-24 overflow-hidden">
    <div className="flex gap-6 px-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
      {(section.component.props.items as any[])?.map((item: any, i: number) => (
        <div
          key={i}
          className="flex-shrink-0 w-[70vw] md:w-[40vw] snap-center rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
          data-animate
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title ?? ""}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-6">
            <h4 className="text-xl font-bold uppercase">{item.title ?? ""}</h4>
            <p className="mt-2 text-white/50 text-sm">{item.body ?? ""}</p>
          </div>
        </div>
      )) ?? null}
    </div>
  </div>
);

const OrbitalCarousel: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-[70vh] w-full flex items-center justify-center overflow-hidden">
    <div className="text-center" data-animate>
      <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">
        {section.copy.heading}
      </h2>
      <p className="mt-4 text-white/60 max-w-lg mx-auto">{section.copy.body}</p>
    </div>
  </div>
);

const DepthFieldGallery: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
      {(section.component.props.images as any[])?.map((img: any, i: number) => (
        <div
          key={i}
          className={`relative rounded-xl overflow-hidden ${
            i === 1 ? "md:col-span-2 md:row-span-2" : "aspect-square"
          }`}
          data-animate
        >
          <img
            src={img.src}
            alt={img.alt ?? ""}
            className="w-full h-full object-cover"
            style={{ filter: `blur(${i === 1 ? 0 : 3}px)` }}
          />
        </div>
      )) ?? null}
    </div>
  </div>
);

const ParallaxTimeline: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12">
    <div className="max-w-4xl mx-auto space-y-16">
      {(section.component.props.events as any[])?.map((ev: any, i: number) => (
        <div key={i} className="flex gap-8 items-start" data-animate>
          <div className="w-24 flex-shrink-0 text-right">
            <span className="text-sm font-bold text-white/40 uppercase tracking-widest">
              {ev.year ?? ""}
            </span>
          </div>
          <div className="flex-1 border-l border-white/20 pl-8 pb-16">
            <h4 className="text-2xl font-bold uppercase">{ev.title ?? ""}</h4>
            <p className="mt-2 text-white/60 leading-relaxed">{ev.body ?? ""}</p>
          </div>
        </div>
      )) ?? null}
    </div>
  </div>
);

const HolographicCTA: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12 flex flex-col items-center text-center">
    <div className="max-w-3xl" data-animate>
      <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white">
        {section.copy.heading}
      </h2>
      <p className="mt-6 text-lg text-white/60">{section.copy.body}</p>
      {section.copy.cta && (
        <button className="mt-10 px-10 py-4 bg-white text-black text-sm font-black tracking-widest uppercase rounded-full hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]">
          {section.copy.cta}
        </button>
      )}
    </div>
  </div>
);

const DimensionalCardStack: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12 flex items-center justify-center">
    <div className="relative w-full max-w-md h-[500px]" data-animate>
      {(section.component.props.cards as any[])?.map((card: any, i: number) => (
        <div
          key={i}
          className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10 p-8 flex flex-col justify-end"
          style={{
            transform: `translateY(${i * 20}px) scale(${1 - i * 0.05})`,
            zIndex: 10 - i,
            opacity: 1 - i * 0.15,
          }}
        >
          <h3 className="text-2xl font-bold uppercase">{card.title ?? ""}</h3>
          <p className="mt-2 text-white/50 text-sm">{card.body ?? ""}</p>
        </div>
      )) ?? null}
    </div>
  </div>
);

const LiquidGlassPanel: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12">
    <div
      className="max-w-5xl mx-auto rounded-3xl p-12 md:p-20 backdrop-blur-xl bg-white/5 border border-white/10"
      data-animate
    >
      <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">
        {section.copy.heading}
      </h2>
      <p className="mt-6 text-lg text-white/60 leading-relaxed max-w-2xl">
        {section.copy.body}
      </p>
    </div>
  </div>
);

const CinematicFooter: React.FC<SectionRendererProps> = ({ section }) => (
  <footer className="relative py-24 px-6 md:px-12 border-t border-white/10">
    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
      <div data-animate>
        <h4 className="text-2xl font-bold uppercase tracking-tighter">
          {section.copy.heading}
        </h4>
        <p className="mt-4 text-white/40 text-sm">{section.copy.body}</p>
      </div>
      <div data-animate>
        <h5 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-4">
          Links
        </h5>
        <ul className="space-y-2">
          {(section.component.props.links as string[])?.map((link: string, i: number) => (
            <li key={i}>
              <span className="text-white/70 hover:text-white text-sm transition-colors cursor-pointer">
                {link}
              </span>
            </li>
          )) ?? null}
        </ul>
      </div>
      <div data-animate>
        <p className="text-xs text-white/30 uppercase tracking-widest">
          {section.copy.microCopy?.join(" · ") ?? ""}
        </p>
      </div>
    </div>
  </footer>
);

const GlitchHeader: React.FC<SectionRendererProps> = ({ section }) => (
  <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-md bg-black/40 border-b border-white/5">
    <div className="text-sm font-black tracking-[0.3em] uppercase" data-animate>
      {section.copy.heading}
    </div>
    <nav className="hidden md:flex gap-8" data-animate>
      {(section.component.props.items as any[])?.map((item: any, i: number) => (
        <span
          key={i}
          className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          {item.label ?? ""}
        </span>
      )) ?? null}
    </nav>
  </header>
);

const PerspectiveGrid: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-32 px-6 md:px-12 perspective-[1200px]">
    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 transform rotate-x-12">
      {(section.component.props.items as any[])?.map((item: any, i: number) => (
        <div
          key={i}
          className="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:scale-105 transition-transform"
          data-animate
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.title ?? ""}
              className="w-full h-full object-cover opacity-60"
            />
          )}
        </div>
      )) ?? null}
    </div>
  </div>
);

const ChromaticAberrationHero: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
    {section.component.assetSlots?.[0]?.generatedUrl && (
      <div className="absolute inset-0" data-animate>
        <img
          src={section.component.assetSlots[0].generatedUrl}
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter: "url(#chromatic)",
          }}
        />
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="chromatic">
              <feColorMatrix
                type="matrix"
                values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="red"
              />
              <feOffset in="red" dx="4" dy="0" result="red-shifted" />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                result="green"
              />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                result="blue"
              />
              <feOffset in="blue" dx="-4" dy="0" result="blue-shifted" />
              <feBlend mode="screen" in="red-shifted" in2="green" />
              <feBlend mode="screen" in2="blue-shifted" />
            </filter>
          </defs>
        </svg>
      </div>
    )}
    <div className="relative z-10 text-center" data-animate>
      <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter">
        {section.copy.heading}
      </h1>
    </div>
  </div>
);

const TopologyMorph: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative h-[60vh] w-full flex items-center justify-center">
    <div className="text-center" data-animate>
      <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">
        {section.copy.heading}
      </h2>
      <p className="mt-4 text-white/50 max-w-lg mx-auto">{section.copy.body}</p>
    </div>
  </div>
);

const VelocityMarquee: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-12 overflow-hidden border-y border-white/10">
    <div
      className="flex whitespace-nowrap"
      data-animate
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white/10 mx-8 flex-shrink-0"
        >
          {section.copy.heading}
        </span>
      ))}
    </div>
  </div>
);

// ── DEFAULT FALLBACK ─────────────────────────────────────────────────────────
const _default: React.FC<SectionRendererProps> = ({ section }) => (
  <div className="relative py-24 px-6 md:px-12" data-animate>
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tighter">
        {section.copy.heading}
      </h2>
      <p className="mt-4 text-white/60 text-lg leading-relaxed">
        {section.copy.body}
      </p>
    </div>
  </div>
);

// ── REGISTRY EXPORT ─────────────────────────────────────────────────────────
export const componentRegistry: Record<string, React.FC<SectionRendererProps>> = {
  CinematicHero,
  BentoMasonry,
  OverlappingSplitReveal,
  AsymmetricTypographyHero,
  Fluid3DDisplay,
  KineticProductGrid,
  VerticalRhythmStack,
  HorizonLineScroll,
  OrbitalCarousel,
  DepthFieldGallery,
  ParallaxTimeline,
  HolographicCTA,
  DimensionalCardStack,
  LiquidGlassPanel,
  CinematicFooter,
  GlitchHeader,
  PerspectiveGrid,
  ChromaticAberrationHero,
  TopologyMorph,
  VelocityMarquee,
  _default,
};
