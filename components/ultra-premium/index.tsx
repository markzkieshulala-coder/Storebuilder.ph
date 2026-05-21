"use client";
/**
 * ============================================================================
 * ULTRA-PREMIUM WEBSITE GENERATOR — FRONTEND ENTRY POINT
 * ============================================================================
 */

// ── React Component Exports ────────────────────────────────────────────────
export { UltraPremiumApp } from "./components/UltraPremiumApp";
export { KineticPageContainer } from "./components/KineticPageContainer";
export { SectionRenderer } from "./components/SectionRenderer";
export { Navigation } from "./components/Navigation";
export { InterceptLink } from "./components/InterceptLink";
export { UnifiedBackground3D } from "./components/UnifiedBackground3D";
export { UltraPremiumRenderer } from "./UltraPremiumRenderer";

// ── Context Providers ────────────────────────────────────────────────────
export { AnimationProvider, AnimationContext } from "./context/AnimationContext";
export { BlueprintProvider, BlueprintContext } from "./context/BlueprintContext";

// ── Hooks ──────────────────────────────────────────────────────────────────
export {
  useAnimationContext,
  useNavigate,
  useTransitionState,
  useReducedMotion,
} from "./hooks/useAnimationContext";

// ── Routing Engine ─────────────────────────────────────────────────────────
export { UltraPremiumRouter } from "./engine/UltraPremiumRouter";

// ── Transition Engine ───────────────────────────────────────────────────────
export { KineticTransitionEngine } from "./engine/KineticTransitionEngine";

// ── Blueprint Compiler ───────────────────────────────────────────────────
export {
  compileBlueprint,
  compilePage,
  compileSection,
  resolveTransitionProfile,
  resolveEntranceAnimation,
  extractBackground3DConfig,
  matchRoute,
  type TransitionProfile,
  type EntranceAnimation,
} from "./engine/BlueprintCompiler";

// ── Component Registry ───────────────────────────────────────────────────
export {
  componentRegistry,
  COMPONENT_REGISTRY,
  COMPONENT_MAP,
  type ComponentFactory,
} from "./components/componentRegistry";

// ── Type Exports ──────────────────────────────────────────────────────────
export type {
  SiteBlueprint,
  Page,
  Section,
  ComponentConfig,
  AssetSlot,
  BackgroundLayer,
  ThreeDParams,
  ShaderParams,
  NicheCopy,
  ComponentName,
  AnimationEntrance,
  ScrollBehavior,
} from "./types/blueprint";

export type {
  RouteState,
  TransitionState,
  TransitionStatus,
  NavigateOptions,
  CompiledPage,
  CompiledSection,
  AnimationContextValue,
  BlueprintContextValue,
} from "./types/routing";
