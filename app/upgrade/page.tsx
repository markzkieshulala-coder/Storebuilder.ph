"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Crown, Check, Zap, Globe, Shield, CreditCard, Database, Share2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { PLANS, pesos } from "@/lib/plans";

const BLUE = "#1877F2";
const FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

type Cycle = "monthly" | "yearly";

const PLAN_FEATURES: Record<"FREE" | "PRO" | "ENTERPRISE", { included: { icon: any; text: string }[]; excluded?: string[] }> = {
  FREE: {
    included: [
      { icon: Check, text: "Up to 5 websites per month" },
      { icon: Check, text: "Access to all editor features" },
      { icon: Check, text: "Free subdomain (yourname.storebuilder.ph)" },
      { icon: Check, text: "No payment required" },
    ],
    excluded: ["Payment links integration", "Template sharing", "System / CRM generation", "Custom domain"],
  },
  PRO: {
    included: [
      { icon: Sparkles, text: "Up to 10 websites per month" },
      { icon: Check, text: "Access to all editor features" },
      { icon: CreditCard, text: "Add any payment links (GCash, Maya, bank, PayPal, etc.)" },
      { icon: Share2, text: "Template link sharing for generated websites" },
      { icon: Globe, text: "Custom domain connection" },
      { icon: Shield, text: "Remove Storebuilder.ph branding" },
    ],
  },
  ENTERPRISE: {
    included: [
      { icon: Sparkles, text: "Up to 20 websites per month" },
      { icon: Check, text: "Access to all editor features" },
      { icon: CreditCard, text: "Add any payment links" },
      { icon: Database, text: "System / CRM generation for each website" },
      { icon: Share2, text: "Template link sharing" },
      { icon: Globe, text: "Custom domain connection" },
      { icon: Shield, text: "Remove Storebuilder.ph branding" },
      { icon: Zap, text: "Priority generation queue" },
    ],
  },
};

export default function UpgradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [loading, setLoading] = useState<"PRO" | "ENTERPRISE" | null>(null);

  const currentPlan = (session?.user?.plan || "FREE") as "FREE" | "PRO" | "ENTERPRISE";

  async function handleUpgrade(plan: "PRO" | "ENTERPRISE") {
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/upgrade`);
      return;
    }
    setLoading(plan);
    try {
      const res = await fetch("/api/payment/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCycle: cycle, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create payment link");
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function priceFor(plan: "FREE" | "PRO" | "ENTERPRISE") {
    if (plan === "FREE") return { display: "₱0", suffix: "/forever", note: "Free, no credit card" };
    const p = PLANS[plan];
    if (cycle === "monthly") {
      return { display: pesos(p.monthlyPriceCentavos), suffix: "/month", note: `or ${pesos(p.yearlyPriceCentavos)}/year (save 28%)` };
    }
    const monthly = Math.round(p.yearlyPriceCentavos / 12);
    return { display: pesos(monthly), suffix: "/month", note: `Billed ${pesos(p.yearlyPriceCentavos)}/year` };
  }

  function PlanCard({ tier, popular }: { tier: "FREE" | "PRO" | "ENTERPRISE"; popular?: boolean }) {
    const plan = PLANS[tier];
    const features = PLAN_FEATURES[tier];
    const price = priceFor(tier);
    const isCurrent = currentPlan === tier;

    return (
      <div
        className={`relative bg-white rounded-2xl border p-6 sm:p-7 flex flex-col ${
          popular ? "border-2 shadow-lg" : "border-gray-200"
        }`}
        style={popular ? { borderColor: BLUE } : {}}
      >
        {popular && (
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 px-2.5 py-1 rounded-full text-white text-[10px] sm:text-xs font-bold" style={{ background: BLUE }}>
            POPULAR
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.label}</h2>
        <p className="text-xs text-gray-500 mb-4 sm:mb-5 min-h-[32px]">{plan.tagline}</p>

        <div className="flex items-end gap-2 mb-1 flex-wrap">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">{price.display}</span>
          <span className="text-gray-400 text-sm mb-1 sm:mb-2">{price.suffix}</span>
        </div>
        <p className="text-xs text-gray-400 mb-5 sm:mb-6">{price.note}</p>

        <ul className="space-y-2.5 mb-6 flex-1">
          {features.included.map((f) => (
            <li key={f.text} className="flex items-start gap-2.5 text-sm text-gray-700">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#EBF3FF" }}>
                <f.icon size={11} style={{ color: BLUE }} />
              </div>
              <span className="leading-relaxed">{f.text}</span>
            </li>
          ))}
          {features.excluded?.map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm text-gray-300 line-through">
              <span className="w-5 h-5 mt-0.5 shrink-0 text-center leading-5 text-gray-200">x</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>

        {tier === "FREE" ? (
          isCurrent ? (
            <div className="text-center py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 bg-gray-50">
              Your current plan
            </div>
          ) : (
            <Link href="/auth/register" className="block text-center py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 hover:border-blue-300 transition-colors">
              Start for free
            </Link>
          )
        ) : isCurrent ? (
          <div className="text-center py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold" style={{ color: BLUE }}>
            Your current plan
          </div>
        ) : (
          <button
            onClick={() => handleUpgrade(tier)}
            disabled={loading === tier}
            className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-opacity"
            style={{ background: tier === "ENTERPRISE" ? "#1C1E21" : BLUE }}
          >
            {loading === tier ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Crown size={14} />
                Upgrade to {plan.label}
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: FONT }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={30} height={30} />
            <span className="font-bold text-gray-900 truncate">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="transition-colors" style={{ color: BLUE }}>Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
          <Link href="/dashboard" className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0" style={{ backgroundColor: BLUE }}>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-10 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">Plans and Pricing</h1>
          <p className="text-gray-500 text-base sm:text-lg">
            Choose the plan that fits your business. Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Cycle toggle */}
        <div className="flex items-center justify-center gap-1 mb-8 sm:mb-12 p-1 rounded-lg w-fit mx-auto" style={{ background: "#F3F4F6" }}>
          <button
            onClick={() => setCycle("monthly")}
            className="px-5 sm:px-6 py-2 rounded-md text-sm font-semibold transition-all"
            style={cycle === "monthly" ? { background: "#fff", color: BLUE, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className="px-5 sm:px-6 py-2 rounded-md text-sm font-semibold transition-all relative"
            style={cycle === "yearly" ? { background: "#fff", color: BLUE, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
          >
            Yearly
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: "#16a34a" }}>-28%</span>
          </button>
        </div>

        {/* Pricing grid */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <PlanCard tier="FREE" />
          <PlanCard tier="PRO" popular />
          <PlanCard tier="ENTERPRISE" />
        </div>

        {/* Payment methods */}
        <div className="text-center mt-10">
          <p className="text-xs text-gray-400 mb-3">Secure payments via PayMongo</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {["GCash", "Maya", "GoTyme", "Visa", "Mastercard", "BancNet"].map((m) => (
              <span key={m} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500 font-medium">
                {m}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">All payments are final · Cancel anytime</p>
        </div>

        {/* No Refund Notice */}
        <div className="max-w-2xl mx-auto mt-8 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <p className="text-xs text-amber-700 text-center font-medium">
            All payments are final and non-refundable. Generation credits are consumed immediately upon use.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 sm:px-6 text-center text-sm mt-8">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built in the Philippines</p>
      </footer>
    </div>
  );
}
