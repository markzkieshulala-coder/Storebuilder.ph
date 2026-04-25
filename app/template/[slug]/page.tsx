"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight, Lock, AlertCircle, User, Eye } from "lucide-react";
import toast from "react-hot-toast";

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:gap-10">

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative">
              {template.thumbnail ? (
                <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Eye size={36} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">Preview not available</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3" style={{ background: "#EBF3FF", color: BLUE }}>
                <Sparkles size={10} />
                Storebuilder Template
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{template.name}</h1>
              {template.seoDesc && (
                <p className="text-sm text-gray-600 leading-relaxed">{template.seoDesc}</p>
              )}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <User size={12} />
                  <span>by <strong className="text-gray-700">{template.creator}</strong></span>
                </div>
                <span>·</span>
                <span>Used {template.useCount.toLocaleString()} time{template.useCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {/* CTA panel */}
          <aside className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 lg:sticky lg:top-6 self-start">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Use this template</h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed mb-5">
              Get an editable copy in your own account. Your edits stay yours — the original is never affected.
            </p>

            <ul className="space-y-2.5 mb-6 text-xs sm:text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0" style={{ background: "#EBF3FF" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
                </span>
                Independent copy — saved to your workspace
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0" style={{ background: "#EBF3FF" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
                </span>
                Edit, publish, or rebrand freely
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0" style={{ background: "#EBF3FF" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
                </span>
                Counts toward your monthly website limit
              </li>
            </ul>

            <button
              onClick={handleUseTemplate}
              disabled={using || status === "loading"}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60 hover:opacity-90 transition-opacity"
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
                  Sign up to use template
                </>
              )}
            </button>

            {!session && (
              <p className="text-[11px] text-gray-400 text-center mt-3">
                Free account · no credit card
              </p>
            )}
          </aside>

        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 px-4 text-center bg-white">
        <p className="text-xs text-gray-500">
          Powered by <Link href="/" className="font-semibold hover:underline" style={{ color: BLUE }}>Storebuilder.ph</Link>
        </p>
      </footer>
    </div>
  );
}
