"use client";

/**
 * Next.js wrapper for UltraPremiumApp.
 * Dynamic import with ssr:false prevents Three.js / Canvas from
 * running during server-side rendering.
 */

import dynamic from "next/dynamic";
import type { SiteBlueprint } from "./types/blueprint";

const UltraPremiumApp = dynamic(
  () => import("./components/UltraPremiumApp").then((m) => ({ default: m.UltraPremiumApp })),
  { ssr: false, loading: () => <UltraPremiumSkeleton /> }
);

function UltraPremiumSkeleton() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: "system-ui, sans-serif",
        fontSize: "14px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      Initialising Ultra-Premium Engine…
    </div>
  );
}

interface Props {
  blueprint: SiteBlueprint;
}

export function UltraPremiumRenderer({ blueprint }: Props) {
  return <UltraPremiumApp blueprint={blueprint} />;
}
