"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";
import { EditorContext, EditorContextType } from "@/components/editor/EditorContext";
import NavSection from "./sections/NavSection";
import HeroSection from "./sections/HeroSection";
import FeaturesSection from "./sections/FeaturesSection";
import ProductsSection from "./sections/ProductsSection";
import TestimonialsSection from "./sections/TestimonialsSection";
import AboutSection from "./sections/AboutSection";
import FooterSection from "./sections/FooterSection";
import NewsletterSection from "./sections/NewsletterSection";
import PricingSection from "./sections/PricingSection";
import FAQSection from "./sections/FAQSection";
import StatsSection from "./sections/StatsSection";
import ContactSection from "./sections/ContactSection";
import CTASection from "./sections/CTASection";
import TeamSection from "./sections/TeamSection";
import GallerySection from "./sections/GallerySection";
import ProcessSection from "./sections/ProcessSection";

interface Props {
  website: GeneratedWebsite;
  isPreview?: boolean;
  editorContext?: EditorContextType;
}

const SECTION_MAP: Record<string, React.ComponentType<{ section: Section; website: GeneratedWebsite }>> = {
  nav: NavSection, hero: HeroSection, features: FeaturesSection, products: ProductsSection,
  testimonials: TestimonialsSection, about: AboutSection, footer: FooterSection,
  newsletter: NewsletterSection, pricing: PricingSection, faq: FAQSection,
  stats: StatsSection, contact: ContactSection, cta: CTASection,
  team: TeamSection, gallery: GallerySection, process: ProcessSection,
};

const DEFAULT_CONTEXT: EditorContextType = {
  isEditable: false,
  viewMode: "desktop",
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
  onShowToolbar: () => {},
  selectedField: null,
  onSelectField: () => {},
  onUpdateEditor: () => {},
  onResetEditor: () => {},
  getEditorState: () => undefined,
};

const FALLBACK_FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

// Build a Google Fonts URL for the given font names. Skips system fonts so we
// don't issue useless network requests.
function buildFontsHref(names: string[]): string | null {
  const SYSTEM_FONTS = new Set(["Google Sans", "Roboto", "Arial", "system-ui", "sans-serif"]);
  const wanted = Array.from(new Set(names.filter(Boolean))).filter((n) => !SYSTEM_FONTS.has(n));
  if (wanted.length === 0) return null;
  const families = wanted
    .map((n) => `family=${encodeURIComponent(n)}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export default function WebsiteRenderer({ website, editorContext }: Props) {
  const ctx = editorContext ?? DEFAULT_CONTEXT;
  const isEditable = ctx.isEditable;

  const headingFont = website.fonts?.heading || "Google Sans";
  const bodyFont = website.fonts?.body || headingFont;
  const headingStack = `'${headingFont}', ${FALLBACK_FONT}`;
  const bodyStack = `'${bodyFont}', ${FALLBACK_FONT}`;

  // Inject the Google Fonts <link> for whatever the user picked, and refresh
  // it when the selection changes — without this the dropdown changes don't
  // actually load the new family.
  useEffect(() => {
    const href = buildFontsHref([headingFont, bodyFont]);
    if (!href) return;
    const id = "sb-google-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [headingFont, bodyFont]);

  // Inject font-family rules into <head> so they don't create a render-blocking
  // <style> element before the .website-render div (which would push content
  // down and expose the white canvas wrapper at the top of the editor).
  useEffect(() => {
    const id = "sb-render-fonts";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `
      .website-render h1,.website-render h2,.website-render h3,
      .website-render h4,.website-render h5,.website-render h6{font-family:var(--heading-font)!important}
      .website-render,.website-render p,.website-render span,
      .website-render a,.website-render li,.website-render button,
      .website-render input,.website-render textarea,.website-render label{font-family:var(--body-font)}
    `;
  }, []);

  return (
    <EditorContext.Provider value={ctx}>
      <div
        className="website-render"
        style={{
          "--heading-font": headingStack,
          "--body-font": bodyStack,
          "--color-primary": website.colors?.primary || "#0F172A",
          "--color-secondary": website.colors?.secondary || "#475569",
          "--color-accent": website.colors?.accent || "#1E40AF",
          "--color-bg": website.colors?.background || "#0d0d1a",
          "--color-text": website.colors?.text || "#0F172A",
          fontFamily: bodyStack,
          color: website.colors?.text || "#0F172A",
          backgroundColor: website.colors?.background || "#0d0d1a",
          minHeight: "100vh",
          overflowX: "clip",
          maxWidth: "100%",
        } as React.CSSProperties}
      >
        {website.sections?.map((section, i) => {
          const SectionComponent = SECTION_MAP[section.type];
          const isFirstOfType = website.sections?.findIndex((s) => s.type === section.type) === i;
          const anchorId = isFirstOfType ? section.type : section.id;
          // Unknown section types: skip entirely so they don't introduce
          // visible whitespace between the sections we DO render. Users can
          // still remove them from the sidebar.
          if (!SectionComponent) return null;
          return (
            <SectionShell
              key={section.id}
              section={section}
              website={website}
              SectionComponent={SectionComponent}
              anchorId={anchorId}
              index={i}
              isEditable={isEditable}
              onResizeSection={ctx.onResizeSection}
            />
          );
        })}
      </div>
    </EditorContext.Provider>
  );
}

// SectionShell wraps each section with a single bottom-edge resize handle.
function SectionShell({
  section, website, SectionComponent, anchorId, index, isEditable,
  onResizeSection,
}: {
  section: Section;
  website: GeneratedWebsite;
  SectionComponent: React.ComponentType<{ section: Section; website: GeneratedWebsite }>;
  anchorId: string;
  index: number;
  isEditable: boolean;
  onResizeSection?: (sectionId: string, minHeight: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragHeightRef = useRef<number | null>(null);
  const [hover, setHover] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const sectionAlign = section.styles?.textAlign as "left" | "center" | "right" | undefined;
  const minHeight = useMemo(() => {
    const raw = section.styles?.minHeight;
    const n = raw ? parseFloat(raw as unknown as string) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [section.styles?.minHeight]);

  // liveHeight takes priority during active drag; fall back to saved minHeight
  const displayHeight = liveHeight ?? minHeight;

  // Bottom-edge resize: adjust section minHeight.
  // liveHeight drives the visual clip during drag; onResizeSection is only
  // called once on pointerup so we don't spam pushHistory on every frame.
  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    if (!isEditable || !onResizeSection) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    const startY = e.clientY;
    const startH = rect.height;
    dragHeightRef.current = null;
    setResizing(true);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const next = Math.max(120, Math.round(startH + (ev.clientY - startY)));
      dragHeightRef.current = next;
      setLiveHeight(next);
    };
    const cleanup = () => {
      setResizing(false);
      setLiveHeight(null);
      if (dragHeightRef.current != null) {
        onResizeSection(section.id, dragHeightRef.current);
        dragHeightRef.current = null;
      }
      try { target.releasePointerCapture(e.pointerId); } catch {}
      target.removeEventListener("pointermove", onMove as EventListener);
      target.removeEventListener("pointerup", cleanup);
      target.removeEventListener("pointercancel", cleanup);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", cleanup);
      window.removeEventListener("pointercancel", cleanup);
    };
    target.addEventListener("pointermove", onMove as EventListener);
    target.addEventListener("pointerup", cleanup);
    target.addEventListener("pointercancel", cleanup);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  return (
    // Fragment: section wrapper and the thin resize handle are siblings so
    // overflow:hidden on the section never clips the handle.
    <>
      <div
        ref={wrapperRef}
        data-sb-section-index={index}
        id={anchorId}
        style={{
          position: "relative",
          scrollMarginTop: "80px",
          textAlign: sectionAlign || undefined,
          ...(displayHeight ? { height: `${displayHeight}px`, overflow: "hidden" } : {}),
          outline: resizing ? "2px dashed #1877F2" : undefined,
          outlineOffset: resizing ? "-2px" : undefined,
          transition: resizing ? "none" : "outline-color 0.12s ease",
        }}
      >
        <SectionComponent section={section} website={website} />
      </div>

      {isEditable && (
        // Thin draggable strip — fully overlaps the section bottom so sections
        // stay flush (no visible gap between them). The pill is positioned so
        // it sits centred on the section boundary.
        <div
          onPointerDown={startResize}
          onMouseDown={(e) => e.preventDefault()}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => !resizing && setHover(false)}
          title="Drag to resize this section"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            zIndex: 50,
            marginTop: -12,
            height: 12,
            cursor: "ns-resize",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {/* pill indicator — sits at section boundary */}
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: hover || resizing ? "#1877F2" : "rgba(255,255,255,0.35)",
              transition: hover || resizing ? "none" : "background 0.2s ease",
              position: "relative",
              boxShadow: hover || resizing ? "0 0 0 2px rgba(255,255,255,0.5)" : undefined,
            }}
          >
            {/* height tooltip — visible only while actively dragging */}
            {resizing && liveHeight && (
              <span
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 6px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#1877F2",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 4,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  lineHeight: 1.4,
                }}
              >
                {liveHeight}px
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
