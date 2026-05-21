"use client";
/**
 * ============================================================================
 * ULTRA-PREMIUM APP — Root Application Shell
 * ============================================================================
 * Mounts the AnimationProvider, BlueprintProvider, UnifiedBackground3D,
 * Navigation, and KineticPageContainer. This is the single entry point
 * for the entire front-end runtime.
 *
 * Usage:
 *   import { UltraPremiumApp } from "@ultra-premium/frontend";
 *   <UltraPremiumApp blueprint={siteBlueprint} />
 */

import React, { memo } from "react";
import { AnimationProvider } from "./context/AnimationContext";
import { BlueprintProvider } from "./context/BlueprintContext";
import { UnifiedBackground3D } from "./UnifiedBackground3D";
import { Navigation } from "./Navigation";
import { KineticPageContainer } from "./KineticPageContainer";
import type { SiteBlueprint } from "./types/blueprint";

interface UltraPremiumAppProps {
  blueprint: SiteBlueprint;
}

export const UltraPremiumApp = memo<UltraPremiumAppProps>(({ blueprint }) => {
  return (
    <BlueprintProvider blueprint={blueprint}>
      <AnimationProvider initialRoute={blueprint.pages[0]?.path ?? "/"}>
        <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
          {/* Fixed global 3D background — persists across ALL route changes */}
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
