"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const BLUE = "#1877F2";
const FONT = '"Google Sans", "Google Sans Display", system-ui, -apple-system, Roboto, "Segoe UI", sans-serif';

type Sub = { id: string; status: string; plan: string; billingCycle: string; amount: number; currency: string; paymongoId: string | null; createdAt: string };
type Site = { id: string; name: string; type: string; published: boolean; subdomain: string | null; customDomain: string | null; createdAt: string };
type User = { id: string; name: string | null; email: string | null; plan: string; role: string; image: string | null; createdAt: string; planExpiresAt: string | null; _count: { websites: number }; subscriptions: Sub[]; websites: Site[] };

const PLAN_BENEFITS: Record<string, { label: string; color: string; bg: string }[]> = {
  FREE: [
    { label: "1 Website",        color: "#6B7280", bg: "#F3F4F6" },
    { label: "Basic Templates",  color: "#6B7280", bg: "#F3F4F6" },
    { label: "Subdomain Only",   color: "#6B7280", bg: "#F3F4F6" },
  ],
  PRO: [
    { label: "5 Websites",       color: BLUE,      bg: "#EBF3FF" },
    { label: "All Templates",    color: BLUE,      bg: "#EBF3FF" },
    { label: "Custom Domain",    color: "#059669", bg: "#ECFDF5" },
    { label: "AI Builder",       color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Priority Support", color: "#B45309", bg: "#FEF3C7" },
  ],
};

function getNextBilling(sub: Sub): string {
  if (sub.status !== "ACTIVE") return "—";
  const now = new Date();
  const d = new Date(sub.createdAt);
  if (sub.billingCycle === "MONTHLY") {
    while (d <= now) d.setMonth(d.getMonth() + 1);
  } else {
    while (d <= now) d.setFullYear(d.getFullYear() + 1);
  }
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

const CARD: React.CSSProperties = { background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "22px 26px" };
const LABEL: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" };
const ROW: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #F3F4F6" };
const KEY: React.CSSProperties = { fontSize: "13px", color: "#6B7280" };
const VAL: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: 500 };

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setUser(d.user); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRefund() {
    const activeSub = user?.subscriptions.find((s) => s.status === "ACTIVE");
    if (!activeSub) { alert("No active subscription to refund."); return; }
    if (!confirm("Process refund and cancel this subscription? The user will be downgraded to Free.")) return;

    setRefunding(true);
    try {
      const res = await fetch("/api/owner/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: activeSub.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Refund processed. Subscription cancelled and user downgraded to Free.");
        setUser((prev) => prev ? {
          ...prev,
          plan: "FREE",
          subscriptions: prev.subscriptions.map((s) => s.id === activeSub.id ? { ...s, status: "CANCELLED" } : s),
        } : null);
      } else {
        alert("Error: " + (data.error || "Unknown error"));
      }
    } finally { setRefunding(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ color: "#6B7280", fontSize: "14px" }}>Loading user…</div>
    </div>
  );

  if (error || !user) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div style={{ background: "#fff", padding: "32px 40px", borderRadius: "14px", border: "1px solid #E5E7EB", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "#991B1B", marginBottom: "16px" }}>{error || "User not found"}</div>
        <button onClick={() => window.close()} style={{ padding: "8px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>Close Tab</button>
      </div>
    </div>
  );

  const activeSub = user.subscriptions.find((s) => s.status === "ACTIVE");
  const isActiveMember = !!activeSub;
  const membershipStatus = isActiveMember ? "Active" : user.subscriptions.length > 0 ? "Former" : "Free Tier";
  const currentPlan = activeSub?.plan ?? user.plan;
  const benefits = PLAN_BENEFITS[currentPlan] ?? PLAN_BENEFITS.FREE;
  const initials = (user.name ?? user.email ?? "?").slice(0, 2).toUpperCase();

  const monthlyAmount = activeSub
    ? `₱${(activeSub.amount / 100).toLocaleString()}${activeSub.billingCycle === "MONTHLY" ? " / month" : " / year"}`
    : "—";
  const paymentMethod = activeSub ? (activeSub.paymongoId ? "PayMongo (Card / E-Wallet)" : "Manual") : "—";
  const billingDate = activeSub ? getNextBilling(activeSub) : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{ background: BLUE, padding: "0 28px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Storebuilder.ph Owner Panel</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span style={{ fontSize: "13px", opacity: 0.9 }}>User Detail</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => window.history.back()} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>← Back</button>
          <button onClick={() => window.close()} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>Close Tab</button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Profile Header Card */}
        <div style={{ ...CARD, marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: isActiveMember ? BLUE : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 700, color: isActiveMember ? "#fff" : "#6B7280", flexShrink: 0, overflow: "hidden" }}>
            {user.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#111827" }}>{user.name || "Unnamed User"}</h1>
              <span style={{ padding: "3px 11px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: isActiveMember ? "#D1FAE5" : "#F3F4F6", color: isActiveMember ? "#065F46" : "#6B7280" }}>{membershipStatus.toUpperCase()}</span>
              {user.role === "ADMIN" && <span style={{ padding: "3px 11px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: "#FEF3C7", color: "#92400E" }}>ADMIN</span>}
            </div>
            <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>{user.email}</div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {activeSub ? (
              <button onClick={handleRefund} disabled={refunding}
                style={{ padding: "10px 22px", background: refunding ? "#FCA5A5" : "#DC2626", color: "#fff", border: "none", borderRadius: "8px", cursor: refunding ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, fontFamily: FONT, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                {refunding ? "Processing…" : "Process Refund"}
              </button>
            ) : (
              <button disabled
                style={{ padding: "10px 22px", background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "not-allowed", fontSize: "13px", fontWeight: 600, fontFamily: FONT }}>
                No Active Subscription
              </button>
            )}
          </div>
        </div>

        {/* 3-card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>

          {/* Core Info */}
          <div style={CARD}>
            <div style={LABEL}>Core Info</div>
            <div style={ROW}><span style={KEY}>Email Address</span><span style={{ ...VAL, fontSize: "12px", fontFamily: "monospace" }}>{user.email || "—"}</span></div>
            <div style={ROW}><span style={KEY}>Joined Date</span><span style={VAL}>{fmt(user.createdAt)}</span></div>
            <div style={{ ...ROW, borderBottom: "none" }}><span style={KEY}>Location</span><span style={{ ...VAL, color: "#9CA3AF", fontStyle: "italic" }}>Not provided</span></div>
          </div>

          {/* Membership */}
          <div style={CARD}>
            <div style={LABEL}>Membership</div>
            <div style={ROW}>
              <span style={KEY}>Status</span>
              <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: isActiveMember ? "#D1FAE5" : "#FEE2E2", color: isActiveMember ? "#065F46" : "#991B1B" }}>{isActiveMember ? "ACTIVE" : "FORMER"}</span>
            </div>
            <div style={ROW}>
              <span style={KEY}>Plan Type</span>
              <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: currentPlan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: currentPlan === "PRO" ? BLUE : "#6B7280" }}>{currentPlan}</span>
            </div>
            <div style={{ ...ROW, borderBottom: "none", alignItems: "flex-start", flexDirection: "column", gap: "8px" }}>
              <span style={KEY}>Plan Benefits</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {benefits.map((b) => <span key={b.label} style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, background: b.bg, color: b.color }}>{b.label}</span>)}
              </div>
            </div>
          </div>

          {/* Billing */}
          <div style={CARD}>
            <div style={LABEL}>Billing</div>
            <div style={ROW}><span style={KEY}>Monthly Total Payment</span><span style={{ ...VAL, fontFamily: "monospace", fontWeight: 700 }}>{monthlyAmount}</span></div>
            <div style={ROW}><span style={KEY}>Billing Date</span><span style={VAL}>{billingDate}</span></div>
            <div style={{ ...ROW, borderBottom: "none" }}>
              <span style={KEY}>Payment Method</span>
              {activeSub ? <span style={{ padding: "3px 10px", background: "#F0F9FF", color: "#0369A1", borderRadius: "5px", fontSize: "11px", fontWeight: 600 }}>{paymentMethod}</span> : <span style={{ ...VAL, color: "#9CA3AF" }}>—</span>}
            </div>
          </div>

        </div>

        {/* Websites */}
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Websites</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>{user.websites.length} total</span>
          </div>
          {user.websites.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Name", "Type", "Status", "Domain", "Created"].map((h) => (
                    <th key={h} style={{ padding: "11px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {user.websites.map((site) => {
                  const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.storebuilder.ph` : null);
                  return (
                    <tr key={site.id}>
                      <td style={{ padding: "13px 20px", fontSize: "13px", color: "#111827", fontWeight: 600, borderBottom: "1px solid #F3F4F6" }}>{site.name}</td>
                      <td style={{ padding: "13px 20px", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#EDE9FE", color: "#5B21B6" }}>{site.type}</span>
                      </td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", borderBottom: "1px solid #F3F4F6" }}>
                        {site.published
                          ? <span style={{ color: "#059669", fontWeight: 600 }}>● Live</span>
                          : <span style={{ color: "#9CA3AF" }}>● Draft</span>}
                      </td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", color: "#6B7280", fontFamily: "monospace", borderBottom: "1px solid #F3F4F6" }}>{domain || "—"}</td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>{fmt(site.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No websites</div>
          )}
        </div>

      </div>
    </div>
  );
}
