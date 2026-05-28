// ---------------------------------------------------------------------------
// PUO-Driven Multi-Page HTML Renderer
//
// Replaces the static mood-token template system with:
//   1. PromptUnderstandingObject (PUO) — 12-dimension prompt analysis
//   2. LayoutGraph — procedurally unique section ordering per prompt
//   3. CSS custom properties derived entirely from PUO (no shared skeletons)
//
// Every button connects to a real route. Every page has its own LayoutGraph.
// No niche templates. No repeated compositions. No pseudo-pages.
// ---------------------------------------------------------------------------

import type { ISharedContext } from './core/types';
import { parsePrompt } from './prompt-engine';
import { composeLayout } from './layout-composer';
import { diversifyLayout } from './diversity-engine';
import type { PromptUnderstandingObject } from './prompt-engine';
import type { LayoutGraph, LayoutNode, ComposerInput } from './layout-composer';

// Backward-compat re-exports
export type Niche = 'sports'|'restaurant'|'portfolio'|'ecommerce'|'saas'|'agency'|'business';
export type { DesignMood } from './prompt-intelligence';

export interface MultiPageOutput {
  pages: Record<string, string>;
  nav: Array<{ label: string; href: string }>;
  gallerySlug: string;
  primaryPage: string;
}

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function ph(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80&h=${h}`;
}

// ─────────────────────────────────────────────────────────────────
// NICHE DETECTION (backward compat)
// ─────────────────────────────────────────────────────────────────

export function detectNiche(prompt: string): Niche {
  const p = prompt.toLowerCase();
  if (/(basketball|sneaker|jersey|athletic|sportswear|activewear|\bsports?\b|\bgym\b|fitness|workout|crossfit|\bnba\b|hoops|football|soccer)/.test(p)) return 'sports';
  if (/(restaurant|ramen|cafe|coffee|food|bistro|dining|menu|bakery|kitchen|eatery|grill|sushi|brunch)/.test(p)) return 'restaurant';
  if (/(portfolio|photographer|photography|designer|artist|creative|illustrator|filmmaker|writer)/.test(p)) return 'portfolio';
  if (/(saas|software|\bapp\b|platform|dashboard|startup|productivity|analytics|workflow|automation|\bai\b|api)/.test(p)) return 'saas';
  if (/(shop|store|ecommerce|e-commerce|apparel|fashion|\bproduct\b|boutique|skincare|jewelry|clothing)/.test(p)) return 'ecommerce';
  if (/(agency|studio|marketing|consult|branding|advertis)/.test(p)) return 'agency';
  return 'business';
}

// ─────────────────────────────────────────────────────────────────
// FONT SYSTEM — maps design style → Google Fonts URL
// ─────────────────────────────────────────────────────────────────

interface FontConfig { href: string; display: string; body: string }

const FONT_MAP: Record<string, FontConfig> = {
  minimal:       { href:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', display:"'Inter',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  flat:          { href:'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', display:"'Inter',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  editorial:     { href:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500&display=swap', display:"'Cormorant Garamond',Georgia,serif", body:"'Jost',system-ui,sans-serif" },
  luxury:        { href:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500&display=swap', display:"'Cormorant Garamond',Georgia,serif", body:"'Jost',system-ui,sans-serif" },
  premium:       { href:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500&display=swap', display:"'Cormorant Garamond',Georgia,serif", body:"'Jost',system-ui,sans-serif" },
  brutalist:     { href:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500&display=swap', display:"'Barlow Condensed',sans-serif", body:"'Barlow',sans-serif" },
  cyberpunk:     { href:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;900&family=Space+Mono:wght@400;700&display=swap', display:"'Barlow Condensed',monospace,sans-serif", body:"'Space Mono',monospace" },
  futuristic:    { href:'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap', display:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  'high-tech':   { href:'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap', display:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  enterprise:    { href:'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500&display=swap', display:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  startup:       { href:'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap', display:"'Outfit',system-ui,sans-serif", body:"'Outfit',system-ui,sans-serif" },
  playful:       { href:'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap', display:"'Nunito',system-ui,sans-serif", body:"'Nunito',system-ui,sans-serif" },
  artistic:      { href:'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap', display:"'Syne',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  cinematic:     { href:'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap', display:"'Syne',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  glassmorphism: { href:'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap', display:"'Plus Jakarta Sans',system-ui,sans-serif", body:"'Plus Jakarta Sans',system-ui,sans-serif" },
  neumorphism:   { href:'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap', display:"'Plus Jakarta Sans',system-ui,sans-serif", body:"'Plus Jakarta Sans',system-ui,sans-serif" },
  corporate:     { href:'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;500;600&display=swap', display:"'Merriweather',Georgia,serif", body:"'Source Sans 3',system-ui,sans-serif" },
  organic:       { href:'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500&display=swap', display:"'Fraunces',Georgia,serif", body:"'DM Sans',system-ui,sans-serif" },
  industrial:    { href:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500&display=swap', display:"'Barlow Condensed',sans-serif", body:"'Barlow',sans-serif" },
  vaporwave:     { href:'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap', display:"'Outfit',system-ui,sans-serif", body:"'Outfit',system-ui,sans-serif" },
  retro:         { href:'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap', display:"'DM Serif Display',Georgia,serif", body:"'DM Sans',system-ui,sans-serif" },
  skeuomorphic:  { href:'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;500;600&display=swap', display:"'Merriweather',Georgia,serif", body:"'Source Sans 3',system-ui,sans-serif" },
  material:      { href:'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap', display:"'Roboto',system-ui,sans-serif", body:"'Roboto',system-ui,sans-serif" },
};

function getFontConfig(puo: PromptUnderstandingObject): FontConfig {
  return FONT_MAP[puo.designStyle] || FONT_MAP['minimal'];
}

// ─────────────────────────────────────────────────────────────────
// CSS BUILDER — driven entirely by PUO properties
// ─────────────────────────────────────────────────────────────────

function buildCSSFromPUO(puo: PromptUnderstandingObject, font: FontConfig): string {
  const cp = puo.visual.colorPalette;
  const ty = puo.visual.typography;
  const sp = puo.visual.spacing;
  const br = puo.visual.borderRadius;
  const sh = puo.visual.shadows;
  const an = puo.motion;
  const isDark = ['dark','dramatic','contrast'].includes(puo.visualMood);

  const headingCase = ['brutalist','cinematic','industrial'].includes(puo.designStyle) ? 'uppercase' : 'none';
  const headingTracking = puo.designStyle === 'luxury' || puo.designStyle === 'editorial' ? '-0.02em' : puo.designStyle === 'brutalist' ? '0.04em' : '-0.015em';
  const btnShape = br.style === 'sharp' ? '0' : br.style === 'pill' ? '9999px' : br.md;
  const borderColor = isDark ? 'rgba(255,255,255,.12)' : cp.border;

  return `
:root{
  --bg:${cp.background};--surf:${cp.surface};--text:${cp.text};--muted:${cp.muted};
  --bdr:${borderColor};--primary:${cp.primary};--secondary:${cp.secondary};--accent:${cp.accent};
  --display:${font.display};--body-font:${font.body};
  --radius:${br.md};--radius-lg:${br.lg};--radius-sm:${br.sm};
  --shadow:${sh.md};--shadow-lg:${sh.lg};--shadow-sm:${sh.sm};
  --grad:linear-gradient(135deg,${cp.primary},${cp.secondary});
  --pad:${sp.section};--container:${sp.container};--gutter:${sp.gutter};--gap:${sp.gridGap};
  --hero-size:${ty.scale.hero};--h1-size:${ty.scale.h1};--h2-size:${ty.scale.h2};--h3-size:${ty.scale.h3};
  --body-size:${ty.scale.body};--small-size:${ty.scale.small};--caption-size:${ty.scale.caption};
  --weight-heading:${ty.weight.heading};--weight-body:${ty.weight.body};
  --leading-heading:${ty.lineHeight.heading};--leading-body:${ty.lineHeight.body};
  --tracking-heading:${ty.letterSpacing.heading};
  --dur:${an.duration.normal};--dur-fast:${an.duration.fast};--ease:${an.easing.default};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--body-font);background:var(--bg);color:var(--text);line-height:var(--leading-body);-webkit-font-smoothing:antialiased;overflow-x:hidden;font-size:var(--body-size)}
h1,h2,h3,h4,.display{font-family:var(--display);line-height:var(--leading-heading);letter-spacing:var(--tracking-heading);font-weight:var(--weight-heading);text-transform:${headingCase}}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block;object-fit:cover}
.wrap{max-width:var(--container);margin:0 auto;padding:0 var(--gutter)}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
section{padding:var(--pad) 0}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 26px;border-radius:${btnShape};font-family:var(--body-font);font-size:var(--body-size);font-weight:600;cursor:pointer;border:2px solid transparent;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease),background .22s,color .22s,border-color .22s;white-space:nowrap}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--grad);color:#fff;box-shadow:0 12px 32px -10px ${cp.primary}88}
.btn-primary:hover{box-shadow:0 20px 44px -10px ${cp.primary}bb}
.btn-outline{background:transparent;border-color:${borderColor};color:var(--text)}
.btn-outline:hover{border-color:var(--primary);color:var(--primary)}
.btn-ghost{background:transparent;color:var(--primary);border-color:transparent}
.btn-ghost:hover{background:color-mix(in srgb,var(--primary) 10%,transparent)}

/* HEADER */
header{position:fixed;top:0;left:0;right:0;z-index:100;transition:all .3s}
header.scrolled{background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr);box-shadow:var(--shadow)}
.nav{display:flex;align-items:center;justify-content:space-between;height:72px}
.logo{font-family:var(--display);font-size:1.25rem;font-weight:var(--weight-heading);text-transform:${headingCase};display:flex;align-items:center;gap:10px;color:var(--text)}
.logo-mark{width:34px;height:34px;border-radius:var(--radius-sm);background:var(--grad);display:grid;place-items:center;color:#fff;font-size:.9rem;font-weight:700;flex-shrink:0}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{font-size:.93rem;color:var(--muted);font-weight:500;text-transform:${headingCase};transition:color .2s;position:relative}
.nav-links a::after{content:'';position:absolute;left:0;bottom:-4px;width:0;height:2px;background:var(--primary);transition:width .25s}
.nav-links a:hover,.nav-links a.active{color:var(--text)}
.nav-links a:hover::after,.nav-links a.active::after{width:100%}
.burger{display:none;background:none;border:0;cursor:pointer;padding:8px;color:var(--text);flex-direction:column;gap:5px}
.burger span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transition:.25s}
.mobile-nav{display:none;flex-direction:column;position:fixed;top:72px;left:0;right:0;background:color-mix(in srgb,var(--bg) 97%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid var(--bdr);padding:12px var(--gutter) 20px;z-index:99}
.mobile-nav.open{display:flex}
.mobile-nav a{padding:14px 0;border-bottom:1px solid var(--bdr);font-weight:500;text-transform:${headingCase};display:block;color:var(--text);font-size:1rem}

/* REVEAL ANIMATION */
.reveal{opacity:0;transform:translateY(24px);transition:opacity .65s var(--ease),transform .65s var(--ease)}
.reveal.in{opacity:1;transform:none}
.reveal-delay-1{transition-delay:.1s}
.reveal-delay-2{transition-delay:.2s}
.reveal-delay-3{transition-delay:.3s}

/* GRIDS */
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--gap)}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap)}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap)}
@media(max-width:900px){.g3,.g4{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.g2,.g3,.g4{grid-template-columns:1fr}.nav-links{display:none}.burger{display:flex}}

/* HERO */
.hero{position:relative;overflow:hidden;padding-top:72px}
.hero-inner{padding:clamp(72px,11vw,140px) 0 clamp(56px,8vw,110px)}
.hero-fullbleed{min-height:100vh;display:flex;align-items:center}
.hero-bg{position:absolute;inset:0;z-index:0}
.hero-bg img{width:100%;height:100%;object-fit:cover}
.hero-bg::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.6) 60%,var(--bg) 100%)}
.hero-content{position:relative;z-index:1}
.hero-tag{display:inline-flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--primary) 12%,transparent);border:1px solid color-mix(in srgb,var(--primary) 30%,transparent);color:var(--primary);padding:5px 13px;border-radius:9999px;font-size:.82rem;font-weight:600;margin-bottom:20px;text-transform:uppercase;letter-spacing:.06em}
.hero h1{font-size:var(--hero-size);margin-bottom:20px;max-width:880px}
.hero .lead{font-size:clamp(.98rem,1.5vw,1.18rem);color:var(--muted);max-width:540px;margin-bottom:32px;line-height:1.72}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hero-split-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(40px,6vw,80px);align-items:center}
.hero-media{border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)}
.hero-media img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
@media(max-width:768px){.hero-split-grid{grid-template-columns:1fr}}

/* SECTION HEADING */
.sec-head{margin-bottom:clamp(32px,5vw,52px)}
.sec-head .eyebrow{display:inline-block;font-size:.8rem;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
.sec-head h2{font-size:var(--h2-size);margin-bottom:12px}
.sec-head p{color:var(--muted);font-size:clamp(.95rem,1.3vw,1.1rem);max-width:580px;line-height:1.7}
.sec-head.centered{text-align:center}.sec-head.centered p{margin-left:auto;margin-right:auto}

/* CARDS */
.card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:clamp(22px,3vw,34px);transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease);height:100%}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)}
.card-icon{width:46px;height:46px;border-radius:var(--radius-sm);background:color-mix(in srgb,var(--primary) 12%,transparent);display:grid;place-items:center;color:var(--primary);margin-bottom:16px;font-size:1.35rem}
.card h3{font-size:var(--h3-size);margin-bottom:8px}
.card p{color:var(--muted);font-size:var(--small-size);line-height:1.65}
.card-link{display:inline-flex;align-items:center;gap:6px;color:var(--primary);font-size:var(--small-size);font-weight:500;margin-top:14px;transition:gap .2s}
.card-link:hover{gap:10px}

/* STAT STRIP */
.strip-section{padding:clamp(28px,3.5vw,48px) 0;border-top:1px solid var(--bdr);border-bottom:1px solid var(--bdr)}
.stat-row{display:flex;justify-content:space-around;flex-wrap:wrap;gap:24px 16px}
.stat-item{text-align:center}
.stat-number{font-family:var(--display);font-size:clamp(1.8rem,3.5vw,3rem);font-weight:var(--weight-heading);background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
.stat-label{font-size:var(--caption-size);color:var(--muted);margin-top:5px;text-transform:uppercase;letter-spacing:.06em}

/* MARQUEE STRIP */
.marquee-wrap{overflow:hidden;position:relative}
.marquee-track{display:flex;gap:32px;width:max-content;animation:marquee 28s linear infinite}
@keyframes marquee{to{transform:translateX(-50%)}}
.marquee-item{font-size:var(--small-size);color:var(--muted);white-space:nowrap;padding:6px 16px;border:1px solid var(--bdr);border-radius:9999px}

/* SPLIT SECTION */
.split-section{display:grid;grid-template-columns:1fr 1fr;gap:clamp(36px,6vw,80px);align-items:center}
.split-section.flip>.split-media{order:-1}
.split-media{border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)}
.split-media img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block}
.split-text h2{font-size:var(--h2-size);margin-bottom:14px}
.split-text .split-body{color:var(--muted);margin-bottom:18px;line-height:1.72}
.split-list{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
.split-list li{display:flex;align-items:flex-start;gap:10px;color:var(--muted);font-size:var(--small-size)}
.split-list li::before{content:'→';color:var(--primary);font-weight:700;margin-top:1px;flex-shrink:0}
@media(max-width:768px){.split-section{grid-template-columns:1fr}.split-section.flip>.split-media{order:0}}

/* GALLERY */
.gallery-grid{display:grid;gap:var(--gap)}
.gallery-grid.uniform{grid-template-columns:repeat(3,1fr)}
.gallery-grid.masonry{grid-template-columns:repeat(3,1fr)}
.gallery-grid.panorama{grid-template-columns:repeat(2,1fr)}
.gallery-grid.filmstrip{display:flex;overflow-x:auto;gap:var(--gap);padding-bottom:8px}
.gallery-grid.filmstrip img{width:260px;flex-shrink:0;height:320px;border-radius:var(--radius);object-fit:cover}
.gallery-item{position:relative;overflow:hidden;border-radius:var(--radius)}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--ease)}
.gallery-item:hover img{transform:scale(1.05)}
@media(max-width:768px){.gallery-grid.uniform,.gallery-grid.masonry,.gallery-grid.panorama{grid-template-columns:repeat(2,1fr)}}
@media(max-width:480px){.gallery-grid.uniform,.gallery-grid.masonry,.gallery-grid.panorama{grid-template-columns:1fr}}

/* CTA SIGNAL SECTION */
.signal-section{padding:clamp(72px,10vw,130px) 0;text-align:center}
.signal-inner{background:color-mix(in srgb,var(--primary) 7%,var(--surf));border:1px solid color-mix(in srgb,var(--primary) 20%,transparent);border-radius:var(--radius-lg);padding:clamp(48px,7vw,90px) clamp(24px,5vw,72px);max-width:720px;margin:0 auto}
.signal-full{background:var(--grad);padding:clamp(72px,10vw,130px) 0}
.signal-full h2{color:#fff}
.signal-full p{color:rgba(255,255,255,.8)}
.signal-full .btn-outline{border-color:rgba(255,255,255,.4);color:#fff}
.signal-full .btn-outline:hover{border-color:#fff}
.signal-section h2{font-size:var(--h2-size);margin-bottom:14px}
.signal-section p{color:var(--muted);max-width:480px;margin:0 auto 30px;line-height:1.7}
.signal-ctas{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}

/* TESTIMONIALS */
.testimonial-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);padding:clamp(22px,3vw,34px);display:flex;flex-direction:column;gap:16px;height:100%}
.testimonial-stars{color:var(--primary);font-size:1rem;letter-spacing:2px}
.testimonial-quote{font-size:clamp(.95rem,1.3vw,1.08rem);line-height:1.72;color:var(--text);flex:1}
.testimonial-author{display:flex;align-items:center;gap:12px}
.testimonial-avatar{width:40px;height:40px;border-radius:9999px;background:var(--grad);display:grid;place-items:center;color:#fff;font-size:.85rem;font-weight:700;flex-shrink:0}
.testimonial-name{font-weight:600;font-size:var(--small-size)}
.testimonial-role{font-size:var(--caption-size);color:var(--muted)}

/* BENTO GRID */
.bento{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--gap)}
.bento .card:first-child{grid-column:span 2;grid-row:span 2}
@media(max-width:900px){.bento{grid-template-columns:repeat(2,1fr)}.bento .card:first-child{grid-column:1;grid-row:1}}

/* LIST / FAQ */
.faq-list{max-width:720px}
.faq-list details{border-bottom:1px solid var(--bdr);padding:18px 0}
.faq-list summary{font-weight:600;cursor:pointer;font-size:1.02rem;font-family:var(--display);display:flex;justify-content:space-between;align-items:center;user-select:none;list-style:none}
.faq-list summary::after{content:'+';font-size:1.2rem;color:var(--muted);transition:transform .25s;line-height:1}
.faq-list details[open] summary::after{transform:rotate(45deg)}
.faq-list details p{color:var(--muted);margin-top:10px;font-size:var(--small-size);line-height:1.65}

/* FRAME / FEATURED BLOCK */
.frame-block{border:1px solid var(--bdr);border-radius:var(--radius-lg);padding:clamp(32px,4vw,56px);background:var(--surf);overflow:hidden}

/* CONTACT FORM */
.contact-form-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(36px,6vw,80px);align-items:start}
@media(max-width:768px){.contact-form-grid{grid-template-columns:1fr}}
.contact-info h3{font-size:var(--h3-size);margin-bottom:10px}
.contact-info p{color:var(--muted);margin-bottom:20px;line-height:1.7}
.contact-detail{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;font-size:var(--small-size);color:var(--muted)}
.contact-detail-icon{width:36px;height:36px;border-radius:var(--radius-sm);background:color-mix(in srgb,var(--primary) 12%,transparent);display:grid;place-items:center;color:var(--primary);flex-shrink:0;font-size:1rem}
form{display:flex;flex-direction:column;gap:14px}
form label{font-size:.88rem;font-weight:500;margin-bottom:3px;display:block;color:var(--muted)}
form input,form textarea,form select{width:100%;padding:11px 15px;background:var(--bg);border:1px solid var(--bdr);border-radius:var(--radius);color:var(--text);font-family:var(--body-font);font-size:var(--body-size);transition:border-color .2s,box-shadow .2s}
form input:focus,form textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 15%,transparent)}
form textarea{min-height:130px;resize:vertical}

/* PRICING */
.price-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap)}
@media(max-width:768px){.price-grid{grid-template-columns:1fr;max-width:420px;margin-left:auto;margin-right:auto}}
.price-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius-lg);padding:clamp(28px,3.5vw,44px);position:relative;display:flex;flex-direction:column;gap:0;height:100%}
.price-card.featured{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 18%,transparent)}
.price-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--grad);color:#fff;padding:4px 14px;border-radius:9999px;font-size:.76rem;font-weight:600;white-space:nowrap}
.price-name{font-size:var(--h3-size);font-family:var(--display);font-weight:var(--weight-heading);margin-bottom:6px}
.price-desc{font-size:var(--small-size);color:var(--muted);margin-bottom:20px}
.price-amount{font-size:clamp(2rem,3.5vw,2.8rem);font-weight:700;font-family:var(--display);line-height:1;margin-bottom:4px}
.price-period{font-size:var(--caption-size);color:var(--muted);margin-bottom:24px}
.price-features{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:28px;flex:1}
.price-features li{display:flex;align-items:center;gap:9px;font-size:var(--small-size);color:var(--muted)}
.price-check{color:var(--primary);font-size:1rem}

/* FOOTER */
footer{background:color-mix(in srgb,var(--bg) 70%,var(--surf));border-top:1px solid var(--bdr);padding:clamp(52px,7vw,96px) 0 clamp(22px,3vw,34px)}
.footer-grid{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:clamp(28px,4vw,52px);margin-bottom:clamp(36px,5vw,56px)}
@media(max-width:768px){.footer-grid{grid-template-columns:1fr 1fr}}
@media(max-width:480px){.footer-grid{grid-template-columns:1fr}}
.footer-brand h3{font-family:var(--display);font-size:1.15rem;font-weight:var(--weight-heading);margin-bottom:8px}
.footer-brand p{color:var(--muted);font-size:var(--small-size);line-height:1.7;max-width:260px}
.footer-col h4{font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);margin-bottom:14px}
.footer-col ul{list-style:none;display:flex;flex-direction:column;gap:9px}
.footer-col ul li a{font-size:var(--small-size);color:var(--muted);transition:color .2s}
.footer-col ul li a:hover{color:var(--text)}
.footer-bottom{border-top:1px solid var(--bdr);padding-top:clamp(18px,2.5vw,26px);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.footer-bottom p{font-size:var(--caption-size);color:var(--muted)}
`;
}

// ─────────────────────────────────────────────────────────────────
// PHOTO BANK — keyed by visual mood + industry
// ─────────────────────────────────────────────────────────────────

const PHOTOS_BY_MOOD: Record<string, string[]> = {
  dark:     ['1546519638-68e109498ffc','1551963831-d3b034eda6c1','1507003211169-0a1dd7228f2d','1478720568477-152d9b92543f'],
  dramatic: ['1519861531473-9200262188bf','1574629810360-7efbbe195018','1516466723360-e8a869c7b0ea','1547891654-e332f33f5571'],
  vibrant:  ['1559339352-11d035aa65de','1568992687947-868a62a9f521','1505740420928-5e560c06d30e','1504173010664-32509aeebb62'],
  warm:     ['1517248135467-4c7edcad34c4','1414235077428-338989a2e8c0','1466978913421-da2e5dbfca53','1567620905732-2d1ec7ab7445'],
  cold:     ['1460925895917-afdab827c52f','1551434678-e076c223a692','1496181133206-80ce9b88a853','1504384308090-c894fdcc538d'],
  ethereal: ['1452587925148-ce544e77e70d','1493863641943-9b68992a8d07','1533461502717-83f69c69e1a3','1481627834876-b7833e8f5cf1'],
  light:    ['1486406146926-c627a92ad1ab','1497215842964-222b430dc094','1507679799987-c73779587ccf','1497366216548-37526070297c'],
  neutral:  ['1542744173-8e7e53415bb0','1519090347852-b6fa5e2fe0b9','1454165804606-c3d57bc86b40','1531973576160-7125cd663d86'],
};

const PHOTOS_BY_INDUSTRY: Record<string, string[]> = {
  sports:       ['1546519638-68e109498ffc','1574629810360-7efbbe195018','1519861531473-9200262188bf','1574623452334-1e0ac2b3ccb4'],
  food:         ['1517248135467-4c7edcad34c4','1414235077428-338989a2e8c0','1466978913421-da2e5dbfca53','1567620905732-2d1ec7ab7445'],
  photography:  ['1452587925148-ce544e77e70d','1581291518857-4d27a4f0e37a','1517048676732-d65bc937f952','1492551557933-34265f7af79e'],
  technology:   ['1551434678-e076c223a692','1460925895917-afdab827c52f','1504384308090-c894fdcc538d','1556761175-5973dc0f32e7'],
  saas:         ['1551434678-e076c223a692','1496181133206-80ce9b88a853','1460925895917-afdab827c52f','1531403009284-440f080d1e12'],
  fashion:      ['1483985988355-763728e1935b','1490481651871-ab68de25d43d','1441986300917-64674bd600d8','1525507119028-ed4c629a60a3'],
  ecommerce:    ['1523275335684-37898b6baf30','1542291026-7eec264c27ff','1553062407-98eeb64c6a62','1491553895911-0055eca6402d'],
  design:       ['1497366216548-37526070297c','1497366811353-6870744d04b2','1522202176988-66273c2fd55f','1544717305-2782549b5bd6'],
  fitness:      ['1574629810360-7efbbe195018','1518611012144-8b3ccec0fb77','1517649763962-0c623066013b','1552674605-db6ffd4facb5'],
  general:      ['1486406146926-c627a92ad1ab','1497215842964-222b430dc094','1507679799987-c73779587ccf','1542744173-8e7e53415bb0'],
};

function getPhotos(puo: PromptUnderstandingObject, fp: number): string[] {
  const byIndustry = PHOTOS_BY_INDUSTRY[puo.inferredIndustry] || PHOTOS_BY_INDUSTRY.general;
  const byMood = PHOTOS_BY_MOOD[puo.visualMood] || PHOTOS_BY_MOOD.neutral;
  // Interleave by fingerprint
  return fp % 2 === 0 ? [...byIndustry, ...byMood] : [...byMood, ...byIndustry];
}

// ─────────────────────────────────────────────────────────────────
// COPY GENERATOR — driven by PUO keywords and context
// ─────────────────────────────────────────────────────────────────

interface SiteCopy {
  heroHeadline: string;
  heroSub: string;
  heroTag: string;
  primaryCta: string;
  secondaryCta: string;
  sectionEyebrow: string;
  featureHeading: string;
  features: Array<{ icon: string; title: string; desc: string; href: string }>;
  stats: Array<{ number: string; label: string }>;
  testimonials: Array<{ quote: string; name: string; role: string }>;
  aboutHeading: string;
  aboutBody: string;
  aboutBullets: string[];
  galleryHeading: string;
  gallerySlug: string;
  contactHeading: string;
  contactSub: string;
  ctaHeading: string;
  ctaSub: string;
  footerTagline: string;
  pricingPlans: Array<{ name: string; price: string; period: string; desc: string; features: string[]; featured: boolean }> | null;
}

const STYLE_WORDS = new Set(['dark','light','minimal','bold','elegant','clean','modern','luxury','premium','website','site','page','layout','design','style','color','font','beautiful','stunning','amazing','great','best','good','nice','cool','awesome']);

function getContentWords(puo: PromptUnderstandingObject): string[] {
  return puo.extractedKeywords
    .filter(k => k.length > 3 && !STYLE_WORDS.has(k))
    .slice(0, 8);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function buildSiteCopy(puo: PromptUnderstandingObject, brand: string, fp: number): SiteCopy {
  const kws = getContentWords(puo);
  const industry = puo.inferredIndustry;
  const mood = puo.visualMood;
  const personality = puo.websitePersonality;
  const tone = puo.businessTone;
  const direction = puo.layout.direction;

  // Derive headline descriptors from keywords
  const mainKw = kws[0] ? titleCase(kws[0]) : industry !== 'general' ? titleCase(industry) : 'Excellence';
  const secKw  = kws[1] ? titleCase(kws[1]) : 'Experience';
  const thirdKw = kws[2] ? titleCase(kws[2]) : 'Innovation';

  // Headline patterns keyed by personality
  const headlinePatterns: Record<string, string[]> = {
    bold:           [`${brand} — ${mainKw} Redefined`, `The ${mainKw} Standard`, `${mainKw}. Unmatched.`, `Powering ${mainKw} Forward`],
    elegant:        [`${brand} — ${mainKw} & ${secKw}`, `The Art of ${mainKw}`, `${mainKw} with Precision`, `Refined ${mainKw}`],
    energetic:      [`${mainKw} at Full Speed`, `${brand}: Where ${mainKw} Meets ${secKw}`, `Fuel Your ${mainKw}`, `${mainKw} Unleashed`],
    friendly:       [`Welcome to ${brand}`, `${mainKw} Made Simple`, `${mainKw} for Everyone`, `Your ${mainKw} Journey Starts Here`],
    authoritative:  [`${brand}: Leading ${mainKw}`, `The ${mainKw} Authority`, `Trusted ${mainKw} Since Day One`, `Setting the ${mainKw} Standard`],
    innovative:     [`${mainKw} Reimagined`, `The Future of ${mainKw}`, `${brand} — ${mainKw} Next`, `${mainKw} × ${secKw}`],
    sophisticated:  [`${brand} — ${mainKw} Elevated`, `Where ${mainKw} Meets ${secKw}`, `${mainKw}. Elevated.`, `Premium ${mainKw}`],
    trustworthy:    [`${brand}: Your ${mainKw} Partner`, `Reliable ${mainKw}, Guaranteed`, `${mainKw} You Can Count On`, `Trusted ${mainKw}`],
  };

  const headlines = headlinePatterns[personality] || headlinePatterns['bold'];
  const heroHeadline = pick(headlines, fp);

  // Sub from ux.primaryGoal or prompt
  const rawPrompt = puo.originalPrompt;
  const heroSub = rawPrompt.length > 40
    ? rawPrompt.replace(/^(build|create|make|design|generate|a |an |the )/gi, '').trim().slice(0, 140).replace(/[.!?]*$/, '.')
    : puo.ux.primaryGoal;

  // CTA text by layout direction
  const ctaMap: Record<string, string> = {
    'e-commerce': 'Shop Now', saas: 'Start Free Trial', 'lead-gen': 'Get Started Free',
    landing: 'Get Started', portfolio: 'View My Work', editorial: 'Read More',
    application: 'Launch App', showcase: 'Explore', dashboard: 'Open Dashboard',
    'multi-page': 'Get Started', 'single-page': 'Learn More',
  };
  const primaryCta = ctaMap[direction] || 'Get Started';
  const secondaryCta = pick(['Learn More', 'See How It Works', 'Explore', 'View Work', 'Discover More', 'Watch Demo'] as const, fp + 1);

  // Hero tag
  const heroTags = ['New Launch', 'Now Available', `${mainKw} Platform`, `${industry !== 'general' ? titleCase(industry) + ' ' : ''}Solution`, 'Trusted by Thousands', 'Award Winning', 'Free to Start'];
  const heroTag = pick(heroTags, fp + 3);

  // Section eyebrow
  const eyebrows = ['Why Choose Us', 'What We Offer', 'Our Approach', 'How We Help', 'The Difference', 'Built for You', 'What Sets Us Apart'];
  const sectionEyebrow = pick(eyebrows, fp + 7);

  // Feature heading
  const featureHeadings = [`Everything You Need for ${mainKw}`, `Built for ${mainKw}`, `The Complete ${mainKw} Solution`, `${mainKw} at Scale`, `Powerful ${mainKw} Tools`];
  const featureHeading = pick(featureHeadings, fp + 5);

  // Features — driven by extracted keywords
  const ICONS = ['⚡','🎯','🔒','📊','🌐','💡','🚀','🛠️','✨','🔄','💎','🤝','📱','🎨','⚙️','🏆'];
  const allKwFeatures = kws.slice(0, 6).map((kw, i) => ({
    icon: ICONS[(fp + i) % ICONS.length],
    title: `${titleCase(kw)} ${pick(['Engine','System','Suite','Hub','Intelligence','Platform','Flow','Edge'] as const, fp + i)}`,
    desc: `Powerful ${kw} capabilities designed for modern teams. Built to scale with your needs and deliver results.`,
    href: 'contact',
  }));
  // Pad to 3 with generic feature descriptions if needed
  while (allKwFeatures.length < 3) {
    const defaults = [
      { icon: '⚡', title: 'Lightning Performance', desc: 'Optimized for speed and reliability. Your operations never slow down.', href: 'contact' },
      { icon: '🔒', title: 'Enterprise Security', desc: 'Bank-grade security and compliance built into every layer.', href: 'contact' },
      { icon: '🌐', title: 'Global Reach', desc: 'Serve users anywhere in the world with zero latency.', href: 'contact' },
    ];
    allKwFeatures.push(defaults[allKwFeatures.length % defaults.length]);
  }
  const features = allKwFeatures.slice(0, 4);

  // Stats
  const statBanks: Record<string, Array<{ number: string; label: string }>> = {
    saas:       [{number:'10K+',label:'Active Users'},{number:'99.9%',label:'Uptime SLA'},{number:'4.9★',label:'User Rating'},{number:'<100ms',label:'Response Time'}],
    ecommerce:  [{number:'50K+',label:'Products'},{number:'98%',label:'Satisfaction'},{number:'24/7',label:'Support'},{number:'120+',label:'Countries'}],
    portfolio:  [{number:'200+',label:'Projects'},{number:'8+',label:'Years Experience'},{number:'50+',label:'Clients'},{number:'15+',label:'Awards'}],
    sports:     [{number:'500+',label:'Athletes'},{number:'100+',label:'Championships'},{number:'5★',label:'Coaching'},{number:'20+',label:'Sports'}],
    food:       [{number:'200+',label:'Menu Items'},{number:'4.9★',label:'Reviews'},{number:'10+',label:'Years Open'},{number:'Daily',label:'Fresh Ingredients'}],
    agency:     [{number:'300+',label:'Clients'},{number:'$50M+',label:'Revenue Generated'},{number:'10+',label:'Years'},{number:'50+',label:'Experts'}],
    general:    [{number:'10K+',label:'Happy Clients'},{number:'98%',label:'Satisfaction'},{number:'24/7',label:'Support'},{number:'5★',label:'Rating'}],
  };
  const stats = (statBanks[industry] || statBanks.general).slice(0, 4);

  // Testimonials
  const testimonialBanks: Array<{ quote: string; name: string; role: string }> = [
    { quote: `${brand} completely transformed how we approach ${mainKw}. The results speak for themselves.`, name: 'Alex Chen', role: 'CEO, TechCorp' },
    { quote: `We've tried many solutions, but nothing comes close to what ${brand} delivers for ${secKw}.`, name: 'Sarah Miller', role: 'Head of Operations, ScaleUp' },
    { quote: `The ${mainKw} experience with ${brand} is unmatched. Highly recommend for any serious team.`, name: 'Marcus Johnson', role: 'Founder, BuildFast' },
    { quote: `Incredible platform. Our ${mainKw} metrics improved by 3x within the first month.`, name: 'Priya Patel', role: 'Product Manager, DataFlow' },
  ];
  const testimonials = testimonialBanks.slice(0, 3);

  // About
  const aboutHeading = `The ${brand} Story`;
  const aboutBody = `We built ${brand} to solve the challenges we faced with ${mainKw} every day. What started as a simple idea has grown into the platform trusted by teams worldwide. Our mission: make ${mainKw} simple, powerful, and accessible for everyone.`;
  const aboutBullets = [
    `${kws[0] ? titleCase(kws[0]) + '-first approach' : 'Customer-first approach'}`,
    `${kws[1] ? titleCase(kws[1]) + ' driven design' : 'Performance-driven design'}`,
    `${kws[2] ? titleCase(kws[2]) + ' at scale' : 'Built for scale from day one'}`,
    `Transparent, honest, always improving`,
  ];

  // Gallery
  const gallerySlug = detectGallerySlug(puo);
  const galleryLabel = { portfolio: 'Portfolio', ecommerce: 'Shop', saas: 'Features', restaurant: 'Menu', sports: 'Gallery', agency: 'Work', general: 'Gallery' };
  const galleryHeading = `Our ${(galleryLabel[industry as keyof typeof galleryLabel] || galleryLabel.general)}`;

  // Contact
  const contactHeading = `Let's Talk ${mainKw}`;
  const contactSub = `Have questions about ${brand}? Ready to get started? Reach out and our team will get back to you within 24 hours.`;

  // CTA
  const ctaHeadings = [`Ready to Experience ${mainKw}?`, `Start Your ${mainKw} Journey`, `Join Thousands of ${mainKw} Leaders`, `Transform Your ${mainKw} Today`];
  const ctaHeading = pick(ctaHeadings, fp + 9);
  const ctaSub = `Get started in minutes. No credit card required.`;

  // Footer tagline
  const footerTaglines = [`${mainKw} made powerful.`, `Building the future of ${mainKw}.`, `Your ${mainKw} platform.`, `${brand} — where ${mainKw} meets ${secKw}.`];
  const footerTagline = pick(footerTaglines, fp + 11);

  // Pricing plans (if saas/ecommerce)
  let pricingPlans: SiteCopy['pricingPlans'] = null;
  if (direction === 'saas' || direction === 'e-commerce' || industry === 'saas') {
    pricingPlans = [
      { name: 'Starter', price: 'Free', period: 'forever', desc: 'Perfect for individuals and small projects', features: [`Core ${mainKw} tools`, 'Up to 3 projects', 'Community support', '1GB storage'], featured: false },
      { name: 'Pro', price: '$49', period: '/month', desc: `Full ${mainKw} power for growing teams`, features: [`Unlimited ${mainKw}`, 'Advanced analytics', 'Priority support', '50GB storage', 'Custom integrations'], featured: true },
      { name: 'Enterprise', price: 'Custom', period: 'contact us', desc: `Enterprise-grade ${mainKw} at scale`, features: ['Everything in Pro', 'Dedicated support', 'Custom SLA', 'Unlimited storage', 'On-premise option'], featured: false },
    ];
  }

  return {
    heroHeadline, heroSub, heroTag, primaryCta, secondaryCta,
    sectionEyebrow, featureHeading, features, stats, testimonials,
    aboutHeading, aboutBody, aboutBullets,
    galleryHeading, gallerySlug,
    contactHeading, contactSub, ctaHeading, ctaSub, footerTagline,
    pricingPlans,
  };
}

function detectGallerySlug(puo: PromptUnderstandingObject): string {
  const direction = puo.layout.direction;
  const industry = puo.inferredIndustry;
  if (direction === 'portfolio' || industry === 'photography' || industry === 'design') return 'work';
  if (direction === 'e-commerce' || industry === 'ecommerce' || industry === 'fashion') return 'shop';
  if (industry === 'food' || industry === 'restaurant') return 'menu';
  if (industry === 'sports' || industry === 'fitness') return 'gallery';
  return 'gallery';
}

// ─────────────────────────────────────────────────────────────────
// LAYOUT GRAPH COMPOSER INPUT BUILDER
// ─────────────────────────────────────────────────────────────────

function buildComposerInput(puo: PromptUnderstandingObject): ComposerInput {
  return {
    puo: {
      visualMood: puo.visualMood,
      designStyle: puo.designStyle,
      websitePersonality: puo.websitePersonality,
      visualDensity: puo.visualDensity,
      layoutDirection: puo.layout.direction,
      modernityLevel: puo.modernityLevel,
      businessTone: puo.businessTone,
      conversionStyle: puo.conversionStyle,
      motion: { complexity: puo.motion.complexity, enabled: puo.motion.enabled },
      composition: { type: puo.composition.type, readingPattern: puo.composition.readingPattern },
      pageStructure: puo.pageStructure.map(s => ({ id: s.id, type: s.type, importance: s.importance, order: s.order })),
      originalPrompt: puo.originalPrompt,
    },
  };
}

function composePageGraph(puo: PromptUnderstandingObject, pageName: string, baseFp: number): LayoutGraph {
  // Each page gets its own graph by injecting page-specific context into the PUO prompt
  const pagePuo: PromptUnderstandingObject = {
    ...puo,
    originalPrompt: `${puo.originalPrompt} | page:${pageName} | seed:${baseFp.toString(16)}`,
  };
  const result = composeLayout(buildComposerInput(pagePuo));
  return result.success ? result.graph : composeLayout(buildComposerInput(puo)).graph;
}

// ─────────────────────────────────────────────────────────────────
// NAV + FOOTER + HEAD + JS
// ─────────────────────────────────────────────────────────────────

function buildNav(brand: string, navItems: Array<{ label: string; href: string }>, activePath: string): string {
  const initial = brand.charAt(0).toUpperCase();
  const links = navItems.map(n => {
    const isActive = n.href === activePath || n.href === '.' && activePath === '/';
    return `<a href="${esc(n.href)}" class="${isActive?'active':''}">${esc(n.label)}</a>`;
  }).join('');
  const mobileLinks = navItems.map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join('');

  return `
<header id="hdr">
  <div class="wrap">
    <nav class="nav">
      <a href="." class="logo"><span class="logo-mark">${initial}</span>${esc(brand)}</a>
      <div class="nav-links">${links}</div>
      <button class="burger" id="burger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </nav>
  </div>
</header>
<nav class="mobile-nav" id="mnav">${mobileLinks}</nav>`;
}

function buildFooter(brand: string, navItems: Array<{ label: string; href: string }>, copy: SiteCopy, year: number): string {
  const navCols = navItems.map(n => `<li><a href="${esc(n.href)}">${esc(n.label)}</a></li>`).join('');
  const legalLinks = ['Privacy Policy', 'Terms of Service', 'Contact'].map(l => `<li><a href="contact">${l}</a></li>`).join('');

  return `
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <h3>${esc(brand)}</h3>
        <p>${esc(copy.footerTagline)}</p>
      </div>
      <div class="footer-col">
        <h4>Navigation</h4>
        <ul>${navCols}</ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>${legalLinks}</ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <ul>
          <li><a href="contact">Get in Touch</a></li>
          <li><a href="contact">Support</a></li>
          <li><a href="contact">Partnership</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${year} ${esc(brand)}. All rights reserved.</p>
      <p>Built with care.</p>
    </div>
  </div>
</footer>`;
}

function buildHead(brand: string, pageTitle: string, desc: string, font: FontConfig, css: string, base: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${base ? `<base href="${esc(base)}">` : ''}
<title>${esc(pageTitle)} — ${esc(brand)}</title>
<meta name="description" content="${esc(desc.slice(0,160))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${esc(font.href)}">
<style>${css}</style></head>`;
}

const PAGE_JS = `<script>
(function(){
  // Scroll-triggered header
  var hdr=document.getElementById('hdr');
  window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>40)},{passive:true});
  // Mobile nav
  var burger=document.getElementById('burger');
  var mnav=document.getElementById('mnav');
  if(burger&&mnav){burger.addEventListener('click',function(){mnav.classList.toggle('open');});}
  // IntersectionObserver reveals
  var observer=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');}});
  },{threshold:0.12,rootMargin:'0px 0px -60px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){observer.observe(el);});
})();
</script>`;

// ─────────────────────────────────────────────────────────────────
// SECTION RENDERERS — driven by LayoutNode type and PUO context
// ─────────────────────────────────────────────────────────────────

interface RenderCtx {
  puo: PromptUnderstandingObject;
  copy: SiteCopy;
  photos: string[];
  fp: number;
  pageName: string;
  navItems: Array<{ label: string; href: string }>;
}

function renderHeroSection(node: LayoutNode, ctx: RenderCtx, isFirstHero: boolean): string {
  const { puo, copy, photos, fp } = ctx;
  if (!isFirstHero) return ''; // only render one hero per page
  const photo = photos[fp % photos.length];
  const isDark = ['dark','dramatic','contrast'].includes(puo.visualMood);

  if (node.variant === 'split-screen' || node.variant === 'centerpiece' || node.span === 'contained') {
    return `
<section class="hero">
  <div class="wrap">
    <div class="hero-inner hero-split-grid">
      <div class="hero-content">
        <span class="hero-tag reveal">${esc(copy.heroTag)}</span>
        <h1 class="reveal reveal-delay-1">${esc(copy.heroHeadline)}</h1>
        <p class="lead reveal reveal-delay-2">${esc(copy.heroSub)}</p>
        <div class="hero-ctas reveal reveal-delay-3">
          <a href="${ctx.copy.gallerySlug}" class="btn btn-primary">${esc(copy.primaryCta)}</a>
          <a href="about" class="btn btn-outline">${esc(copy.secondaryCta)} →</a>
        </div>
      </div>
      <div class="hero-media reveal reveal-delay-2">
        <img src="${ph(photo,800,1000)}" alt="${esc(copy.heroHeadline)}" loading="eager"/>
      </div>
    </div>
  </div>
</section>`;
  }

  // Fullbleed / immersive / dominant
  return `
<section class="hero hero-fullbleed">
  <div class="hero-bg">
    <img src="${ph(photo,1600,900)}" alt="${esc(copy.heroHeadline)}" loading="eager"/>
  </div>
  <div class="wrap" style="position:relative;z-index:1;width:100%;padding-top:40px;padding-bottom:40px">
    <span class="hero-tag reveal">${esc(copy.heroTag)}</span>
    <h1 class="reveal reveal-delay-1" style="color:${isDark||node.depth==='immersed'?'#fff':'var(--text)'};max-width:820px">${esc(copy.heroHeadline)}</h1>
    <p class="lead reveal reveal-delay-2" style="color:${isDark||node.depth==='immersed'?'rgba(255,255,255,.8)':'var(--muted)'}">${esc(copy.heroSub)}</p>
    <div class="hero-ctas reveal reveal-delay-3">
      <a href="${ctx.copy.gallerySlug}" class="btn btn-primary">${esc(copy.primaryCta)}</a>
      <a href="about" class="btn btn-outline" style="${isDark||node.depth==='immersed'?'border-color:rgba(255,255,255,.4);color:#fff':''}">${esc(copy.secondaryCta)} →</a>
    </div>
  </div>
</section>`;
}

function renderClusterSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy } = ctx;
  const cols = Math.min(Math.max(node.grid.columnsDesktop || 3, 2), 4);
  const gridClass = cols === 2 ? 'g2' : cols === 4 ? 'g4' : 'g3';

  if (node.variant === 'bento') {
    const cardsHtml = copy.features.map((f, i) => `
      <div class="card reveal reveal-delay-${i % 3}">
        <div class="card-icon">${f.icon}</div>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.desc)}</p>
        <a href="${esc(f.href)}" class="card-link">Learn more →</a>
      </div>`).join('');
    return `
<section>
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">${esc(copy.sectionEyebrow)}</span><h2>${esc(copy.featureHeading)}</h2></div>
    <div class="bento bento-2x2">${cardsHtml}</div>
  </div>
</section>`;
  }

  const cardsHtml = copy.features.slice(0, cols).map((f, i) => `
    <div class="card reveal reveal-delay-${i % 3}">
      <div class="card-icon">${f.icon}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
      <a href="${esc(f.href)}" class="card-link">Learn more →</a>
    </div>`).join('');

  return `
<section>
  <div class="wrap">
    <div class="sec-head${idx % 3 === 0 ? ' centered' : ''} reveal">
      <span class="eyebrow">${esc(copy.sectionEyebrow)}</span>
      <h2>${esc(copy.featureHeading)}</h2>
      <p>Built for performance. Designed for you.</p>
    </div>
    <div class="${gridClass}">${cardsHtml}</div>
  </div>
</section>`;
}

function renderStripSection(node: LayoutNode, ctx: RenderCtx): string {
  const { copy } = ctx;
  if (node.variant === 'stats-row' || node.variant === 'bar') {
    const statsHtml = copy.stats.map(s => `
      <div class="stat-item reveal">
        <div class="stat-number">${esc(s.number)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`).join('');
    return `<section class="strip-section"><div class="wrap"><div class="stat-row">${statsHtml}</div></div></section>`;
  }
  if (node.variant === 'logo-wall' || node.variant === 'marquee') {
    const items = ['Trusted Partner', 'Enterprise Ready', 'Award Winning', 'Industry Leader', 'Global Reach', 'Certified', '10K+ Users', 'Top Rated'];
    const marqItems = [...items, ...items].map(i => `<span class="marquee-item">${esc(i)}</span>`).join('');
    return `<section class="strip-section"><div class="marquee-wrap"><div class="marquee-track">${marqItems}</div></div></section>`;
  }
  // divider fallback
  return `<section style="padding:clamp(24px,3vw,40px) 0"><div class="wrap" style="border-top:1px solid var(--bdr)"></div></section>`;
}

function renderSplitSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy, photos, fp } = ctx;
  const flip = idx % 2 === 1;
  const photo = photos[(fp + idx + 1) % photos.length];
  const bullets = copy.aboutBullets.map(b => `<li>${esc(b)}</li>`).join('');

  return `
<section>
  <div class="wrap">
    <div class="split-section${flip ? ' flip' : ''}">
      <div class="split-text">
        <div class="sec-head reveal">
          <span class="eyebrow">${esc(copy.sectionEyebrow)}</span>
          <h2>${esc(copy.aboutHeading)}</h2>
        </div>
        <p class="split-body reveal">${esc(copy.aboutBody)}</p>
        <ul class="split-list reveal">${bullets}</ul>
        <a href="about" class="btn btn-primary reveal">${esc(copy.secondaryCta)}</a>
      </div>
      <div class="split-media reveal">
        <img src="${ph(photo, 800, 1000)}" alt="${esc(copy.aboutHeading)}" loading="lazy"/>
      </div>
    </div>
  </div>
</section>`;
}

function renderGallerySection(node: LayoutNode, ctx: RenderCtx): string {
  const { copy, photos, fp } = ctx;
  const variant = node.variant as string;
  const gridClass = variant === 'filmstrip' ? 'filmstrip' : variant === 'panorama' ? 'panorama' : variant === 'masonry' ? 'masonry' : 'uniform';
  const count = gridClass === 'filmstrip' ? 6 : 6;
  const items = Array.from({ length: count }, (_, i) => {
    const photoId = photos[(fp + i + 2) % photos.length];
    const h = gridClass === 'panorama' ? 420 : 360;
    return `<div class="gallery-item reveal">
      <img src="${ph(photoId, 600, h)}" alt="Gallery ${i + 1}" loading="lazy"/>
    </div>`;
  }).join('');

  return `
<section>
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Showcase</span>
      <h2>${esc(copy.galleryHeading)}</h2>
    </div>
    <div class="gallery-grid ${gridClass}">${items}</div>
    <div style="text-align:center;margin-top:clamp(28px,4vw,44px)">
      <a href="${esc(copy.gallerySlug)}" class="btn btn-outline reveal">View All →</a>
    </div>
  </div>
</section>`;
}

function renderSignalSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy } = ctx;
  const isFullBleed = node.variant === 'full-bleed' || node.span === 'bleed';

  if (isFullBleed) {
    return `
<section class="signal-section signal-full">
  <div class="wrap">
    <h2 class="reveal">${esc(copy.ctaHeading)}</h2>
    <p class="reveal">${esc(copy.ctaSub)}</p>
    <div class="signal-ctas reveal">
      <a href="contact" class="btn btn-primary">${esc(copy.primaryCta)}</a>
      <a href="about" class="btn btn-outline">${esc(copy.secondaryCta)}</a>
    </div>
  </div>
</section>`;
  }

  return `
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">${esc(copy.ctaHeading)}</h2>
      <p class="reveal">${esc(copy.ctaSub)}</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">${esc(copy.primaryCta)}</a>
        <a href="about" class="btn btn-outline">${esc(copy.secondaryCta)}</a>
      </div>
    </div>
  </div>
</section>`;
}

function renderListSection(node: LayoutNode, ctx: RenderCtx): string {
  const { copy } = ctx;
  if (node.variant === 'accordion') {
    const faqs = [
      { q: `How do I get started with ${ctx.puo.inferredIndustry !== 'general' ? ctx.puo.inferredIndustry : 'the platform'}?`, a: `Getting started is easy. Simply click the "${copy.primaryCta}" button and follow our quick onboarding process.` },
      { q: 'Is there a free plan available?', a: 'Yes! We offer a free plan with core features so you can try before committing to a paid plan.' },
      { q: 'Can I cancel at any time?', a: 'Absolutely. There are no long-term contracts. You can cancel or change your plan at any time.' },
      { q: 'Do you offer customer support?', a: 'We provide 24/7 support through chat and email. Enterprise plans include a dedicated account manager.' },
    ];
    const items = faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
    return `
<section>
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">FAQ</span><h2>Common Questions</h2></div>
    <div class="faq-list reveal">${items}</div>
  </div>
</section>`;
  }

  // Testimonials / cards
  const testimHtml = copy.testimonials.map(t => `
    <div class="testimonial-card reveal">
      <div class="testimonial-stars">★★★★★</div>
      <blockquote class="testimonial-quote">"${esc(t.quote)}"</blockquote>
      <div class="testimonial-author">
        <div class="testimonial-avatar">${t.name.charAt(0)}</div>
        <div>
          <div class="testimonial-name">${esc(t.name)}</div>
          <div class="testimonial-role">${esc(t.role)}</div>
        </div>
      </div>
    </div>`).join('');

  return `
<section>
  <div class="wrap">
    <div class="sec-head centered reveal"><span class="eyebrow">Testimonials</span><h2>What People Say</h2></div>
    <div class="g3">${testimHtml}</div>
  </div>
</section>`;
}

function renderTileSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy, photos, fp } = ctx;
  const items = copy.features.map((f, i) => {
    const photo = photos[(fp + i + 4) % photos.length];
    return `
    <div class="card reveal reveal-delay-${i % 3}">
      <img src="${ph(photo, 600, 300)}" alt="${esc(f.title)}" loading="lazy" style="border-radius:var(--radius-sm);margin-bottom:16px;width:100%;height:180px;object-fit:cover"/>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
      <a href="contact" class="card-link">Explore →</a>
    </div>`;
  }).join('');

  return `
<section>
  <div class="wrap">
    <div class="sec-head${idx % 2 ? '' : ' centered'} reveal">
      <span class="eyebrow">Explore</span>
      <h2>${esc(copy.featureHeading)}</h2>
    </div>
    <div class="g3">${items}</div>
  </div>
</section>`;
}

function renderStageSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy, photos, fp } = ctx;
  const photo = photos[(fp + idx + 3) % photos.length];
  return `
<section>
  <div class="wrap">
    <div class="frame-block reveal">
      <div class="split-section">
        <div class="split-text">
          <div class="sec-head">
            <span class="eyebrow">Featured</span>
            <h2>${esc(copy.aboutHeading)}</h2>
          </div>
          <p class="split-body">${esc(copy.aboutBody)}</p>
          <a href="about" class="btn btn-primary">${esc(copy.secondaryCta)}</a>
        </div>
        <div class="split-media">
          <img src="${ph(photo, 800, 1000)}" alt="${esc(copy.aboutHeading)}" loading="lazy"/>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function renderFrameSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const { copy } = ctx;
  const cards = copy.features.slice(0, 2).map((f, i) => `
    <div class="card reveal reveal-delay-${i}">
      <div class="card-icon">${f.icon}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
    </div>`).join('');

  return `
<section>
  <div class="wrap">
    <div class="frame-block reveal">
      <div class="sec-head"><span class="eyebrow">Highlight</span><h2>${esc(copy.sectionEyebrow)}</h2></div>
      <div class="g2" style="margin-top:28px">${cards}</div>
    </div>
  </div>
</section>`;
}

function renderFoldSection(): string {
  return `<div style="height:clamp(32px,4vw,56px)"></div>`;
}

// Dispatch to the right renderer
function renderNode(node: LayoutNode, ctx: RenderCtx, counters: Record<string, number>): string {
  const type = node.type;
  counters[type] = (counters[type] || 0) + 1;
  const idx = counters[type] - 1;

  switch (type) {
    case 'hero':    return renderHeroSection(node, ctx, idx === 0);
    case 'cluster': return renderClusterSection(node, ctx, idx);
    case 'strip':   return renderStripSection(node, ctx);
    case 'split':   return renderSplitSection(node, ctx, idx);
    case 'gallery': return renderGallerySection(node, ctx);
    case 'signal':  return renderSignalSection(node, ctx, idx);
    case 'list':    return renderListSection(node, ctx);
    case 'tile':    return renderTileSection(node, ctx, idx);
    case 'stage':   return renderStageSection(node, ctx, idx);
    case 'frame':   return renderFrameSection(node, ctx, idx);
    case 'fold':    return renderFoldSection();
    default:        return '';
  }
}

// ─────────────────────────────────────────────────────────────────
// PAGE-SPECIFIC SECTION OVERRIDES
// ─────────────────────────────────────────────────────────────────

function renderAboutPage(puo: PromptUnderstandingObject, graph: LayoutGraph, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const photos = getPhotos(puo, fp);
  const photo1 = photos[fp % photos.length];
  const photo2 = photos[(fp + 1) % photos.length];
  const bullets = copy.aboutBullets.map(b => `<li>${esc(b)}</li>`).join('');
  const teamAvatars = ['A','B','C','D'].map((l, i) => `
    <div class="card reveal reveal-delay-${i % 3}" style="text-align:center">
      <img src="${ph(photos[(fp+i+5)%photos.length],400,400)}" alt="Team member ${i+1}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:14px"/>
      <h3>Team Member ${esc(String(i+1))}</h3>
      <p style="font-size:var(--small-size);color:var(--muted)">Core contributor at ${esc(brand)}</p>
    </div>`).join('');

  const main = `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">About Us</span>
      <h1 style="font-size:var(--h1-size)">${esc(copy.aboutHeading)}</h1>
      <p>${esc(copy.aboutBody.slice(0, 120))}</p>
    </div>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="split-section">
      <div class="split-text">
        <div class="sec-head reveal"><h2>Our Mission</h2></div>
        <p class="split-body reveal">${esc(copy.aboutBody)}</p>
        <ul class="split-list reveal">${bullets}</ul>
        <a href="contact" class="btn btn-primary reveal">Work With Us</a>
      </div>
      <div class="split-media reveal">
        <img src="${ph(photo1,800,1000)}" alt="About ${esc(brand)}" loading="lazy"/>
      </div>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="sec-head centered reveal"><span class="eyebrow">Our Team</span><h2>The People Behind ${esc(brand)}</h2></div>
    <div class="g4">${teamAvatars}</div>
  </div>
</section>
${renderStripSection({ type:'strip', variant:'stats-row' } as LayoutNode, { puo, copy, photos, fp, pageName:'about', navItems })}
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Ready to Get Started?</h2>
      <p class="reveal">Join thousands of others who trust ${esc(brand)}.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">${esc(copy.primaryCta)}</a>
        <a href="${esc(copy.gallerySlug)}" class="btn btn-outline">See Our Work</a>
      </div>
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, 'about');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'About', copy.aboutBody, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function renderGalleryPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const photos = getPhotos(puo, fp);
  const galleryItems = Array.from({ length: 9 }, (_, i) => {
    const photoId = photos[(fp + i + 2) % photos.length];
    const hs = [320, 380, 280, 350, 400, 300];
    const h = hs[i % hs.length];
    return `<div class="gallery-item reveal">
      <img src="${ph(photoId, 600, h)}" alt="${esc(copy.galleryHeading)} item ${i+1}" loading="lazy"/>
    </div>`;
  }).join('');

  const main = `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Portfolio</span>
      <h1 style="font-size:var(--h1-size)">${esc(copy.galleryHeading)}</h1>
    </div>
    <div class="gallery-grid masonry" style="grid-auto-rows:220px">${galleryItems}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Like What You See?</h2>
      <p class="reveal">Let's create something amazing together.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Get in Touch</a>
        <a href="about" class="btn btn-outline">About Us</a>
      </div>
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, copy.gallerySlug);
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, copy.galleryHeading, copy.heroSub, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function renderContactPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const main = `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Contact</span>
      <h1 style="font-size:var(--h1-size)">${esc(copy.contactHeading)}</h1>
      <p>${esc(copy.contactSub)}</p>
    </div>
    <div class="contact-form-grid" style="margin-top:clamp(36px,5vw,56px)">
      <div class="contact-info reveal">
        <div class="contact-detail"><span class="contact-detail-icon">📧</span><span>hello@${esc(brand.toLowerCase().replace(/[^a-z0-9]/g,''))}.com</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">📞</span><span>+1 (555) 000-0000</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">📍</span><span>Available worldwide</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">⏰</span><span>Mon–Fri, 9am–6pm</span></div>
      </div>
      <form class="reveal">
        <div><label>Full Name</label><input type="text" name="name" placeholder="Your name" required/></div>
        <div><label>Email Address</label><input type="email" name="email" placeholder="you@email.com" required/></div>
        <div><label>Subject</label><input type="text" name="subject" placeholder="How can we help?"/></div>
        <div><label>Message</label><textarea name="message" placeholder="Tell us about your project..." required></textarea></div>
        <button type="submit" class="btn btn-primary" style="align-self:flex-start">Send Message →</button>
      </form>
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, 'contact');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'Contact', copy.contactSub, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function renderPricingPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  if (!copy.pricingPlans) return '';

  const plansHtml = copy.pricingPlans.map(p => {
    const featHtml = p.features.map(f => `<li><span class="price-check">✓</span> ${esc(f)}</li>`).join('');
    return `
    <div class="price-card${p.featured?' featured':''}">
      ${p.featured ? '<div class="price-badge">Most Popular</div>' : ''}
      <div class="price-name">${esc(p.name)}</div>
      <div class="price-desc">${esc(p.desc)}</div>
      <div class="price-amount">${esc(p.price)}</div>
      <div class="price-period">${esc(p.period)}</div>
      <ul class="price-features">${featHtml}</ul>
      <a href="contact" class="btn ${p.featured?'btn-primary':'btn-outline'}" style="width:100%;justify-content:center">${p.price==='Free'?'Get Started Free':'Start Free Trial'}</a>
    </div>`;
  }).join('');

  const faqs = [
    { q:'Can I switch plans?', a:'Yes, upgrade or downgrade at any time.' },
    { q:'Is there a free trial?', a:'The Starter plan is free forever, no credit card required.' },
    { q:'What payment methods?', a:'All major credit cards, PayPal, and bank transfer for enterprise plans.' },
    { q:'Refund policy?', a:'30-day money-back guarantee, no questions asked.' },
  ];
  const faqHtml = faqs.map(f => `<details style="border-bottom:1px solid var(--bdr);padding:18px 0"><summary style="font-weight:600;cursor:pointer">${esc(f.q)}</summary><p style="color:var(--muted);margin-top:8px;font-size:var(--small-size)">${esc(f.a)}</p></details>`).join('');

  const main = `
<section style="padding-top:140px;text-align:center">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Pricing</span>
      <h1 style="font-size:var(--h1-size)">Simple, Transparent Pricing</h1>
      <p>No hidden fees. No surprises. Cancel anytime.</p>
    </div>
    <div class="price-grid reveal">${plansHtml}</div>
    <div style="max-width:680px;margin:clamp(52px,7vw,90px) auto 0">
      <h2 class="reveal" style="font-size:var(--h2-size);margin-bottom:24px;text-align:left">FAQ</h2>
      ${faqHtml}
    </div>
  </div>
</section>`;

  const nav = buildNav(brand, navItems, 'pricing');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'Pricing', 'Simple, transparent pricing', font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

// ─────────────────────────────────────────────────────────────────
// HOMEPAGE BUILDER — driven by LayoutGraph nodes
// ─────────────────────────────────────────────────────────────────

function buildHomePage(
  graph: LayoutGraph,
  puo: PromptUnderstandingObject,
  brand: string,
  navItems: Array<{ label: string; href: string }>,
  copy: SiteCopy,
  css: string,
  font: FontConfig,
  base: string,
  fp: number,
  year: number
): string {
  const photos = getPhotos(puo, fp);
  const ctx: RenderCtx = { puo, copy, photos, fp, pageName: 'home', navItems };
  const counters: Record<string, number> = {};
  const sections = graph.nodes.map(node => renderNode(node, ctx, counters)).filter(Boolean).join('\n');
  const nav = buildNav(brand, navItems, '.');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'Home', copy.heroSub, font, css, base);
  return `${head}<body>${nav}<main>${sections}</main>${footer}${PAGE_JS}</body></html>`;
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────

export function renderMultiPageSite(
  context: ISharedContext,
  brandName: string,
  subdomain = '',
): MultiPageOutput {
  const prompt = context.input.userPrompt;
  const brand  = brandName || 'Brand';
  const year   = new Date().getFullYear();
  const base   = subdomain ? `/sites/${subdomain}/` : '';

  // 1. Deep prompt analysis — extracts 12 semantic dimensions
  const parseResult = parsePrompt(prompt);
  const puo = parseResult.success ? parseResult.object : (() => {
    // Fallback: minimal safe PUO
    const fallback = parsePrompt('modern professional website');
    return fallback.object;
  })();

  const fp = fnv(brand + '|' + prompt);

  // 2. Generate root layout graph — unique section ordering per prompt
  const rootResult = composeLayout(buildComposerInput(puo));
  const composedRoot = rootResult.success ? rootResult.graph : composeLayout(buildComposerInput(puo)).graph;
  // Diversity pass: compare against generation history and mutate the structure
  // (ordering, hierarchy, composition, rhythm, spacing, arrangement) if it is too
  // similar to a previous generation, then register it for future comparisons.
  const rootGraph = diversifyLayout(prompt, composedRoot, puo).graph;

  // 3. Build site copy from PUO
  const copy = buildSiteCopy(puo, brand, fp);
  const gallerySlug = copy.gallerySlug;

  // 4. Navigation — real routes
  const navItems: Array<{ label: string; href: string }> = [
    { label: 'Home',  href: '.' },
    { label: 'About', href: 'about' },
    { label: copy.galleryHeading.split(' ').pop() || 'Gallery', href: gallerySlug },
    { label: 'Contact', href: 'contact' },
  ];
  if (copy.pricingPlans) {
    navItems.splice(3, 0, { label: 'Pricing', href: 'pricing' });
  }

  // 5. CSS built from PUO — entirely prompt-faithful
  const font = getFontConfig(puo);
  const css  = buildCSSFromPUO(puo, font);

  // 6. Generate each page with its own independent LayoutGraph
  const pages: Record<string, string> = {};

  // Home: use root graph (driven by prompt)
  pages['/'] = buildHomePage(rootGraph, puo, brand, navItems, copy, css, font, base, fp, year);

  // About: own graph seeded with page context, then diversified vs. history
  const aboutGraph = diversifyLayout(`${prompt} | about`, composePageGraph(puo, 'about', fp), puo).graph;
  pages['/about'] = renderAboutPage(puo, aboutGraph, brand, navItems, copy, css, font, base, fp + 1, year);

  // Gallery: own graph
  pages[`/${gallerySlug}`] = renderGalleryPageHtml(puo, brand, navItems, copy, css, font, base, fp + 2, year);

  // Contact: own graph
  pages['/contact'] = renderContactPageHtml(puo, brand, navItems, copy, css, font, base, fp + 3, year);

  // Pricing (conditional)
  if (copy.pricingPlans) {
    pages['/pricing'] = renderPricingPageHtml(puo, brand, navItems, copy, css, font, base, fp + 4, year);
  }

  return {
    pages,
    nav: navItems,
    gallerySlug,
    primaryPage: pages['/'],
  };
}

/** Backward-compatible single-page render. */
export function renderSiteHtml(context: ISharedContext, brandName: string): string {
  return renderMultiPageSite(context, brandName).primaryPage;
}
