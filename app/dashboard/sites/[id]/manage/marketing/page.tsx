"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Mail, Download, MessageSquare, Send } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader, fmtDate } from "@/components/manage/ManageShell";

type Subscriber = { id: string; email: string; name: string | null; source: string | null; createdAt: string };
type Contact = { id: string; name: string; email: string; message: string; read: boolean; createdAt: string };

export default function MarketingPage() {
  const { id } = useParams<{ id: string }>();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"subscribers" | "contacts">("subscribers");

  useEffect(() => {
    fetch(`/api/sites/${id}/manage`)
      .then((r) => r.json())
      .then((d) => {
        setSubs(Array.isArray(d.subscribers) ? d.subscribers : []);
        setContacts(Array.isArray(d.contacts) ? d.contacts : []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function exportSubsCsv() {
    if (subs.length === 0) { toast.error("Nothing to export"); return; }
    const header = ["Email","Name","Source","Subscribed"];
    const rows = subs.map((s) => [s.email, s.name || "", s.source || "", fmtDate(s.createdAt)]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subscribers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${subs.length} subscribers`);
  }

  function copyEmails() {
    if (subs.length === 0) return;
    navigator.clipboard.writeText(subs.map((s) => s.email).join(", "));
    toast.success(`Copied ${subs.length} emails`);
  }

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
      <PageHeader
        title="Marketing"
        subtitle="Subscribers, inquiries, and outbound campaigns."
        actions={tab === "subscribers" ? (
          <>
            <button onClick={copyEmails} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-[#1A1A1A] bg-white border border-gray-200 hover:border-gray-300">
              <Mail size={13} /> Copy emails
            </button>
            <button onClick={exportSubsCsv} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-semibold text-[#1A1A1A] bg-white border border-gray-200 hover:border-gray-300">
              <Download size={13} /> Export
            </button>
          </>
        ) : null}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
        <button
          onClick={() => setTab("subscribers")}
          className={`bg-white rounded-xl border p-4 text-left transition-all ${tab === "subscribers" ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A]/10" : "border-gray-200 hover:border-gray-300"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Mail size={14} className="text-gray-500" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Newsletter subscribers</p>
          </div>
          <p className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] tabular-nums">{subs.length.toLocaleString()}</p>
        </button>
        <button
          onClick={() => setTab("contacts")}
          className={`bg-white rounded-xl border p-4 text-left transition-all ${tab === "contacts" ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A]/10" : "border-gray-200 hover:border-gray-300"}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={14} className="text-gray-500" />
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contact form messages</p>
          </div>
          <p className="text-[22px] sm:text-[26px] font-bold text-[#1A1A1A] tabular-nums">
            {contacts.length.toLocaleString()}
            <span className="text-[12px] font-medium text-gray-400 ml-2">({contacts.filter((c) => !c.read).length} unread)</span>
          </p>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[13px] text-gray-400">Loading…</div>
        ) : tab === "subscribers" ? (
          subs.length === 0 ? (
            <Empty Icon={Mail} title="No newsletter subscribers yet" desc="Add a newsletter section to your site so visitors can join your list." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="text-left font-semibold px-5 py-3">Email</th>
                  <th className="text-left font-semibold px-2 py-3 hidden sm:table-cell">Name</th>
                  <th className="text-left font-semibold px-2 py-3 hidden md:table-cell">Source</th>
                  <th className="text-right font-semibold px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-[#1A1A1A]">{s.email}</td>
                    <td className="px-2 py-3 text-gray-700 hidden sm:table-cell">{s.name || "—"}</td>
                    <td className="px-2 py-3 text-gray-500 hidden md:table-cell">{s.source || "—"}</td>
                    <td className="px-5 py-3 text-right text-gray-500 text-[12px] whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          contacts.length === 0 ? (
            <Empty Icon={MessageSquare} title="No contact messages yet" desc="Messages submitted through your contact form will appear here." />
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <div key={c.id} className="p-5 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-[#1A1A1A]">{c.name}</p>
                      <a href={`mailto:${c.email}`} className="text-[12px] text-gray-500 hover:underline">{c.email}</a>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">{c.message}</p>
                  <a
                    href={`mailto:${c.email}?subject=Re:%20your%20message`}
                    className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-[#1A1A1A] hover:underline"
                  >
                    <Send size={11} /> Reply
                  </a>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Empty({ Icon, title, desc }: { Icon: any; title: string; desc: string }) {
  return (
    <div className="p-12 text-center">
      <Icon size={32} className="mx-auto mb-3 text-gray-300" />
      <p className="text-[14px] font-semibold text-[#1A1A1A]">{title}</p>
      <p className="text-[12px] text-gray-500 mt-1">{desc}</p>
    </div>
  );
}
