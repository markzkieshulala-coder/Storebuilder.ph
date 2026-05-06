"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";

export default function ConfirmEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const token = params.get("token");

  const [state, setState] = useState<"loading" | "ok" | "err">("loading");
  const [msg, setMsg] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("err");
      setMsg("Missing confirmation token.");
      return;
    }
    (async () => {
      const res = await fetch("/api/user/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("err");
        setMsg(data.error || "Failed to confirm email.");
        return;
      }
      setState("ok");
      setEmail(data.email);
      // Refresh JWT so the new email shows up immediately.
      await update({});
    })();
  }, [token, update]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-zinc-950 border border-white/10 text-center">
        {state === "loading" && (
          <>
            <Mail size={36} className="text-violet-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Confirming your email…</h1>
            <p className="text-sm text-white/50">Please wait.</p>
          </>
        )}
        {state === "ok" && (
          <>
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Email updated</h1>
            <p className="text-sm text-white/60 mb-6">
              Your account email is now <strong>{email}</strong>.
            </p>
            <Link href="/dashboard/settings" className="inline-block px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium">
              Back to settings
            </Link>
          </>
        )}
        {state === "err" && (
          <>
            <AlertCircle size={36} className="text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Couldn't confirm</h1>
            <p className="text-sm text-white/60 mb-6">{msg}</p>
            <Link href="/dashboard/settings" className="inline-block px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium">
              Back to settings
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
