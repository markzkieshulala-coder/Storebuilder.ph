"use client";

import { useEffect } from "react";

// Fires a single best-effort beacon to /api/track/visit on mount so the
// merchant's analytics dashboard can count this page view. Failures are
// swallowed — analytics must never break the user experience.
export default function VisitTracker({ subdomain, path }: { subdomain: string; path: string }) {
  useEffect(() => {
    if (!subdomain) return;
    const body = JSON.stringify({ subdomain, path });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/track/visit", blob);
      } else {
        fetch("/api/track/visit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* swallow */
    }
  }, [subdomain, path]);
  return null;
}
