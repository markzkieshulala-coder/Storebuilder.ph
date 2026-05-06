"use client";

import { useState } from "react";
import { Crown, Shield, User, Sparkles, Mail, X, Building2 } from "lucide-react";
import toast from "react-hot-toast";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string;
  role: string;
  isInfluencer: boolean;
  planExpiresAt: Date | string | null;
  pendingPlan: string | null;
  pendingPlanAt: Date | string | null;
  createdAt: Date | string;
  _count: { websites: number };
};

const PLAN_CHOICES = ["FREE", "PRO", "ENTERPRISE"] as const;

function planLabel(plan: string) {
  if (plan === "PRO") return "Pro";
  if (plan === "ENTERPRISE") return "Enterprise";
  return "Free";
}

function planTone(plan: string) {
  if (plan === "PRO") return "text-amber-400";
  if (plan === "ENTERPRISE") return "text-violet-300";
  return "text-white/55";
}

function PlanIcon({ plan, size = 11 }: { plan: string; size?: number }) {
  if (plan === "PRO") return <Crown size={size} />;
  if (plan === "ENTERPRISE") return <Building2 size={size} />;
  return null;
}

export default function AdminUserTable({ users }: { users: UserRow[] }) {
  const [rows, setRows] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<UserRow | null>(null);

  async function updateUser(userId: string, body: { plan?: string; isInfluencer?: boolean }) {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/grant-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((u) => (u.id === userId ? { ...u, ...body } : u)));
        toast.success("Saved");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/6">
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">User</th>
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Status</th>
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Plan</th>
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Influencer</th>
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Sites</th>
              <th className="text-left py-2 px-3 text-xs text-white/30 font-semibold">Joined</th>
              <th className="text-right py-2 px-3 text-xs text-white/30 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => {
              const tone = planTone(user.plan);
              return (
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
                    <span className={`flex items-center gap-1 text-xs font-semibold ${tone}`}>
                      <PlanIcon plan={user.plan} />
                      {planLabel(user.plan)}
                      {user.isInfluencer && (
                        <>
                          <span className="text-white/25">/</span>
                          <span className="flex items-center gap-1 text-pink-400">
                            <Sparkles size={10} />
                            Influencer
                          </span>
                        </>
                      )}
                    </span>
                    {user.role === "ADMIN" && (
                      <span className="flex items-center gap-1 text-xs text-violet-400 mt-0.5">
                        <Shield size={10} /> Admin
                      </span>
                    )}
                    {user.pendingPlan && user.pendingPlanAt && (
                      <p className="text-[10px] text-amber-400/80 mt-0.5">
                        → {planLabel(user.pendingPlan)} on {new Date(user.pendingPlanAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={user.plan}
                      disabled={busyId === user.id}
                      onChange={(e) => updateUser(user.id, { plan: e.target.value })}
                      className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-violet-500/50 disabled:opacity-50"
                    >
                      {PLAN_CHOICES.map((p) => (
                        <option key={p} value={p}>{planLabel(p)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => updateUser(user.id, { isInfluencer: !user.isInfluencer })}
                      disabled={busyId === user.id}
                      role="switch"
                      aria-checked={user.isInfluencer}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${user.isInfluencer ? "bg-pink-500" : "bg-white/15"}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${user.isInfluencer ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="py-3 px-3 text-white/50">{user._count.websites}</td>
                  <td className="py-3 px-3 text-white/35 text-xs">
                    {new Date(user.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setEmailModal(user)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors"
                      title="Change email (requires Account ID)"
                    >
                      <Mail size={11} />
                      Email
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {emailModal && (
        <ChangeEmailModal
          user={emailModal}
          onClose={() => setEmailModal(null)}
          onSaved={(newEmail) => {
            setRows((prev) => prev.map((u) => (u.id === emailModal.id ? { ...u, email: newEmail } : u)));
            setEmailModal(null);
          }}
        />
      )}
    </>
  );
}

function ChangeEmailModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: (newEmail: string) => void;
}) {
  const [accountIdConfirm, setAccountIdConfirm] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          accountIdConfirm,
          newEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed");
        return;
      }
      toast.success("Email updated");
      onSaved(newEmail.toLowerCase());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-white/10 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Mail size={16} className="text-violet-400" />
              Change User Email
            </h3>
            <p className="text-xs text-white/50 mt-0.5">{user.name} — {user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/50">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 mb-4 text-xs text-amber-300">
          To prevent mistakes, retype this user's <strong>Account ID</strong> below. Email changes are logged.
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Account ID</label>
            <p className="text-[11px] font-mono text-white/35 mb-1 break-all">{user.id}</p>
            <input
              required
              value={accountIdConfirm}
              onChange={(e) => setAccountIdConfirm(e.target.value)}
              placeholder="Re-type the Account ID exactly"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:border-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">New email address</label>
            <input
              required
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="newemail@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !accountIdConfirm || !newEmail}
              className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? "Saving..." : "Update email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
