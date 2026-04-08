import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About Us — Storebuilder.ph | AI Website Builder Philippines",
  description:
    "Storebuilder.ph is the first AI-powered website builder made specifically for the Philippines. Founded by Mark Ocdenaria, our mission is to help Filipino entrepreneurs build beautiful websites in seconds.",
  openGraph: {
    title: "About Storebuilder.ph — Built for Filipino Entrepreneurs",
    description: "Learn about our mission to help Filipino small business owners build professional websites with AI — no coding required.",
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
            Ginawa para sa mga <span style={{ color: BLUE }}>Pilipinong Negosyante</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed">
            Ang aming misyon ay simple: tulungan ang bawat Filipino entrepreneur na magkaroon ng magandang website — mabilis, madali, at abot-kaya.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-14 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ang Aming Kwento</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Ang <strong>Storebuilder.ph</strong> ang unang AI-powered website builder na ginawa nang tiyak para sa Pilipinas. Naniniwala kami na ang bawat Filipino entrepreneur at small business owner ay may karapatang magkaroon ng magandang, propesyonal na website — kahit walang coding skills at kahit maliit ang budget.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Itinatag ni <strong>Mark Ocdenaria</strong>, ang Storebuilder.ph ay ipinanganak mula sa isang simpleng katanungan: "Bakit napakahirap para sa mga Pilipinong negosyante na gumawa ng website?" Ang sagot namin — ang gawing madali ito gamit ang kapangyarihan ng artificial intelligence.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Nakabase kami sa Pilipinas at ipinagmamalaki naming itayo para sa Filipino market — na may suporta para sa GCash, Maya, presyo sa Philippine Peso, at content na angkop sa lokal na kultura.
              </p>
            </div>
            <div className="rounded-2xl p-8 text-center" style={{ background: "#EBF3FF" }}>
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ang Aming Misyon</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Tulungan ang bawat Filipino entrepreneur na mag-online sa loob ng ilang minuto — gamit ang AI, nang libre, at nang walang komplikasyon.
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
              { value: "3", label: "Free generations per day" },
              { value: "16+", label: "Website section types" },
              { value: "6", label: "Business categories" },
              { value: "100%", label: "Gawa para sa Pilipinas" },
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
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Ang Aming mga Pagpapahalaga</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: "🇵🇭", title: "Filipino First", desc: "Lahat ng aming desisyon ay nakatuon sa pangangailangan ng Filipino market — GCash, Peso pricing, at lokal na kultura." },
              { emoji: "⚡", title: "Simplisidad", desc: "Ang teknolohiya ay dapat maging kasangkapan, hindi sagabal. Ginawa naming madali ang lahat para sa lahat ng Pilipino." },
              { emoji: "💙", title: "Accessible para sa Lahat", desc: "Naniniwala kami na ang bawat negosyante, malaki man o maliit, ay may karapatang magkaroon ng propesyonal na online presence." },
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
            "Pangarap kong makita ang bawat Filipino entrepreneur na may sariling website — isang propesyonal na online presence na nagpapakita ng kanilang negosyo sa buong mundo. Sa Storebuilder.ph, ginagawa naming posible ito para sa lahat."
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #1464d8 100%)` }}>
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Simulan na ang iyong website</h2>
        <p className="text-blue-100 mb-8">Libre. Walang credit card. Walang code. Para sa lahat ng Pilipino.</p>
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
