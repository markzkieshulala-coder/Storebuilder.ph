"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const BLUE = "#1877F2";

function ConfirmInner() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing confirmation token.");
      return;
    }
    fetch(`/api/user/payment-method/confirm?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) {
          setState("ok");
          setMessage("Your saved payment method has been removed and any active subscription cancelled.");
        } else {
          setState("error");
          setMessage(d.error || "Could not complete removal. The link may have expired.");
        }
      })
      .catch(() => { setState("error"); setMessage("Network error. Please try again."); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.svg" alt="Storebuilder.ph" width={36} height={36} />
          <span className="font-bold text-xl text-gray-900">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          {state === "loading" && (<>
            <Loader2 size={36} className="mx-auto mb-4 animate-spin text-gray-400" />
            <h1 className="text-lg font-bold text-gray-900 mb-1">Confirming…</h1>
            <p className="text-sm text-gray-500">Removing your saved payment method.</p>
          </>)}
          {state === "ok" && (<>
            <CheckCircle2 size={44} className="mx-auto mb-4" style={{ color: "#16a34a" }} />
            <h1 className="text-lg font-bold text-gray-900 mb-1">Payment method removed</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link href="/dashboard/settings" className="inline-flex items-center justify-center w-full py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: BLUE }}>
              Back to settings
            </Link>
          </>)}
          {state === "error" && (<>
            <XCircle size={44} className="mx-auto mb-4" style={{ color: "#ef4444" }} />
            <h1 className="text-lg font-bold text-gray-900 mb-1">Removal failed</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link href="/dashboard/settings" className="inline-flex items-center justify-center w-full py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: BLUE }}>
              Back to settings
            </Link>
          </>)}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPaymentRemovalPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
