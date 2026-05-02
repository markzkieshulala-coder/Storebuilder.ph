"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Globe, Smartphone, Monitor,
  Tablet, Undo2, Redo2, ExternalLink,
  CheckCircle, Loader2, Eye, PanelLeft, EyeOff, Info,
  Share2, Plus, X, Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType, FloatingToolbarTarget, SelectedField, ViewMode } from "@/components/editor/EditorContext";
import { EditorFieldState } from "@/components/editor/EditableField";
import OptionsPanel from "@/components/editor/OptionsPanel";
import FloatingToolbar from "@/components/editor/FloatingToolbar";

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
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolbarTarget, setToolbarTarget] = useState<FloatingToolbarTarget | null>(null);
  const [selectedField, setSelectedField] = useState<SelectedField>(null);
  const [history, setHistory] = useState<GeneratedWebsite[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sharingTemplate, setSharingTemplate] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalUrl, setShareModalUrl] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageUpload = useRef<{ sectionId: string; field: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  // Open sidebar by default only on desktop
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

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
      if (e.key === "Escape") { setSelectedField(null); setToolbarTarget(null); }
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
    if (!confirm("Take this site offline? Visitors will no longer be able to access it. You can republish anytime.")) return;
    setUnpublishing(true);
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

  function getAnchorId(sectionId: string): string {
    if (!website) return sectionId;
    const idx = website.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return sectionId;
    const section = website.sections[idx];
    const isFirstOfType = website.sections.findIndex((s) => s.type === section.type) === idx;
    return isFirstOfType ? section.type : section.id;
  }

  function scrollToSection(sectionId: string) {
    const anchorId = getAnchorId(sectionId);
    const el = document.getElementById(anchorId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handlePreview() {
    window.open(`/editor/${params.id}/preview`, "_blank");
  }

  async function handleShareTemplate() {
    if (sharingTemplate) return;
    setSharingTemplate(true);
    try {
      const res = await fetch(`/api/websites/${params.id}/template`, { method: "POST" });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        toast.error("Server returned an unexpected response. Please try again.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error || "Failed to generate template link");
        return;
      }
      const url = data.shareUrl || `${window.location.origin}/template/${data.templateSlug}`;
      setShareModalUrl(url);
      setShareModalOpen(true);
    } catch (err: any) {
      console.error("[share template]", err);
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSharingTemplate(false);
    }
  }

  function handleAddProduct() {
    if (!website) return;
    const productSection = website.sections.find((s) => s.type === "products");
    if (!productSection) return;
    const data = (productSection.data || {}) as any;
    const existing = (data.products || []) as any[];
    const newProduct = {
      id: `product-${Date.now()}`,
      name: "New Product",
      price: 0,
      description: "Add a description for your product.",
      image: "",
      category: data.categories?.[0] || "All",
    };
    const newData = { ...data, products: [...existing, newProduct] };
    pushHistory({
      ...website,
      sections: website.sections.map((s) => s.id === productSection.id ? { ...s, data: newData } : s),
    });
    toast.success("New product added");
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
        textAlign: key === "textAlign" ? (value as "left" | "center" | "right") : prev.textAlign,
        fontScale: key === "fontScale" ? Number(value) : prev.fontScale,
      } : prev);
    }
  }

  function applyGlobalStyle(updates: Partial<GeneratedWebsite>) {
    if (!website) return;
    pushHistory({ ...website, ...updates });
  }

  // ── Per-field editor state (drag/resize positioning) ─────────────────────
  // Keys are scoped per viewport as "<viewMode>:<field>" so desktop edits
  // never bleed into tablet/mobile views.
  function getFieldEditor(sectionId: string, field: string): EditorFieldState | undefined {
    const section = website?.sections.find((s) => s.id === sectionId);
    const editors = (section?.data as any)?._editor as Record<string, EditorFieldState> | undefined;
    const scopedKey = `${viewMode}:${field}`;
    // Scoped key first; fall back to legacy unscoped key (treated as desktop)
    return editors?.[scopedKey] ?? (viewMode === "desktop" ? editors?.[field] : undefined);
  }

  function updateFieldEditor(sectionId: string, field: string, updates: EditorFieldState) {
    if (!website) return;
    const scopedKey = `${viewMode}:${field}`;
    pushHistory({
      ...website,
      sections: website.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const data = (s.data || {}) as any;
        const editors = (data._editor || {}) as Record<string, EditorFieldState>;
        const next: Record<string, EditorFieldState> = {
          ...editors,
          [scopedKey]: { ...(editors[scopedKey] || {}), ...updates },
        };
        return { ...s, data: { ...data, _editor: next } };
      }),
    });
  }

  function resetFieldEditor(sectionId: string, field: string) {
    if (!website) return;
    const scopedKey = `${viewMode}:${field}`;
    pushHistory({
      ...website,
      sections: website.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const data = (s.data || {}) as any;
        const editors = { ...((data._editor || {}) as Record<string, EditorFieldState>) };
        delete editors[scopedKey];
        return { ...s, data: { ...data, _editor: editors } };
      }),
    });
  }

  function switchViewMode(mode: ViewMode) {
    setViewMode(mode);
    setToolbarTarget(null);
    setSelectedField(null);
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

  function reorderSections(fromIndex: number, toIndex: number) {
    if (!website) return;
    if (fromIndex === toIndex) return;
    const next = [...website.sections];
    if (fromIndex < 0 || fromIndex >= next.length) return;
    if (toIndex < 0 || toIndex >= next.length) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    pushHistory({ ...website, sections: next });
  }

  function resizeSection(sectionId: string, minHeight: number) {
    if (!website) return;
    const px = `${Math.max(120, Math.round(minHeight))}px`;
    pushHistory({
      ...website,
      sections: website.sections.map((s) =>
        s.id === sectionId
          ? { ...s, styles: { ...(s.styles || {}), minHeight: px } }
          : s
      ),
    });
  }

  async function uploadPastedImage(sectionId: string, field: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    try {
      toast.loading("Uploading pasted image...", { id: "img-paste" });
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Image inserted!", { id: "img-paste" });
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
      toast.error(err.message || "Paste upload failed", { id: "img-paste" });
    }
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

  const hasProductsSection = website.sections?.some((s) => s.type === "products");

  const editorCtx: EditorContextType = {
    isEditable: true,
    viewMode,
    onTextChange: handleTextChange,
    onNestedTextChange: handleNestedTextChange,
    onImageUpload: handleImageUpload,
    onImagePaste: uploadPastedImage,
    onSectionClick: () => {},
    onShowToolbar: (target) => {
      // Enrich the target with the section's persisted alignment + scale
      const section = website?.sections.find((s) => s.id === target.sectionId);
      const align = (section?.styles as any)?.textAlign as "left" | "center" | "right" | undefined;
      const scale = section?.styles?.fontScale ? Number(section.styles.fontScale) : 1;
      setToolbarTarget({
        ...target,
        textAlign: align ?? "left",
        fontScale: scale,
      });
    },
    selectedField,
    onSelectField: (sectionId, field) => setSelectedField({ sectionId, field }),
    onUpdateEditor: updateFieldEditor,
    onResetEditor: resetFieldEditor,
    getEditorState: getFieldEditor,
    onResizeSection: resizeSection,
    onReorderSections: reorderSections,
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>

      {/* ── Top toolbar ── */}
      <header className="h-12 sm:h-14 bg-white border-b border-gray-200 flex items-center px-2 sm:px-4 shrink-0 z-50 shadow-sm gap-1.5 sm:gap-2 overflow-hidden">

        {/* Left: sidebar toggle + back + name */}
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Toggle panel"
          >
            <PanelLeft size={16} />
          </button>
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors hidden sm:flex" title="Back to dashboard">
            <ArrowLeft size={16} />
          </Link>
          <div className="hidden sm:flex flex-col min-w-0 ml-0.5">
            <p className="text-xs sm:text-sm font-semibold leading-none text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{website.name}</p>
            <p className="text-[10px] mt-0.5 hidden md:block">
              {saved
                ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={9} /> Saved</span>
                : <span className="text-gray-400">Tap text to edit</span>
              }
            </p>
          </div>
        </div>

        {/* Centre: viewport toggle — hidden on xs, shown sm+ */}
        <div className="hidden sm:flex flex-1 items-center justify-center">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
            {([["desktop", Monitor, "Desktop"], ["tablet", Tablet, "Tablet"], ["mobile", Smartphone, "Mobile"]] as const).map(([mode, Icon, label]) => (
              <button
                key={mode}
                onClick={() => switchViewMode(mode)}
                title={label}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === mode
                    ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={13} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer on xs */}
        <div className="flex-1 sm:hidden" />

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Undo/Redo: desktop only */}
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors hidden lg:flex" title="Undo (Ctrl+Z)">
            <Undo2 size={15} />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors hidden lg:flex" title="Redo (Ctrl+Y)">
            <Redo2 size={15} />
          </button>

          {/* Add Product (only for stores) */}
          {hasProductsSection && (
            <button
              onClick={handleAddProduct}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs sm:text-sm text-gray-700 font-medium transition-colors"
              title="Add new product"
            >
              <Plus size={13} />
              <span className="hidden lg:inline">Add Product</span>
            </button>
          )}

          {/* Share template link */}
          <button
            onClick={handleShareTemplate}
            disabled={sharingTemplate}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs sm:text-sm text-gray-700 font-medium transition-colors disabled:opacity-50"
            title="Copy a shareable template link"
          >
            {sharingTemplate ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
            <span className="hidden lg:inline">Share Template</span>
          </button>

          {/* Preview */}
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs sm:text-sm text-gray-700 font-medium transition-colors"
            title="Preview"
          >
            <Eye size={13} />
            <span className="hidden md:inline">Preview</span>
          </button>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs sm:text-sm text-gray-700 font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span className="hidden md:inline">Save</span>
          </button>

          {/* Publish / Live + Unpublish */}
          {published ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <a
                href={`https://${rawWebsite?.subdomain}.storebuilder.ph`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs sm:text-sm font-medium transition-colors"
                title="Open live site"
              >
                <ExternalLink size={12} />
                <span className="hidden sm:inline">Live</span>
              </a>
              <button
                onClick={handleUnpublish}
                disabled={unpublishing}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-300 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                title="Take site offline"
              >
                {unpublishing ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />}
                <span className="hidden sm:inline">Unpublish</span>
              </button>
            </div>
          ) : (
            <button onClick={handlePublish} disabled={publishing}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white transition-colors shadow-sm">
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
              <span className="hidden sm:inline">Publish</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">

        {/* Options panel — overlay drawer on mobile/tablet, inline on lg+ */}
        <aside
          className={`
            bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0
            transition-[width] duration-300 ease-in-out
            absolute inset-y-0 left-0 z-40
            lg:relative lg:z-auto
            ${sidebarOpen ? "w-64 sm:w-60" : "w-0"}
          `}
        >
          <div className="w-64 sm:w-60 h-full overflow-hidden">
            <OptionsPanel
              website={website}
              onUpdateWebsite={(updates) => pushHistory({ ...website, ...updates } as GeneratedWebsite)}
              onMoveSection={moveSection}
              onDeleteSection={deleteSection}
              onDuplicateSection={duplicateSection}
              onScrollToSection={scrollToSection}
            />
          </div>
        </aside>

        {/* Overlay for mobile/tablet sidebar */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* CSS overrides that simulate responsive breakpoints inside device frames.
            Tailwind's responsive classes fire on viewport width (not container
            width), so on a 1440px desktop viewport ALL sm/md/lg classes apply
            even inside a 390px device frame. These overrides cancel the classes
            that shouldn't fire at that frame width. */}
        {viewMode !== "desktop" && (
          <style>{`
            /* ── MOBILE (390px frame) ── reset sm:, md:, lg: overrides ───────── */

            /* grid columns → single column */
            [data-preview="mobile"] .sm\\:grid-cols-2,
            [data-preview="mobile"] .sm\\:grid-cols-3,
            [data-preview="mobile"] .md\\:grid-cols-2,
            [data-preview="mobile"] .md\\:grid-cols-4,
            [data-preview="mobile"] .lg\\:grid-cols-2,
            [data-preview="mobile"] .lg\\:grid-cols-3,
            [data-preview="mobile"] .lg\\:grid-cols-4 {
              grid-template-columns: repeat(1,minmax(0,1fr)) !important;
            }

            /* flex direction */
            [data-preview="mobile"] .sm\\:flex-row { flex-direction: column !important; }

            /* width */
            [data-preview="mobile"] .sm\\:w-auto { width: 100% !important; }

            /* navigation: hide desktop links, show hamburger */
            [data-preview="mobile"] .md\\:flex   { display: none !important; }
            [data-preview="mobile"] .md\\:inline-flex { display: none !important; }
            [data-preview="mobile"] .hidden.sm\\:inline { display: none !important; }
            [data-preview="mobile"] .md\\:hidden { display: block !important; }

            /* text sizes: sm: overrides → mobile equivalent */
            [data-preview="mobile"] .sm\\:text-sm   { font-size: 0.75rem  !important; line-height: 1rem      !important; }
            [data-preview="mobile"] .sm\\:text-base { font-size: 0.875rem !important; line-height: 1.25rem   !important; }
            [data-preview="mobile"] .sm\\:text-lg   { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .sm\\:text-xl   { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .sm\\:text-2xl  { font-size: 1.25rem  !important; line-height: 1.75rem   !important; }
            [data-preview="mobile"] .sm\\:text-3xl  { font-size: 1.5rem   !important; line-height: 2rem      !important; }
            [data-preview="mobile"] .sm\\:text-4xl  { font-size: 1.875rem !important; line-height: 2.25rem   !important; }
            [data-preview="mobile"] .sm\\:text-5xl  { font-size: 1.875rem !important; line-height: 2.25rem   !important; }

            /* text sizes: md: overrides → mobile equivalent */
            [data-preview="mobile"] .md\\:text-lg   { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .md\\:text-xl   { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .md\\:text-2xl  { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .md\\:text-4xl  { font-size: 1.5rem   !important; line-height: 2rem      !important; }
            [data-preview="mobile"] .md\\:text-6xl  { font-size: 1.875rem !important; line-height: 2.25rem   !important; }

            /* text sizes: lg: overrides → mobile equivalent */
            [data-preview="mobile"] .lg\\:text-lg   { font-size: 1rem     !important; line-height: 1.5rem    !important; }
            [data-preview="mobile"] .lg\\:text-3xl  { font-size: 1.5rem   !important; line-height: 2rem      !important; }
            [data-preview="mobile"] .lg\\:text-5xl  { font-size: 1.5rem   !important; line-height: 2rem      !important; }
            [data-preview="mobile"] .lg\\:text-7xl  { font-size: 1.875rem !important; line-height: 2.25rem   !important; }

            /* padding → smaller values matching mobile base classes */
            [data-preview="mobile"] .sm\\:px-6,
            [data-preview="mobile"] .sm\\:px-8   { padding-left: 1rem !important; padding-right: 1rem !important; }
            [data-preview="mobile"] .sm\\:py-20,
            [data-preview="mobile"] .sm\\:py-24,
            [data-preview="mobile"] .lg\\:py-24  { padding-top: 3rem !important; padding-bottom: 3rem !important; }
            [data-preview="mobile"] .lg\\:py-32  { padding-top: 4rem !important; padding-bottom: 4rem !important; }
            [data-preview="mobile"] .sm\\:py-4   { padding-top: 0.875rem !important; padding-bottom: 0.875rem !important; }

            /* gap & margin */
            [data-preview="mobile"] .sm\\:gap-4,
            [data-preview="mobile"] .sm\\:gap-6,
            [data-preview="mobile"] .lg\\:gap-6 { gap: 1rem !important; }
            [data-preview="mobile"] .sm\\:mb-4   { margin-bottom: 0.75rem  !important; }
            [data-preview="mobile"] .sm\\:mb-6   { margin-bottom: 1rem     !important; }
            [data-preview="mobile"] .sm\\:mb-8   { margin-bottom: 1.5rem   !important; }
            [data-preview="mobile"] .sm\\:mb-12  { margin-bottom: 2rem     !important; }
            [data-preview="mobile"] .sm\\:mb-14  { margin-bottom: 2.5rem   !important; }
            [data-preview="mobile"] .lg\\:mb-16  { margin-bottom: 2.5rem   !important; }

            /* ── TABLET (768px frame) ── only reset lg: overrides ────────────── */

            /* grid columns */
            [data-preview="tablet"] .lg\\:grid-cols-2,
            [data-preview="tablet"] .lg\\:grid-cols-3,
            [data-preview="tablet"] .lg\\:grid-cols-4 {
              grid-template-columns: repeat(2,minmax(0,1fr)) !important;
            }

            /* text sizes: only lg: (sm: and md: correctly apply at 768px) */
            [data-preview="tablet"] .lg\\:text-5xl { font-size: 2.25rem  !important; line-height: 2.5rem !important; }
            [data-preview="tablet"] .lg\\:text-7xl { font-size: 3rem     !important; line-height: 1      !important; }
            [data-preview="tablet"] .lg\\:text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
            [data-preview="tablet"] .lg\\:text-lg  { font-size: 1.125rem !important; line-height: 1.75rem !important; }

            /* gap & padding */
            [data-preview="tablet"] .lg\\:gap-6  { gap: 1.5rem !important; }
            [data-preview="tablet"] .lg\\:py-24  { padding-top: 5rem !important; padding-bottom: 5rem !important; }
            [data-preview="tablet"] .lg\\:py-32  { padding-top: 5rem !important; padding-bottom: 5rem !important; }
            [data-preview="tablet"] .lg\\:mb-16  { margin-bottom: 3.5rem !important; }
          `}</style>
        )}

        {/* Canvas */}
        <main
          className="flex-1 overflow-y-auto bg-[#f0f2f5] flex items-start justify-center p-0 min-w-0"
          style={{ overflowX: "clip" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedField(null); }}
        >
          {viewMode === "desktop" ? (
            <div
              className="w-full self-stretch"
              style={{
                maxWidth: "100%",
                backgroundColor: website.colors?.background || "#0d0d1a",
              }}
            >
              <WebsiteRenderer website={website} editorContext={editorCtx} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 pt-3 pb-8">
              {/* Device frame — live editable */}
              <div
                className="relative shadow-2xl shrink-0 bg-white"
                style={{
                  width: VIEW_WIDTHS[viewMode],
                  height: viewMode === "mobile" ? "812px" : "1024px",
                  borderRadius: viewMode === "mobile" ? "44px" : "24px",
                  border: `${viewMode === "mobile" ? "10px" : "8px"} solid #1c1c2e`,
                  boxShadow: "0 30px 80px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                {/* Mobile notch */}
                {viewMode === "mobile" && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-28 h-7 bg-[#1c1c2e] rounded-b-2xl pointer-events-none" />
                )}
                {/* Scrollable live canvas — full editing enabled */}
                <div
                  data-preview={viewMode}
                  style={{
                    width: "100%",
                    height: "100%",
                    overflowY: "auto",
                    overflowX: "hidden",
                    paddingTop: viewMode === "mobile" ? "28px" : 0,
                  }}
                >
                  <WebsiteRenderer website={website} editorContext={editorCtx} />
                </div>
              </div>
              {/* Hint */}
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <Info size={11} />
                <span>Live editing — tap any text, image or resize handle to edit</span>
              </div>
            </div>
          )}
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

      {/* Share Template modal */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShareModalOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Share Template</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send this link to your client — they can copy the site and start editing.</p>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              {/* URL row */}
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareModalUrl}
                  className="flex-1 px-3 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 truncate"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModalUrl).then(() => {
                      toast.success("Link copied!");
                    }).catch(() => {
                      toast.error("Could not copy — please copy manually.");
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors shrink-0"
                >
                  <Copy size={13} />
                  Copy
                </button>
              </div>

              {/* Info blurb */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1 leading-relaxed">
                <p className="font-semibold">How it works</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                  <li>Client opens the link in their browser</li>
                  <li>They create a free account (or sign in)</li>
                  <li>An independent copy is added to their workspace</li>
                  <li>They can edit and publish it as their own site</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setShareModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
