"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Globe, Smartphone, Monitor,
  Tablet, Undo2, Redo2, ExternalLink,
  CheckCircle, Loader2, Edit3,
} from "lucide-react";
import toast from "react-hot-toast";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType, FloatingToolbarTarget } from "@/components/editor/EditorContext";
import SectionPanel from "@/components/editor/SectionPanel";
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
  const [published, setPublished] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [toolbarTarget, setToolbarTarget] = useState<FloatingToolbarTarget | null>(null);
  const [history, setHistory] = useState<GeneratedWebsite[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editsRemaining, setEditsRemaining] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState<number>(30);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pendingImageUpload = useRef<{ sectionId: string; field: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchWebsite();
      fetchEditCredits();
    }
  }, [status, params.id]);

  useEffect(() => {
    if (!website) return;
    const timer = setInterval(() => autoSave(), 30000);
    return () => clearInterval(timer);
  }, [website]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); handleRedo(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [website, historyIndex, history]);

  // Hide floating toolbar on outside click
  useEffect(() => {
    if (!toolbarTarget) return;
    function handleOutside(e: MouseEvent) {
      const toolbar = document.getElementById("floating-toolbar");
      if (toolbar && toolbar.contains(e.target as Node)) return;
      const t = e.target as HTMLElement;
      if (t.contentEditable === "true") return;
      setToolbarTarget(null);
    }
    document.addEventListener("mousedown", handleOutside, true);
    return () => document.removeEventListener("mousedown", handleOutside, true);
  }, [toolbarTarget]);

  async function fetchEditCredits() {
    try {
      const res = await fetch("/api/user/edits");
      if (res.ok) {
        const d = await res.json();
        setEditsRemaining(d.remaining);
        setEditLimit(d.limit);
      }
    } catch {}
  }

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

  async function consumeEdit(): Promise<boolean> {
    try {
      const res = await fetch("/api/user/edits", { method: "POST" });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Edit limit reached"); return false; }
      setEditsRemaining(d.remaining);
      return true;
    } catch { return true; }
  }

  async function pushHistory(newWebsite: GeneratedWebsite) {
    const allowed = await consumeEdit();
    if (!allowed) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newWebsite);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setWebsite(newWebsite);
  }

  // Apply style/font changes without consuming edit credits
  function applyDirect(newWebsite: GeneratedWebsite) {
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

  function updateSection(sectionId: string, updates: Partial<{ data: any; styles: any }>) {
    if (!website) return;
    pushHistory({ ...website, sections: website.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s) });
  }

  function updateGlobal(updates: Partial<GeneratedWebsite>) {
    if (!website) return;
    pushHistory({ ...website, ...updates });
  }

  function applySectionStyle(sectionId: string, key: string, value: string) {
    if (!website) return;
    applyDirect({
      ...website,
      sections: website.sections.map((s) =>
        s.id === sectionId ? { ...s, styles: { ...(s.styles || {}), [key]: value } } : s
      ),
    });
    // Keep toolbar open with updated colors
    if (toolbarTarget && toolbarTarget.sectionId === sectionId) {
      setToolbarTarget((prev) => prev ? { ...prev, [key === "textColor" ? "textColor" : key === "background" ? "bgColor" : key === "accentColor" ? "accentColor" : key]: value } : prev);
    }
  }

  function applyGlobalStyle(updates: Partial<GeneratedWebsite>) {
    if (!website) return;
    applyDirect({ ...website, ...updates });
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    if (!website) return;
    const idx = website.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const newSections = [...website.sections];
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= newSections.length) return;
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
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
    const newSections = [...website.sections];
    newSections.splice(idx + 1, 0, copy);
    pushHistory({ ...website, sections: newSections });
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

  const editsLow = editsRemaining !== null && editsRemaining <= 3;
  const editsOut = editsRemaining !== null && editsRemaining <= 0;

  const editorCtx: EditorContextType = {
    isEditable: !editsOut,
    onTextChange: handleTextChange,
    onNestedTextChange: handleNestedTextChange,
    onImageUpload: handleImageUpload,
    onSectionClick: (sectionId) => setSelectedSection(sectionId),
    onShowToolbar: (target) => setToolbarTarget(target),
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 overflow-hidden">
      {/* Top toolbar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <p className="text-sm font-semibold leading-none text-gray-900">{website.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {saved ? (
                <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={10} /> Saved</span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400"><Edit3 size={10} /> Click text to edit</span>
              )}
            </p>
          </div>
        </div>

        {/* Edit credits badge */}
        {editsRemaining !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            editsOut ? "bg-red-50 text-red-600 border border-red-200" :
            editsLow ? "bg-amber-50 text-amber-600 border border-amber-200" :
            "bg-gray-100 text-gray-500"
          }`}>
            <Edit3 size={11} />
            {editsRemaining}/{editLimit} edits today
          </div>
        )}

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([["desktop", Monitor, "Desktop"], ["tablet", Tablet, "Tablet"], ["mobile", Smartphone, "Mobile"]] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === mode
                  ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors" title="Redo (Ctrl+Y)">
            <Redo2 size={16} />
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          {published ? (
            <a href={`https://${rawWebsite?.subdomain}.storebuilder.ph`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium transition-colors">
              <ExternalLink size={14} />
              View live
            </a>
          ) : (
            <button onClick={handlePublish} disabled={publishing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white transition-colors shadow-sm">
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish
            </button>
          )}
        </div>
      </header>

      {editsOut && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-600 text-center font-medium">
          Daily edit limit reached ({editLimit} edits). Resets at midnight PH time.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Sections list */}
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-3 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sections</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {website.sections.map((section, i) => (
              <SectionPanel
                key={section.id}
                section={section}
                index={i}
                total={website.sections.length}
                isSelected={selectedSection === section.id}
                onSelect={() => setSelectedSection(selectedSection === section.id ? null : section.id)}
                onMoveUp={() => moveSection(section.id, "up")}
                onMoveDown={() => moveSection(section.id, "down")}
                onDelete={() => deleteSection(section.id)}
                onDuplicate={() => duplicateSection(section.id)}
              />
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-auto bg-[#f0f2f5] flex items-start justify-center p-6 sm:p-8">
          <div
            className="transition-all duration-300 bg-white shadow-xl overflow-hidden"
            style={{
              width: VIEW_WIDTHS[viewMode],
              minHeight: "100%",
              borderRadius: viewMode !== "desktop" ? "24px" : "12px",
              maxWidth: "100%",
            }}
          >
            <WebsiteRenderer website={website} editorContext={editorCtx} />
          </div>
        </main>
      </div>

      {/* Floating toolbar */}
      {toolbarTarget && website && (
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
