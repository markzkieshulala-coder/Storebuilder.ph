"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Lock, Crown, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [saving, setSaving] = useState(false);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        await update({ name });
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  }

  const isPro = session?.user?.plan === "PRO";

  return (
    <div className="min-h-screen bg-black text-white p-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-8" style={{ fontFamily: "var(--font-syne)" }}>Account Settings</h1>

      <div className="space-y-6">
        {/* Plan badge */}
        <div className="p-4 rounded-xl border flex items-center justify-between" style={isPro ? { borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)" } : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-3">
            <Crown size={20} className={isPro ? "text-amber-400" : "text-white/30"} />
            <div>
              <p className="font-semibold text-sm">{isPro ? "Pro Plan" : "Free Plan"}</p>
              <p className="text-xs text-white/40">{isPro ? "Unlimited generations · Custom domain" : "2 generations/day · Free subdomain"}</p>
            </div>
          </div>
          {!isPro && (
            <Link href="/upgrade" className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium transition-colors">
              Upgrade
            </Link>
          )}
        </div>

        {/* Profile */}
        <div className="p-6 rounded-xl bg-zinc-950 border border-white/8">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
            <User size={16} className="text-violet-400" />
            Profile
          </h2>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Email</label>
              <input
                value={session?.user?.email || ""}
                disabled
                className="w-full bg-white/3 border border-white/6 rounded-xl px-4 py-2.5 text-sm text-white/40 cursor-not-allowed"
              />
            </div>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium transition-colors">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
