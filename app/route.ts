import { NextResponse } from "next/server";

export const dynamic = "force-static";

const HOME_HTML = `<!DOCTYPE html>

<html class="scroll-smooth" lang="en" style=""><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Storebuilder.ph | Build Your Online Empire</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid #CED0D4;
        }
        body {
            font-family: 'Hanken Grotesk', sans-serif;
        }
    </style>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "text-secondary": "#65676B",
                      "on-secondary": "#ffffff",
                      "tertiary-container": "#018800",
                      "inverse-primary": "#adc6ff",
                      "background": "#f7f9fc",
                      "on-primary": "#ffffff",
                      "status-error": "#FA3E3E",
                      "secondary": "#54606a",
                      "primary": "#0058bc",
                      "on-primary-fixed": "#001a41",
                      "on-error": "#ffffff",
                      "surface-card": "#FFFFFF",
                      "tertiary-fixed-dim": "#5ae148",
                      "on-primary-fixed-variant": "#004493",
                      "text-primary": "#050505",
                      "primary-fixed": "#d8e2ff",
                      "on-tertiary-fixed-variant": "#015300",
                      "on-surface": "#191c1e",
                      "surface-tint": "#005bc0",
                      "surface-container-lowest": "#ffffff",
                      "on-background": "#191c1e",
                      "on-tertiary-fixed": "#002200",
                      "surface": "#f7f9fc",
                      "status-warning": "#F7B928",
                      "outline-variant": "#c1c6d6",
                      "error": "#ba1a1a",
                      "border-subtle": "#CED0D4",
                      "secondary-container": "#d8e4f0",
                      "tertiary": "#016c00",
                      "surface-variant": "#e0e3e6",
                      "secondary-fixed": "#d8e4f0",
                      "on-secondary-fixed": "#111d25",
                      "on-primary-container": "#fefcff",
                      "primary-container": "#0070eb",
                      "surface-bright": "#f7f9fc",
                      "surface-container": "#eceef1",
                      "surface-dim": "#d8dadd",
                      "on-secondary-container": "#5a6670",
                      "outline": "#727785",
                      "on-tertiary": "#ffffff",
                      "surface-container-highest": "#e0e3e6",
                      "secondary-fixed-dim": "#bcc8d3",
                      "inverse-on-surface": "#eff1f4",
                      "error-container": "#ffdad6",
                      "inverse-surface": "#2d3133",
                      "surface-container-low": "#f2f4f7",
                      "tertiary-fixed": "#78ff62",
                      "primary-fixed-dim": "#adc6ff",
                      "on-surface-variant": "#414754",
                      "on-secondary-fixed-variant": "#3d4852",
                      "on-tertiary-container": "#f8ffef",
                      "on-error-container": "#93000a",
                      "surface-container-high": "#e6e8eb"
              },
              "borderRadius": {
                      "DEFAULT": "0.25rem",
                      "lg": "0.5rem",
                      "xl": "0.75rem",
                      "full": "9999px"
              },
              "spacing": {
                      "margin-mobile": "16px",
                      "margin-desktop": "40px",
                      "gutter": "24px",
                      "unit": "4px",
                      "container-max": "1280px"
              },
              "fontFamily": {
                      "headline-lg-mobile": ["Hanken Grotesk"],
                      "body-md": ["Hanken Grotesk"],
                      "headline-md": ["Hanken Grotesk"],
                      "body-lg": ["Hanken Grotesk"],
                      "headline-lg": ["Hanken Grotesk"],
                      "label-sm": ["Hanken Grotesk"]
              },
              "fontSize": {
                      "headline-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "700"}],
                      "body-md": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                      "headline-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
                      "body-lg": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
                      "headline-lg": ["32px", {"lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                      "label-sm": ["12px", {"lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "600"}]
              }
            },
          },
        }
      </script>
</head>
<body class="bg-background text-text-primary overflow-x-hidden">
<!-- Top Navigation Bar -->
<header class="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-margin-mobile md:px-margin-desktop bg-surface dark:bg-surface-dim border-b border-border-subtle dark:border-outline-variant h-[64px]">
<div class="flex items-center gap-8 max-w-container-max mx-auto w-full justify-between">
<div class="text-headline-md font-bold text-primary dark:text-primary-fixed">
            Storebuilder.ph
        </div>
<nav class="hidden md:flex items-center gap-6">
<a class="text-primary font-bold border-b-2 border-primary pb-1 text-body-md" href="#">Home</a>
<a class="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md" href="#">About</a>
<a class="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md" href="#">Pricing</a>
<a class="text-text-secondary hover:text-primary transition-colors duration-200 text-body-md" href="#">Contact</a>
</nav>
<div class="flex items-center gap-4">
<button class="hidden md:block text-text-secondary hover:text-primary text-label-sm font-semibold px-4 py-2 transition-all">Log In</button>
</div>
</div>
</header>
<main class="pt-[64px]">
<!-- Hero Section -->
<section class="relative min-h-[80vh] flex items-center overflow-hidden px-margin-mobile md:px-margin-desktop bg-surface">
<div class="max-w-container-max mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-16">
<div class="z-10">
<h1 class="text-[40px] md:text-headline-lg mb-6 leading-tight font-bold">Build your website with <span class="text-primary">AI</span></h1>
<p class="text-body-lg text-text-secondary mb-8 max-w-lg">Transform your ideas into professional websites instantly using natural language prompts. Our AI handles the design and code so you can focus on your vision.</p>
<div class="flex flex-col sm:flex-row gap-4">
<button class="bg-primary text-on-primary px-8 py-4 rounded-lg text-headline-md font-semibold flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-all">
                        Get Started <span class="material-symbols-outlined">arrow_forward</span>
</button>
<button class="bg-secondary-container text-primary px-8 py-4 rounded-lg text-headline-md font-semibold hover:bg-outline-variant transition-all">
                        Watch Demo
                    </button>
</div>
<div class="mt-8 flex items-center gap-4 text-text-secondary">
<div class="flex -space-x-2">
<div class="w-8 h-8 rounded-full border-2 border-surface bg-gray-200"></div>
<div class="w-8 h-8 rounded-full border-2 border-surface bg-gray-300"></div>
<div class="w-8 h-8 rounded-full border-2 border-surface bg-gray-400"></div>
</div>
<span class="text-label-sm font-semibold">Joined by 2,000+ local merchants</span>
</div>
</div>
<div class="relative">
<div class="absolute -top-12 -right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
<div class="absolute -bottom-12 -left-12 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl"></div>
<div class="relative rounded-xl overflow-hidden shadow-2xl border border-border-subtle">
<img alt="AI website builder showcase" class="w-full h-auto" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCno8phD_4jQFuVBFr1aAAqK9LYAoAylvhfI15TMW2a7UgmZ6lC1Az_BT6upDbxJd6lFSzwin2yiPDVyow0le2yvcs9vs8s8-8ErHIA_M-raeGpJvPu3RQB-c9CedITITyjgnMXLADcGb0XSrzakakRxb05oyhTihlqvfy1Zvgf7TZ5v5cvQHSW7AdLo_gxaHgqcMi0sfYH5pc2Bo8DN0i96rKLzsUZQchx0SQ-DA-GHRun9xKUWxZ7NtHskqE8WMCvobOEcGUsI5mU"/>
</div>
</div>
</div>
</section>
<!-- Core Features Grid -->
<section class="py-24 px-margin-mobile md:px-margin-desktop bg-surface">
<div class="max-w-container-max mx-auto">
<div class="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
<div class="max-w-xl">
<h2 class="text-headline-lg font-bold mb-4">Build your dream online store and run it immediately through our platform.</h2>
<p class="text-body-lg text-text-secondary">We've removed the complexity of starting an online business so you can focus on growth.</p>
</div>
<button class="text-primary font-bold flex items-center gap-2 hover:underline">
                    View Detailed Guide <span class="material-symbols-outlined">north_east</span>
</button>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">person_add</span>
<h3 class="text-headline-md font-bold mb-3">Register your account</h3>
<p class="text-text-secondary text-body-md">Create your profile in seconds and get immediate access to our powerful AI-driven dashboard.</p>
</div>
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">palette</span>
<h3 class="text-headline-md font-bold mb-3">Customize brand</h3>
<p class="text-text-secondary text-body-md">Use our AI to generate a unique brand identity, including logos, color schemes, and professional layouts.</p>
</div>
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">rocket</span>
<h3 class="text-headline-md font-bold mb-3">Launch &amp; Sell</h3>
<p class="text-text-secondary text-body-md">Go live with a single click and start accepting payments through integrated local gateways.</p>
</div>
</div><div class="mb-8">
<h3 class="text-headline-md font-bold text-text-primary">Core Platform Features</h3>
</div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
<!-- Lightning Fast Setup -->
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">rocket_launch</span>
<h3 class="text-headline-md font-bold mb-3">Lightning Fast Setup</h3>
<p class="text-text-secondary text-body-md">Go from zero to a fully functional online store in under 15 minutes. Our drag-and-drop builder requires no coding knowledge.</p>
</div>
<!-- Secure Payments -->
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">shield_lock</span>
<h3 class="text-headline-md font-bold mb-3">Secure Payments</h3>
<p class="text-text-secondary text-body-md">Simply provide your HitPay or PayMongo payment link and you can start selling immediately.</p>
</div>
<!-- Mobile-First Experience -->
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">smartphone</span>
<h3 class="text-headline-md font-bold mb-3">Mobile-First Experience</h3>
<p class="text-text-secondary text-body-md">Your store will look stunning on every device. Fully responsive designs optimized for mobile shoppers.</p>
</div>
<!-- Powerful Analytics -->
<div class="bg-surface-card p-8 rounded-xl border border-border-subtle hover:shadow-lg transition-all group" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4 p-3 bg-primary-fixed rounded-lg">insights</span>
<h3 class="text-headline-md font-bold mb-3">Powerful Analytics</h3>
<p class="text-text-secondary text-body-md">Real-time data at your fingertips. Track visitors, conversion rates, and inventory levels with ease.</p>
</div>
</div>
</div>
</section>
<!-- Portfolio Section -->
<section class="py-24 px-margin-mobile md:px-margin-desktop bg-surface-container-low">
<div class="max-w-container-max mx-auto">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-16">
<div>
<h2 class="text-headline-lg text-text-primary font-bold mb-6">Showcase your services to your clients through a professional website portfolio</h2>
<p class="text-body-lg text-text-secondary mb-8">Whether you're a freelancer, agency, or creator, our platform allows you to upload and display your services, projects, and video reels in a professional gallery designed to impress your clients.</p>
<button class="bg-primary text-on-primary px-8 py-4 rounded-lg text-headline-md font-semibold hover:bg-on-primary-fixed-variant transition-all">Explore Portfolio Features</button>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
<!-- Services Card -->
<div class="bg-surface-card p-6 rounded-xl border border-border-subtle hover:shadow-lg transition-all" style="transform: translateY(0px);">
<span class="material-symbols-outlined text-primary text-4xl mb-4">design_services</span>
<h4 class="text-headline-md font-bold mb-2">Web Design Services</h4>
<p class="text-text-secondary text-body-md">Professional consulting and design packages tailored for your clients.</p>
</div>
<!-- Project Showcase -->
<div class="bg-surface-card rounded-xl border border-border-subtle overflow-hidden hover:shadow-lg transition-all">
<div class="h-40 overflow-hidden">
<img alt="Project Showcase" class="w-full h-full object-cover block" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrV-cK-6nUbMsvl01YB2gc6iMaNmt17Y3IBRus4LnAYspQCDMYOpzw7SDP2s4TWDOLiHWcPgHSVUMIV390VUC4PjTnD44KQbx-3U7bw7N6YuP-j1x2QtCbdT9ihE828mRfHAw9c8-cYUMiYTgX2GYr7Bs6prNgjZBGrIkKrGX4pzpKTThJOAtdeK-ECDXfRRQBf1GXtfk9xfyflQlOrNjLCj4jDw5qO6A6Ehdr1QDrsF7G-zOwEmURx9Ffe97JwYsf-hwOu3Nx2v5J"/>
</div>
<div class="p-4">
<h4 class="text-body-lg font-bold">Project Showcase</h4>
<p class="text-text-secondary text-sm">High-quality gallery for your best work.</p>
</div>
</div>
<!-- Video Reel -->
<div class="md:col-span-2 bg-surface-card rounded-xl border border-border-subtle overflow-hidden hover:shadow-lg transition-all" style="transform: translateY(0px);">
<div class="relative group cursor-pointer" id="videoContainer">
<video class="w-full h-full object-cover aspect-video block" id="portfolioVideo" poster="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&amp;fit=crop&amp;q=80&amp;w=1200">
<source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4"/>
    Your browser does not support the video tag.
  </video>
<!-- Play Button Overlay -->
<div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-all duration-300" id="videoOverlay">
<div class="bg-primary text-on-primary w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
<span class="material-symbols-outlined text-5xl !font-normal">play_arrow</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- FAQ Section -->
<!-- Final CTA Section -->
<section class="py-24 px-margin-mobile md:px-margin-desktop text-center bg-surface-container-low">
<div class="max-w-3xl mx-auto">
<h2 class="text-headline-lg font-bold mb-6">Ready to build your online empire?</h2>
<p class="text-body-lg text-text-secondary mb-10">Join thousands of successful merchants and start your journey today with Storebuilder.ph.</p>
<div class="flex flex-col sm:flex-row justify-center gap-4">
<button class="bg-primary text-on-primary px-10 py-4 rounded-lg text-headline-md font-bold hover:shadow-xl transition-all">Sign Up</button>
</div>
<p class="mt-6 text-label-sm text-text-secondary font-semibold">No credit card required. Cancel anytime.</p>
</div>
</section>
</main><footer class="bg-surface border-t border-border-subtle py-16 px-margin-mobile md:px-margin-desktop">
<div class="max-w-container-max mx-auto">
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
<!-- Brand Column -->
<div class="flex flex-col gap-4">
<div class="w-16 h-16 mb-4"><img alt="Storebuilder.ph Logo" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAopiJyBmsqt1bwkchhwtrMEbPcQLQg0yOPr4nEowpE4ugVs4tb2VsKJ2Gfgkwixrkn7rxXqvqwRtKfXhNPFDjl1jA3FuASNl_6WLyUcSfOrIf-GhzyCoxYBjgZ_HH-0KALzkWe7EDFllkj0hOO9c21bqZFFM4TnMOfCT1DU5frVBz22prHsybwYu67BngJrpngciU8B2dA1mIwOATWF0mc4LqvE4hmN4BeSw62aIYx9O8Zl5QAKKjvxF7jPHyMk_sUi4YkWMxnQoCP"/></div>
<div class="text-headline-md font-bold text-primary">Storebuilder.ph</div>
<p class="text-text-secondary text-body-md">Empowering Filipino businesses with world-class e-commerce technology.</p>
</div>
<!-- Company Column -->
<div>
<h4 class="text-headline-md font-bold mb-6">Company</h4>
<ul class="flex flex-col gap-4">
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">About Us</a></li>
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">Contact</a></li>
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">Pricing</a></li>
</ul>
</div>
<!-- Legal Column -->
<div>
<h4 class="text-headline-md font-bold mb-6">Legal</h4>
<ul class="flex flex-col gap-4">
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">Terms of Service</a></li>
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">Privacy Policy</a></li>
</ul>
</div>
<!-- Contact Column -->
<div>
<h4 class="text-headline-md font-bold mb-6">Contact</h4>
<ul class="flex flex-col gap-4">
<li class=""><a class="text-text-secondary hover:text-primary transition-colors text-body-md" href="#">Send us a message</a></li>
<li class="text-text-secondary text-body-md">Philippines 🇵🇭</li>
</ul>
</div>
</div>
<!-- Bottom Bar -->
<div class="pt-8 border-t border-border-subtle text-center"><p class="text-text-secondary text-body-md mb-2">2026 Storebuilder.ph. All rights reserved. 🇵🇭</p><p class="text-text-secondary text-label-sm font-semibold uppercase tracking-wider">PROUDLY BUILT FOR FILIPINO ENTREPRENEURS</p></div>
</div>
</footer>
<!-- Footer -->
<script>
    // Micro-interaction for smooth scrolling and header visibility
    let lastScroll = 0;
    const header = document.querySelector('header');

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            header.classList.add('shadow-md');
        } else {
            header.classList.remove('shadow-md');
        }
        lastScroll = currentScroll;
    });

    // Hover effect for cards
    const cards = document.querySelectorAll('.hover\\\\:shadow-lg');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Video Player Logic
    const videoContainer = document.getElementById('videoContainer');
    const video = document.getElementById('portfolioVideo');
    const overlay = document.getElementById('videoOverlay');

    videoContainer.addEventListener('click', () => {
        if (video.paused) {
            video.play();
            video.setAttribute('controls', 'true');
            overlay.classList.add('hidden');
        } else {
            video.pause();
            video.removeAttribute('controls');
            overlay.classList.remove('hidden');
        }
    });

    // Handle initial state if video ends
    video.addEventListener('ended', () => {
        video.removeAttribute('controls');
        overlay.classList.remove('hidden');
        video.load(); // Reset to poster
    });
</script>
</body></html>`;

export async function GET() {
  return new NextResponse(HOME_HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
