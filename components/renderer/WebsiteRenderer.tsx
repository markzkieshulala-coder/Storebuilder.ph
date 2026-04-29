"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";
import { EditorContext, EditorContextType } from "@/components/editor/EditorContext";
import { GripVertical, MoveVertical } from "lucide-react";
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

  return (
    <EditorContext.Provider value={ctx}>
      <style>{`
        .website-render h1, .website-render h2, .website-render h3,
        .website-render h4, .website-render h5, .website-render h6 {
          font-family: var(--heading-font) !important;
        }
        .website-render, .website-render p, .website-render span,
        .website-render a, .website-render li, .website-render button,
        .website-render input, .website-render textarea, .website-render label {
          font-family: var(--body-font);
        }
      `}</style>
      <div
        className="website-render"
        style={{
          "--heading-font": headingStack,
          "--body-font": bodyStack,
          "--color-primary": website.colors?.primary || "#0F172A",
          "--color-secondary": website.colors?.secondary || "#475569",
          "--color-accent": website.colors?.accent || "#1E40AF",
          "--color-bg": website.colors?.background || "#ffffff",
          "--color-text": website.colors?.text || "#0F172A",
          fontFamily: bodyStack,
          color: website.colors?.text || "#0F172A",
          backgroundColor: website.colors?.background || "#ffffff",
          minHeight: "100vh",
          overflowX: "hidden",
          maxWidth: "100%",
        } as React.CSSProperties}
      >
        {website.sections?.map((section, i) => {
          const SectionComponent = SECTION_MAP[section.type];
          const isFirstOfType = website.sections?.findIndex((s) => s.type === section.type) === i;
          const anchorId = isFirstOfType ? section.type : section.id;
          if (!SectionComponent) {
            return (
              <div key={section.id} id={anchorId} className="py-12 px-6 text-center opacity-40">
                <p className="text-sm">Section type &quot;{section.type}&quot; — coming soon</p>
              </div>
            );
          }
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
              onReorderSections={ctx.onReorderSections}
              totalSections={website.sections.length}
            />
          );
        })}
      </div>
    </EditorContext.Provider>
  );
}

// SectionShell wraps each section with the editor chrome (drag-to-reorder
// handle on the left, height-resize handle on the bottom).
function SectionShell({
  section, website, SectionComponent, anchorId, index, isEditable,
  onResizeSection, onReorderSections, totalSections,
}: {
  section: Section;
  website: GeneratedWebsite;
  SectionComponent: React.ComponentType<{ section: Section; website: GeneratedWebsite }>;
  anchorId: string;
  index: number;
  isEditable: boolean;
  onResizeSection?: (sectionId: string, minHeight: number) => void;
  onReorderSections?: (fromIndex: number, toIndex: number) => void;
  totalSections: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const sectionAlign = section.styles?.textAlign as "left" | "center" | "right" | undefined;
  const minHeight = useMemo(() => {
    const raw = section.styles?.minHeight;
    const n = raw ? parseFloat(raw as unknown as string) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [section.styles?.minHeight]);

  // Always-current index ref so pointer-move closures don't go stale after reorder
  const indexRef = useRef(index);
  indexRef.current = index;

  // liveHeight takes priority during active drag; fall back to saved minHeight
  const displayHeight = liveHeight ?? minHeight;

  // ── Bottom-edge resize: adjust section minHeight ─────────────────────────
  // Uses pointer capture on the handle itself so drags stay locked even when
  // the cursor leaves the small handle area or strays into another iframe/element.
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
    setResizing(true);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const next = Math.max(120, Math.round(startH + (ev.clientY - startY)));
      setLiveHeight(next);
      onResizeSection(section.id, next);
    };
    const cleanup = () => {
      setResizing(false);
      setLiveHeight(null);
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
    // Also bind to window as a safety net in case pointer capture is dropped
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
    window.addEventListener("pointercancel", cleanup);
  }

  // ── Left-edge handle: drag-to-reorder among siblings ─────────────────────
  function startReorder(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isEditable || !onReorderSections) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    try { target.setPointerCapture(e.pointerId); } catch {}
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const currIdx = indexRef.current;
      const all = Array.from(document.querySelectorAll<HTMLElement>("[data-sb-section-index]"));
      let targetIdx = currIdx;
      for (const el of all) {
        const idx = Number(el.getAttribute("data-sb-section-index"));
        const r = el.getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
          targetIdx = idx;
          break;
        }
      }
      if (targetIdx !== currIdx && targetIdx >= 0 && targetIdx < totalSections) {
        onReorderSections(currIdx, targetIdx);
      }
    };
    const cleanup = () => {
      setDragging(false);
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
      onPointerEnter={() => isEditable && setHover(true)}
      onPointerLeave={() => isEditable && setHover(false)}
      style={{
        position: "relative",
        scrollMarginTop: "80px",
        textAlign: sectionAlign || undefined,
        outline: (dragging || resizing) ? "2px dashed #1877F2" : undefined,
        outlineOffset: (dragging || resizing) ? "-2px" : undefined,
        transition: (dragging || resizing) ? "none" : "outline-color 0.12s ease",
      }}
    >
      {/* Inject a targeted min-height on the section's OWN root element so its
          background fills the resized area. Using a direct px value (not inherit)
          means it never cascades to nested elements. */}
      {displayHeight && (
        <style>{`[data-sb-section-index="${index}"] > * { min-height: ${displayHeight}px; }`}</style>
      )}
      <SectionComponent section={section} website={website} />

      {isEditable && (
        <>
          {/* Drag-to-reorder handle (left side, vertically centred) — always visible while editing */}
          <button
            type="button"
            onPointerDown={startReorder}
            onMouseDown={(e) => e.preventDefault()}
            title="Drag to reorder section"
            className="absolute z-40 flex items-center justify-center w-7 h-14 rounded-r-lg bg-[#1877F2] text-white shadow-lg"
            style={{
              top: "50%",
              left: 0,
              transform: "translateY(-50%)",
              opacity: hover || dragging ? 1 : 0.55,
              cursor: "grab",
              touchAction: "none",
              transition: "opacity 0.15s ease",
            }}
          >
            <GripVertical size={16} />
          </button>

          {/* Bottom-edge height resizer — always visible while editing.
              Larger hit area (h-6) so it's easy to grab on touch devices. */}
          <div
            onPointerDown={startResize}
            onMouseDown={(e) => e.preventDefault()}
            title="Drag to resize section height"
            className="absolute z-40 left-0 right-0 flex items-center justify-center"
            style={{
              bottom: -12,
              height: 24,
              cursor: "ns-resize",
              touchAction: "none",
            }}
          >
            <span
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#1877F2] text-white shadow-md text-[11px] font-semibold pointer-events-none"
              style={{
                opacity: hover || resizing ? 1 : 0.65,
                transition: "opacity 0.15s ease",
              }}
            >
              <MoveVertical size={12} />
              {resizing && liveHeight ? `${liveHeight}px` : "Resize"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
