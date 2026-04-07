"use client";

import React from "react";
import { GeneratedWebsite, Section } from "@/lib/ai/generate";
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
}

const SECTION_MAP: Record<string, React.ComponentType<{ section: Section; website: GeneratedWebsite }>> = {
  nav: NavSection,
  hero: HeroSection,
  features: FeaturesSection,
  products: ProductsSection,
  testimonials: TestimonialsSection,
  about: AboutSection,
  footer: FooterSection,
  newsletter: NewsletterSection,
  pricing: PricingSection,
  faq: FAQSection,
  stats: StatsSection,
  contact: ContactSection,
  cta: CTASection,
  team: TeamSection,
  gallery: GallerySection,
  process: ProcessSection,
};

export default function WebsiteRenderer({ website, isPreview = false }: Props) {
  const headingFont = website.fonts?.heading || "Playfair Display";
  const bodyFont = website.fonts?.body || "Syne";

  return (
    <div
      className="website-render"
      style={{
        "--heading-font": `"${headingFont}", serif`,
        "--body-font": `"${bodyFont}", sans-serif`,
        "--color-primary": website.colors?.primary || "#1a1a2e",
        "--color-secondary": website.colors?.secondary || "#c9a84c",
        "--color-accent": website.colors?.accent || "#e8d5b7",
        "--color-bg": website.colors?.background || "#0d0d1a",
        "--color-text": website.colors?.text || "#f5f0e8",
        fontFamily: `"${bodyFont}", sans-serif`,
        color: website.colors?.text || "#f5f0e8",
        backgroundColor: website.colors?.background || "#0d0d1a",
        minHeight: "100vh",
      } as React.CSSProperties}
    >
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
  );
}
