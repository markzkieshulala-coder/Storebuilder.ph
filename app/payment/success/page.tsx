"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentSuccessPage() {
  const { update } = useSession();

  useEffect(() => {
    // Refresh session to pick up new plan
    update();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <div className="relative inline-block mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto">
            <Crown size={40} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <CheckCircle size={18} className="text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
          Welcome to Pro!
        </h1>
        <p className="text-white/50 mb-8">
          Your account has been upgraded. You now have unlimited website generations powered by Claude Sonnet.
        </p>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-violet-950/50 to-transparent border border-violet-500/20 mb-8 text-left">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-violet-400" />
            What you unlocked:
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            {[
              "Unlimited AI website generations",
              "Claude Sonnet — smarter, better quality output",
              "Custom domain connection",
              "Remove Storebuilder.ph branding",
              "Priority support",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-violet-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium transition-colors"
        >
          <Sparkles size={18} />
          Start building
        </Link>
      </motion.div>
    </div>
  );
}
