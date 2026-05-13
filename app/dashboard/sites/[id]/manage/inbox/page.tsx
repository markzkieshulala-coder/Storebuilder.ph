"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Inbox, Send, Mail, X, Check, AlertCircle, Save } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, fmtDate } from "@/components/manage/ManageShell";

type Reply = {
  id: string;
  subject: string | null;
  body: string;
  deliveredAt: string | null;
  error: string | null;
  createdAt: string;
};

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
  replies: Reply[];
};

// Inbox page — every contact form submission for this website, with full
// conversation history and an in-app reply form that emails the customer via
// the merchant's configured Business Email.
export default function InboxPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [businessEmail, setBusinessEmail] = useState<string>("");
  const [draftEmail, setDraftEmail] = useState<string>("");
  const [forward, setForward] = useState<boolean>(true);
  const [savingEmail, setSavingEmail] = useState(false);

  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/inbox`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const msgs: Message[] = Array.isArray(data.messages) ? data.messages : [];
        setMessages(msgs);
        setBusinessEmail(data.businessEmail || "");
        setDraftEmail(data.businessEmail || "");
        setForward(data.forwardContactEmails !== false);
        if (!selectedId && msgs.length > 0) setSelectedId(msgs[0].id);
      } else {
        toast.error(data.error || "Failed to load inbox");
      }
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) || null, [messages, selectedId]);

  async function saveBusinessEmail() {
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/business-email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessEmail: draftEmail, forwardContactEmails: forward }),
      });
      const data = await res.json();
      if (res.ok) {
        setBusinessEmail(data.businessEmail || "");
        toast.success("Business email saved");
      } else {
        toast.error(data.error || "Failed to save");
      }
    } finally { setSavingEmail(false); }
  }

  async function markRead(messageId: string, read: boolean) {
    await fetch(`/api/sites/${id}/manage/inbox/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, read } : m));
  }

  async function dismiss(messageId: string) {
    if (!confirm("Delete this message? Conversation history will also be removed.")) return;
    await fetch(`/api/sites/${id}/manage/inbox/${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    if (selectedId === messageId) setSelectedId(null);
  }

  async function sendReply() {
    if (!selected) return;
    const body = replyBody.trim();
    if (!body) { toast.error("Type a message first"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/sites/${id}/manage/inbox/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject.trim() || undefined, message: body }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Reply sent to ${selected.email}`);
        setReplyBody("");
        setReplySubject("");
        load();
      } else {
        toast.error(data.error || "Failed to send reply");
      }
    } finally { setSending(false); }
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Inbox"
        subtitle="Customer messages from your live and preview sites. Reply directly — your response is sent from your business email."
      />

      {/* Business email connect card */}
      <div className="bg-white border border-[#E0E7FF] rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-1.5">
            Business email (where replies are sent from)
          </label>
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="email"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              placeholder="business@yourdomain.com"
              className="w-full bg-[#F8FAFF] border border-[#E0E7FF] rounded-lg pl-9 pr-3 py-2 text-[13px] text-[#0F172A] outline-none focus:border-[#1877F2] focus:bg-white"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 text-[12px] text-[#475569]">
            <input
              type="checkbox"
              checked={forward}
              onChange={(e) => setForward(e.target.checked)}
              className="accent-[#1877F2]"
            />
            Also forward new messages to this email
          </label>
        </div>
        <button
          onClick={saveBusinessEmail}
          disabled={savingEmail || draftEmail === businessEmail && forward}
          className="px-4 py-2 rounded-lg bg-[#1877F2] text-white text-[13px] font-semibold hover:bg-[#166FE5] disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Save size={13} /> Save
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-[#E0E7FF] rounded-xl p-12 text-center text-[13px] text-[#94A3B8]">Loading…</div>
      ) : messages.length === 0 ? (
        <div className="bg-white border border-[#E0E7FF] rounded-xl p-12 text-center">
          <Inbox size={32} className="mx-auto mb-3 text-[#94A3B8]" />
          <p className="text-[14px] font-semibold text-[#0F172A]">No customer messages yet</p>
          <p className="text-[12px] text-[#64748B] mt-1">
            Submissions from your live or preview site's contact form will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
          {/* Messages list */}
          <div className="bg-white border border-[#E0E7FF] rounded-xl overflow-hidden max-h-[calc(100vh-260px)] overflow-y-auto">
            <ul className="divide-y divide-[#EFF4FF]">
              {messages.map((m) => {
                const active = m.id === selectedId;
                return (
                  <li
                    key={m.id}
                    onClick={() => { setSelectedId(m.id); if (!m.read) markRead(m.id, true); }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${active ? "bg-[#EFF4FF]" : "hover:bg-[#F8FAFF]"} ${!m.read ? "border-l-2 border-l-[#1877F2]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] truncate ${m.read ? "text-[#475569]" : "text-[#0F172A] font-semibold"}`}>{m.name}</p>
                      <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">{fmtDate(m.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] truncate">{m.email}</p>
                    <p className="text-[12px] text-[#475569] truncate mt-1">{m.message.replace(/\n/g, " ")}</p>
                    {m.replies.length > 0 && (
                      <p className="text-[10px] text-[#1877F2] font-medium mt-1">{m.replies.length} repl{m.replies.length === 1 ? "y" : "ies"}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Detail panel */}
          <div className="bg-white border border-[#E0E7FF] rounded-xl flex flex-col min-h-[420px]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-[#94A3B8] text-[13px]">
                Select a message to view
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-[#EFF4FF] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#0F172A]">{selected.name}</p>
                    <p className="text-[11px] text-[#64748B]">{selected.email} · {fmtDate(selected.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => markRead(selected.id, !selected.read)}
                      className="p-1.5 rounded-md text-[#64748B] hover:bg-[#EFF4FF] hover:text-[#1877F2]"
                      title={selected.read ? "Mark as unread" : "Mark as read"}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => dismiss(selected.id)}
                      className="p-1.5 rounded-md text-[#64748B] hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  <div className="bg-[#F8FAFF] border border-[#E0E7FF] rounded-lg p-3">
                    <p className="text-[11px] text-[#64748B] mb-1">From {selected.name}</p>
                    <p className="text-[13px] text-[#0F172A] whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                  </div>

                  {selected.replies.map((r) => (
                    <div key={r.id} className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3 ml-6">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] text-[#1877F2] font-semibold">You replied</p>
                        <p className="text-[10px] text-[#64748B]">{fmtDate(r.createdAt)}</p>
                      </div>
                      {r.subject && <p className="text-[12px] font-semibold text-[#0F172A] mb-1">{r.subject}</p>}
                      <p className="text-[13px] text-[#0F172A] whitespace-pre-wrap leading-relaxed">{r.body}</p>
                      {r.error ? (
                        <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1"><AlertCircle size={11} /> Delivery failed: {r.error}</p>
                      ) : r.deliveredAt ? (
                        <p className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1"><Check size={11} /> Delivered</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* Reply composer */}
                <div className="border-t border-[#EFF4FF] p-4 space-y-2 bg-[#F8FAFF]">
                  <input
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    placeholder={`Subject (default: Re: your message to ${"this site"})`}
                    className="w-full bg-white border border-[#E0E7FF] rounded-lg px-3 py-2 text-[12px] text-[#0F172A] outline-none focus:border-[#1877F2]"
                  />
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={4}
                    placeholder={`Type your reply to ${selected.name}…`}
                    className="w-full bg-white border border-[#E0E7FF] rounded-lg px-3 py-2 text-[13px] text-[#0F172A] outline-none focus:border-[#1877F2] resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-[#64748B]">
                      Sent from <strong>{businessEmail || "your account email"}</strong>. Customer replies will land in your inbox.
                    </p>
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyBody.trim()}
                      className="px-4 py-2 rounded-lg bg-[#1877F2] text-white text-[13px] font-semibold hover:bg-[#166FE5] disabled:opacity-60 inline-flex items-center gap-2"
                    >
                      <Send size={13} /> {sending ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
