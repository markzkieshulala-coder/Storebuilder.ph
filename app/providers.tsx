"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

function LocationCapture() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("loc_ok")) return;
    fetch("/api/user/location", { method: "POST" })
      .then(() => sessionStorage.setItem("loc_ok", "1"))
      .catch(() => {});
  }, [status]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LocationCapture />
      {children}
    </SessionProvider>
  );
}
