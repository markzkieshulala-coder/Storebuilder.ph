"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, X, Home } from "lucide-react";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType } from "@/components/editor/EditorContext";
import { selectHomepageSections, selectSubpageSections } from "@/lib/site/pageSections";

function makeCtx(
  currentPage: string,
  setCurrentPage: (p: string) => void
): EditorContextType {
  return {
    isEditable: false,
    isPreview: true,
    viewMode: "desktop",
    currentEditorPage: currentPage,
    onEditorPageChange: (p) => {
      setCurrentPage(p);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
    },
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
}

export default function PreviewPage({ params }: { params: { id: string } }) {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const isRaw = searchParams.get("raw") === "1";
  const [website, setWebsite] = useState<GeneratedWebsite | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string>("");
  const [subdomain, setSubdomain] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>("/");

  useEffect(() => {
    if (status === "unauthenticated") window.close();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/websites/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        const w = data.website;
        setSiteName(w?.name || "");
        setSubdomain(w?.subdomain || "");
        setPublished(w?.published || false);
        if (w?.htmlContent) {
          setHtmlContent(w.htmlContent);
        } else {
          setWebsite(w?.jsonContent || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, params.id]);

  const websiteWithSubdomain = useMemo(
    () => (website && subdomain ? { ...website, subdomain } : website),
    [website, subdomain]
  );

  const visibleWebsite = useMemo(() => {
    if (!websiteWithSubdomain) return null;
    if (currentPage === "/") {
      return { ...websiteWithSubdomain, sections: selectHomepageSections(websiteWithSubdomain) };
    }
    const slug = currentPage.replace(/^\//, "");
    return { ...websiteWithSubdomain, sections: selectSubpageSections(websiteWithSubdomain, slug) };
  }, [websiteWithSubdomain, currentPage]);

  const ctx = useMemo(() => makeCtx(currentPage, setCurrentPage), [currentPage]);

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

  // Stitch-generated site — embed the full HTML in an iframe
  if (htmlContent) {
    if (isRaw) {
      return (
        <iframe
          srcDoc={htmlContent}
          style={{ width: "100%", height: "100vh", border: "none", display: "block" }}
          title={siteName}
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
            {siteName && (
              <>
                <span className="text-white/30 shrink-0">·</span>
                <span className="text-white/70 text-xs truncate">{siteName}</span>
              </>
            )}
          </div>
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
        <div className="pt-10 flex-1">
          <iframe
            srcDoc={htmlContent}
            style={{ width: "100%", height: "calc(100vh - 40px)", border: "none", display: "block" }}
            title={siteName}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </div>
    );
  }

  // Raw embed mode for JSON-based sites
  if (isRaw) {
    return visibleWebsite ? <WebsiteRenderer website={visibleWebsite} editorContext={ctx} /> : null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Branded preview bar */}
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
          {website?.name && (
            <>
              <span className="text-white/30 shrink-0">·</span>
              <span className="text-white/70 text-xs truncate">{website.name}</span>
            </>
          )}
          {currentPage !== "/" && (
            <span className="text-white/90 text-xs font-mono bg-white/15 px-2 py-0.5 rounded shrink-0">
              {currentPage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {currentPage !== "/" && (
            <button
              onClick={() => { setCurrentPage("/"); window.scrollTo({ top: 0, behavior: "auto" }); }}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium transition-colors"
            >
              <Home size={11} />
              Home
            </button>
          )}
          {published && subdomain && (
            <a
              href={`https://${subdomain}.storebuilder.ph${currentPage}`}
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
        {visibleWebsite ? (
          <WebsiteRenderer website={visibleWebsite} editorContext={ctx} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Website not found
          </div>
        )}
      </div>
    </div>
  );
}
