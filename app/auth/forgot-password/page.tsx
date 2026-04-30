"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      setSent(true);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Image src="/logo.svg" alt="Storebuilder.ph" width={36} height={36} />
          <span className="font-bold text-xl text-gray-900">
            Storebuilder<span style={{ color: BLUE }}>.ph</span>
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#e0edff" }}>
                  <CheckCircle size={28} style={{ color: BLUE }} />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                If an account with <strong>{email}</strong> exists, we&apos;ve sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-xs text-gray-400">
                Didn&apos;t receive it?{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-semibold hover:underline"
                  style={{ color: BLUE }}
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Forgot password?</h1>
              <p className="text-gray-500 text-sm mb-7">Enter your email and we&apos;ll send you a reset link.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="juan@example.com"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none transition-colors"
                      onFocus={(e) => e.target.style.borderColor = BLUE}
                      onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: BLUE }}
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        <Link href="/auth/signin" className="flex items-center gap-1.5 justify-center mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
