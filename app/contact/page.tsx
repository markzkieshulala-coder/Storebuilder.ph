"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Send, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const BLUE = "#1877F2";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    // Simulate send — replace with actual API/email service
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you soon.");
  }

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
            <Link href="/about" className="hover:text-blue-600 transition-colors">About Us</Link>
            <Link href="/upgrade" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/contact" className="transition-colors" style={{ color: BLUE }}>Contact</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
          <Link href="/auth/register" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: BLUE }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-14 px-4 text-center" style={{ background: "linear-gradient(180deg, #EBF3FF 0%, #fff 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Makipag-ugnayan sa amin</h1>
          <p className="text-gray-500 text-lg">Mayroon kang katanungan? Nandito kami para tumulong.</p>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10">
          {/* Info */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Impormasyon sa Pakikipag-ugnayan</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF3FF" }}>
                  <Mail size={18} style={{ color: BLUE }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Email</p>
                  <a href="mailto:Storebuilderph@gmail.com" className="text-sm hover:underline" style={{ color: BLUE }}>
                    Storebuilderph@gmail.com
                  </a>
                  <p className="text-xs text-gray-400 mt-0.5">Sumasagot kami sa loob ng 24 na oras</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF3FF" }}>
                  <MapPin size={18} style={{ color: BLUE }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Lokasyon</p>
                  <p className="text-sm text-gray-600">Pilipinas 🇵🇭</p>
                  <p className="text-xs text-gray-400 mt-0.5">Proudly built for the Filipino market</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 rounded-xl border border-gray-100" style={{ background: "#F7FAFF" }}>
              <p className="font-semibold text-gray-900 text-sm mb-2">Mga karaniwang katanungan</p>
              <ul className="space-y-1.5 text-sm text-gray-500">
                <li>• Paano mag-upgrade sa Pro?</li>
                <li>• Paano mag-connect ng custom domain?</li>
                <li>• May problema sa aking account</li>
                <li>• Gusto ko ng refund</li>
                <li>• Partnership o collaboration</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-7 shadow-sm">
            {sent ? (
              <div className="text-center py-10">
                <CheckCircle size={48} className="mx-auto mb-4" style={{ color: BLUE }} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                <p className="text-gray-500 text-sm mb-6">Salamat sa iyong mensahe. Makikipag-ugnayan kami sa iyo sa lalong madaling panahon.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: BLUE }}
                >
                  Magpadala ng isa pa
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Magpadala ng mensahe</h2>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pangalan</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Juan dela Cruz"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 transition-all"
                    style={{ ["--tw-ring-color" as string]: `${BLUE}40` }}
                    onFocus={(e) => e.target.style.borderColor = BLUE}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="juan@example.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                    onFocus={(e) => e.target.style.borderColor = BLUE}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Paano ko mag-upgrade sa Pro?"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                    onFocus={(e) => e.target.style.borderColor = BLUE}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mensahe</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Ilarawan ang iyong katanungan o concern..."
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none resize-none transition-all"
                    onFocus={(e) => e.target.style.borderColor = BLUE}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3 rounded-lg font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: BLUE }}
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Send size={15} /> Magpadala ng mensahe</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm mt-8">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/upgrade" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
        </div>
        <p className="text-gray-600 text-xs">© 2025 Storebuilder.ph · Built with 💙 in the Philippines</p>
      </footer>
    </div>
  );
}
