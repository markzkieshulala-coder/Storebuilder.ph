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
};

export default function WebsiteRenderer({ website, isPreview = false, editorContext }: Props) {
  const headingFont = website.fonts?.heading || "Open Sans";
  const bodyFont = website.fonts?.body || "Open Sans";

  return (
    <EditorContext.Provider value={editorContext ?? DEFAULT_CONTEXT}>
      <div
        className="website-render"
        style={{
          "--heading-font": `"${headingFont}", "Open Sans", "Product Sans", sans-serif`,
          "--body-font": `"${bodyFont}", "Open Sans", "Inter", sans-serif`,
          "--color-primary": website.colors?.primary || "#1a1a2e",
          "--color-secondary": website.colors?.secondary || "#c9a84c",
          "--color-accent": website.colors?.accent || "#e8d5b7",
          "--color-bg": website.colors?.background || "#ffffff",
          "--color-text": website.colors?.text || "#1a1a2e",
          fontFamily: `"${bodyFont}", "Open Sans", "Inter", sans-serif`,
          color: website.colors?.text || "#1a1a2e",
          backgroundColor: website.colors?.background || "#ffffff",
          minHeight: "100vh",
        } as React.CSSProperties}
      >
        {/* Load Google Fonts */}
        <link
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont).replace(/%20/g, "+")}:wght@400;600;700;800&family=${encodeURIComponent(bodyFont).replace(/%20/g, "+")}:wght@400;500;600&family=Open+Sans:wght@400;500;600;700&display=swap`}
          rel="stylesheet"
        />
        {website.sections?.map((section) => {
          const SectionComponent = SECTION_MAP[section.type];
          if (!SectionComponent) {
            return (
              <div key={section.id} className="py-12 px-6 text-center opacity-40">
                <p className="text-sm">Section type &quot;{section.type}&quot; — coming soon</p>
              </div>
            );
          }
          return <SectionComponent key={section.id} section={section} website={website} />;
        })}
      </div>
    </EditorContext.Provider>
  );
}
