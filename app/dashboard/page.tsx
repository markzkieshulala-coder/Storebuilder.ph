"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Globe, Edit3, Trash2, ExternalLink, Settings, LogOut,
  Crown, Clock, AlertCircle, Zap, Camera, CheckCircle2, Menu, X,
  EyeOff, ChevronDown, Share2, Copy, Check,
} from "lucide-react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { timeUntilReset } from "@/lib/utils";

const BLUE = "#1877F2";
const FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

type Website = {
  id: string; name: string; type: string; subdomain: string | null;
  customDomain: string | null; published: boolean; thumbnail: string | null;
  seoTitle: string | null; createdAt: string; updatedAt: string;
};

type Credits = {
  used: number; limit: number; remaining: number;
  canGenerate: boolean; resetAt: string; plan: string;
  planLabel?: string;
  features?: { canShareTemplates?: boolean; canGenerateCRM?: boolean; canAddPaymentLinks?: boolean };
  slots?: { used: number; limit: number; remaining: number };
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (status === "unauthenticated") router.push("/auth/signin"); }, [status, router]);
  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
      if (session?.user?.image) setAvatarUrl(session.user.image);
    }
  }, [status]);
  useEffect(() => {
    const url = searchParams.get("generate");
    if (url && !isGenerating && credits?.canGenerate) { setPrompt(url); handleGenerate(url); }
  }, [searchParams, credits]);
  useEffect(() => {
    if (!credits?.resetAt) return;
    const t = setInterval(() => setResetIn(timeUntilReset(new Date(credits.resetAt))), 1000);
    return () => clearInterval(t);
  }, [credits?.resetAt]);
  useEffect(() => {
    if (!isGenerating) return;
    const t = setInterval(() => setGenerationStep(s => (s + 1) % GENERATION_STEPS.length), 1800);
    return () => clearInterval(t);
  }, [isGenerating]);
  // Close card menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [wsRes, crRes] = await Promise.all([fetch("/api/websites"), fetch("/api/credits")]);
      setWebsites((await wsRes.json()).websites || []);
      setCredits(await crRes.json());
    } finally { setLoading(false); }
  }

  async function handleGenerate(overridePrompt?: string) {
    const fp = overridePrompt || prompt;
    if (!fp.trim()) { toast.error("Please enter a prompt"); return; }
    if (!credits?.canGenerate && credits?.plan === "FREE") {
      toast.error("You've used your free generations for today. Upgrade to Pro!");
      return;
    }
    setIsGenerating(true);
    setGenerationStep(0);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fp }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Generation failed"); return; }
      toast.success("Website generated!");
      setPrompt("");
      await fetchData();
      router.push(`/editor/${data.website.id}`);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setIsGenerating(false); }
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
    if (res.ok) { toast.success(`Live at ${data.url}`); fetchData(); }
  }

  async function handleUnpublish(id: string) {
    const res = await fetch(`/api/websites/${id}/publish`, { method: "DELETE" });
    if (res.ok) { toast.success("Website unpublished"); fetchData(); }
    else toast.error("Failed to unpublish");
    setOpenMenuId(null);
  }

  async function handleShareTemplate(id: string) {
    setOpenMenuId(null);
    const res = await fetch(`/api/websites/${id}/template`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to create template link");
      return;
    }
    try {
      await navigator.clipboard.writeText(data.shareUrl);
      toast.success("Template link copied to clipboard", { duration: 4000 });
    } catch {
      toast.success(`Template link: ${data.shareUrl}`, { duration: 8000 });
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) { setAvatarUrl(data.image); toast.success("Profile picture updated!"); }
      else toast.error(data.error || "Upload failed");
    } finally { setAvatarUploading(false); e.target.value = ""; }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isPro = credits?.plan === "PRO" || credits?.plan === "ENTERPRISE";
  const canShareTemplate = !!credits?.features?.canShareTemplates;
  const initials = (session?.user?.name || session?.user?.email || "?")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#F0F2F5]" style={{ fontFamily: FONT }}>

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-[#E4E6EB] flex items-center px-4 gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE }}>
            <Sparkles size={13} color="#fff" />
          </div>
          <span className="font-bold text-sm text-gray-900">Storebuilder.ph</span>
        </div>
      </div>

      {/* ── Sidebar overlay (mobile) ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E4E6EB] z-50 flex flex-col"
            >
              <SidebarContent
                session={session}
                isPro={isPro}
                credits={credits}
                resetIn={resetIn}
                avatarUrl={avatarUrl}
                avatarUploading={avatarUploading}
                onAvatarUpload={handleAvatarUpload}
                onClose={() => setSidebarOpen(false)}
                showClose
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Sidebar (desktop, always visible) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-[#E4E6EB] flex-col z-40">
        <SidebarContent
          session={session}
          isPro={isPro}
          credits={credits}
          resetIn={resetIn}
          avatarUrl={avatarUrl}
          avatarUploading={avatarUploading}
          onAvatarUpload={handleAvatarUpload}
        />
      </aside>

      {/* ── Main content ── */}
      <main className="lg:ml-60 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-lg sm:text-xl font-bold text-[#1C1E21]">
              Good {getGreeting()}, {session?.user?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-sm text-[#65676B] mt-1">
              {websites.length === 0 ? "Create your first website below" : `${websites.length} website${websites.length !== 1 ? "s" : ""} in your account`}
            </p>
          </div>

          {/* Plan card */}
          {credits && !isPro && (
            <div className="bg-white rounded-2xl border border-[#E4E6EB] p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown size={18} color="#8A8D91" />
                <div>
                  <p className="text-sm font-semibold text-[#1C1E21]">Free Plan</p>
                  <p className="text-xs text-[#65676B]">{credits.remaining} generation{credits.remaining !== 1 ? "s" : ""} remaining · Resets in {resetIn}</p>
                </div>
              </div>
              <Link href="/upgrade" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap" style={{ background: BLUE }}>
                <Crown size={13} />
                Upgrade to Pro
              </Link>
            </div>
          )}

          {/* Generation box */}
          <div className="bg-white rounded-2xl border border-[#E4E6EB] p-4 sm:p-6 mb-6">
            <h2 className="text-sm font-bold text-[#1C1E21] mb-4 flex items-center gap-2">
              <Sparkles size={15} style={{ color: BLUE }} />
              Generate a new website
            </h2>
            {isGenerating ? (
              <div className="py-8 text-center">
                <div className="w-10 h-10 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-semibold" style={{ color: BLUE }}>{GENERATION_STEPS[generationStep]}</p>
                <p className="text-xs text-[#8A8D91] mt-1">This takes about 10–20 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  placeholder='e.g. "Barbershop called Kings Cut in Makati"'
                  disabled={!credits?.canGenerate && !isPro}
                  className="flex-1 bg-[#F0F2F5] border border-[#E4E6EB] rounded-xl px-4 py-3 text-sm text-[#1C1E21] outline-none transition-all focus:border-blue-400 focus:bg-white disabled:opacity-50"
                  style={{ fontFamily: FONT }}
                />
                <button
                  onClick={() => handleGenerate()}
                  disabled={!credits?.canGenerate && !isPro}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                  style={{ background: BLUE, fontFamily: FONT }}
                >
                  <Sparkles size={15} />
                  Generate
                </button>
              </div>
            )}
            {!isGenerating && credits && !isPro && credits.remaining === 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-amber-700">
                <AlertCircle size={12} />
                No credits left today. Resets in {resetIn} ·{" "}
                <Link href="/upgrade" className="underline" style={{ color: BLUE }}>Upgrade to Pro</Link>
              </div>
            )}
          </div>

          {/* Websites grid */}
          {websites.length === 0 ? (
            <div className="text-center py-20 text-[#BCC0C4]">
              <Globe size={44} className="mx-auto mb-4 opacity-40" />
              <p className="text-base font-semibold text-[#8A8D91] mb-1">No websites yet</p>
              <p className="text-sm">Type a prompt above and click Generate</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {websites.map((site) => (
                <motion.div
                  key={site.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-[#E4E6EB] rounded-2xl overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="h-32 sm:h-36 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center relative">
                    <Globe size={28} className="text-blue-200" />
                    {site.published && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[#1C1E21] leading-snug truncate">{site.name}</h3>
                      <span className="text-[10px] text-[#8A8D91] shrink-0 mt-0.5">{site.type}</span>
                    </div>
                    <p className="text-xs text-[#8A8D91] mb-4">
                      Edited {new Date(site.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </p>

                    <div className="flex gap-2">
                      {/* Edit */}
                      <Link
                        href={`/editor/${site.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: BLUE }}
                      >
                        <Edit3 size={12} />
                        Edit
                      </Link>

                      {/* Publish / Live split button */}
                      {!site.published ? (
                        <div className="relative flex items-center" ref={openMenuId === site.id ? menuRef : undefined}>
                          <button
                            onClick={() => handlePublish(site.id)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 ${canShareTemplate ? "rounded-l-xl" : "rounded-xl"} border border-[#E4E6EB] bg-white text-xs font-medium text-[#1C1E21] transition-colors hover:bg-gray-50`}
                            style={{ fontFamily: FONT }}
                          >
                            <Zap size={12} />
                            Publish
                          </button>
                          {canShareTemplate && (
                            <>
                              <button
                                onClick={() => setOpenMenuId(openMenuId === site.id ? null : site.id)}
                                className="flex items-center px-1.5 py-2.5 rounded-r-xl border border-l-0 border-[#E4E6EB] bg-white text-[#1C1E21] hover:bg-gray-50 transition-colors"
                                aria-label="More actions"
                              >
                                <ChevronDown size={11} />
                              </button>
                              {openMenuId === site.id && (
                                <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl border border-[#E4E6EB] shadow-lg z-20 overflow-hidden">
                                  <button
                                    onClick={() => handleShareTemplate(site.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1C1E21] hover:bg-gray-50 transition-colors"
                                  >
                                    <Share2 size={12} className="text-gray-400" />
                                    Share as template
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="relative flex items-center" ref={openMenuId === site.id ? menuRef : undefined}>
                          <a
                            href={`https://${site.subdomain}.storebuilder.ph`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-2.5 rounded-l-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                          >
                            <ExternalLink size={11} />
                            Live
                          </a>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === site.id ? null : site.id)}
                            className="flex items-center px-1.5 py-2.5 rounded-r-xl border border-l-0 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            aria-label="More actions"
                          >
                            <ChevronDown size={11} />
                          </button>
                          {openMenuId === site.id && (
                            <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-xl border border-[#E4E6EB] shadow-lg z-20 overflow-hidden">
                              <a
                                href={`https://${site.subdomain}.storebuilder.ph`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#1C1E21] hover:bg-gray-50 transition-colors"
                                onClick={() => setOpenMenuId(null)}
                              >
                                <ExternalLink size={12} className="text-gray-400" />
                                View live site
                              </a>
                              {canShareTemplate && (
                                <>
                                  <div className="h-px bg-gray-100" />
                                  <button
                                    onClick={() => handleShareTemplate(site.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#1C1E21] hover:bg-gray-50 transition-colors"
                                  >
                                    <Share2 size={12} className="text-gray-400" />
                                    Share as template
                                  </button>
                                </>
                              )}
                              <div className="h-px bg-gray-100" />
                              <button
                                onClick={() => handleUnpublish(site.id)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <EyeOff size={12} />
                                Unpublish
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(site.id, site.name)}
                        className="p-2.5 rounded-xl border border-[#E4E6EB] bg-white text-[#8A8D91] hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({
  session, isPro, credits, resetIn, avatarUrl, avatarUploading, onAvatarUpload, onClose, showClose,
}: {
  session: any; isPro: boolean; credits: Credits | null; resetIn: string;
  avatarUrl: string | null; avatarUploading: boolean;
  onAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose?: () => void; showClose?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#E4E6EB] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline" onClick={onClose}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#1877F2" }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <span className="font-bold text-sm text-[#1C1E21]" style={{ fontFamily: FONT }}>Storebuilder.ph</span>
        </Link>
        {showClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Avatar */}
      <div className="px-5 py-4 border-b border-[#E4E6EB]">
        <label className="relative cursor-pointer block w-fit">
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#E4E6EB]" style={{ background: "#1877F2" }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                  {(session?.user?.name || session?.user?.email || "?")[0].toUpperCase()}
                </div>
            }
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full border border-[#E4E6EB] flex items-center justify-center">
            {avatarUploading
              ? <div className="w-2.5 h-2.5 border border-blue-600 border-t-transparent rounded-full animate-spin" />
              : <Camera size={9} color="#65676B" />
            }
          </div>
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onAvatarUpload} className="hidden" disabled={avatarUploading} />
        </label>
        <p className="text-sm font-semibold text-[#1C1E21] mt-2 truncate">{session?.user?.name || "User"}</p>
        <p className="text-xs text-[#8A8D91] truncate">{session?.user?.email}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold no-underline transition-colors"
          style={{ background: "#E7F3FF", color: "#1877F2" }}
        >
          <Globe size={15} />
          My Websites
        </Link>
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#65676B] no-underline transition-colors hover:bg-gray-50"
        >
          <Settings size={15} />
          Settings
        </Link>
        {session?.user?.role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-amber-700 no-underline hover:bg-amber-50 transition-colors"
          >
            <CheckCircle2 size={15} />
            Admin
          </Link>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-[#E4E6EB] pt-3 flex flex-col gap-2">
        {credits && (
          <div className="px-3 py-2.5 rounded-xl bg-[#F0F2F5] border border-[#E4E6EB]">
            <div className="flex items-center gap-2 mb-2">
              {isPro && <Crown size={13} color="#B45309" />}
              <span className="text-xs font-bold text-[#1C1E21]">{credits.planLabel || (isPro ? "Pro" : "Free")} Plan</span>
            </div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[11px] text-[#65676B]">Websites this month</span>
              <span className="text-[11px] font-bold text-[#1C1E21]">{credits.used}/{credits.limit}</span>
            </div>
            <div className="h-1 bg-[#E4E6EB] rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, ((credits.limit - credits.remaining) / credits.limit) * 100)}%`, background: "#1877F2" }} />
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[#8A8D91]">
              <Clock size={9} />
              Resets in {resetIn}
            </div>
          </div>
        )}
        {credits?.plan !== "ENTERPRISE" && (
          <Link
            href="/upgrade"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold no-underline transition-colors"
            style={{ background: "#E7F3FF", border: "1px solid rgba(24,119,242,0.2)", color: "#1877F2" }}
          >
            <Crown size={13} />
            {credits?.plan === "PRO" ? "Upgrade to Enterprise" : "Upgrade plan"}
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[#65676B] bg-transparent border-none cursor-pointer w-full text-left hover:bg-gray-50 transition-colors"
          style={{ fontFamily: FONT }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
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
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
