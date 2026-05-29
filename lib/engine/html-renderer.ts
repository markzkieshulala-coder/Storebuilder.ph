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
import type { PromptUnderstandingObject } from './prompt-engine';
import type { LayoutGraph, LayoutNode, ComposerInput } from './layout-composer';
import { checkDiversity, registerGeneration } from './diversity-engine';
import type { DiversityEngineInput } from './diversity-engine';
import { generateVisualDataUri } from './visual-engine';
import type { VisualPalette, VisualRole } from './visual-engine';

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

function rotate<T>(arr: T[], by: number): T[] {
  if (arr.length === 0) return arr;
  const n = ((by % arr.length) + arr.length) % arr.length;
  return arr.slice(n).concat(arr.slice(0, n));
}

// Image source. The values produced by getPhotos() are self-contained
// `data:image/svg+xml,...` URIs from the in-process generative visual engine —
// no external image host. ph() simply passes those through (the w/h are encoded
// in the SVG viewBox + CSS object-fit). Legacy plain IDs still resolve to
// Unsplash for backward compatibility, but the engine no longer emits them.
function ph(idOrUri: string, w: number, h: number): string {
  if (!idOrUri) return '';
  if (idOrUri.startsWith('data:') || idOrUri.startsWith('<svg')) return idOrUri;
  return `https://images.unsplash.com/photo-${idOrUri}?auto=format&fit=crop&w=${w}&q=80&h=${h}`;
}

// ─────────────────────────────────────────────────────────────────
// ICONS — clean inline line-SVGs (no emoji) so output stays premium
// ─────────────────────────────────────────────────────────────────

function svgIcon(inner: string): string {
  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// Generic, niche-agnostic premium feature icons.
const ICON_SVGS: string[] = [
  svgIcon('<path d="M13 2 4 14h7l-1 8 10-12h-7z"/>'),                                              // bolt
  svgIcon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>'),                       // target
  svgIcon('<path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z"/><path d="M9 12l2 2 4-4"/>'),  // shield-check
  svgIcon('<path d="M3 20h18"/><path d="M6 20V11M11 20V5M16 20v-7M21 20v-4"/>'),                   // bar chart
  svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/>'), // globe
  svgIcon('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),                              // layers
  svgIcon('<circle cx="12" cy="12" r="9"/><path d="M16 8l-2.2 6.2L7.8 16 10 9.8z"/>'),            // compass
  svgIcon('<circle cx="12" cy="9" r="5"/><path d="M9 13.5 7 21l5-2.8L17 21l-2-7.5"/>'),            // award
  svgIcon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'), // grid
  svgIcon('<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>'),                                    // trending-up
  svgIcon('<path d="M12 2l2.4 5.8L20 9l-4.5 4 1.3 6.2L12 16l-4.8 3.2L8.5 13 4 9l5.6-1.2z"/>'),     // spark/star outline
  svgIcon('<path d="M20 7 9 18l-5-5"/>'),                                                          // check
];

// Contextual icons used for contact details.
const ICON_MAIL = svgIcon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>');
const ICON_PHONE = svgIcon('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l1 5v1a2 2 0 0 1-2 2 16 16 0 0 1-15-15 2 2 0 0 1 2-2z"/>');
const ICON_PIN = svgIcon('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>');
const ICON_CLOCK = svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const STAR_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.3 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.3l1.4-6.7-5-4.6 6.8-.7z"/></svg>';
const STARS_5 = `<span style="display:inline-flex;gap:3px">${STAR_SVG.repeat(5)}</span>`;

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

/* ── ULTRA-PREMIUM 3D & DEPTH EFFECTS ──────────────────────────────── */
@keyframes float{0%,100%{transform:translateY(0) rotate(-0.8deg)}50%{transform:translateY(-20px) rotate(0.8deg)}}
@keyframes glow-pulse{0%,100%{box-shadow:0 12px 32px -10px ${cp.primary}88}50%{box-shadow:0 22px 52px -8px ${cp.primary}cc,0 0 48px -8px ${cp.primary}66}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}

/* Floating hero media */
.hero-media{animation:float 7s ease-in-out infinite;transform-origin:center bottom;will-change:transform}

/* 3D card hover — perspective lift for every niche */
.card{transform-style:preserve-3d;will-change:transform;transition:transform .45s cubic-bezier(.22,1,.36,1),box-shadow .45s cubic-bezier(.22,1,.36,1),background .25s}
.card:hover{transform:perspective(1200px) translateY(-12px) rotateX(4deg) scale(1.02);box-shadow:0 28px 64px -12px ${cp.primary}44,var(--shadow-lg)}
.card-icon{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s;box-shadow:0 4px 20px color-mix(in srgb,var(--primary) 18%,transparent)}
.card:hover .card-icon{transform:scale(1.15) translateY(-2px);box-shadow:0 8px 32px color-mix(in srgb,var(--primary) 30%,transparent)}

/* Glow CTA button */
.btn-primary{animation:glow-pulse 3.5s ease-in-out infinite}
.btn-primary:hover{animation:none;transform:translateY(-3px) scale(1.04);box-shadow:0 20px 50px -8px ${cp.primary}cc,0 0 40px -6px ${cp.primary}66}

${isDark ? `
/* Glassmorphism — dark theme cards */
.card{background:rgba(255,255,255,0.05);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,0.10)}
.card:hover{background:rgba(255,255,255,0.09);border-color:rgba(255,255,255,0.20)}
.testimonial-card{background:rgba(255,255,255,0.04);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.08)}
.signal-inner{background:rgba(255,255,255,0.04);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,0.10)}
header.scrolled{background:rgba(0,0,0,0.72);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px)}
` : `
/* Soft glassmorphism — light theme cards */
.card{box-shadow:0 2px 16px rgba(0,0,0,.06),inset 0 1px 0 rgba(255,255,255,.8)}
.signal-inner{box-shadow:0 8px 40px rgba(0,0,0,.08)}
`}

/* Cinematic hero depth layer */
.hero-fullbleed .hero-bg::before{content:'';position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at 25% 60%,${cp.primary}28 0%,transparent 65%)}
.hero-bg img{filter:brightness(${isDark ? '0.65' : '0.80'});transform:scale(1.03);transition:transform 8s ease-out}

/* Premium stat numbers — gradient shimmer */
.stat-number{background:linear-gradient(90deg,${cp.primary},${cp.secondary},${cp.accent},${cp.primary});background-size:300% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shimmer 4s linear infinite}

/* Section accent backgrounds for visual rhythm */
section:nth-child(even){background:color-mix(in srgb,var(--surf) 55%,var(--bg))}
.strip-section{background:color-mix(in srgb,var(--primary) 5%,var(--surf));border-top:1px solid color-mix(in srgb,var(--primary) 14%,transparent);border-bottom:1px solid color-mix(in srgb,var(--primary) 14%,transparent)}

/* Gallery item depth hover */
.gallery-item{transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s}
.gallery-item:hover{transform:scale(1.03) translateY(-4px);box-shadow:0 20px 48px -8px rgba(0,0,0,0.35)}

/* Split media — premium depth */
.split-media{transition:transform .5s cubic-bezier(.22,1,.36,1),box-shadow .5s}
.split-media:hover{transform:perspective(1200px) rotateY(-3deg) translateX(4px);box-shadow:0 32px 80px -16px rgba(0,0,0,0.3)}

/* Testimonial card lift */
.testimonial-card{transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s}
.testimonial-card:hover{transform:translateY(-8px) scale(1.01);box-shadow:0 20px 52px -12px ${cp.primary}33,var(--shadow-lg)}
`;
}

// ─────────────────────────────────────────────────────────────────
// PHOTO BANK — keyed by visual mood + industry
// ─────────────────────────────────────────────────────────────────

// Maps raw inferredIndustry values → canonical copy/stat bank keys.
const INDUSTRY_KEY_MAP: Record<string, string> = {
  // Food & beverage — specific sub-niches map to 'food' for copy banks
  food: 'food', restaurant: 'food', cafe: 'food', coffee: 'food', bakery: 'food',
  dining: 'food', bistro: 'food', diner: 'food', brewery: 'food', bar: 'food',
  ramen: 'food', sushi: 'food', pizza: 'food', burger: 'food', barbecue: 'food',
  espresso: 'food', barista: 'food', boba: 'food', smoothie: 'food', brunch: 'food',
  // Sports & fitness — specific sub-niches map to 'sports'
  sports: 'sports', fitness: 'sports', gym: 'sports', athletic: 'sports',
  workout: 'sports', crossfit: 'sports', pilates: 'sports', yoga: 'sports',
  boxing: 'sports', martial: 'sports', hiit: 'sports', bodybuilding: 'sports',
  // Technology
  technology: 'technology', tech: 'technology', saas: 'technology', software: 'technology',
  startup: 'technology', ai: 'technology', crypto: 'technology', blockchain: 'technology',
  fintech: 'technology', gaming: 'technology',
  // Photography & creative
  photography: 'photography', photographer: 'photography', film: 'photography', videography: 'photography',
  // Fashion & beauty
  fashion: 'fashion', beauty: 'fashion', apparel: 'fashion', clothing: 'fashion',
  streetwear: 'fashion', boutique: 'fashion', salon: 'fashion', tattoo: 'fashion',
  barbershop: 'fashion', barber: 'fashion', grooming: 'fashion', nail: 'fashion',
  // E-commerce
  ecommerce: 'ecommerce', retail: 'ecommerce', shop: 'ecommerce', store: 'ecommerce', product: 'ecommerce',
  // Portfolio & design
  portfolio: 'portfolio', art: 'portfolio', design: 'portfolio', architecture: 'portfolio',
  interior: 'portfolio', illustration: 'portfolio',
  // Agency & marketing
  agency: 'agency', marketing: 'agency', consulting: 'agency', advertising: 'agency',
  branding: 'agency', studio: 'agency', pr: 'agency',
  // Wellness & health
  spa: 'wellness', wellness: 'wellness', meditation: 'wellness', massage: 'wellness',
  therapy: 'wellness', dental: 'wellness', dentist: 'wellness', clinic: 'wellness',
  // Legal & professional
  law: 'professional', legal: 'professional', nonprofit: 'professional',
  // Hospitality
  hotel: 'hospitality', resort: 'hospitality', travel: 'hospitality',
};

function normalizeIndustry(raw: string): string {
  return INDUSTRY_KEY_MAP[raw] || 'general';
}

// ─────────────────────────────────────────────────────────────────
// IMAGE SOURCE — in-process generative visual engine (no third-party API).
// Every visual is synthesized from the SAME understanding object that drives
// the layout + copy, so the niche, palette, mood, and style of each image
// always match the website. Returns self-contained data:image/svg+xml URIs.
// ─────────────────────────────────────────────────────────────────

// Map a slot index to a visual ROLE so heroes/galleries/features each get an
// appropriately-composed visual while staying coherent with the brand.
const SLOT_ROLES: VisualRole[] = ['hero', 'split', 'feature', 'gallery', 'product', 'gallery', 'feature', 'split', 'cta', 'gallery', 'product', 'feature'];

function getPhotos(puo: PromptUnderstandingObject, fp: number): string[] {
  const cp = puo.visual.colorPalette;
  const palette: VisualPalette = {
    primary: cp.primary, secondary: cp.secondary, accent: cp.accent,
    background: cp.background, surface: cp.surface, text: cp.text, muted: cp.muted,
  };
  const base = {
    palette,
    mood: puo.visualMood as string,
    style: puo.designStyle as string,
    niche: normalizeIndustry(puo.inferredIndustry.toLowerCase()),
    rawNiche: puo.inferredIndustry.toLowerCase(),
    keywords: getContentWords(puo),
  };

  // Generate a coherent SET of distinct visuals — each slot varies by seed +
  // role for variety, while niche/palette/mood stay constant for coherence.
  const COUNT = 12;
  const out: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    const role = SLOT_ROLES[i % SLOT_ROLES.length];
    const seed = (Math.abs(fp) ^ (i * 0x9E3779B1)) >>> 0;
    out.push(generateVisualDataUri({ ...base, seed, role }));
  }
  return out;
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
  missionHeading: string;
  missionBody: string;
  galleryHeading: string;
  gallerySlug: string;
  contactHeading: string;
  contactSub: string;
  ctaHeading: string;
  ctaSub: string;
  footerTagline: string;
  pricingPlans: Array<{ name: string; price: string; period: string; desc: string; features: string[]; featured: boolean }> | null;
  hiddenPrimarySlug: string;
  hiddenSecondarySlug: string;
  hiddenPrimaryCtaLabel: string;
  hiddenSecondaryCtaLabel: string;
}

// Words that describe HOW a site should look/feel rather than WHAT it is about.
// Filtered out of content extraction so headlines/feature copy anchor on the real
// subject noun (e.g. "ramen", "sneakers") instead of an adjective like "minimalist".
const STYLE_WORDS = new Set([
  // moods / tones
  'dark','light','bright','airy','warm','cold','cozy','muted','vibrant','neon','ethereal','dreamy','dramatic','contrast','moody','calm','serene',
  'intimate','atmospheric','atmosphere','ambiance','ambient','lush','deep','pure','raw','earthy','rustic','subtle','understated','timeless',
  // design styles / adjectives
  'minimal','minimalist','bold','elegant','clean','modern','luxury','luxurious','premium','sleek','stylish','sophisticated','refined','classy','chic',
  'flat','brutalist','glassmorphism','neumorphism','cyberpunk','futuristic','retro','vintage','editorial','corporate','playful','artistic','organic','industrial','vaporwave','cinematic',
  'professional','aesthetic','beautiful','stunning','amazing','gorgeous','sexy','fancy','fresh','trendy','crisp','smooth','polished','high-end','upscale',
  'classic','sleek','sharp','bold','iconic','signature','curated','handcrafted','artisanal','bespoke','elevated','immersive',
  // personality / filler
  'great','best','good','nice','cool','awesome','simple','creative','unique','dynamic','energetic','friendly','powerful','strong','exclusive',
  'inspired','authentic','genuine','real','true','pure','honest','passionate','dedicated','committed',
  // web meta words
  'website','site','page','pages','landing','homepage','layout','design','designs','style','styles','theme','color','colors','colour','font','fonts','typography',
  'build','create','make','generate','want','need','please','with','that','this','for','the','and','have','has','look','feel','vibe','using','about',
  'scheme','palette','brand','branding','theme','visual','texture','pattern','motif','gradient',
  // color names — these are captured as palette tokens, never as content nouns
  'red','blue','green','yellow','orange','purple','pink','black','white','gray','grey','brown','cyan','magenta','teal',
  'indigo','violet','gold','silver','beige','navy','maroon','olive','lime','turquoise','lavender','peach','cream',
  'charcoal','slate','ivory','mint','coral','amber','rose','zinc','stone','emerald','sapphire','ruby','topaz',
  // industry entity nouns (these are niche classifiers, not distinctive content nouns)
  'restaurant','shop','store','studio','brand','boutique','agency','firm','company','business','cafe','bar','salon',
  'clinic','gym','club','space','venue','place','spot','concept','market','collective','office','practice','center','centre',
  // location / geography — city names, districts, countries that should never be headline subjects
  'tokyo','osaka','kyoto','shibuya','shinjuku','nagoya','hiroshima','yokohama',
  'manila','bgc','makati','taguig','cebu','ortigas','quezon','pasig',
  'paris','london','berlin','amsterdam','rome','madrid','lisbon','vienna','zurich',
  'nyc','newyork','brooklyn','manhattan','losangeles','chicago','miami','seattle','boston','austin',
  'seoul','beijing','shanghai','hongkong','singapore','jakarta','kuala','lumpur','bangkok','dubai',
  'japan','korea','china','taiwan','vietnam','thailand','india','france','germany','italy','spain','portugal',
  'downtown','uptown','midtown','westside','eastside','northside','southside','suburb','district','neighborhood',
  // prepositions / connectors / articles (double-coverage is harmless)
  'from','into','onto','upon','over','under','between','through','across','along','within','without','beyond',
  'also','just','very','too','more','most','less','much','many','some','any','all','new',
]);

function getContentWords(puo: PromptUnderstandingObject): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of puo.extractedKeywords) {
    const k = raw.toLowerCase();
    if (k.length <= 3 || STYLE_WORDS.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 8) break;
  }
  return out;
}

// Human-readable subject for a niche, used as the headline anchor when the prompt
// has no distinctive content noun of its own. Reads naturally in copy patterns.
const NICHE_SUBJECT: Record<string, string> = {
  food: 'Flavour', restaurant: 'Cuisine', cafe: 'Coffee', coffee: 'Coffee',
  ramen: 'Ramen', sushi: 'Sushi', pizza: 'Pizza', burger: 'Burgers', bakery: 'Pastry',
  espresso: 'Espresso', barista: 'Coffee', boba: 'Boba', brunch: 'Brunch', bar: 'Cocktails',
  sports: 'Performance', gym: 'Training', fitness: 'Fitness', crossfit: 'CrossFit',
  yoga: 'Yoga', pilates: 'Pilates', boxing: 'Boxing', wellness: 'Wellness',
  technology: 'Innovation', saas: 'Software', startup: 'Technology',
  photography: 'Imagery', videography: 'Film',
  fashion: 'Style', streetwear: 'Streetwear', beauty: 'Beauty', salon: 'Styling',
  tattoo: 'Ink', barbershop: 'Grooming', barber: 'Grooming',
  ecommerce: 'Shopping', retail: 'Products',
  portfolio: 'Craft', art: 'Art', design: 'Design', architecture: 'Architecture',
  agency: 'Strategy', marketing: 'Marketing', consulting: 'Consulting',
  spa: 'Wellness', massage: 'Relaxation', dental: 'Care', therapy: 'Healing',
  hotel: 'Hospitality', travel: 'Experience',
  general: 'Excellence',
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function buildSiteCopy(puo: PromptUnderstandingObject, brand: string, fp: number): SiteCopy {
  const kws = getContentWords(puo);
  const industry = puo.inferredIndustry;
  const normIndustry = normalizeIndustry(industry);
  const mood = puo.visualMood;
  const personality = puo.websitePersonality;
  const tone = puo.businessTone;
  const direction = puo.layout.direction;
  // gallerySlug declared early so feature hrefs can reference it
  const gallerySlug = detectGallerySlug(puo);
  const hiddenCfg = getHiddenPageConfig(normIndustry);

  // Derive headline descriptors. The prompt's own content noun wins (most specific);
  // then the specific industry slug subject ("ramen" → "Ramen"); then the normalized
  // niche subject ("food" → "Flavour"). Never falls through to a generic word.
  const rawSubject = NICHE_SUBJECT[industry] || (industry !== 'general' ? titleCase(industry) : null);
  const normSubject = NICHE_SUBJECT[normIndustry] || null;
  const nicheSubject = rawSubject || normSubject || 'Excellence';
  const mainKw = kws[0] ? titleCase(kws[0]) : nicheSubject;
  const secKw  = kws[1] ? titleCase(kws[1]) : nicheSubject !== 'Experience' ? 'Experience' : 'Quality';
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

  // Hero subtitle — a crafted, benefit-led sentence. We deliberately DO NOT echo
  // the raw prompt back (that leaks meta-instructions like "modern, clean website
  // with Facebook colors" into the page). Instead we compose copy from the niche
  // subject + supporting keyword so it reads like real marketing.
  const subjectPhrase = (kws[0] ? kws[0] : nicheSubject).toLowerCase();
  const supportPhrase = (kws[1] ? kws[1] : secKw).toLowerCase();
  const heroSubPatterns = [
    `Premium ${subjectPhrase} crafted for those who expect more — where ${supportPhrase} meets uncompromising quality.`,
    `Discover ${brand}: a new standard in ${subjectPhrase}, built around ${supportPhrase} and an obsession with detail.`,
    `Experience ${subjectPhrase} done right. Thoughtfully designed, expertly delivered, and made to leave an impression.`,
    `${brand} brings ${subjectPhrase} and ${supportPhrase} together into one seamless, elevated experience.`,
    `Where ${subjectPhrase} becomes an experience. Refined, considered, and crafted for you.`,
  ];
  const heroSub = pick(heroSubPatterns, fp + 2);

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
  const ICONS = ICON_SVGS;

  // Feature link target: route to gallery slug for portfolio/ecommerce, about for showcase, contact otherwise
  const featureLinkMap: Record<string, string> = {
    'portfolio': gallerySlug, 'e-commerce': gallerySlug, 'showcase': gallerySlug,
    'editorial': gallerySlug, 'saas': 'contact', 'dashboard': 'contact',
    'lead-gen': 'contact', 'landing': 'contact',
  };
  const featureHref = featureLinkMap[direction] || (gallerySlug !== 'gallery' ? gallerySlug : 'about');

  const FEATURE_SUFFIXES_BY_INDUSTRY: Record<string, string[]> = {
    food:        ['Experience','Craft','Tradition','Flavour','Quality','Freshness','Recipe','Story'],
    sports:      ['Performance','Training','Edge','Power','Speed','Technique','Results','Program'],
    technology:  ['Engine','Platform','Suite','Intelligence','API','Dashboard','Flow','System'],
    photography: ['Portfolio','Gallery','Shoot','Vision','Style','Process','Collection','Work'],
    fashion:     ['Collection','Look','Style','Season','Edit','Drop','Range','Line'],
    ecommerce:   ['Collection','Selection','Range','Shop','Bestsellers','Edit','Picks','Store'],
    portfolio:   ['Showcase','Project','Vision','Process','Series','Collection','Work','Study'],
    agency:      ['Strategy','Campaign','Brand','Studio','Approach','System','Method','Craft'],
    general:     ['System','Suite','Hub','Platform','Edge','Solution','Flow','Intelligence'],
  };
  const suffixes = FEATURE_SUFFIXES_BY_INDUSTRY[normIndustry] || FEATURE_SUFFIXES_BY_INDUSTRY.general;

  const FEATURE_DESC_BY_INDUSTRY: Record<string, (kw: string) => string> = {
    food:        (kw) => `Authentic ${kw} crafted with passion and served with pride.`,
    sports:      (kw) => `Elevate your ${kw} performance with expert-level training and coaching.`,
    technology:  (kw) => `Powerful ${kw} capabilities built for modern engineering teams.`,
    photography: (kw) => `Capturing the essence of ${kw} through a refined visual perspective.`,
    fashion:     (kw) => `Curated ${kw} pieces that define your individual style.`,
    ecommerce:   (kw) => `A seamless ${kw} shopping experience, from first browse to checkout.`,
    portfolio:   (kw) => `A showcase of ${kw} work crafted with attention to every detail.`,
    agency:      (kw) => `Strategic ${kw} solutions that move your brand forward.`,
    general:     (kw) => `Exceptional ${kw} tailored to your specific needs.`,
  };
  const descFor = FEATURE_DESC_BY_INDUSTRY[normIndustry] || FEATURE_DESC_BY_INDUSTRY.general;

  const allKwFeatures = kws.slice(0, 6).map((kw, i) => ({
    icon: ICONS[(fp + i) % ICONS.length],
    title: `${titleCase(kw)} ${pick(suffixes, fp + i)}`,
    desc: descFor(kw),
    href: featureHref,
  }));
  // Pad to 3 with generic feature descriptions if needed
  while (allKwFeatures.length < 3) {
    const defaults = [
      { icon: ICON_SVGS[9], title: 'Peak Performance', desc: `Our ${mainKw} approach delivers measurable results from day one.`, href: featureHref },
      { icon: ICON_SVGS[2], title: 'Trusted Quality', desc: `Every aspect of ${brand} is built on a foundation of quality and trust.`, href: 'about' },
      { icon: ICON_SVGS[7], title: 'Proven Results', desc: `Hundreds of clients have already experienced the ${brand} difference.`, href: featureHref },
    ];
    allKwFeatures.push(defaults[allKwFeatures.length % defaults.length]);
  }
  const features = allKwFeatures.slice(0, 4);

  // Stats
  const statBanks: Record<string, Array<{ number: string; label: string }>> = {
    technology: [{number:'10K+',label:'Active Users'},{number:'99.9%',label:'Uptime SLA'},{number:'4.9/5',label:'User Rating'},{number:'<100ms',label:'Response Time'}],
    ecommerce:  [{number:'50K+',label:'Products'},{number:'98%',label:'Satisfaction'},{number:'24/7',label:'Support'},{number:'120+',label:'Countries'}],
    portfolio:  [{number:'200+',label:'Projects'},{number:'8+',label:'Years Experience'},{number:'50+',label:'Clients'},{number:'15+',label:'Awards'}],
    photography:[{number:'200+',label:'Shoots'},{number:'12+',label:'Years'},{number:'50+',label:'Clients'},{number:'15+',label:'Awards'}],
    fashion:    [{number:'120+',label:'Pieces'},{number:'4.9/5',label:'Reviews'},{number:'30+',label:'Collections'},{number:'90+',label:'Stockists'}],
    sports:     [{number:'500+',label:'Athletes'},{number:'100+',label:'Championships'},{number:'5/5',label:'Coaching'},{number:'20+',label:'Sports'}],
    food:       [{number:'200+',label:'Menu Items'},{number:'4.9/5',label:'Reviews'},{number:'10+',label:'Years Open'},{number:'Daily',label:'Fresh Ingredients'}],
    agency:     [{number:'300+',label:'Clients'},{number:'$50M+',label:'Revenue Generated'},{number:'10+',label:'Years'},{number:'50+',label:'Experts'}],
    general:    [{number:'10K+',label:'Happy Clients'},{number:'98%',label:'Satisfaction'},{number:'24/7',label:'Support'},{number:'5/5',label:'Rating'}],
  };
  const stats = (statBanks[normIndustry] || statBanks.general).slice(0, 4);

  // Testimonials — vary by industry for authenticity
  const TESTIMONIAL_ROLES: Record<string, string[]> = {
    food:       ['Regular Guest','Food Critic','Local Resident','Weekly Visitor'],
    sports:     ['Competitive Athlete','Personal Trainer','Team Coach','Amateur Enthusiast'],
    technology: ['CTO, TechCorp','Head of Engineering, BuildFast','Lead Developer, DataFlow','VP Product, ScaleUp'],
    photography:['Art Director, Studio9','Creative Director, Brand Co','Marketing Lead, Vision Co','Publisher, Photo Weekly'],
    fashion:    ['Fashion Editor','Style Consultant','Brand Manager','Loyal Customer'],
    ecommerce:  ['Verified Buyer','Repeat Customer','Brand Partner','First-time Shopper'],
    portfolio:  ['Art Director, Studio9','Creative Director, Brand Co','Gallery Curator','Editorial Lead'],
    agency:     ['CMO, GrowthCo','Brand Director, ScaleUp','Founder, BuildFast','Head of Marketing, DataFlow'],
    general:    ['CEO, GrowthCo','Operations Director, ScaleUp','Founder, BuildFast','Product Lead, DataFlow'],
  };
  const roles = TESTIMONIAL_ROLES[normIndustry] || TESTIMONIAL_ROLES.general;

  const TESTIMONIAL_QUOTES: Record<string, string[]> = {
    food:       [
      `The atmosphere and food quality at ${brand} is something I look forward to every week.`,
      `${brand} has the best ${mainKw} I've had. Nothing else even comes close.`,
      `Every visit to ${brand} feels special. The ${secKw} is outstanding.`,
    ],
    sports:     [
      `${brand} completely elevated my ${mainKw} performance. My results have never been better.`,
      `The ${mainKw} program at ${brand} is world-class. I've trained everywhere — this is the best.`,
      `Incredible ${mainKw} coaching. My technique improved dramatically in just weeks.`,
    ],
    technology: [
      `${brand} transformed how our team handles ${mainKw}. The results speak for themselves.`,
      `We've tried every tool out there — nothing matches what ${brand} delivers for ${secKw}.`,
      `Our ${mainKw} metrics improved by 3x within the first month of using ${brand}.`,
    ],
    photography:[
      `${brand} captured exactly the ${mainKw} vision we had in mind. Stunning work.`,
      `Every frame ${brand} delivers is gallery-worthy. The ${secKw} is unmatched.`,
      `Working with ${brand} on our ${mainKw} shoot was effortless and inspiring.`,
    ],
    fashion:    [
      `${brand} has become my go-to for ${mainKw}. Every piece feels considered.`,
      `The ${mainKw} collection from ${brand} is unlike anything else out there.`,
      `${brand} understands ${secKw} better than any label I've worked with.`,
    ],
    ecommerce:  [
      `Ordering ${mainKw} from ${brand} was seamless — fast shipping and beautiful packaging.`,
      `${brand} is the only place I shop for ${mainKw} now. Quality every single time.`,
      `The ${secKw} selection at ${brand} keeps me coming back month after month.`,
    ],
    agency:     [
      `${brand} reimagined our ${mainKw} from the ground up. Our brand has never looked sharper.`,
      `The ${brand} team treated our ${mainKw} like their own. The results were undeniable.`,
      `Our ${secKw} engagement tripled after partnering with ${brand}.`,
    ],
    general:    [
      `${brand} completely transformed our ${mainKw} operations. The results are undeniable.`,
      `Nothing compares to what ${brand} delivers. Our ${secKw} metrics improved by 3x.`,
      `The ${mainKw} experience with ${brand} is unmatched. Every team should use this.`,
    ],
  };
  const quotes = TESTIMONIAL_QUOTES[normIndustry] || TESTIMONIAL_QUOTES.general;
  const names = ['Alex Chen', 'Sarah Miller', 'Marcus Johnson'];
  const testimonials = names.map((name, i) => ({
    quote: quotes[i] || quotes[0],
    name,
    role: roles[i] || roles[0],
  }));

  // About
  const aboutHeading = `The ${brand} Story`;
  const aboutBody = `We built ${brand} to solve the challenges we faced with ${mainKw} every day. What started as a simple idea has grown into the platform trusted by teams worldwide. Our mission: make ${mainKw} simple, powerful, and accessible for everyone.`;
  const aboutBullets = [
    `${kws[0] ? titleCase(kws[0]) + '-first approach' : 'Customer-first approach'}`,
    `${kws[1] ? titleCase(kws[1]) + ' driven design' : 'Performance-driven design'}`,
    `${kws[2] ? titleCase(kws[2]) + ' at scale' : 'Built for scale from day one'}`,
    `Transparent, honest, always improving`,
  ];

  // Mission — distinct from the About story so stage + split sections never clone.
  const missionHeading = pick([`Our Approach`, `Why ${brand}`, `Built Different`, `What Drives Us`, `The ${brand} Difference`], fp + 4);
  const missionBody = `Every detail at ${brand} is intentional. We pair deep ${mainKw} expertise with an obsession for ${secKw}, crafting an experience people come back to. No shortcuts — just work we're proud to put our name on.`;

  // Gallery
  const galleryLabel: Record<string, string> = { portfolio: 'Portfolio', ecommerce: 'Shop', technology: 'Features', food: 'Menu', sports: 'Gallery', photography: 'Portfolio', fashion: 'Collection', agency: 'Work', general: 'Gallery' };
  const galleryHeading = `Our ${(galleryLabel[normIndustry] || galleryLabel.general)}`;

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
    aboutHeading, aboutBody, aboutBullets, missionHeading, missionBody,
    galleryHeading, gallerySlug,
    contactHeading, contactSub, ctaHeading, ctaSub, footerTagline,
    pricingPlans,
    hiddenPrimarySlug:    hiddenCfg.primary.slug,
    hiddenSecondarySlug:  hiddenCfg.secondary.slug,
    hiddenPrimaryCtaLabel:   hiddenCfg.primary.ctaLabel,
    hiddenSecondaryCtaLabel: hiddenCfg.secondary.ctaLabel,
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
// HIDDEN PAGE CONFIG — niche-specific pages bundled in the SPA but NOT
// listed in the nav. Section CTAs route here instead of reusing nav pages.
// ─────────────────────────────────────────────────────────────────

interface HiddenPageCfg {
  primary: { slug: string; ctaLabel: string };
  secondary: { slug: string; ctaLabel: string };
}

const HIDDEN_PAGE_MAP: Record<string, HiddenPageCfg> = {
  food:        { primary: { slug: 'reservations', ctaLabel: 'Reserve a Table'    }, secondary: { slug: 'our-story',    ctaLabel: 'Our Story'        } },
  technology:  { primary: { slug: 'demo',         ctaLabel: 'Book a Demo'        }, secondary: { slug: 'case-studies', ctaLabel: 'Case Studies'     } },
  photography: { primary: { slug: 'services',     ctaLabel: 'View Services'      }, secondary: { slug: 'process',      ctaLabel: 'Our Process'      } },
  portfolio:   { primary: { slug: 'services',     ctaLabel: 'View Services'      }, secondary: { slug: 'process',      ctaLabel: 'Our Process'      } },
  fashion:     { primary: { slug: 'lookbook',     ctaLabel: 'Browse Lookbook'    }, secondary: { slug: 'new-arrivals', ctaLabel: 'New Arrivals'     } },
  ecommerce:   { primary: { slug: 'new-arrivals', ctaLabel: 'New Arrivals'       }, secondary: { slug: 'lookbook',     ctaLabel: 'Browse Lookbook'  } },
  sports:      { primary: { slug: 'programs',     ctaLabel: 'View Programs'      }, secondary: { slug: 'coaches',      ctaLabel: 'Meet Our Coaches' } },
  agency:      { primary: { slug: 'services',     ctaLabel: 'Our Services'       }, secondary: { slug: 'process',      ctaLabel: 'Our Process'      } },
  general:     { primary: { slug: 'services',     ctaLabel: 'Our Services'       }, secondary: { slug: 'team',         ctaLabel: 'Meet the Team'    } },
};

function getHiddenPageConfig(normIndustry: string): HiddenPageCfg {
  return HIDDEN_PAGE_MAP[normIndustry] || HIDDEN_PAGE_MAP.general;
}

// ─────────────────────────────────────────────────────────────────
// DIVERSITY ENGINE INPUT BUILDER — bridges LayoutGraph + PUO to fingerprinter
// ─────────────────────────────────────────────────────────────────

function buildDiversityInput(prompt: string, graph: LayoutGraph, puo: PromptUnderstandingObject): DiversityEngineInput {
  const cp = puo.visual.colorPalette;
  const colorPalette: Record<string, string> = {
    primary: cp.primary,
    secondary: cp.secondary,
    accent: cp.accent,
    background: cp.background,
    surface: cp.surface,
    text: cp.text,
    muted: cp.muted,
    border: cp.border,
    ...cp.derived,
  };

  return {
    prompt,
    layoutGraph: {
      nodes: graph.nodes.map(n => ({
        id: n.id,
        type: n.type,
        variant: n.variant,
        depth: n.depth,
        density: n.density,
        visualWeight: n.visualWeight,
        rhythm: n.rhythm,
        span: n.span,
        height: n.height,
        composition: {
          balance: n.composition.balance,
          tension: n.composition.tension,
          primaryAxis: n.composition.primaryAxis,
          focalPoints: n.composition.focalPoints.map(fp => ({ x: fp.x, y: fp.y })),
          negativeSpaceRatio: n.composition.negativeSpaceRatio,
          alignment: n.composition.alignment,
        },
        grid: {
          type: n.grid.type,
          columns: n.grid.columns,
          gap: n.grid.gap,
          autoFlow: n.grid.autoFlow,
          alignment: n.grid.alignment,
        },
        spacing: {
          before: n.spacing.before,
          after: n.spacing.after,
          internal: n.spacing.internal,
          rhythm: n.spacing.rhythm,
        },
        zIndex: n.zIndex,
        mediaPlacement: n.mediaPlacement,
        ctaPlacement: n.ctaPlacement,
        children: n.children,
      })),
      edges: graph.edges.map(e => ({
        from: e.from,
        to: e.to,
        type: e.type,
        weight: e.weight,
        spacingMultiplier: e.spacingMultiplier,
      })),
      complexity: graph.complexity,
      hasNesting: graph.hasNesting,
      maxDepth: graph.maxDepth,
      nodeCount: graph.nodeCount,
      compositionProfile: graph.compositionProfile,
      flowProfile: {
        direction: graph.flowProfile.direction,
        scrollBehavior: graph.flowProfile.scrollBehavior,
        sectionTransitions: graph.flowProfile.sectionTransitions,
        readingPattern: graph.flowProfile.readingPattern,
      },
      gridSystem: {
        baseUnit: graph.gridSystem.baseUnit,
        maxWidth: graph.gridSystem.maxWidth,
        gutter: graph.gridSystem.gutter,
        columnCount: graph.gridSystem.columnCount,
        behavior: graph.gridSystem.behavior,
      },
      spacingRhythm: {
        pattern: graph.spacingRhythm.pattern,
        base: graph.spacingRhythm.base,
        ratio: graph.spacingRhythm.ratio,
        values: graph.spacingRhythm.values,
      },
      visualHierarchy: {
        levels: graph.visualHierarchy.levels,
        dominantElement: graph.visualHierarchy.dominantElement,
        rhythm: graph.visualHierarchy.rhythm,
        progression: graph.visualHierarchy.progression,
      },
    },
    visualSystem: {
      colorPalette,
      typography: {
        family: {
          heading: puo.visual.typography.family.heading,
          body: puo.visual.typography.family.body,
          mono: puo.visual.typography.family.mono,
        },
        scale: puo.visual.typography.scale,
        weight: puo.visual.typography.weight,
        letterSpacing: {
          heading: puo.visual.typography.letterSpacing.heading,
          body: puo.visual.typography.letterSpacing.body,
        },
      },
      borderRadius: { style: puo.visual.borderRadius.style },
      shadows: { style: puo.visual.shadows.style },
      spacing: {
        unit: puo.visual.spacing.unit,
        section: puo.visual.spacing.section,
        container: puo.visual.spacing.container,
        gutter: puo.visual.spacing.gutter,
        gridGap: puo.visual.spacing.gridGap,
        scale: puo.visual.spacing.scale,
      },
    },
  };
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
  // Shared cursor across every section that renders feature cards, so repeated
  // feature sections (cluster/tile/frame) never show identical cards + headings.
  featSeg: number;
}

// Returns distinct feature cards + heading/eyebrow for the Nth feature-bearing
// section on a page, then advances the shared cursor.
function nextFeatureSegment(ctx: RenderCtx, cols: number): { cards: SiteCopy['features']; eyebrow: string; heading: string } {
  const seg = ctx.featSeg;
  ctx.featSeg += 1;
  const cards = rotate(ctx.copy.features, seg * cols);
  const eyebrow = seg === 0 ? ctx.copy.sectionEyebrow : pick(ALT_CLUSTER_EYEBROWS, ctx.fp + seg);
  const heading = seg === 0 ? ctx.copy.featureHeading : pick(ALT_CLUSTER_HEADINGS, ctx.fp + seg);
  return { cards, eyebrow, heading };
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
          <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-outline">${esc(copy.hiddenPrimaryCtaLabel)} →</a>
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
      <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-outline" style="${isDark||node.depth==='immersed'?'border-color:rgba(255,255,255,.4);color:#fff':''}">${esc(copy.hiddenPrimaryCtaLabel)} →</a>
    </div>
  </div>
</section>`;
}

const ALT_CLUSTER_EYEBROWS = ['What Sets Us Apart', 'The Details', 'Our Capabilities', 'Why It Works', 'Beyond the Basics', 'Made to Last'];
const ALT_CLUSTER_HEADINGS = ['Designed Around You', 'Crafted for Results', 'Everything in One Place', 'Built to Perform', 'The Complete Experience'];

function renderClusterSection(node: LayoutNode, ctx: RenderCtx, idx: number): string {
  const cols = Math.min(Math.max(node.grid.columnsDesktop || 3, 2), 4);
  const gridClass = cols === 2 ? 'g2' : cols === 4 ? 'g4' : 'g3';
  const { cards, eyebrow, heading } = nextFeatureSegment(ctx, cols);

  if (node.variant === 'bento') {
    const cardsHtml = cards.map((f, i) => `
      <div class="card reveal reveal-delay-${i % 3}">
        <div class="card-icon">${f.icon}</div>
        <h3>${esc(f.title)}</h3>
        <p>${esc(f.desc)}</p>
        <a href="${esc(f.href)}" class="card-link">Learn more →</a>
      </div>`).join('');
    return `
<section>
  <div class="wrap">
    <div class="sec-head reveal"><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(heading)}</h2></div>
    <div class="bento bento-2x2">${cardsHtml}</div>
  </div>
</section>`;
  }

  const cardsHtml = cards.slice(0, cols).map((f, i) => `
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
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h2>${esc(heading)}</h2>
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
        <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-primary reveal">${esc(copy.hiddenPrimaryCtaLabel)}</a>
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
      <a href="${esc(copy.hiddenSecondarySlug)}" class="btn btn-outline">${esc(copy.hiddenSecondaryCtaLabel)}</a>
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
        <a href="${esc(copy.hiddenSecondarySlug)}" class="btn btn-outline">${esc(copy.hiddenSecondaryCtaLabel)}</a>
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
      <div class="testimonial-stars">${STARS_5}</div>
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
  const { photos, fp } = ctx;
  const { cards, eyebrow, heading } = nextFeatureSegment(ctx, 3);
  const items = cards.map((f, i) => {
    const photo = photos[(fp + i + 4) % photos.length];
    return `
    <div class="card reveal reveal-delay-${i % 3}">
      <img src="${ph(photo, 600, 300)}" alt="${esc(f.title)}" loading="lazy" style="border-radius:var(--radius-sm);margin-bottom:16px;width:100%;height:180px;object-fit:cover"/>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
      <a href="${esc(f.href)}" class="card-link">Explore →</a>
    </div>`;
  }).join('');

  return `
<section>
  <div class="wrap">
    <div class="sec-head${idx % 2 ? '' : ' centered'} reveal">
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h2>${esc(heading)}</h2>
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
            <h2>${esc(copy.missionHeading)}</h2>
          </div>
          <p class="split-body">${esc(copy.missionBody)}</p>
          <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-primary">${esc(copy.hiddenPrimaryCtaLabel)}</a>
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
  const { cards: feats, heading } = nextFeatureSegment(ctx, 2);
  const cards = feats.slice(0, 2).map((f, i) => `
    <div class="card reveal reveal-delay-${i}">
      <div class="card-icon">${f.icon}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
    </div>`).join('');

  return `
<section>
  <div class="wrap">
    <div class="frame-block reveal">
      <div class="sec-head"><span class="eyebrow">Highlight</span><h2>${esc(heading)}</h2></div>
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

function buildAboutMain(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, fp: number): string {
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
${renderStripSection({ type:'strip', variant:'stats-row' } as LayoutNode, { puo, copy, photos, fp, pageName:'about', navItems, featSeg: 0 })}
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
  return main;
}

function renderAboutPage(puo: PromptUnderstandingObject, graph: LayoutGraph, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const main = buildAboutMain(puo, brand, navItems, copy, fp);
  const nav = buildNav(brand, navItems, 'about');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'About', copy.aboutBody, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function buildGalleryMain(puo: PromptUnderstandingObject, brand: string, copy: SiteCopy, fp: number): string {
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
        <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-outline">${esc(copy.hiddenPrimaryCtaLabel)}</a>
      </div>
    </div>
  </div>
</section>`;
  return main;
}

function renderGalleryPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const main = buildGalleryMain(puo, brand, copy, fp);
  const nav = buildNav(brand, navItems, copy.gallerySlug);
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, copy.galleryHeading, copy.heroSub, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function buildContactMain(brand: string, copy: SiteCopy): string {
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Contact</span>
      <h1 style="font-size:var(--h1-size)">${esc(copy.contactHeading)}</h1>
      <p>${esc(copy.contactSub)}</p>
    </div>
    <div class="contact-form-grid" style="margin-top:clamp(36px,5vw,56px)">
      <div class="contact-info reveal">
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_MAIL}</span><span>hello@${esc(brand.toLowerCase().replace(/[^a-z0-9]/g,''))}.com</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_PHONE}</span><span>+1 (555) 000-0000</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_PIN}</span><span>Available worldwide</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_CLOCK}</span><span>Mon–Fri, 9am–6pm</span></div>
      </div>
      <form class="reveal" onsubmit="event.preventDefault();this.innerHTML='<p style=&quot;padding:24px 0&quot;>Thanks — your message has been received. We&apos;ll be in touch shortly.</p>';">
        <div><label>Full Name</label><input type="text" name="name" placeholder="Your name" required/></div>
        <div><label>Email Address</label><input type="email" name="email" placeholder="you@email.com" required/></div>
        <div><label>Subject</label><input type="text" name="subject" placeholder="How can we help?"/></div>
        <div><label>Message</label><textarea name="message" placeholder="Tell us about your project..." required></textarea></div>
        <button type="submit" class="btn btn-primary" style="align-self:flex-start">Send Message →</button>
      </form>
    </div>
  </div>
</section>`;
}

function renderContactPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const main = buildContactMain(brand, copy);
  const nav = buildNav(brand, navItems, 'contact');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'Contact', copy.contactSub, font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

function buildPricingMain(copy: SiteCopy): string {
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
  return main;
}

function renderPricingPageHtml(puo: PromptUnderstandingObject, brand: string, navItems: Array<{label:string;href:string}>, copy: SiteCopy, css: string, font: FontConfig, base: string, fp: number, year: number): string {
  const main = buildPricingMain(copy);
  if (!main) return '';
  const nav = buildNav(brand, navItems, 'pricing');
  const footer = buildFooter(brand, navItems, copy, year);
  const head = buildHead(brand, 'Pricing', 'Simple, transparent pricing', font, css, base);
  return `${head}<body>${nav}<main>${main}</main>${footer}${PAGE_JS}</body></html>`;
}

// ─────────────────────────────────────────────────────────────────
// HIDDEN PAGE BUILDERS — niche-specific pages bundled in the SPA,
// reachable via section CTAs but not listed in the top nav.
// ─────────────────────────────────────────────────────────────────

const SERVICES_BY_INDUSTRY: Record<string, Array<{name:string; desc:string; price:string}>> = {
  food: [
    { name:'Private Dining',  desc:'Exclusive events and private hire for special occasions.',    price:'From $500'        },
    { name:'Catering',        desc:'Off-site catering for corporate events and celebrations.',    price:'Custom Quote'     },
    { name:"Chef's Table",    desc:'Intimate tasting menu experience with our head chef.',        price:'From $120/person' },
    { name:'Delivery',        desc:'Fresh meals delivered straight to your door.',                price:'From $15'         },
    { name:'Meal Prep',       desc:'Weekly meal prep packages tailored to your lifestyle.',       price:'From $80/week'    },
    { name:'Gift Vouchers',   desc:'The perfect gift for food lovers.',                           price:'From $50'         },
  ],
  photography: [
    { name:'Brand Photography',   desc:'Compelling visuals that tell your brand story.',          price:'From $800'    },
    { name:'Portrait Sessions',   desc:'Studio and on-location portrait photography.',            price:'From $450'    },
    { name:'Event Coverage',      desc:'Full-day event photography and same-week delivery.',     price:'From $1,200'  },
    { name:'Product Photography', desc:'Studio product shots optimised for e-commerce.',         price:'From $600'    },
    { name:'Editorial Shoots',    desc:'Magazine-quality editorial and campaign imagery.',        price:'From $1,500'  },
    { name:'Licensing',           desc:'Extended usage rights for commercial purposes.',          price:'Custom Quote' },
  ],
  portfolio: [
    { name:'Brand Identity',    desc:'Logo, colour system, typography, and brand guidelines.',   price:'From $1,200'  },
    { name:'UI/UX Design',      desc:'User-centred interface design for web and mobile.',         price:'From $2,500'  },
    { name:'Web Design',        desc:'Custom website design with full Figma handoff.',            price:'From $1,800'  },
    { name:'Motion Graphics',   desc:'Animated assets for social, ads, and presentations.',      price:'From $800'    },
    { name:'Print & Packaging', desc:'Packaging design, brochures, and print collateral.',       price:'From $600'    },
    { name:'Consultation',      desc:'90-minute strategy and brand audit session.',               price:'$250/session' },
  ],
  technology: [
    { name:'Starter Plan',    desc:'Core features for individuals and small teams.',              price:'Free'         },
    { name:'Growth Plan',     desc:'Advanced tools and priority support for scaling teams.',      price:'$49/month'    },
    { name:'Enterprise',      desc:'Custom SLA, dedicated support, and on-premise options.',      price:'Custom'       },
    { name:'API Access',      desc:'Full API access with developer documentation.',               price:'From $99/month'},
    { name:'Onboarding',      desc:'Guided setup with a dedicated success manager.',              price:'Included'     },
    { name:'Training',        desc:'Team training workshops and certification programme.',        price:'From $499'    },
  ],
  sports: [
    { name:'Personal Training',  desc:'One-on-one coaching sessions tailored to your goals.',    price:'From $80/session' },
    { name:'Group Classes',      desc:'High-energy group sessions for all fitness levels.',      price:'From $25/class'   },
    { name:'Nutrition Coaching', desc:'Personalised meal plans and macro guidance.',             price:'From $150/month'  },
    { name:'Online Programme',   desc:'Structured training plans with video library access.',    price:'From $30/month'   },
    { name:'Competition Prep',   desc:'Specialised prep for competitive athletes.',              price:'Custom Quote'     },
    { name:'Assessments',        desc:'Full fitness assessment and goal-setting session.',       price:'From $60'         },
  ],
  agency: [
    { name:'Brand Strategy',     desc:'Research-backed positioning and messaging frameworks.',   price:'From $3,500'      },
    { name:'Creative Direction', desc:'Campaign concepting, art direction, and visual identity.',price:'From $2,500'      },
    { name:'Paid Media',         desc:'Performance advertising across Google, Meta, and TikTok.',price:'From $1,500/month'},
    { name:'SEO & Content',      desc:'Organic growth through content strategy and technical SEO.',price:'From $1,200/month'},
    { name:'Web Development',    desc:'Custom website builds on modern tech stacks.',            price:'From $5,000'      },
    { name:'Analytics & CRO',    desc:'Data-driven optimisation to maximise conversion rates.', price:'From $1,000/month'},
  ],
  fashion: [
    { name:'Custom Tailoring',  desc:'Made-to-measure garments crafted to your exact fit.',     price:'From $350'        },
    { name:'Styling Sessions',  desc:'Personal shopping and wardrobe curation service.',         price:'From $200'        },
    { name:'Wholesale',         desc:'Bulk ordering for retailers and boutiques.',               price:'Min. order $500'  },
    { name:'Alterations',       desc:'Expert alterations and garment repairs.',                  price:'From $30'         },
    { name:'Gift Cards',        desc:'Treat someone to their perfect wardrobe.',                 price:'From $50'         },
    { name:'Memberships',       desc:'Early access to drops, exclusive discounts, and events.',  price:'From $15/month'   },
  ],
  ecommerce: [
    { name:'Express Shipping',  desc:'Next-day delivery on all in-stock items.',                price:'From $9.99'       },
    { name:'Gift Wrapping',     desc:'Premium gift wrapping with personalised message.',        price:'$5'               },
    { name:'Subscriptions',     desc:'Save 15% with monthly subscription orders.',              price:'From $25/month'   },
    { name:'Bulk Orders',       desc:'Volume discounts for orders over 20 units.',              price:'Custom Quote'     },
    { name:'Returns',           desc:'30-day hassle-free returns and exchanges.',               price:'Free'             },
    { name:'Loyalty Programme', desc:'Earn points on every purchase and redeem for rewards.',   price:'Free to join'     },
  ],
  general: [
    { name:'Consultation',    desc:'Initial discovery session to understand your needs.',        price:'Free'             },
    { name:'Core Package',    desc:'Our most popular all-inclusive service bundle.',             price:'From $500'        },
    { name:'Premium Package', desc:'Full-service solution with priority support.',               price:'From $1,500'      },
    { name:'Enterprise',      desc:'Custom enterprise solutions at scale.',                      price:'Custom Quote'     },
    { name:'Maintenance',     desc:'Ongoing support and account management.',                    price:'From $200/month'  },
    { name:'Training',        desc:'Workshops and onboarding for your team.',                    price:'From $300'        },
  ],
};

const PROCESS_STEPS_BY_INDUSTRY: Record<string, Array<{title:string; desc:string}>> = {
  photography: [
    { title:'Discovery Call',   desc:'We discuss your vision, style preferences, and deliverables in detail.'          },
    { title:'Creative Brief',   desc:'A detailed shot list, mood board, and location scouting are completed.'          },
    { title:'The Shoot',        desc:'Professional photography session with full art direction and lighting setup.'     },
    { title:'Delivery',         desc:'Curated, edited gallery delivered via private link within five business days.'    },
  ],
  portfolio: [
    { title:'Kickoff',          desc:'We align on project goals, audience, and creative direction.'                    },
    { title:'Concepts',         desc:'Initial design concepts presented with rationale and direction options.'          },
    { title:'Refinement',       desc:'Iterative revisions based on feedback until the design is exactly right.'        },
    { title:'Handoff',          desc:'Final assets delivered with documentation, style guides, and source files.'      },
  ],
  agency: [
    { title:'Strategy',         desc:'Deep-dive audit of your brand, competitors, and target audience.'               },
    { title:'Concept',          desc:'Creative concepts developed to resonate with your specific market.'              },
    { title:'Execution',        desc:'Full campaign production across all agreed channels and touchpoints.'            },
    { title:'Results',          desc:'Detailed performance reports with actionable insights and next steps.'           },
  ],
  sports: [
    { title:'Assessment',       desc:'Comprehensive fitness evaluation to establish your current baseline.'            },
    { title:'Programme Design', desc:'A personalised training plan built around your goals and schedule.'              },
    { title:'Coaching',         desc:'Expert-led sessions with real-time form corrections and motivation.'             },
    { title:'Progress Review',  desc:'Regular check-ins to track progress and adjust the programme accordingly.'      },
  ],
  general: [
    { title:'Discovery',        desc:'We start by fully understanding your goals, challenges, and opportunities.'      },
    { title:'Strategy',         desc:'A tailored approach is developed to address your specific needs.'                },
    { title:'Execution',        desc:'We deliver with precision, on time and within scope.'                            },
    { title:'Results',          desc:'Transparent reporting so you can see the full impact of our work.'               },
  ],
};

function buildServicesMain(normIndustry: string, brand: string, copy: SiteCopy, fp: number): string {
  const services = SERVICES_BY_INDUSTRY[normIndustry] || SERVICES_BY_INDUSTRY.general;
  const cardsHtml = services.map((s, i) => `
    <div class="card reveal reveal-delay-${i % 3}">
      <div class="card-icon">${ICON_SVGS[(fp + i) % ICON_SVGS.length]}</div>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.desc)}</p>
      <p style="margin-top:12px;font-weight:600;color:var(--primary);font-size:var(--small-size)">${esc(s.price)}</p>
      <a href="contact" class="card-link">Enquire →</a>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">What We Offer</span>
      <h1 style="font-size:var(--h1-size)">Our Services</h1>
      <p>Everything you need, tailored to your goals.</p>
    </div>
    <div class="g3" style="margin-top:clamp(36px,5vw,56px)">${cardsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Ready to Get Started?</h2>
      <p class="reveal">Talk to our team about the right package for you.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Get in Touch</a>
        <a href="about" class="btn btn-outline">About Us</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildProcessMain(normIndustry: string, _brand: string, _copy: SiteCopy): string {
  const steps = PROCESS_STEPS_BY_INDUSTRY[normIndustry] || PROCESS_STEPS_BY_INDUSTRY.general;
  const stepsHtml = steps.map((s, i) => `
    <div class="reveal" style="display:flex;gap:24px;align-items:flex-start;padding:clamp(20px,3vw,32px) 0;border-bottom:1px solid var(--bdr)">
      <div style="min-width:56px;height:56px;border-radius:var(--radius-sm);background:var(--grad);color:#fff;display:grid;place-items:center;font-family:var(--display);font-size:1.35rem;font-weight:700;flex-shrink:0">${i + 1}</div>
      <div>
        <h3 style="margin-bottom:6px">${esc(s.title)}</h3>
        <p style="color:var(--muted);font-size:var(--small-size);line-height:1.65">${esc(s.desc)}</p>
      </div>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">How We Work</span>
      <h1 style="font-size:var(--h1-size)">Our Process</h1>
      <p>A clear, proven approach that delivers results every time.</p>
    </div>
    <div style="max-width:720px;margin:clamp(36px,5vw,56px) auto 0">${stepsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Start Your Project</h2>
      <p class="reveal">Let's walk through the process together.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Get in Touch</a>
        <a href="about" class="btn btn-outline">About Us</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildReservationsMain(brand: string, copy: SiteCopy): string {
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="eyebrow">Book a Table</span>
      <h1 style="font-size:var(--h1-size)">Make a Reservation</h1>
      <p>Reserve your table at ${esc(brand)}. We look forward to welcoming you.</p>
    </div>
    <div class="contact-form-grid" style="margin-top:clamp(36px,5vw,56px)">
      <div class="contact-info reveal">
        <h3 style="margin-bottom:14px">Plan Your Visit</h3>
        <p style="color:var(--muted);margin-bottom:20px">Walk-ins are welcome, but reservations guarantee your preferred time and table.</p>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_CLOCK}</span><span>Mon–Thu 11am–10pm<br>Fri–Sat 11am–11pm<br>Sun 10am–9pm</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_PIN}</span><span>123 Main Street, City</span></div>
        <div class="contact-detail"><span class="contact-detail-icon">${ICON_PHONE}</span><span>+1 (555) 000-0000</span></div>
      </div>
      <form class="reveal" onsubmit="event.preventDefault();this.innerHTML='<p style=&quot;padding:24px 0;font-size:1.1rem&quot;>Reservation confirmed! We&apos;ll send a confirmation to your email shortly.</p>';">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div><label>Date</label><input type="date" name="date" required/></div>
          <div><label>Time</label><select name="time"><option>6:00 PM</option><option>6:30 PM</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option><option>8:30 PM</option></select></div>
        </div>
        <div><label>Party Size</label><select name="size"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7–10</option><option>10+</option></select></div>
        <div><label>Full Name</label><input type="text" name="name" placeholder="Your name" required/></div>
        <div><label>Email Address</label><input type="email" name="email" placeholder="you@email.com" required/></div>
        <div><label>Phone Number</label><input type="tel" name="phone" placeholder="+1 (555) 000-0000"/></div>
        <div><label>Special Requests</label><textarea name="requests" placeholder="Dietary requirements, celebrations, accessibility needs..."></textarea></div>
        <button type="submit" class="btn btn-primary" style="align-self:flex-start">Confirm Reservation →</button>
      </form>
    </div>
  </div>
</section>`;
}

function buildOurStoryMain(brand: string, copy: SiteCopy, puo: PromptUnderstandingObject, fp: number): string {
  const photos = getPhotos(puo, fp);
  const photo = photos[fp % photos.length];
  const bullets = copy.aboutBullets.map(b => `<li>${esc(b)}</li>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Our Heritage</span>
      <h1 style="font-size:var(--h1-size)">The Story Behind ${esc(brand)}</h1>
    </div>
  </div>
</section>
<section style="padding-top:0">
  <div class="wrap">
    <div class="split-section">
      <div class="split-text">
        <div class="sec-head reveal"><h2>Where It All Began</h2></div>
        <p class="split-body reveal">${esc(copy.aboutBody)}</p>
        <ul class="split-list reveal">${bullets}</ul>
        <a href="reservations" class="btn btn-primary reveal">Reserve a Table</a>
      </div>
      <div class="split-media reveal">
        <img src="${ph(photo, 800, 1000)}" alt="The story of ${esc(brand)}" loading="lazy"/>
      </div>
    </div>
  </div>
</section>
<section>
  <div class="wrap">
    <div class="sec-head centered reveal"><span class="eyebrow">Our Values</span><h2>What We Stand For</h2></div>
    <div class="g3">
      <div class="card reveal"><div class="card-icon">${ICON_SVGS[2]}</div><h3>Quality</h3><p style="color:var(--muted);font-size:var(--small-size)">We never compromise on the quality of our ingredients or our craft.</p></div>
      <div class="card reveal reveal-delay-1"><div class="card-icon">${ICON_SVGS[4]}</div><h3>Community</h3><p style="color:var(--muted);font-size:var(--small-size)">${esc(brand)} was built for the community and continues to thrive because of it.</p></div>
      <div class="card reveal reveal-delay-2"><div class="card-icon">${ICON_SVGS[7]}</div><h3>Passion</h3><p style="color:var(--muted);font-size:var(--small-size)">Every dish, every service, every detail — crafted with genuine passion.</p></div>
    </div>
  </div>
</section>`;
}

function buildDemoMain(brand: string, copy: SiteCopy): string {
  const benefits = [
    `See ${copy.features[0]?.title || 'core features'} live with your actual data`,
    'Get answers to your specific technical questions in real time',
    'Personalised walkthrough based on your team\'s exact use case',
    'Leave with a custom implementation roadmap',
  ];
  const benefitsHtml = benefits.map(b => `<li style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px"><span style="color:var(--primary);font-weight:700;margin-top:1px">→</span><span style="color:var(--muted);font-size:var(--small-size)">${esc(b)}</span></li>`).join('');
  const statsHtml = copy.stats.slice(0, 3).map(s => `<div style="text-align:center;padding:16px;flex:1"><div style="font-family:var(--display);font-size:1.8rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">${esc(s.number)}</div><div style="font-size:var(--caption-size);color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${esc(s.label)}</div></div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">See It Live</span>
      <h1 style="font-size:var(--h1-size)">Book a Personalised Demo</h1>
      <p>A 30-minute session tailored to your team's specific use case.</p>
    </div>
    <div class="contact-form-grid" style="margin-top:clamp(36px,5vw,56px)">
      <div class="reveal">
        <h3 style="margin-bottom:14px">What to Expect</h3>
        <ul style="list-style:none;margin-bottom:28px">${benefitsHtml}</ul>
        <div style="display:flex;border:1px solid var(--bdr);border-radius:var(--radius);overflow:hidden">${statsHtml}</div>
      </div>
      <form class="reveal" onsubmit="event.preventDefault();this.innerHTML='<p style=&quot;padding:24px 0;font-size:1.1rem&quot;>Demo request received! A specialist will confirm your slot within one business day.</p>';">
        <div><label>Work Email</label><input type="email" name="email" placeholder="you@company.com" required/></div>
        <div><label>Full Name</label><input type="text" name="name" placeholder="Your name" required/></div>
        <div><label>Company</label><input type="text" name="company" placeholder="Company name"/></div>
        <div><label>Team Size</label><select name="size"><option>Just me</option><option>2–10</option><option>11–50</option><option>51–200</option><option>200+</option></select></div>
        <div><label>Primary Use Case</label><textarea name="usecase" placeholder="What would you like to solve with ${esc(brand)}?"></textarea></div>
        <button type="submit" class="btn btn-primary" style="align-self:flex-start">Request Demo →</button>
      </form>
    </div>
  </div>
</section>`;
}

function buildCaseStudiesMain(brand: string, copy: SiteCopy, _fp: number): string {
  const cases = [
    { company:'ScaleUp Inc.',  industry:'SaaS',       challenge:`Manually managing ${copy.features[0]?.title || 'workflows'}`,                result:'Reduced time by 70%',    metric:'70%', metricLabel:'Time Saved'  },
    { company:'BuildFast',     industry:'Engineering', challenge:`Poor visibility into ${copy.features[1]?.title || 'performance metrics'}`,   result:'3× improvement in KPIs', metric:'3×',  metricLabel:'KPI Growth'  },
    { company:'DataFlow Co.',  industry:'Analytics',  challenge:`Scaling ${copy.features[2]?.title || 'operations'} without headcount`,        result:'2× output, same team',   metric:'2×',  metricLabel:'Output'      },
  ];
  const cardsHtml = cases.map((c, i) => `
    <div class="card reveal reveal-delay-${i % 3}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <h3 style="margin-bottom:4px">${esc(c.company)}</h3>
          <span style="font-size:var(--caption-size);color:var(--muted);text-transform:uppercase;letter-spacing:.06em">${esc(c.industry)}</span>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--display);font-size:1.8rem;font-weight:700;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">${esc(c.metric)}</div>
          <div style="font-size:var(--caption-size);color:var(--muted)">${esc(c.metricLabel)}</div>
        </div>
      </div>
      <p style="color:var(--muted);font-size:var(--small-size);margin-bottom:8px"><strong>Challenge:</strong> ${esc(c.challenge)}.</p>
      <p style="color:var(--muted);font-size:var(--small-size)"><strong>Result:</strong> ${esc(c.result)}.</p>
      <a href="demo" class="card-link" style="margin-top:16px">Get similar results →</a>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Customer Success</span>
      <h1 style="font-size:var(--h1-size)">Real Results from Real Clients</h1>
      <p>See how teams like yours have transformed with ${esc(brand)}.</p>
    </div>
    <div class="g3" style="margin-top:clamp(36px,5vw,56px)">${cardsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Ready to Write Your Success Story?</h2>
      <p class="reveal">Book a personalised demo and see ${esc(brand)} in action.</p>
      <div class="signal-ctas reveal">
        <a href="demo" class="btn btn-primary">Book a Demo</a>
        <a href="contact" class="btn btn-outline">Talk to Sales</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildProgramsMain(brand: string, _copy: SiteCopy, _fp: number): string {
  const programs = [
    { name:'Foundation', level:'Beginner',     sessions:'3× per week', duration:'8 weeks',  focus:'Form, mobility, and base conditioning',                     price:'$180/month' },
    { name:'Performance', level:'Intermediate',sessions:'4× per week', duration:'12 weeks', focus:'Strength, endurance, and sport-specific training',          price:'$240/month' },
    { name:'Elite',       level:'Advanced',    sessions:'5–6× per week',duration:'Ongoing', focus:'Competition prep and peak performance optimisation',        price:'$320/month' },
  ];
  const cardsHtml = programs.map((p, i) => `
    <div class="price-card${i === 1 ? ' featured' : ''} reveal reveal-delay-${i}">
      ${i === 1 ? '<div class="price-badge">Most Popular</div>' : ''}
      <div class="price-name">${esc(p.name)}</div>
      <div class="price-desc">${esc(p.level)} Level</div>
      <div class="price-amount">${esc(p.price)}</div>
      <div class="price-period">${esc(p.sessions)}</div>
      <ul class="price-features">
        <li><span class="price-check">✓</span> ${esc(p.duration)} programme</li>
        <li><span class="price-check">✓</span> ${esc(p.focus)}</li>
        <li><span class="price-check">✓</span> Progress tracking</li>
        <li><span class="price-check">✓</span> Nutrition guidance</li>
        ${i >= 1 ? '<li><span class="price-check">✓</span> 1-on-1 coaching sessions</li>' : ''}
        ${i >= 2 ? '<li><span class="price-check">✓</span> Competition prep support</li>' : ''}
      </ul>
      <a href="contact" class="btn ${i === 1 ? 'btn-primary' : 'btn-outline'}" style="width:100%;justify-content:center">Enrol Now</a>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Training</span>
      <h1 style="font-size:var(--h1-size)">Our Programmes</h1>
      <p>Structured training built for every level, with real results.</p>
    </div>
    <div class="price-grid" style="margin-top:clamp(36px,5vw,56px)">${cardsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Not Sure Which Programme to Choose?</h2>
      <p class="reveal">Book a free assessment and we'll recommend the right fit.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Book Free Assessment</a>
        <a href="coaches" class="btn btn-outline">Meet Our Coaches</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildCoachesMain(brand: string, _copy: SiteCopy, puo: PromptUnderstandingObject, fp: number): string {
  const photos = getPhotos(puo, fp);
  const coaches = [
    { name:'Alex Chen',     specialty:'Strength & Conditioning', exp:'12 years', cert:'CSCS, NSCA'              },
    { name:'Jordan Rivera', specialty:'Endurance & Recovery',    exp:'8 years',  cert:'NASM-CPT, Precision'     },
    { name:'Sam Torres',    specialty:'Sport-Specific Training', exp:'10 years', cert:'ACSM, USA Weightlifting'  },
    { name:'Morgan Lee',    specialty:'Nutrition & Performance', exp:'6 years',  cert:'RD, CISSN'               },
  ];
  const cardsHtml = coaches.map((c, i) => `
    <div class="card reveal reveal-delay-${i % 3}" style="text-align:center">
      <img src="${ph(photos[(fp + i + 3) % photos.length], 400, 400)}" alt="${esc(c.name)}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:16px"/>
      <h3 style="margin-bottom:4px">${esc(c.name)}</h3>
      <p style="color:var(--primary);font-size:var(--small-size);font-weight:500;margin-bottom:8px">${esc(c.specialty)}</p>
      <p style="color:var(--muted);font-size:var(--caption-size);margin-bottom:4px">${esc(c.exp)} experience</p>
      <p style="color:var(--muted);font-size:var(--caption-size)">${esc(c.cert)}</p>
      <a href="contact" class="card-link" style="justify-content:center;margin-top:12px">Train with ${esc(c.name.split(' ')[0])} →</a>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">The Team</span>
      <h1 style="font-size:var(--h1-size)">Meet Our Coaches</h1>
      <p>World-class coaches dedicated to your success.</p>
    </div>
    <div class="g4" style="margin-top:clamp(36px,5vw,56px)">${cardsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Ready to Start Training?</h2>
      <p class="reveal">Choose a coach and book your first session today.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Book a Session</a>
        <a href="programs" class="btn btn-outline">View Programmes</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildLookbookMain(puo: PromptUnderstandingObject, brand: string, copy: SiteCopy, fp: number): string {
  const photos = getPhotos(puo, fp);
  const season = ['SS25', 'AW24', 'SS24', 'Resort 25'][fp % 4];
  const items = Array.from({ length: 9 }, (_, i) => {
    const hs = [380, 500, 340, 460, 420, 360, 440, 390, 480];
    return `<div class="gallery-item reveal">
      <img src="${ph(photos[(fp + i + 1) % photos.length], 500, hs[i])}" alt="${esc(brand)} ${season} Look ${i+1}" loading="lazy"/>
    </div>`;
  }).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">${esc(season)} Collection</span>
      <h1 style="font-size:var(--h1-size)">${esc(brand)} Lookbook</h1>
      <p>The season's defining looks — curated for the bold.</p>
    </div>
    <div class="gallery-grid masonry" style="grid-auto-rows:220px;margin-top:clamp(36px,5vw,56px)">${items}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Shop the Collection</h2>
      <p class="reveal">Every look available now. Limited quantities.</p>
      <div class="signal-ctas reveal">
        <a href="${esc(copy.gallerySlug)}" class="btn btn-primary">Shop New Arrivals</a>
        <a href="contact" class="btn btn-outline">Personal Styling</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildNewArrivalsMain(puo: PromptUnderstandingObject, brand: string, copy: SiteCopy, fp: number): string {
  const photos = getPhotos(puo, fp);
  const kws = getContentWords(puo);
  const productNames = [
    `${titleCase(kws[0] || 'Classic')} Essential`,
    `${titleCase(kws[1] || 'Premium')} Series`,
    `${titleCase(kws[0] || 'Signature')} Drop`,
    `${titleCase(kws[2] || 'Limited')} Edition`,
    `${titleCase(kws[1] || 'Core')} Collection`,
    `${titleCase(kws[0] || 'Essential')} Pack`,
  ];
  const prices = ['$49', '$89', '$129', '$69', '$99', '$79'];
  const badges = ['New', 'Featured', 'Limited', 'Bestseller', 'Sale', 'New'];
  const productsHtml = productNames.map((name, i) => `
    <div class="card reveal reveal-delay-${i % 3}">
      <div style="position:relative;margin-bottom:14px">
        <img src="${ph(photos[(fp + i + 2) % photos.length], 400, 450)}" alt="${esc(name)}" loading="lazy" style="width:100%;height:220px;object-fit:cover;border-radius:var(--radius-sm)"/>
        <span style="position:absolute;top:10px;left:10px;background:var(--grad);color:#fff;padding:3px 10px;border-radius:9999px;font-size:.72rem;font-weight:600">${esc(badges[i])}</span>
      </div>
      <h3 style="font-size:var(--small-size);font-weight:600;margin-bottom:4px">${esc(name)}</h3>
      <p style="font-family:var(--display);font-size:1.1rem;font-weight:700;color:var(--primary)">${esc(prices[i])}</p>
      <a href="contact" class="card-link">Add to Bag →</a>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head reveal" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px">
      <div>
        <span class="eyebrow">Just Landed</span>
        <h1 style="font-size:var(--h1-size);margin-bottom:0">New Arrivals</h1>
      </div>
      <a href="${esc(copy.gallerySlug)}" class="btn btn-outline">View All →</a>
    </div>
    <div class="g3" style="margin-top:clamp(36px,5vw,56px)">${productsHtml}</div>
  </div>
</section>`;
}

function buildTeamMain(brand: string, copy: SiteCopy, puo: PromptUnderstandingObject, fp: number): string {
  const photos = getPhotos(puo, fp);
  const kws = getContentWords(puo);
  const members = [
    { name:'Alex Morgan',  role:'Founder & CEO',                           specialty:'Strategy & Vision'                              },
    { name:'Jordan Kim',   role:`Head of ${kws[0] ? titleCase(kws[0]) : 'Product'}`, specialty:`${kws[0] ? titleCase(kws[0]) : 'Product'} Lead`  },
    { name:'Sam Rivera',   role:`${kws[1] ? titleCase(kws[1]) : 'Growth'} Director`, specialty:`${kws[1] ? titleCase(kws[1]) : 'Growth'} & Scale`},
    { name:'Morgan Chen',  role:'Client Success Lead',                     specialty:'Partnerships & Support'                         },
  ];
  const cardsHtml = members.map((m, i) => `
    <div class="card reveal reveal-delay-${i % 3}" style="text-align:center">
      <img src="${ph(photos[(fp + i + 4) % photos.length], 400, 400)}" alt="${esc(m.name)}" loading="lazy" style="width:100%;height:200px;object-fit:cover;border-radius:var(--radius);margin-bottom:16px"/>
      <h3 style="margin-bottom:4px">${esc(m.name)}</h3>
      <p style="color:var(--primary);font-size:var(--small-size);font-weight:500;margin-bottom:6px">${esc(m.role)}</p>
      <p style="color:var(--muted);font-size:var(--caption-size)">${esc(m.specialty)}</p>
    </div>`).join('');
  return `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">Our People</span>
      <h1 style="font-size:var(--h1-size)">Meet the Team</h1>
      <p>The people behind ${esc(brand)}, dedicated to your success.</p>
    </div>
    <div class="g4" style="margin-top:clamp(36px,5vw,56px)">${cardsHtml}</div>
  </div>
</section>
<section class="signal-section">
  <div class="wrap">
    <div class="signal-inner">
      <h2 class="reveal">Join Our Team</h2>
      <p class="reveal">We&apos;re always looking for talented people to join ${esc(brand)}.</p>
      <div class="signal-ctas reveal">
        <a href="contact" class="btn btn-primary">Get in Touch</a>
        <a href="about" class="btn btn-outline">About Us</a>
      </div>
    </div>
  </div>
</section>`;
}

function buildHiddenPrimaryPage(slug: string, normIndustry: string, brand: string, copy: SiteCopy, puo: PromptUnderstandingObject, fp: number): string {
  switch (slug) {
    case 'reservations': return buildReservationsMain(brand, copy);
    case 'demo':         return buildDemoMain(brand, copy);
    case 'services':     return buildServicesMain(normIndustry, brand, copy, fp);
    case 'programs':     return buildProgramsMain(brand, copy, fp);
    case 'lookbook':     return buildLookbookMain(puo, brand, copy, fp);
    case 'new-arrivals': return buildNewArrivalsMain(puo, brand, copy, fp);
    default:             return buildServicesMain(normIndustry, brand, copy, fp);
  }
}

function buildHiddenSecondaryPage(slug: string, normIndustry: string, brand: string, copy: SiteCopy, puo: PromptUnderstandingObject, fp: number): string {
  switch (slug) {
    case 'our-story':    return buildOurStoryMain(brand, copy, puo, fp);
    case 'case-studies': return buildCaseStudiesMain(brand, copy, fp);
    case 'process':      return buildProcessMain(normIndustry, brand, copy);
    case 'coaches':      return buildCoachesMain(brand, copy, puo, fp);
    case 'new-arrivals': return buildNewArrivalsMain(puo, brand, copy, fp);
    case 'lookbook':     return buildLookbookMain(puo, brand, copy, fp);
    case 'team':         return buildTeamMain(brand, copy, puo, fp);
    default:             return buildTeamMain(brand, copy, puo, fp);
  }
}

// ─────────────────────────────────────────────────────────────────
// HOMEPAGE BUILDER — driven by LayoutGraph nodes
// ─────────────────────────────────────────────────────────────────

function buildHomeMain(
  graph: LayoutGraph,
  puo: PromptUnderstandingObject,
  brand: string,
  navItems: Array<{ label: string; href: string }>,
  copy: SiteCopy,
  fp: number
): string {
  const photos = getPhotos(puo, fp);
  const ctx: RenderCtx = { puo, copy, photos, fp, pageName: 'home', navItems, featSeg: 0 };
  const counters: Record<string, number> = {};
  return graph.nodes.map(node => renderNode(node, ctx, counters)).filter(Boolean).join('\n');
}

// ─────────────────────────────────────────────────────────────────
// SINGLE-DOCUMENT SPA — all pages in one self-contained document with
// hash-based client routing. Works in preview, published, and srcDoc
// iframes alike — no server round-trip, no publish dependency, no base href.
// Every button switches to a genuinely different page instantly.
// ─────────────────────────────────────────────────────────────────

const SPA_ROUTER_JS = `<script>
(function(){
  var hdr=document.getElementById('hdr');
  if(hdr){window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>40);},{passive:true});}
  var burger=document.getElementById('burger');
  var mnav=document.getElementById('mnav');
  if(burger&&mnav){burger.addEventListener('click',function(){mnav.classList.toggle('open');});}

  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');}});
  },{threshold:0.08,rootMargin:'0px 0px -40px 0px'});

  var routes={};
  document.querySelectorAll('.route').forEach(function(el){routes[el.getAttribute('data-route')]=el;});

  function norm(href){
    if(href==null) return null;
    href=String(href).trim();
    if(/^(https?:|mailto:|tel:|javascript:)/i.test(href)) return null;
    href=href.replace(/^#/,'').replace(/^\\.\\//,'').replace(/^\\//,'').replace(/\\/$/,'');
    if(href===''||href==='.'||href==='index'||href==='index.html'||href==='home') return 'home';
    return href;
  }
  function setActive(route){
    document.querySelectorAll('.nav-links a,.mobile-nav a').forEach(function(a){
      a.classList.toggle('active', norm(a.getAttribute('href'))===route);
    });
  }
  function show(route){
    if(!routes[route]) route='home';
    Object.keys(routes).forEach(function(k){
      var on=k===route;
      routes[k].style.display=on?'block':'none';
      if(on) routes[k].querySelectorAll('.reveal').forEach(function(el){el.classList.add('in');});
    });
    setActive(route);
    if(mnav) mnav.classList.remove('open');
    window.scrollTo(0,0);
  }

  document.addEventListener('click',function(e){
    var a=e.target&&e.target.closest?e.target.closest('a'):null; if(!a) return;
    var r=norm(a.getAttribute('href')); if(r===null) return;
    if(routes[r]||r==='home'){ e.preventDefault(); var h=(r==='home'?'':'#'+r); if(location.hash!==h){location.hash=h;} else {show(r);} }
  });
  window.addEventListener('hashchange',function(){ show(norm(location.hash)||'home'); });

  // Initial render: animate the first visible route via the observer.
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
  var initial=norm(location.hash)||'home';
  if(initial!=='home'){ show(initial); } else { setActive('home'); }
})();
</script>`;

function buildSpaDocument(
  brand: string,
  navItems: Array<{ label: string; href: string }>,
  copy: SiteCopy,
  css: string,
  font: FontConfig,
  year: number,
  routes: Array<{ key: string; main: string }>
): string {
  const nav = buildNav(brand, navItems, '.');
  const footer = buildFooter(brand, navItems, copy, year);
  // No <base href> — navigation is fully client-side via hash routing.
  const head = buildHead(brand, 'Home', copy.heroSub, font, css, '');
  const routeStyle = `<style>.route{display:none}.route:first-child{display:block}</style>`;
  const routeDivs = routes
    .map((r, i) => `<div class="route" data-route="${esc(r.key)}" style="display:${i === 0 ? 'block' : 'none'}">${r.main}</div>`)
    .join('\n');
  return `${head}${routeStyle}<body>${nav}<main id="app">${routeDivs}</main>${footer}${SPA_ROUTER_JS}</body></html>`;
}

// ─────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────

export function renderMultiPageSite(
  context: ISharedContext,
  brandName: string,
  subdomain = '',
  understanding?: PromptUnderstandingObject,
): MultiPageOutput {
  const prompt = context.input.userPrompt;
  const brand  = brandName || 'Brand';
  const year   = new Date().getFullYear();
  const base   = subdomain ? `/sites/${subdomain}/` : '';

  // 1. Use the canonical analyzer-resolved understanding when supplied, so the
  //    render matches the concept the user was shown. Only re-parse as a
  //    fallback (e.g. direct/legacy callers that pass no understanding).
  const puo = understanding ?? (() => {
    const parseResult = parsePrompt(prompt);
    return parseResult.success ? parseResult.object : parsePrompt('modern professional website').object;
  })();

  const fp = fnv(brand + '|' + prompt);

  // 2. Generate root layout graph — unique section ordering per prompt
  const rootResult = composeLayout(buildComposerInput(puo));
  let rootGraph = rootResult.success ? rootResult.graph : composeLayout(buildComposerInput(puo)).graph;

  // 2b. Diversity check — mutate if too similar to recent generations
  const divInput = buildDiversityInput(prompt, rootGraph, puo);
  const divResult = checkDiversity(divInput);
  if (!divResult.isDiverse && divResult.report.exceedsThreshold) {
    // Re-compose with mutation salt to produce a structurally different layout
    const mutationSalt = ` [m${divResult.report.recommendedMutationStrategies.slice(0, 2).join('-')}]`;
    const saltedPuo: PromptUnderstandingObject = {
      ...puo,
      originalPrompt: puo.originalPrompt + mutationSalt,
    };
    const remixed = composeLayout(buildComposerInput(saltedPuo));
    if (remixed.success) rootGraph = remixed.graph;
  }
  // Register this generation in diversity history
  registerGeneration(prompt, divResult.fingerprint);

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

  // 6. Generate each page's main content (own graph / context per page)
  const homeMain    = buildHomeMain(rootGraph, puo, brand, navItems, copy, fp);
  const aboutMain   = buildAboutMain(puo, brand, navItems, copy, fp + 1);
  const galleryMain = buildGalleryMain(puo, brand, copy, fp + 2);
  const contactMain = buildContactMain(brand, copy);
  const pricingMain = copy.pricingPlans ? buildPricingMain(copy) : '';

  // 7. Primary document = self-contained SPA (all pages, client-side routing).
  //    This is what gets stored in htmlContent and served everywhere, so every
  //    button navigates to a real different page with no server/publish dependency.
  const routes: Array<{ key: string; main: string }> = [
    { key: 'home', main: homeMain },
    { key: 'about', main: aboutMain },
    { key: gallerySlug, main: galleryMain },
    { key: 'contact', main: contactMain },
  ];
  if (pricingMain) routes.splice(3, 0, { key: 'pricing', main: pricingMain });
  // Hidden pages — bundled in the SPA but NOT in navItems, so they're unreachable
  // from the nav but reachable via section CTAs.
  const normIndustry2 = normalizeIndustry(puo.inferredIndustry);
  const hiddenPrimaryMain  = buildHiddenPrimaryPage(copy.hiddenPrimarySlug, normIndustry2, brand, copy, puo, fp + 5);
  const hiddenSecondaryMain = buildHiddenSecondaryPage(copy.hiddenSecondarySlug, normIndustry2, brand, copy, puo, fp + 6);
  routes.push({ key: copy.hiddenPrimarySlug,  main: hiddenPrimaryMain  });
  routes.push({ key: copy.hiddenSecondarySlug, main: hiddenSecondaryMain });
  const spaDocument = buildSpaDocument(brand, navItems, copy, css, font, year, routes);

  // 8. Per-page standalone documents — kept for direct-URL access on published
  //    sites (served by the [section] route). Navigation primarily uses the SPA.
  const pages: Record<string, string> = {};
  pages['/'] = spaDocument;
  pages['/about'] = renderAboutPage(puo, composePageGraph(puo, 'about', fp), brand, navItems, copy, css, font, base, fp + 1, year);
  pages[`/${gallerySlug}`] = renderGalleryPageHtml(puo, brand, navItems, copy, css, font, base, fp + 2, year);
  pages['/contact'] = renderContactPageHtml(puo, brand, navItems, copy, css, font, base, fp + 3, year);
  if (copy.pricingPlans) {
    pages['/pricing'] = renderPricingPageHtml(puo, brand, navItems, copy, css, font, base, fp + 4, year);
  }

  return {
    pages,
    nav: navItems,
    gallerySlug,
    primaryPage: spaDocument,
  };
}

/** Backward-compatible single-page render. */
export function renderSiteHtml(context: ISharedContext, brandName: string): string {
  return renderMultiPageSite(context, brandName).primaryPage;
}
