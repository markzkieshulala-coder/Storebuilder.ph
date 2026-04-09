import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  Globe,
  Crown,
  DollarSign,
  TrendingUp,
  Database,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

const BLUE = "#1877F2";

async function getStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    weekUsers,
    monthUsers,
    totalWebsites,
    weekWebsites,
    proUsers,
    freeUsers,
    activeSubscriptions,
    cancelledCount,
    pendingCount,
    tokenLogs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.website.count(),
    prisma.website.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.user.count({ where: { plan: "FREE" } }),
    prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "CANCELLED" } }),
    prisma.subscription.count({ where: { status: "PENDING" } }),
    prisma.tokenUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        createdAt: true,
        _count: { select: { websites: true } },
      },
    }),
  ]);

  // Revenue: sum of active subscription amounts (monthly equivalent)
  const monthlyRevenueCentavos = activeSubscriptions.reduce((sum, s) => {
    const monthly = s.billingCycle === "YEARLY" ? Math.round(s.amount / 12) : s.amount;
    return sum + monthly;
  }, 0);

  const totalCostPhp = tokenLogs.reduce((sum, l) => sum + l.costPhp, 0);
  const todayCostPhp = tokenLogs
    .filter((l) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return l.createdAt >= d;
    })
    .reduce((sum, l) => sum + l.costPhp, 0);

  return {
    totalUsers,
    weekUsers,
    monthUsers,
    totalWebsites,
    weekWebsites,
    proUsers,
    freeUsers,
    monthlyRevenue: monthlyRevenueCentavos / 100,
    cancelledCount,
    pendingCount,
    totalCostPhp,
    todayCostPhp,
    recentUsers,
    activeSubsCount: activeSubscriptions.length,
  };
}

export default async function AdminPage() {
  const s = await getStats();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome to the Storebuilder.ph admin panel
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={s.totalUsers.toLocaleString()}
          sub={`+${s.weekUsers} this week`}
          accent={BLUE}
          accentBg="#EBF3FF"
        />
        <StatCard
          icon={Crown}
          label="Pro Subscribers"
          value={s.proUsers.toLocaleString()}
          sub={`${((s.proUsers / Math.max(s.totalUsers, 1)) * 100).toFixed(1)}% of users`}
          accent="#F59E0B"
          accentBg="#FFFBEB"
        />
        <StatCard
          icon={Globe}
          label="Websites Generated"
          value={s.totalWebsites.toLocaleString()}
          sub={`+${s.weekWebsites} this week`}
          accent="#10B981"
          accentBg="#ECFDF5"
        />
        <StatCard
          icon={DollarSign}
          label="Est. Monthly Revenue"
          value={`₱${s.monthlyRevenue.toLocaleString()}`}
          sub={`${s.activeSubsCount} active subscriptions`}
          accent="#8B5CF6"
          accentBg="#F5F3FF"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            href: "/admin/users",
            title: "Manage Users",
            count: s.totalUsers,
            label: "Total registered",
            color: BLUE,
            bg: "#EBF3FF",
          },
          {
            href: "/admin/subscriptions",
            title: "Subscriptions",
            count: s.activeSubsCount,
            label: `${s.pendingCount} pending, ${s.cancelledCount} cancelled`,
            color: "#10B981",
            bg: "#ECFDF5",
          },
          {
            href: "/admin/websites",
            title: "All Websites",
            count: s.totalWebsites,
            label: "Total AI-generated",
            color: "#8B5CF6",
            bg: "#F5F3FF",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div>
              <p className="font-semibold text-gray-900">{item.title}</p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: item.color }}
              >
                {item.count.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
              style={{ background: item.bg }}
            >
              <ArrowRight size={16} style={{ color: item.color }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue + Cost */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="p-6 rounded-xl border border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
            <TrendingUp size={15} style={{ color: BLUE }} />
            Revenue Breakdown
          </h2>
          <div className="space-y-1">
            <StatRow label="Active Pro users" value={`${s.proUsers}`} />
            <StatRow
              label="Est. Monthly Revenue"
              value={`₱${(s.proUsers * 499).toLocaleString()}/mo`}
              highlight
            />
            <StatRow
              label="Est. Annual Revenue"
              value={`₱${(s.proUsers * 499 * 12).toLocaleString()}/yr`}
            />
            <StatRow
              label="Total API cost (PHP)"
              value={`₱${s.totalCostPhp.toFixed(2)}`}
            />
            <StatRow
              label="Est. Net MRR"
              value={`₱${Math.max(
                0,
                s.proUsers * 499 - s.todayCostPhp * 30
              ).toLocaleString()}/mo`}
            />
          </div>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 bg-white">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
            <Database size={15} className="text-emerald-500" />
            Platform Stats
          </h2>
          <div className="space-y-1">
            <StatRow label="Free users" value={s.freeUsers.toLocaleString()} />
            <StatRow label="Pro users" value={s.proUsers.toLocaleString()} highlight />
            <StatRow label="New users this month" value={s.monthUsers.toLocaleString()} />
            <StatRow label="New websites this week" value={s.weekWebsites.toLocaleString()} />
            <StatRow label="API cost today" value={`₱${s.todayCostPhp.toFixed(2)}`} />
          </div>
          <div className="mt-4 p-3 rounded-xl border border-amber-100 bg-amber-50 flex items-start gap-2">
            <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Free users use Claude Haiku (~₱0.95/gen). Pro users use Claude
              Sonnet (~₱2.86/gen). Set spending limits in your Anthropic
              console.
            </p>
          </div>
        </div>
      </div>

      {/* Recent users */}
      <div className="p-6 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Users</h2>
          <Link
            href="/admin/users"
            className="text-sm font-medium hover:underline"
            style={{ color: BLUE }}
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">
                  User
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">
                  Plan
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">
                  Websites
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {s.recentUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: BLUE }}
                      >
                        {(user.name || user.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {user.name || "No name"}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {user.plan === "PRO" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-100">
                        <Crown size={10} /> Pro
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-gray-600 text-sm">
                    {user._count.websites}
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {s.recentUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-10 text-center text-gray-400 text-sm"
                  >
                    No users yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  accentBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent: string;
  accentBg: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: accentBg }}
      >
        <Icon size={18} style={{ color: accent }} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold font-mono ${
          highlight ? "text-blue-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
