"use client";
import { useEffect, useState } from "react";

const BLUE = "#1877F2";
const FONT = '"Google Sans", Roboto, "DM Sans", system-ui, -apple-system, sans-serif';
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap";
const MENU = ["Overview", "Total Users", "Subscriptions", "Websites"] as const;
type Tab = (typeof MENU)[number];

type Stats = { totalUsers: number; proUsers: number; totalWebsites: number; monthlyRevenue: number; activeSubs: number };
type UserRow = { id: string; name: string | null; email: string | null; plan: string; createdAt: string; _count: { websites: number } };
type SubRow = { id: string; status: string; plan: string; billingCycle: string; amount: number; currency: string; paymongoId: string | null; createdAt: string; user: { id: string; name: string | null; email: string | null } };
type SiteRow = { id: string; name: string; type: string; published: boolean; subdomain: string | null; customDomain: string | null; createdAt: string; user: { id: string; name: string | null; email: string | null } };

const TH: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "13px 20px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #F3F4F6" };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#D1FAE5", color: "#065F46" },
  CANCELLED: { bg: "#FEE2E2", color: "#991B1B" },
  PENDING:   { bg: "#FEF3C7", color: "#92400E" },
  EXPIRED:   { bg: "#F3F4F6", color: "#6B7280" },
};

function getNextBilling(sub: SubRow): string {
  if (sub.status !== "ACTIVE") return "\u2014";
  const now = new Date();
  const d = new Date(sub.createdAt);
  if (sub.billingCycle === "MONTHLY") {
    while (d <= now) d.setMonth(d.getMonth() + 1);
  } else {
    while (d <= now) d.setFullYear(d.getFullYear() + 1);
  }
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function OwnerPage() {
  const [active, setActive] = useState<Tab>("Overview");
  const [userView, setUserView] = useState<"all" | "active" | "paid" | "former">("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [websites, setWebsites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/owner/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else { setStats(d.stats); setUsers(d.users); setSubscriptions(d.subscriptions); setWebsites(d.websites); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRefund(subId: string) {
    if (!confirm("Process refund and cancel this subscription? The user will be downgraded to Free.")) return;
    setRefundingId(subId);
    try {
      const res = await fetch("/api/owner/refund", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubscriptions((prev) => prev.map((s) => s.id === subId ? { ...s, status: "CANCELLED" } : s));
        alert("Refund processed. Subscription cancelled and user downgraded to Free.");
      } else { alert("Error: " + (data.error || "Unknown error")); }
    } finally { setRefundingId(null); }
  }

  const userSubMap = new Map<string, SubRow>();
  subscriptions.forEach((s) => {
    const ex = userSubMap.get(s.user.id);
    if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) userSubMap.set(s.user.id, s);
  });

  const q = headerSearch.toLowerCase().trim();
  const match = (name: string | null, email: string | null) =>
    !q || name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q);

  // Suggestions for header search (by email)
  const emailSuggestions = q
    ? users.filter((u) => u.email?.toLowerCase().includes(q)).slice(0, 6)
    : [];

  // Set of userIds who have ever paid (ACTIVE or CANCELLED — not just PENDING)
  const paidUserIds = new Set(
    subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "CANCELLED").map((s) => s.user.id)
  );

  const userStatus = (u: UserRow): "Active" | "Former" | "Free" => {
    const latest = userSubMap.get(u.id);
    if (u.plan === "PRO" && latest?.status === "ACTIVE") return "Active";
    if (paidUserIds.has(u.id) && u.plan === "FREE") return "Former";
    return "Free";
  };

  const totalUsersFiltered = users.filter((u) => {
    if (!match(u.name, u.email)) return false;
    if (userView === "all") return true;
    if (userView === "active") return userStatus(u) === "Active";
    if (userView === "paid")   return paidUserIds.has(u.id);
    if (userView === "former") return userStatus(u) === "Former";
    return true;
  });

  const filteredSubs  = subscriptions.filter((s) => match(s.user.name, s.user.email));
  const filteredSites = websites.filter((s) => match(s.user.name, s.user.email) || s.name.toLowerCase().includes(q));

  return (
    <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link href={FONTS_URL} rel="stylesheet" />
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT, background: "#F4F6F9" }}>

      {/* Sidebar */}
      <aside style={{ width: "240px", background: BLUE, color: "#fff", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Storebuilder.ph</div>
              <div style={{ fontSize: "10px", opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>Owner Panel</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {MENU.map((item) => (
            <button key={item} onClick={() => { setActive(item); setUserView("all"); }}
              style={{ padding: "10px 14px", borderRadius: "8px", border: "none", textAlign: "left", cursor: "pointer", fontSize: "14px", fontWeight: active === item ? 600 : 500, background: active === item ? "rgba(255,255,255,0.2)" : "transparent", color: active === item ? "#fff" : "rgba(255,255,255,0.82)", transition: "background 0.15s", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {item}
              {item === "Total Users" && stats && stats.totalUsers > 0 && (
                <span style={{ padding: "1px 7px", borderRadius: "12px", fontSize: "10px", background: "rgba(255,255,255,0.25)", fontWeight: 700 }}>{stats.totalUsers}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: "11px", opacity: 0.55 }}>No authentication required</div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* ─── Top Header with Search ─── */}
        <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 32px", height: "62px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#111827" }}>{active}</h1>
          </div>

          {/* Search Component */}
          <div style={{ position: "relative", width: "380px", maxWidth: "40%" }}>
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search users by email address…"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                style={{ width: "100%", padding: "9px 14px 9px 40px", fontSize: "13px", border: "1px solid #E5E7EB", borderRadius: "10px", outline: "none", background: "#F9FAFB", fontFamily: FONT, transition: "border-color 0.15s, background 0.15s" }}
                onFocus={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = BLUE; }}
                onBlur={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
              />
              {headerSearch && (
                <button onClick={() => setHeaderSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px", padding: "4px 8px", lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Email suggestions dropdown */}
            {emailSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 20 }}>
                <div style={{ padding: "8px 14px", fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F3F4F6", background: "#F9FAFB" }}>
                  {emailSuggestions.length} Match{emailSuggestions.length !== 1 ? "es" : ""} — Click to open profile
                </div>
                {emailSuggestions.map((u) => (
                  <a key={u.id} href={`/admin/users/${u.id}`} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", textDecoration: "none", color: "#111827", borderBottom: "1px solid #F3F4F6", transition: "background 0.1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: BLUE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{u.name || "Unnamed"}</div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280", marginLeft: "8px", flexShrink: 0 }}>{u.plan}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: "28px 32px" }}>
          {loading && <div style={{ padding: "60px", background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", textAlign: "center", color: "#6B7280" }}>Loading…</div>}
          {error && !loading && <div style={{ padding: "14px 18px", background: "#FEF2F2", color: "#991B1B", borderRadius: "10px", marginBottom: "20px", fontSize: "13px", border: "1px solid #FECACA" }}>Error: {error}</div>}

          {/* OVERVIEW */}
          {!loading && active === "Overview" && stats && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "16px" }}>
                {[
                  { label: "Total Users",     value: stats.totalUsers.toLocaleString(),                color: BLUE },
                  { label: "Pro Members",     value: stats.proUsers.toLocaleString(),                  color: "#B45309" },
                  { label: "Total Websites",  value: stats.totalWebsites.toLocaleString(),             color: "#059669" },
                  { label: "Monthly Revenue", value: "\u20B1" + stats.monthlyRevenue.toLocaleString(), color: "#7C3AED" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
                    <p style={{ fontSize: "11px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px", fontWeight: 600 }}>{s.label}</p>
                    <p style={{ fontSize: "26px", fontWeight: 700, margin: 0, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
                {[
                  { label: "Free Users",           value: (stats.totalUsers - stats.proUsers).toLocaleString() },
                  { label: "Active Subscriptions", value: stats.activeSubs.toLocaleString() },
                  { label: "Conversion Rate",      value: stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1) + "%" : "0%" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "#fff", padding: "16px 20px", borderRadius: "12px", border: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "#6B7280" }}>{s.label}</span>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TOTAL USERS */}
          {!loading && active === "Total Users" && (
            <>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {([
                  { key: "all",    label: `All Users (${users.length})` },
                  { key: "active", label: `Active Members (${users.filter(u => userStatus(u) === "Active").length})` },
                  { key: "paid",   label: `Paid Members (${users.filter(u => paidUserIds.has(u.id)).length})` },
                  { key: "former", label: `Former Members (${users.filter(u => userStatus(u) === "Former").length})` },
                ] as const).map((v) => (
                  <button key={v.key} onClick={() => setUserView(v.key)}
                    style={{ padding: "7px 18px", borderRadius: "8px", border: `1px solid ${userView === v.key ? BLUE : "#D1D5DB"}`, fontSize: "13px", fontWeight: 600, cursor: "pointer", background: userView === v.key ? BLUE : "#fff", color: userView === v.key ? "#fff" : "#6B7280", fontFamily: FONT }}>
                    {v.label}
                  </button>
                ))}
              </div>

              <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{totalUsersFiltered.length} user{totalUsersFiltered.length !== 1 ? "s" : ""}</span>
                  {q && <span style={{ fontSize: "12px", color: "#9CA3AF", marginLeft: "8px" }}>matching "{headerSearch}"</span>}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Email Address", "Name", "Status", "Plan", "Monthly Payment", "Billing Date", "Payment Method", "Joined"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {totalUsersFiltered.map((u) => {
                        const status = userStatus(u);
                        const sub = userSubMap.get(u.id);
                        const hasPaid = paidUserIds.has(u.id);
                        const naLabel = !hasPaid;
                        const amount = sub && sub.status === "ACTIVE" ? `\u20B1${(sub.amount / 100).toLocaleString()}${sub.billingCycle === "MONTHLY" ? "/mo" : "/yr"}` : naLabel ? "N/A" : "\u2014";
                        const billing = sub && sub.status === "ACTIVE" ? getNextBilling(sub) : naLabel ? "N/A" : "\u2014";
                        const method = sub && sub.status === "ACTIVE" ? (sub.paymongoId ? "PayMongo" : "Manual") : naLabel ? "N/A" : "\u2014";
                        const statusColor = status === "Active" ? { bg: "#D1FAE5", color: "#065F46" } : status === "Former" ? { bg: "#FEE2E2", color: "#991B1B" } : { bg: "#F3F4F6", color: "#6B7280" };
                        return (
                          <tr key={u.id}>
                            <td style={TD}>
                              <a href={`/admin/users/${u.id}`} target="_blank" rel="noreferrer"
                                style={{ color: BLUE, textDecoration: "none", fontWeight: 500, fontSize: "13px" }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}>
                                {u.email || "\u2014"}
                              </a>
                            </td>
                            <td style={TD}>{u.name || "\u2014"}</td>
                            <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: statusColor.bg, color: statusColor.color }}>{status}</span></td>
                            <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280" }}>{u.plan}</span></td>
                            <td style={{ ...TD, fontWeight: naLabel ? 400 : 600, fontFamily: naLabel ? FONT : "monospace", color: naLabel ? "#9CA3AF" : "#111827" }}>{amount}</td>
                            <td style={{ ...TD, fontSize: "12px", color: naLabel ? "#9CA3AF" : "#6B7280", whiteSpace: "nowrap" }}>{billing}</td>
                            <td style={TD}>{sub && sub.status === "ACTIVE" ? <span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{method}</span> : <span style={{ fontSize: "13px", color: naLabel ? "#9CA3AF" : "#D1D5DB" }}>{method}</span>}</td>
                            <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                          </tr>
                        );
                      })}
                      {totalUsersFiltered.length === 0 && <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No users found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* SUBSCRIPTIONS */}
          {!loading && active === "Subscriptions" && (
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}><span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{filteredSubs.length} subscription{filteredSubs.length !== 1 ? "s" : ""}</span></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Email", "Plan", "Amount Paid", "Payment Method", "Billing", "Next Billing", "Status", "Action"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredSubs.map((s) => {
                      const amount = s.amount / 100;
                      const method = s.paymongoId ? "PayMongo" : "Manual";
                      const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.EXPIRED;
                      return (
                        <tr key={s.id}>
                          <td style={TD}>
                            <a href={`/admin/users/${s.user.id}`} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: "none", fontWeight: 500 }}>{s.user.email || "\u2014"}</a>
                            <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{s.user.name || "\u2014"}</div>
                          </td>
                          <td style={TD}><span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: s.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: s.plan === "PRO" ? BLUE : "#6B7280" }}>{s.plan}</span></td>
                          <td style={{ ...TD, fontWeight: 600, fontFamily: "monospace" }}>{"\u20B1"}{amount.toLocaleString()}</td>
                          <td style={TD}><span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{method}</span></td>
                          <td style={TD}>{s.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}</td>
                          <td style={{ ...TD, fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>{getNextBilling(s)}</td>
                          <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ss.bg, color: ss.color }}>{s.status}</span></td>
                          <td style={TD}>
                            {s.status === "ACTIVE"
                              ? <button onClick={() => handleRefund(s.id)} disabled={refundingId === s.id} style={{ padding: "5px 12px", background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>{refundingId === s.id ? "\u2026" : "Refund"}</button>
                              : <span style={{ fontSize: "12px", color: "#D1D5DB" }}>\u2014</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSubs.length === 0 && <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No subscriptions found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WEBSITES */}
          {!loading && active === "Websites" && (
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}><span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{filteredSites.length} website{filteredSites.length !== 1 ? "s" : ""}</span></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Website", "Owner Email", "Type", "Status", "Domain", "Created"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {filteredSites.map((site) => {
                      const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.storebuilder.ph` : null);
                      return (
                        <tr key={site.id}>
                          <td style={{ ...TD, fontWeight: 600, color: "#111827" }}>{site.name}</td>
                          <td style={TD}>
                            <a href={`/admin/users/${site.user.id}`} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: "none", fontWeight: 500 }}>{site.user.email || "\u2014"}</a>
                            <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{site.user.name || "\u2014"}</div>
                          </td>
                          <td style={TD}><span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "#EDE9FE", color: "#5B21B6" }}>{site.type}</span></td>
                          <td style={TD}>{site.published
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 600, color: "#059669" }}><span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10B981", display: "inline-block" }} />Live</span>
                            : <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#9CA3AF" }}><span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#D1D5DB", display: "inline-block" }} />Draft</span>}
                          </td>
                          <td style={{ ...TD, fontSize: "12px", color: "#6B7280", fontFamily: "monospace" }}>{domain || "\u2014"}</td>
                          <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{new Date(site.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                        </tr>
                      );
                    })}
                    {filteredSites.length === 0 && <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No websites found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
    </>
  );
}
