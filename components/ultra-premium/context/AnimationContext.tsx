"use client";
/**
 * ============================================================================
 * AnimationContext — Global Animation & Route State Provider
 * ============================================================================
 * Provides:
 *   - current route (tracked reactively)
 *   - transition state (phase, type, progress)
 *   - navigate() with kinetic transition triggers
 *   - prefersReducedMotion flag
 *   - transition engine singleton
 *
 * Architecture:
 *   - Wraps the entire app inside <UltraPremiumApp>.
 *   - Route changes are intercepted by navigate(), which delegates to
 *     KineticTransitionEngine to run exit/enter animations before updating state.
 *   - 3D background receives route changes imperatively and updates its
 *     geometry speed/rotation without remounting.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { KineticTransitionEngine } from "../engine/KineticTransitionEngine";
import type {
  Route,
  TransitionState,
  AnimationContextValue,
  NavigateOptions,
  TransitionType,
} from "../types/routing";

export const AnimationContext = createContext<AnimationContextValue | null>(null);

interface AnimationProviderProps {
  children: ReactNode;
  initialRoute?: string;
}

const defaultRoute: Route = {
  id: "home",
  path: "/",
  label: "Home",
  meta: { title: "Home" },
  sections: [],
};

export function AnimationProvider({
  children,
  initialRoute = "/",
}: AnimationProviderProps) {
  const [route, setRoute] = useState<Route["path"]>(initialRoute);
  const [transition, setTransition] = useState<TransitionState>({
    phase: "idle",
    type: "none",
    progress: 0,
  });

  // Reduced motion detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Transition engine singleton
  const engineRef = useRef(
    new KineticTransitionEngine({
      onPhaseChange: (phase) =>
        setTransition((prev) => ({
          ...prev,
          phase,
          progress: phase === "entering" ? 0.5 : phase === "idle" ? 1 : 0,
        })),
      onComplete: () => {
        setTransition((prev) => ({ ...prev, phase: "idle", progress: 1 }));
      },
      prefersReducedMotion: false, // updated imperatively
    })
  );

  // Sync reduced motion flag with engine
  useEffect(() => {
    engineRef.current.setReducedMotion(prefersReducedMotion);
  }, [prefersReducedMotion]);

  /**
   * Intercepted navigate — triggers kinetic transition before route update.
   *
   * Flow:
   *   1. Determine transition type from current → target page blueprint config.
   *   2. Run EXIT animation on current content (downward fade / slide).
   *   3. Update React route state.
   *   4. Run ENTER animation on new content (cascade from bottom / fadeInUp).
   *   5. Update transition.phase to "idle".
   */
  const navigate = useCallback(
    async (to: string, opts?: NavigateOptions) => {
      if (to === route) return;

      // Derive transition type from opts or default to "fade"
      const transitionType: TransitionType =
        (opts?.transition as TransitionType) ?? "fade";

      // Update transition state to "exiting"
      setTransition({
        phase: "exiting",
        type: transitionType,
        progress: 0,
      });

      try {
        // Phase 1: Exit animation
        await engineRef.current.exitCurrentContent(transitionType);

        // Phase 2: Update route (React state change)
        setRoute(to);

        // Phase 3: Enter animation
        setTransition((prev) => ({
          ...prev,
          phase: "entering",
          progress: 0.5,
        }));

        await engineRef.current.enterNewContent(transitionType);

        // Phase 4: Idle
        setTransition({
          phase: "idle",
          type: "none",
          progress: 1,
        });
      } catch (err) {
        console.error("[AnimationProvider] Transition failed:", err);
        // Fallback: instant switch
        setRoute(to);
        setTransition({ phase: "idle", type: "none", progress: 1 });
      }
    },
    [route]
  );

  // Browser back/forward handling
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path !== route) {
        setRoute(path);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [route]);

  // Sync URL with route (no reload)
  useEffect(() => {
    if (window.location.pathname !== route) {
      window.history.pushState({}, "", route);
    }
  }, [route]);

  const value = useMemo<AnimationContextValue>(
    () => ({
      route,
      transition,
      navigate,
      prefersReducedMotion,
      engine: engineRef.current,
    }),
    [route, transition, navigate, prefersReducedMotion]
  );

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}