/**
 * ============================================================================
 * Blueprint Compiler — Pass-Through Stubs
 * ============================================================================
 * Full implementation lives in the generation pipeline (lib/ultra-premium).
 * These stubs satisfy the public index.tsx export contract so TypeScript
 * resolves cleanly while the pseudo-code phases are being implemented.
 */

import type { SiteBlueprint, Page, Section } from "../types/blueprint";

export interface TransitionProfile {
  type: string;
  duration: number;
  easing: string;
}

export interface EntranceAnimation {
  type: string;
  duration: number;
  staggerDelay: number;
}

export interface CompiledPage {
  id: string;
  path: string;
  sections: Section[];
  transition: TransitionProfile;
}

export interface CompiledSection {
  id: string;
  name: string;
  order: number;
  entrance: EntranceAnimation;
}

/** Compile a blueprint to a runtime representation (no-op pass-through). */
export function compileBlueprint(blueprint: SiteBlueprint): SiteBlueprint {
  return blueprint;
}

/** Compile a single page to a runtime page (no-op pass-through). */
export function compilePage(page: Page): CompiledPage {
  return {
    id: page.id,
    path: page.path,
    sections: page.sections,
    transition: resolveTransitionProfile(page.transition),
  };
}

/** Compile a single section to a runtime section (no-op pass-through). */
export function compileSection(section: Section): CompiledSection {
  return {
    id: section.id,
    name: section.name,
    order: section.order,
    entrance: resolveEntranceAnimation(section.component.entrance),
  };
}

export function resolveTransitionProfile(
  transitionType: string
): TransitionProfile {
  const durationMap: Record<string, number> = {
    fade: 600,
    slide: 700,
    morph: 900,
    zoom: 750,
    pageTurn: 1000,
    none: 0,
  };
  return {
    type: transitionType,
    duration: durationMap[transitionType] ?? 600,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
  };
}

export function resolveEntranceAnimation(entrance: string): EntranceAnimation {
  const durationMap: Record<string, number> = {
    fadeUp: 700,
    clipReveal: 800,
    scaleIn: 600,
    slideFromLeft: 700,
    slideFromRight: 700,
    rotateIn: 800,
    blurIn: 600,
    charStagger: 1200,
    lineDraw: 1000,
    morphShape: 900,
    liquidMerge: 1000,
    particleReform: 1200,
  };
  return {
    type: entrance,
    duration: durationMap[entrance] ?? 700,
    staggerDelay: 80,
  };
}

export function extractBackground3DConfig(
  blueprint: SiteBlueprint
): Record<string, unknown> {
  return (blueprint.theme.globalBackground as unknown as Record<string, unknown>) ?? {};
}

/** Match a URL path against blueprint pages; returns matching page or null. */
export function matchRoute(
  path: string,
  pages: Page[]
): Page | null {
  return pages.find((p) => p.path === path) ?? pages[0] ?? null;
}
