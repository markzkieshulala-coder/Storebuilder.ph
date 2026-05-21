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

// ── ROUTE STATE ───────────────────────────────────────────────────────────────

export interface RouteState {
  /** The currently resolved path (e.g., "/roster") */
  currentPath: string;
  /** The Page ID currently being rendered */
  currentPageId: string | null;
  /** Index of the active page in blueprint.pages */
  currentPageIndex: number;
  /** True while a kinetic transition is in flight */
  isTransitioning: boolean;
  /** Direction of the navigation (for directional animations) */
  direction: "forward" | "backward" | "none";
  /** The transition type for the current page */
  activeTransition: PageTransition;
  /** The route source: internal navigation vs external load */
  source: "nav-click" | "deep-link" | "popstate" | "initial";
}

// ── ROUTE RESOLUTION ──────────────────────────────────────────────────────────

export interface ResolvedRoute {
  path: string;
  pageId: string;
  pageIndex: number;
  pageTitle: string;
  isExact: boolean;
  params?: Record<string, string>;
}

// ── TRANSITION STATE ──────────────────────────────────────────────────────────

export interface TransitionState {
  /** Phase of the transition cycle */
  phase: "idle" | "exiting" | "entering" | "complete";
  /** Progress 0.0 → 1.0 for the current phase */
  progress: number;
  /** Previous page being animated out */
  fromPageId: string | null;
  /** Next page being animated in */
  toPageId: string | null;
  /** Timestamp when the transition began */
  startedAt: number | null;
  /** Duration in ms for this transition */
  duration: number;
  /** Custom cubic-bezier easing as CSS string */
  easing: string;
}

// ── ANIMATION CONTEXT ─────────────────────────────────────────────────────────

export interface AnimationContextValue {
  /** Current route state (reactive) */
  route: RouteState;
  /** Current transition state (reactive) */
  transition: TransitionState;
  /** Initiate a page transition */
  navigate: (path: string, options?: NavigateOptions) => Promise<void>;
  /** Programmatic back navigation */
  goBack: () => void;
  /** Replace history entry without animation */
  replace: (path: string) => void;
  /** Force immediate transition completion */
  forceComplete: () => void;
  /** Whether the app is in a reduced-motion mode */
  prefersReducedMotion: boolean;
}

export interface NavigateOptions {
  /** Override the page transition type */
  transition?: PageTransition;
  /** Replace instead of push in history */
  replace?: boolean;
  /** Source of the navigation */
  source?: "nav-click" | "cta-click" | "deeplink" | "link";
  /** Additional state to attach */
  state?: Record<string, unknown>;
  /** Scroll-to-anchor target after navigation */
  scrollTo?: string;
  /** Human-readable navigation label (for analytics) */
  label?: string;
}

// ── 3D BACKGROUND STATE ───────────────────────────────────────────────────────

export interface Background3DState {
  /** Active page configuration feeding the background */
  activePageIndex: number;
  /** Current background parameters being rendered */
  currentParams: any | null;
  /** Target parameters to interpolate toward */
  targetParams: any | null;
  /** Interpolation progress 0.0 → 1.0 */
  interpolationProgress: number;
  /** Global speed multiplier driven by active page */
  globalSpeed: number;
  /** Global rotation offset driven by active page */
  globalRotationOffset: number;
  /** Whether a page change is driving background param transition */
  isMorphing: boolean;
}

// ── BLUEPRINT CONTEXT ─────────────────────────────────────────────────────────

export interface BlueprintContextValue {
  blueprint: SiteBlueprint;
  /** Compiled component registry for fast lookup */
  componentRegistry: Record<string, any>;
  /** Preloaded assets: URL → loading state */
  assetState: Map<string, "idle" | "loading" | "ready" | "error">;
  /** Mark an asset as loaded */
  markAssetLoaded: (url: string) => void;
  /** Get component config by name (typed) */
  getComponent: (name: ComponentName) => any;
}
