"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
        <div className="w-full max-w-sm">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
            <AlertCircle size={40} className="mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid reset link</h1>
            <p className="text-gray-500 text-sm mb-6">This link is missing required information. Please request a new one.</p>
            <Link href="/auth/forgot-password" className="inline-block py-2.5 px-6 rounded-xl font-semibold text-sm text-white" style={{ background: BLUE }}>
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/auth/signin"), 3000);
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
          {done ? (
            <div className="text-center py-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#e0edff" }}>
                  <CheckCircle size={28} style={{ color: BLUE }} />
                </div>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated!</h1>
              <p className="text-gray-500 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
              <p className="text-gray-500 text-sm mb-7">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">New password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-colors"
                      onFocus={(e) => e.target.style.borderColor = BLUE}
                      onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="Repeat your password"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm outline-none transition-colors"
                      onFocus={(e) => e.target.style.borderColor = BLUE}
                      onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-red-500 mt-1.5">Passwords do not match</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || (!!confirm && password !== confirm)}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: BLUE }}
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>

        {!done && (
          <Link href="/auth/forgot-password" className="flex items-center gap-1.5 justify-center mt-5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} />
            Request a new link
          </Link>
        )}
      </div>
    </div>
  );
}
