"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, Globe, Loader2,
  Monitor, Smartphone, Tablet, Save, CheckCircle, X, Type,
  ImagePlus, Link2, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "desktop" | "tablet" | "mobile";

type SelectedEl = {
  type: "text" | "image" | "button" | "link" | "container" | "section" | string;
  textContent: string;
  innerHTML: string;
  src?: string;
  href?: string;
  path: string;
  id?: string;
  sectionIndex?: string;
};

type Section = {
  id: string;
  label: string;
  index: number;
};

interface Props {
  websiteId: string;
  initialHtml: string;
  siteName: string;
  subdomain?: string;
  published: boolean;
  onPublishChange?: (published: boolean) => void;
}

// ─── Editor bridge script (injected into the iframe) ─────────────────────────
// This runs inside the iframe and communicates with the parent via postMessage.

const EDITOR_BRIDGE = `
(function initSbBridge() {
  if (window.__SB_BRIDGE_INIT__) return;
  window.__SB_BRIDGE_INIT__ = true;

  const css = document.createElement('style');
  css.textContent = \`
    [data-editable]:not([data-editable="section"]):not([data-editable="container"]) {
      transition: outline 0.1s;
    }
    [data-editable]:not([data-editable="section"]):not([data-editable="container"]):hover {
      outline: 2px solid rgba(59,130,246,0.5) !important;
      outline-offset: 2px;
      cursor: pointer;
    }
    .sb-selected {
      outline: 2px solid #3b82f6 !important;
      outline-offset: 2px;
    }
    .sb-section-hover {
      outline: 1px dashed rgba(59,130,246,0.3) !important;
      outline-offset: 4px;
    }
  \`;
  document.head.appendChild(css);

  let selected = null;

  function getPath(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let node = el;
    while (node && node !== document.body) {
      let seg = node.tagName.toLowerCase();
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
      const parent = node.parentElement;
      if (parent) {
        const same = [...parent.children].filter(c => c.tagName === node.tagName);
        if (same.length > 1) seg += ':nth-of-type(' + (same.indexOf(node) + 1) + ')';
      }
      parts.unshift(seg);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  document.addEventListener('click', function(e) {
    const el = e.target.closest('[data-editable]');
    if (selected) { selected.classList.remove('sb-selected'); selected = null; }
    if (!el) {
      window.parent.postMessage({ type: 'SB_DESELECT' }, '*');
      return;
    }
    if (el.dataset.editable === 'section' || el.dataset.editable === 'container') return;
    e.preventDefault();
    e.stopPropagation();
    selected = el;
    el.classList.add('sb-selected');
    window.parent.postMessage({
      type: 'SB_SELECT',
      editableType: el.dataset.editable || el.tagName.toLowerCase(),
      tagName: el.tagName.toLowerCase(),
      textContent: el.innerText || el.textContent || '',
      innerHTML: el.innerHTML || '',
      src: el.src || el.style.backgroundImage || '',
      href: el.href || '',
      id: el.id || '',
      sectionIndex: (el.closest('[data-editable="section"]') || el.closest('[data-section-index]'))?.dataset?.sectionIndex || '',
      path: getPath(el),
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    const d = e.data;
    if (!d || !d.type) return;

    if (d.type === 'SB_UPDATE_TEXT') {
      try {
        const el = document.querySelector(d.path);
        if (el) el.textContent = d.content;
      } catch(_) {}
    }
    if (d.type === 'SB_UPDATE_HREF') {
      try {
        const el = document.querySelector(d.path);
        if (el) el.href = d.href;
      } catch(_) {}
    }
    if (d.type === 'SB_UPDATE_IMG') {
      try {
        const el = document.querySelector(d.path);
        if (el && el.tagName === 'IMG') el.src = d.url;
      } catch(_) {}
    }
    if (d.type === 'SB_REORDER') {
      const body = document.body;
      const sections = [...document.querySelectorAll('[data-editable="section"],[data-section-index]')];
      const map = {};
      sections.forEach(s => { if (s.id) map[s.id] = s; });
      d.order.forEach(id => { if (map[id]) body.appendChild(map[id]); });
    }
    if (d.type === 'SB_GET_HTML') {
      // Remove editor artifacts before serialising
      document.querySelectorAll('.sb-selected,.sb-section-hover').forEach(el => {
        el.classList.remove('sb-selected','sb-section-hover');
      });
      window.parent.postMessage({ type: 'SB_HTML', html: document.documentElement.outerHTML }, '*');
    }
    if (d.type === 'SB_GET_SECTIONS') {
      const secs = [...document.querySelectorAll('[data-editable="section"],[data-section-index]')];
      const info = secs.map((s, i) => ({
        id: s.id || ('sb-sec-' + i),
        label: s.id || s.dataset.sectionIndex || (s.tagName.toLowerCase() + '-' + i),
        index: parseInt(s.dataset.sectionIndex || String(i), 10),
      }));
      window.parent.postMessage({ type: 'SB_SECTIONS', sections: info }, '*');
    }
  });

  // Announce ready
  window.parent.postMessage({ type: 'SB_READY' }, '*');
})();
`;

function injectBridge(html: string): string {
  const script = `<script>(function(){${EDITOR_BRIDGE}})()</script>`;
  const idx = html.indexOf("</body>");
  if (idx !== -1) return html.slice(0, idx) + script + html.slice(idx);
  return html + script;
}

const VIEW_WIDTHS: Record<ViewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function HtmlEditor({
  websiteId, initialHtml, siteName, subdomain, published: initPublished,
  onPublishChange,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState(initialHtml);
  const [iframeDoc, setIframeDoc] = useState<string>(() => injectBridge(initialHtml));
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [selected, setSelected] = useState<SelectedEl | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(initPublished);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [imageInput, setImageInput] = useState<HTMLInputElement | null>(null);
  const [pendingImgPath, setPendingImgPath] = useState<string | null>(null);
  // Tracks edits to the text field in the properties panel
  const [editText, setEditText] = useState("");
  const [editHref, setEditHref] = useState("");
  const iframeReady = useRef(false);

  // Create the hidden file input once on mount
  useEffect(() => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.style.display = "none";
    document.body.appendChild(inp);
    setImageInput(inp);
    return () => { document.body.removeChild(inp); };
  }, []);

  // Sync pendingImgPath to the listener
  useEffect(() => {
    if (!imageInput) return;
    const onChange = async () => {
      if (!imageInput.files?.[0] || !pendingImgPath) return;
      const url = await uploadImage(imageInput.files[0]);
      if (url) {
        sendToIframe({ type: "SB_UPDATE_IMG", path: pendingImgPath, url });
        setPendingImgPath(null);
        requestHtml();
      }
      imageInput.value = "";
    };
    imageInput.addEventListener("change", onChange);
    return () => imageInput.removeEventListener("change", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageInput, pendingImgPath]);

  // Listen for postMessage from iframe
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d?.type) return;
      if (d.type === "SB_READY") {
        iframeReady.current = true;
        sendToIframe({ type: "SB_GET_SECTIONS" });
      }
      if (d.type === "SB_SELECT") {
        const el: SelectedEl = {
          type: d.editableType,
          textContent: d.textContent,
          innerHTML: d.innerHTML,
          src: d.src,
          href: d.href,
          path: d.path,
          id: d.id,
          sectionIndex: d.sectionIndex,
        };
        setSelected(el);
        setEditText(d.textContent || "");
        setEditHref(d.href || "");
      }
      if (d.type === "SB_DESELECT") setSelected(null);
      if (d.type === "SB_SECTIONS") setSections(d.sections || []);
      if (d.type === "SB_HTML") {
        setHtmlContent(d.html);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function sendToIframe(msg: object) {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function requestHtml() {
    sendToIframe({ type: "SB_GET_HTML" });
  }

  // Auto-save every 60s
  useEffect(() => {
    const t = setInterval(autoSave, 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent]);

  // Keyboard Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlContent]);

  async function uploadImage(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) { toast.error("Image upload failed"); return null; }
    const data = await res.json();
    return data.url || null;
  }

  async function autoSave() {
    if (!htmlContent) return;
    const res = await fetch(`/api/websites/${websiteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ htmlContent }),
    });
    if (!res.ok) console.warn("[HtmlEditor] auto-save failed");
  }

  async function handleSave() {
    // Request latest HTML from iframe first
    requestHtml();
    // Give postMessage a tick to propagate, then save
    await new Promise((r) => setTimeout(r, 150));
    setSaving(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("Saved");
    } catch {
      toast.error("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      if (!res.ok) throw new Error("Publish failed");
      const next = !published;
      setPublished(next);
      onPublishChange?.(next);
      toast.success(next ? "Published!" : "Unpublished");
    } catch {
      toast.error("Could not change publish status");
    } finally {
      setPublishing(false);
    }
  }

  // Apply text edit to iframe immediately (live preview), save later
  function applyTextEdit() {
    if (!selected) return;
    sendToIframe({ type: "SB_UPDATE_TEXT", path: selected.path, content: editText });
    setSelected({ ...selected, textContent: editText });
    requestHtml();
  }

  function applyHrefEdit() {
    if (!selected) return;
    sendToIframe({ type: "SB_UPDATE_HREF", path: selected.path, href: editHref });
    setSelected({ ...selected, href: editHref });
    requestHtml();
  }

  function moveSectionUp(idx: number) {
    if (idx <= 0) return;
    const next = [...sections];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setSections(next);
    sendToIframe({ type: "SB_REORDER", order: next.map((s) => s.id) });
    requestHtml();
  }

  function moveSectionDown(idx: number) {
    if (idx >= sections.length - 1) return;
    const next = [...sections];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setSections(next);
    sendToIframe({ type: "SB_REORDER", order: next.map((s) => s.id) });
    requestHtml();
  }

  const iframeSrc = iframeDoc;

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-3 h-12 shrink-0 gap-2"
        style={{ background: "#1e293b", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors">
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-white/20">|</span>
          <span className="text-white/80 text-sm font-medium truncate max-w-[160px]">{siteName}</span>
        </div>

        {/* Center — viewport controls */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {(["desktop", "tablet", "mobile"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              title={v.charAt(0).toUpperCase() + v.slice(1)}
              className={`p-1.5 rounded-md transition-colors ${viewMode === v ? "bg-white/20 text-white" : "text-white/40 hover:text-white/80"}`}
            >
              {v === "desktop" ? <Monitor size={14} /> : v === "tablet" ? <Tablet size={14} /> : <Smartphone size={14} />}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => window.open(`/preview/${websiteId}`, "_blank")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Eye size={12} />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <CheckCircle size={12} className="text-green-400" /> : <Save size={12} />}
            Save
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              published
                ? "bg-green-600 hover:bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {publishing ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
            {published ? "Published" : "Publish"}
          </button>

          {published && subdomain && (
            <a
              href={`https://${subdomain}.storebuilder.ph`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-white/50 hover:text-white transition-colors"
              title="View live site"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — section list */}
        {sidebarOpen && (
          <div
            className="w-52 shrink-0 flex flex-col border-r overflow-hidden"
            style={{ background: "#1e293b", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">Sections</span>
              <button onClick={() => setSidebarOpen(false)} className="text-white/30 hover:text-white/70">
                <X size={12} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
              {sections.length === 0 && (
                <p className="text-white/30 text-xs px-1 pt-2">Loading sections…</p>
              )}
              {sections.map((sec, i) => (
                <div
                  key={sec.id}
                  className="flex items-center gap-1 group rounded-md px-2 py-1.5 hover:bg-white/5"
                >
                  <span className="text-white/60 text-xs truncate flex-1 capitalize">
                    {sec.label.replace(/^sb-sec-\d+$/, `Section ${i + 1}`).replace(/-/g, " ")}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => moveSectionUp(i)}
                      className="text-white/40 hover:text-white p-0.5 rounded"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      onClick={() => moveSectionDown(i)}
                      className="text-white/40 hover:text-white p-0.5 rounded"
                    >
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-6 shrink-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white/40 hover:text-white/80 border-r border-white/5 text-xs"
          >
            ›
          </button>
        )}

        {/* Center — iframe canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-200">
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            <div
              className="relative bg-white shadow-2xl transition-[width] duration-200"
              style={{
                width: VIEW_WIDTHS[viewMode],
                minHeight: "100%",
                borderRadius: viewMode === "desktop" ? 0 : 8,
                overflow: "hidden",
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={iframeSrc}
                style={{ width: "100%", minHeight: "800px", border: "none", display: "block" }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={siteName}
              />
            </div>
          </div>
        </div>

        {/* Right panel — element properties */}
        {rightOpen && (
          <div
            className="w-64 shrink-0 flex flex-col border-l overflow-hidden"
            style={{ background: "#1e293b", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">
                {selected ? "Element" : "Properties"}
              </span>
              <button onClick={() => setRightOpen(false)} className="text-white/30 hover:text-white/70">
                <X size={12} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {!selected ? (
                <p className="text-white/25 text-xs mt-4 leading-relaxed">
                  Click any text, image, or button on the preview to select and edit it.
                </p>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Type badge */}
                  <div className="flex items-center gap-2">
                    {selected.type === "image" ? <ImagePlus size={13} className="text-blue-400" />
                      : selected.type === "button" || selected.type === "link" ? <Link2 size={13} className="text-purple-400" />
                      : <Type size={13} className="text-green-400" />}
                    <span className="text-white/50 text-xs capitalize">{selected.type} element</span>
                  </div>

                  {/* Text / button editing */}
                  {(selected.type === "text" || selected.type === "button" || selected.type === "link") && (
                    <div>
                      <label className="block text-white/40 text-xs mb-1 font-medium">Text content</label>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full text-xs rounded-md px-2.5 py-2 text-white placeholder-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      />
                      <button
                        onClick={applyTextEdit}
                        className="mt-1.5 w-full py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Href editing for links/buttons */}
                  {(selected.type === "button" || selected.type === "link") && (
                    <div>
                      <label className="block text-white/40 text-xs mb-1 font-medium">Link URL</label>
                      <input
                        type="text"
                        value={editHref}
                        onChange={(e) => setEditHref(e.target.value)}
                        className="w-full text-xs rounded-md px-2.5 py-2 text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                        placeholder="https://..."
                      />
                      <button
                        onClick={applyHrefEdit}
                        className="mt-1.5 w-full py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {/* Image editing */}
                  {selected.type === "image" && (
                    <div>
                      <label className="block text-white/40 text-xs mb-1 font-medium">Image</label>
                      {selected.src && !selected.src.includes("data:") && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selected.src}
                          alt=""
                          className="w-full h-24 object-cover rounded-md mb-2"
                        />
                      )}
                      <button
                        onClick={() => {
                          setPendingImgPath(selected.path);
                          imageInput?.click();
                        }}
                        className="w-full py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ImagePlus size={11} />
                        Replace image
                      </button>
                      <p className="text-white/25 text-xs mt-1.5 text-center">or paste URL below</p>
                      <input
                        type="text"
                        placeholder="https://..."
                        className="mt-1 w-full text-xs rounded-md px-2.5 py-2 text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const url = (e.target as HTMLInputElement).value.trim();
                            if (url) {
                              sendToIframe({ type: "SB_UPDATE_IMG", path: selected.path, url });
                              requestHtml();
                            }
                          }
                        }}
                      />
                    </div>
                  )}

                  <button
                    onClick={() => setSelected(null)}
                    className="w-full py-1.5 rounded-md text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
                  >
                    <X size={11} />
                    Deselect
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!rightOpen && (
          <button
            onClick={() => setRightOpen(true)}
            className="w-6 shrink-0 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white/40 hover:text-white/80 border-l border-white/5 text-xs"
          >
            ‹
          </button>
        )}
      </div>
    </div>
  );
}
