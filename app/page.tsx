"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, Globe, Shield, Star, ChevronDown, Check, X, Sparkles } from "lucide-react";

const BLUE = "#1877F2";

const EXAMPLE_PROMPTS = [
  "Online shoe store with elegant and modern design",
  "Filipino restaurant with warm and vibrant colors",
  "Minimalist and modern photography portfolio",
  "Barbershop with bold and energetic design",
  "Online store selling handmade jewelry",
  "Modern dental clinic website for Cebu",
  "Personal trainer landing page with energy",
  "Coffee shop called Brew and Co",
];

const EXAMPLE_WEBSITES = [
  {
    name: "Ethica", type: "Shoe Store",
    navBg: "#fff", navText: "#6b7280",
    heroBg: "#1877F2", heroText: "#fff",
    accent: "#1877F2", tagline: "Premium Footwear",
    btnBg: "#fff", btnText: "#1877F2",
    contentBg: "#EBF3FF",
  },
  {
    name: "Brew & Co", type: "Coffee Shop",
    navBg: "#1C0A00", navText: "#d1d5db",
    heroBg: "#3D1A00", heroText: "#fff",
    accent: "#F59E0B", tagline: "Artisan Coffee",
    btnBg: "#F59E0B", btnText: "#111",
    contentBg: "#FFF7EB",
  },
  {
    name: "KingsCut", type: "Barbershop",
    navBg: "#111", navText: "#d1d5db",
    heroBg: "#111", heroText: "#fff",
    accent: "#F59E0B", tagline: "Premium Cuts",
    btnBg: "#F59E0B", btnText: "#111",
    contentBg: "#F3F4F6",
  },
  {
    name: "Lumen", type: "Photography",
    navBg: "#fff", navText: "#6b7280",
    heroBg: "#111827", heroText: "#fff",
    accent: "#374151", tagline: "Capture Life",
    btnBg: "#fff", btnText: "#111827",
    contentBg: "#F9FAFB",
  },
  {
    name: "Selah", type: "Wellness Studio",
    navBg: "#fff", navText: "#6b7280",
    heroBg: "#065F46", heroText: "#fff",
    accent: "#10B981", tagline: "Find Your Balance",
    btnBg: "#10B981", btnText: "#fff",
    contentBg: "#ECFDF5",
  },
  {
    name: "Solana", type: "Jewelry Store",
    navBg: "#fff", navText: "#6b7280",
    heroBg: "#4C1D95", heroText: "#fff",
    accent: "#7C3AED", tagline: "Timeless Pieces",
    btnBg: "#7C3AED", btnText: "#fff",
    contentBg: "#F5F3FF",
  },
];

function MiniWebsitePreview({ site }: { site: (typeof EXAMPLE_WEBSITES)[0] }) {
  return (
    <div style={{ height: "176px", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          width: "900px",
          transform: "scale(0.35)",
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif",
        }}
      >
        {/* Mini navbar */}
        <div
          style={{
            height: "52px",
            background: site.navBg,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            padding: "0 32px",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 800, color: site.accent, fontSize: "22px" }}>{site.name}</span>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            {["Home", "Products", "About", "Contact"].map((item) => (
              <span key={item} style={{ fontSize: "15px", color: site.navText }}>{item}</span>
            ))}
            <span
              style={{
                fontSize: "15px",
                background: site.accent,
                color: "#fff",
                padding: "8px 20px",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              Shop Now
            </span>
          </div>
        </div>
        {/* Hero */}
        <div
          style={{
            height: "220px",
            background: site.heroBg,
            display: "flex",
            alignItems: "center",
            padding: "0 40px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "44px",
                fontWeight: 800,
                color: site.heroText,
                marginBottom: "14px",
                lineHeight: 1.1,
              }}
            >
              {site.tagline}
            </div>
            <div style={{ fontSize: "18px", color: site.heroText, opacity: 0.75, marginBottom: "24px" }}>
              Discover your perfect collection
            </div>
            <div
              style={{
                background: site.btnBg,
                color: site.btnText,
                padding: "14px 32px",
                borderRadius: "10px",
                display: "inline-block",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              Shop Now
            </div>
          </div>
        </div>
        {/* Product row */}
        <div style={{ padding: "28px 32px", background: site.contentBg }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginBottom: "16px" }}>
            Featured Collection
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                style={{
                  flex: 1,
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    height: "80px",
                    background: site.accent,
                    opacity: 0.15,
                    borderRadius: "8px",
                    marginBottom: "12px",
                  }}
                />
                <div style={{ height: "14px", background: "#e5e7eb", borderRadius: "4px", marginBottom: "8px", width: "80%" }} />
                <div style={{ height: "12px", background: "#e5e7eb", borderRadius: "4px", width: "50%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Build in seconds",
    description: "Type your idea, click generate. Get a complete beautiful website instantly. No design skills needed.",
  },
  {
    icon: Globe,
    title: "Built for the Philippines",
    description: "GCash payments, prices in Philippine Peso, local aesthetics. Everything your business needs to go online.",
  },
  {
    icon: Sparkles,
    title: "AI-designed, not templated",
    description: "Every website is uniquely created by Claude AI. No cookie-cutter templates. Truly creative output.",
  },
  {
    icon: Shield,
    title: "Edit everything visually",
    description: "Click any element to edit. Change text, images, colors — all without writing code.",
  },
];

const FAQS = [
  {
    q: "Do I need coding skills?",
    a: "Not at all. Just type what you want and the AI builds it for you. Then click any element to edit.",
  },
  {
    q: "How many websites can I create?",
    a: "Free users get 3 AI generations per month. Pro users get 30 AI generations per day.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes! Pro users can connect a custom domain (e.g. yourbusiness.com). Free users get a free subdomain at storebuilder.ph.",
  },
  {
    q: "What payment methods are supported?",
    a: "GCash, Maya, GoTyme, credit/debit cards, and BancNet — all major Philippine payment methods.",
  },
  {
    q: "Are the websites mobile-friendly?",
    a: "Yes! Every generated website is fully responsive and looks great on mobile, tablet, and desktop.",
  },
  {
    q: "Can I edit my website after creating it?",
    a: "Yes! Editing is completely free. Use the drag-and-drop editor to make any changes you want.",
  },
];

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [displayedPrompt, setDisplayedPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (prompt) return;
    const currentExample = EXAMPLE_PROMPTS[currentPromptIndex];
    let charIndex = 0;
    setIsTyping(true);
    const typeInterval = setInterval(() => {
      if (charIndex <= currentExample.length) {
        setDisplayedPrompt(currentExample.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTimeout(() => {
          setCurrentPromptIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
        }, 2000);
      }
    }, 38);
    return () => clearInterval(typeInterval);
  }, [currentPromptIndex, prompt]);

  async function handleGenerate() {
    const finalPrompt = prompt || displayedPrompt;
    if (!finalPrompt.trim()) return;
    if (!session) {
      router.push(`/auth/signin?callbackUrl=/dashboard`);
      return;
    }
    setIsGenerating(true);
    router.push(`/dashboard?generate=${encodeURIComponent(finalPrompt)}`);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph logo" width={32} height={32} />
            <span className="font-bold text-lg text-gray-900" style={{ letterSpacing: "-0.02em" }}>
              Storebuilder<span style={{ color: BLUE }}>.ph</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: BLUE }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                  style={{ backgroundColor: BLUE }}
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4 text-center" style={{ background: "linear-gradient(180deg, #EBF3FF 0%, #fff 100%)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: "#EBF3FF", color: BLUE, border: `1px solid #c7dcfd` }}
          >
            <span>🇵🇭</span>
            <span>#1 AI Website Builder for Filipino Businesses</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight tracking-tight text-gray-900">
            Build your website{" "}
            <span style={{ color: BLUE }}>in seconds</span>{" "}
            with AI
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Describe your business. Get a complete, beautiful, fully editable website instantly. Made for every Filipino entrepreneur.
          </p>

          {/* Prompt input */}
          <div className="max-w-2xl mx-auto">
            <div className="prompt-glow rounded-xl bg-white border border-gray-200 p-2 flex gap-2 shadow-sm">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder={isTyping ? displayedPrompt + "|" : displayedPrompt}
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 outline-none text-base"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-3 rounded-lg font-semibold text-white flex items-center gap-2 transition-opacity disabled:opacity-60 whitespace-nowrap"
                style={{ backgroundColor: BLUE }}
              >
                {isGenerating ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["Shoe store", "Restaurant", "Photography", "Barbershop", "Online store", "Salon"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setPrompt(chip)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 bg-white transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-gray-400 text-sm">
            Free to start · No credit card · 3 free generations per month
          </p>
        </motion.div>
      </section>

      {/* Example websites */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-2 text-gray-900">
            See what you can build
          </h2>
          <p className="text-center text-gray-500 mb-10">AI-generated websites, not templates</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {EXAMPLE_WEBSITES.map((site, i) => (
              <motion.div
                key={site.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="website-card rounded-xl overflow-hidden border border-gray-100 cursor-pointer"
              >
                <MiniWebsitePreview site={site} />
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-100">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">{site.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{site.type}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Sparkles size={11} />
                    AI Generated
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-3 text-gray-900">
              Everything you need to{" "}
              <span style={{ color: BLUE }}>go online</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              From AI generation to publishing — all in one place, built for Filipino businesses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "#EBF3FF" }}
                >
                  <f.icon size={20} style={{ color: BLUE }} />
                </div>
                <h3 className="text-base font-semibold mb-1.5 text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-2xl md:text-4xl font-bold mb-12 text-gray-900">
            Just 3 steps
          </h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Describe your website", desc: "Tell the AI what kind of website you need. Be specific or general — it understands." },
              { step: "02", title: "AI builds it instantly", desc: "Claude AI creates a complete, unique website with custom sections, colors, content, and layout in seconds." },
              { step: "03", title: "Edit, publish, and grow", desc: "Click any element to edit. Publish instantly on a free subdomain or your own custom domain." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex gap-5 items-start"
              >
                <div className="text-4xl font-bold shrink-0 w-12" style={{ color: "#EBF3FF", WebkitTextStroke: `1px ${BLUE}` }}>
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1 text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 text-gray-900">Simple, transparent pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you are ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="p-7 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-bold mb-1 text-gray-900">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">₱0 <span className="text-base font-normal text-gray-400">/ forever</span></div>
              <p className="text-xs text-gray-400 mb-5">No credit card required</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "3 AI website generations per month",
                  "Limited editing",
                  "Free subdomain (yourname.storebuilder.ph)",
                  "All editor features",
                  "Powered by Claude Haiku",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                    {item}
                  </li>
                ))}
                {["Custom domain", "Remove branding"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <X size={15} className="mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="block text-center py-2.5 px-5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors">
                Get started free
              </Link>
            </div>

            {/* Pro */}
            <div className="p-7 rounded-xl border-2 bg-white relative overflow-hidden" style={{ borderColor: BLUE }}>
              <div
                className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: BLUE }}
              >
                POPULAR
              </div>
              <h3 className="text-lg font-bold mb-1 text-gray-900">Pro</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">₱499 <span className="text-base font-normal text-gray-400">/ month</span></div>
              <p className="text-xs text-gray-400 mb-5">or ₱4,299/year (save 25%)</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "30 AI website generations per day",
                  "Unlimited editing",
                  "Custom domain connection",
                  "All editor features",
                  "Powered by Claude Sonnet (smarter AI)",
                  "Priority support",
                  "Remove Storebuilder.ph branding",
                  "Advanced section library",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <Check size={15} className="mt-0.5 shrink-0" style={{ color: BLUE }} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/upgrade"
                className="block text-center py-2.5 px-5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: BLUE }}
              >
                Start Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 px-4 bg-white text-center">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={18} className="fill-amber-400 text-amber-400" />)}
          </div>
          <p className="text-gray-600 italic mb-3 text-base">
            "I built my barbershop website in under 3 minutes. My clients can now book online. The results are amazing!"
          </p>
          <p className="text-gray-400 text-sm">Carlo M., Kings Cut Barbershop, Quezon City</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-sm text-gray-900">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform shrink-0 ml-4 ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 text-center" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1464d8 100%)` }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Your website is 30 seconds away
          </h2>
          <p className="text-blue-100 text-base mb-8">Free forever. No credit card. No code.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white rounded-lg font-semibold text-base transition-opacity hover:opacity-90"
            style={{ color: BLUE }}
          >
            Build my website now
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo.svg" alt="Storebuilder.ph" width={28} height={28} />
                <span className="font-bold text-white">Storebuilder<span style={{ color: "#60a5fa" }}>.ph</span></span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                The #1 AI-powered website builder for Filipino entrepreneurs and small business owners.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Company</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-3">Contact</p>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:Storebuilderph@gmail.com" className="hover:text-white transition-colors">Storebuilderph@gmail.com</a></li>
                <li><span>Philippines 🇵🇭</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© 2025 Storebuilder.ph. All rights reserved. 🇵🇭</p>
            <p className="text-xs text-gray-600">Proudly built for Filipino entrepreneurs by Mark Ocdenaria</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
