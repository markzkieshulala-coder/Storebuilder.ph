"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Crown, CreditCard, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";
const FONT = "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif";

const CARD: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #E4E6EB",
  padding: "22px 24px",
  marginBottom: 16,
};

const LABEL: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#65676B",
  marginBottom: 6,
};

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "#F0F2F5",
  border: "1px solid #E4E6EB",
  borderRadius: 10,
  padding: "10px 14px",
  fontSize: 13,
  color: "#1C1E21",
  outline: "none",
  fontFamily: FONT,
  boxSizing: "border-box",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 20px",
  background: BLUE,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
};

const BTN_DANGER: React.CSSProperties = {
  padding: "10px 20px",
  background: "#fff",
  color: "#DC2626",
  border: "1px solid #FCA5A5",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONT,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#1C1E21",
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

type Sub = {
  id: string;
  status: string;
  plan: string;
  billingCycle: string;
  amount: number;
  createdAt: string;
};

export default function SettingsPage() {
  const { data: session, update } = useSession();

  // Profile state
  const [name, setName] = useState(session?.user?.name || "");
  const [savingName, setSavingName] = useState(false);

  // Email state
  const [email, setEmail] = useState(session?.user?.email || "");
  const [savingEmail, setSavingEmail] = useState(false);

  // Billing state
  const [sub, setSub] = useState<Sub | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const isPro = session?.user?.plan === "PRO";

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  useEffect(() => {
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => {
        if (d.plan === "PRO") {
          fetch("/api/user/subscription")
            .then((r) => r.json())
            .then((s) => { if (s.subscription) setSub(s.subscription); })
            .catch(() => {})
            .finally(() => setLoadingSub(false));
        } else {
          setLoadingSub(false);
        }
      })
      .catch(() => setLoadingSub(false));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) { await update({ name }); toast.success("Name updated"); }
      else toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email address"); return; }
    setSavingEmail(true);
    try {
      const res = await fetch("/api/user/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        await update({ email: data.email });
        toast.success("Email updated — you may need to sign in again");
      } else {
        toast.error(data.error || "Failed to update email");
      }
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm("Cancel your Pro subscription? You'll be downgraded to the Free plan immediately.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Subscription cancelled. You're now on the Free plan.");
        await update({ plan: "FREE" });
        setSub(null);
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0F2F5", fontFamily: FONT }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>

        {/* Back */}
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#65676B", fontSize: 13, textDecoration: "none", marginBottom: 24 }}>
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1E21", marginBottom: 24, fontFamily: FONT }}>Account Settings</h1>

        {/* Plan card */}
        <div style={{ ...CARD, background: isPro ? "#FFFBEB" : "#fff", border: isPro ? "1px solid #FDE68A" : "1px solid #E4E6EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Crown size={20} color={isPro ? "#B45309" : "#8A8D91"} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1E21", margin: 0 }}>{isPro ? "Pro Plan" : "Free Plan"}</p>
                <p style={{ fontSize: 12, color: "#65676B", margin: "2px 0 0" }}>
                  {isPro ? "Unlimited editing · Custom domain · Priority support" : "Free subdomain · Drag-and-drop builder"}
                </p>
              </div>
            </div>
            {!isPro && (
              <Link href="/upgrade" style={{ padding: "8px 16px", background: BLUE, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* Profile — Name */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>
            <User size={15} color={BLUE} />
            Profile
          </div>
          <form onSubmit={handleSaveName} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={INPUT}
                onFocus={(e) => { e.target.style.border = `1px solid ${BLUE}`; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.border = "1px solid #E4E6EB"; e.target.style.background = "#F0F2F5"; }}
              />
            </div>
            <div>
              <button type="submit" disabled={savingName} style={{ ...BTN_PRIMARY, opacity: savingName ? 0.6 : 1 }}>
                {savingName ? "Saving…" : "Save name"}
              </button>
            </div>
          </form>
        </div>

        {/* Email */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>
            <Mail size={15} color={BLUE} />
            Email Address
          </div>
          <form onSubmit={handleSaveEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={LABEL}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={INPUT}
                onFocus={(e) => { e.target.style.border = `1px solid ${BLUE}`; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.border = "1px solid #E4E6EB"; e.target.style.background = "#F0F2F5"; }}
              />
              <p style={{ fontSize: 11, color: "#8A8D91", marginTop: 6 }}>
                Changing your email will require you to sign in again.
              </p>
            </div>
            <div>
              <button type="submit" disabled={savingEmail} style={{ ...BTN_PRIMARY, opacity: savingEmail ? 0.6 : 1 }}>
                {savingEmail ? "Saving…" : "Update email"}
              </button>
            </div>
          </form>
        </div>

        {/* Billing */}
        <div style={CARD}>
          <div style={SECTION_TITLE}>
            <CreditCard size={15} color={BLUE} />
            Billing &amp; Subscription
          </div>

          {!isPro ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Crown size={32} color="#E4E6EB" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1E21", marginBottom: 6 }}>You're on the Free plan</p>
              <p style={{ fontSize: 13, color: "#65676B", marginBottom: 18 }}>Upgrade to Pro to access billing management, custom domains, and more.</p>
              <Link href="/upgrade" style={{ display: "inline-block", padding: "10px 24px", background: BLUE, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                Upgrade to Pro
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Subscription info */}
              {!loadingSub && sub && (
                <div style={{ background: "#F0F2F5", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 0" }}>
                    <span style={{ fontSize: 12, color: "#65676B" }}>Plan</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1C1E21" }}>{sub.plan} — {sub.billingCycle}</span>
                    <span style={{ fontSize: 12, color: "#65676B" }}>Amount</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1C1E21" }}>₱{(sub.amount / 100).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: "#65676B" }}>Started</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1C1E21" }}>{new Date(sub.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</span>
                    <span style={{ fontSize: 12, color: "#65676B" }}>Status</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>{sub.status}</span>
                  </div>
                </div>
              )}

              {/* Update payment method */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1E21", marginBottom: 4 }}>Update payment method</p>
                <p style={{ fontSize: 12, color: "#65676B", marginBottom: 12 }}>
                  Start a new subscription to update your payment method. Your existing plan will remain active.
                </p>
                <Link href="/upgrade" style={{ display: "inline-block", padding: "9px 18px", background: "#fff", color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  Update payment method
                </Link>
              </div>

              {/* Cancel */}
              <div style={{ borderTop: "1px solid #E4E6EB", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", margin: 0 }}>Cancel subscription</p>
                    <p style={{ fontSize: 12, color: "#65676B", marginTop: 3 }}>
                      You'll be downgraded to the Free plan immediately. This cannot be undone.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  style={{ ...BTN_DANGER, opacity: cancelling ? 0.6 : 1 }}>
                  {cancelling ? "Cancelling…" : "Cancel subscription"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
