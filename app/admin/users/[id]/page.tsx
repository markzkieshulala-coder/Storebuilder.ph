"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const BLUE = "#1877F2";
const FONT = '"Google Sans", Roboto, Arial, system-ui, sans-serif';
const FONTS_URL = "https://fonts.cdnfonts.com/css/product-sans";

type Sub = { id: string; status: string; plan: string; billingCycle: string; amount: number; currency: string; paymongoId: string | null; createdAt: string };
type Site = { id: string; name: string; type: string; published: boolean; subdomain: string | null; customDomain: string | null; createdAt: string };
type User = { id: string; name: string | null; email: string | null; plan: string; role: string; image: string | null; createdAt: string; planExpiresAt: string | null; location: string | null; isInfluencer: boolean; _count: { websites: number }; subscriptions: Sub[]; websites: Site[] };

const PLAN_BENEFITS: Record<string, { label: string; color: string; bg: string }[]> = {
  FREE: [
    { label: "5 Websites / month",  color: "#6B7280", bg: "#F3F4F6" },
    { label: "All Editor Features", color: "#6B7280", bg: "#F3F4F6" },
    { label: "Subdomain Only",      color: "#6B7280", bg: "#F3F4F6" },
  ],
  PRO: [
    { label: "10 Websites / month", color: BLUE,      bg: "#EBF3FF" },
    { label: "Payment Links",       color: BLUE,      bg: "#EBF3FF" },
    { label: "Template Sharing",    color: "#059669", bg: "#ECFDF5" },
    { label: "Custom Domain",       color: "#059669", bg: "#ECFDF5" },
    { label: "Remove Branding",     color: "#7C3AED", bg: "#F5F3FF" },
  ],
  ENTERPRISE: [
    { label: "20 Websites / month", color: "#7C3AED", bg: "#F5F3FF" },
    { label: "CRM Generation",      color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Payment Links",       color: BLUE,      bg: "#EBF3FF" },
    { label: "Template Sharing",    color: "#059669", bg: "#ECFDF5" },
    { label: "Custom Domain",       color: "#059669", bg: "#ECFDF5" },
    { label: "Priority Queue",      color: "#B45309", bg: "#FEF3C7" },
  ],
};

function getNextBilling(sub: Sub): string {
  if (sub.status !== "ACTIVE") return "N/A";
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

function toInputDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const CARD: React.CSSProperties = { background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "22px 26px" };
const LABEL: React.CSSProperties = { fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "16px" };
const ROW: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" };
const KEY: React.CSSProperties = { fontSize: "13px", color: "#6B7280", flexShrink: 0, marginRight: "12px" };
const VAL: React.CSSProperties = { fontSize: "13px", color: "#111827", fontWeight: 500, textAlign: "right" };

function EditableField({
  label, value, type = "text", options, onSave,
}: {
  label: string;
  value: string;
  type?: "text" | "date" | "select";
  options?: { value: string; label: string }[];
  onSave: (v: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (draft === value) { setEditing(false); return; }
    setSaving(true); setErr(null);
    const error = await onSave(draft);
    setSaving(false);
    if (error) { setErr(error); }
    else { setEditing(false); }
  }

  if (editing) {
    return (
      <div style={{ ...ROW, flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
        <span style={KEY}>{label}</span>
        <div style={{ width: "100%", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {type === "select" && options ? (
            <select value={draft} onChange={(e) => setDraft(e.target.value)}
              style={{ flex: 1, padding: "7px 10px", fontSize: "13px", border: `1px solid ${BLUE}`, borderRadius: "7px", outline: "none", fontFamily: FONT, background: "#fff" }}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={type} value={draft} onChange={(e) => setDraft(e.target.value)}
              style={{ flex: 1, minWidth: "140px", padding: "7px 10px", fontSize: "13px", border: `1px solid ${BLUE}`, borderRadius: "7px", outline: "none", fontFamily: FONT }} />
          )}
          <button onClick={save} disabled={saving}
            style={{ padding: "7px 14px", background: BLUE, color: "#fff", border: "none", borderRadius: "7px", cursor: saving ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, fontFamily: FONT }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setDraft(value); setErr(null); }}
            style={{ padding: "7px 12px", background: "#F3F4F6", color: "#6B7280", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>
            Cancel
          </button>
        </div>
        {err && <span style={{ fontSize: "12px", color: "#DC2626" }}>{err}</span>}
      </div>
    );
  }

  return (
    <div style={ROW}>
      <span style={KEY}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={VAL}>{value || "—"}</span>
        <button onClick={() => { setDraft(value); setEditing(true); }}
          style={{ padding: "3px 10px", background: "#F0F7FF", color: BLUE, border: `1px solid #BFDBFE`, borderRadius: "5px", cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: FONT }}>
          Edit
        </button>
      </div>
    </div>
  );
}

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

  async function patch(fields: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Failed to save";
      setUser((prev) => prev ? { ...prev, ...data.user } : null);
      return null;
    } catch (e: any) {
      return e.message || "Network error";
    }
  }

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
          ...prev, plan: "FREE",
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
  const hasPaidBefore = user.subscriptions.some((s) => s.status === "ACTIVE" || s.status === "CANCELLED");
  const isActive = !!activeSub;
  const isPaid = user.plan === "PRO" || user.plan === "ENTERPRISE" || isActive;
  // Influencer accounts get Enterprise tier benefits, displayed as "Influencer"
  const memberStatus = user.isInfluencer
    ? "Influencer"
    : isActive
      ? "Active"
      : isPaid
        ? "Active"
        : hasPaidBefore
          ? "Former"
          : "Free Tier";
  const currentPlan = user.plan;
  // Influencers always see Enterprise benefits regardless of stored plan value
  const benefits = user.isInfluencer
    ? PLAN_BENEFITS.ENTERPRISE
    : PLAN_BENEFITS[currentPlan] ?? PLAN_BENEFITS.FREE;
  const initials = (user.name ?? user.email ?? "?").slice(0, 2).toUpperCase();

  // Billing info — N/A for free tier with no payment history
  const naBilling = !isActive && !hasPaidBefore;
  const monthlyAmount = isActive
    ? `₱${(activeSub!.amount / 100).toLocaleString()} / ${activeSub!.billingCycle === "MONTHLY" ? "month" : "year"}`
    : naBilling ? "N/A" : "—";
  const paymentMethod = isActive
    ? (activeSub!.paymongoId ? "PayMongo (Card / E-Wallet)" : "Manual")
    : naBilling ? "N/A" : "—";

  // Billing date: use planExpiresAt if set by admin, else calculate from subscription
  const billingDate = user.planExpiresAt
    ? fmt(user.planExpiresAt)
    : isActive ? getNextBilling(activeSub!) : naBilling ? "N/A" : "—";

  return (
    <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link href={FONTS_URL} rel="stylesheet" />
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: FONT }}>
      {/* Top bar */}
      <div style={{ background: BLUE, padding: "0 28px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Storebuilder.ph Owner Panel</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ fontSize: "13px", opacity: 0.85 }}>User Detail</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => window.history.back()} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>← Back</button>
          <button onClick={() => window.close()} style={{ padding: "6px 16px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>Close Tab</button>
        </div>
      </div>

      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Profile header */}
        <div style={{ ...CARD, marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: isPaid ? BLUE : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 700, color: isPaid ? "#fff" : "#6B7280", flexShrink: 0, overflow: "hidden" }}>
            {user.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "21px", fontWeight: 700, margin: 0, color: "#111827" }}>{user.name || "Unnamed User"}</h1>
              <span style={{ padding: "3px 11px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: user.isInfluencer ? "#F5F3FF" : isPaid ? "#D1FAE5" : hasPaidBefore ? "#FEF3C7" : "#F3F4F6", color: user.isInfluencer ? "#7C3AED" : isPaid ? "#065F46" : hasPaidBefore ? "#92400E" : "#6B7280" }}>{memberStatus.toUpperCase()}</span>
              {user.role === "ADMIN" && <span style={{ padding: "3px 11px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: "#EDE9FE", color: "#5B21B6" }}>ADMIN</span>}
            </div>
            <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>{user.email}</div>
            {user.location && <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>{user.location}</div>}
          </div>
          <button onClick={handleRefund} disabled={refunding || !activeSub}
            style={{ padding: "10px 22px", background: activeSub ? "#DC2626" : "#F3F4F6", color: activeSub ? "#fff" : "#9CA3AF", border: "none", borderRadius: "8px", cursor: activeSub && !refunding ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 600, fontFamily: FONT }}>
            {refunding ? "Processing…" : activeSub ? "Process Refund" : "No Active Sub"}
          </button>
        </div>

        {/* 3 info cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "20px" }}>

          {/* Core Info */}
          <div style={CARD}>
            <div style={LABEL}>Core Info</div>
            <EditableField label="Email Address" value={user.email ?? ""} type="text"
              onSave={async (v) => patch({ email: v })} />
            <div style={ROW}>
              <span style={KEY}>Joined Date</span>
              <span style={VAL}>{fmt(user.createdAt)}</span>
            </div>
            <EditableField label="Location" value={user.location ?? ""} type="text"
              onSave={async (v) => patch({ location: v })} />
          </div>

          {/* Membership */}
          <div style={CARD}>
            <div style={LABEL}>Membership</div>
            <div style={ROW}>
              <span style={KEY}>Status</span>
              <span style={{ padding: "3px 11px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: isActive ? "#D1FAE5" : hasPaidBefore ? "#FEE2E2" : "#F3F4F6", color: isActive ? "#065F46" : hasPaidBefore ? "#991B1B" : "#6B7280" }}>
                {isActive ? "ACTIVE" : hasPaidBefore ? "FORMER" : "FREE TIER"}
              </span>
            </div>
            <EditableField label="Plan Type" value={currentPlan} type="select"
              options={[
                { value: "FREE", label: "FREE" },
                { value: "PRO", label: "PRO" },
                { value: "ENTERPRISE", label: "ENTERPRISE" },
              ]}
              onSave={async (v) => patch({ plan: v })} />
            <div style={ROW}>
              <span style={KEY}>Influencer</span>
              <button
                onClick={async () => {
                  const next = !user.isInfluencer;
                  const err = await patch({ isInfluencer: next });
                  if (!err) setUser((prev) => prev ? { ...prev, isInfluencer: next, plan: next ? "ENTERPRISE" : prev.plan } : null);
                }}
                style={{
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: FONT,
                  background: user.isInfluencer ? "#F5F3FF" : "#F3F4F6",
                  color: user.isInfluencer ? "#7C3AED" : "#6B7280",
                }}
                title={user.isInfluencer ? "Click to remove Influencer status" : "Click to mark as Influencer (sets plan to Enterprise)"}
              >
                {user.isInfluencer ? "★ INFLUENCER (ON)" : "MARK AS INFLUENCER"}
              </button>
            </div>
            <div style={{ ...ROW, borderBottom: "none", flexDirection: "column", alignItems: "flex-start", gap: "8px", paddingTop: "10px" }}>
              <span style={KEY}>Plan Benefits</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {benefits.map((b) => <span key={b.label} style={{ padding: "3px 9px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, background: b.bg, color: b.color }}>{b.label}</span>)}
              </div>
            </div>
          </div>

          {/* Billing */}
          <div style={CARD}>
            <div style={LABEL}>Billing</div>
            <div style={ROW}>
              <span style={KEY}>Monthly Payment</span>
              <span style={{ ...VAL, fontFamily: naBilling ? FONT : "monospace", color: naBilling ? "#9CA3AF" : "#111827" }}>{monthlyAmount}</span>
            </div>
            <EditableField
              label="Billing Date"
              value={user.planExpiresAt ? toInputDate(user.planExpiresAt) : ""}
              type="date"
              onSave={async (v) => patch({ billingDate: v || null })}
            />
            <div style={{ ...ROW, borderBottom: "none" }}>
              <span style={KEY}>Payment Method</span>
              {!naBilling && isActive
                ? <span style={{ padding: "3px 10px", background: "#F0F9FF", color: "#0369A1", borderRadius: "5px", fontSize: "11px", fontWeight: 600 }}>{paymentMethod}</span>
                : <span style={{ ...VAL, color: naBilling ? "#9CA3AF" : "#6B7280" }}>{paymentMethod}</span>}
            </div>
          </div>

        </div>

        {/* Subscription history */}
        {user.subscriptions.length > 0 && (
          <div style={{ ...CARD, padding: 0, overflow: "hidden", marginBottom: "20px" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Subscription History</span>
              <span style={{ fontSize: "12px", color: "#9CA3AF", marginLeft: "8px" }}>{user.subscriptions.length} record{user.subscriptions.length !== 1 ? "s" : ""}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F9FAFB" }}>
                  {["Plan", "Billing Cycle", "Amount", "Payment Method", "Status", "Next Renewal", "Start Date"].map((h) => (
                    <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {user.subscriptions.map((s) => {
                  const ss = s.status === "ACTIVE" ? { bg: "#D1FAE5", c: "#065F46" } : s.status === "CANCELLED" ? { bg: "#FEE2E2", c: "#991B1B" } : { bg: "#F3F4F6", c: "#6B7280" };
                  return (
                    <tr key={s.id}>
                      <td style={{ padding: "12px 18px", fontSize: "13px", borderBottom: "1px solid #F3F4F6" }}><span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: s.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: s.plan === "PRO" ? BLUE : "#6B7280" }}>{s.plan}</span></td>
                      <td style={{ padding: "12px 18px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #F3F4F6" }}>{s.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}</td>
                      <td style={{ padding: "12px 18px", fontSize: "13px", fontWeight: 600, fontFamily: "monospace", borderBottom: "1px solid #F3F4F6" }}>₱{(s.amount / 100).toLocaleString()}</td>
                      <td style={{ padding: "12px 18px", fontSize: "13px", borderBottom: "1px solid #F3F4F6" }}><span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{s.paymongoId ? "PayMongo" : "Manual"}</span></td>
                      <td style={{ padding: "12px 18px", borderBottom: "1px solid #F3F4F6" }}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ss.bg, color: ss.c }}>{s.status}</span></td>
                      <td style={{ padding: "12px 18px", fontSize: "12px", color: "#6B7280", borderBottom: "1px solid #F3F4F6" }}>{getNextBilling(s)}</td>
                      <td style={{ padding: "12px 18px", fontSize: "12px", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>{fmt(s.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {user.websites.map((site) => {
                  const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.storebuilder.ph` : null);
                  return (
                    <tr key={site.id}>
                      <td style={{ padding: "13px 20px", fontWeight: 600, fontSize: "13px", color: "#111827", borderBottom: "1px solid #F3F4F6" }}>{site.name}</td>
                      <td style={{ padding: "13px 20px", borderBottom: "1px solid #F3F4F6" }}><span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#EDE9FE", color: "#5B21B6" }}>{site.type}</span></td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", borderBottom: "1px solid #F3F4F6" }}>{site.published ? <span style={{ color: "#059669", fontWeight: 600 }}>● Live</span> : <span style={{ color: "#9CA3AF" }}>● Draft</span>}</td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", color: "#6B7280", fontFamily: "monospace", borderBottom: "1px solid #F3F4F6" }}>{domain || "—"}</td>
                      <td style={{ padding: "13px 20px", fontSize: "12px", color: "#9CA3AF", borderBottom: "1px solid #F3F4F6" }}>{fmt(site.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No websites created yet</div>
          )}
        </div>

      </div>
    </div>
    </>
  );
}
