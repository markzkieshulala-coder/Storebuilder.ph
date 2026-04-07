"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles, AlertTriangle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link has expired or has already been used.",
  OAuthAccountNotLinked: "An account with this email already exists. Please sign in with your email and password.",
  Default: "An error occurred during sign in. Please try again.",
};

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error") || "Default";
  const message = ERROR_MESSAGES[error] || ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: "var(--font-syne)" }}>
            Storebuilder.ph
          </span>
        </div>

        <div className="bg-zinc-950 border border-red-500/20 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Sign in error</h1>
          <p className="text-white/50 text-sm mb-6">{message}</p>
          <Link
            href="/auth/signin"
            className="block w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium text-sm transition-colors"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
