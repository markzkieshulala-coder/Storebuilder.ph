"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Lock, AlertCircle, User } from "lucide-react";
import toast from "react-hot-toast";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import type { GeneratedWebsite } from "@/lib/ai/generate";

const BLUE = "#1877F2";
const FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

type Template = {
  name: string;
  type: string;
  thumbnail: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  useCount: number;
  creator: string;
  jsonContent: GeneratedWebsite | null;
};

export default function TemplatePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const slug = params?.slug;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [using, setUsing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/templates/${slug}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, body: d })))
      .then(({ ok, body }) => {
        if (!ok) setError(body.error || "Template not found");
        else setTemplate(body);
      })
      .catch(() => setError("Failed to load template"))
      .finally(() => setLoading(false));
  }, [slug]);

  // Always show the shared link starting from the very top (nav + hero) so
  // visitors don't land mid-page on a random section if their browser
  // restored a previous scroll position.
  useEffect(() => {
    if (!loading && template) {
      // Strip any incoming hash so anchored sections don't jump us mid-page.
      if (typeof window !== "undefined" && window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [loading, template]);

  async function handleUseTemplate() {
    if (!session) {
      router.push(`/auth/register?callbackUrl=/template/${slug}&returnAction=use-template`);
      return;
    }
    setUsing(true);
    try {
      const res = await fetch(`/api/templates/${slug}/use`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to use template");
        setUsing(false);
        return;
      }
      toast.success("Template added to your account");
      router.push(data.redirectUrl);
    } catch {
      toast.error("Something went wrong");
      setUsing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]" style={{ fontFamily: FONT }}>
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1877F2] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] px-4" style={{ fontFamily: FONT }}>
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Template not available</h1>
          <p className="text-sm text-gray-500 mb-6">
            {error || "This template no longer exists or has been unshared by its creator."}
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: BLUE }}>
            Go to Storebuilder.ph
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]" style={{ fontFamily: FONT }}>
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={28} height={28} />
            <span className="font-bold text-gray-900 text-sm sm:text-base truncate">
              Storebuilder<span style={{ color: BLUE }}>.ph</span>
            </span>
          </Link>
          {session ? (
            <Link href="/dashboard" className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900">
              My dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={`/auth/signin?callbackUrl=/template/${slug}`} className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900">
                Sign in
              </Link>
              <Link href={`/auth/register?callbackUrl=/template/${slug}`} className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-white" style={{ background: BLUE }}>
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Template intro — small ribbon under the nav showing creator + CTA */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-1" style={{ background: "#EBF3FF", color: BLUE }}>
              <Sparkles size={10} />
              Storebuilder Template
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">{template.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <User size={11} />
              <span>by <strong className="text-gray-700">{template.creator}</strong></span>
              <span>·</span>
              <span>Used {template.useCount.toLocaleString()} time{template.useCount === 1 ? "" : "s"}</span>
            </div>
          </div>
          <button
            onClick={handleUseTemplate}
            disabled={using || status === "loading"}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity shrink-0"
            style={{ background: BLUE }}
          >
            {using ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : session ? (
              <>
                Use this template
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <Lock size={14} />
                Sign up to use
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live website preview — locked to the FIRST visible section for
          unauthenticated visitors. They see only nav + hero (the entrance
          to the site) plus a sign-up wall covering the rest of the page so
          they have to register / sign in to view the full template inside
          the dashboard. Signed-in viewers see the full preview. */}
      <main className="bg-white relative">
        {template.jsonContent ? (
          session ? (
            <WebsiteRenderer website={template.jsonContent} isPreview />
          ) : (
            <LockedPreview
              jsonContent={template.jsonContent}
              slug={slug || ""}
              templateName={template.name}
            />
          )
        ) : (
          <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle size={36} className="mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-400">Preview not available</p>
            </div>
          </div>
        )}
      </main>

      {/* Floating sticky CTA so the "Use this template" button is always
          accessible while visitors scroll the live preview. */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-1.5 py-1.5 rounded-full shadow-2xl"
        style={{ background: "rgba(17, 24, 39, 0.95)", backdropFilter: "blur(8px)" }}
      >
        <span className="text-[11px] sm:text-xs text-white/80 px-3 hidden sm:inline">{template.name}</span>
        <button
          onClick={handleUseTemplate}
          disabled={using || status === "loading"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ background: BLUE }}
        >
          {using ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : session ? (
            <>
              Use this template
              <ArrowRight size={13} />
            </>
          ) : (
            <>
              <Lock size={13} />
              Sign up to use
            </>
          )}
        </button>
      </div>

      <footer className="border-t border-gray-200 py-6 px-4 text-center bg-white">
        <p className="text-xs text-gray-500">
          Powered by <Link href="/" className="font-semibold hover:underline" style={{ color: BLUE }}>Storebuilder.ph</Link>
        </p>
      </footer>
    </div>
  );
}

// Locked preview shown to non-signed-in visitors of a shared template link.
// Shows only the FIRST visible section (typically nav + hero) and overlays a
// frosted-glass sign-up gate so visitors must register or sign in to see the
// full template inside their dashboard.
function LockedPreview({
  jsonContent,
  slug,
  templateName,
}: {
  jsonContent: GeneratedWebsite;
  slug: string;
  templateName: string;
}) {
  // First-section-only view: nav + the FIRST non-nav section (usually hero).
  // Everything below is replaced by the sign-up gate.
  const lockedContent: GeneratedWebsite = (() => {
    const sections = jsonContent.sections || [];
    const out: typeof sections = [];
    const nav = sections.find((s) => s.type === "nav");
    const firstContent = sections.find((s) => s.type !== "nav" && s.type !== "footer");
    if (nav) out.push(nav);
    if (firstContent) out.push(firstContent);
    return { ...jsonContent, sections: out };
  })();

  return (
    <div className="relative">
      {/* Visible first section */}
      <div className="relative">
        <WebsiteRenderer website={lockedContent} isPreview />
      </div>

      {/* Frosted-glass sign-up gate filling the rest of the page */}
      <div
        className="relative"
        style={{
          minHeight: "60vh",
          background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.96) 22%, #ffffff 100%)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div className="max-w-md mx-auto px-6 py-16 sm:py-20 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: "#EBF3FF", color: BLUE }}
          >
            <Lock size={26} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Sign up to view the full template
          </h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            You're viewing a locked preview of <strong className="text-gray-700">{templateName}</strong>.
            Create a free Storebuilder.ph account or sign in to unlock the full design and use it in your dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
            <Link
              href={`/auth/register?callbackUrl=/template/${slug}&returnAction=use-template`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}
            >
              <Sparkles size={14} />
              Sign up free
              <ArrowRight size={14} />
            </Link>
            <Link
              href={`/auth/signin?callbackUrl=/template/${slug}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              I already have an account
            </Link>
          </div>
          <p className="text-[11px] text-gray-400 mt-6">
            The full template will open inside your dashboard once you're signed in.
          </p>
        </div>
      </div>
    </div>
  );
}
