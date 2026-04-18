"use client";

import { useEffect, useState } from "react";

const BLUE = "#1877F2";

type Stats = {
  totalUsers: number;
  proUsers: number;
  totalWebsites: number;
  monthlyRevenue: number;
  activeSubs: number;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string;
  createdAt: string;
  _count: { websites: number };
};

const MENU = ["Overview", "Users", "Subscriptions", "Websites"] as const;
type Tab = (typeof MENU)[number];

export default function OwnerPage() {
  const [active, setActive] = useState<Tab>("Overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/owner/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setStats(d.stats);
          setUsers(d.users);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#F4F6F9",
      }}
    >
      <aside
        style={{
          width: "240px",
          background: BLUE,
          color: "#fff",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "0 8px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.18)",
            marginBottom: "20px",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>
              Storebuilder.ph
            </div>
            <div
              style={{
                fontSize: "10px",
                opacity: 0.75,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: "2px",
              }}
            >
              Owner Panel
            </div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {MENU.map((item) => (
            <button
              key={item}
              onClick={() => setActive(item)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: active === item ? 600 : 500,
                background:
                  active === item ? "rgba(255,255,255,0.22)" : "transparent",
                color: active === item ? "#fff" : "rgba(255,255,255,0.85)",
                transition: "background 0.15s",
              }}
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: "32px 40px", overflowX: "auto" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px", color: "#111827" }}>
          {active}
        </h1>
        <p style={{ color: "#6B7280", margin: "0 0 28px", fontSize: "13px" }}>
          {active === "Overview"
            ? "Monitor your Storebuilder.ph platform at a glance."
            : `Manage ${active.toLowerCase()} on your platform.`}
        </p>

        {loading && (
          <div style={{ padding: "60px", background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", textAlign: "center", color: "#6B7280" }}>
            Loading...
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: "14px 18px", background: "#FEF2F2", color: "#991B1B", borderRadius: "10px", marginBottom: "20px", fontSize: "13px", border: "1px solid #FECACA" }}>
            Error loading data: {error}
          </div>
        )}

        {!loading && active === "Overview" && stats && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {[
                { label: "Total Users", value: stats.totalUsers.toLocaleString() },
                { label: "Pro Subscribers", value: stats.proUsers.toLocaleString() },
                { label: "Total Websites", value: stats.totalWebsites.toLocaleString() },
                { label: "Monthly Revenue", value: "\u20B1" + stats.monthlyRevenue.toLocaleString() },
              ].map((s) => (
                <div key={s.label} style={{ background: "#fff", padding: "22px", borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: "11px", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px", fontWeight: 600 }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: BLUE, lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <div style={{ width: "36px", height: "3px", background: BLUE, borderRadius: "2px", marginTop: "12px", opacity: 0.3 }} />
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#111827" }}>Users</h2>
                <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Showing latest {users.length}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Name", "Email", "Plan", "Location", "Joined", "Websites"].map((h) => (
                        <th key={h} style={{ padding: "12px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                        <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{u.name || "\u2014"}</td>
                        <td style={{ padding: "14px 24px", fontSize: "13px", color: "#6B7280" }}>{u.email || "\u2014"}</td>
                        <td style={{ padding: "14px 24px" }}>
                          {u.plan === "PRO" ? (
                            <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#EBF3FF", color: BLUE, fontSize: "11px", fontWeight: 700 }}>Pro</span>
                          ) : (
                            <span style={{ padding: "3px 10px", borderRadius: "20px", background: "#F3F4F6", color: "#6B7280", fontSize: "11px", fontWeight: 500 }}>Free</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 24px", fontSize: "13px", color: "#6B7280" }}>Philippines</td>
                        <td style={{ padding: "14px 24px", fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>
                          {new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td style={{ padding: "14px 24px", fontSize: "13px", fontWeight: 600, color: "#111827" }}>{u._count.websites}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No users yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!loading && active !== "Overview" && (
          <div style={{ background: "#fff", padding: "60px", borderRadius: "12px", border: "1px solid #E5E7EB", textAlign: "center", color: "#6B7280" }}>
            <p style={{ margin: 0, fontSize: "14px" }}>{active} management coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
