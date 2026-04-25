"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, User, Mail, Crown, CreditCard, AlertTriangle, Globe, Plug,
  Code, Image as ImageIcon, Shield, Copy, Check, Menu, X, Zap, BarChart3,
  MessageSquare, Webhook, Settings as SettingsIcon,
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
};

type TabId =
  | "account" | "billing" | "payments" | "domain"
  | "integrations" | "api" | "branding";

const TABS: { id: TabId; label: string; Icon: any; pro?: boolean }[] = [
  { id: "account", label: "Account", Icon: User },
  { id: "billing", label: "Billing & Plan", Icon: Crown },
  { id: "payments", label: "Payment Methods", Icon: CreditCard },
  { id: "domain", label: "Custom Domain", Icon: Globe, pro: true },
  { id: "integrations", label: "Integrations", Icon: Plug },
  { id: "api", label: "API & Webhooks", Icon: Code, pro: true },
  { id: "branding", label: "Branding", Icon: ImageIcon },
];

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [tab, setTab] = useState<TabId>("account");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isPro = session?.user?.plan === "PRO";

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
            {tab === "billing" && <BillingTab session={session} update={update} isPro={isPro} />}
            {tab === "payments" && <PaymentsTab />}
            {tab === "domain" && <DomainTab isPro={isPro} />}
            {tab === "integrations" && <IntegrationsTab />}
            {tab === "api" && <ApiTab isPro={isPro} />}
            {tab === "branding" && <BrandingTab isPro={isPro} />}
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

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { toast.error("Enter a valid email"); return; }
    setSavingEmail(true);
    try {
      const res = await fetch("/api/user/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        await update({ email: data.email });
        toast.success("Email updated. Sign in again to refresh your session.");
      } else toast.error(data.error || "Failed to update email");
    } finally { setSavingEmail(false); }
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
        <form onSubmit={saveEmail} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            <p className="text-xs text-[#8A8D91] mt-1.5">Changing your email will require you to sign in again.</p>
          </div>
          <button type="submit" disabled={savingEmail} className={btnPrimary}>
            {savingEmail ? "Saving…" : "Update email"}
          </button>
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

function BillingTab({ session, update, isPro }: any) {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!isPro) { setLoadingSub(false); return; }
    fetch("/api/user/subscription")
      .then((r) => r.json())
      .then((s) => { if (s.subscription) setSub(s.subscription); })
      .catch(() => {})
      .finally(() => setLoadingSub(false));
  }, [isPro]);

  async function cancel() {
    if (!confirm("Cancel your Pro subscription? You'll be downgraded to Free immediately.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/user/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Subscription cancelled.");
        await update({ plan: "FREE" });
        setSub(null);
      } else toast.error(data.error || "Failed to cancel");
    } finally { setCancelling(false); }
  }

  return (
    <>
      <Card title="Current Plan" icon={Crown}>
        <div className={`p-4 rounded-xl border ${isPro ? "bg-amber-50 border-amber-200" : "bg-[#F0F2F5] border-[#E4E6EB]"}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-base font-bold text-[#1C1E21]">{isPro ? "Pro Plan" : "Free Plan"}</p>
              <p className="text-xs sm:text-sm text-[#65676B] mt-1">
                {isPro
                  ? "Unlimited editing · Custom domain · Priority support · CRM & Dashboards"
                  : "Free subdomain · Drag-and-drop builder · Limited generations"}
              </p>
            </div>
            {!isPro && (
              <Link href="/upgrade" className={btnPrimary}>
                <Crown size={14} />
                Upgrade to Pro
              </Link>
            )}
          </div>
        </div>
      </Card>

      {isPro && !loadingSub && sub && (
        <Card title="Subscription Details" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Plan" value={`${sub.plan} — ${sub.billingCycle}`} />
            <Row label="Amount" value={`₱${(sub.amount / 100).toLocaleString()}`} />
            <Row label="Started" value={new Date(sub.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} />
            <Row label="Status" value={sub.status} valueClass="text-emerald-600 font-semibold" />
          </div>
        </Card>
      )}

      {isPro && (
        <>
          <Card title="Payment Method" desc="Update the card or wallet used for billing." icon={CreditCard}>
            <p className="text-xs sm:text-sm text-[#65676B] mb-4">
              Start a new subscription to update your payment method. Your existing plan remains active.
            </p>
            <Link href="/upgrade" className={btnSecondary}>Update payment method</Link>
          </Card>

          <Card title="Cancel Subscription" icon={AlertTriangle}>
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-600">This action cannot be undone</p>
                <p className="text-xs text-[#65676B] mt-1">
                  Cancelling will immediately downgrade you to the Free plan. Your published sites stay online but you'll lose Pro features.
                </p>
              </div>
            </div>
            <button
              onClick={cancel}
              disabled={cancelling}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-red-600 text-sm font-semibold border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </button>
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
  { key: "gcash", label: "GCash", emoji: "📱", help: "Most popular Philippine e-wallet." },
  { key: "paymaya", label: "Maya (PayMaya)", emoji: "💚", help: "Maya wallet & online banking." },
  { key: "creditCard", label: "Credit / Debit Card", emoji: "💳", help: "Visa, Mastercard, JCB." },
  { key: "cod", label: "Cash on Delivery", emoji: "🏠", help: "Pay when item arrives." },
  { key: "bankTransfer", label: "Bank Transfer", emoji: "🏦", help: "BPI, BDO, UnionBank, etc." },
  { key: "grabpay", label: "GrabPay", emoji: "🟢", help: "Pay using GrabPay wallet." },
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
              <span className="text-2xl leading-none shrink-0">{p.emoji}</span>
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

      <Card title="Payment Details" desc="Account numbers shown to your customers at checkout." icon={CreditCard}>
        <div className="space-y-4">
          {enabled.gcash && (
            <div>
              <label className={labelCls}>GCash number</label>
              <input value={details.gcashNumber || ""} onChange={(e) => setDetails({ ...details, gcashNumber: e.target.value })} className={inputCls} placeholder="+63 9XX XXX XXXX" />
            </div>
          )}
          {enabled.paymaya && (
            <div>
              <label className={labelCls}>Maya number</label>
              <input value={details.payMayaNumber || ""} onChange={(e) => setDetails({ ...details, payMayaNumber: e.target.value })} className={inputCls} placeholder="+63 9XX XXX XXXX" />
            </div>
          )}
          {enabled.bankTransfer && (
            <div>
              <label className={labelCls}>Bank account details</label>
              <textarea value={details.bankDetails || ""} onChange={(e) => setDetails({ ...details, bankDetails: e.target.value })} className={inputCls + " resize-none"} rows={3} placeholder="BPI · 1234-5678-90 · Juan Dela Cruz" />
            </div>
          )}
          {enabled.grabpay && (
            <div>
              <label className={labelCls}>GrabPay number</label>
              <input value={details.grabPayNumber || ""} onChange={(e) => setDetails({ ...details, grabPayNumber: e.target.value })} className={inputCls} placeholder="+63 9XX XXX XXXX" />
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

/* ---------- Integrations ---------- */

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d) => {
      if (d?.settings?.integrations) setIntegrations(d.settings.integrations);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { integrations } }),
      });
      if (res.ok) toast.success("Integrations saved");
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  const fields = [
    { key: "ga4", label: "Google Analytics 4 (Measurement ID)", placeholder: "G-XXXXXXXXXX", icon: BarChart3 },
    { key: "gtm", label: "Google Tag Manager (Container ID)", placeholder: "GTM-XXXXXXX", icon: BarChart3 },
    { key: "fbPixel", label: "Facebook Pixel ID", placeholder: "1234567890123456", icon: BarChart3 },
    { key: "messengerPageId", label: "Messenger Chat (Page ID)", placeholder: "123456789012345", icon: MessageSquare },
    { key: "whatsapp", label: "WhatsApp Number", placeholder: "+63 9XX XXX XXXX", icon: MessageSquare },
    { key: "sendgridKey", label: "SendGrid API Key (email)", placeholder: "SG.xxx", icon: Mail },
    { key: "mailchimpKey", label: "Mailchimp API Key", placeholder: "xxxxxxxx-us1", icon: Mail },
  ];

  return (
    <>
      <Card title="Marketing & Analytics" desc="Plug in third-party services. Empty fields stay disabled." icon={Plug}>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className={labelCls + " flex items-center gap-2"}>
                <f.icon size={12} />
                {f.label}
              </label>
              <input
                value={integrations[f.key] || ""}
                onChange={(e) => setIntegrations({ ...integrations, [f.key]: e.target.value })}
                className={inputCls + " font-mono text-xs sm:text-sm"}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Save integrations"}
          </button>
        </div>
      </Card>
    </>
  );
}

/* ---------- API & Webhooks ---------- */

function ApiTab({ isPro }: any) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d) => {
      if (d?.settings?.apiKey) setApiKey(d.settings.apiKey);
      if (d?.settings?.webhookUrl) setWebhookUrl(d.settings.webhookUrl);
    }).catch(() => {});
  }, []);

  async function generate() {
    if (apiKey && !confirm("This will replace your existing API key. Continue?")) return;
    setGenerating(true);
    try {
      const newKey = "sb_live_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { apiKey: newKey } }),
      });
      if (res.ok) { setApiKey(newKey); toast.success("New API key generated"); }
      else toast.error("Failed to generate key");
    } finally { setGenerating(false); }
  }

  async function saveWebhook() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { webhookUrl } }),
      });
      if (res.ok) toast.success("Webhook saved");
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  function copy() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isPro) {
    return (
      <Card title="API & Webhooks" desc="Programmatically access your sites." icon={Code}>
        <div className="text-center py-8">
          <Crown size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1C1E21] mb-1">Pro feature</p>
          <p className="text-xs text-[#65676B] mb-4">Upgrade to access API keys and webhook integrations.</p>
          <Link href="/upgrade" className={btnPrimary}>Upgrade to Pro</Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card title="API Key" desc="Use this key to authenticate API requests." icon={Code}>
        {apiKey ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-[#F0F2F5] border border-[#E4E6EB] rounded-lg p-3">
              <code className="flex-1 text-xs sm:text-sm font-mono text-[#1C1E21] truncate">{apiKey}</code>
              <button
                onClick={copy}
                className="shrink-0 p-2 rounded-lg hover:bg-white text-[#65676B] hover:text-[#1877F2]"
                aria-label="Copy API key"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button onClick={generate} disabled={generating} className={btnSecondary}>
              {generating ? "Generating…" : "Regenerate key"}
            </button>
          </div>
        ) : (
          <button onClick={generate} disabled={generating} className={btnPrimary}>
            <Zap size={14} />
            {generating ? "Generating…" : "Generate API key"}
          </button>
        )}
      </Card>

      <Card title="Webhooks" desc="POST events to a URL when orders or form submissions happen." icon={Webhook}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Endpoint URL</label>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className={inputCls + " font-mono text-xs sm:text-sm"} placeholder="https://your-server.com/webhook" />
          </div>
          <div className="bg-[#F0F2F5] rounded-lg p-3 text-xs text-[#65676B]">
            <p className="font-semibold text-[#1C1E21] mb-1">Events fired:</p>
            <ul className="space-y-1">
              <li>• <code className="font-mono">order.created</code> — new order placed</li>
              <li>• <code className="font-mono">form.submitted</code> — contact form submitted</li>
              <li>• <code className="font-mono">subscriber.added</code> — newsletter signup</li>
            </ul>
          </div>
          <button onClick={saveWebhook} disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Save webhook"}
          </button>
        </div>
      </Card>

      <Card title="API Documentation" icon={Code}>
        <div className="space-y-2 text-xs sm:text-sm text-[#65676B]">
          <p>Base URL: <code className="font-mono text-[#1C1E21] bg-[#F0F2F5] px-1.5 py-0.5 rounded break-all">https://api.storebuilder.ph/v1</code></p>
          <p>Auth header: <code className="font-mono text-[#1C1E21] bg-[#F0F2F5] px-1.5 py-0.5 rounded break-all">Authorization: Bearer YOUR_KEY</code></p>
          <p>Endpoints: <code className="font-mono">/sites</code>, <code className="font-mono">/orders</code>, <code className="font-mono">/contacts</code></p>
        </div>
      </Card>
    </>
  );
}

/* ---------- Branding ---------- */

function BrandingTab({ isPro }: any) {
  const [branding, setBranding] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile").then((r) => r.json()).then((d) => {
      if (d?.settings?.branding) setBranding(d.settings.branding);
    }).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { branding } }),
      });
      if (res.ok) toast.success("Branding saved");
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <>
      <Card title="Logo & Identity" desc="Used across all of your generated sites." icon={ImageIcon}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Brand name</label>
            <input value={branding.name || ""} onChange={(e) => setBranding({ ...branding, name: e.target.value })} className={inputCls} placeholder="Your business name" />
          </div>
          <div>
            <label className={labelCls}>Logo URL</label>
            <input value={branding.logoUrl || ""} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} className={inputCls + " font-mono text-xs sm:text-sm"} placeholder="https://..." />
            {branding.logoUrl && (
              <div className="mt-3 p-3 bg-[#F0F2F5] rounded-lg">
                <img src={branding.logoUrl} alt="Logo preview" className="max-h-16 max-w-full" />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Favicon URL</label>
            <input value={branding.faviconUrl || ""} onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })} className={inputCls + " font-mono text-xs sm:text-sm"} placeholder="https://..." />
          </div>
        </div>
      </Card>

      <Card title="Brand Colors" desc="Defaults for new sites. You can override per site in the editor." icon={ImageIcon}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["primary", "secondary", "accent", "text"] as const).map((k) => (
            <div key={k} className="flex items-center gap-3 p-3 bg-[#F0F2F5] rounded-lg">
              <input
                type="color"
                value={branding[k] || "#1877F2"}
                onChange={(e) => setBranding({ ...branding, [k]: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
              />
              <span className="text-xs font-medium text-[#65676B] capitalize">{k}</span>
              <span className="ml-auto text-[10px] text-[#8A8D91] font-mono">{branding[k] || "—"}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Watermark" desc="Show a 'Made with Storebuilder.ph' badge on your sites." icon={Shield}>
        <label className="flex items-center gap-3 p-3 bg-[#F0F2F5] rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={!!branding.showWatermark}
            onChange={(e) => setBranding({ ...branding, showWatermark: e.target.checked })}
            className="w-4 h-4"
            disabled={!isPro}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1C1E21]">Show watermark</p>
            <p className="text-xs text-[#65676B] mt-0.5">
              {isPro ? "Toggle to hide on Pro plan." : "Free plan always shows watermark. Upgrade to remove."}
            </p>
          </div>
        </label>
      </Card>

      <button onClick={save} disabled={saving} className={btnPrimary}>
        {saving ? "Saving…" : "Save branding"}
      </button>
    </>
  );
}
