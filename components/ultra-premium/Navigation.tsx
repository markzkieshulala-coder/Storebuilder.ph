"use client";
/**
 * ============================================================================
 * NAVIGATION — Blueprint-Driven Global Nav with InterceptLink
 * ============================================================================
 * Renders `blueprint.navigation.items` as fixed-position niche-specific links.
 * All navigation links use <InterceptLink> to trigger kinetic transitions
 * instead of native browser navigation.
 */

import React, { memo, useMemo } from "react";
import { InterceptLink } from "./InterceptLink";
import { useBlueprint } from "./context/BlueprintContext";
import { useAnimationContext } from "./hooks/useAnimationContext";

export const Navigation = memo(() => {
  const { blueprint } = useBlueprint();
  const { route } = useAnimationContext();
  const nav = blueprint.navigation;

  const styleClass = useMemo(() => {
    switch (nav.style) {
      case "floatingPill":
        return "fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full backdrop-blur-xl bg-white/5 border border-white/10";
      case "transparentGlass":
        return "fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 backdrop-blur-md bg-black/20 border-b border-white/5";
      case "helixMorph":
        return "fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 bg-gradient-to-b from-black/80 to-transparent";
      case "minimalBar":
        return "fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 bg-black/90 border-b border-white/10";
      case "sidebarDock":
        return "fixed top-0 left-0 h-full z-50 w-20 md:w-64 py-12 px-4 backdrop-blur-xl bg-black/60 border-r border-white/10 flex flex-col";
      default:
        return "fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 backdrop-blur-md bg-black/40 border-b border-white/5";
    }
  }, [nav.style]);

  const isSidebar = nav.style === "sidebarDock";

  return (
    <nav className={styleClass}>
      <div
        className={`${
          isSidebar ? "flex flex-col gap-8" : "flex items-center justify-between"
        }`}
      >
        {/* Brand / Logo mark */}
        <div className={`${isSidebar ? "text-center" : ""} flex-shrink-0`}>
          <span className="text-xs font-black tracking-[0.3em] uppercase text-white">
            {blueprint.niche}
          </span>
        </div>

        {/* Nav items */}
        <div
          className={`${
            isSidebar
              ? "flex flex-col gap-6"
              : "flex items-center gap-6 md:gap-10"
          }`}
        >
          {nav.items.map((item, idx) => {
            const isActive = item.path === route;
            const isLast = idx === nav.items.length - 1;

            return (
              <InterceptLink
                key={item.path}
                href={item.path}
                variant={item.isCta || isLast ? "cta" : "default"}
                className={`
                  ${isActive ? "text-white" : ""}
                  ${isSidebar ? "text-sm" : ""}
                `}
              >
                {item.icon && (
                  <span className="mr-2 opacity-60">{item.icon}</span>
                )}
                <span
                  className={`${
                    isSidebar
                      ? "text-sm font-medium tracking-wide uppercase"
                      : ""
                  }`}
                >
                  {item.label}
                </span>
              </InterceptLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
});
Navigation.displayName = "Navigation";
