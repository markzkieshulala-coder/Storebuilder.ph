"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Globe, Edit3, Trash2, ExternalLink,
  Copy, BarChart2, Settings, LogOut, Crown, Clock,
  AlertCircle, CheckCircle, Zap
} from "lucide-react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { timeUntilReset } from "@/lib/utils";

type Website = {
  id: string; name: string; type: string; subdomain: string | null;
  customDomain: string | null; published: boolean; thumbnail: string | null;
  seoTitle: string | null; createdAt: string; updatedAt: string;
};

type Credits = {
  used: number; limit: number; remaining: number;
  canGenerate: boolean; resetAt: string; plan: string;
};

const GENERATION_STEPS = [
  "Analyzing your prompt...",
  "Designing layout & sections...",
  "Crafting color palette...",
  "Writing content...",
  "Adding Filipino touches...",
  "Finalizing your website...",
];

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resetIn, setResetIn] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  // Auto-generate if prompt passed in URL
  useEffect(() => {
    const urlPrompt = searchParams.get("generate");
    if (urlPrompt && !isGenerating && credits?.canGenerate) {
      setPrompt(urlPrompt);
      handleGenerate(urlPrompt);
    }
  }, [searchParams, credits]);

  // Countdown timer
  useEffect(() => {
    if (!credits?.resetAt) return;
    const interval = setInterval(() => {
      setResetIn(timeUntilReset(new Date(credits.resetAt)));
    }, 1000);
    return () => clearInterval(interval);
  }, [credits?.resetAt]);

  // Cycle through generation steps
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setGenerationStep((s) => (s + 1) % GENERATION_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  async function fetchData() {
    setLoading(true);
    try {
      const [wsRes, crRes] = await Promise.all([
        fetch("/api/websites"),
        fetch("/api/credits"),
      ]);
      const wsData = await wsRes.json();
      const crData = await crRes.json();
      setWebsites(wsData.websites || []);
      setCredits(crData);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(overridePrompt?: string) {
    const finalPrompt = overridePrompt || prompt;
    if (!finalPrompt.trim()) { toast.error("Please enter a prompt"); return; }
    if (!credits?.canGenerate && credits?.plan === "FREE") {
      toast.error("You've used your free generations for today. Come back tomorrow or upgrade to Pro!");
      return;
    }
    setIsGenerating(true);
    setGenerationStep(0);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "CREDIT_LIMIT") toast.error(data.error);
        else toast.error(data.error || "Generation failed");
        return;
      }
      toast.success("Website generated!");
      setPrompt("");
      await fetchData();
      router.push(`/editor/${data.website.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/websites/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Website deleted"); fetchData(); }
    else toast.error("Failed to delete");
  }

  async function handlePublish(id: string) {
    const res = await fetch(`/api/websites/${id}/publish`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Live at ${data.url}`);
      fetchData();
    }
  }

  async function handleDuplicate(id: string) {
    // Get source website
    const res = await fetch(`/api/websites/${id}`);
    const data = await res.json();
    if (!res.ok) { toast.error("Failed to duplicate"); return; }
    const src = data.website;
    const dupRes = await fetch("/api/websites/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: id }),
    });
    if (dupRes.ok) { toast.success("Website duplicated"); fetchData(); }
    else toast.error("Failed to duplicate");
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isPro = credits?.plan === "PRO";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-zinc-950 border-r border-white/6 flex flex-col z-40">
        <div className="p-5 border-b border-white/6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>Storebuilder.ph</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="px-3 py-2 rounded-lg bg-white/5 flex items-center gap-3 text-sm font-medium">
            <Globe size={16} className="text-violet-400" />
            My Websites
          </div>
          <Link href="/dashboard/settings" className="px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 text-sm text-white/50 hover:text-white transition-colors">
            <Settings size={16} />
            Settings
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-white/5 flex items-center gap-3 text-sm text-amber-400/80 hover:text-amber-400 transition-colors">
              <BarChart2 size={16} />
              Admin
            </Link>
          )}
        </nav>

        <div className="p-4 space-y-3 border-t border-white/6">
          {/* Credits widget */}
          {credits && (
            <div className="p-3 rounded-xl bg-white/3 border border-white/8">
              {isPro ? (
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Pro Plan</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50">Daily credits</span>
                    <span className="text-xs font-bold text-white">{credits.remaining}/{credits.limit}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all"
                      style={{ width: `${(credits.remaining / credits.limit) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/30">
                    <Clock size={11} />
                    Resets in {resetIn}
                  </div>
                </>
              )}
            </div>
          )}

          {!isPro && (
            <Link href="/upgrade" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-900/50 to-indigo-900/50 border border-violet-700/30 text-xs font-medium text-violet-300 hover:from-violet-900/70 transition-colors">
              <Crown size={13} />
              Upgrade to Pro
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white/40 hover:text-white/70 transition-colors w-full"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
              Good {getGreeting()}, {session?.user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {websites.length === 0 ? "Create your first website below" : `You have ${websites.length} website${websites.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Generation box */}
        <div className="mb-8 p-6 rounded-2xl bg-zinc-950 border border-white/8">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            Generate a new website
          </h2>

          {isGenerating ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-violet-300 font-medium animate-pulse">{GENERATION_STEPS[generationStep]}</p>
              <p className="text-xs text-white/30 mt-2">This takes about 10-20 seconds</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder='e.g. "Barbershop called Kings Cut with a masculine dark design"'
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-violet-500/40 transition-colors"
                disabled={!credits?.canGenerate && !isPro}
              />
              <button
                onClick={() => handleGenerate()}
                disabled={!credits?.canGenerate && !isPro}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Sparkles size={16} />
                Generate
              </button>
            </div>
          )}

          {!isGenerating && credits && !isPro && credits.remaining === 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/80">
              <AlertCircle size={13} />
              No credits left today. Resets in {resetIn} · <Link href="/upgrade" className="underline hover:text-amber-400">Upgrade to Pro</Link>
            </div>
          )}
        </div>

        {/* Websites grid */}
        {websites.length === 0 ? (
          <div className="text-center py-24 text-white/25">
            <Globe size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium mb-2">No websites yet</p>
            <p className="text-sm">Type a prompt above and click Generate to create your first website</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {websites.map((site) => (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-950 border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="h-36 bg-gradient-to-br from-violet-950/60 to-indigo-950/40 flex items-center justify-center relative">
                  <Globe size={32} className="text-violet-800/60" />
                  {site.published && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold truncate">{site.name}</h3>
                    <span className="text-xs text-white/30 ml-2 shrink-0">{site.type}</span>
                  </div>
                  <p className="text-xs text-white/35 mb-4">
                    Edited {new Date(site.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  </p>

                  <div className="flex gap-2">
                    <Link
                      href={`/editor/${site.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium transition-colors"
                    >
                      <Edit3 size={13} />
                      Edit
                    </Link>
                    {!site.published ? (
                      <button
                        onClick={() => handlePublish(site.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 hover:border-emerald-500/40 hover:text-emerald-400 text-xs transition-colors"
                      >
                        <Zap size={13} />
                        Publish
                      </button>
                    ) : (
                      <a
                        href={`https://${site.subdomain}.storebuilder.ph`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 hover:border-white/25 text-xs transition-colors"
                      >
                        <ExternalLink size={13} />
                        View
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(site.id, site.name)}
                      className="p-2 rounded-lg border border-white/8 hover:border-red-500/30 hover:text-red-400 text-white/40 text-xs transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
