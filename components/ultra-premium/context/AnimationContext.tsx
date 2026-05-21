"use client";
/**
 * ============================================================================
 * AnimationContext — Global Animation & Route State Provider
 * ============================================================================
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
import type { NavigateOptions } from "../types/routing";

// Local simplified types that match what this context actually provides
export interface TransitionState {
  phase: "idle" | "exiting" | "entering" | "complete";
  type: string;
  progress: number;
}

export interface AnimationContextValue {
  route: string;
  transition: TransitionState;
  navigate: (path: string, options?: NavigateOptions) => Promise<void>;
  prefersReducedMotion: boolean;
  engine: KineticTransitionEngine;
}


export const AnimationContext = createContext<AnimationContextValue | null>(null);

interface AnimationProviderProps {
  children: ReactNode;
  initialRoute?: string;
}

export function AnimationProvider({
  children,
  initialRoute = "/",
}: AnimationProviderProps) {
  const [route, setRoute] = useState<string>(initialRoute);
  const [transition, setTransition] = useState<TransitionState>({
    phase: "idle",
    type: "none",
    progress: 0,
  });

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
      prefersReducedMotion: false,
    })
  );

  useEffect(() => {
    engineRef.current.setReducedMotion(prefersReducedMotion);
  }, [prefersReducedMotion]);

  const navigate = useCallback(
    async (to: string, opts?: NavigateOptions) => {
      if (to === route) return;
      const transitionType: string =
        (opts?.transition as string) ?? "fade";

      setTransition({ phase: "exiting", type: transitionType, progress: 0 });

      try {
        await engineRef.current.exitCurrentContent(transitionType as any);
        setRoute(to);
        setTransition((prev) => ({ ...prev, phase: "entering", progress: 0.5 }));
        await engineRef.current.enterNewContent(transitionType as any);
        setTransition({ phase: "idle", type: "none", progress: 1 });
      } catch (err) {
        console.error("[AnimationProvider] Transition failed:", err);
        setRoute(to);
        setTransition({ phase: "idle", type: "none", progress: 1 });
      }
    },
    [route]
  );

  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      if (path !== route) setRoute(path);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [route]);

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
