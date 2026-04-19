"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const BLUE = "#1877F2";

const TH: React.CSSProperties = { padding: "10px 18px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "12px 18px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #F3F4F6" };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#D1FAE5", color: "#065F46" },
  CANCELLED: { bg: "#FEE2E2", color: "#991B1B" },
  PENDING:   { bg: "#FEF3C7", color: "#92400E" },
  EXPIRED:   { bg: "#F3F4F6", color: "#6B7280" },
};

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

type Sub = { id: string; status: string; plan: string; billingCycle: string; amount: number; currency: string; paymongoId: string | null; createdAt: string };
type Site = { id: string; name: string; type: string; published: boolean; subdomain: string | null; customDomain: string | null; createdAt: string };
type User = { id: string; name: string | null; email: string | null; plan: string; role: string; image: string | null; createdAt: string; _count: { websites: number }; subscriptions: Sub[]; websites: Site[] };

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/owner/user/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setUser(d.user); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ color: "#6B7280", fontSize: "14px" }}>Loading…</div>
    </div>
  );

  if (error || !user) return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#fff", padding: "32px 40px", borderRadius: "12px", border: "1px solid #E5E7EB", textAlign: "center" }}>
        <div style={{ fontSize: "14px", color: "#991B1B", marginBottom: "16px" }}>{error || "User not found"}</div>
        <button onClick={() => window.close()} style={{ padding: "8px 20px", background: BLUE, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>Close Tab</button>
      </div>
    </div>
  );

  const activeSub = user.subscriptions.find((s) => s.status === "ACTIVE");
  const currentPlan = activeSub?.plan ?? user.plan;
  const benefits = PLAN_BENEFITS[currentPlan] ?? PLAN_BENEFITS.FREE;
  const initials = (user.name ?? user.email ?? "?").slice(0, 2).toUpperCase();
  const totalPaid = user.subscriptions.filter(s => s.status === "ACTIVE" || s.status === "CANCELLED").reduce((acc, s) => acc + s.amount / 100, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background: BLUE, padding: "0 36px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>Storebuilder.ph Owner Panel</span>
          <span style={{ opacity: 0.5, fontSize: "13px" }}>/</span>
          <span style={{ fontSize: "13px", opacity: 0.85 }}>User Profile</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => window.history.back()} style={{ padding: "5px 14px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>← Back</button>
          <button onClick={() => window.close()} style={{ padding: "5px 14px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close Tab</button>
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Profile card */}
        <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "28px 32px", marginBottom: "20px", display: "flex", alignItems: "flex-start", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: user.plan === "PRO" ? BLUE : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: 700, color: user.plan === "PRO" ? "#fff" : "#6B7280", flexShrink: 0, overflow: "hidden" }}>
            {user.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "#111827" }}>{user.name || "Unnamed User"}</h1>
              <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: user.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: user.plan === "PRO" ? BLUE : "#6B7280" }}>{user.plan}</span>
              {user.role === "ADMIN" && <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: "#FEF3C7", color: "#92400E" }}>ADMIN</span>}
            </div>
            <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>{user.email}</div>
            <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "4px" }}>Member since {fmt(user.createdAt)}</div>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Websites",      value: user._count.websites,                              color: "#059669" },
              { label: "Subscriptions", value: user.subscriptions.length,                         color: BLUE      },
              { label: "Total Paid",    value: "₱" + totalPaid.toLocaleString(),                  color: "#7C3AED" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px 20px", textAlign: "center", minWidth: "100px" }}>
                <div style={{ fontSize: "20px", fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Current plan + benefits */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "20px 24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Current Subscription</div>
            {activeSub ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Status</span>
                  <span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: "#D1FAE5", color: "#065F46" }}>ACTIVE</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Plan</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{activeSub.plan}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Billing</span>
                  <span style={{ fontSize: "13px", color: "#111827" }}>{activeSub.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Amount</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "monospace", color: "#111827" }}>₱{(activeSub.amount / 100).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Payment Method</span>
                  <span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{activeSub.paymongoId ? "PayMongo" : "Manual"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Next Billing</span>
                  <span style={{ fontSize: "13px", color: "#111827" }}>{getNextBilling(activeSub)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#6B7280" }}>Started</span>
                  <span style={{ fontSize: "13px", color: "#9CA3AF" }}>{fmt(activeSub.createdAt)}</span>
                </div>
              </div>
            ) : (
              <div style={{ color: "#9CA3AF", fontSize: "13px" }}>No active subscription</div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", padding: "20px 24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "14px" }}>Plan Benefits — {currentPlan}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {benefits.map((b) => (
                <span key={b.label} style={{ padding: "5px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, background: b.bg, color: b.color }}>{b.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription history */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden", marginBottom: "20px" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Subscription History</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF", marginLeft: "8px" }}>{user.subscriptions.length} record{user.subscriptions.length !== 1 ? "s" : ""}</span>
          </div>
          {user.subscriptions.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Plan", "Billing", "Amount", "Payment Method", "Status", "Next Billing", "Start Date"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {user.subscriptions.map((s) => {
                  const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.EXPIRED;
                  return (
                    <tr key={s.id}>
                      <td style={TD}><span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: s.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: s.plan === "PRO" ? BLUE : "#6B7280" }}>{s.plan}</span></td>
                      <td style={TD}>{s.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}</td>
                      <td style={{ ...TD, fontWeight: 600, fontFamily: "monospace" }}>₱{(s.amount / 100).toLocaleString()}</td>
                      <td style={TD}><span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{s.paymongoId ? "PayMongo" : "Manual"}</span></td>
                      <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ss.bg, color: ss.color }}>{s.status}</span></td>
                      <td style={{ ...TD, fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>{getNextBilling(s)}</td>
                      <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{fmt(s.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No subscription records</div>
          )}
        </div>

        {/* Websites */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>Websites</span>
            <span style={{ fontSize: "12px", color: "#9CA3AF", marginLeft: "8px" }}>{user.websites.length} site{user.websites.length !== 1 ? "s" : ""}</span>
          </div>
          {user.websites.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Name", "Type", "Status", "Domain", "Created"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {user.websites.map((site) => {
                  const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.storebuilder.ph` : null);
                  return (
                    <tr key={site.id}>
                      <td style={{ ...TD, fontWeight: 600, color: "#111827" }}>{site.name}</td>
                      <td style={TD}><span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#EDE9FE", color: "#5B21B6" }}>{site.type}</span></td>
                      <td style={TD}>
                        {site.published
                          ? <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "#059669" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />Live</span>
                          : <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#9CA3AF" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#D1D5DB", display: "inline-block" }} />Draft</span>}
                      </td>
                      <td style={{ ...TD, fontSize: "12px", color: "#6B7280", fontFamily: "monospace" }}>{domain || "—"}</td>
                      <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{fmt(site.createdAt)}</td>
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
