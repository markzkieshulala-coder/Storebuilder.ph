import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users, Globe, DollarSign, ArrowLeft,
  TrendingUp, Database, AlertCircle
} from "lucide-react";
import AdminUserTable from "@/components/admin/AdminUserTable";

async function getStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    totalUsers, todayUsers, weekUsers,
    totalWebsites, todayWebsites, weekWebsites,
    freeUsers, proUsers, enterpriseUsers,
    tokenLogs, recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.website.count(),
    prisma.website.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.website.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { plan: "FREE" } }),
    prisma.user.count({ where: { plan: "PRO" } }),
    prisma.user.count({ where: { plan: "ENTERPRISE" } }),
    prisma.tokenUsageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, name: true, email: true, plan: true, role: true,
        isInfluencer: true, planExpiresAt: true, pendingPlan: true, pendingPlanAt: true,
        createdAt: true, _count: { select: { websites: true } },
      },
    }),
  ]);

  const totalCostUsd = tokenLogs.reduce((sum, l) => sum + l.costUsd, 0);
  const totalCostPhp = tokenLogs.reduce((sum, l) => sum + l.costPhp, 0);
  const todayCostPhp = tokenLogs
    .filter((l) => l.createdAt >= todayStart)
    .reduce((sum, l) => sum + l.costPhp, 0);

  return {
    totalUsers, todayUsers, weekUsers,
    totalWebsites, todayWebsites, weekWebsites,
    freeUsers, proUsers, enterpriseUsers,
    totalCostUsd, totalCostPhp, todayCostPhp,
    recentUsers,
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft size={14} />
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-syne)" }}>
              Admin Dashboard
            </h1>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            ADMIN
          </div>
        </div>

        {/* All Users banner */}
        <div className="mb-4 p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 border border-blue-400/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wider mb-0.5">All Users</p>
              <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </div>
          <div className="hidden sm:block text-right text-xs text-white/80">
            <p>+{stats.todayUsers} today</p>
            <p>+{stats.weekUsers} this week</p>
          </div>
        </div>

        {/* Plan breakdown — Free / Pro / Enterprise */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <PlanBreakdownCard label="Free" value={stats.freeUsers} total={stats.totalUsers} color="zinc" />
          <PlanBreakdownCard label="Pro" value={stats.proUsers} total={stats.totalUsers} color="amber" />
          <PlanBreakdownCard label="Enterprise" value={stats.enterpriseUsers} total={stats.totalUsers} color="violet" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={Globe}
            label="Total Websites"
            value={stats.totalWebsites}
            sub={`+${stats.todayWebsites} today · +${stats.weekWebsites} this week`}
            color="blue"
          />
          <StatCard
            icon={DollarSign}
            label="API Cost (PHP)"
            value={`₱${stats.totalCostPhp.toFixed(2)}`}
            sub={`₱${stats.todayCostPhp.toFixed(2)} today`}
            color="emerald"
          />
        </div>

        {/* Cost breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-2xl bg-zinc-950 border border-white/8">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <Database size={16} className="text-emerald-400" />
              API Cost Tracker
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Total API cost (USD)</span>
                <span className="font-mono text-sm">${stats.totalCostUsd.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Total API cost (PHP)</span>
                <span className="font-mono text-sm font-bold text-emerald-400">₱{stats.totalCostPhp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Today's API cost</span>
                <span className="font-mono text-sm">₱{stats.todayCostPhp.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-white/50">Avg cost per generation</span>
                <span className="font-mono text-sm">
                  ₱{stats.totalWebsites > 0 ? (stats.totalCostPhp / stats.totalWebsites).toFixed(2) : "0.00"}
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-400/80">
                Set spending limits in your Anthropic console to prevent unexpected charges. Free users use Claude Haiku (~₱0.95/gen). Pro users use Claude Sonnet (~₱2.86/gen).
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-950 border border-white/8">
            <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-violet-400" />
              Revenue Estimate
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Pro users (monthly)</span>
                <span className="font-mono text-sm text-violet-400">
                  ₱{(stats.proUsers * 299).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-sm text-white/50">Estimated MRR</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  ₱{(stats.proUsers * 299).toLocaleString()}/mo
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-white/50">Est. net (after API cost)</span>
                <span className="font-mono text-sm">
                  ₱{Math.max(0, stats.proUsers * 299 - stats.todayCostPhp * 30).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Users table */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-white/8">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-sm">
            <Users size={16} className="text-violet-400" />
            Recent Users
          </h2>
          <AdminUserTable users={stats.recentUsers} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub: string;
  color: "violet" | "blue" | "amber" | "emerald";
}) {
  const colors = {
    violet: "text-violet-400 bg-violet-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  };
  return (
    <div className="p-5 rounded-2xl bg-zinc-950 border border-white/8">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} className={colors[color].split(" ")[0]} />
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs text-white/40 font-medium mb-1">{label}</p>
      <p className="text-xs text-white/25">{sub}</p>
    </div>
  );
}

function PlanBreakdownCard({ label, value, total, color }: {
  label: string; value: number; total: number;
  color: "zinc" | "amber" | "violet";
}) {
  const palette = {
    zinc:   { ring: "border-white/10",        text: "text-white/70",   pill: "bg-white/8 text-white/60" },
    amber:  { ring: "border-amber-500/30",    text: "text-amber-400",  pill: "bg-amber-500/10 text-amber-400" },
    violet: { ring: "border-violet-500/30",   text: "text-violet-300", pill: "bg-violet-500/10 text-violet-300" },
  }[color];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  return (
    <div className={`p-5 rounded-2xl bg-zinc-950 border ${palette.ring}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${palette.text}`}>{label}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${palette.pill}`}>{pct}%</span>
      </div>
      <p className="text-3xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-white/30 mt-1">of {total.toLocaleString()} users</p>
    </div>
  );
}
