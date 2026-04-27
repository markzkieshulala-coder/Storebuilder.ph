"use client";
import { useEffect, useState, useMemo } from "react";

const BLUE = "#1877F2";
const FONT = '"Google Sans", Roboto, Arial, system-ui, sans-serif';
const FONTS_URL = "https://fonts.cdnfonts.com/css/product-sans";
const MENU = ["Overview", "Total Users", "Influencers"] as const;
type Tab = (typeof MENU)[number];

type Stats = { totalUsers: number; proUsers: number; totalWebsites: number; monthlyRevenue: number; activeSubs: number };
type UserRow = { id: string; name: string | null; email: string | null; plan: string; createdAt: string; isInfluencer: boolean; _count: { websites: number } };
type SubRow = { id: string; status: string; plan: string; billingCycle: string; amount: number; currency: string; paymongoId: string | null; createdAt: string; user: { id: string; name: string | null; email: string | null } };

const TH: React.CSSProperties = { padding: "11px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", whiteSpace: "nowrap" };
const TD: React.CSSProperties = { padding: "13px 20px", fontSize: "13px", color: "#374151", borderBottom: "1px solid #F3F4F6" };

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

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(+y, +m - 1).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

export default function OwnerPage() {
  const [active, setActive]           = useState<Tab>("Overview");
  const [userView, setUserView]       = useState<"all" | "active" | "paid" | "former" | "influencer">("all");
  const [stats, setStats]             = useState<Stats | null>(null);
  const [users, setUsers]             = useState<UserRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [headerSearch, setHeaderSearch] = useState("");

  // Influencer form state
  const [infEmail, setInfEmail]       = useState("");
  const [infPlan, setInfPlan]         = useState<"FREE" | "PRO">("FREE");
  const [infLoading, setInfLoading]   = useState(false);
  const [infMsg, setInfMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  // Overview filter state
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisYear  = String(now.getFullYear());
  const [selMonth, setSelMonth] = useState(thisMonth);
  const [selYear,  setSelYear]  = useState(thisYear);

  useEffect(() => {
    fetch("/api/owner/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else { setStats(d.stats); setUsers(d.users); setSubscriptions(d.subscriptions); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Analytics computations ──────────────────────────────────────────
  const paidSubs = useMemo(
    () => subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "CANCELLED"),
    [subscriptions]
  );

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    paidSubs.forEach((s) => set.add(s.createdAt.slice(0, 7)));
    users.forEach((u) => set.add(u.createdAt.slice(0, 7)));
    const arr = Array.from(set).sort().reverse();
    if (!arr.includes(thisMonth)) arr.unshift(thisMonth);
    return arr;
  }, [paidSubs, users, thisMonth]);

  const yearOptions = useMemo(() => {
    const set = new Set<string>();
    paidSubs.forEach((s) => set.add(s.createdAt.slice(0, 4)));
    users.forEach((u) => set.add(u.createdAt.slice(0, 4)));
    const arr = Array.from(set).sort().reverse();
    if (!arr.includes(thisYear)) arr.unshift(thisYear);
    return arr;
  }, [paidSubs, users, thisYear]);

  const monthlyStats = useMemo(() => {
    const revenue = paidSubs
      .filter((s) => s.createdAt.slice(0, 7) === selMonth)
      .reduce((acc, s) => acc + s.amount / 100, 0);
    const newSignups = users.filter((u) => u.createdAt.slice(0, 7) === selMonth).length;
    const newPaid    = paidSubs.filter((s) => s.createdAt.slice(0, 7) === selMonth).length;
    return { revenue, newSignups, newPaid };
  }, [paidSubs, users, selMonth]);

  const yearlyStats = useMemo(() => {
    const revenue = paidSubs
      .filter((s) => s.createdAt.slice(0, 4) === selYear)
      .reduce((acc, s) => acc + s.amount / 100, 0);
    const newSignups = users.filter((u) => u.createdAt.slice(0, 4) === selYear).length;
    const newPaid    = paidSubs.filter((s) => s.createdAt.slice(0, 4) === selYear).length;
    return { revenue, newSignups, newPaid };
  }, [paidSubs, users, selYear]);

  const totalRevenue = useMemo(
    () => paidSubs.reduce((acc, s) => acc + s.amount / 100, 0),
    [paidSubs]
  );

  // ── User table helpers ──────────────────────────────────────────────
  const userSubMap = useMemo(() => {
    const map = new Map<string, SubRow>();
    subscriptions.forEach((s) => {
      const ex = map.get(s.user.id);
      if (!ex || new Date(s.createdAt) > new Date(ex.createdAt)) map.set(s.user.id, s);
    });
    return map;
  }, [subscriptions]);

  const paidUserIds = useMemo(
    () => new Set(paidSubs.map((s) => s.user.id)),
    [paidSubs]
  );

  const influencers = useMemo(() => users.filter((u) => u.isInfluencer), [users]);

  const userStatus = (u: UserRow): "Enterprise" | "Active" | "Former" | "Free" => {
    if (u.isInfluencer) return "Enterprise";
    const latest = userSubMap.get(u.id);
    if (u.plan === "PRO" && latest?.status === "ACTIVE") return "Active";
    if (paidUserIds.has(u.id) && u.plan === "FREE") return "Former";
    return "Free";
  };

  async function addInfluencer() {
    if (!infEmail.trim()) return;
    setInfLoading(true); setInfMsg(null);
    try {
      const res = await fetch("/api/owner/influencer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: infEmail.trim(), plan: infPlan }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfMsg({ text: `${data.user.email} is now an Influencer (Enterprise · ${infPlan})`, ok: true });
        setInfEmail("");
        setUsers((prev) => prev.map((u) =>
          u.email?.toLowerCase() === infEmail.trim().toLowerCase()
            ? { ...u, isInfluencer: true, plan: infPlan }
            : u
        ));
      } else {
        setInfMsg({ text: data.error || "Unknown error", ok: false });
      }
    } catch (e: any) {
      setInfMsg({ text: e.message, ok: false });
    } finally { setInfLoading(false); }
  }

  async function removeInfluencer(userId: string) {
    try {
      const res = await fetch("/api/owner/influencer", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isInfluencer: false } : u));
      }
    } catch {}
  }

  const q = headerSearch.toLowerCase().trim();
  const match = (name: string | null, email: string | null) =>
    !q || name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q);

  const emailSuggestions = q ? users.filter((u) => u.email?.toLowerCase().includes(q)).slice(0, 6) : [];

  const totalUsersFiltered = users.filter((u) => {
    if (!match(u.name, u.email)) return false;
    if (userView === "all")        return true;
    if (userView === "active")     return userStatus(u) === "Active";
    if (userView === "paid")       return paidUserIds.has(u.id);
    if (userView === "former")     return userStatus(u) === "Former";
    if (userView === "influencer") return u.isInfluencer;
    return true;
  });

  const SELECT: React.CSSProperties = {
    padding: "7px 12px", fontSize: "13px", fontFamily: FONT, fontWeight: 500,
    border: "1px solid #E5E7EB", borderRadius: "8px", background: "#fff",
    color: "#374151", cursor: "pointer", outline: "none",
  };

  const BIG_NUM: React.CSSProperties = {
    fontSize: "22px", fontWeight: 700, lineHeight: 1, margin: "12px 0 4px", color: "#111827",
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href={FONTS_URL} rel="stylesheet" />
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: FONT, background: "#F4F6F9" }}>

        {/* ── Sidebar ── */}
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
                {item === "Total Users" && stats && (
                  <span style={{ padding: "1px 7px", borderRadius: "12px", fontSize: "10px", background: "rgba(255,255,255,0.25)", fontWeight: 700 }}>{stats.totalUsers}</span>
                )}
                {item === "Influencers" && (
                  <span style={{ padding: "1px 7px", borderRadius: "12px", fontSize: "10px", background: "rgba(196,181,253,0.4)", fontWeight: 700 }}>{influencers.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: "11px", opacity: 0.55 }}>No authentication required</div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Top Header */}
          <header style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "0 32px", height: "62px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
            <h1 style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#111827", fontFamily: FONT }}>{active}</h1>

            {/* Search */}
            <div style={{ position: "relative", width: "380px", maxWidth: "40%" }}>
              <div style={{ position: "relative" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input type="text" placeholder="Search users by email…" value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  style={{ width: "100%", padding: "9px 14px 9px 40px", fontSize: "13px", border: "1px solid #E5E7EB", borderRadius: "10px", outline: "none", background: "#F9FAFB", fontFamily: FONT }}
                  onFocus={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = BLUE; }}
                  onBlur={(e)  => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
                />
                {headerSearch && (
                  <button onClick={() => setHeaderSearch("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: "18px", padding: "4px 8px", lineHeight: 1 }}>×</button>
                )}
              </div>
              {emailSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #E5E7EB", borderRadius: "10px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 20 }}>
                  <div style={{ padding: "8px 14px", fontSize: "10px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F3F4F6", background: "#F9FAFB" }}>
                    {emailSuggestions.length} result{emailSuggestions.length !== 1 ? "s" : ""} — click to open profile
                  </div>
                  {emailSuggestions.map((u) => (
                    <a key={u.id} href={`/admin/users/${u.id}`} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", textDecoration: "none", color: "#111827", borderBottom: "1px solid #F3F4F6" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
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

            {/* ── OVERVIEW ── */}
            {!loading && active === "Overview" && stats && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Row 1: Monthly + Yearly side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

                  {/* Monthly Card */}
                  <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "24px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>Monthly</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>Visits & Income</div>
                      </div>
                      <select value={selMonth} onChange={(e) => setSelMonth(e.target.value)} style={SELECT}>
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>{fmtMonth(m)}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</div>
                        <div style={BIG_NUM}>₱{monthlyStats.revenue.toLocaleString()}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>from paid subs</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Signups</div>
                        <div style={BIG_NUM}>{monthlyStats.newSignups}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>new accounts</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Paid Subs</div>
                        <div style={BIG_NUM}>{monthlyStats.newPaid}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>transactions</div>
                      </div>
                    </div>

                    {/* Mini bar chart — last 6 months revenue */}
                    <MiniBarChart subscriptions={paidSubs} type="monthly" />
                  </div>

                  {/* Yearly Card */}
                  <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "24px 28px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>Yearly</div>
                        <div style={{ fontSize: "16px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>Visits & Income</div>
                      </div>
                      <select value={selYear} onChange={(e) => setSelYear(e.target.value)} style={SELECT}>
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</div>
                        <div style={BIG_NUM}>₱{yearlyStats.revenue.toLocaleString()}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>for {selYear}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>New Signups</div>
                        <div style={BIG_NUM}>{yearlyStats.newSignups}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>new accounts</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Paid Subs</div>
                        <div style={BIG_NUM}>{yearlyStats.newPaid}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>transactions</div>
                      </div>
                    </div>

                    <MiniBarChart subscriptions={paidSubs} type="yearly" />
                  </div>
                </div>

                {/* Row 2: Total Revenue + quick stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "14px" }}>
                  <div style={{ background: "linear-gradient(135deg, #1877F2 0%, #0D5DBD 100%)", borderRadius: "14px", padding: "22px 24px", color: "#fff" }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.8 }}>Total Revenue</div>
                    <div style={{ fontSize: "30px", fontWeight: 700, lineHeight: 1, margin: "10px 0 4px" }}>₱{totalRevenue.toLocaleString()}</div>
                    <div style={{ fontSize: "11px", opacity: 0.7 }}>all-time cumulative</div>
                  </div>
                  {[
                    { label: "Total Users",    value: stats.totalUsers.toLocaleString(),  sub: "registered accounts" },
                    { label: "Active Members", value: stats.proUsers.toLocaleString(),    sub: "currently subscribed" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "22px 24px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</div>
                      <div style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1, margin: "10px 0 4px", color: "#111827" }}>{c.value}</div>
                      <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{c.sub}</div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ── TOTAL USERS ── */}
            {!loading && active === "Total Users" && (
              <>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                  {([
                    { key: "all",        label: `All Users (${users.length})`,                                              ac: BLUE     },
                    { key: "active",     label: `Active (${users.filter(u => userStatus(u) === "Active").length})`,         ac: BLUE     },
                    { key: "paid",       label: `Paid (${users.filter(u => paidUserIds.has(u.id)).length})`,                ac: BLUE     },
                    { key: "former",     label: `Former (${users.filter(u => userStatus(u) === "Former").length})`,         ac: BLUE     },
                    { key: "influencer", label: `Influencers (${influencers.length})`,                                      ac: "#7C3AED" },
                  ] as const).map((v) => (
                    <button key={v.key} onClick={() => setUserView(v.key)}
                      style={{ padding: "7px 18px", borderRadius: "8px", border: `1px solid ${userView === v.key ? v.ac : "#D1D5DB"}`, fontSize: "13px", fontWeight: 600, cursor: "pointer", background: userView === v.key ? v.ac : "#fff", color: userView === v.key ? "#fff" : "#6B7280", fontFamily: FONT }}>
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
                          const status   = userStatus(u);
                          const sub      = userSubMap.get(u.id);
                          const hasPaid  = paidUserIds.has(u.id);
                          const na       = !hasPaid;
                          const amount   = sub && sub.status === "ACTIVE" ? `\u20B1${(sub.amount / 100).toLocaleString()}${sub.billingCycle === "MONTHLY" ? "/mo" : "/yr"}` : na ? "N/A" : "\u2014";
                          const billing  = sub && sub.status === "ACTIVE" ? getNextBilling(sub) : na ? "N/A" : "\u2014";
                          const method   = sub && sub.status === "ACTIVE" ? (sub.paymongoId ? "PayMongo" : "Manual") : na ? "N/A" : "\u2014";
                          const sc       = status === "Enterprise" ? { bg: "#F5F3FF", color: "#7C3AED" } : status === "Active" ? { bg: "#D1FAE5", color: "#065F46" } : status === "Former" ? { bg: "#FEE2E2", color: "#991B1B" } : { bg: "#F3F4F6", color: "#6B7280" };
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
                              <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: sc.bg, color: sc.color }}>{status}</span></td>
                              <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280" }}>{u.plan}</span></td>
                              <td style={{ ...TD, fontWeight: na ? 400 : 600, fontFamily: na ? FONT : "monospace", color: na ? "#9CA3AF" : "#111827" }}>{amount}</td>
                              <td style={{ ...TD, fontSize: "12px", color: na ? "#9CA3AF" : "#6B7280", whiteSpace: "nowrap" }}>{billing}</td>
                              <td style={TD}>{sub && sub.status === "ACTIVE" ? <span style={{ padding: "2px 8px", background: "#F0F9FF", color: "#0369A1", borderRadius: "4px", fontSize: "11px", fontWeight: 600 }}>{method}</span> : <span style={{ fontSize: "13px", color: na ? "#9CA3AF" : "#D1D5DB" }}>{method}</span>}</td>
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

            {/* ── INFLUENCERS ── */}
            {!loading && active === "Influencers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Add form */}
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #E5E7EB", padding: "24px 28px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>Add Influencer Account</div>
                  <div style={{ fontSize: "13px", color: "#9CA3AF", marginBottom: "18px" }}>Search a user by email and grant them Enterprise status. Their assigned plan is preserved internally, but their display status will always show as Enterprise.</div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: "220px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Email Address</div>
                      <input
                        type="email" value={infEmail} onChange={(e) => setInfEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addInfluencer()}
                        placeholder="user@example.com"
                        style={{ width: "100%", padding: "9px 12px", fontSize: "13px", border: "1px solid #E5E7EB", borderRadius: "8px", outline: "none", fontFamily: FONT, boxSizing: "border-box" }} />
                    </div>
                    <div style={{ minWidth: "130px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "6px" }}>Assign Plan</div>
                      <select value={infPlan} onChange={(e) => setInfPlan(e.target.value as "FREE" | "PRO")} style={SELECT}>
                        <option value="FREE">Free</option>
                        <option value="PRO">Pro</option>
                      </select>
                    </div>
                    <button onClick={addInfluencer} disabled={infLoading || !infEmail.trim()}
                      style={{ padding: "9px 22px", background: "#7C3AED", color: "#fff", border: "none", borderRadius: "8px", cursor: infLoading || !infEmail.trim() ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 600, fontFamily: FONT, opacity: infLoading || !infEmail.trim() ? 0.6 : 1, whiteSpace: "nowrap" }}>
                      {infLoading ? "Adding…" : "Grant Enterprise"}
                    </button>
                  </div>
                  {infMsg && (
                    <div style={{ marginTop: "12px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", background: infMsg.ok ? "#F0FDF4" : "#FEF2F2", color: infMsg.ok ? "#065F46" : "#DC2626", border: `1px solid ${infMsg.ok ? "#BBF7D0" : "#FCA5A5"}` }}>
                      {infMsg.text}
                    </div>
                  )}
                </div>

                {/* Influencer list */}
                <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{influencers.length} influencer account{influencers.length !== 1 ? "s" : ""}</span>
                    <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: "#F5F3FF", color: "#7C3AED" }}>Enterprise</span>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Email Address", "Name", "Status", "Assigned Plan", "Joined", "Actions"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {influencers.map((u) => (
                          <tr key={u.id}>
                            <td style={TD}>
                              <a href={`/admin/users/${u.id}`} target="_blank" rel="noreferrer"
                                style={{ color: BLUE, textDecoration: "none", fontWeight: 500, fontSize: "13px" }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}>
                                {u.email || "—"}
                              </a>
                            </td>
                            <td style={TD}>{u.name || "—"}</td>
                            <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: "#F5F3FF", color: "#7C3AED" }}>Enterprise</span></td>
                            <td style={TD}><span style={{ padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, background: u.plan === "PRO" ? "#EBF3FF" : "#F3F4F6", color: u.plan === "PRO" ? BLUE : "#6B7280" }}>{u.plan}</span></td>
                            <td style={{ ...TD, fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>{new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td style={TD}>
                              <button onClick={() => removeInfluencer(u.id)}
                                style={{ padding: "4px 12px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600, fontFamily: FONT }}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {influencers.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No influencer accounts yet. Add one above.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        </main>
      </div>
    </>
  );
}

// ── Inline mini bar chart (no external deps) ──────────────────────────
function MiniBarChart({ subscriptions, type }: { subscriptions: SubRow[]; type: "monthly" | "yearly" }) {
  const bars = useMemo(() => {
    if (type === "monthly") {
      const result: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-PH", { month: "short" });
        const value = subscriptions.filter((s) => s.createdAt.slice(0, 7) === key).reduce((a, s) => a + s.amount / 100, 0);
        result.push({ label, value });
      }
      return result;
    } else {
      const result: { label: string; value: number }[] = [];
      const currentYear = new Date().getFullYear();
      for (let y = currentYear - 2; y <= currentYear; y++) {
        const key = String(y);
        const value = subscriptions.filter((s) => s.createdAt.slice(0, 4) === key).reduce((a, s) => a + s.amount / 100, 0);
        result.push({ label: key, value });
      }
      return result;
    }
  }, [subscriptions, type]);

  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div style={{ marginTop: "20px", display: "flex", alignItems: "flex-end", gap: "6px", height: "52px" }}>
      {bars.map((b) => (
        <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{ width: "100%", background: b.value > 0 ? "#EBF3FF" : "#F3F4F6", borderRadius: "4px 4px 0 0", height: `${Math.max((b.value / max) * 100, b.value > 0 ? 8 : 4)}%`, transition: "height 0.3s ease", position: "relative" }}>
              {b.value > 0 && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #60A5FA 0%, #1877F2 100%)", borderRadius: "4px 4px 0 0", opacity: 0.8 }} />}
            </div>
          </div>
          <div style={{ fontSize: "9px", color: "#9CA3AF", fontWeight: 500, whiteSpace: "nowrap" }}>{b.label}</div>
        </div>
      ))}
    </div>
  );
}
