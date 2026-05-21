"use client";
/**
 * ============================================================================
 * useAnimationContext — React Hook for Global Animation State
 * ============================================================================
 * Exposes reactive access to route, transition, and 3D background state.
 */

import { useContext } from "react";
import { AnimationContext } from "../context/AnimationContext";
import type { AnimationContextValue, NavigateOptions } from "../types/routing";

export function useAnimationContext(): AnimationContextValue {
  const ctx = useContext(AnimationContext);
  if (!ctx) {
    throw new Error(
      "useAnimationContext must be used within an <AnimationProvider>. " +
      "Ensure <UltraPremiumApp> is mounted at the root."
    );
  }
  return ctx;
}

/** Convenience hook for programmatic navigation */
export function useNavigate() {
  const { navigate } = useAnimationContext();
  return navigate;
}

/** Convenience hook for transition-aware state */
export function useTransitionState() {
  const { transition, route } = useAnimationContext();
  return { transition, route };
}

/** Convenience hook to check if user prefers reduced motion */
export function useReducedMotion(): boolean {
  const { prefersReducedMotion } = useAnimationContext();
  return prefersReducedMotion;
}
