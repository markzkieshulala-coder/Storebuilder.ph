"use client";
/**
 * ============================================================================
 * SECTION RENDERER — Dynamic Component Factory + Entrance Animation
 * ============================================================================
 * Resolves a component from the registry by name, maps blueprint props,
 * and applies GSAP ScrollTrigger-driven entrance animations.
 */

import React, { memo, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAnimationContext } from "../hooks/useAnimationContext";
import { componentRegistry } from "./componentRegistry";
import type { Section } from "../types/blueprint";

gsap.registerPlugin(ScrollTrigger);

export interface SectionRendererProps {
  section: Section;
  pageId: string;
  pagePath: string;
  pageIndex: number;
  sectionIndex: number;
}

export const SectionRenderer = memo<SectionRendererProps>(
  ({ section, pageId, pagePath, pageIndex, sectionIndex }) => {
    const ref = useRef<HTMLElement>(null);
    const { prefersReducedMotion } = useAnimationContext();
    const Component = componentRegistry[section.name] ?? componentRegistry["_default"];

    // GSAP entrance animation
    useEffect(() => {
      if (!ref.current || prefersReducedMotion) return;
      const entrance = section.component.entrance;
      const duration = (section.component.duration ?? 800) / 1000;
      const staggerDelay = (section.component.staggerDelay ?? 100) / 1000;

      const ctx = gsap.context(() => {
        const children = ref.current!.querySelectorAll("[data-animate]");
        const targets = children.length ? children : [ref.current!];

        // Initial state based on entrance type
        const fromVars: gsap.TweenVars = { opacity: 0 };
        switch (entrance) {
          case "fadeUp":
            fromVars.y = 60;
            break;
          case "scaleIn":
            fromVars.scale = 0.92;
            break;
          case "slideFromLeft":
            fromVars.x = -80;
            break;
          case "slideFromRight":
            fromVars.x = 80;
            break;
          case "rotateIn":
            fromVars.rotation = -5;
            fromVars.y = 40;
            break;
          case "blurIn":
            fromVars.filter = "blur(12px)";
            break;
          case "clipReveal":
            fromVars.clipPath = "inset(0% 0% 100% 0%)";
            break;
          case "charStagger":
            // handled by child-level splitting
            fromVars.y = 20;
            fromVars.opacity = 0;
            break;
          default:
            fromVars.y = 30;
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ref.current!,
            start: section.component.scrollTrigger?.start ?? "top 85%",
            end: section.component.scrollTrigger?.end ?? "bottom 20%",
            scrub: section.component.scrollTrigger?.scrub ?? false,
            once: true,
          },
        });

        tl.from(targets, {
          ...fromVars,
          duration,
          stagger: staggerDelay,
          ease: "power3.inOut",
          clearProps: "transform,filter,clipPath",
        });
      }, ref);

      return () => ctx.revert();
    }, [section, prefersReducedMotion]);

    return (
      <section
        ref={ref}
        id={`${pagePath}__${section.name}__${sectionIndex}`}
        className="relative"
        style={{
          willChange: "transform",
          // responsive break
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <Component
          section={section}
          pageId={pageId}
          pagePath={pagePath}
          pageIndex={pageIndex}
          sectionIndex={sectionIndex}
        />
      </section>
    );
  }
);
SectionRenderer.displayName = "SectionRenderer";
