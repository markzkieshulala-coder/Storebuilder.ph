"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Crown, CreditCard, AlertTriangle, AlertCircle, Globe,
  Shield, Menu, X, Settings as SettingsIcon, LifeBuoy,
} from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";
const FONT = "'Google Sans', Roboto, Arial, system-ui, sans-serif";

type Sub = {
  id: string;
  status: string;
  plan: string;
  billingCycle: string;
  amount: number;
  createdAt: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

type TabId =
  | "account" | "billing" | "payments" | "domain";

const TABS: { id: TabId; label: string; Icon: any; pro?: boolean }[] = [
  { id: "account", label: "Account", Icon: User },
  { id: "billing", label: "Billing & Plan", Icon: Crown },
  { id: "payments", label: "Payment Methods", Icon: CreditCard },
  { id: "domain", label: "Custom Domain", Icon: Globe, pro: true },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [tab, setTab] = useState<TabId>("account");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [livePlan, setLivePlan] = useState<"FREE" | "PRO" | "ENTERPRISE" | null>(null);
  const refreshedRef = useRef(false);

  // On first mount: force a session refresh so the latest plan from DB
  // is reflected immediately (no need for the user to log out and back in).
  // Also fetch the live plan from /api/credits as a guaranteed source of truth.
  useEffect(() => {
    if (refreshedRef.current) return;
    refreshedRef.current = true;
    update();
    fetch("/api/credits")
      .then((r) => r.json())
      .then((d) => { if (d?.plan) setLivePlan(d.plan); })
      .catch(() => {});
  }, [update]);

  const sessionPlan = (session?.user?.plan || "FREE") as "FREE" | "PRO" | "ENTERPRISE";
  const planTier = (livePlan || sessionPlan) as "FREE" | "PRO" | "ENTERPRISE";
  const isPro = planTier === "PRO" || planTier === "ENTERPRISE";
  const isEnterprise = planTier === "ENTERPRISE";

  return (
    <div
      className="min-h-screen bg-[#F0F2F5]"
      style={{ fontFamily: FONT }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E4E6EB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[#65676B] hover:text-[#1C1E21] text-sm font-medium"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-[#1C1E21]">Settings</h1>
          <button
            className="lg:hidden p-2 -mr-2 rounded-lg hover:bg-[#F0F2F5]"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            aria-label="Toggle settings menu"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden lg:block w-32" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">

          {/* Sidebar nav (desktop) */}
          <aside className="hidden lg:block">
            <nav className="space-y-1 sticky top-20">
              {TABS.map(({ id, label, Icon, pro }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    tab === id
                      ? "bg-[#1877F2] text-white"
                      : "text-[#1C1E21] hover:bg-[#E4E6EB]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  {pro && tab !== id && (
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      Pro
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile nav drawer */}
          {mobileNavOpen && (
            <div className="lg:hidden mb-4 bg-white border border-[#E4E6EB] rounded-2xl p-2 space-y-1">
              {TABS.map(({ id, label, Icon, pro }) => (
                <button
                  key={id}
                  onClick={() => { setTab(id); setMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                    tab === id ? "bg-[#1877F2] text-white" : "text-[#1C1E21]"
                  }`}
                >
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  {pro && tab !== id && (
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pro</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="min-w-0">
            {/* Mobile tab indicator */}
            <div className="lg:hidden mb-3 flex items-center gap-2 text-xs text-[#65676B] font-medium">
              <SettingsIcon size={12} />
              <span>{TABS.find((t) => t.id === tab)?.label}</span>
            </div>

            {tab === "account" && <AccountTab session={session} update={update} />}
            {tab === "billing" && <BillingTab session={session} update={update} planTier={planTier} />}
            {tab === "payments" && <PaymentsTab />}
            {tab === "domain" && <DomainTab isPro={isPro} />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared UI ---------- */

function Card({ title, desc, icon: Icon, children }: any) {
  return (
    <section className="bg-white border border-[#E4E6EB] rounded-2xl p-5 sm:p-6 mb-4">
      {(title || desc) && (
        <header className="mb-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#1C1E21]">
            {Icon && <Icon size={16} className="text-[#1877F2]" />}
            {title}
          </h2>
          {desc && <p className="text-xs sm:text-sm text-[#65676B] mt-1">{desc}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

const inputCls =
  "w-full bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg px-3 py-2.5 text-sm text-[#1C1E21] outline-none focus:border-[#1877F2] focus:bg-white transition-colors";
const labelCls = "block text-xs font-semibold text-[#65676B] mb-1.5";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white text-sm font-semibold rounded-lg hover:bg-[#166FE5] disabled:opacity-50 transition-colors";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#1C1E21] text-sm font-semibold border border-[#E4E6EB] rounded-lg hover:bg-[#F0F2F5] transition-colors";

/* ---------- Account ---------- */

function AccountTab({ session, update }: any) {
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) { await update({ name }); toast.success("Name updated"); }
      else toast.error("Failed to update name");
    } finally { setSavingName(false); }
  }

  // Email changes go through a verification flow — we send a confirmation
  // link to the CURRENT email and only swap addresses after the user clicks
  // it. The old PATCH /api/user/email endpoint is no longer used here.
  async function requestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSavingEmail(true);
    try {
      const res = await fetch("/api/user/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to request email change");
        return;
      }
      setEmailNotice(data.message || `Verification link sent to ${session?.user?.email}.`);
      toast.success("Verification email sent");
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <>
      <Card title="Profile" desc="Your name as it appears in your account." icon={User}>
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label className={labelCls}>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Juan Dela Cruz" />
          </div>
          <button type="submit" disabled={savingName} className={btnPrimary}>
            {savingName ? "Saving…" : "Save changes"}
          </button>
        </form>
      </Card>

      <Card title="Email Address" desc="Used to sign in and receive notifications." icon={Mail}>
        {emailNotice && (
          <div className="mb-4 rounded-lg border border-[#FBBF24]/40 bg-[#FFFBEB] p-3 text-xs text-[#92400E] flex items-start gap-2">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>{emailNotice}</span>
          </div>
        )}

        <form onSubmit={requestEmailChange} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="you@example.com"
            />
            <div className="mt-2 rounded-lg border border-[#1877F2]/20 bg-[#EBF3FF] p-2.5 text-xs text-[#1C1E21] flex items-start gap-2">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-[#1877F2]" />
              <span>
                For your security, we'll send a confirmation link to your <strong>current</strong> email
                ({session?.user?.email}). The change only takes effect after you click that link.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingEmail || !email || email === session?.user?.email}
              className={btnPrimary}
            >
              {savingEmail ? "Sending…" : "Send confirmation link"}
            </button>
            <a
              href="mailto:support@storebuilder.ph?subject=Email%20change%20request"
              className="inline-flex items-center gap-1.5 text-xs text-[#65676B] hover:text-[#1877F2] transition-colors"
            >
              <LifeBuoy size={12} />
              Can't access your current email? Contact support
            </a>
          </div>
        </form>
      </Card>

      <Card title="Workspace" desc="Information about your workspace." icon={Shield}>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[#65676B]">Account ID</span>
            <span className="font-mono text-xs text-[#1C1E21] truncate max-w-full sm:max-w-[60%]">{session?.user?.id || "—"}</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[#65676B]">Plan</span>
            <span className="font-semibold text-[#1C1E21]">{session?.user?.plan || "FREE"}</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[#65676B]">Region</span>
            <span className="font-semibold text-[#1C1E21]">Philippines</span>
          </div>
        </div>
      </Card>
    </>
  );
}

/* ---------- Billing ---------- */

const PLAN_INFO: Record<string, { label: string; tagline: string; features: string[]; nextLabel?: string; nextHref?: string }> = {
  FREE: {
    label: "Free Plan",
    tagline: "Best for landing pages & personal portfolios",
    features: ["Up to 5 websites per month", "All editor features", "Free .storebuilder.ph subdomain"],
    nextLabel: "Upgrade to Pro",
    nextHref: "/upgrade",
  },
  PRO: {
    label: "Pro Plan",
    tagline: "Best for online sellers & freelancers",
    features: ["Up to 10 websites per month", "Add Hitpay & Paymongo payment links", "Template link sharing", "Custom domain", "Remove branding"],
    nextLabel: "Upgrade to Enterprise",
    nextHref: "/upgrade",
  },
  ENTERPRISE: {
    label: "Enterprise Plan",
    tagline: "Advanced systems for business owners",
    features: ["Up to 20 websites per month", "Payment links", "System / CRM generation", "Template link sharing", "Custom domain", "Priority generation"],
  },
};

function BillingTab({ session, update, planTier }: any) {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const isPaid = planTier === "PRO" || planTier === "ENTERPRISE";
  const planInfo = PLAN_INFO[planTier] || PLAN_INFO.FREE;

  useEffect(() => {
    if (!isPaid) { setLoadingSub(false); return; }
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((s) => { if (s.subscription) setSub(s.subscription); })
      .catch(() => {})
      .finally(() => setLoadingSub(false));
  }, [isPaid]);

  async function cancel() {
    if (!confirm(`Cancel your ${planInfo.label}? You'll keep ${planInfo.label} access until the end of your current billing period, then automatically downgrade to Free.`)) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const ends = data.endsAt ? new Date(data.endsAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "the end of your billing period";
        toast.success(`Cancellation scheduled — you keep access until ${ends}.`);
        // Reflect the scheduled cancel locally without dropping the plan yet.
        setSub((s) => s ? { ...s, cancelAtPeriodEnd: true, currentPeriodEnd: data.endsAt ?? s.currentPeriodEnd } : s);
      } else toast.error(data.error || "Failed to cancel");
    } finally { setCancelling(false); }
  }

  async function undoCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "DELETE" });
      if (res.ok) {
        toast.success("Cancellation reversed — your subscription continues.");
        setSub((s) => s ? { ...s, cancelAtPeriodEnd: false } : s);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to undo");
      }
    } finally { setCancelling(false); }
  }

  const planAccent =
    planTier === "ENTERPRISE" ? "bg-gray-900 border-gray-900 text-white"
    : planTier === "PRO" ? "bg-blue-50 border-blue-200"
    : "bg-[#F0F2F5] border-[#E4E6EB]";

  return (
    <>
      <Card title="Current Plan" icon={Crown}>
        <div className={`p-4 rounded-xl border ${planAccent}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className={`text-base font-bold ${planTier === "ENTERPRISE" ? "text-white" : "text-[#1C1E21]"}`}>{planInfo.label}</p>
              <p className={`text-xs sm:text-sm mt-1 ${planTier === "ENTERPRISE" ? "text-gray-300" : "text-[#65676B]"}`}>
                {planInfo.tagline}
              </p>
              <ul className={`mt-3 space-y-1 text-xs ${planTier === "ENTERPRISE" ? "text-gray-300" : "text-[#65676B]"}`}>
                {planInfo.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5">
                    <span className={`w-1 h-1 rounded-full ${planTier === "ENTERPRISE" ? "bg-gray-300" : "bg-[#1877F2]"}`} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {planInfo.nextLabel && planInfo.nextHref && (
              <Link href={planInfo.nextHref} className={btnPrimary}>
                <Crown size={14} />
                {planInfo.nextLabel}
              </Link>
            )}
          </div>
        </div>
      </Card>

      {isPaid && !loadingSub && sub && (
        <Card title="Subscription Details" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Plan" value={`${sub.plan} — ${sub.billingCycle}`} />
            <Row label="Amount" value={`₱${(sub.amount / 100).toLocaleString()}`} />
            <Row label="Started" value={new Date(sub.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} />
            <Row label="Status" value={sub.status} valueClass="text-emerald-600 font-semibold" />
          </div>
        </Card>
      )}

      {isPaid && (
        <>
          <Card title="Payment Method" desc="Update the card or wallet used for billing." icon={CreditCard}>
            <p className="text-xs sm:text-sm text-[#65676B] mb-4">
              Start a new subscription to update your payment method. Your existing plan remains active.
            </p>
            <Link href="/upgrade" className={btnSecondary}>Update payment method</Link>
          </Card>

          <Card title="Cancel Subscription" icon={AlertTriangle}>
            {sub?.cancelAtPeriodEnd ? (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-600">Cancellation scheduled</p>
                    <p className="text-xs text-[#65676B] mt-1">
                      You will keep {planInfo.label} access until{" "}
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
                        : "the end of your current billing period"}
                      , then automatically switch to the Free plan. You can reverse this any time before that date.
                    </p>
                  </div>
                </div>
                <button
                  onClick={undoCancel}
                  disabled={cancelling}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#1877F2] text-sm font-semibold border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? "Working…" : "Keep my subscription"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#1C1E21]">Cancellation takes effect at the end of your billing period</p>
                    <p className="text-xs text-[#65676B] mt-1">
                      You'll keep full {planInfo.label} access until the end of the current billing period
                      {sub?.currentPeriodEnd
                        ? ` (${new Date(sub.currentPeriodEnd).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })})`
                        : ""}
                      , and then automatically switch to the Free plan. Your published sites stay online — you'll just lose paid features. You can reverse the cancellation any time before then.
                    </p>
                  </div>
                </div>
                <button
                  onClick={cancel}
                  disabled={cancelling}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-semibold border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? "Cancelling…" : "Cancel at period end"}
                </button>
              </>
            )}
          </Card>
        </>
      )}
    </>
  );
}

function Row({ label, value, valueClass = "" }: any) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-[#F0F2F5] rounded-lg">
      <span className="text-xs text-[#65676B]">{label}</span>
      <span className={`text-sm text-[#1C1E21] font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

/* ---------- Payment Methods ---------- */

const PAYMENT_OPTIONS = [
  { key: "hitpay", label: "Hitpay", help: "Hitpay checkout link." },
  { key: "paymongo", label: "Paymongo", help: "Paymongo payment link." },
];

function PaymentsTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [details, setDetails] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings?.payments) setEnabled(d.settings.payments);
        if (d?.settings?.paymentDetails) setDetails(d.settings.paymentDetails);
      })
      .catch(() => {});
  }, []);

  function toggle(k: string) {
    setEnabled((s) => ({ ...s, [k]: !s[k] }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { payments: enabled, paymentDetails: details } }),
      });
      if (res.ok) toast.success("Payment methods saved");
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <>
      <Card
        title="Accepted Payment Methods"
        desc="Toggle the payment methods you accept across all of your sites."
        icon={CreditCard}
      >
        <div className="space-y-2">
          {PAYMENT_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                enabled[p.key]
                  ? "bg-blue-50 border-[#1877F2]"
                  : "bg-white border-[#E4E6EB] hover:border-[#BCC0C4]"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${enabled[p.key] ? "text-[#1877F2]" : "text-[#1C1E21]"}`}>
                  {p.label}
                </p>
                <p className="text-xs text-[#65676B] mt-0.5">{p.help}</p>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors shrink-0 ${enabled[p.key] ? "bg-[#1877F2]" : "bg-[#BCC0C4]"} relative`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${enabled[p.key] ? "left-[18px]" : "left-0.5"}`} />
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Payment Links" desc="Paste your own Hitpay and Paymongo checkout links — these are shown to your customers at checkout." icon={CreditCard}>
        <div className="space-y-4">
          {enabled.hitpay && (
            <div>
              <label className={labelCls}>Hitpay payment link</label>
              <input value={details.hitpayLink || ""} onChange={(e) => setDetails({ ...details, hitpayLink: e.target.value })} className={inputCls} placeholder="https://hitpay.example/link" />
            </div>
          )}
          {enabled.paymongo && (
            <div>
              <label className={labelCls}>Paymongo payment link</label>
              <input value={details.paymongoLink || ""} onChange={(e) => setDetails({ ...details, paymongoLink: e.target.value })} className={inputCls} placeholder="https://pm.link/your-link" />
            </div>
          )}
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Save payment settings"}
          </button>
        </div>
      </Card>
    </>
  );
}

/* ---------- Custom Domain ---------- */

function DomainTab({ isPro }: any) {
  const [websites, setWebsites] = useState<any[]>([]);
  const [domain, setDomain] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetch("/api/websites").then((r) => r.json()).then((d) => setWebsites(d.websites || [])).catch(() => {});
  }, []);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!domain || !websiteId) { toast.error("Pick a site and enter a domain"); return; }
    setLinking(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, domain }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Domain linked. Update DNS to finish setup.");
        setDomain("");
      } else toast.error(data.error || "Failed to link domain");
    } finally { setLinking(false); }
  }

  if (!isPro) {
    return (
      <Card title="Custom Domain" desc="Connect your own domain to your site." icon={Globe}>
        <div className="text-center py-8">
          <Crown size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1C1E21] mb-1">Pro feature</p>
          <p className="text-xs text-[#65676B] mb-4">Upgrade to connect a custom domain like yourstore.ph.</p>
          <Link href="/upgrade" className={btnPrimary}>Upgrade to Pro</Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="Connect Custom Domain" desc="Link a domain you own to a website on Storebuilder." icon={Globe}>
        <form onSubmit={link} className="space-y-4">
          <div>
            <label className={labelCls}>Website</label>
            <select value={websiteId} onChange={(e) => setWebsiteId(e.target.value)} className={inputCls}>
              <option value="">Choose a website…</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Domain</label>
            <input value={domain} onChange={(e) => setDomain(e.target.value)} className={inputCls} placeholder="yourstore.ph" />
          </div>
          <button type="submit" disabled={linking} className={btnPrimary}>
            {linking ? "Connecting…" : "Connect domain"}
          </button>
        </form>
      </Card>

      <Card title="DNS Setup Instructions" desc="Update your domain registrar with these records." icon={Globe}>
        <div className="space-y-3">
          <div className="bg-[#F0F2F5] rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
            <p className="font-mono text-[#1C1E21] break-all">CNAME &nbsp;@ → cname.storebuilder.ph</p>
          </div>
          <div className="bg-[#F0F2F5] rounded-lg p-3 sm:p-4 text-xs sm:text-sm">
            <p className="font-mono text-[#1C1E21] break-all">CNAME &nbsp;www → cname.storebuilder.ph</p>
          </div>
          <p className="text-xs text-[#65676B]">
            DNS changes can take up to 48 hours to propagate. Use a tool like dnschecker.org to verify.
          </p>
        </div>
      </Card>
    </>
  );
}

