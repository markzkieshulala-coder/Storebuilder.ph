"use client";
import { useEffect, useState } from "react";

const BLUE = "#1877F2";
const MENU = ["Overview", "Members", "Users", "Subscriptions", "Websites"] as const;
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
  const [memberView, setMemberView] = useState<"active" | "previous">("active");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [websites, setWebsites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  const q = search.toLowerCase().trim();
  const match = (name: string | null, email: string | null) =>
    !q || name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q);

  const activeMembers   = users.filter((u) => u.plan === "PRO" && match(u.name, u.email));
  const previousMembers = users.filter((u) => {
    const s = userSubMap.get(u.id);
    return u.plan === "FREE" && s && (s.status === "CANCELLED" || s.status === "EXPIRED") && match(u.name, u.email);
  });
  const displayedMembers = memberView === "active" ? activeMembers : previousMembers;
  const filteredUsers = users.filter((u) => match(u.name, u.email));
  const filteredSubs  = subscriptions.filter((s) => match(s.user.name, s.user.email));
  const filteredSites = websites.filter((s) => match(s.user.name, s.user.email) || s.name.toLowerCase().includes(q));

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#F4F6F9" }}>

      {/* Sidebar */}
      <aside style={{ width: "230px", background: BLUE, color: "#fff", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
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
            <button key={item} onClick={() => { setActive(item); setSearch(""); setMemberView("active"); }}
              style={{ padding: "10px 14px", borderRadius: "8px", border: "none", textAlign: "left", cursor: "pointer", fontSize: "14px", fontWeight: active === item ? 600 : 500, background: active === item ? "rgba(255,255,255,0.2)" : "transparent", color: active === item ? "#fff" : "rgba(255,255,255,0.82)", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {item}
              {item === "Members" && stats && stats.proUsers > 0 && (
                <span style={{ padding: "1px 7px", borderRadius: "12px", fontSize: "10px", background: "rgba(255,255,255,0.25)", fontWeight: 700 }}>{stats.proUsers}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: "11px", opacity: 0.55 }}>No authentication required</div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "32px 36px", overflowX: "auto" }}>
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: "#111827" }}>{active}</h1>
            <p style={{ fontSize: "13px", color: "#6B7280", margin: "4px 0 0" }}>
              {active === "Overview"     ? "Platform summary" :
               active === "Members"     ? "Active and previous plan members" :
               `All ${active.toLowerCase()} on the platform`}
            </p>
          </div>
          {active !== "Overview" && (
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="Search by email or name\u2026" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ padding: "8px 14px", fontSize: "13px", border: "1px solid #D1D5DB", borderRadius: "8px", outline: "none", width: "260px", background: "#fff" }} />
              {search && <button onClick={() => setSearch("")} style={{ padding: "8px 14px", fontSize: "13px", background: "#fff", border: "1px solid #D1D5DB", borderRadius: "8px", cursor: "pointer", color: "#6B7280" }}>Clear</button>}
            </div>
          )}
        </div>

        {loading && <div style={{ padding: "60px", background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", textAlign: "center", color: "#6B7280" }}>Loading\u2026</div>}
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

        {/* MEMBERS */}
        {!loading && active === "Members" && (
          <>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {(["active", "previous"] as const).map((v) => (
                <button key={v} onClick={() => setMemberView(v)}
                  style={{ padding: "7px 20px", borderRadius: "8px", border: `1px solid ${memberView === v ? BLUE : "#D1D5DB"}`, fontSize: "13px", fontWeight: 600, cursor: "pointer", background: memberView === v ? BLUE : "#fff", color: memberView === v ? "#fff" : "#6B7280" }}>
                  {v === "active" ? `Active Members (${activeMembers.length})` : `Previous Members (${previousMembers.length})`}
                </button>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["Member", "Plan Type", "Plan Benefits", "Payment Method", "Monthly Payment", "Billing Date", "Status"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {displayedMembers.map((u) => {
                      const sub = userSubMap.get(u.id);
                      const method = sub?.paymongoId ? "PayMongo" : sub ? "Manual" : "\u2014";
                      const amount = sub ? "\u20B1" + (sub.amount / 100).toLocaleString() + (sub.billingCycle === "MONTHLY" ? "/mo" : "/yr") : "\u2014";
                      const billing = sub ? getNextBilling(sub) : "\u2014";
                      const ss = memberView === "active" ? STATUS_STYLE.ACTIVE : STATUS_STYLE.CANCELLED;
                      const benefits = PLAN_BENEFITS[u.plan] ?? PLAN_BENEFITS.FREE;
                      return (
                        <tr key={u.id}>
                          <td style={TD}><a href={`/owner/user/${u.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: BLUE, textDecoration: "none" }}>{u.name || "\u2014"}</a><div style={{ fontSize: "11px", color: "#9CA3AF" }}>{u.email}</div></td>
                          <td style={TD}><span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280" }}>{u.plan}</span></td>
                          <td style={{ ...TD, maxWidth: "220px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {benefits.map((b) => <span key={b.label} style={{ padding: "2px 7px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, background: b.bg, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>)}
                            </div>
                          </td>
                          <td style={TD}>{sub ? <span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{method}</span> : <span style={{ color: "#D1D5DB" }}>\u2014</span>}</td>
                          <td style={{ ...TD, fontWeight: 600, fontFamily: "monospace" }}>{amount}</td>
                          <td style={{ ...TD, fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>{billing}</td>
                          <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ss.bg, color: ss.color }}>{memberView === "active" ? "Active" : "Previous"}</span></td>
                        </tr>
                      );
                    })}
                    {displayedMembers.length === 0 && <tr><td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No {memberView === "active" ? "active" : "previous"} members found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* USERS */}
        {!loading && active === "Users" && (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}><span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}</span></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Name", "Email", "Plan", "Websites", "Joined"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={TD}><a href={`/owner/user/${u.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: BLUE, textDecoration: "none" }}>{u.name || "\u2014"}</a></td>
                      <td style={TD}><a href={`/owner/user/${u.id}`} target="_blank" rel="noreferrer" style={{ color: "#374151", textDecoration: "none" }}>{u.email || "\u2014"}</a></td>
                      <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280" }}>{u.plan}</span></td>
                      <td style={{ ...TD, fontWeight: 600 }}>{u._count.websites}</td>
                      <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF" }}>{new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS */}
        {!loading && active === "Subscriptions" && (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6" }}><span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{filteredSubs.length} subscription{filteredSubs.length !== 1 ? "s" : ""}</span></div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["User", "Plan Type", "Plan Benefits", "Amount Paid", "Payment Method", "Billing", "Next Billing Date", "Status", "Action"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredSubs.map((s) => {
                    const amount = s.amount / 100;
                    const method = s.paymongoId ? "PayMongo" : "Manual";
                    const ss = STATUS_STYLE[s.status] ?? STATUS_STYLE.EXPIRED;
                    const benefits = PLAN_BENEFITS[s.plan] ?? PLAN_BENEFITS.FREE;
                    return (
                      <tr key={s.id}>
                        <td style={TD}><a href={`/owner/user/${s.user.id}`} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: BLUE, textDecoration: "none", display: "block" }}>{s.user.name || "\u2014"}</a><div style={{ fontSize: "11px", color: "#9CA3AF" }}>{s.user.email}</div></td>
                        <td style={TD}><span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: s.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: s.plan === "PRO" ? BLUE : "#6B7280" }}>{s.plan}</span></td>
                        <td style={{ ...TD, maxWidth: "200px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {benefits.map((b) => <span key={b.label} style={{ padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, background: b.bg, color: b.color, whiteSpace: "nowrap" }}>{b.label}</span>)}
                          </div>
                        </td>
                        <td style={{ ...TD, fontWeight: 600, fontFamily: "monospace" }}>{"\u20B1"}{amount.toLocaleString()}</td>
                        <td style={TD}><span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{method}</span></td>
                        <td style={TD}>{s.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}</td>
                        <td style={{ ...TD, fontSize: "12px", color: "#6B7280", whiteSpace: "nowrap" }}>{getNextBilling(s)}</td>
                        <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: ss.bg, color: ss.color }}>{s.status}</span></td>
                        <td style={TD}>
                          {s.status === "ACTIVE"
                            ? <button onClick={() => handleRefund(s.id)} disabled={refundingId === s.id} style={{ padding: "5px 12px", background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>{refundingId === s.id ? "\u2026" : "Refund"}</button>
                            : <span style={{ fontSize: "12px", color: "#D1D5DB" }}>\u2014</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubs.length === 0 && <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No subscriptions found</td></tr>}
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
                <thead><tr>{["Website", "Owner", "Type", "Status", "Domain", "Created"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filteredSites.map((site) => {
                    const domain = site.customDomain || (site.subdomain ? `${site.subdomain}.storebuilder.ph` : null);
                    return (
                      <tr key={site.id}>
                        <td style={{ ...TD, fontWeight: 600, color: "#111827" }}>{site.name}</td>
                        <td style={TD}><a href={`/owner/user/${site.user.id}`} target="_blank" rel="noreferrer" style={{ color: BLUE, textDecoration: "none", fontWeight: 500, display: "block" }}>{site.user.name || "\u2014"}</a><div style={{ fontSize: "11px", color: "#9CA3AF" }}>{site.user.email}</div></td>
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

      </main>
    </div>
  );
}
