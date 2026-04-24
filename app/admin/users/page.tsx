"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, Trash2, Search, Shield, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: "FREE" | "PRO";
  role: "USER" | "ADMIN";
  createdAt: string;
  planExpiresAt: string | null;
  _count: { websites: number; subscriptions: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function updatePlan(userId: string, plan: "FREE" | "PRO") {
    setLoadingId(userId + "-plan");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, plan } : u))
        );
        toast.success(
          plan === "PRO" ? "Upgraded to Pro" : "Downgraded to Free"
        );
      } else {
        toast.error("Failed to update plan");
      }
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteUser(userId: string, email: string | null) {
    if (
      !confirm(
        `Delete user "${email}"?\n\nThis will permanently delete their account, websites, and all data. This cannot be undone.`
      )
    )
      return;
    setLoadingId(userId + "-del");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((prev) => prev - 1);
        toast.success("User deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="p-8" style={{ fontFamily: "'Google Sans', Roboto, Arial, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total.toLocaleString()} registered users
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers(search)}
          className="w-full pl-9 pr-16 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white"
          onFocus={(e) => (e.target.style.borderColor = BLUE)}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
        <button
          onClick={() => fetchUsers(search)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded"
          style={{ color: BLUE }}
        >
          Search
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-gray-400">
            <div
              className="w-7 h-7 border-2 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: "#e5e7eb", borderTopColor: BLUE }}
            />
            <p className="text-sm">Loading users...</p>
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
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Websites
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: BLUE }}
                        >
                          {(user.name || user.email || "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">
                              {user.name || "No name"}
                            </p>
                            {user.role === "ADMIN" && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold text-blue-700 bg-blue-100 shrink-0">
                                <Shield size={9} /> ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      {user.plan === "PRO" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-amber-700 bg-amber-100">
                          <Crown size={10} /> Pro
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100">
                          Free
                        </span>
                      )}
                    </td>

                    {/* Websites */}
                    <td className="py-3.5 px-4 text-gray-600 font-medium">
                      {user._count.websites}
                    </td>

                    {/* Joined */}
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.plan === "PRO" ? (
                          <button
                            onClick={() => updatePlan(user.id, "FREE")}
                            disabled={loadingId === user.id + "-plan"}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            {loadingId === user.id + "-plan"
                              ? "..."
                              : "Downgrade"}
                          </button>
                        ) : (
                          <button
                            onClick={() => updatePlan(user.id, "PRO")}
                            disabled={loadingId === user.id + "-plan"}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-50"
                          >
                            {loadingId === user.id + "-plan"
                              ? "..."
                              : "Upgrade to Pro"}
                          </button>
                        )}
                        {user.role !== "ADMIN" && (
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            disabled={loadingId === user.id + "-del"}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete user"
                          >
                            {loadingId === user.id + "-del" ? (
                              <span
                                className="w-3.5 h-3.5 border border-red-300 border-t-red-500 rounded-full animate-spin inline-block"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-14 text-center text-gray-400 text-sm"
                    >
                      {search ? `No users matching "${search}"` : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {users.length} of {total.toLocaleString()} users
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
