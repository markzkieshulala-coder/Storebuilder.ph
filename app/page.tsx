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
  "Online shoe store para sa Pilipinas na may eleganteng disenyo",
  "Filipino restaurant na may mainit at makulay na kulay",
  "Photography portfolio na minimalist at modern",
  "Barbershop na may makulay at lakas na feel",
  "Online store na nagbebenta ng handmade jewelry",
  "Modern dental clinic website para sa Cebu",
  "Personal trainer landing page na may energy",
  "Coffee shop na tinatawag na Brew & Co",
];

const EXAMPLE_WEBSITES = [
  { name: "Ethica", type: "Shoe Store", bg: "#EBF3FF", accent: BLUE },
  { name: "Brew & Co", type: "Coffee Shop", bg: "#FFF7EB", accent: "#F59E0B" },
  { name: "KingsCut", type: "Barbershop", bg: "#EBF3FF", accent: BLUE },
  { name: "Lumen", type: "Photography", bg: "#F3F4F6", accent: "#374151" },
  { name: "Selah", type: "Wellness Studio", bg: "#ECFDF5", accent: "#10B981" },
  { name: "Solana", type: "Jewelry Store", bg: "#F5F3FF", accent: "#7C3AED" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Gumawa sa loob ng ilang segundo",
    description: "I-type ang iyong idea, i-click ang generate. Makakuha ng kumpletong magandang website agad — hindi kailangan ng design skills.",
  },
  {
    icon: Globe,
    title: "Ginawa para sa Pilipinas",
    description: "GCash payments, presyo sa ₱, Filipino aesthetics. Lahat ng kailangan ng iyong lokal na negosyo.",
  },
  {
    icon: Sparkles,
    title: "AI na nagdidisenyo, hindi template",
    description: "Bawat website ay natatanging nilikha ng Claude AI. Walang cookie-cutter templates. Tunay na creative output.",
  },
  {
    icon: Shield,
    title: "I-edit ang lahat nang biswal",
    description: "Mag-drag, mag-drop, mag-click para mag-edit. Palitan ang teksto, larawan, kulay — lahat nang walang code.",
  },
];

const FAQS = [
  {
    q: "Kailangan ba ng coding skills?",
    a: "Hindi talaga. I-type mo lang ang gusto mo at gagawin ng AI para sa iyo. Pagkatapos, i-click ang anumang bahagi para i-edit.",
  },
  {
    q: "Ilang website ang magagawa ko?",
    a: "Ang mga free users ay makakakuha ng 3 AI generations bawat araw. Ang Pro users ay unlimited ang generations.",
  },
  {
    q: "Pwede ko bang gamitin ang sarili kong domain?",
    a: "Oo! Ang Pro users ay maaaring mag-connect ng custom domain (hal. yournegosyo.com). Ang Free users ay makakakuha ng libreng subdomain sa storebuilder.ph.",
  },
  {
    q: "Anong payment methods ang sinusuportahan?",
    a: "GCash, Maya, GoTyme, credit/debit cards, at BancNet — lahat ng Philippine payment methods.",
  },
  {
    q: "Mobile-friendly ba ang mga website?",
    a: "Oo! Bawat generated website ay fully responsive at maganda sa mobile, tablet, at desktop.",
  },
  {
    q: "Maaari ko bang i-edit ang aking website pagkatapos gumawa?",
    a: "Oo! Ang pag-edit ay ganap na libre at walang limitasyon. Gamitin ang aming drag-and-drop editor para sa anumang pagbabago.",
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
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', sans-serif" }}>
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
            <span>Ang #1 AI website builder para sa mga Pilipino</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight tracking-tight text-gray-900">
            Gumawa ng website{" "}
            <span style={{ color: BLUE }}>sa ilang segundo</span>{" "}
            gamit ang AI
          </h1>

          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            I-type ang iyong negosyo. Makakuha ng kumpletong, magandang, at fully editable na website — agad. Para sa lahat ng Filipino entrepreneur.
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
            Libre magsimula · Walang credit card · 3 generations per day free
          </p>
        </motion.div>
      </section>

      {/* Example websites */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-bold mb-2 text-gray-900">
            Tingnan ang mga nagagawa
          </h2>
          <p className="text-center text-gray-500 mb-10">AI-generated websites — hindi templates</p>
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
                <div className="h-44 p-6 flex flex-col justify-between" style={{ background: site.bg }}>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block"
                    style={{ background: `${site.accent}18`, color: site.accent }}
                  >
                    {site.type}
                  </span>
                  <div>
                    <h3 className="text-2xl font-bold" style={{ color: site.accent }}>{site.name}</h3>
                    <div className="flex gap-1 mt-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-1 rounded-full flex-1 opacity-20" style={{ background: site.accent }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-100">
                  <span className="text-xs text-gray-400">AI Generated</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Sparkles size={11} />
                    Unique design
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
              Lahat ng kailangan mo para{" "}
              <span style={{ color: BLUE }}>mag-online</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Mula sa AI generation hanggang sa pag-publish — lahat sa isang lugar, ginawa para sa Filipino businesses.
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
            Tatlong hakbang lang
          </h2>
          <div className="space-y-8">
            {[
              { step: "01", title: "Ilarawan ang iyong website", desc: "Sabihin sa AI kung anong uri ng website ang kailangan mo. Maaaring specific o general — nauunawaan nito." },
              { step: "02", title: "Gumawa ang AI agad", desc: "Gumagawa ang Claude AI ng kumpletong, natatanging website na may custom sections, colors, content, at layout sa loob ng ilang segundo." },
              { step: "03", title: "I-edit, i-publish, at lumago", desc: "I-click ang kahit anong bahagi para i-edit. I-publish agad ang iyong site sa libreng subdomain o sa iyong sariling custom domain." },
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
            <h2 className="text-2xl md:text-4xl font-bold mb-2 text-gray-900">Simple, malinaw na presyo</h2>
            <p className="text-gray-500">Magsimula nang libre. Mag-upgrade kapag handa ka na.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Free */}
            <div className="p-7 rounded-xl border border-gray-200 bg-white">
              <h3 className="text-lg font-bold mb-1 text-gray-900">Free</h3>
              <div className="text-4xl font-bold text-gray-900 mb-1">₱0 <span className="text-base font-normal text-gray-400">/ forever</span></div>
              <p className="text-xs text-gray-400 mb-5">Walang credit card na kailangan</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "3 AI website generations per day",
                  "Unlimited editing",
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
              <div className="text-4xl font-bold text-gray-900 mb-1">₱999 <span className="text-base font-normal text-gray-400">/ month</span></div>
              <p className="text-xs text-gray-400 mb-5">o ₱8,999/year (makatipid ng 25%)</p>
              <ul className="space-y-2.5 mb-7">
                {[
                  "Unlimited AI website generations",
                  "Unlimited editing",
                  "Custom domain connection",
                  "All editor features",
                  "Powered by Claude Sonnet (mas matalino)",
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
            "Nagawa ko ang website ng aking barbershop sa loob ng 3 minuto. Ang aking mga kliyente ay maaari nang mag-book online. Sobrang ganda ng result!"
          </p>
          <p className="text-gray-400 text-sm">— Carlo M., Kings Cut Barbershop, Quezon City</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-900">Mga madalas na tanong</h2>
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
            Ang iyong website ay 30 segundo na lang
          </h2>
          <p className="text-blue-100 text-base mb-8">Libre magpakailanman. Walang credit card. Walang code.</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white rounded-lg font-semibold text-base transition-opacity hover:opacity-90"
            style={{ color: BLUE }}
          >
            Gumawa ng website ko ngayon
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
                Ang #1 AI-powered website builder para sa mga Filipino entrepreneur at small business owners.
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
