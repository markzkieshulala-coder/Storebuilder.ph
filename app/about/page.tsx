import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About Us — Storebuilder.ph | AI Website Builder Philippines",
  description:
    "Storebuilder.ph is the first AI-powered website builder made specifically for the Philippines. Founded by Mark Ocdenaria, our mission is to help Filipino entrepreneurs build beautiful websites in seconds.",
  openGraph: {
    title: "About Storebuilder.ph — Built for Filipino Entrepreneurs",
    description: "Learn about our mission to help Filipino small business owners build professional websites with AI. No coding required.",
    url: "https://storebuilder.ph/about",
  },
};

const BLUE = "#1877F2";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={30} height={30} />
            <span className="font-bold text-gray-900">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link href="/about" className="transition-colors" style={{ color: BLUE }}>About Us</Link>
            <Link href="/upgrade" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
          <Link href="/auth/register" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 text-center" style={{ background: "linear-gradient(180deg, #EBF3FF 0%, #fff 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ background: "#EBF3FF", color: BLUE, border: "1px solid #c7dcfd" }}>
            🇵🇭 Proudly Filipino
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Built for <span style={{ color: BLUE }}>Filipino Entrepreneurs</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Our mission is simple: help every Filipino entrepreneur get a beautiful website — fast, easy, and affordable.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Storebuilder.ph</strong> is the first AI-powered website builder built specifically for the Philippines. We believe every Filipino entrepreneur and small business owner deserves a beautiful, professional website — no coding skills needed, no big budget required.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Founded by <strong>Mark Ocdenaria</strong>, Storebuilder.ph was born from a simple question: "Why is it so hard for Filipino business owners to build a website?" Our answer was to make it effortless using the power of artificial intelligence.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We are based in the Philippines and proudly built for the Filipino market, with support for GCash, Maya, Philippine Peso pricing, and locally relevant content.
              </p>
            </div>
            <div className="rounded-2xl p-8 text-center" style={{ background: "#EBF3FF" }}>
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Help every Filipino entrepreneur get online in minutes — using AI, for free, without the complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "3", label: "Free generations per month" },
              { value: "16+", label: "Website section types" },
              { value: "6", label: "Business categories" },
              { value: "100%", label: "Made for the Philippines" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="text-3xl font-bold mb-1" style={{ color: BLUE }}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "🇵🇭", title: "Filipino First", desc: "Every decision we make is focused on the Filipino market — GCash, Peso pricing, and local culture." },
              { emoji: "⚡", title: "Simplicity", desc: "Technology should be a tool, not an obstacle. We make everything simple for everyone." },
              { emoji: "💙", title: "Accessible to All", desc: "We believe every business owner, big or small, deserves a professional online presence." },
            ].map((v) => (
              <div key={v.title} className="p-6 rounded-xl border border-gray-100 text-center">
                <div className="text-3xl mb-3">{v.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-14 px-4" style={{ background: "#F7FAFF" }}>
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ background: "#EBF3FF" }}>
            👨‍💻
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Mark Ocdenaria</h3>
          <p className="text-sm font-medium mb-4" style={{ color: BLUE }}>Founder, Storebuilder.ph</p>
          <p className="text-gray-600 text-sm leading-relaxed max-w-xl mx-auto">
            "My dream is to see every Filipino entrepreneur with their own website — a professional online presence that shows their business to the world. At Storebuilder.ph, we make that possible for everyone."
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1464d8 100%)` }}>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Start building your website today</h2>
        <p className="text-blue-100 mb-8">Free. No credit card. No code. For every Filipino.</p>
        <Link href="/auth/register" className="inline-flex items-center gap-2 px-7 py-3 bg-white rounded-lg font-semibold text-sm" style={{ color: BLUE }}>
          Get started free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built with 💙 in the Philippines by Mark Ocdenaria</p>
      </footer>
    </div>
  );
}
