"use client";
import { useState } from "react";
import { Section, GeneratedWebsite } from "@/lib/ai/generate";
import { Mail, Phone, MapPin } from "lucide-react";
import { useEditor } from "@/components/editor/EditorContext";
import EditableField from "@/components/editor/EditableField";

export default function ContactSection({ section, website }: { section: Section; website: GeneratedWebsite }) {
  const d = section.data as any;
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const textColor = section.styles?.textColor || website.colors?.text || "#fff";
  const accent = section.styles?.accentColor || website.colors?.secondary || "#c9a84c";
  const bg = section.styles?.background || website.colors?.primary || "#12122a";
  const {
    isEditable, onTextChange, onSectionClick, onShowToolbar,
    selectedField, onSelectField, onUpdateEditor, onResetEditor, getEditorState,
  } = useEditor();

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

  return (
    <section className="py-14 px-4 sm:py-20 sm:px-6 lg:py-24" style={{ background: bg }} onClick={() => isEditable && onSectionClick(section.id)}>
      <div className="max-w-4xl mx-auto">
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
            {d.details?.address && (
              <div className="flex items-start gap-3">
                <MapPin size={17} style={{ color: accent }} className="mt-0.5 shrink-0" />
                <p className="text-sm opacity-70" style={{ color: textColor }}>{d.details.address}</p>
              </div>
            )}
            {d.details?.email && (
              <div className="flex items-center gap-3">
                <Mail size={17} style={{ color: accent }} className="shrink-0" />
                <a href={`mailto:${d.details.email}`} className="text-sm opacity-70 hover:opacity-100 break-all" style={{ color: textColor }}>{d.details.email}</a>
              </div>
            )}
            {d.details?.phone && (
              <div className="flex items-center gap-3">
                <Phone size={17} style={{ color: accent }} className="shrink-0" />
                <a href={`tel:${d.details.phone}`} className="text-sm opacity-70 hover:opacity-100" style={{ color: textColor }}>{d.details.phone}</a>
              </div>
            )}
          </div>
          {!sent ? (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-3 sm:space-y-4">
              <input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} style={inputStyle} />
              <input type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} style={inputStyle} />
              <textarea placeholder="Your message" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none" style={inputStyle} />
              <button type="submit" className="w-full py-3.5 rounded-xl font-semibold text-sm min-h-[48px]" style={{ background: accent, color: website.colors?.primary || "#1a1a2e" }}>
                Send message
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
