import type { ISharedContext } from './core/types';
import type { DesignDNAArtifact } from './engines/design-dna';
import type { PlanningArtifact } from './engines/planning';

// ---------------------------------------------------------------------------
// Ultra-premium single-document HTML renderer.
//
// The orchestration pipeline emits a multi-file React/TSX project, but
// Storebuilder serves generated sites from a single self-contained
// `Website.htmlContent` string (rendered in an iframe). This module bridges
// that gap: it consumes the design-dna / planning artifacts and composes one
// polished, fully responsive, animated HTML document with all CSS + JS inlined
// and no external asset dependencies (aside from Google Fonts).
// ---------------------------------------------------------------------------

type Niche = 'restaurant' | 'portfolio' | 'ecommerce' | 'agency' | 'saas' | 'business';

interface NicheCopy {
  eyebrow: string;
  headline: (brand: string) => string;
  highlight: string;
  sub: string;
  primaryCta: string;
  secondaryCta: string;
  features: { icon: string; title: string; body: string }[];
  showcaseTitle: string;
  showcaseBody: string;
  galleryTitle: string;
  galleryItems: string[];
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  ctaTitle: string;
  ctaBody: string;
}

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deriveNiche(prompt: string): Niche {
  const p = prompt.toLowerCase();
  if (/(restaurant|ramen|cafe|coffee|food|bistro|dining|menu|bakery)/.test(p)) return 'restaurant';
  if (/(portfolio|photographer|photography|designer|artist|creative)/.test(p)) return 'portfolio';
  if (/(saas|software|\bapp\b|platform|dashboard|startup|productivity)/.test(p)) return 'saas';
  if (/(shop|store|ecommerce|e-commerce|apparel|fashion|\bproduct\b|products|boutique|skincare|jewelry|checkout)/.test(p)) return 'ecommerce';
  if (/(agency|studio|marketing|consult)/.test(p)) return 'agency';
  return 'business';
}

// Inline SVG icons (stroke uses currentColor so they inherit accent colors).
const ICONS: Record<string, string> = {
  spark: '<path d="M12 2v6m0 8v6M4.9 4.9l4.2 4.2m5.8 5.8l4.2 4.2M2 12h6m8 0h6M4.9 19.1l4.2-4.2m5.8-5.8l4.2-4.2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  star: '<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/>',
  layers: '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  cart: '<circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2 3h3l2.6 13h11l2-9H6"/>',
  utensils: '<path d="M4 2v8a3 3 0 0 0 6 0V2M7 2v20M16 2c-2 0-3 2-3 5s1 5 3 5v10"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
};

function icon(name: string, cls = ''): string {
  const path = ICONS[name] || ICONS.spark;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function nicheCopy(niche: Niche, brand: string): NicheCopy {
  const map: Record<Niche, NicheCopy> = {
    restaurant: {
      eyebrow: 'Crafted daily',
      headline: (b) => `A taste worth <span class="grad">remembering</span> at ${b}`,
      highlight: 'remembering',
      sub: 'Seasonal ingredients, bold flavors, and an atmosphere designed for the people you love. Reserve a table or order ahead in seconds.',
      primaryCta: 'Reserve a table',
      secondaryCta: 'View the menu',
      features: [
        { icon: 'utensils', title: 'Seasonal menu', body: 'A rotating menu built around the freshest local produce, every single week.' },
        { icon: 'heart', title: 'Made with care', body: 'Recipes perfected over years, plated by a team that treats every dish as craft.' },
        { icon: 'star', title: 'Award-winning', body: 'Recognized by critics and loved by regulars who keep coming back for more.' },
      ],
      showcaseTitle: 'Where every detail is intentional',
      showcaseBody: 'From the first sip to the last bite, the experience is designed to slow you down and savor the moment. Warm lighting, considered plating, and service that anticipates what you need.',
      galleryTitle: 'From our kitchen',
      galleryItems: ['Signature plate', 'House special', 'Fresh starters', 'Dessert of the day', 'Chef’s selection', 'Seasonal drinks'],
      stats: [{ value: '4.9', label: 'Average rating' }, { value: '120+', label: 'Dishes served daily' }, { value: '15k', label: 'Happy guests' }],
      testimonials: [
        { quote: 'Hands down the best dining experience in the city. Every dish was a story.', name: 'Maria Santos', role: 'Food critic' },
        { quote: 'The ambiance, the flavors, the service — flawless from start to finish.', name: 'James Cruz', role: 'Regular guest' },
        { quote: 'We book this place for every celebration. It never disappoints.', name: 'Liza Reyes', role: 'Local foodie' },
      ],
      ctaTitle: 'Hungry yet?',
      ctaBody: 'Reserve your table now and taste the difference a little care makes.',
    },
    portfolio: {
      eyebrow: 'Selected work',
      headline: (b) => `Design that <span class="grad">speaks</span> for ${b}`,
      highlight: 'speaks',
      sub: 'A curated collection of projects built with intention, craft, and an obsessive eye for detail. Let’s create something that lasts.',
      primaryCta: 'View portfolio',
      secondaryCta: 'Get in touch',
      features: [
        { icon: 'camera', title: 'Visual storytelling', body: 'Every project begins with a story and ends with work that moves people.' },
        { icon: 'layers', title: 'End-to-end craft', body: 'From concept to delivery, handled with care and relentless attention to detail.' },
        { icon: 'spark', title: 'Distinctly original', body: 'No templates, no shortcuts — work that could only have come from one place.' },
      ],
      showcaseTitle: 'A process built on craft',
      showcaseBody: 'Great work isn’t an accident. It’s the result of deep listening, sharp thinking, and a commitment to getting the details right — the ones most people never notice but always feel.',
      galleryTitle: 'Featured projects',
      galleryItems: ['Brand identity', 'Editorial', 'Product design', 'Motion study', 'Art direction', 'Case study'],
      stats: [{ value: '80+', label: 'Projects shipped' }, { value: '12', label: 'Awards won' }, { value: '9yr', label: 'Of craft' }],
      testimonials: [
        { quote: 'A rare talent. The work elevated our entire brand overnight.', name: 'Andrea Lim', role: 'Creative Director' },
        { quote: 'Thoughtful, precise, and genuinely original. A joy to collaborate with.', name: 'Marcus Tan', role: 'Founder' },
        { quote: 'Delivered beyond the brief and on time. I’d work with them again instantly.', name: 'Sofia Reyes', role: 'Head of Brand' },
      ],
      ctaTitle: 'Have a project in mind?',
      ctaBody: 'Let’s talk about how we can bring your vision to life.',
    },
    ecommerce: {
      eyebrow: 'New collection',
      headline: (b) => `Products you’ll <span class="grad">love</span>, from ${b}`,
      highlight: 'love',
      sub: 'Thoughtfully designed, ethically made, and delivered to your door. Discover pieces that are built to last and made to be loved.',
      primaryCta: 'Shop the collection',
      secondaryCta: 'Learn more',
      features: [
        { icon: 'cart', title: 'Free shipping', body: 'Fast, tracked, and free on every order over a small minimum. No surprises.' },
        { icon: 'shield', title: 'Quality guaranteed', body: 'Every product is backed by our promise — love it or your money back.' },
        { icon: 'bolt', title: 'Ships in 24h', body: 'Orders placed before 5pm ship the same day, straight from our warehouse.' },
      ],
      showcaseTitle: 'Made to be loved, built to last',
      showcaseBody: 'We obsess over materials, fit, and finish so you don’t have to. Each piece is designed to earn a permanent place in your life — and look better the more you use it.',
      galleryTitle: 'Best sellers',
      galleryItems: ['Bestseller No.1', 'New arrival', 'Limited edition', 'Customer favorite', 'Back in stock', 'Essential pick'],
      stats: [{ value: '50k+', label: 'Orders shipped' }, { value: '4.8', label: 'Customer rating' }, { value: '98%', label: 'Would reorder' }],
      testimonials: [
        { quote: 'The quality blew me away. Worth every peso and then some.', name: 'Karla Mendoza', role: 'Verified buyer' },
        { quote: 'Fast shipping, beautiful packaging, and the product is gorgeous.', name: 'Paolo Garcia', role: 'Repeat customer' },
        { quote: 'I’ve recommended this shop to everyone I know. Obsessed.', name: 'Nina Flores', role: 'Verified buyer' },
      ],
      ctaTitle: 'Ready to treat yourself?',
      ctaBody: 'Browse the collection and find your next favorite thing.',
    },
    agency: {
      eyebrow: 'Full-service studio',
      headline: (b) => `Growth, <span class="grad">engineered</span> by ${b}`,
      highlight: 'engineered',
      sub: 'We partner with ambitious brands to design, build, and scale digital experiences that move the metrics that matter.',
      primaryCta: 'Start a project',
      secondaryCta: 'See our work',
      features: [
        { icon: 'spark', title: 'Strategy first', body: 'We start with your goals and reverse-engineer the work that gets you there.' },
        { icon: 'layers', title: 'Design + build', body: 'A single team that designs, ships, and iterates — no handoffs, no friction.' },
        { icon: 'globe', title: 'Built to scale', body: 'Systems and brands designed to grow with you, not hold you back.' },
      ],
      showcaseTitle: 'Your partners, not just providers',
      showcaseBody: 'We embed with your team, learn your business, and treat your goals as our own. The result is work that doesn’t just look good — it performs.',
      galleryTitle: 'Recent engagements',
      galleryItems: ['Brand strategy', 'Web platform', 'Campaign', 'Product launch', 'Rebrand', 'Growth sprint'],
      stats: [{ value: '3.2x', label: 'Avg. ROI' }, { value: '60+', label: 'Brands scaled' }, { value: '100%', label: 'Client retention' }],
      testimonials: [
        { quote: 'They transformed our digital presence and doubled our pipeline in months.', name: 'David Ong', role: 'CEO' },
        { quote: 'The most strategic partner we’ve ever worked with. Period.', name: 'Rachel Yu', role: 'VP Marketing' },
        { quote: 'Sharp, fast, and relentlessly focused on outcomes. Highly recommend.', name: 'Tomas Rivera', role: 'Founder' },
      ],
      ctaTitle: 'Let’s build something that performs.',
      ctaBody: 'Tell us about your goals and we’ll show you the path to get there.',
    },
    saas: {
      eyebrow: 'Now in early access',
      headline: (b) => `The smarter way to <span class="grad">work</span>, by ${b}`,
      highlight: 'work',
      sub: 'One platform to plan, build, and ship faster. Automate the busywork and give your team the clarity to do their best work.',
      primaryCta: 'Start free trial',
      secondaryCta: 'Book a demo',
      features: [
        { icon: 'bolt', title: 'Lightning fast', body: 'Built for speed at every layer. No loading spinners, no waiting around.' },
        { icon: 'shield', title: 'Secure by default', body: 'Enterprise-grade security and compliance baked in from day one.' },
        { icon: 'layers', title: 'Integrates everywhere', body: 'Connects to the tools you already use, so nothing falls through the cracks.' },
      ],
      showcaseTitle: 'Everything your team needs, in one place',
      showcaseBody: 'Stop switching between a dozen tools. Bring your workflows, data, and people together into a single source of truth that actually scales with you.',
      galleryTitle: 'Built for every team',
      galleryItems: ['Dashboards', 'Automations', 'Analytics', 'Collaboration', 'Integrations', 'Reporting'],
      stats: [{ value: '99.9%', label: 'Uptime' }, { value: '10k+', label: 'Teams onboard' }, { value: '40%', label: 'Time saved' }],
      testimonials: [
        { quote: 'This replaced four tools for us and our team has never been more aligned.', name: 'Elena Park', role: 'Head of Ops' },
        { quote: 'Setup took ten minutes and paid for itself in the first week.', name: 'Ben Carter', role: 'Engineering Lead' },
        { quote: 'Genuinely the best product in its category. We’re customers for life.', name: 'Aisha Khan', role: 'Product Manager' },
      ],
      ctaTitle: 'Ready to move faster?',
      ctaBody: 'Start your free trial today — no credit card required.',
    },
    business: {
      eyebrow: 'Welcome',
      headline: (b) => `Building something <span class="grad">remarkable</span> with ${b}`,
      highlight: 'remarkable',
      sub: 'We help you do more of what you do best. Simple, reliable, and designed around the people you serve.',
      primaryCta: 'Get started',
      secondaryCta: 'Learn more',
      features: [
        { icon: 'spark', title: 'Built for you', body: 'Tailored to your needs and designed to make everyday work feel effortless.' },
        { icon: 'shield', title: 'Dependable', body: 'Reliability you can count on, backed by a team that genuinely cares.' },
        { icon: 'heart', title: 'People first', body: 'Every decision starts and ends with the people we’re here to serve.' },
      ],
      showcaseTitle: 'Simple by design, powerful in practice',
      showcaseBody: 'We strip away the complexity so you can focus on what matters. The result is something that just works — quietly, reliably, beautifully.',
      galleryTitle: 'What we offer',
      galleryItems: ['Core service', 'Premium tier', 'Support', 'Consulting', 'Onboarding', 'Resources'],
      stats: [{ value: '10yr', label: 'In business' }, { value: '5k+', label: 'Customers served' }, { value: '4.9', label: 'Satisfaction' }],
      testimonials: [
        { quote: 'A trustworthy partner that consistently delivers. Couldn’t ask for more.', name: 'Grace Lim', role: 'Client' },
        { quote: 'Professional, responsive, and genuinely invested in our success.', name: 'Henry Sy', role: 'Customer' },
        { quote: 'They made the whole process effortless. Highly recommended.', name: 'Mae Tan', role: 'Client' },
      ],
      ctaTitle: 'Let’s get started.',
      ctaBody: 'Reach out today and see how we can help you grow.',
    },
  };
  return map[niche];
}

interface FontPair {
  display: string;
  body: string;
  href: string;
}

function fontPair(fontFamily: string): FontPair {
  const isSerif = /serif|georgia|times|playfair|fraunces/i.test(fontFamily);
  if (isSerif) {
    return {
      display: "'Fraunces', Georgia, serif",
      body: "'Inter', system-ui, sans-serif",
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap',
    };
  }
  return {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
  };
}

export function renderSiteHtml(context: ISharedContext, brandName: string): string {
  const design = context.getArtifact<DesignDNAArtifact>('design-dna');
  const planning = context.getArtifact<PlanningArtifact>('planning');
  const prompt = context.input.userPrompt;

  const niche = deriveNiche(prompt);
  const copy = nicheCopy(niche, escapeHtml(brandName));
  const brand = escapeHtml(brandName);

  const palette = design?.colorPalette ?? {
    primary: '#1d4ed8', secondary: '#6366f1', accent: '#10b981', background: '#ffffff',
    surface: '#f8fafc', text: '#0f172a', textMuted: '#64748b', border: '#e2e8f0',
    error: '#ef4444', success: '#22c55e',
  };
  const theme = design?.theme ?? 'light';
  const isDark = theme === 'dark';
  const fonts = fontPair(design?.typography.fontFamily ?? 'sans');
  const features = planning?.features ?? [];
  const showGallery = features.includes('gallery') || niche === 'ecommerce' || niche === 'portfolio' || niche === 'restaurant';

  const navLinks = ['Home', 'About', copy.galleryTitle.split(' ')[0] || 'Work', 'Contact'];
  const year = new Date().getFullYear();

  // CSS uses var(--x); no ${} so it's safe inside the template literal below.
  const css = `
    :root{
      --c-primary:${palette.primary};--c-secondary:${palette.secondary};--c-accent:${palette.accent};
      --c-bg:${palette.background};--c-surface:${palette.surface};--c-text:${palette.text};
      --c-muted:${palette.textMuted};--c-border:${palette.border};
      --font-display:${fonts.display};--font-body:${fonts.body};
      --maxw:1180px;--radius:18px;--ease:cubic-bezier(.4,0,.2,1);
      --shadow:0 10px 40px -12px rgba(2,6,23,.18);--shadow-lg:0 30px 70px -20px rgba(2,6,23,.35);
    }
    *{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:var(--font-body);background:var(--c-bg);color:var(--c-text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
    h1,h2,h3,.display{font-family:var(--font-display);line-height:1.08;letter-spacing:-.02em;font-weight:700}
    a{color:inherit;text-decoration:none}
    img{max-width:100%;display:block}
    .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
    .grad{background:linear-gradient(120deg,var(--c-primary),var(--c-secondary) 55%,var(--c-accent));-webkit-background-clip:text;background-clip:text;color:transparent}
    .btn{display:inline-flex;align-items:center;gap:8px;padding:14px 26px;border-radius:999px;font-weight:600;font-family:var(--font-body);font-size:.98rem;cursor:pointer;border:1px solid transparent;transition:transform .25s var(--ease),box-shadow .25s var(--ease),background .25s}
    .btn:hover{transform:translateY(-2px)}
    .btn-primary{background:linear-gradient(120deg,var(--c-primary),var(--c-secondary));color:#fff;box-shadow:0 12px 30px -10px var(--c-primary)}
    .btn-primary:hover{box-shadow:0 18px 40px -10px var(--c-primary)}
    .btn-ghost{background:transparent;border-color:var(--c-border);color:var(--c-text)}
    .btn-ghost:hover{border-color:var(--c-primary);color:var(--c-primary)}
    .eyebrow{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;border-radius:999px;background:color-mix(in srgb,var(--c-primary) 12%,transparent);color:var(--c-primary);font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;border:1px solid color-mix(in srgb,var(--c-primary) 22%,transparent)}
    .eyebrow .dot{width:7px;height:7px;border-radius:50%;background:var(--c-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--c-accent) 25%,transparent);animation:pulse 2.4s infinite}
    @keyframes pulse{50%{opacity:.4}}
    section{padding:clamp(64px,9vw,128px) 0}
    .section-head{max-width:680px;margin:0 auto clamp(40px,5vw,64px);text-align:center}
    .section-head h2{font-size:clamp(2rem,4.2vw,3.1rem);margin-bottom:16px}
    .section-head p{color:var(--c-muted);font-size:1.1rem}

    /* NAV */
    header{position:fixed;top:0;left:0;right:0;z-index:50;transition:all .3s var(--ease)}
    header.scrolled{background:color-mix(in srgb,var(--c-bg) 82%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--c-border);box-shadow:var(--shadow)}
    .nav{display:flex;align-items:center;justify-content:space-between;height:74px}
    .logo{font-family:var(--font-display);font-weight:700;font-size:1.3rem;display:flex;align-items:center;gap:10px}
    .logo .mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--c-primary),var(--c-accent));display:grid;place-items:center;color:#fff;font-size:1rem;box-shadow:var(--shadow)}
    .nav-links{display:flex;gap:34px;align-items:center}
    .nav-links a{font-size:.95rem;color:var(--c-muted);font-weight:500;transition:color .2s}
    .nav-links a:hover{color:var(--c-text)}
    .nav-cta{display:flex;align-items:center;gap:14px}
    .burger{display:none;flex-direction:column;gap:5px;background:none;border:0;cursor:pointer;padding:8px}
    .burger span{width:24px;height:2px;background:var(--c-text);transition:.3s}
    .mobile-menu{display:none;flex-direction:column;gap:6px;padding:0 24px 18px}
    .mobile-menu a{padding:12px 0;border-bottom:1px solid var(--c-border);color:var(--c-text);font-weight:500}

    /* HERO */
    .hero{position:relative;padding-top:clamp(130px,16vw,190px);overflow:hidden}
    .hero-bg{position:absolute;inset:0;z-index:-1;background:
      radial-gradient(60% 50% at 15% 10%,color-mix(in srgb,var(--c-primary) 22%,transparent),transparent 70%),
      radial-gradient(50% 55% at 90% 20%,color-mix(in srgb,var(--c-secondary) 24%,transparent),transparent 70%),
      radial-gradient(60% 60% at 60% 95%,color-mix(in srgb,var(--c-accent) 16%,transparent),transparent 70%)}
    .hero-bg::after{content:"";position:absolute;inset:0;background-image:radial-gradient(var(--c-border) 1px,transparent 1px);background-size:34px 34px;opacity:.35;-webkit-mask-image:radial-gradient(70% 60% at 50% 30%,#000,transparent)}
    .hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
    .hero h1{font-size:clamp(2.6rem,6vw,4.6rem);margin:24px 0 22px}
    .hero p.lead{font-size:clamp(1.05rem,1.6vw,1.28rem);color:var(--c-muted);max-width:560px;margin-bottom:34px}
    .hero-actions{display:flex;gap:14px;flex-wrap:wrap}
    .hero-trust{margin-top:38px;display:flex;align-items:center;gap:16px;color:var(--c-muted);font-size:.9rem}
    .avatars{display:flex}
    .avatars span{width:38px;height:38px;border-radius:50%;border:2px solid var(--c-bg);margin-left:-10px;background:linear-gradient(135deg,var(--c-primary),var(--c-secondary))}
    .avatars span:nth-child(2){background:linear-gradient(135deg,var(--c-secondary),var(--c-accent))}
    .avatars span:nth-child(3){background:linear-gradient(135deg,var(--c-accent),var(--c-primary))}
    .hero-visual{position:relative;aspect-ratio:1/1;border-radius:28px;background:linear-gradient(135deg,var(--c-primary),var(--c-secondary) 60%,var(--c-accent));box-shadow:var(--shadow-lg);overflow:hidden;animation:float 7s ease-in-out infinite}
    .hero-visual::before{content:"";position:absolute;inset:0;background:conic-gradient(from 180deg at 70% 30%,transparent,rgba(255,255,255,.28),transparent 40%)}
    @keyframes float{50%{transform:translateY(-16px)}}
    .float-card{position:absolute;background:color-mix(in srgb,var(--c-bg) 88%,transparent);backdrop-filter:blur(12px);border:1px solid var(--c-border);border-radius:16px;padding:14px 18px;box-shadow:var(--shadow);display:flex;align-items:center;gap:12px}
    .float-card .ic{width:40px;height:40px;border-radius:11px;background:color-mix(in srgb,var(--c-primary) 14%,transparent);display:grid;place-items:center;color:var(--c-primary)}
    .float-card svg{width:20px;height:20px}
    .float-card b{font-family:var(--font-display);display:block;font-size:1.05rem}
    .float-card small{color:var(--c-muted);font-size:.78rem}
    .fc-1{top:18%;left:-26px;animation:float 5s ease-in-out infinite}
    .fc-2{bottom:14%;right:-22px;animation:float 6s ease-in-out infinite .5s}

    /* MARQUEE */
    .marquee{border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border);padding:26px 0;overflow:hidden;background:var(--c-surface)}
    .marquee-track{display:flex;gap:64px;align-items:center;white-space:nowrap;animation:scroll 26s linear infinite;color:var(--c-muted);font-family:var(--font-display);font-size:1.25rem;font-weight:600;opacity:.7}
    @keyframes scroll{to{transform:translateX(-50%)}}

    /* FEATURES */
    .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .card{background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:34px 30px;transition:transform .3s var(--ease),box-shadow .3s var(--ease),border-color .3s}
    .card:hover{transform:translateY(-6px);box-shadow:var(--shadow-lg);border-color:color-mix(in srgb,var(--c-primary) 40%,transparent)}
    .card .ic{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--c-primary),var(--c-secondary));color:#fff;display:grid;place-items:center;margin-bottom:20px}
    .card .ic svg{width:25px;height:25px}
    .card h3{font-size:1.3rem;margin-bottom:10px}
    .card p{color:var(--c-muted)}

    /* SHOWCASE */
    .showcase{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
    .showcase h2{font-size:clamp(1.9rem,3.6vw,2.8rem);margin-bottom:18px}
    .showcase p{color:var(--c-muted);font-size:1.1rem;margin-bottom:26px}
    .showcase ul{list-style:none;display:grid;gap:14px}
    .showcase li{display:flex;gap:12px;align-items:flex-start;font-weight:500}
    .showcase li svg{width:22px;height:22px;color:var(--c-accent);flex-shrink:0;margin-top:2px}
    .showcase-visual{aspect-ratio:4/3;border-radius:24px;background:
      radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--c-accent) 50%,transparent),transparent 60%),
      linear-gradient(135deg,var(--c-secondary),var(--c-primary));box-shadow:var(--shadow-lg);position:relative;overflow:hidden}
    .showcase-visual::after{content:"";position:absolute;inset:0;background:conic-gradient(from 90deg at 60% 40%,transparent,rgba(255,255,255,.25),transparent 35%)}

    /* GALLERY */
    .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
    .tile{aspect-ratio:4/3;border-radius:16px;position:relative;overflow:hidden;border:1px solid var(--c-border);box-shadow:var(--shadow);cursor:pointer}
    .tile .ph{position:absolute;inset:0;background:linear-gradient(135deg,var(--c-primary),var(--c-secondary));opacity:.9;transition:transform .5s var(--ease)}
    .tile:nth-child(2n) .ph{background:linear-gradient(135deg,var(--c-secondary),var(--c-accent))}
    .tile:nth-child(3n) .ph{background:linear-gradient(135deg,var(--c-accent),var(--c-primary))}
    .tile:hover .ph{transform:scale(1.08)}
    .tile .label{position:absolute;left:0;right:0;bottom:0;padding:18px;color:#fff;font-family:var(--font-display);font-weight:600;font-size:1.05rem;background:linear-gradient(0deg,rgba(0,0,0,.55),transparent);z-index:1}

    /* STATS */
    .stats{background:var(--c-surface);border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border)}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
    .stat .num{font-family:var(--font-display);font-size:clamp(2.4rem,5vw,3.4rem);font-weight:700;background:linear-gradient(120deg,var(--c-primary),var(--c-accent));-webkit-background-clip:text;background-clip:text;color:transparent}
    .stat .lbl{color:var(--c-muted);font-weight:500;margin-top:6px}

    /* TESTIMONIALS */
    .quote-card{background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:32px;display:flex;flex-direction:column;gap:18px}
    .quote-card .stars{display:flex;gap:3px;color:var(--c-accent)}
    .quote-card .stars svg{width:18px;height:18px;fill:var(--c-accent)}
    .quote-card blockquote{font-size:1.08rem;font-weight:500;line-height:1.55}
    .quote-card .who{display:flex;align-items:center;gap:12px;margin-top:auto}
    .quote-card .who .ava{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--c-primary),var(--c-secondary))}
    .quote-card .who b{display:block;font-family:var(--font-display)}
    .quote-card .who small{color:var(--c-muted)}

    /* CTA */
    .cta-band{position:relative;border-radius:28px;padding:clamp(48px,7vw,86px) 32px;text-align:center;color:#fff;overflow:hidden;background:linear-gradient(120deg,var(--c-primary),var(--c-secondary) 55%,var(--c-accent));box-shadow:var(--shadow-lg)}
    .cta-band::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.22),transparent 50%)}
    .cta-band h2{font-size:clamp(2rem,4.5vw,3.2rem);margin-bottom:14px;position:relative}
    .cta-band p{font-size:1.15rem;opacity:.92;margin-bottom:30px;position:relative}
    .cta-band .btn{position:relative;background:#fff;color:var(--c-primary)}

    /* CONTACT */
    .contact{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
    .contact h2{font-size:clamp(1.9rem,3.6vw,2.7rem);margin-bottom:14px}
    .contact p{color:var(--c-muted);margin-bottom:24px}
    .contact .info{display:grid;gap:16px}
    .contact .info div{display:flex;align-items:center;gap:12px;font-weight:500}
    .contact .info svg{width:22px;height:22px;color:var(--c-primary)}
    form{display:grid;gap:14px;background:var(--c-surface);border:1px solid var(--c-border);border-radius:var(--radius);padding:30px}
    label{font-size:.85rem;font-weight:600;color:var(--c-muted)}
    input,textarea{width:100%;padding:13px 15px;border-radius:11px;border:1px solid var(--c-border);background:var(--c-bg);color:var(--c-text);font-family:inherit;font-size:.98rem;transition:border-color .2s,box-shadow .2s}
    input:focus,textarea:focus{outline:none;border-color:var(--c-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--c-primary) 16%,transparent)}

    /* FOOTER */
    footer{background:var(--c-surface);border-top:1px solid var(--c-border);padding:64px 0 32px}
    .foot-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:44px}
    .foot-grid h4{font-family:var(--font-display);margin-bottom:16px;font-size:1rem}
    .foot-grid a{display:block;color:var(--c-muted);padding:6px 0;font-size:.92rem;transition:color .2s}
    .foot-grid a:hover{color:var(--c-primary)}
    .foot-bottom{border-top:1px solid var(--c-border);padding-top:24px;display:flex;justify-content:space-between;align-items:center;color:var(--c-muted);font-size:.88rem;flex-wrap:wrap;gap:12px}

    /* REVEAL */
    .reveal{opacity:0;transform:translateY(28px);transition:opacity .7s var(--ease),transform .7s var(--ease)}
    .reveal.in{opacity:1;transform:none}

    @media(max-width:900px){
      .hero-grid,.showcase,.contact{grid-template-columns:1fr}
      .hero-visual{max-width:440px;margin:8px auto 0}
      .grid-3,.gallery-grid,.stats-grid,.foot-grid{grid-template-columns:1fr 1fr}
      .nav-links{display:none}
      .burger{display:flex}
      .nav-cta .btn{display:none}
    }
    @media(max-width:560px){
      .grid-3,.gallery-grid,.stats-grid,.foot-grid{grid-template-columns:1fr}
    }
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
  `;

  const featureCards = copy.features.map((f) => `
    <article class="card reveal">
      <div class="ic">${icon(f.icon)}</div>
      <h3>${f.title}</h3>
      <p>${f.body}</p>
    </article>`).join('');

  const galleryTiles = copy.galleryItems.map((g) => `
    <div class="tile reveal"><div class="ph"></div><div class="label">${escapeHtml(g)}</div></div>`).join('');

  const statCards = copy.stats.map((s) => `
    <div class="stat reveal"><div class="num" data-target="${escapeHtml(s.value)}">${escapeHtml(s.value)}</div><div class="lbl">${escapeHtml(s.label)}</div></div>`).join('');

  const stars = '<div class="stars">' + icon('star').repeat(5) + '</div>';
  const testimonialCards = copy.testimonials.map((t) => `
    <article class="quote-card reveal">
      ${stars}
      <blockquote>“${escapeHtml(t.quote)}”</blockquote>
      <div class="who"><div class="ava"></div><div><b>${escapeHtml(t.name)}</b><small>${escapeHtml(t.role)}</small></div></div>
    </article>`).join('');

  const showcasePoints = ['Thoughtful by design', 'Built for the long run', 'Loved by the people who use it']
    .map((p) => `<li>${icon('star')}<span>${p}</span></li>`).join('');

  const marqueeItems = (copy.galleryItems.concat(copy.galleryItems)).map((m) => `<span>${escapeHtml(m)}</span>`).join('');

  // Embedded JS — written without ${...} so it survives the template literal.
  const js = `
    (function(){
      var header=document.querySelector('header');
      function onScroll(){header.classList.toggle('scrolled',window.scrollY>20);}
      window.addEventListener('scroll',onScroll,{passive:true});onScroll();
      var burger=document.querySelector('.burger'),menu=document.querySelector('.mobile-menu');
      if(burger){burger.addEventListener('click',function(){var open=menu.style.display==='flex';menu.style.display=open?'none':'flex';});}
      document.querySelectorAll('.mobile-menu a').forEach(function(a){a.addEventListener('click',function(){menu.style.display='none';});});
      var io=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.14});
      document.querySelectorAll('.reveal').forEach(function(el,i){el.style.transitionDelay=(i%3*70)+'ms';io.observe(el);});
      var year=document.getElementById('yr');if(year){year.textContent=new Date().getFullYear();}
      var form=document.querySelector('form');if(form){form.addEventListener('submit',function(ev){ev.preventDefault();var b=form.querySelector('button');b.textContent='Thank you!';b.disabled=true;});}
    })();
  `;

  const navLinkHtml = navLinks.map((l) => `<a href="#${l.toLowerCase()}">${escapeHtml(l)}</a>`).join('');
  const mobileLinkHtml = navLinks.map((l) => `<a href="#${l.toLowerCase()}">${escapeHtml(l)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en"${isDark ? ' data-theme="dark"' : ''}>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${brand} — ${copy.eyebrow}</title>
<meta name="description" content="${escapeHtml(copy.sub)}" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fonts.href}" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="logo" href="#home"><span class="mark">${brand.charAt(0).toUpperCase()}</span>${brand}</a>
    <nav class="nav-links">${navLinkHtml}</nav>
    <div class="nav-cta">
      <a class="btn btn-primary" href="#contact">${escapeHtml(copy.primaryCta)}</a>
      <button class="burger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="mobile-menu">${mobileLinkHtml}<a class="btn btn-primary" href="#contact" style="margin-top:10px">${escapeHtml(copy.primaryCta)}</a></div>
</header>

<main>
  <section class="hero" id="home">
    <div class="hero-bg"></div>
    <div class="wrap hero-grid">
      <div>
        <span class="eyebrow"><span class="dot"></span>${escapeHtml(copy.eyebrow)}</span>
        <h1>${copy.headline(brand)}</h1>
        <p class="lead">${escapeHtml(copy.sub)}</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#contact">${escapeHtml(copy.primaryCta)}</a>
          <a class="btn btn-ghost" href="#about">${escapeHtml(copy.secondaryCta)}</a>
        </div>
        <div class="hero-trust">
          <div class="avatars"><span></span><span></span><span></span></div>
          <span>Trusted by ${escapeHtml(copy.stats[2]?.value || '5k+')} ${niche === 'saas' ? 'teams' : 'customers'}</span>
        </div>
      </div>
      <div class="hero-visual">
        <div class="float-card fc-1"><div class="ic">${icon('star')}</div><div><b>${escapeHtml(copy.stats[0]?.value || '4.9')}</b><small>${escapeHtml(copy.stats[0]?.label || 'Rating')}</small></div></div>
        <div class="float-card fc-2"><div class="ic">${icon('bolt')}</div><div><b>${escapeHtml(copy.stats[1]?.value || '24h')}</b><small>${escapeHtml(copy.stats[1]?.label || 'Fast')}</small></div></div>
      </div>
    </div>
  </section>

  <div class="marquee"><div class="marquee-track">${marqueeItems}</div></div>

  <section id="features">
    <div class="wrap">
      <div class="section-head reveal">
        <h2>Why ${brand}</h2>
        <p>Everything you need, nothing you don’t — designed around what actually matters to you.</p>
      </div>
      <div class="grid-3">${featureCards}</div>
    </div>
  </section>

  <section id="about">
    <div class="wrap showcase">
      <div class="reveal">
        <span class="eyebrow"><span class="dot"></span>The difference</span>
        <h2 style="margin-top:18px">${escapeHtml(copy.showcaseTitle)}</h2>
        <p>${escapeHtml(copy.showcaseBody)}</p>
        <ul>${showcasePoints}</ul>
      </div>
      <div class="showcase-visual reveal"></div>
    </div>
  </section>

  ${showGallery ? `
  <section id="${(copy.galleryTitle.split(' ')[0] || 'work').toLowerCase()}">
    <div class="wrap">
      <div class="section-head reveal"><h2>${escapeHtml(copy.galleryTitle)}</h2><p>A closer look at what makes ${brand} worth choosing.</p></div>
      <div class="gallery-grid">${galleryTiles}</div>
    </div>
  </section>` : ''}

  <section class="stats">
    <div class="wrap stats-grid">${statCards}</div>
  </section>

  <section id="testimonials">
    <div class="wrap">
      <div class="section-head reveal"><h2>Loved by the people we serve</h2><p>Don’t just take our word for it — here’s what they say.</p></div>
      <div class="grid-3">${testimonialCards}</div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="cta-band reveal">
        <h2>${escapeHtml(copy.ctaTitle)}</h2>
        <p>${escapeHtml(copy.ctaBody)}</p>
        <a class="btn" href="#contact">${escapeHtml(copy.primaryCta)}</a>
      </div>
    </div>
  </section>

  <section id="contact">
    <div class="wrap contact">
      <div class="reveal">
        <span class="eyebrow"><span class="dot"></span>Get in touch</span>
        <h2 style="margin-top:18px">Let’s talk</h2>
        <p>Have a question or ready to get started? Send a message and we’ll get back to you within one business day.</p>
        <div class="info">
          <div>${icon('globe')}<span>hello@${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com</span></div>
          <div>${icon('heart')}<span>Mon–Fri, 9am–6pm</span></div>
          <div>${icon('shield')}<span>We respect your privacy</span></div>
        </div>
      </div>
      <form class="reveal">
        <div><label>Name</label><input type="text" name="name" placeholder="Your name" required /></div>
        <div><label>Email</label><input type="email" name="email" placeholder="you@email.com" required /></div>
        <div><label>Message</label><textarea name="message" rows="4" placeholder="How can we help?" required></textarea></div>
        <button type="submit" class="btn btn-primary" style="justify-content:center">${escapeHtml(copy.primaryCta)}</button>
      </form>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a class="logo" href="#home" style="margin-bottom:14px"><span class="mark">${brand.charAt(0).toUpperCase()}</span>${brand}</a>
        <p style="color:var(--c-muted);max-width:280px">${escapeHtml(copy.sub.slice(0, 110))}</p>
      </div>
      <div><h4>Company</h4><a href="#about">About</a><a href="#features">Features</a><a href="#testimonials">Reviews</a></div>
      <div><h4>Explore</h4><a href="#contact">Contact</a><a href="#home">Home</a><a href="#features">Services</a></div>
      <div><h4>Legal</h4><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a></div>
    </div>
    <div class="foot-bottom">
      <span>© <span id="yr">${year}</span> ${brand}. All rights reserved.</span>
      <span>Built with care.</span>
    </div>
  </div>
</footer>
<script>${js}</script>
</body>
</html>`;
}
