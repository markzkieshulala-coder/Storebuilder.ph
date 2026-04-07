"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown, Check, Sparkles, CreditCard, Zap, Globe, Shield } from "lucide-react";
import toast from "react-hot-toast";

const MONTHLY_PRICE = 29900; // ₱299 in centavos
const YEARLY_PRICE = 249900; // ₱2,499 in centavos

export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    if (!session) {
      router.push("/auth/signin?callbackUrl=/upgrade");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create payment link");
        return;
      }

      // Redirect to PayMongo payment page
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isPro = session?.user?.plan === "PRO";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-16">
      <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-12 transition-colors">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <div className="text-center mb-12 max-w-xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm mb-6">
          <Crown size={14} />
          Storebuilder.ph Pro
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-bricolage)" }}>
          Unlock unlimited creativity
        </h1>
        <p className="text-white/50 text-lg">
          Generate unlimited websites, connect custom domains, and get smarter AI with Claude Sonnet.
        </p>
      </div>

      {isPro ? (
        <div className="p-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center max-w-sm w-full">
          <Crown size={32} className="text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">You're already on Pro!</h2>
          <p className="text-white/50 text-sm mb-6">Enjoy unlimited generations and all Pro features.</p>
          <Link href="/dashboard" className="block py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-md">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${billingCycle === "yearly" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">-30%</span>
            </button>
          </div>

          {/* Price card */}
          <div className="p-8 rounded-2xl border border-violet-500/40 bg-gradient-to-b from-violet-950/40 to-transparent mb-6">
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-bold">
                {billingCycle === "monthly" ? "₱299" : "₱208"}
              </span>
              <span className="text-white/40 mb-2">/month</span>
            </div>
            {billingCycle === "yearly" && (
              <p className="text-sm text-emerald-400 mb-6">Billed ₱2,499/year — save ₱1,089</p>
            )}
            {billingCycle === "monthly" && <div className="mb-6" />}

            <ul className="space-y-3 mb-8">
              {[
                { icon: Zap, text: "Unlimited AI website generations" },
                { icon: Sparkles, text: "Powered by Claude Sonnet (smarter output)" },
                { icon: Globe, text: "Connect your own custom domain" },
                { icon: Shield, text: "Remove Storebuilder.ph branding" },
                { icon: CreditCard, text: "Priority support" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check size={11} className="text-violet-400" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 font-semibold text-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Crown size={18} />
                  Upgrade to Pro
                </>
              )}
            </button>
          </div>

          {/* Payment methods */}
          <div className="text-center">
            <p className="text-xs text-white/30 mb-3">Secure payment via PayMongo</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {["GCash", "Maya", "GoTyme", "Visa", "Mastercard", "BancNet"].map((m) => (
                <span key={m} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/8 text-xs text-white/50">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
