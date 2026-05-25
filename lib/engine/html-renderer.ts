import type { ISharedContext } from './core/types';
import type { DesignDNAArtifact } from './engines/design-dna';
import type { PlanningArtifact } from './engines/planning';
import type { BlueprintArtifact } from './engines/blueprint';

// Turns the orchestrator's design/planning artifacts into ONE self-contained
// HTML document (inlined CSS + JS, no external assets) suitable for storing in
// Website.htmlContent and serving through the existing iframe flow.

interface SectionSpec {
  id: string;
  kind: 'hero' | 'features' | 'gallery' | 'about' | 'stats' | 'testimonials' | 'cta' | 'contact';
  title: string;
  body?: string;
  items?: { title: string; text: string; icon?: string }[];
}

const ICONS = ['◆', '✦', '❖', '◈', '✺', '❉', '✴', '⬡'];

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function inferNiche(prompt: string): string {
  const p = prompt.toLowerCase();
  const map: [string, string][] = [
    ['restaurant', 'restaurant'], ['ramen', 'restaurant'], ['cafe', 'restaurant'], ['food', 'restaurant'],
    ['coffee', 'restaurant'], ['bakery', 'restaurant'], ['portfolio', 'portfolio'], ['photographer', 'portfolio'],
    ['agency', 'agency'], ['studio', 'agency'], ['saas', 'saas'], ['software', 'saas'], ['app', 'saas'],
    ['shop', 'ecommerce'], ['store', 'ecommerce'], ['fashion', 'ecommerce'], ['apparel', 'ecommerce'],
    ['shoe', 'ecommerce'], ['jersey', 'ecommerce'], ['clinic', 'medical'], ['dental', 'medical'],
    ['fitness', 'fitness'], ['gym', 'fitness'], ['yoga', 'fitness'], ['real estate', 'realestate'],
    ['property', 'realestate'], ['law', 'professional'], ['consult', 'professional'], ['finance', 'professional'],
  ];
  for (const [k, v] of map) if (p.includes(k)) return v;
  return 'business';
}

function nicheCopy(niche: string, brand: string): {
  heroTitle: string; heroSub: string; ctaPrimary: string; ctaSecondary: string;
  features: { title: string; text: string }[]; aboutTitle: string; aboutBody: string;
  stats: { value: string; label: string }[];
} {
  const presets: Record<string, ReturnType<typeof nicheCopy>> = {
    restaurant: {
      heroTitle: `Taste the craft of ${brand}`,
      heroSub: 'Bold flavors, honest ingredients, and a room that feels like home. Reserve your table and stay a while.',
      ctaPrimary: 'Reserve a Table', ctaSecondary: 'View Menu',
      features: [
        { title: 'Seasonal Menu', text: 'Dishes that change with the harvest — always fresh, never repeated.' },
        { title: 'Hand-Crafted', text: 'Every plate is made to order by chefs who care about the details.' },
        { title: 'Warm Atmosphere', text: 'A space designed for slow evenings and good company.' },
      ],
      aboutTitle: 'Our Story',
      aboutBody: `${brand} began with a simple belief: great food brings people together. We source locally, cook with intention, and treat every guest like family.`,
      stats: [{ value: '12+', label: 'Years Serving' }, { value: '40k', label: 'Happy Guests' }, { value: '4.9', label: 'Avg. Rating' }],
    },
    ecommerce: {
      heroTitle: `${brand} — gear that performs`,
      heroSub: 'Premium products built for the way you move. Free shipping, easy returns, and a fit you will love.',
      ctaPrimary: 'Shop Now', ctaSecondary: 'Browse Collection',
      features: [
        { title: 'Premium Quality', text: 'Materials and construction tested to outlast the hype.' },
        { title: 'Fast Delivery', text: 'Orders out the door in 24 hours, tracked every step.' },
        { title: 'Easy Returns', text: '30-day no-questions returns. Love it or send it back.' },
      ],
      aboutTitle: 'Built Different',
      aboutBody: `${brand} obsesses over the details others skip. From stitch to sole, every product is engineered for performance and made to last.`,
      stats: [{ value: '50k+', label: 'Orders Shipped' }, { value: '4.8', label: 'Customer Rating' }, { value: '24h', label: 'Dispatch Time' }],
    },
    saas: {
      heroTitle: `${brand} ships faster`,
      heroSub: 'The platform that turns your workflow into momentum. Powerful, simple, and built to scale with your team.',
      ctaPrimary: 'Start Free', ctaSecondary: 'Book a Demo',
      features: [
        { title: 'Lightning Fast', text: 'Built on modern infrastructure for instant response at any scale.' },
        { title: 'Secure by Default', text: 'Enterprise-grade security and compliance baked in from day one.' },
        { title: 'Integrates Everywhere', text: 'Connect the tools you already use in a couple of clicks.' },
      ],
      aboutTitle: 'Why Teams Choose Us',
      aboutBody: `${brand} replaces the patchwork of tools your team juggles with one focused platform — so you spend less time on busywork and more time shipping.`,
      stats: [{ value: '99.9%', label: 'Uptime' }, { value: '10k+', label: 'Teams' }, { value: '2x', label: 'Faster Delivery' }],
    },
    portfolio: {
      heroTitle: `${brand}`,
      heroSub: 'Selected work, a clear point of view, and a craft refined over years. Let us make something worth remembering.',
      ctaPrimary: 'View Work', ctaSecondary: 'Get in Touch',
      features: [
        { title: 'Design', text: 'Interfaces and brands with intention behind every decision.' },
        { title: 'Direction', text: 'Concepts that connect strategy to a memorable experience.' },
        { title: 'Craft', text: 'Pixel-level care, from first sketch to final ship.' },
      ],
      aboutTitle: 'About',
      aboutBody: `I'm ${brand} — a maker focused on clarity, taste, and the details that separate good from unforgettable.`,
      stats: [{ value: '80+', label: 'Projects' }, { value: '15', label: 'Awards' }, { value: '10y', label: 'Experience' }],
    },
    agency: {
      heroTitle: `${brand} builds brands that move`,
      heroSub: 'Strategy, design, and technology under one roof. We partner with ambitious teams to create work that matters.',
      ctaPrimary: 'Start a Project', ctaSecondary: 'See Our Work',
      features: [
        { title: 'Strategy', text: 'Positioning and narrative that give your brand an edge.' },
        { title: 'Design', text: 'Visual systems that are as functional as they are beautiful.' },
        { title: 'Build', text: 'Production-grade engineering that brings the vision to life.' },
      ],
      aboutTitle: 'Who We Are',
      aboutBody: `${brand} is a collective of strategists, designers, and engineers obsessed with outcomes. We measure success by the impact we create for our partners.`,
      stats: [{ value: '120+', label: 'Projects' }, { value: '30', label: 'Team Members' }, { value: '9', label: 'Industries' }],
    },
    business: {
      heroTitle: `Welcome to ${brand}`,
      heroSub: 'We help you do more of what matters. Thoughtful service, dependable results, and a team that genuinely cares.',
      ctaPrimary: 'Get Started', ctaSecondary: 'Learn More',
      features: [
        { title: 'Trusted', text: 'A track record built on consistency and care.' },
        { title: 'Focused', text: 'We do a few things exceptionally well — for you.' },
        { title: 'Responsive', text: 'Real people, ready when you need them most.' },
      ],
      aboutTitle: 'About Us',
      aboutBody: `${brand} exists to make your life easier. We combine experience with a personal touch to deliver results you can count on.`,
      stats: [{ value: '10+', label: 'Years' }, { value: '5k+', label: 'Clients' }, { value: '98%', label: 'Satisfaction' }],
    },
  };
  return presets[niche] || presets.business;
}

export function renderSiteHtml(
  ctx: ISharedContext,
  brandName: string,
): string {
  const prompt = ctx.input.userPrompt;
  const dna = ctx.getArtifact<DesignDNAArtifact>('design-dna');
  const plan = ctx.getArtifact<PlanningArtifact>('planning');
  const blueprint = ctx.getArtifact<BlueprintArtifact>('blueprint');

  const niche = inferNiche(prompt);
  const copy = nicheCopy(niche, brandName);

  const c = dna?.colorPalette ?? {
    primary: '#2563eb', secondary: '#6366f1', accent: '#10b981',
    background: '#ffffff', surface: '#f8fafc', text: '#0f172a',
    textMuted: '#64748b', border: '#e2e8f0', error: '#ef4444', success: '#22c55e',
  };
  const font = dna?.typography?.fontFamily ?? 'system-ui, -apple-system, sans-serif';
  const ease = dna?.motionTokens?.easing?.default ?? 'cubic-bezier(0.4, 0, 0.2, 1)';
  const dur = dna?.motionTokens?.duration?.slow ?? '500ms';
  const isDark = dna?.theme === 'dark';

  const features = (plan?.features ?? []) as string[];
  const hasGallery = features.includes('gallery') || niche === 'restaurant' || niche === 'portfolio' || niche === 'ecommerce';
  const hasContact = features.includes('contact') || true;

  const navLinks = ['Home', copy.aboutTitle.split(' ')[0], 'Features', ...(hasGallery ? ['Gallery'] : []), 'Contact'];

  const galleryTiles = Array.from({ length: 6 }).map((_, i) => {
    const hue = i * 47;
    return `<div class="tile reveal" style="--i:${i}; background:
      linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 55%, ${c.accent} 100%);
      filter: hue-rotate(${hue}deg);">
        <span class="tile-tag">${esc(titleCase(niche))} ${i + 1}</span>
      </div>`;
  }).join('\n');

  const featureCards = copy.features.map((f, i) => `
    <article class="card reveal" style="--i:${i}">
      <div class="card-icon">${ICONS[i % ICONS.length]}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.text)}</p>
    </article>`).join('\n');

  const statBlocks = copy.stats.map((s, i) => `
    <div class="stat reveal" style="--i:${i}">
      <div class="stat-value">${esc(s.value)}</div>
      <div class="stat-label">${esc(s.label)}</div>
    </div>`).join('\n');

  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(brandName)}</title>
<meta name="description" content="${esc(copy.heroSub)}" />
<style>
  :root{
    --primary:${c.primary};--secondary:${c.secondary};--accent:${c.accent};
    --bg:${c.background};--surface:${c.surface};--text:${c.text};
    --muted:${c.textMuted};--border:${c.border};
    --ease:${ease};--dur:${dur};--font:${font};
    --maxw:1180px;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{font-family:var(--font);color:var(--text);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  img{max-width:100%;display:block}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
  ::selection{background:var(--primary);color:#fff}

  /* nav */
  header{position:fixed;top:0;left:0;right:0;z-index:50;transition:all var(--dur) var(--ease)}
  header.scrolled{background:${isDark ? 'rgba(15,23,42,.82)' : 'rgba(255,255,255,.82)'};backdrop-filter:blur(12px);border-bottom:1px solid var(--border)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:72px}
  .logo{font-weight:800;font-size:1.25rem;letter-spacing:-.02em}
  .logo b{color:var(--primary)}
  .nav-links{display:flex;gap:28px;align-items:center}
  .nav-links a{font-size:.92rem;color:var(--muted);transition:color .2s}
  .nav-links a:hover{color:var(--text)}
  .btn{display:inline-block;font-weight:600;border-radius:10px;padding:12px 22px;cursor:pointer;border:none;transition:transform .2s var(--ease),box-shadow .2s var(--ease);font-family:inherit;font-size:.95rem}
  .btn-primary{background:var(--primary);color:#fff;box-shadow:0 8px 24px -8px var(--primary)}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 14px 34px -8px var(--primary)}
  .btn-ghost{background:transparent;color:var(--text);border:1.5px solid var(--border)}
  .btn-ghost:hover{border-color:var(--primary);color:var(--primary)}
  .nav-toggle{display:none;background:none;border:none;font-size:1.5rem;color:var(--text);cursor:pointer}

  /* hero */
  .hero{position:relative;padding:170px 0 110px;overflow:hidden}
  .hero::before{content:"";position:absolute;inset:0;z-index:-1;
    background:radial-gradient(1200px 600px at 75% -10%, ${c.primary}22, transparent 60%),
    radial-gradient(900px 500px at 10% 20%, ${c.accent}1c, transparent 55%)}
  .hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center}
  .eyebrow{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--primary);margin-bottom:18px}
  .hero h1{font-size:clamp(2.4rem,5.2vw,4.1rem);line-height:1.05;letter-spacing:-.03em;font-weight:800;margin-bottom:22px}
  .hero p.lead{font-size:1.18rem;color:var(--muted);max-width:34ch;margin-bottom:32px}
  .hero-cta{display:flex;gap:14px;flex-wrap:wrap}
  .hero-visual{aspect-ratio:4/5;border-radius:22px;position:relative;overflow:hidden;
    background:linear-gradient(135deg,var(--primary),var(--secondary) 55%,var(--accent));
    box-shadow:0 40px 90px -30px ${c.primary}66}
  .hero-visual::after{content:"";position:absolute;inset:0;
    background:radial-gradient(circle at 30% 20%, #ffffff44, transparent 45%),
    repeating-linear-gradient(45deg,#ffffff0d 0 14px,transparent 14px 28px)}
  .float-card{position:absolute;background:${isDark ? '#1e293b' : '#fff'};border:1px solid var(--border);border-radius:14px;padding:14px 18px;box-shadow:0 20px 50px -20px #0006;font-weight:600;font-size:.9rem}
  .float-card.a{top:8%;right:-18px}
  .float-card.b{bottom:10%;left:-18px}
  .float-card small{display:block;color:var(--muted);font-weight:500;font-size:.78rem}

  /* sections */
  section{padding:96px 0}
  .section-head{text-align:center;max-width:60ch;margin:0 auto 56px}
  .section-head .eyebrow{margin-bottom:12px}
  .section-head h2{font-size:clamp(1.8rem,3.6vw,2.7rem);letter-spacing:-.02em;font-weight:800;margin-bottom:14px}
  .section-head p{color:var(--muted);font-size:1.08rem}

  .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:34px 28px;transition:transform .3s var(--ease),box-shadow .3s var(--ease)}
  .card:hover{transform:translateY(-6px);box-shadow:0 30px 60px -30px ${c.primary}55}
  .card-icon{width:52px;height:52px;border-radius:13px;display:grid;place-items:center;font-size:1.5rem;color:#fff;margin-bottom:20px;background:linear-gradient(135deg,var(--primary),var(--secondary))}
  .card h3{font-size:1.25rem;margin-bottom:10px;letter-spacing:-.01em}
  .card p{color:var(--muted)}

  /* about */
  .about{background:var(--surface)}
  .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
  .about-visual{aspect-ratio:1/1;border-radius:22px;background:
    conic-gradient(from 210deg at 50% 50%, var(--primary), var(--secondary), var(--accent), var(--primary));
    box-shadow:0 40px 90px -40px ${c.secondary}66}
  .about h2{font-size:clamp(1.8rem,3.4vw,2.6rem);letter-spacing:-.02em;font-weight:800;margin-bottom:18px}
  .about p{color:var(--muted);font-size:1.1rem;margin-bottom:26px}

  /* stats */
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;text-align:center}
  .stat-value{font-size:clamp(2.2rem,5vw,3.4rem);font-weight:800;letter-spacing:-.03em;
    background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .stat-label{color:var(--muted);font-weight:600;margin-top:6px}

  /* gallery */
  .gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  .tile{aspect-ratio:4/3;border-radius:16px;position:relative;overflow:hidden;display:flex;align-items:flex-end;padding:18px}
  .tile-tag{position:relative;z-index:2;color:#fff;font-weight:700;letter-spacing:.02em;text-shadow:0 2px 8px #0006}
  .tile::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#0007)}

  /* cta */
  .cta-band{background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:28px;padding:64px;text-align:center;color:#fff;position:relative;overflow:hidden}
  .cta-band::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,#ffffff10 0 16px,transparent 16px 32px)}
  .cta-band h2{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;letter-spacing:-.02em;margin-bottom:14px;position:relative}
  .cta-band p{opacity:.92;margin-bottom:28px;font-size:1.1rem;position:relative}
  .cta-band .btn{position:relative;background:#fff;color:var(--primary)}

  /* contact */
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
  form{display:grid;gap:16px}
  .field{display:grid;gap:7px}
  .field label{font-size:.85rem;font-weight:600;color:var(--muted)}
  .field input,.field textarea{font-family:inherit;font-size:1rem;padding:13px 15px;border:1.5px solid var(--border);border-radius:11px;background:var(--bg);color:var(--text);transition:border-color .2s}
  .field input:focus,.field textarea:focus{outline:none;border-color:var(--primary)}

  /* footer */
  footer{border-top:1px solid var(--border);padding:48px 0;color:var(--muted);font-size:.92rem}
  .foot{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}

  /* reveal anim */
  .reveal{opacity:0;transform:translateY(28px);transition:opacity .7s var(--ease),transform .7s var(--ease);transition-delay:calc(var(--i,0)*80ms)}
  .reveal.visible{opacity:1;transform:none}
  @media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}}

  /* responsive */
  @media (max-width:900px){
    .hero-grid,.about-grid,.contact-grid{grid-template-columns:1fr}
    .grid-3,.stats,.gallery-grid{grid-template-columns:1fr 1fr}
    .hero-visual{display:none}
    .nav-links{position:fixed;inset:72px 0 auto 0;flex-direction:column;background:var(--bg);border-bottom:1px solid var(--border);padding:24px;gap:18px;transform:translateY(-120%);transition:transform .35s var(--ease)}
    .nav-links.open{transform:none}
    .nav-toggle{display:block}
  }
  @media (max-width:560px){.grid-3,.stats,.gallery-grid{grid-template-columns:1fr}.cta-band{padding:40px 24px}}
</style>
</head>
<body>
<header id="hdr">
  <div class="wrap nav">
    <a href="#home" class="logo">${esc(brandName.split(' ')[0])}<b>${esc(brandName.split(' ').slice(1).join(' ') || '.')}</b></a>
    <nav class="nav-links" id="navlinks">
      ${navLinks.map((l) => `<a href="#${l.toLowerCase()}">${esc(l)}</a>`).join('\n      ')}
      <button class="btn btn-primary" onclick="location.href='#contact'">${esc(copy.ctaPrimary)}</button>
    </nav>
    <button class="nav-toggle" id="navtoggle" aria-label="Menu">☰</button>
  </div>
</header>

<main>
  <section class="hero" id="home">
    <div class="wrap hero-grid">
      <div>
        <span class="eyebrow">${esc(titleCase(niche))}</span>
        <h1>${esc(copy.heroTitle)}</h1>
        <p class="lead">${esc(copy.heroSub)}</p>
        <div class="hero-cta">
          <button class="btn btn-primary" onclick="location.href='#contact'">${esc(copy.ctaPrimary)}</button>
          <button class="btn btn-ghost" onclick="location.href='#features'">${esc(copy.ctaSecondary)}</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="float-card a">${esc(copy.stats[1]?.value || '4.9')}<small>${esc(copy.stats[1]?.label || 'Rating')}</small></div>
        <div class="float-card b">${esc(copy.stats[0]?.value || '12+')}<small>${esc(copy.stats[0]?.label || 'Years')}</small></div>
      </div>
    </div>
  </section>

  <section id="features">
    <div class="wrap">
      <div class="section-head">
        <span class="eyebrow">What we offer</span>
        <h2>Everything you need, nothing you don't</h2>
        <p>Thoughtfully built around what actually matters to you.</p>
      </div>
      <div class="grid-3">${featureCards}</div>
    </div>
  </section>

  <section class="about" id="${esc(copy.aboutTitle.split(' ')[0].toLowerCase())}">
    <div class="wrap about-grid">
      <div class="about-visual reveal"></div>
      <div class="reveal" style="--i:1">
        <span class="eyebrow">${esc(copy.aboutTitle)}</span>
        <h2>${esc(copy.aboutTitle)}</h2>
        <p>${esc(copy.aboutBody)}</p>
        <button class="btn btn-primary" onclick="location.href='#contact'">${esc(copy.ctaPrimary)}</button>
      </div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="stats">${statBlocks}</div>
    </div>
  </section>

  ${hasGallery ? `<section id="gallery">
    <div class="wrap">
      <div class="section-head">
        <span class="eyebrow">Gallery</span>
        <h2>A look at our work</h2>
        <p>A selection of moments and pieces we're proud of.</p>
      </div>
      <div class="gallery-grid">${galleryTiles}</div>
    </div>
  </section>` : ''}

  <section>
    <div class="wrap">
      <div class="cta-band reveal">
        <h2>${esc(copy.ctaPrimary)} with ${esc(brandName)}</h2>
        <p>${esc(copy.heroSub)}</p>
        <button class="btn" onclick="location.href='#contact'">${esc(copy.ctaPrimary)}</button>
      </div>
    </div>
  </section>

  ${hasContact ? `<section id="contact">
    <div class="wrap contact-grid">
      <div>
        <span class="eyebrow">Get in touch</span>
        <h2 style="font-size:clamp(1.8rem,3.4vw,2.6rem);letter-spacing:-.02em;font-weight:800;margin:12px 0 16px">Let's talk</h2>
        <p style="color:var(--muted);font-size:1.08rem">Have a question or ready to start? Drop us a note and we'll get back within one business day.</p>
      </div>
      <form onsubmit="event.preventDefault(); this.reset(); alert('Thanks — we\\'ll be in touch!');">
        <div class="field"><label>Name</label><input required placeholder="Your name" /></div>
        <div class="field"><label>Email</label><input type="email" required placeholder="you@example.com" /></div>
        <div class="field"><label>Message</label><textarea rows="4" required placeholder="Tell us a little about what you need..."></textarea></div>
        <button class="btn btn-primary" type="submit">${esc(copy.ctaPrimary)}</button>
      </form>
    </div>
  </section>` : ''}
</main>

<footer>
  <div class="wrap foot">
    <div class="logo">${esc(brandName.split(' ')[0])}<b>${esc(brandName.split(' ').slice(1).join(' ') || '.')}</b></div>
    <div>© ${year} ${esc(brandName)}. All rights reserved.</div>
  </div>
</footer>

<script>
  (function(){
    var hdr=document.getElementById('hdr');
    var onScroll=function(){ if(window.scrollY>20){hdr.classList.add('scrolled');}else{hdr.classList.remove('scrolled');} };
    window.addEventListener('scroll',onScroll,{passive:true}); onScroll();

    var toggle=document.getElementById('navtoggle'), links=document.getElementById('navlinks');
    if(toggle){toggle.addEventListener('click',function(){links.classList.toggle('open');});}
    links.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){links.classList.remove('open');});});

    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){e.target.classList.add('visible'); io.unobserve(e.target);} });
    },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    document.querySelectorAll('.reveal, .card, .stat, .tile').forEach(function(el){el.classList.add('reveal'); io.observe(el);});
  })();
</script>
</body>
</html>`;
}
