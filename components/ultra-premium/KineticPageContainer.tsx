"use client";
/**
 * ============================================================================
 * KINETIC PAGE CONTAINER — Framer-Motion Page Transition Wrapper
 * ============================================================================
 * Wraps the active page content in kinetic exit/entrance animations using
 * the curated cubic-bezier curve: cubic-bezier(0.16, 1, 0.3, 1) (power3.inOut).
 *
 * When route changes:
 *   1. Current page sections animate OUT (translateY + opacity + scale + blur)
 *   2. KineticTransitionEngine triggers transition lock
 *   3. New page sections cascade IN (staggered, per-section entrance)
 */

import React, { memo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAnimationContext } from "./hooks/useAnimationContext";
import { useBlueprint } from "./context/BlueprintContext";
import { SectionRenderer } from "./SectionRenderer";
import type { Page } from "./types/blueprint";

interface KineticPageContainerProps {
  page?: Page;
}

// ── EXIT VARIANTS ────────────────────────────────────────────────────────────
const pageExitVariants = {
  initial: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: {
    opacity: 0,
    y: 80,
    scale: 0.97,
    filter: "blur(6px)",
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1], // power3.inOut
    },
  },
};

// ── ENTRANCE VARIANTS ───────────────────────────────────────────────────────
const pageEnterVariants = {
  initial: { opacity: 0, y: -60, scale: 1.02, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1], // power3.inOut
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const sectionChildVariants = {
  initial: { opacity: 0, y: 40, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const KineticPageContainer = memo<KineticPageContainerProps>(({ page: pageProp }) => {
  const { route, transition } = useAnimationContext();
  const { blueprint } = useBlueprint();
  const page: Page = pageProp ??
    blueprint.pages.find((p) => p.path === route) ??
    blueprint.pages[0];
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on route change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [page.id]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page.id}
        ref={containerRef}
        className="relative w-full min-h-screen"
        variants={pageExitVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ willChange: "transform, opacity, filter" }}
      >
        {/* Page entrance wrapper */}
        <motion.div
          variants={pageEnterVariants}
          initial="initial"
          animate="animate"
          className="relative z-10"
        >
          {page.sections.map((section, idx) => (
            <motion.div
              key={`${page.id}-${section.id}`}
              variants={sectionChildVariants}
              className="will-change-transform"
            >
              <SectionRenderer
                section={section}
                pageId={page.id}
                pagePath={page.path}
                pageIndex={blueprint.pages.findIndex((p) => p.id === page.id)}
                sectionIndex={idx}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
KineticPageContainer.displayName = "KineticPageContainer";
