"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

type Subscription = {
  id: string;
  status: "PENDING" | "ACTIVE" | "CANCELLED" | "EXPIRED";
  plan: "FREE" | "PRO";
  billingCycle: "MONTHLY" | "YEARLY";
  amount: number;
  currency: string;
  paymongoId: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null };
};

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Active",
    color: "#065F46",
    bg: "#ECFDF5",
    icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    color: "#92400E",
    bg: "#FEF3C7",
    icon: Clock,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#991B1B",
    bg: "#FEE2E2",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    color: "#6B7280",
    bg: "#F3F4F6",
    icon: AlertCircle,
  },
};

type FilterKey = "ALL" | "ACTIVE" | "PENDING" | "CANCELLED" | "EXPIRED";

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchSubs = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const url =
        status && status !== "ALL"
          ? `/api/admin/subscriptions?status=${status}`
          : "/api/admin/subscriptions";
      const res = await fetch(url);
      const data = await res.json();
      setSubs(data.subscriptions ?? []);
    } catch {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  async function updateStatus(subId: string, status: string) {
    setLoadingId(subId);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubs((prev) =>
          prev.map((s) =>
            s.id === subId ? { ...s, status: status as Subscription["status"] } : s
          )
        );
        toast.success(`Subscription ${status.toLowerCase()}`);
      } else {
        toast.error("Failed to update subscription");
      }
    } finally {
      setLoadingId(null);
    }
  }

  // Count per status from raw data
  const counts: Record<FilterKey, number> = {
    ALL: subs.length,
    ACTIVE: subs.filter((s) => s.status === "ACTIVE").length,
    PENDING: subs.filter((s) => s.status === "PENDING").length,
    CANCELLED: subs.filter((s) => s.status === "CANCELLED").length,
    EXPIRED: subs.filter((s) => s.status === "EXPIRED").length,
  };

  const displayed =
    filter === "ALL" ? subs : subs.filter((s) => s.status === filter);

  const totalActiveRevenue = subs
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => {
      const monthly =
        s.billingCycle === "YEARLY" ? Math.round(s.amount / 12) : s.amount;
      return sum + monthly;
    }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {subs.length} total · Est. MRR:{" "}
            <span className="font-semibold text-gray-700">
              ₱{(totalActiveRevenue / 100).toLocaleString()}/mo
            </span>
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(
          ["ALL", "ACTIVE", "PENDING", "CANCELLED", "EXPIRED"] as FilterKey[]
        ).map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s);
              fetchSubs(s);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              filter === s
                ? { background: BLUE, color: "#fff" }
                : { background: "#F3F4F6", color: "#6B7280" }
            }
          >
            {s}{" "}
            <span
              className="ml-1 text-xs"
              style={{ opacity: filter === s ? 0.75 : 0.6 }}
            >
              ({counts[s]})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div
              className="w-7 h-7 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: "#e5e7eb", borderTopColor: BLUE }}
            />
            <p className="text-sm">Loading subscriptions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Amount Paid
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Billing
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map((sub) => {
                  const sc = STATUS_CONFIG[sub.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {/* User */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-gray-900">
                          {sub.user.name || "No name"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {sub.user.email}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ color: sc.color, background: sc.bg }}
                        >
                          <StatusIcon size={11} />
                          {sc.label}
                        </span>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                          <Crown size={11} /> {sub.plan}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-gray-800 font-medium">
                          ₱{(sub.amount / 100).toLocaleString()}
                        </span>
                      </td>

                      {/* Billing */}
                      <td className="py-3.5 px-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100"
                        >
                          {sub.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-gray-400">
                        {new Date(sub.createdAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status !== "ACTIVE" && (
                            <button
                              onClick={() => updateStatus(sub.id, "ACTIVE")}
                              disabled={loadingId === sub.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              {loadingId === sub.id ? "..." : "Activate"}
                            </button>
                          )}
                          {sub.status === "ACTIVE" && (
                            <button
                              onClick={() => updateStatus(sub.id, "CANCELLED")}
                              disabled={loadingId === sub.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {loadingId === sub.id ? "..." : "Cancel"}
                            </button>
                          )}
                          {sub.status === "PENDING" && (
                            <button
                              onClick={() => updateStatus(sub.id, "EXPIRED")}
                              disabled={loadingId === sub.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                              {loadingId === sub.id ? "..." : "Expire"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayed.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-14 text-center text-gray-400 text-sm"
                    >
                      No subscriptions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {displayed.length} subscription
              {displayed.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
