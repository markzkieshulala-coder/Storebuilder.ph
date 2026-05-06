"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Mail, Phone, MapPin, ImagePlus, Loader2 } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";
import { useImageDropZone } from "@/components/editor/useImageDropZone";

export default function ContactSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onImageUpload, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();
  const bgDrop = useImageDropZone(section.id, "backgroundImage");

  const isSelected = (field: string) =>
    !!selectedField && selectedField.sectionId === section.id && selectedField.field === field;

  const fieldProps = (field: string) => ({
    sectionId: section.id, field,
    editor: getEditorState(section.id, field),
    isEditable, selected: isSelected(field),
    onSelect: onSelectField, onUpdateEditor, onResetEditor,
    onTextChange, onShowToolbar,
    textColor, bgColor: bg, accentColor: accent,
  });

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors min-h-[48px]";
  const inputStyle = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: textColor };

  const editableInline = (path: string, value: string, className: string) => (
    <span
      className={className}
      style={{ color: textColor, outline: "none", cursor: isEditable ? "text" : undefined }}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={(e) => {
        if (!isEditable) return;
        // path is "details.address" / "details.email" / "details.phone"
        const [, key] = path.split(".");
        onTextChange(section.id, `details.${key}`, e.currentTarget.innerText);
      }}
      onClick={(e) => isEditable && e.stopPropagation()}
    >
      {value}
    </span>
  );

  return (
    <section
      className="relative py-14 px-4 sm:py-20 sm:px-6 lg:py-24 overflow-hidden"
      style={{ background: bg }}
      onClick={() => isEditable && onSectionClick(section.id)}
      {...(isEditable ? bgDrop.handlers : {})}
    >
      {d.backgroundImage && (
        <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${d.backgroundImage})` }} />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)" }} />
        </>
      )}
      {isEditable && bgDrop.active && (
        <div
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
          style={{ background: "rgba(24,119,242,0.18)", border: "3px dashed #1877F2" }}
        >
          <div className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2">
            <ImagePlus size={15} /> Drop image to set as background
          </div>
        </div>
      )}
      {isEditable && (
        <button
          onClick={(e) => { e.stopPropagation(); onImageUpload(section.id, "backgroundImage"); }}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(24,119,242,0.9)", color: "#fff", cursor: "pointer" }}
        >
          <ImagePlus size={13} /> Change background <span className="opacity-70 ml-1">or drop</span>
        </button>
      )}
      <div className="max-w-4xl mx-auto relative z-10">
        <EditableField
          {...fieldProps("headline")}
          tag="h2"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12"
          style={{ fontFamily: "var(--heading-font)", color: textColor }}
        >
          {d.headline || "Contact Us"}
        </EditableField>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12">
          <div className="space-y-4">
            {(d.details?.address || isEditable) && (
              <div className="flex items-start gap-3">
                <MapPin size={17} style={{ color: accent }} className="mt-0.5 shrink-0" />
                {editableInline("details.address", d.details?.address || "", "text-sm opacity-70")}
              </div>
            )}
            {(d.details?.email || isEditable) && (
              <div className="flex items-center gap-3">
                <Mail size={17} style={{ color: accent }} className="shrink-0" />
                {editableInline("details.email", d.details?.email || "", "text-sm opacity-70 break-all")}
              </div>
            )}
            {(d.details?.phone || isEditable) && (
              <div className="flex items-center gap-3">
                <Phone size={17} style={{ color: accent }} className="shrink-0" />
                {editableInline("details.phone", d.details?.phone || "", "text-sm opacity-70")}
              </div>
            )}
          </div>
          {!sent ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (isEditable) return; // editor preview: no real submission
                if (submitting) return;
                setErrorMsg("");
                if (!website.subdomain) {
                  setErrorMsg("Publish this site to enable the contact form.");
                  return;
                }
                setSubmitting(true);
                try {
                  const res = await fetch("/api/contact", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      subdomain: website.subdomain,
                      name: form.name,
                      email: form.email,
                      message: form.message,
                      // also pass the email shown in the contact section as a fallback
                      sectionEmail: d.details?.email || undefined,
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setErrorMsg(data.error || "Could not send message. Please try again.");
                    return;
                  }
                  setSent(true);
                } catch {
                  setErrorMsg("Network error. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }}
              className="space-y-3 sm:space-y-4"
            >
              <input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} style={inputStyle} />
              <input type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} style={inputStyle} />
              <textarea placeholder="Your message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none" style={inputStyle} />
              {errorMsg && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-semibold text-sm min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}
              >
                {submitting ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : "Send message"}
              </button>
            </form>
          ) : (
            <div className="p-6 rounded-xl text-center" style={{ background: `${accent}15`, color: accent }}>
              Message sent. We&apos;ll get back to you soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
