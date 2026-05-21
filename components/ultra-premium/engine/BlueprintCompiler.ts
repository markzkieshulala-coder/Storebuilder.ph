/**
 * ============================================================================
 * BLUEPRINT COMPILER — Pass-through stubs
 * ============================================================================
 * The engine package ships these as empty placeholders. We provide typed
 * pass-through implementations so the index.tsx re-exports resolve.
 */

import type {
  SiteBlueprint,
  Page,
  Section,
  PageTransition,
  AnimationEntrance,
  ThreeDParams,
  ShaderParams,
  BackgroundLayer,
} from "../types/blueprint";
import type { CompiledPage, CompiledSection } from "../types/routing";

export interface TransitionProfile {
  type: PageTransition;
  duration: number;
  easing: string;
}

export interface EntranceAnimation {
  type: AnimationEntrance;
  duration: number;
  staggerDelay: number;
}

export function compileBlueprint(blueprint: SiteBlueprint): SiteBlueprint {
  return blueprint;
}

export function compilePage(page: Page): CompiledPage {
  return {
    id: page.id,
    path: page.path,
    sections: page.sections,
    transition: {
      type: typeof page.transition === "string" ? page.transition : "fade",
      duration: 600,
      easing: "ease",
    },
  };
}

export function compileSection(section: Section, order = 0): CompiledSection {
  return {
    id: section.id,
    name: section.name,
    order,
    entrance: {
      type: section.component.entrance ?? "fadeUp",
      duration: section.component.duration ?? 800,
      staggerDelay: section.component.staggerDelay ?? 100,
    },
  };
}

export function resolveTransitionProfile(page: Page): TransitionProfile {
  return {
    type: (typeof page.transition === "string" ? page.transition : "fade") as PageTransition,
    duration: 600,
    easing: "ease",
  };
}

export function resolveEntranceAnimation(section: Section): EntranceAnimation {
  return {
    type: section.component.entrance ?? "fadeUp",
    duration: section.component.duration ?? 800,
    staggerDelay: section.component.staggerDelay ?? 100,
  };
}

export function extractBackground3DConfig(blueprint: SiteBlueprint): {
  threeD?: ThreeDParams;
  shader?: ShaderParams;
  layers?: BackgroundLayer[];
} {
  const bg: any = blueprint.theme?.globalBackground;
  if (!bg) return {};
  return {
    threeD: bg.params?.threeD ?? bg.threeD,
    shader: bg.params?.shader ?? bg.shader,
    layers: bg.params?.layers ?? bg.layers ?? [bg],
  };
}

export function matchRoute(blueprint: SiteBlueprint, path: string): Page | null {
  return blueprint.pages.find((p) => p.path === path) ?? null;
}
