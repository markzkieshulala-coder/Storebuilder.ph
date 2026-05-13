"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, X, Mail, ShoppingBag, MessageSquare, Inbox } from "lucide-react";

type Notification = {
  id: string;
  websiteId: string | null;
  websiteName: string | null;
  websiteType: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

// Dashboard notification bell. Polls /api/notifications every 60 seconds while
// the page is in the foreground, shows an unread-count badge, and renders a
// dropdown of the 50 most recent events. Each item deep-links to the relevant
// management page (an order, a marketing inbox, etc.).
export default function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(Number(data.unread || 0));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    // Poll only while the tab is visible.
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (timer) return;
      timer = setInterval(load, 60_000);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function onVis() {
      if (document.visibilityState === "visible") { load(); start(); }
      else stop();
    }
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markOne(id: string, read: boolean) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read } : n)));
    setUnread((u) => Math.max(0, u + (read ? -1 : 1)));
  }

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={`relative ${compact ? "p-1.5" : "p-2"} rounded-lg hover:bg-gray-100 text-gray-600 transition-colors`}
      >
        <Bell size={compact ? 16 : 18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums leading-none ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#1C1E21]">Notifications</p>
              <p className="text-[11px] text-gray-500">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-semibold text-[#1877F2] hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Inbox size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="text-[12px] text-gray-500">No notifications yet</p>
                <p className="text-[11px] text-gray-400 mt-1">Customer activity on your Enterprise sites appears here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onMark={(read) => markOne(n.id, read)}
                    onDismiss={() => dismiss(n.id)}
                    onOpen={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  n, onMark, onDismiss, onOpen,
}: {
  n: Notification;
  onMark: (read: boolean) => void;
  onDismiss: () => void;
  onOpen: () => void;
}) {
  const router = useRouter();
  const Icon = iconFor(n.type);

  function handleClick(e: React.MouseEvent) {
    // Don't navigate when the X/check buttons are clicked
    if ((e.target as HTMLElement).closest("[data-stop]")) return;
    if (!n.read) onMark(true);
    if (n.href) {
      onOpen();
      router.push(n.href);
    }
  }

  return (
    <li
      onClick={handleClick}
      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? "" : "bg-blue-50/40"}`}
    >
      <div className="flex gap-3">
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${n.read ? "bg-gray-100" : "bg-[#1877F2]/10"}`}>
          <Icon size={14} className={n.read ? "text-gray-400" : "text-[#1877F2]"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[12.5px] leading-snug ${n.read ? "text-gray-700" : "text-[#1C1E21] font-semibold"}`}>
            {n.title}
          </p>
          {n.body && (
            <p className="text-[11.5px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400">{relativeTime(n.createdAt)}</span>
            {n.websiteName && (
              <span className="text-[10px] text-gray-400 truncate">· {n.websiteName}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {!n.read && (
            <button
              data-stop
              onClick={(e) => { e.stopPropagation(); onMark(true); }}
              aria-label="Mark read"
              className="p-1 rounded text-gray-400 hover:text-[#1877F2] hover:bg-blue-50"
            >
              <Check size={11} />
            </button>
          )}
          <button
            data-stop
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            aria-label="Dismiss"
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
          >
            <X size={11} />
          </button>
        </div>
      </div>
    </li>
  );
}

function iconFor(type: string) {
  if (type.startsWith("order.")) return ShoppingBag;
  if (type === "contact.submitted") return MessageSquare;
  if (type === "newsletter.subscribed") return Mail;
  return Bell;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
