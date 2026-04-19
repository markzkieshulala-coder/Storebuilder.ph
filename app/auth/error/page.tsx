"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

const BLUE = "#1877F2";

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.svg" alt="Storebuilder.ph" width={36} height={36} />
          <span className="font-bold text-xl text-gray-900">
            Storebuilder<span style={{ color: BLUE }}>.ph</span>
          </span>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in error</h1>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link
            href="/auth/signin"
            className="block w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ background: BLUE }}
          >
            Try again
          </Link>
        </div>

        <Link href="/" className="block mt-5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ← Bumalik sa home
        </Link>
      </div>
    </div>
  );
}
