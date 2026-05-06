"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType } from "@/components/editor/EditorContext";

// Editor preview uses default editor context overrides except `isPreview` is
// true so internal nav routes ("/about", "/contact") don't try to navigate
// away from /editor/{id}/preview to non-existent paths on storebuilder.ph.
const PREVIEW_CTX: EditorContextType = {
  isEditable: false,
  isPreview: true,
  viewMode: "desktop",
  onTextChange: () => {},
  onNestedTextChange: () => {},
  onImageUpload: () => {},
  onSectionClick: () => {},
  onShowToolbar: () => {},
  selectedField: null,
  onSelectField: () => {},
  onUpdateEditor: () => {},
  onResetEditor: () => {},
  getEditorState: () => undefined,
};

export default function PreviewPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const isRaw = searchParams.get("raw") === "1";
  const [website, setWebsite] = useState<GeneratedWebsite | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") window.close();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/websites/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setWebsite(data.website?.jsonContent || null);
        setSubdomain(data.website?.subdomain || "");
        setPublished(data.website?.published || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  // Always inject subdomain so product links work in preview. For unpublished
  // sites the payment API still blocks checkout, but the product info page loads.
  const websiteWithSubdomain = website && subdomain
    ? { ...website, subdomain }
    : website;

  // Raw embed mode (used by the preview button for a clean full-page view)
  if (isRaw) {
    return websiteWithSubdomain ? <WebsiteRenderer website={websiteWithSubdomain} editorContext={PREVIEW_CTX} /> : null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Branded preview bar — fixed, sits above website content */}
      <div
        className="fixed top-0 left-0 right-0 z-[99999] h-10 flex items-center justify-between px-4 gap-3"
        style={{
          background: "linear-gradient(90deg, #1d4ed8, #2563eb)",
          boxShadow: "0 2px 12px rgba(37,99,235,0.4)",
        }}
      >
        {/* Left: branding */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white font-bold text-sm tracking-tight shrink-0">Storebuilder.ph</span>
          <span className="text-white/30 shrink-0">|</span>
          <span className="text-white/60 text-xs shrink-0">Preview</span>
          {website?.name && (
            <>
              <span className="text-white/30 shrink-0">·</span>
              <span className="text-white/70 text-xs truncate">{website.name}</span>
            </>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3 shrink-0">
          {published && subdomain && (
            <a
              href={`https://${subdomain}.storebuilder.ph`}
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

      {/* Website content — offset by branded bar height */}
      <div className="pt-10 flex-1">
        {websiteWithSubdomain ? (
          <WebsiteRenderer website={websiteWithSubdomain} editorContext={PREVIEW_CTX} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Website not found
          </div>
        )}
      </div>
    </div>
  );
}
