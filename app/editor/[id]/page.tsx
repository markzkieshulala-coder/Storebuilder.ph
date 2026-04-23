"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Globe, Smartphone, Monitor,
  Tablet, Undo2, Redo2, ExternalLink,
  CheckCircle, Loader2, Eye, PanelLeft, EyeOff, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType, FloatingToolbarTarget } from "@/components/editor/EditorContext";
import OptionsPanel from "@/components/editor/OptionsPanel";
import FloatingToolbar from "@/components/editor/FloatingToolbar";

type ViewMode = "desktop" | "tablet" | "mobile";

const VIEW_WIDTHS: Record<ViewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

export default function EditorPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [website, setWebsite] = useState<GeneratedWebsite | null>(null);
  const [rawWebsite, setRawWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [liveMenuOpen, setLiveMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolbarTarget, setToolbarTarget] = useState<FloatingToolbarTarget | null>(null);
  const [history, setHistory] = useState<GeneratedWebsite[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageUpload = useRef<{ sectionId: string; field: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") fetchWebsite();
  }, [status, params.id]);

  // Auto-save every 30s
  useEffect(() => {
    if (!website) return;
    const t = setInterval(() => autoSave(), 30000);
    return () => clearInterval(t);
  }, [website]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); handleRedo(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [website, historyIndex, history]);

  // Close floating toolbar on outside click
  useEffect(() => {
    if (!toolbarTarget) return;
    function handleOutside(e: MouseEvent) {
      const toolbar = document.getElementById("floating-toolbar");
      if (toolbar && toolbar.contains(e.target as Node)) return;
      if ((e.target as HTMLElement).contentEditable === "true") return;
      setToolbarTarget(null);
    }
    document.addEventListener("mousedown", handleOutside, true);
    return () => document.removeEventListener("mousedown", handleOutside, true);
  }, [toolbarTarget]);

  // Close live dropdown on outside click
  useEffect(() => {
    if (!liveMenuOpen) return;
    function handleOutside() { setLiveMenuOpen(false); }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [liveMenuOpen]);

  async function fetchWebsite() {
    setLoading(true);
    try {
      const res = await fetch(`/api/websites/${params.id}`);
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      const content = data.website.jsonContent as GeneratedWebsite;
      setWebsite(content);
      setRawWebsite(data.website);
      setPublished(data.website.published);
      setHistory([content]);
      setHistoryIndex(0);
    } finally {
      setLoading(false);
    }
  }

  function pushHistory(newWebsite: GeneratedWebsite) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newWebsite);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWebsite(newWebsite);
  }

  function handleUndo() {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setWebsite(history[i]);
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setWebsite(history[i]);
  }

  async function autoSave() {
    if (!website) return;
    await fetch(`/api/websites/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonContent: website }),
    });
  }

  async function handleSave() {
    if (!website || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonContent: website }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast.success("Saved!");
      }
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await handleSave();
      const res = await fetch(`/api/websites/${params.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { setPublished(true); toast.success(`Live at ${data.url}!`); }
    } finally { setPublishing(false); }
  }

  async function handleUnpublish() {
    setUnpublishing(true);
    setLiveMenuOpen(false);
    try {
      const res = await fetch(`/api/websites/${params.id}/publish`, { method: "DELETE" });
      if (res.ok) {
        setPublished(false);
        toast.success("Website unpublished.");
      } else {
        toast.error("Failed to unpublish. Try again.");
      }
    } finally { setUnpublishing(false); }
  }

  function handlePreview() {
    window.open(`/editor/${params.id}/preview`, "_blank");
  }

  function updateSection(sectionId: string, updates: Partial<{ data: any; styles: any }>) {
    if (!website) return;
    pushHistory({ ...website, sections: website.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s) });
  }

  function applySectionStyle(sectionId: string, key: string, value: string) {
    if (!website) return;
    pushHistory({
      ...website,
      sections: website.sections.map((s) =>
        s.id === sectionId ? { ...s, styles: { ...(s.styles || {}), [key]: value } } : s
      ),
    });
    if (toolbarTarget?.sectionId === sectionId) {
      setToolbarTarget((prev) => prev ? {
        ...prev,
        textColor: key === "textColor" ? value : prev.textColor,
        bgColor: key === "background" ? value : prev.bgColor,
        accentColor: key === "accentColor" ? value : prev.accentColor,
      } : prev);
    }
  }

  function applyGlobalStyle(updates: Partial<GeneratedWebsite>) {
    if (!website) return;
    pushHistory({ ...website, ...updates });
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    if (!website) return;
    const idx = website.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const newSections = [...website.sections];
    const ni = direction === "up" ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= newSections.length) return;
    [newSections[idx], newSections[ni]] = [newSections[ni], newSections[idx]];
    pushHistory({ ...website, sections: newSections });
  }

  function deleteSection(sectionId: string) {
    if (!website) return;
    pushHistory({ ...website, sections: website.sections.filter((s) => s.id !== sectionId) });
  }

  function duplicateSection(sectionId: string) {
    if (!website) return;
    const idx = website.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const original = website.sections[idx];
    const copy = { ...original, id: `${original.id}-copy-${Date.now()}` };
    const ns = [...website.sections];
    ns.splice(idx + 1, 0, copy);
    pushHistory({ ...website, sections: ns });
  }

  function handleTextChange(sectionId: string, field: string, value: string) {
    if (!website) return;
    const section = website.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const parts = field.split(".");
    const newData = { ...(section.data as any) };
    if (parts.length === 1) newData[parts[0]] = value;
    else if (parts.length === 2) newData[parts[0]] = { ...newData[parts[0]], [parts[1]]: value };
    updateSection(sectionId, { data: newData });
  }

  function handleNestedTextChange(sectionId: string, arrayField: string, index: number, key: string, value: string) {
    if (!website) return;
    const section = website.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const newData = { ...(section.data as any) };
    const arr = [...(newData[arrayField] || [])];
    arr[index] = { ...arr[index], [key]: value };
    newData[arrayField] = arr;
    updateSection(sectionId, { data: newData });
  }

  function handleImageUpload(sectionId: string, field: string) {
    pendingImageUpload.current = { sectionId, field };
    imageInputRef.current?.click();
  }

  async function handleFileSelected(e: { target: HTMLInputElement }) {
    const file = e.target.files?.[0];
    if (!file || !pendingImageUpload.current) return;
    e.target.value = "";
    const { sectionId, field } = pendingImageUpload.current;
    pendingImageUpload.current = null;
    const formData = new FormData();
    formData.append("image", file);
    try {
      toast.loading("Uploading image...", { id: "img-upload" });
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Image uploaded!", { id: "img-upload" });
      const section = website?.sections.find((s) => s.id === sectionId);
      if (!section) return;
      const newData = { ...(section.data as any) };
      const parts = field.split(".");
      if (parts.length === 1) {
        newData[parts[0]] = data.url;
      } else if (parts.length === 3 && !isNaN(Number(parts[1]))) {
        const arr = [...(newData[parts[0]] || [])];
        arr[Number(parts[1])] = { ...arr[Number(parts[1])], [parts[2]]: data.url };
        newData[parts[0]] = arr;
      }
      updateSection(sectionId, { data: newData });
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: "img-upload" });
    }
  }

  if (loading || !website) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  const editorCtx: EditorContextType = {
    isEditable: true,
    onTextChange: handleTextChange,
    onNestedTextChange: handleNestedTextChange,
    onImageUpload: handleImageUpload,
    onSectionClick: () => {},
    onShowToolbar: (target) => setToolbarTarget(target),
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Top toolbar ── */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 shrink-0 z-50 shadow-sm gap-2">

        {/* Left: back + site name */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden"
            title="Toggle panel"
          >
            <PanelLeft size={18} />
          </button>
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors hidden sm:flex">
            <ArrowLeft size={17} />
          </Link>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold leading-none text-gray-900 truncate">{website.name}</p>
            <p className="text-[11px] mt-0.5">
              {saved
                ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={10} /> Saved</span>
                : <span className="text-gray-400">Click text on canvas to edit</span>
              }
            </p>
          </div>
        </div>

        {/* Centre: viewport toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1 shrink-0">
          {([["desktop", Monitor, "Desktop"], ["tablet", Tablet, "Tablet"], ["mobile", Smartphone, "Mobile"]] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode
                  ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={13} />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors hidden sm:flex" title="Undo (Ctrl+Z)">
            <Undo2 size={15} />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors hidden sm:flex" title="Redo (Ctrl+Y)">
            <Redo2 size={15} />
          </button>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          {/* Preview */}
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
            title="Open preview in new tab"
          >
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* Publish / Live + Unpublish */}
          {published ? (
            <div className="relative flex items-center">
              {/* View live */}
              <a
                href={`https://${rawWebsite?.subdomain}.storebuilder.ph`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-l-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium transition-colors"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">Live</span>
              </a>
              {/* Dropdown toggle */}
              <button
                onClick={() => setLiveMenuOpen((o) => !o)}
                className="flex items-center px-1.5 py-2 rounded-r-lg border border-l-0 border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <ChevronDown size={13} />
              </button>
              {/* Dropdown */}
              {liveMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                  <a
                    href={`https://${rawWebsite?.subdomain}.storebuilder.ph`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setLiveMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink size={13} className="text-gray-400" />
                    View live site
                  </a>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={handleUnpublish}
                    disabled={unpublishing}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {unpublishing ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}
                    Unpublish
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handlePublish} disabled={publishing}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold text-white transition-colors shadow-sm">
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              <span className="hidden sm:inline">Publish</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Options panel — slides in from left on mobile */}
        <aside
          className={`
            bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0 transition-all duration-300
            ${sidebarOpen ? "w-56" : "w-0"}
            absolute inset-y-0 left-0 z-40 lg:relative lg:z-auto
          `}
        >
          {sidebarOpen && (
            <OptionsPanel
              website={website}
              onUpdateWebsite={(updates) => pushHistory({ ...website, ...updates } as GeneratedWebsite)}
              onMoveSection={moveSection}
              onDeleteSection={deleteSection}
              onDuplicateSection={duplicateSection}
            />
          )}
        </aside>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-[#f0f2f5] flex items-start justify-center p-4 sm:p-6 lg:p-8">
          <div
            className="transition-all duration-300 bg-white shadow-xl overflow-hidden w-full"
            style={{
              maxWidth: VIEW_WIDTHS[viewMode],
              minHeight: "calc(100vh - 56px)",
              borderRadius: viewMode !== "desktop" ? "20px" : "10px",
            }}
          >
            <WebsiteRenderer website={website} editorContext={editorCtx} />
          </div>
        </main>
      </div>

      {/* Floating toolbar */}
      {toolbarTarget && (
        <FloatingToolbar
          target={toolbarTarget}
          website={website}
          onUpdateStyle={applySectionStyle}
          onUpdateGlobal={applyGlobalStyle}
          onClose={() => setToolbarTarget(null)}
        />
      )}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
