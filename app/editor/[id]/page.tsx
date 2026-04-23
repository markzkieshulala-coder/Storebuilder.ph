"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Save, Eye, Globe, Smartphone, Monitor,
  Tablet, Undo2, Redo2, Sparkles, ExternalLink,
  CheckCircle, Loader2, Edit3,
} from "lucide-react";
import toast from "react-hot-toast";
import WebsiteRenderer from "@/components/renderer/WebsiteRenderer";
import { GeneratedWebsite } from "@/lib/ai/generate";
import { EditorContextType } from "@/components/editor/EditorContext";
import SectionPanel from "@/components/editor/SectionPanel";
import PropertiesPanel from "@/components/editor/PropertiesPanel";

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
  const [history, setHistory] = useState<GeneratedWebsite[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [editsRemaining, setEditsRemaining] = useState<number | null>(null);
  const [editLimit, setEditLimit] = useState<number>(30);
  const editCheckRef = useRef(false);
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

  // Auto-save every 30 seconds (does NOT consume edit credits)
  useEffect(() => {
    if (!website) return;
    const timer = setInterval(() => autoSave(), 30000);
    return () => clearInterval(timer);
  }, [website]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); handleRedo(); }
      // Select All within focused text element
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const el = document.activeElement;
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          e.preventDefault();
          el.select();
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [website, historyIndex, history]);

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
      if (!res.ok) {
        toast.error(d.error || "Edit limit reached");
        return false;
      }
      setEditsRemaining(d.remaining);
      return true;
    } catch {
      return true; // allow on network error
    }
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

  function handleUndo() {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setWebsite(history[newIndex]);
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setWebsite(history[newIndex]);
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
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await handleSave();
      const res = await fetch(`/api/websites/${params.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPublished(true);
        toast.success(`Live at ${data.url}!`);
      }
    } finally {
      setPublishing(false);
    }
  }

  function updateSection(sectionId: string, updates: Partial<{ data: any; styles: any }>) {
    if (!website) return;
    const newWebsite = {
      ...website,
      sections: website.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s),
    };
    pushHistory(newWebsite);
  }

  function updateGlobal(updates: Partial<GeneratedWebsite>) {
    if (!website) return;
    pushHistory({ ...website, ...updates });
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
    if (parts.length === 1) {
      newData[parts[0]] = value;
    } else if (parts.length === 2) {
      newData[parts[0]] = { ...newData[parts[0]], [parts[1]]: value };
    }
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading editor...</p>
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
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white overflow-hidden">
      {/* Top toolbar */}
      <header className="h-14 bg-zinc-900 border-b border-white/8 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/8 text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-px h-5 bg-white/10" />
          <div>
            <p className="text-sm font-semibold leading-none">{website.name}</p>
            <p className="text-xs text-white/30 mt-0.5">
              {saved ? (
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={10} /> Saved</span>
              ) : (
                <span className="flex items-center gap-1"><Edit3 size={10} /> Click to edit</span>
              )}
            </p>
          </div>
        </div>

        {/* Edit credits badge */}
        {editsRemaining !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
            editsOut ? "bg-red-500/15 text-red-400 border border-red-500/20" :
            editsLow ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
            "bg-white/5 text-white/40"
          }`}>
            <Edit3 size={11} />
            {editsRemaining}/{editLimit} edits today
          </div>
        )}

        {/* View controls */}
        <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`p-2 rounded-md transition-colors ${viewMode === mode ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}>
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={handleUndo} disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-white/8 text-white/40 hover:text-white disabled:opacity-20 transition-colors" title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button onClick={handleRedo} disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-white/8 text-white/40 hover:text-white disabled:opacity-20 transition-colors" title="Redo (Ctrl+Y)">
            <Redo2 size={16} />
          </button>
          <div className="w-px h-5 bg-white/10" />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/12 hover:border-white/25 text-sm transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
          {published ? (
            <a href={`https://${rawWebsite?.subdomain}.storebuilder.ph`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm transition-colors">
              <ExternalLink size={14} />
              View live
            </a>
          ) : (
            <button onClick={handlePublish} disabled={publishing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium transition-colors">
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Publish
            </button>
          )}
        </div>
      </header>

      {/* Edit limit warning banner */}
      {editsOut && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-xs text-red-400 text-center">
          Daily edit limit reached ({editLimit} edits). Edits reset at midnight PH time.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Sections list */}
        <aside className="w-60 bg-zinc-900 border-r border-white/6 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-white/6">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Sections</p>
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
        <main className="flex-1 overflow-auto bg-zinc-800/30 flex items-start justify-center p-6">
          <div className="transition-all duration-300 bg-white shadow-2xl overflow-auto max-h-full"
            style={{ width: VIEW_WIDTHS[viewMode], minHeight: "100%", borderRadius: viewMode !== "desktop" ? "24px" : "8px" }}>
            <WebsiteRenderer website={website} editorContext={editorCtx} />
          </div>
        </main>

        {/* Right panel — Properties */}
        <AnimatePresence>
          {selectedSection && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-zinc-900 border-l border-white/6 overflow-hidden shrink-0"
            >
              <PropertiesPanel
                section={website.sections.find((s) => s.id === selectedSection)!}
                website={website}
                onUpdate={(updates) => updateSection(selectedSection, updates)}
                onUpdateGlobal={updateGlobal}
                onClose={() => setSelectedSection(null)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
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
