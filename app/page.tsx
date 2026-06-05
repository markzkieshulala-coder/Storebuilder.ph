"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const HOME_VARS: CSSProperties = {
  // Override the shadcn primary so `bg-primary` / `text-primary` resolve to
  // the marketing blue (#0058bc) within the home page only.
  ["--primary" as string]: "212 100% 37%",
  ["--primary-foreground" as string]: "0 0% 100%",
  ["--ring" as string]: "212 100% 37%",
};

export default function HomePage() {
  const { data: session } = useSession();
  const [videoPlaying, setVideoPlaying] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startHref = session ? "/dashboard" : "/auth/register";

  // Add a subtle shadow to the header once the user scrolls past 100px.
  useEffect(() => {
    const onScroll = () => {
      const header = headerRef.current;
      if (!header) return;
      if (window.pageYOffset > 100) header.classList.add("shadow-md");
      else header.classList.remove("shadow-md");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      video.setAttribute("controls", "true");
      setVideoPlaying(true);
    } else {
      video.pause();
      video.removeAttribute("controls");
      setVideoPlaying(false);
    }
  }

  function handleVideoEnded() {
    const video = videoRef.current;
    if (video) {
      video.removeAttribute("controls");
      video.load();
    }
    setVideoPlaying(false);
  }

  return (
    <div
      className="bg-background text-text-primary overflow-x-hidden font-hanken scroll-smooth"
      style={HOME_VARS}
    >
      {/* Top Navigation Bar */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-margin-mobile md:px-margin-desktop bg-surface dark:bg-surface-dim border-b border-border-subtle dark:border-outline-variant h-[64px] transition-shadow"
      >
        <div className="flex items-center gap-8 max-w-container-max mx-auto w-full justify-between">
          <div className="text-headline-md font-bold text-primary dark:text-primary-fixed">
            Storebuilder.ph
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              className="text-primary font-bold border-b-2 border-primary pb-1 text-body-md"
              href="/"
            >
              Home
            </Link>
            <a
              className="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md"
              href="#about"
            >
              About
            </a>
            <Link
              className="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md"
              href="/upgrade"
            >
              Pricing
            </Link>
            <a
              className="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md"
              href="mailto:hello@storebuilder.ph"
            >
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="hidden md:block text-text-secondary hover:text-primary text-label-sm font-semibold px-4 py-2 transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden md:block text-text-secondary hover:text-primary text-label-sm font-semibold px-4 py-2 transition-all"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-[64px]">
        {/* Hero Section */}
        <section className="relative min-h-[80vh] flex items-center overflow-hidden px-margin-mobile md:px-margin-desktop bg-surface">
          <div className="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
            <div className="z-10">
              <h1 className="text-[40px] md:text-headline-lg mb-6 leading-tight font-bold">
                Build your website with <span className="text-primary">AI</span>
              </h1>
              <p className="text-body-lg text-text-secondary mb-8 max-w-lg">
                Transform your ideas into professional websites instantly using
                natural language prompts. Our AI handles the design and code so
                you can focus on your vision.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={startHref}
                  className="bg-primary text-on-primary px-8 py-4 rounded-lg text-headline-md font-semibold flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-all"
                >
                  Get Started{" "}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <a
                  href="#demo"
                  className="bg-secondary-container text-primary px-8 py-4 rounded-lg text-headline-md font-semibold hover:bg-outline-variant transition-all text-center"
                >
                  Watch Demo
                </a>
              </div>
              <div className="mt-8 flex items-center gap-4 text-text-secondary">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-gray-200" />
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-gray-300" />
                  <div className="w-8 h-8 rounded-full border-2 border-surface bg-gray-400" />
                </div>
                <span className="text-label-sm font-semibold">
                  Joined by 2,000+ local merchants
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl" />
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="AI website builder showcase"
                  className="w-full h-auto"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCno8phD_4jQFuVBFr1aAAqK9LYAoAylvhfI15TMW2a7UgmZ6lC1Az_BT6upDbxJd6lFSzwin2yiPDVyow0le2yvcs9vs8s8-8ErHIA_M-raeGpJvPu3RQB-c9CedITITyjgnMXLADcGb0XSrzakakRxb05oyhTihlqvfy1Zvgf7TZ5v5cvQHSW7AdLo_gxaHgqcMi0sfYH5pc2Bo8DN0i96rKLzsUZQchx0SQ-DA-GHRun9xKUWxZ7NtHskqE8WMCvobOEcGUsI5mU"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Core Features Grid */}
        <section
          id="about"
          className="py-24 px-margin-mobile md:px-margin-desktop bg-surface"
        >
          <div className="max-w-container-max mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
              <div className="max-w-xl">
                <h2 className="text-headline-lg font-bold mb-4">
                  Build your dream online store and run it immediately through
                  our platform.
                </h2>
                <p className="text-body-lg text-text-secondary">
                  We&apos;ve removed the complexity of starting an online business
                  so you can focus on growth.
                </p>
              </div>
              <Link
                href={startHref}
                className="text-primary font-bold flex items-center gap-2 hover:underline whitespace-nowrap"
              >
                View Detailed Guide{" "}
                <span className="material-symbols-outlined">north_east</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  person_add
                </span>
                <h3 className="text-headline-md font-bold mb-3">
                  Register your account
                </h3>
                <p className="text-text-secondary text-body-md">
                  Create your profile in seconds and get immediate access to our
                  powerful AI-driven dashboard.
                </p>
              </div>
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  palette
                </span>
                <h3 className="text-headline-md font-bold mb-3">Customize brand</h3>
                <p className="text-text-secondary text-body-md">
                  Use our AI to generate a unique brand identity, including
                  logos, color schemes, and professional layouts.
                </p>
              </div>
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  rocket
                </span>
                <h3 className="text-headline-md font-bold mb-3">Launch &amp; Sell</h3>
                <p className="text-text-secondary text-body-md">
                  Go live with a single click and start accepting payments
                  through integrated local gateways.
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-headline-md font-bold text-text-primary">
                Core Platform Features
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  rocket_launch
                </span>
                <h3 className="text-headline-md font-bold mb-3">
                  Lightning Fast Setup
                </h3>
                <p className="text-text-secondary text-body-md">
                  Go from zero to a fully functional online store in under 15
                  minutes. Our drag-and-drop builder requires no coding
                  knowledge.
                </p>
              </div>
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  shield_lock
                </span>
                <h3 className="text-headline-md font-bold mb-3">Secure Payments</h3>
                <p className="text-text-secondary text-body-md">
                  Simply provide your HitPay or PayMongo payment link and you
                  can start selling immediately.
                </p>
              </div>
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  smartphone
                </span>
                <h3 className="text-headline-md font-bold mb-3">
                  Mobile-First Experience
                </h3>
                <p className="text-text-secondary text-body-md">
                  Your store will look stunning on every device. Fully
                  responsive designs optimized for mobile shoppers.
                </p>
              </div>
              <div className="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all group">
                <span className="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">
                  insights
                </span>
                <h3 className="text-headline-md font-bold mb-3">
                  Powerful Analytics
                </h3>
                <p className="text-text-secondary text-body-md">
                  Real-time data at your fingertips. Track visitors, conversion
                  rates, and inventory levels with ease.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        <section
          id="demo"
          className="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-low"
        >
          <div className="max-w-container-max mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
              <div>
                <h2 className="text-headline-lg text-text-primary font-bold mb-6">
                  Showcase your services to your clients through a professional
                  website portfolio
                </h2>
                <p className="text-body-lg text-text-secondary mb-8">
                  Whether you&apos;re a freelancer, agency, or creator, our
                  platform allows you to upload and display your services,
                  projects, and video reels in a professional gallery designed
                  to impress your clients.
                </p>
                <Link
                  href={startHref}
                  className="inline-block bg-primary text-on-primary px-8 py-4 rounded-lg text-headline-md font-semibold hover:bg-on-primary-fixed-variant transition-all"
                >
                  Explore Portfolio Features
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Services Card */}
                <div className="bg-surface-card p-6 rounded-xl border border-border-subtle hover:shadow-lg hover:-translate-y-1 transition-all">
                  <span className="material-symbols-outlined text-primary text-4xl mb-4">
                    design_services
                  </span>
                  <h4 className="text-headline-md font-bold mb-2">
                    Web Design Services
                  </h4>
                  <p className="text-text-secondary text-body-md">
                    Professional consulting and design packages tailored for
                    your clients.
                  </p>
                </div>

                {/* Project Showcase */}
                <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden hover:shadow-lg transition-all">
                  <div className="h-40 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="Project Showcase"
                      className="w-full h-full object-cover block"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrV-cK-6nUbMsvl01YB2gc6iMaNmt17Y3IBRus4LnAYspQCDMYOpzw7SDP2s4TWDOLiHWcPgHSVUMIV390VUC4PjTnD44KQbx-3U7bw7N6YuP-j1x2QtCbdT9ihE828mRfHAw9c8-cYUMiYTgX2GYr7Bs6prNgjZBGrIkKrGX4pzpKTThJOAtdeK-ECDXfRRQBf1GXtfk9xfyflQlOrNjLCj4jDw5qO6A6Ehdr1QDrsF7G-zOwEmURx9Ffe97JwYsf-hwOu3Nx2v5J"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="text-body-lg font-bold">Project Showcase</h4>
                    <p className="text-text-secondary text-sm">
                      High-quality gallery for your best work.
                    </p>
                  </div>
                </div>

                {/* Video Reel */}
                <div className="md:col-span-2 bg-surface-card rounded-xl border border-border-subtle overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div
                    className="relative group cursor-pointer"
                    onClick={toggleVideo}
                  >
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover aspect-video block"
                      poster="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200"
                      onEnded={handleVideoEnded}
                    >
                      <source
                        src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                    {!videoPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-all duration-300">
                        <div className="bg-primary text-on-primary w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                          <span className="material-symbols-outlined text-5xl !font-normal">
                            play_arrow
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-margin-mobile md:px-margin-desktop text-center bg-surface-container-low">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-headline-lg font-bold mb-6">
              Ready to build your online empire?
            </h2>
            <p className="text-body-lg text-text-secondary mb-10">
              Join thousands of successful merchants and start your journey
              today with Storebuilder.ph.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href={startHref}
                className="bg-primary text-on-primary px-10 py-4 rounded-lg text-headline-md font-bold hover:shadow-xl transition-all"
              >
                Sign Up
              </Link>
            </div>
            <p className="mt-6 text-label-sm text-text-secondary font-semibold">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border-subtle py-16 px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="flex flex-col gap-4">
              <div className="w-16 h-16 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Storebuilder.ph Logo"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAopiJyBmsqt1bwkchhwtrMEbPcQLQg0yOPr4nEowpE4ugVs4tb2VsKJ2Gfgkwixrkn7rxXqvqwRtKfXhNPFDjl1jA3FuASNl_6WLyUcSfOrIf-GhzyCoxYBjgZ_HH-0KALzkWe7EDFllkj0hOO9c21bqZFFM4TnMOfCT1DU5frVBz22prHsybwYu67BngJrpngciU8B2dA1mIwOATWF0mc4LqvE4hmN4BeSw62aIYx9O8Zl5QAKKjvxF7jPHyMk_sUi4YkWMxnQoCP"
                />
              </div>
              <div className="text-headline-md font-bold text-primary">
                Storebuilder.ph
              </div>
              <p className="text-text-secondary text-body-md">
                Empowering Filipino businesses with world-class e-commerce
                technology.
              </p>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="text-headline-md font-bold mb-6">Company</h4>
              <ul className="flex flex-col gap-4">
                <li>
                  <a
                    href="#about"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:hello@storebuilder.ph"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <Link
                    href="/upgrade"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-headline-md font-bold mb-6">Legal</h4>
              <ul className="flex flex-col gap-4">
                <li>
                  <a
                    href="#"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Column */}
            <div>
              <h4 className="text-headline-md font-bold mb-6">Contact</h4>
              <ul className="flex flex-col gap-4">
                <li>
                  <a
                    href="mailto:hello@storebuilder.ph"
                    className="text-text-secondary hover:text-primary transition-colors text-body-md"
                  >
                    Send us a message
                  </a>
                </li>
                <li className="text-text-secondary text-body-md">
                  Philippines 🇵🇭
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border-subtle text-center">
            <p className="text-text-secondary text-body-md mb-2">
              2026 Storebuilder.ph. All rights reserved. 🇵🇭
            </p>
            <p className="text-text-secondary text-label-sm font-semibold uppercase tracking-wider">
              PROUDLY BUILT FOR FILIPINO ENTREPRENEURS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
