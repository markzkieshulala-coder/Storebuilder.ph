"use client";
/**
 * ============================================================================
 * ULTRA-PREMIUM APP — Root Application Shell
 * ============================================================================
 */

import React, { memo } from "react";
import dynamic from "next/dynamic";
import { AnimationProvider } from "../context/AnimationContext";
import { BlueprintProvider } from "../context/BlueprintContext";
import { Navigation } from "./Navigation";
import { KineticPageContainer } from "./KineticPageContainer";
import type { SiteBlueprint } from "../types/blueprint";

// Three.js Canvas is lazy-loaded so it never blocks the initial JS bundle compile
const UnifiedBackground3D = dynamic(
  () => import("./UnifiedBackground3D").then((m) => ({ default: m.UnifiedBackground3D })),
  { ssr: false, loading: () => null }
);

interface UltraPremiumAppProps {
  blueprint: SiteBlueprint;
}

export const UltraPremiumApp = memo<UltraPremiumAppProps>(({ blueprint }) => {
  return (
    <BlueprintProvider blueprint={blueprint}>
      <AnimationProvider initialRoute={blueprint.pages[0]?.path ?? "/"}>
        <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
          {/* Fixed global 3D background — lazy loaded, never blocks initial render */}
          <UnifiedBackground3D />

          {/* Fixed global navigation */}
          <Navigation />

          {/* Main content area — kinetic transitions applied here */}
          <main className="relative z-10">
            <KineticPageContainer />
          </main>
        </div>
      </AnimationProvider>
    </BlueprintProvider>
  );
});
UltraPremiumApp.displayName = "UltraPremiumApp";
