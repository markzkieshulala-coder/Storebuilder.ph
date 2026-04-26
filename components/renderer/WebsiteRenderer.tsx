"use client";

import React from "react";
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
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
  onShowToolbar: () => {},
};

const SITE_FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

export default function WebsiteRenderer({ website, isPreview = false, editorContext }: Props) {
  return (
    <EditorContext.Provider value={editorContext ?? DEFAULT_CONTEXT}>
      <div
        className="website-render"
        style={{
          "--heading-font": SITE_FONT,
          "--body-font": SITE_FONT,
          "--color-primary": website.colors?.primary || "#0F172A",
          "--color-secondary": website.colors?.secondary || "#475569",
          "--color-accent": website.colors?.accent || "#1E40AF",
          "--color-bg": website.colors?.background || "#ffffff",
          "--color-text": website.colors?.text || "#0F172A",
          fontFamily: SITE_FONT,
          color: website.colors?.text || "#0F172A",
          backgroundColor: website.colors?.background || "#ffffff",
          minHeight: "100vh",
          overflowX: "hidden",
          maxWidth: "100%",
        } as React.CSSProperties}
      >
        {website.sections?.map((section, i) => {
          const SectionComponent = SECTION_MAP[section.type];
          // Anchor id: use section.type for first occurrence (so href="#products" works),
          // fallback to section.id for duplicates so each is uniquely targetable
          const isFirstOfType = website.sections?.findIndex((s) => s.type === section.type) === i;
          const anchorId = isFirstOfType ? section.type : section.id;
          if (!SectionComponent) {
            return (
              <div key={section.id} id={anchorId} className="py-12 px-6 text-center opacity-40">
                <p className="text-sm">Section type &quot;{section.type}&quot; — coming soon</p>
              </div>
            );
          }
          const sectionAlign = section.styles?.textAlign as "left" | "center" | "right" | undefined;
          return (
            <div
              key={section.id}
              id={anchorId}
              style={{
                scrollMarginTop: "80px",
                textAlign: sectionAlign || undefined,
              }}
            >
              <SectionComponent section={section} website={website} />
            </div>
          );
        })}
      </div>
    </EditorContext.Provider>
  );
}
