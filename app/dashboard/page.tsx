"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles, Globe, Edit3, Trash2, ExternalLink,
  Settings, LogOut, Crown, Clock,
  AlertCircle, Zap, BarChart2, Camera,
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
  slots?: { used: number; limit: number; remaining: number };
  edits?: { used: number; limit: number; remaining: number; canEdit: boolean };
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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
      if (session?.user?.image) setAvatarUrl(session.user.image);
    }
  }, [status]);

  useEffect(() => {
    const urlPrompt = searchParams.get("generate");
    if (urlPrompt && !isGenerating && credits?.canGenerate) {
      setPrompt(urlPrompt);
      handleGenerate(urlPrompt);
    }
  }, [searchParams, credits]);

  useEffect(() => {
    if (!credits?.resetAt) return;
    const interval = setInterval(() => {
      setResetIn(timeUntilReset(new Date(credits.resetAt)));
    }, 1000);
    return () => clearInterval(interval);
  }, [credits?.resetAt]);

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
      const [wsRes, crRes] = await Promise.all([fetch("/api/websites"), fetch("/api/credits")]);
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
    if (res.ok) { toast.success(`Live at ${data.url}`); fetchData(); }
  }

  async function handleDuplicate(id: string) {
    const dupRes = await fetch("/api/websites/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteId: id }),
    });
    if (dupRes.ok) { toast.success("Website duplicated"); fetchData(); }
    else toast.error("Failed to duplicate");
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
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid #E7F3FF`, borderTop: `3px solid ${BLUE}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const isPro = credits?.plan === "PRO";

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: FONT }}>
      {/* Sidebar */}
      <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, background: "#fff", borderRight: "1px solid #E4E6EB", display: "flex", flexDirection: "column", zIndex: 40 }}>
        {/* Logo */}
        <div style={{ padding: "20px", borderBottom: "1px solid #E4E6EB" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, background: BLUE, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#1C1E21", fontFamily: FONT }}>Storebuilder.ph</span>
          </Link>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ padding: "9px 12px", borderRadius: 8, background: "#E7F3FF", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: BLUE }}>
            <Globe size={16} />
            My Websites
          </div>
          <Link href="/dashboard/settings" style={{ padding: "9px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#65676B", textDecoration: "none", transition: "background 0.15s" }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#F0F2F5")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
            <Settings size={16} />
            Settings
          </Link>
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" style={{ padding: "9px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#B45309", textDecoration: "none" }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#FEF3C7")}
              onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
              <BarChart2 size={16} />
              Admin
            </Link>
          )}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #E4E6EB", display: "flex", flexDirection: "column", gap: 8 }}>
          {credits && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "#F0F2F5", border: "1px solid #E4E6EB" }}>
              {isPro ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Crown size={14} color="#B45309" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>Pro Plan</span>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "#65676B" }}>Daily credits</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1C1E21" }}>{credits.remaining}/{credits.limit}</span>
                  </div>
                  <div style={{ height: 5, background: "#E4E6EB", borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", background: BLUE, borderRadius: 99, width: `${(credits.remaining / credits.limit) * 100}%`, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8A8D91" }}>
                    <Clock size={11} />
                    Resets in {resetIn}
                  </div>
                </>
              )}
            </div>
          )}

          {!isPro && (
            <Link href="/upgrade" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, background: "#E7F3FF", border: `1px solid ${BLUE}30`, fontSize: 12, fontWeight: 600, color: BLUE, textDecoration: "none" }}>
              <Crown size={13} />
              Upgrade to Pro
            </Link>
          )}

          <button onClick={() => signOut({ callbackUrl: "/" })}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, fontSize: 13, color: "#65676B", background: "transparent", border: "none", cursor: "pointer", width: "100%", fontFamily: FONT }}
            onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F0F2F5"; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, padding: "32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Avatar */}
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: BLUE, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid #E4E6EB" }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{(session?.user?.name || session?.user?.email || "?")[0].toUpperCase()}</span>
                }
              </div>
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 20, height: 20, background: "#fff", borderRadius: "50%", border: "1px solid #E4E6EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {avatarUploading ? <div style={{ width: 10, height: 10, border: `2px solid ${BLUE}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <Camera size={10} color="#65676B" />}
              </div>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleAvatarUpload} style={{ display: "none" }} disabled={avatarUploading} />
            </label>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1C1E21", margin: 0, fontFamily: FONT }}>
                Good {getGreeting()}, {session?.user?.name?.split(" ")[0]} 👋
              </h1>
              <p style={{ fontSize: 13, color: "#65676B", marginTop: 2 }}>
                {websites.length === 0 ? "Create your first website below" : `You have ${websites.length} website${websites.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        {/* Plan Benefits card */}
        {credits && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E4E6EB", padding: "16px 20px", marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#8A8D91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Plan</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: isPro ? "#B45309" : "#1C1E21" }}>{isPro ? "Pro" : "Free"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#8A8D91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Website Slots</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1E21" }}>
                {credits.slots?.used ?? websites.length} / {credits.slots?.limit ?? (isPro ? 10 : 5)}
                <span style={{ fontSize: 11, fontWeight: 400, color: "#8A8D91", marginLeft: 4 }}>used</span>
              </p>
            </div>
            {isPro && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#8A8D91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Monthly Generations</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1E21" }}>
                  {credits.remaining} / {credits.limit}
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#8A8D91", marginLeft: 4 }}>left</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generation box */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E4E6EB", padding: "22px 24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1C1E21", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color={BLUE} />
            Generate a new website
          </h2>

          {isGenerating ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, border: `3px solid #E7F3FF`, borderTop: `3px solid ${BLUE}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ fontSize: 13, color: BLUE, fontWeight: 600 }}>{GENERATION_STEPS[generationStep]}</p>
              <p style={{ fontSize: 12, color: "#8A8D91", marginTop: 6 }}>This takes about 10–20 seconds</p>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder='e.g. "Barbershop called Kings Cut with a masculine dark design"'
                disabled={!credits?.canGenerate && !isPro}
                style={{ flex: 1, background: "#F0F2F5", border: "1px solid #E4E6EB", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1C1E21", outline: "none", fontFamily: FONT }}
                onFocus={(e) => { e.target.style.border = `1px solid ${BLUE}`; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.border = "1px solid #E4E6EB"; e.target.style.background = "#F0F2F5"; }}
              />
              <button
                onClick={() => handleGenerate()}
                disabled={!credits?.canGenerate && !isPro}
                style={{ padding: "10px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: FONT, opacity: (!credits?.canGenerate && !isPro) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                <Sparkles size={15} />
                Generate
              </button>
            </div>
          )}

          {!isGenerating && credits && !isPro && credits.remaining === 0 && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#B45309" }}>
              <AlertCircle size={13} />
              No credits left today. Resets in {resetIn} ·{" "}
              <Link href="/upgrade" style={{ color: BLUE, textDecoration: "underline" }}>Upgrade to Pro</Link>
            </div>
          )}
        </div>

        {/* Websites grid */}
        {websites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#BCC0C4" }}>
            <Globe size={48} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: "#8A8D91" }}>No websites yet</p>
            <p style={{ fontSize: 13 }}>Type a prompt above and click Generate to create your first website</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {websites.map((site) => (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: "#fff", border: "1px solid #E4E6EB", borderRadius: 14, overflow: "hidden" }}>
                {/* Thumbnail */}
                <div style={{ height: 140, background: "linear-gradient(135deg, #E7F3FF 0%, #EEF2FF 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <Globe size={32} color="#BFDBFE" />
                  {site.published && (
                    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, background: "#D1FAE5", border: "1px solid #A7F3D0", color: "#065F46", fontSize: 11, fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                      Live
                    </div>
                  )}
                </div>

                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1C1E21", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{site.name}</h3>
                    <span style={{ fontSize: 11, color: "#8A8D91", marginLeft: 8, flexShrink: 0 }}>{site.type}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "#8A8D91", marginBottom: 12 }}>
                    Edited {new Date(site.updatedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                  </p>

                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/editor/${site.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0", borderRadius: 8, background: BLUE, color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      <Edit3 size={12} />
                      Edit
                    </Link>
                    {!site.published ? (
                      <button onClick={() => handlePublish(site.id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid #E4E6EB", background: "#fff", color: "#1C1E21", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                        <Zap size={12} />
                        Publish
                      </button>
                    ) : (
                      <a href={`https://${site.subdomain}.storebuilder.ph`} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid #E4E6EB", background: "#fff", color: "#1C1E21", fontSize: 12, textDecoration: "none" }}>
                        <ExternalLink size={12} />
                        View
                      </a>
                    )}
                    <button onClick={() => handleDelete(site.id, site.name)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #E4E6EB", background: "#fff", color: "#8A8D91", cursor: "pointer" }}
                      onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#DC2626"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#FCA5A5"; }}
                      onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8A8D91"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#E4E6EB"; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
      <div style={{ minHeight: "100vh", background: "#F0F2F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #E7F3FF", borderTop: `3px solid #1877F2`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
