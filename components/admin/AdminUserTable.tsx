"use client";

import { useState } from "react";
import { Crown, Shield, User } from "lucide-react";
import toast from "react-hot-toast";

type UserRow = {
  id: string; name: string | null; email: string | null;
  plan: string; role: string; createdAt: Date;
  _count: { websites: number };
};

export default function AdminUserTable({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState(users);
  const [loading, setLoading] = useState<string | null>(null);

  async function grantPro(userId: string) {
    setLoading(userId);
    try {
      const res = await fetch("/api/admin/grant-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((u) => u.id === userId ? { ...u, plan: "PRO" } : u));
        toast.success("Pro access granted");
      } else {
        toast.error("Failed");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/6">
            <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">User</th>
            <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Plan</th>
            <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Sites</th>
            <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Joined</th>
            <th className="text-right py-2 px-3 text-xs text-white/30 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-violet-800/40 flex items-center justify-center">
                    <User size={13} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user.name || "—"}</p>
                    <p className="text-xs text-white/35">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3">
                {user.plan === "PRO" ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                    <Crown size={11} /> Pro
                  </span>
                ) : (
                  <span className="text-xs text-white/35">Free</span>
                )}
                {user.role === "ADMIN" && (
                  <span className="flex items-center gap-1 text-xs text-violet-400 mt-0.5">
                    <Shield size={10} /> Admin
                  </span>
                )}
              </td>
              <td className="py-3 px-3 text-white/50">{user._count.websites}</td>
              <td className="py-3 px-3 text-white/35 text-xs">
                {new Date(user.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td className="py-3 px-3 text-right">
                {user.plan !== "PRO" && (
                  <button
                    onClick={() => grantPro(user.id)}
                    disabled={loading === user.id}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {loading === user.id ? "..." : "Grant Pro"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
