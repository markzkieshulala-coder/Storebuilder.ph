"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Design tokens from the approved Stitch homepage, kept self-contained as explicit
// values so the global Tailwind theme used by the app/dashboard is untouched.
const FONT = "'Hanken Grotesk', sans-serif";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCno8phD_4jQFuVBFr1aAAqK9LYAoAylvhfI15TMW2a7UgmZ6lC1Az_BT6upDbxJd6lFSzwin2yiPDVyow0le2yvcs9vs8s8-8ErHIA_M-raeGpJvPu3RQB-c9CedITITyjgnMXLADcGb0XSrzakakRxb05oyhTihlqvfy1Zvgf7TZ5v5cvQHSW7AdLo_gxaHgqcMi0sfYH5pc2Bo8DN0i96rKLzsUZQchx0SQ-DA-GHRun9xKUWxZ7NtHskqE8WMCvobOEcGUsI5mU";
const SHOWCASE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDrV-cK-6nUbMsvl01YB2gc6iMaNmt17Y3IBRus4LnAYspQCDMYOpzw7SDP2s4TWDOLiHWcPgHSVUMIV390VUC4PjTnD44KQbx-3U7bw7N6YuP-j1x2QtCbdT9ihE828mRfHAw9c8-cYUMiYTgX2GYr7Bs6prNgjZBGrIkKrGX4pzpKTThJOAtdeK-ECDXfRRQBf1GXtfk9xfyflQlOrNjLCj4jDw5qO6A6Ehdr1QDrsF7G-zOwEmURx9Ffe97JwYsf-hwOu3Nx2v5J";
const FOOTER_LOGO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAopiJyBmsqt1bwkchhwtrMEbPcQLQg0yOPr4nEowpE4ugVs4tb2VsKJ2Gfgkwixrkn7rxXqvqwRtKfXhNPFDjl1jA3FuASNl_6WLyUcSfOrIf-GhzyCoxYBjgZ_HH-0KALzkWe7EDFllkj0hOO9c21bqZFFM4TnMOfCT1DU5frVBz22prHsybwYu67BngJrpngciU8B2dA1mIwOATWF0mc4LqvE4hmN4BeSw62aIYx9O8Zl5QAKKjvxF7jPHyMk_sUi4YkWMxnQoCP";
const VIDEO_POSTER = "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200";
const VIDEO_SRC = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const start = () => router.push(session ? "/dashboard" : "/auth/signin?callbackUrl=/dashboard");
  const login = () => router.push("/auth/signin?callbackUrl=/dashboard");

  const toggleVideo = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      v.controls = true;
      setPlaying(true);
    } else {
      v.pause();
      v.controls = false;
      setPlaying(false);
    }
  };

  const card = "bg-white p-8 rounded-xl border border-[#CED0D4] transition-all hover:shadow-lg hover:-translate-y-1";

  return (
    <div className="bg-[#f7f9fc] text-[#050505] overflow-x-hidden min-h-screen" style={{ fontFamily: FONT }}>
      {/* Top navigation */}
      <header
        className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 md:px-10 bg-[#f7f9fc] border-b border-[#CED0D4] h-[64px] transition-shadow ${
          scrolled ? "shadow-md" : ""
        }`}
      >
        <div className="flex items-center gap-8 max-w-[1280px] mx-auto w-full justify-between">
          <div className="text-[20px] leading-[28px] font-bold text-[#0058bc]">Storebuilder.ph</div>
          <nav className="hidden md:flex items-center gap-6">
            <a className="text-[#0058bc] font-bold border-b-2 border-[#0058bc] pb-1 text-[14px]" href="#">Home</a>
            <a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#features">About</a>
            <a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#cta">Pricing</a>
            <a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#footer">Contact</a>
          </nav>
          <div className="flex items-center gap-4">
            <button onClick={login} className="hidden md:block text-[#65676B] hover:text-[#0058bc] text-[12px] tracking-[0.01em] font-semibold px-4 py-2 transition-all">
              Log In
            </button>
          </div>
        </div>
      </header>

      <main className="pt-[64px]">
        {/* Hero */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden px-4 md:px-10 bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
            <div className="z-10">
              <h1 className="text-[40px] lg:text-[44px] mb-6 leading-tight font-bold tracking-[-0.02em]">
                Build your website with <span className="text-[#0058bc]">AI</span>
              </h1>
              <p className="text-[16px] leading-[24px] text-[#65676B] mb-8 max-w-lg">
                Transform your ideas into professional websites instantly using natural language prompts. Our AI handles the design and code so you can focus on your vision.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={start} className="bg-[#0058bc] text-white px-8 py-4 rounded-lg text-[20px] leading-[28px] font-semibold flex items-center justify-center gap-2 hover:bg-[#004493] transition-all">
                  Get Started <Icon name="arrow_forward" />
                </button>
                <button onClick={start} className="bg-[#d8e4f0] text-[#0058bc] px-8 py-4 rounded-lg text-[20px] leading-[28px] font-semibold hover:bg-[#c1c6d6] transition-all">
                  Watch Demo
                </button>
              </div>
              <div className="mt-8 flex items-center gap-4 text-[#65676B]">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-[#f7f9fc] bg-gray-200" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#f7f9fc] bg-gray-300" />
                  <div className="w-8 h-8 rounded-full border-2 border-[#f7f9fc] bg-gray-400" />
                </div>
                <span className="text-[12px] leading-[16px] font-semibold">Joined by 2,000+ local merchants</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#0058bc]/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-[#016c00]/10 rounded-full blur-3xl" />
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-[#CED0D4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="AI website builder showcase" className="w-full h-auto" src={HERO_IMG} />
              </div>
            </div>
          </div>
        </section>

        {/* Core features */}
        <section id="features" className="py-24 px-4 md:px-10 bg-[#f7f9fc]">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-xl">
                <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-bold mb-4">
                  Build your dream online store and run it immediately through our platform.
                </h2>
                <p className="text-[16px] leading-[24px] text-[#65676B]">
                  We&apos;ve removed the complexity of starting an online business so you can focus on growth.
                </p>
              </div>
              <button onClick={start} className="text-[#0058bc] font-bold flex items-center gap-2 hover:underline whitespace-nowrap">
                View Detailed Guide <Icon name="north_east" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {[
                { icon: "person_add", title: "Register your account", body: "Create your profile in seconds and get immediate access to our powerful AI-driven dashboard." },
                { icon: "palette", title: "Customize brand", body: "Use our AI to generate a unique brand identity, including logos, color schemes, and professional layouts." },
                { icon: "rocket", title: "Launch & Sell", body: "Go live with a single click and start accepting payments through integrated local gateways." },
              ].map((f) => (
                <div key={f.title} className={card}>
                  <span className="material-symbols-outlined text-[#0058bc] text-4xl mb-4 p-3 bg-[#d8e2ff] rounded-lg inline-block">{f.icon}</span>
                  <h3 className="text-[20px] leading-[28px] font-bold mb-3">{f.title}</h3>
                  <p className="text-[#65676B] text-[14px] leading-[20px]">{f.body}</p>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <h3 className="text-[20px] leading-[28px] font-bold text-[#050505]">Core Platform Features</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: "rocket_launch", title: "Lightning Fast Setup", body: "Go from zero to a fully functional online store in under 15 minutes. Our drag-and-drop builder requires no coding knowledge." },
                { icon: "shield_lock", title: "Secure Payments", body: "Simply provide your HitPay or PayMongo payment link and you can start selling immediately." },
                { icon: "smartphone", title: "Mobile-First Experience", body: "Your store will look stunning on every device. Fully responsive designs optimized for mobile shoppers." },
                { icon: "insights", title: "Powerful Analytics", body: "Real-time data at your fingertips. Track visitors, conversion rates, and inventory levels with ease." },
              ].map((f) => (
                <div key={f.title} className={card}>
                  <span className="material-symbols-outlined text-[#0058bc] text-4xl mb-4 p-3 bg-[#d8e2ff] rounded-lg inline-block">{f.icon}</span>
                  <h3 className="text-[20px] leading-[28px] font-bold mb-3">{f.title}</h3>
                  <p className="text-[#65676B] text-[14px] leading-[20px]">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio */}
        <section className="py-24 px-4 md:px-10 bg-[#f2f4f7]">
          <div className="max-w-[1280px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] text-[#050505] font-bold mb-6">
                  Showcase your services to your clients through a professional website portfolio
                </h2>
                <p className="text-[16px] leading-[24px] text-[#65676B] mb-8">
                  Whether you&apos;re a freelancer, agency, or creator, our platform allows you to upload and display your services, projects, and video reels in a professional gallery designed to impress your clients.
                </p>
                <button onClick={start} className="bg-[#0058bc] text-white px-8 py-4 rounded-lg text-[20px] leading-[28px] font-semibold hover:bg-[#004493] transition-all">
                  Explore Portfolio Features
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Services */}
                <div className="bg-white p-6 rounded-xl border border-[#CED0D4] transition-all hover:shadow-lg hover:-translate-y-1">
                  <span className="material-symbols-outlined text-[#0058bc] text-4xl mb-4">design_services</span>
                  <h4 className="text-[20px] leading-[28px] font-bold mb-2">Web Design Services</h4>
                  <p className="text-[#65676B] text-[14px] leading-[20px]">Professional consulting and design packages tailored for your clients.</p>
                </div>
                {/* Project Showcase */}
                <div className="bg-white rounded-xl border border-[#CED0D4] overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="h-40 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Project Showcase" className="w-full h-full object-cover block" src={SHOWCASE_IMG} />
                  </div>
                  <div className="p-4">
                    <h4 className="text-[16px] leading-[24px] font-bold">Project Showcase</h4>
                    <p className="text-[#65676B] text-sm">High-quality gallery for your best work.</p>
                  </div>
                </div>
                {/* Video Reel */}
                <div className="md:col-span-2 bg-white rounded-xl border border-[#CED0D4] overflow-hidden transition-all hover:shadow-lg">
                  <div className="relative group cursor-pointer" onClick={toggleVideo}>
                    <video ref={videoRef} className="w-full h-full object-cover aspect-video block" poster={VIDEO_POSTER} onEnded={() => { if (videoRef.current) videoRef.current.controls = false; setPlaying(false); }}>
                      <source src={VIDEO_SRC} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {!playing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-all duration-300">
                        <div className="bg-[#0058bc] text-white w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                          <span className="material-symbols-outlined text-5xl">play_arrow</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section id="cta" className="py-24 px-4 md:px-10 text-center bg-[#f2f4f7]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-[32px] leading-[40px] tracking-[-0.02em] font-bold mb-6">Ready to build your online empire?</h2>
            <p className="text-[16px] leading-[24px] text-[#65676B] mb-10">
              Join thousands of successful merchants and start your journey today with Storebuilder.ph.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={start} className="bg-[#0058bc] text-white px-10 py-4 rounded-lg text-[20px] leading-[28px] font-bold hover:shadow-xl transition-all">
                Sign Up
              </button>
            </div>
            <p className="mt-6 text-[12px] leading-[16px] text-[#65676B] font-semibold">No credit card required. Cancel anytime.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="footer" className="bg-[#f7f9fc] border-t border-[#CED0D4] py-16 px-4 md:px-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div className="w-16 h-16 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Storebuilder.ph Logo" className="w-full h-full object-cover" src={FOOTER_LOGO} />
              </div>
              <div className="text-[20px] leading-[28px] font-bold text-[#0058bc]">Storebuilder.ph</div>
              <p className="text-[#65676B] text-[14px] leading-[20px]">Empowering Filipino businesses with world-class e-commerce technology.</p>
            </div>
            {/* Company */}
            <div>
              <h4 className="text-[20px] leading-[28px] font-bold mb-6">Company</h4>
              <ul className="flex flex-col gap-4">
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#features">About Us</a></li>
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#footer">Contact</a></li>
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#cta">Pricing</a></li>
              </ul>
            </div>
            {/* Legal */}
            <div>
              <h4 className="text-[20px] leading-[28px] font-bold mb-6">Legal</h4>
              <ul className="flex flex-col gap-4">
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#">Terms of Service</a></li>
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#">Privacy Policy</a></li>
              </ul>
            </div>
            {/* Contact */}
            <div>
              <h4 className="text-[20px] leading-[28px] font-bold mb-6">Contact</h4>
              <ul className="flex flex-col gap-4">
                <li><a className="text-[#65676B] hover:text-[#0058bc] transition-colors text-[14px]" href="#">Send us a message</a></li>
                <li className="text-[#65676B] text-[14px]">Philippines 🇵🇭</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[#CED0D4] text-center">
            <p className="text-[#65676B] text-[14px] leading-[20px] mb-2">© 2026 Storebuilder.ph. All rights reserved. 🇵🇭</p>
            <p className="text-[#65676B] text-[12px] leading-[16px] font-semibold uppercase tracking-wider">Proudly built for Filipino entrepreneurs</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
