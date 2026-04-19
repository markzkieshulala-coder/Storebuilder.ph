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
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Product Sans', 'Google Sans', Roboto, system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Storebuilder.ph" width={30} height={30} />
            <span className="font-bold text-gray-900">Storebuilder<span style={{ color: BLUE }}>.ph</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Get in Touch</h1>
          <p className="text-gray-500 text-lg">Have a question? We are here to help.</p>
        </div>
      </section>

      <section className="py-14 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10">
          {/* Info */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h2>
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
                  <p className="text-xs text-gray-400 mt-0.5">We respond within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EBF3FF" }}>
                  <MapPin size={18} style={{ color: BLUE }} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Location</p>
                  <p className="text-sm text-gray-600">Philippines 🇵🇭</p>
                  <p className="text-xs text-gray-400 mt-0.5">Proudly built for the Filipino market</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 rounded-xl border border-gray-100" style={{ background: "#F7FAFF" }}>
              <p className="font-semibold text-gray-900 text-sm mb-2">Common questions</p>
              <ul className="space-y-1.5 text-sm text-gray-500">
                <li>• How do I upgrade to Pro?</li>
                <li>• How do I connect a custom domain?</li>
                <li>• I have a problem with my account</li>
                <li>• Requesting support</li>
                <li>• Partnership or collaboration</li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-7 shadow-sm">
            {sent ? (
              <div className="text-center py-10">
                <CheckCircle size={48} className="mx-auto mb-4" style={{ color: BLUE }} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h3>
                <p className="text-gray-500 text-sm mb-6">Thank you for your message. We will get back to you shortly.</p>
                <button
                  onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-sm font-medium hover:underline"
                  style={{ color: BLUE }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Send a message</h2>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
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
                    placeholder="How do I upgrade to Pro?"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                    onFocus={(e) => e.target.style.borderColor = BLUE}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your question or concern..."
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
                    <><Send size={15} /> Send message</>
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
