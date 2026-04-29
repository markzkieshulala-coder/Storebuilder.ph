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
  const sectionAlign = section.styles?.textAlign as "left" | "center" | "right" | undefined;
  const minHeight = useMemo(() => {
    const raw = section.styles?.minHeight;
    const n = raw ? parseFloat(raw as unknown as string) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [section.styles?.minHeight]);

  // ── Bottom-edge resize: adjust section minHeight ─────────────────────────
  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    if (!isEditable || !onResizeSection) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startY = e.clientY;
    const startH = rect.height;

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(120, Math.round(startH + (ev.clientY - startY)));
      onResizeSection(section.id, next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // ── Left-edge handle: drag-to-reorder among siblings ─────────────────────
  function startReorder(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isEditable || !onReorderSections) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      // Hit-test sibling sections by their bounding rects to find the
      // closest target; swap when we cross its mid-point.
      const all = Array.from(document.querySelectorAll<HTMLElement>("[data-sb-section-index]"));
      let targetIdx = index;
      for (const el of all) {
        const idx = Number(el.getAttribute("data-sb-section-index"));
        const r = el.getBoundingClientRect();
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) {
          targetIdx = idx;
          break;
        }
      }
      if (targetIdx !== index && targetIdx >= 0 && targetIdx < totalSections) {
        onReorderSections(index, targetIdx);
      }
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div
      ref={wrapperRef}
      data-sb-section-index={index}
      id={anchorId}
      onMouseEnter={() => isEditable && setHover(true)}
      onMouseLeave={() => isEditable && setHover(false)}
      style={{
        position: "relative",
        scrollMarginTop: "80px",
        textAlign: sectionAlign || undefined,
        minHeight: minHeight ? `${minHeight}px` : undefined,
        outline: dragging ? "2px dashed #1877F2" : undefined,
        outlineOffset: dragging ? "-2px" : undefined,
        transition: dragging ? "none" : "outline-color 0.12s ease",
      }}
    >
      <SectionComponent section={section} website={website} />

      {isEditable && (
        <>
          {/* Drag-to-reorder handle (left side, vertically centred) */}
          <button
            type="button"
            onPointerDown={startReorder}
            onMouseDown={(e) => e.preventDefault()}
            title="Drag to reorder section"
            className="absolute z-40 flex items-center justify-center w-6 h-12 rounded-r-lg bg-[#1877F2] text-white shadow-md transition-opacity"
            style={{
              top: "50%",
              left: 0,
              transform: "translateY(-50%)",
              opacity: hover || dragging ? 1 : 0,
              cursor: "grab",
              touchAction: "none",
            }}
          >
            <GripVertical size={14} />
          </button>

          {/* Bottom-edge height resizer */}
          <div
            onPointerDown={startResize}
            onMouseDown={(e) => e.preventDefault()}
            title="Drag to resize section height"
            className="absolute z-40 left-0 right-0 h-2 flex items-center justify-center group"
            style={{
              bottom: -4,
              cursor: "ns-resize",
              touchAction: "none",
            }}
          >
            <span
              className="flex items-center justify-center px-2 py-0.5 rounded-full bg-[#1877F2] text-white shadow-md transition-opacity"
              style={{ opacity: hover ? 1 : 0 }}
            >
              <MoveVertical size={11} />
            </span>
          </div>
        </>
      )}
    </div>
  );
}
