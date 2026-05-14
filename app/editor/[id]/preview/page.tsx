"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, X } from "lucide-react";

type WebsiteMeta = {
  id: string;
  name: string;
  subdomain: string | null;
  published: boolean;
  htmlContent: string | null;
};

export default function PreviewPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const isRaw = searchParams.get("raw") === "1";
  const [meta, setMeta] = useState<WebsiteMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") window.close();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/websites/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setMeta(data.website ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (!meta?.htmlContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Website not found</h1>
          <p className="text-sm text-gray-500">
            This website can&apos;t be previewed. Please regenerate it from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (isRaw) {
    return (
      <iframe
        srcDoc={meta.htmlContent}
        style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
        title={meta.name}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="fixed top-0 left-0 right-0 z-[99999] h-10 flex items-center justify-between px-4 gap-3"
        style={{
          background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
          boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-sm tracking-tight shrink-0">Storebuilder.ph</span>
          <span className="text-white/30 shrink-0">|</span>
          <span className="text-white/60 text-xs shrink-0">Preview</span>
          {meta.name && (
            <>
              <span className="text-white/30 shrink-0">·</span>
              <span className="text-white/70 text-xs truncate">{meta.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {meta.published && meta.subdomain && (
            <a
              href={`https://${meta.subdomain}.storebuilder.ph`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <ExternalLink size={11} />
              View Live
            </a>
          )}
          <button
            onClick={() => window.close()}
            className="flex items-center gap-1 text-white/60 hover:text-white text-xs transition-colors"
          >
            <X size={13} />
            Close
          </button>
        </div>
      </div>

      <div className="pt-10 flex-1">
        <iframe
          srcDoc={meta.htmlContent}
          style={{ width: "100%", height: "calc(100vh - 2.5rem)", border: "none", display: "block" }}
          title={meta.name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
