// ---------------------------------------------------------------------------
// 3D RENDERER — turns a SitePlan into ONE self-contained, premium, 3D
// ultra-modern HTML document.
//
// Hard rule: this renderer renders ONLY what the plan contains. It never adds a
// section, button, stat, or line of copy that is not present in the plan. There
// is no RNG, no template bank, no "required section" injection. Order and content
// come verbatim from the plan; the only thing applied deterministically is the
// premium 3D *design system* (depth, glass, aurora lighting, motion).
// ---------------------------------------------------------------------------

import type { SitePlan, Section, Cta, SectionItem, Theme } from '../ai/site-plan';
import type { ResolvedImagery } from '../engine/pexels';

/** Append per-slot sizing/crop params to a Pexels photo URL. */
function ph(url: string, w: number, h: number): string {
  if (!url) return '';
  if (/images\.pexels\.com/.test(url)) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${w}&h=${h}&fit=crop&auto=compress`;
  }
  return url;
}

/** Inline background-image style for an art slot, or '' to fall back to CSS gradient art. */
function artStyle(url: string | undefined, w: number, h: number): string {
  const sized = ph(url || '', w, h);
  return sized ? ` style="background-image:url('${esc(sized)}')"` : '';
}

export interface RenderResult {
  html: string;
  pages: Record<string, string>;
  nav: Array<{ label: string; href: string }>;
  gallerySlug: string;
  niche: string;
  brandName: string;
}

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalise a CTA href into something that works inside the static iframe. */
function href(h: string): string {
  const v = (h || '').trim();
  if (!v) return '#';
  if (/^(#|https?:|mailto:|tel:|\/)/i.test(v)) return v;
  return '#' + v.replace(/^#*/, '').replace(/\s+/g, '-').toLowerCase();
}

function initials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// A compact inline-SVG icon set. Unknown keywords fall back to a spark glyph.
const ICONS: Record<string, string> = {
  rocket: '<path d="M5 13c-1.5.5-3 2-3 5 3 0 4.5-1.5 5-3M9 11l4-4a6 6 0 0 1 8-2 6 6 0 0 1-2 8l-4 4-3-1-3-3-1-3z"/><circle cx="15" cy="9" r="1.5"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3z"/>',
  spark: '<path d="M12 2v6m0 8v6m10-10h-6M8 12H2m15.5-5.5-4 4m-3 3-4 4m11 0-4-4m-3-3-4-4"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
  star: '<path d="m12 2 3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z"/>',
  heart: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 6a3 3 0 0 1 0 6m5 8c0-2.5-2-4-4-4.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  phone: '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14m6-12v14"/>',
  leaf: '<path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16zm0 0c4-4 8-6 12-7"/>',
  fire: '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 1.5 0 2-1.5 1-4-1-2 0-4 0-5z"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S9 3 6.5 5 9 8 12 8s5.5.5 5.5-3S12 8 12 8z"/>',
  truck: '<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  palette: '<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.5 1-2 2-2h2a3 3 0 0 0 3-3c0-5-4-9-9-9z"/><circle cx="7.5" cy="11" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="11" r="1"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M9 7l1.5-2h3L15 7"/>',
  music: '<circle cx="6" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/><path d="M8.5 18V6l11-2v10"/>',
};

function icon(keyword?: string): string {
  const k = (keyword || '').toLowerCase().trim();
  const path = ICONS[k] || ICONS[Object.keys(ICONS).find((x) => k.includes(x)) || ''] || ICONS.spark;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function renderCtas(ctas: Cta[] | undefined, extraClass = ''): string {
  if (!ctas || !ctas.length) return '';
  const btns = ctas
    .map(
      (c) =>
        `<a class="btn btn-${esc(c.variant)}" href="${esc(href(c.href))}">${esc(c.label)}</a>`,
    )
    .join('');
  return `<div class="cta-row ${extraClass}">${btns}</div>`;
}

function secHead(s: Section, centered = true): string {
  const eyebrow = s.eyebrow ? `<span class="eyebrow">${esc(s.eyebrow)}</span>` : '';
  const heading = s.heading ? `<h2 class="grad">${esc(s.heading)}</h2>` : '';
  const sub = s.subheading ? `<p class="sec-sub">${esc(s.subheading)}</p>` : '';
  if (!eyebrow && !heading && !sub) return '';
  return `<div class="sec-head${centered ? ' centered' : ''} reveal">${eyebrow}${heading}${sub}</div>`;
}

// ── Section renderers — each reads ONLY its plan data ──────────────────────

function renderHero(s: Section, imgUrl?: string): string {
  const eyebrow = s.eyebrow ? `<span class="hero-tag reveal">${esc(s.eyebrow)}</span>` : '';
  const heading = s.heading ? `<h1 class="reveal">${esc(s.heading)}</h1>` : '';
  const sub = s.subheading ? `<p class="hero-sub reveal">${esc(s.subheading)}</p>` : '';
  const body = s.body ? `<p class="hero-body reveal">${esc(s.body)}</p>` : '';
  const ctas = s.ctas && s.ctas.length ? renderCtas(s.ctas, 'reveal') : '';
  const bg = imgUrl ? `<div class="hero-bg"${artStyle(imgUrl, 1600, 1000)}></div>` : '';
  return `<section id="${esc(s.id)}" class="hero${imgUrl ? ' has-bg' : ''}">
  ${bg}<div class="hero-glow"></div>
  <div class="wrap hero-inner">${eyebrow}${heading}${sub}${body}${ctas}</div>
</section>`;
}

function renderFeatures(s: Section): string {
  const cards = (s.items || [])
    .map(
      (it, i) => `<article class="card tilt reveal" style="--d:${(i % 4) * 70}ms">
      <div class="card-ico">${icon(it.icon)}</div>
      ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
      ${it.description ? `<p>${esc(it.description)}</p>` : ''}
    </article>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-feat">${cards}</div></div>
</section>`;
}

function renderAbout(s: Section): string {
  const bullets = (s.items || [])
    .filter((it) => it.title)
    .map((it) => `<li><span class="dot">${icon('check')}</span>${esc(it.title)}</li>`)
    .join('');
  const list = bullets ? `<ul class="about-list reveal">${bullets}</ul>` : '';
  const body = s.body ? `<p class="about-body reveal">${esc(s.body)}</p>` : '';
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap about-grid">
    <div>${secHead(s, false)}</div>
    <div>${body}${list}</div>
  </div>
</section>`;
}

function renderGallery(s: Section, imagery?: ResolvedImagery): string {
  const tiles = (s.items || [])
    .map(
      (it, i) => `<figure class="tile tilt reveal" style="--i:${i}">
      <div class="tile-art"${artStyle(imagery?.byName[`gallery-${i}`], 800, 600)}></div>
      ${it.title ? `<figcaption>${esc(it.title)}</figcaption>` : ''}
    </figure>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-gallery">${tiles}</div></div>
</section>`;
}

function renderProducts(s: Section, imagery?: ResolvedImagery): string {
  const cards = (s.items || [])
    .map(
      (it, i) => `<article class="card product tilt reveal">
      <div class="product-art"${artStyle(imagery?.byName[`product-${i}`], 800, 600)}></div>
      <div class="product-body">
        ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
        ${it.description ? `<p>${esc(it.description)}</p>` : ''}
        <div class="product-foot">
          ${it.price ? `<span class="price">${esc(it.price)}</span>` : '<span></span>'}
          ${it.cta ? `<a class="btn btn-primary btn-sm" href="#${esc(s.id)}">${esc(it.cta)}</a>` : ''}
        </div>
      </div>
    </article>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-products">${cards}</div></div>
</section>`;
}

function renderPricing(s: Section): string {
  const cards = (s.items || [])
    .map((it) => {
      const feats = (it.features || [])
        .map((f) => `<li><span class="dot">${icon('check')}</span>${esc(f)}</li>`)
        .join('');
      return `<article class="card price-card tilt reveal${it.featured ? ' featured' : ''}">
      ${it.featured ? '<span class="badge">Most popular</span>' : ''}
      ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
      <div class="price-amt">${esc(it.price || '')}${it.period ? `<span>${esc(it.period)}</span>` : ''}</div>
      ${it.description ? `<p>${esc(it.description)}</p>` : ''}
      ${feats ? `<ul class="price-feats">${feats}</ul>` : ''}
      ${it.cta ? `<a class="btn ${it.featured ? 'btn-primary' : 'btn-secondary'}" href="#${esc(s.id)}">${esc(it.cta)}</a>` : ''}
    </article>`;
    })
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-pricing">${cards}</div></div>
</section>`;
}

function renderTestimonials(s: Section): string {
  const cards = (s.items || [])
    .map(
      (it) => `<figure class="card quote tilt reveal">
      <div class="quote-mark">&ldquo;</div>
      ${it.description ? `<blockquote>${esc(it.description)}</blockquote>` : ''}
      <figcaption><span class="avatar">${esc(initials(it.title || ''))}</span><span>
        ${it.title ? `<strong>${esc(it.title)}</strong>` : ''}
        ${it.subtitle ? `<em>${esc(it.subtitle)}</em>` : ''}
      </span></figcaption>
    </figure>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-quotes">${cards}</div></div>
</section>`;
}

function renderFaq(s: Section): string {
  const rows = (s.items || [])
    .map(
      (it) => `<details class="faq-row reveal">
      <summary>${esc(it.title)}</summary>
      ${it.description ? `<p>${esc(it.description)}</p>` : ''}
    </details>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section section-narrow">
  <div class="wrap">${secHead(s)}<div class="faq-list">${rows}</div></div>
</section>`;
}

function renderStats(s: Section): string {
  const cells = (s.items || [])
    .map(
      (it) => `<div class="stat reveal">
      <div class="stat-num grad">${esc(it.value || '')}</div>
      ${it.title ? `<div class="stat-label">${esc(it.title)}</div>` : ''}
    </div>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="stat-row glass">${cells}</div></div>
</section>`;
}

function renderTeam(s: Section): string {
  const cards = (s.items || [])
    .map(
      (it) => `<article class="card team-card tilt reveal">
      <div class="avatar avatar-lg">${esc(initials(it.title || ''))}</div>
      ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
      ${it.subtitle ? `<p class="muted">${esc(it.subtitle)}</p>` : ''}
    </article>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-team">${cards}</div></div>
</section>`;
}

function renderSteps(s: Section): string {
  const cards = (s.items || [])
    .map(
      (it, i) => `<article class="card step tilt reveal">
      <div class="step-num">${i + 1}</div>
      ${it.title ? `<h3>${esc(it.title)}</h3>` : ''}
      ${it.description ? `<p>${esc(it.description)}</p>` : ''}
    </article>`,
    )
    .join('');
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap">${secHead(s)}<div class="grid grid-steps">${cards}</div></div>
</section>`;
}

function renderLogos(s: Section): string {
  const items = (s.items || []).map((it) => `<span class="logo-chip">${esc(it.title || '')}</span>`).join('');
  return `<section id="${esc(s.id)}" class="section section-tight">
  <div class="wrap">${s.heading ? `<p class="logos-head">${esc(s.heading)}</p>` : ''}<div class="logo-row reveal">${items}</div></div>
</section>`;
}

function renderCtaBand(s: Section): string {
  return `<section id="${esc(s.id)}" class="section">
  <div class="wrap"><div class="cta-band glass reveal">
    ${s.heading ? `<h2 class="grad">${esc(s.heading)}</h2>` : ''}
    ${s.body ? `<p>${esc(s.body)}</p>` : ''}
    ${renderCtas(s.ctas, 'centered')}
  </div></div>
</section>`;
}

function renderContact(s: Section): string {
  return `<section id="${esc(s.id)}" class="section section-narrow">
  <div class="wrap contact-grid">
    <div>${secHead(s, false)}${s.body ? `<p class="muted">${esc(s.body)}</p>` : ''}${renderCtas(s.ctas)}</div>
    <form class="card contact-form glass reveal" onsubmit="return false">
      <label>Name<input type="text" placeholder="Your name" /></label>
      <label>Email<input type="email" placeholder="you@example.com" /></label>
      <label>Message<textarea rows="4" placeholder="How can we help?"></textarea></label>
      <button class="btn btn-primary" type="submit">Send message</button>
    </form>
  </div>
</section>`;
}

function renderNewsletter(s: Section): string {
  const label = s.ctas && s.ctas[0] ? s.ctas[0].label : 'Subscribe';
  return `<section id="${esc(s.id)}" class="section section-narrow">
  <div class="wrap"><div class="news glass reveal">
    ${s.heading ? `<h2 class="grad">${esc(s.heading)}</h2>` : ''}
    ${s.body ? `<p>${esc(s.body)}</p>` : ''}
    <form class="news-form" onsubmit="return false">
      <input type="email" placeholder="Enter your email" />
      <button class="btn btn-primary" type="submit">${esc(label)}</button>
    </form>
  </div></div>
</section>`;
}

function renderSection(s: Section, imagery?: ResolvedImagery): string {
  switch (s.type) {
    case 'hero': return renderHero(s, imagery?.byName['hero']);
    case 'features': return renderFeatures(s);
    case 'about': return renderAbout(s);
    case 'gallery': return renderGallery(s, imagery);
    case 'products': return renderProducts(s, imagery);
    case 'pricing': return renderPricing(s);
    case 'testimonials': return renderTestimonials(s);
    case 'faq': return renderFaq(s);
    case 'stats': return renderStats(s);
    case 'team': return renderTeam(s);
    case 'steps': return renderSteps(s);
    case 'cta': return renderCtaBand(s);
    case 'contact': return renderContact(s);
    case 'logos': return renderLogos(s);
    case 'newsletter': return renderNewsletter(s);
    default: return '';
  }
}

// ── Design system (CSS) ────────────────────────────────────────────────────

function fontsFor(theme: Theme): { href: string; display: string; body: string } {
  if (theme.style === 'luxe') {
    return {
      href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap',
      display: "'Fraunces', Georgia, serif",
      body: "'Inter', system-ui, sans-serif",
    };
  }
  if (theme.style === 'minimal') {
    return {
      href: 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap',
      display: "'Sora', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
    };
  }
  return {
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  };
}

function buildCss(theme: Theme): string {
  const f = fontsFor(theme);
  const dark = theme.mode === 'dark';
  const bg = dark ? '#08080c' : '#f6f6fb';
  const text = dark ? '#f4f4f8' : '#15151d';
  const muted = dark ? '#a7a7b8' : '#5b5b6b';
  const surface = dark ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.72)';
  const border = dark ? 'rgba(255,255,255,.1)' : 'rgba(20,20,40,.09)';
  const glowOpacity = theme.style === 'neon' ? '.55' : theme.style === 'minimal' ? '.18' : '.34';
  return `
:root{
  --primary:${theme.primary};--accent:${theme.accent};
  --bg:${bg};--text:${text};--muted:${muted};--surface:${surface};--border:${border};
  --display:${f.display};--body:${f.body};
  --grad:linear-gradient(120deg,var(--primary),var(--accent));
  --glow:${glowOpacity};
  --radius:20px;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--body);background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
/* Aurora background */
body::before,body::after{content:'';position:fixed;z-index:0;width:55vmax;height:55vmax;border-radius:50%;filter:blur(90px);opacity:var(--glow);pointer-events:none;animation:float 18s ease-in-out infinite}
body::before{top:-12vmax;left:-10vmax;background:radial-gradient(circle,var(--primary),transparent 70%)}
body::after{bottom:-16vmax;right:-12vmax;background:radial-gradient(circle,var(--accent),transparent 70%);animation-delay:-9s}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4vmax,3vmax) scale(1.12)}}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--display);line-height:1.08;letter-spacing:-.02em;font-weight:700}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.muted{color:var(--muted)}
.eyebrow{display:inline-block;font-size:.78rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--primary);margin-bottom:14px}
.glass{background:var(--surface);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid var(--border)}
/* Nav */
header{position:fixed;top:0;left:0;right:0;z-index:50;transition:.3s}
header.scrolled{background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nav{display:flex;align-items:center;justify-content:space-between;height:72px}
.brand{font-family:var(--display);font-weight:700;font-size:1.2rem;display:flex;align-items:center;gap:10px}
.brand .mark{width:34px;height:34px;border-radius:11px;background:var(--grad);display:grid;place-items:center;color:#fff;font-weight:800;box-shadow:0 8px 24px -8px var(--primary)}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{font-size:.93rem;color:var(--muted);font-weight:500;transition:.2s}
.nav-links a:hover{color:var(--text)}
.burger{display:none;background:none;border:0;color:var(--text);cursor:pointer;flex-direction:column;gap:5px;padding:8px}
.burger span{width:22px;height:2px;background:currentColor;border-radius:2px;transition:.25s}
.mobile{display:none;flex-direction:column;gap:6px;padding:10px 24px 22px}
.mobile.open{display:flex}
.mobile a{padding:12px 0;border-bottom:1px solid var(--border);color:var(--text)}
/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 26px;border-radius:999px;font-family:var(--body);font-weight:600;font-size:.95rem;cursor:pointer;border:1px solid transparent;transition:transform .2s,box-shadow .2s,background .2s}
.btn-sm{padding:9px 18px;font-size:.85rem}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--grad);color:#fff;box-shadow:0 14px 34px -12px var(--primary)}
.btn-primary:hover{box-shadow:0 22px 44px -12px var(--primary)}
.btn-secondary{background:var(--surface);border-color:var(--border);color:var(--text);backdrop-filter:blur(10px)}
.btn-ghost{background:transparent;color:var(--primary)}
.cta-row{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px}
.cta-row.centered{justify-content:center}
/* Sections */
.section{padding:clamp(64px,9vw,120px) 0;position:relative;z-index:1}
.section-narrow .wrap{max-width:880px}
.section-tight{padding:48px 0}
.sec-head{max-width:720px;margin-bottom:52px}
.sec-head.centered{margin-left:auto;margin-right:auto;text-align:center}
.sec-head h2{font-size:clamp(2rem,4vw,3.1rem);margin-bottom:14px}
.sec-sub{color:var(--muted);font-size:1.08rem}
/* Hero */
.hero{position:relative;padding:clamp(140px,20vw,200px) 0 clamp(80px,10vw,120px);text-align:center}
.hero-bg{position:absolute;inset:0;z-index:0;background-size:cover;background-position:center;opacity:${theme.mode === 'dark' ? '.32' : '.22'};filter:saturate(1.05)}
.hero.has-bg::after{content:'';position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,transparent,var(--bg) 92%)}
.hero-inner{max-width:880px;margin:0 auto;display:flex;flex-direction:column;align-items:center;position:relative;z-index:1}
.hero-tag{padding:7px 16px;border-radius:999px;border:1px solid var(--border);background:var(--surface);font-size:.82rem;font-weight:600;color:var(--primary);margin-bottom:24px;backdrop-filter:blur(10px)}
.hero h1{font-size:clamp(2.7rem,7vw,5rem);margin-bottom:22px;background:linear-gradient(180deg,var(--text),color-mix(in srgb,var(--text) 55%,var(--primary)));-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-sub{font-size:clamp(1.05rem,2vw,1.35rem);color:var(--muted);max-width:640px;margin-bottom:14px}
.hero-body{color:var(--muted);max-width:600px}
/* Cards & 3D */
.grid{display:grid;gap:24px}
.grid-feat{grid-template-columns:repeat(3,1fr)}
.grid-products{grid-template-columns:repeat(3,1fr)}
.grid-pricing{grid-template-columns:repeat(3,1fr)}
.grid-quotes{grid-template-columns:repeat(3,1fr)}
.grid-team{grid-template-columns:repeat(4,1fr)}
.grid-steps{grid-template-columns:repeat(4,1fr)}
.grid-gallery{grid-template-columns:repeat(3,1fr)}
.card{background:var(--surface);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--border);border-radius:var(--radius);padding:30px;transition:transform .25s,box-shadow .25s,border-color .25s;transform-style:preserve-3d}
.card:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--border));box-shadow:0 30px 60px -28px var(--primary)}
.card h3{font-size:1.2rem;margin-bottom:8px}
.card p{color:var(--muted);font-size:.96rem}
.card-ico{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--primary) 16%,transparent);color:var(--primary);margin-bottom:18px}
.card-ico svg{width:24px;height:24px}
.dot svg{width:15px;height:15px}
.dot{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:color-mix(in srgb,var(--primary) 18%,transparent);color:var(--primary);flex:0 0 auto}
/* About */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.about-body{color:var(--muted);font-size:1.06rem;margin-bottom:20px}
.about-list{list-style:none;display:flex;flex-direction:column;gap:14px}
.about-list li{display:flex;align-items:center;gap:12px;font-weight:500}
/* Gallery */
.tile{border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)}
.tile-art{aspect-ratio:4/3;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 40%,transparent),color-mix(in srgb,var(--accent) 40%,transparent))}
.tile figcaption{padding:14px 18px;font-size:.92rem;color:var(--muted);background:var(--surface)}
/* Products */
.product{padding:0;overflow:hidden}
.product-art{aspect-ratio:16/10;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 38%,transparent),color-mix(in srgb,var(--accent) 38%,transparent))}
.product-body{padding:24px}
.product-foot{display:flex;align-items:center;justify-content:space-between;margin-top:18px}
.price{font-family:var(--display);font-weight:700;font-size:1.3rem}
/* Pricing */
.price-card{display:flex;flex-direction:column;gap:8px;position:relative}
.price-card.featured{border-color:var(--primary);box-shadow:0 30px 70px -30px var(--primary)}
.badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--grad);color:#fff;font-size:.72rem;font-weight:700;padding:5px 14px;border-radius:999px}
.price-amt{font-family:var(--display);font-weight:700;font-size:2.4rem;margin:6px 0}
.price-amt span{font-size:1rem;color:var(--muted);font-weight:500}
.price-feats{list-style:none;display:flex;flex-direction:column;gap:11px;margin:16px 0 22px}
.price-feats li{display:flex;align-items:center;gap:10px;font-size:.94rem}
.price-card .btn{margin-top:auto}
/* Quotes */
.quote{display:flex;flex-direction:column;gap:14px;position:relative}
.quote-mark{font-family:var(--display);font-size:3rem;line-height:.6;color:var(--primary);opacity:.5}
.quote blockquote{font-size:1.02rem;color:var(--text)}
.quote figcaption{display:flex;align-items:center;gap:12px;margin-top:auto}
.avatar{width:42px;height:42px;border-radius:50%;background:var(--grad);color:#fff;display:grid;place-items:center;font-weight:700;font-size:.9rem;flex:0 0 auto}
.avatar-lg{width:72px;height:72px;font-size:1.3rem;margin:0 auto 16px}
.quote figcaption strong{display:block;font-size:.95rem}
.quote figcaption em{font-style:normal;font-size:.85rem;color:var(--muted)}
/* FAQ */
.faq-list{display:flex;flex-direction:column;gap:14px}
.faq-row{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 24px;backdrop-filter:blur(14px)}
.faq-row summary{font-family:var(--display);font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:16px}
.faq-row summary::after{content:'+';font-size:1.4rem;color:var(--primary);transition:.2s}
.faq-row[open] summary::after{transform:rotate(45deg)}
.faq-row p{color:var(--muted);margin-top:12px}
/* Stats */
.stat-row{display:flex;flex-wrap:wrap;justify-content:space-around;gap:24px;border-radius:var(--radius);padding:46px 30px}
.stat{text-align:center}
.stat-num{font-family:var(--display);font-weight:700;font-size:clamp(2.2rem,5vw,3.4rem)}
.stat-label{color:var(--muted);font-size:.92rem;margin-top:4px}
/* Team */
.team-card{text-align:center}
/* Steps */
.step{position:relative}
.step-num{width:42px;height:42px;border-radius:12px;background:var(--grad);color:#fff;display:grid;place-items:center;font-family:var(--display);font-weight:700;margin-bottom:16px}
/* Logos */
.logos-head{text-align:center;color:var(--muted);font-size:.9rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:24px}
.logo-row{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.logo-chip{padding:10px 22px;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-family:var(--display);font-weight:600;color:var(--muted)}
/* CTA band */
.cta-band{border-radius:28px;padding:clamp(40px,6vw,72px);text-align:center}
.cta-band h2{font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:14px}
.cta-band p{color:var(--muted);max-width:560px;margin:0 auto 8px}
/* Contact */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:start}
.contact-form{display:flex;flex-direction:column;gap:16px;padding:30px;border-radius:var(--radius)}
.contact-form label,.news-form label{display:flex;flex-direction:column;gap:7px;font-size:.85rem;font-weight:600;color:var(--muted)}
.contact-form input,.contact-form textarea,.news-form input{padding:12px 16px;border-radius:12px;border:1px solid var(--border);background:color-mix(in srgb,var(--bg) 60%,transparent);color:var(--text);font-family:var(--body);font-size:.95rem}
.contact-form input:focus,.contact-form textarea:focus,.news-form input:focus{outline:none;border-color:var(--primary)}
/* Newsletter */
.news{border-radius:28px;padding:clamp(40px,6vw,64px);text-align:center}
.news h2{font-size:clamp(1.7rem,3.5vw,2.4rem);margin-bottom:10px}
.news p{color:var(--muted);max-width:480px;margin:0 auto 22px}
.news-form{display:flex;gap:12px;max-width:460px;margin:0 auto;flex-wrap:wrap}
.news-form input{flex:1;min-width:200px}
/* Footer */
footer{border-top:1px solid var(--border);padding:48px 0;position:relative;z-index:1;margin-top:40px}
.foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;align-items:center}
.foot .brand{font-size:1.05rem}
.foot-links{display:flex;gap:22px;flex-wrap:wrap}
.foot-links a{color:var(--muted);font-size:.9rem}
.foot-copy{color:var(--muted);font-size:.85rem;width:100%;border-top:1px solid var(--border);margin-top:24px;padding-top:24px}
/* Reveal */
.reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:none}
@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none}body::before,body::after{animation:none}}
/* Responsive */
@media(max-width:960px){.grid-feat,.grid-products,.grid-pricing,.grid-quotes,.grid-steps{grid-template-columns:repeat(2,1fr)}.grid-team,.grid-gallery{grid-template-columns:repeat(2,1fr)}.about-grid,.contact-grid{grid-template-columns:1fr}}
@media(max-width:640px){.nav-links{display:none}.burger{display:flex}.grid-feat,.grid-products,.grid-pricing,.grid-quotes,.grid-steps,.grid-team,.grid-gallery{grid-template-columns:1fr}}
`;
}

const SCRIPT = `
(function(){
  var h=document.querySelector('header');
  if(h){addEventListener('scroll',function(){h.classList.toggle('scrolled',scrollY>20)});}
  var b=document.querySelector('.burger'),m=document.querySelector('.mobile');
  if(b&&m){b.addEventListener('click',function(){m.classList.toggle('open')});m.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){m.classList.remove('open')})});}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  // 3D pointer tilt
  document.querySelectorAll('.tilt').forEach(function(c){
    c.addEventListener('pointermove',function(e){
      var r=c.getBoundingClientRect();var px=(e.clientX-r.left)/r.width-.5;var py=(e.clientY-r.top)/r.height-.5;
      c.style.transform='perspective(900px) rotateX('+(-py*6)+'deg) rotateY('+(px*6)+'deg) translateY(-4px)';
    });
    c.addEventListener('pointerleave',function(){c.style.transform='';});
  });
})();
`;

/** Render a full premium HTML document from a SitePlan, with optional resolved photos. */
export function renderSitePlan(plan: SitePlan, imagery?: ResolvedImagery): RenderResult {
  const css = buildCss(plan.theme);
  const sectionsHtml = plan.sections.map((s) => renderSection(s, imagery)).filter(Boolean).join('\n');

  // Nav links come from the plan; primary CTA reuses the hero's primary CTA if present.
  const navLinks = plan.nav
    .map((n) => `<a href="${esc(href(n.href))}">${esc(n.label)}</a>`)
    .join('');
  const hero = plan.sections.find((s) => s.type === 'hero');
  const navCta = hero?.ctas?.find((c) => c.variant === 'primary') || hero?.ctas?.[0];
  const navCtaHtml = navCta
    ? `<a class="btn btn-primary btn-sm" href="${esc(href(navCta.href))}">${esc(navCta.label)}</a>`
    : '';

  const footLinks = plan.nav
    .map((n) => `<a href="${esc(href(n.href))}">${esc(n.label)}</a>`)
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(plan.brandName)}${plan.tagline ? ' — ' + esc(plan.tagline) : ''}</title>
<meta name="description" content="${esc(plan.tagline)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${esc(fontsFor(plan.theme).href)}"/>
<style>${css}</style>
</head>
<body>
<header>
  <div class="wrap nav">
    <a class="brand" href="#"><span class="mark">${esc(initials(plan.brandName))}</span>${esc(plan.brandName)}</a>
    <nav class="nav-links">${navLinks}${navCtaHtml}</nav>
    <button class="burger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
  <nav class="mobile">${navLinks}</nav>
</header>
<main>
${sectionsHtml}
</main>
<footer>
  <div class="wrap">
    <div class="foot">
      <a class="brand" href="#"><span class="mark">${esc(initials(plan.brandName))}</span>${esc(plan.brandName)}</a>
      <div class="foot-links">${footLinks}</div>
    </div>
    <div class="foot-copy">© ${new Date().getFullYear()} ${esc(plan.brandName)}. ${esc(plan.tagline)}</div>
  </div>
</footer>
<script>${SCRIPT}</script>
</body>
</html>`;

  return {
    html,
    pages: { '/': html },
    nav: plan.nav,
    gallerySlug: '',
    niche: plan.niche,
    brandName: plan.brandName,
  };
}
