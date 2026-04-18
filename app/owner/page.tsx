import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Owner Dashboard — Storebuilder.ph", robots: "noindex,nofollow" };
export const dynamic = "force-dynamic";

const BLUE = "#1877F2";

export default async function OwnerPage() {
  const [totalUsers, proUsers, totalWebsites, activeSubs, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: "PRO" } }),
      prisma.website.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          createdAt: true,
          _count: { select: { websites: true } },
        },
      }),
    ]);

  const freeUsers = totalUsers - proUsers;
  const estimatedRevenue = proUsers * 499;

  const stats = [
    { label: "Total Users",       value: totalUsers.toLocaleString(),          bg: "#EBF3FF", accent: BLUE },
    { label: "Pro Subscribers",   value: proUsers.toLocaleString(),             bg: "#FFFBEB", accent: "#B45309" },
    { label: "Total Websites",    value: totalWebsites.toLocaleString(),        bg: "#ECFDF5", accent: "#059669" },
    { label: "Est. Revenue / mo", value: `₱${estimatedRevenue.toLocaleString()}`, bg: "#F5F3FF", accent: "#7C3AED" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: BLUE, padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "15px" }}>Storebuilder.ph</span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>/ Owner Dashboard</span>
          </div>
          <nav style={{ display: "flex", gap: "4px" }}>
            {[
              { href: "/owner",              label: "Overview" },
              { href: "/owner/users",        label: "Users" },
              { href: "/owner/subscriptions",label: "Subscriptions" },
              { href: "/owner/websites",     label: "Websites" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                padding: "6px 14px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
                color: href === "/owner" ? "#fff" : "rgba(255,255,255,0.75)",
                background: href === "/owner" ? "rgba(255,255,255,0.2)" : "transparent",
                textDecoration: "none",
              }}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "36px 40px" }}>

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>Overview</h1>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {stats.map(({ label, value, bg, accent }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB",
              padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
                {label}
              </p>
              <p style={{ fontSize: "30px", fontWeight: 700, color: accent, margin: 0, lineHeight: 1 }}>{value}</p>
              <div style={{ width: "32px", height: "3px", background: bg, borderRadius: "2px", marginTop: "10px" }} />
            </div>
          ))}
        </div>

        {/* Secondary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Free Users",         value: freeUsers.toLocaleString() },
            { label: "Active Subscriptions", value: activeSubs.toLocaleString() },
            { label: "Conversion Rate",    value: `${totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : 0}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB",
              padding: "18px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: "13px", color: "#6B7280" }}>{label}</span>
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", margin: 0 }}>Recent Users</h2>
            <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Latest {recentUsers.length} signups</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Name", "Email", "Plan", "Websites", "Joined"].map((h) => (
                  <th key={h} style={{ padding: "10px 24px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < recentUsers.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                  <td style={{ padding: "12px 24px", fontSize: "13px", fontWeight: 500, color: "#111827" }}>
                    {u.name || "—"}
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#6B7280" }}>{u.email}</td>
                  <td style={{ padding: "12px 24px" }}>
                    {u.plan === "PRO"
                      ? <span style={{ padding: "2px 10px", borderRadius: "20px", background: "#FFFBEB", color: "#92400E", fontSize: "11px", fontWeight: 700 }}>★ Pro</span>
                      : <span style={{ padding: "2px 10px", borderRadius: "20px", background: "#F3F4F6", color: "#6B7280", fontSize: "11px" }}>Free</span>
                    }
                  </td>
                  <td style={{ padding: "12px 24px", fontSize: "13px", color: "#374151" }}>{u._count.websites}</td>
                  <td style={{ padding: "12px 24px", fontSize: "12px", color: "#9CA3AF" }}>
                    {new Date(u.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "#9CA3AF", fontSize: "13px" }}>No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
