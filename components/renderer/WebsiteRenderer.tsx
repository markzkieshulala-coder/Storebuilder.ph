"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";
import { EditorContext, EditorContextType, ViewMode } from "@/components/editor/EditorContext";
import SectionStyleChip from "@/components/editor/SectionStyleChip";
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

export default function WebsiteRenderer({ website, isPreview, editorContext }: Props) {
  // `isPreview` flag lives on EditorContext so server components can opt-in
  // without having to construct a full callback-bearing context.
  const baseCtx = editorContext ?? DEFAULT_CONTEXT;
  const ctx: EditorContextType = isPreview && !baseCtx.isPreview
    ? { ...baseCtx, isPreview: true }
    : baseCtx;
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
      /* The section wrapper hides any overflow so users can shrink a section
         below its natural content height — content is clipped, height is
         user-controlled. The inner <section> still flex-grows so the section
         background fills the wrapper when grown larger than the content. */
      .website-render > [data-sb-section-index] > * { flex: 1 1 auto; min-height: 0; }
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
              total={website.sections?.length || 0}
              isEditable={isEditable}
              viewMode={ctx.viewMode}
              onResizeSection={ctx.onResizeSection}
              onUpdateSectionStyle={ctx.onUpdateSectionStyle}
              onDeleteSection={ctx.onDeleteSection}
            />
          );
        })}
      </div>
    </EditorContext.Provider>
  );
}

// SectionShell wraps each section with a bottom-only resize handle. The user
// fully controls section height: dragging up shrinks the wrapper below the
// natural content height (overflow:hidden clips the inside), dragging down
// grows it. There is NO top handle. Footer is the only section without a
// bottom handle since it sits at the very end of the page.
function SectionShell({
  section, website, SectionComponent, anchorId, index, total, isEditable, viewMode,
  onResizeSection, onUpdateSectionStyle, onDeleteSection,
}: {
  section: Section;
  website: GeneratedWebsite;
  SectionComponent: React.ComponentType<{ section: Section; website: GeneratedWebsite }>;
  anchorId: string;
  index: number;
  total: number;
  isEditable: boolean;
  viewMode: ViewMode;
  onResizeSection?: (sectionId: string, minHeight: number, mode: ViewMode) => void;
  onUpdateSectionStyle?: (sectionId: string, key: string, value: string) => void;
  onDeleteSection?: (sectionId: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragHeightRef = useRef<number | null>(null);
  const [hover, setHover] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const sectionAlign = section.styles?.textAlign as "left" | "center" | "right" | undefined;

  // Per-viewport height: prefer scoped key (e.g. "mobile:minHeight"),
  // fall back to the legacy unscoped "minHeight" only on desktop so older
  // saves don't break. Stored as `${viewMode}:minHeight` for back-compat
  // with existing data, but applied as a FIXED height (not min-height) so
  // shrinking actually works.
  const userHeight = useMemo(() => {
    const styles = section.styles || {};
    const scoped = (styles as any)[`${viewMode}:minHeight`];
    const raw = scoped ?? (viewMode === "desktop" ? styles.minHeight : undefined);
    const n = raw ? parseFloat(raw as unknown as string) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [section.styles, viewMode]);

  // liveHeight takes priority during active drag; fall back to saved height
  const displayHeight = liveHeight ?? userHeight;

  // Footer is the very last section so its bottom handle has no real estate
  // below it. Every other section gets a bottom handle.
  const hideHandle = section.type === "footer";

  // Read the section's own background so when the wrapper is taller than the
  // inner content (user grew the section), the filler still uses the
  // section's background — not the page bg.
  const sectionBg = (section.styles?.background as string | undefined) ||
    website.colors?.background || undefined;

  // Bottom-edge resize: shrink OR grow the section freely. No min-height
  // clamp — overflow:hidden on the wrapper clips content if user shrinks
  // below the natural content height.
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
      // Allow shrinking down to a tiny strip (16px) so users can effectively
      // "hide" a section. No upper bound either.
      const next = Math.max(16, Math.round(startH + (ev.clientY - startY)));
      dragHeightRef.current = next;
      setLiveHeight(next);
    };
    const cleanup = () => {
      setResizing(false);
      setLiveHeight(null);
      if (dragHeightRef.current != null) {
        onResizeSection(section.id, dragHeightRef.current, viewMode);
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
    <div
      ref={wrapperRef}
      data-sb-section-index={index}
      id={anchorId}
      onMouseEnter={() => isEditable && setHover(true)}
      onMouseLeave={() => isEditable && !resizing && setHover(false)}
      style={{
        position: "relative",
        scrollMarginTop: "80px",
        textAlign: sectionAlign || undefined,
        // FIXED height when user has resized — not min-height — so the user
        // can shrink the section below its natural content size. overflow
        // hidden clips the inside.
        ...(displayHeight ? { height: `${displayHeight}px` } : {}),
        background: displayHeight ? sectionBg : undefined,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        outline: resizing ? "2px dashed #1877F2" : (isEditable && hover ? "1px dashed rgba(24,119,242,0.4)" : undefined),
        outlineOffset: resizing ? "-2px" : (isEditable && hover ? "-1px" : undefined),
        transition: resizing ? "none" : "outline-color 0.12s ease",
      }}
    >
      <SectionComponent section={section} website={website} />

      {/* Section colour chip — visible on hover in editor mode. Lets users
          change THIS section's background, text and accent colours directly,
          without going through the topbar Theme menu. */}
      {isEditable && onUpdateSectionStyle && (
        <SectionStyleChip
          section={section}
          website={website}
          onUpdate={onUpdateSectionStyle}
          visible={hover || resizing}
        />
      )}

      {/* Section delete button — visible on hover in editor mode.
          Single-click removes the entire section from the page. */}
      {isEditable && onDeleteSection && (hover || resizing) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete this ${section.type} section? This cannot be undone with Ctrl+Z after saving.`)) {
              onDeleteSection(section.id);
            }
          }}
          title="Delete this section"
          style={{
            position: "absolute",
            top: 8,
            right: 110,
            zIndex: 60,
            background: "#ef4444",
            color: "#fff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Delete
        </button>
      )}

      {isEditable && !hideHandle && (
        // Bottom-only resize handle. Sits inside this section's wrapper at
        // the very bottom edge so it visually belongs to THIS section.
        <div
          onPointerDown={startResize}
          onMouseDown={(e) => e.preventDefault()}
          onPointerEnter={() => setHover(true)}
          onPointerLeave={() => !resizing && setHover(false)}
          title="Drag to resize this section (up shrinks, down grows)"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 12,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
            cursor: "ns-resize",
            touchAction: "none",
            userSelect: "none",
            background: hover || resizing ? "rgba(24,119,242,0.10)" : "transparent",
          }}
        >
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
    </div>
  );
}
