"use client";

import Link from "next/link";
import { XCircle, ArrowLeft } from "lucide-react";

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
          <XCircle size={36} className="text-white/30" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Payment cancelled</h1>
        <p className="text-white/50 mb-8">
          No worries — your free plan is still active. You can upgrade anytime.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/12 hover:border-white/25 text-sm transition-colors">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <Link href="/upgrade" className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors">
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
