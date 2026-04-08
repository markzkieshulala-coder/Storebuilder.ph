"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Crown, Check, Zap, Globe, Shield, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";
const MONTHLY_PRICE = 99900;  // ₱999 in centavos
const YEARLY_PRICE = 899900;  // ₱8,999 in centavos

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
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isPro = session?.user?.plan === "PRO";

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={30} height={30} />
            <span className="font-bold text-gray-900">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="transition-colors" style={{ color: BLUE }}>Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
          <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="py-16 px-4">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Mga Plano at Presyo</h1>
          <p className="text-gray-500 text-lg">
            Magsimula nang libre. Mag-upgrade kapag handa ka na para sa mas maraming features.
          </p>
        </div>

        {isPro ? (
          <div className="max-w-sm mx-auto p-8 rounded-2xl border-2 text-center" style={{ borderColor: BLUE, background: "#EBF3FF" }}>
            <Crown size={36} className="mx-auto mb-4" style={{ color: BLUE }} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ikaw ay Pro na!</h2>
            <p className="text-gray-500 text-sm mb-6">I-enjoy ang unlimited generations at lahat ng Pro features.</p>
            <Link href="/dashboard" className="block py-3 rounded-lg font-semibold text-sm text-white" style={{ background: BLUE }}>
              Bumalik sa dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-1 mb-10 p-1 rounded-lg w-fit mx-auto" style={{ background: "#F3F4F6" }}>
              <button
                onClick={() => setBillingCycle("monthly")}
                className="px-6 py-2 rounded-md text-sm font-semibold transition-all"
                style={billingCycle === "monthly" ? { background: "#fff", color: BLUE, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className="px-6 py-2 rounded-md text-sm font-semibold transition-all relative"
                style={billingCycle === "yearly" ? { background: "#fff", color: BLUE, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" } : { color: "#6B7280" }}
              >
                Yearly
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold" style={{ background: "#16a34a" }}>-25%</span>
              </button>
            </div>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="p-8 rounded-2xl border border-gray-200 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Free</h2>
                <div className="text-5xl font-bold text-gray-900 mb-1">₱0</div>
                <p className="text-gray-400 text-sm mb-6">Walang credit card · Libre magpakailanman</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "3 AI website generations bawat araw",
                    "Unlimited na pag-edit",
                    "Libreng subdomain (yourname.storebuilder.ph)",
                    "Lahat ng editor features",
                    "Powered by Claude Haiku AI",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check size={16} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                      {item}
                    </li>
                  ))}
                  {["Custom domain", "Remove branding"].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-400 line-through">
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center leading-4">–</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className="block text-center py-3 rounded-xl border-2 border-gray-200 font-semibold text-sm text-gray-700 hover:border-blue-300 transition-colors">
                  Magsimula nang libre
                </Link>
              </div>

              {/* Pro */}
              <div className="p-8 rounded-2xl border-2 bg-white relative overflow-hidden" style={{ borderColor: BLUE }}>
                <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-white text-xs font-bold" style={{ background: BLUE }}>
                  POPULAR
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Pro</h2>
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-5xl font-bold text-gray-900">
                    {billingCycle === "monthly" ? "₱999" : "₱750"}
                  </span>
                  <span className="text-gray-400 text-sm mb-2">/buwan</span>
                </div>
                {billingCycle === "yearly" ? (
                  <p className="text-sm text-green-600 font-medium mb-6">Billed ₱8,999/taon · Makatipid ng ₱3,989</p>
                ) : (
                  <p className="text-sm text-gray-400 mb-6">o ₱8,999/taon at makatipid ng 25%</p>
                )}
                <ul className="space-y-3 mb-8">
                  {[
                    { icon: Zap, text: "Unlimited AI website generations" },
                    { icon: CreditCard, text: "Powered by Claude Sonnet (mas matalino)" },
                    { icon: Globe, text: "Custom domain connection" },
                    { icon: Shield, text: "Remove Storebuilder.ph branding" },
                    { icon: Check, text: "Priority support" },
                    { icon: Check, text: "Advanced section library" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "#EBF3FF" }}>
                        <Icon size={11} style={{ color: BLUE }} />
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 hover:opacity-90"
                  style={{ background: BLUE }}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Crown size={16} /> Mag-upgrade sa Pro</>
                  )}
                </button>
              </div>
            </div>

            {/* Payment methods */}
            <div className="text-center mt-8">
              <p className="text-xs text-gray-400 mb-3">Secure na pagbabayad sa pamamagitan ng PayMongo</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {["GCash", "Maya", "GoTyme", "Visa", "Mastercard", "BancNet"].map((m) => (
                  <span key={m} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500 font-medium">
                    {m}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">7-day money-back guarantee · Cancel anytime</p>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm mt-8">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built with 💙 in the Philippines</p>
      </footer>
    </div>
  );
}
