/**
 * ============================================================================
 * FRONTEND ROUTING & TRANSITION TYPES
 * ============================================================================
 * Global animation state, route definitions, and kinetic transition contracts.
 */

import type { ComponentName, Page, Section, PageTransition, SiteBlueprint } from "./blueprint";
import type { KineticTransitionEngine } from "../engine/KineticTransitionEngine";

// Re-export PageTransition for engine consumers
export type { PageTransition, SiteBlueprint };

/** Alias used by AnimationContext and transitionEngine */
export type TransitionType = PageTransition;

/** A runtime-resolved route with full page metadata */
export interface Route {
  id: string;
  path: string;
  label: string;
  meta: Page["meta"];
  sections: Section[];
}

/** Named route definition (used by router setup) */
export interface RouteDefinition {
  path: string;
  pageId: string;
  label: string;
  name: string;
  transition: PageTransition;
}

/** Dynamic route params extracted from path segments */
export type RouteParams = Record<string, string>;

/** Compiled page representation (used by BlueprintCompiler) */
export interface CompiledPage {
  id: string;
  path: string;
  sections: Section[];
  transition: {
    type: string;
    duration: number;
    easing: string;
  };
}

/** Compiled section representation */
export interface CompiledSection {
  id: string;
  name: string;
  order: number;
  entrance: {
    type: string;
    duration: number;
    staggerDelay: number;
  };
}

// ── ROUTE STATE (legacy / extended shape) ────────────────────────────────────

export interface RouteState {
  currentPath: string;
  currentPageId: string | null;
  currentPageIndex: number;
  isTransitioning: boolean;
  direction: "forward" | "backward" | "none";
  activeTransition: PageTransition;
  source: "nav-click" | "deep-link" | "popstate" | "initial";
}

/** Lightweight transition status used by hooks */
export type TransitionStatus = "idle" | "exiting" | "entering" | "complete";

// ── ROUTE RESOLUTION ──────────────────────────────────────────────────────────

export interface ResolvedRoute {
  path: string;
  pageId: string;
  pageIndex: number;
  pageTitle: string;
  isExact: boolean;
  params?: Record<string, string>;
}

// ── TRANSITION STATE (simplified — used by AnimationContext) ────────────────

export interface TransitionState {
  phase: "idle" | "exiting" | "entering" | "complete";
  type: TransitionType | "none";
  progress: number;
}

// ── ANIMATION CONTEXT (matches AnimationContext.tsx shape) ──────────────────

export interface AnimationContextValue {
  /** Current route path (reactive) */
  route: string;
  /** Current transition state (reactive) */
  transition: TransitionState;
  /** Initiate a page transition */
  navigate: (path: string, options?: NavigateOptions) => Promise<void>;
  /** Whether the app is in a reduced-motion mode */
  prefersReducedMotion: boolean;
  /** Reference to the kinetic transition engine */
  engine: KineticTransitionEngine;
}

export interface NavigateOptions {
  transition?: PageTransition;
  replace?: boolean;
  source?: "nav-click" | "cta-click" | "deeplink" | "link";
  state?: Record<string, unknown>;
  scrollTo?: string;
  label?: string;
}

// ── 3D BACKGROUND STATE ───────────────────────────────────────────────────────

export interface Background3DState {
  activePageIndex: number;
  currentParams: any | null;
  targetParams: any | null;
  interpolationProgress: number;
  globalSpeed: number;
  globalRotationOffset: number;
  isMorphing: boolean;
}

/** Transition profile used by router/compiler */
export interface TransitionProfile {
  type: PageTransition;
  duration: number;
  easing: string;
}

// ── BLUEPRINT CONTEXT ─────────────────────────────────────────────────────────

export interface BlueprintContextValue {
  blueprint: SiteBlueprint;
  componentRegistry: Record<string, any>;
  assetState: Map<string, "idle" | "loading" | "ready" | "error">;
  markAssetLoaded: (url: string) => void;
  getComponent: (name: ComponentName) => any;
}
