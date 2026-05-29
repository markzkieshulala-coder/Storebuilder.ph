// ---------------------------------------------------------------------------
// GENERATIVE VISUAL ENGINE
//
// Synthesizes premium SVG artwork entirely in-process — NO third-party image
// APIs, NO network, NO random stock photos. Every visual is generated from the
// same PromptUnderstandingObject that drives the layout and copy, so the niche,
// branding, palette, mood, and style of the image always match the website.
//
// Output is a self-contained `data:image/svg+xml,...` URI that embeds directly
// in the HTML — keeping the generated site fully portable (CLAUDE.md: "No
// external assets beyond Google Fonts").
//
// Composition = background field + atmospheric depth layers + niche motif +
// film grain + vignette, each driven by palette/mood/style/seed.
// ---------------------------------------------------------------------------

export type VisualRole = 'hero' | 'feature' | 'gallery' | 'split' | 'avatar' | 'cta' | 'product';

export interface VisualPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface VisualSpec {
  palette: VisualPalette;
  mood: string;       // dark | dramatic | contrast | vibrant | warm | cold | ethereal | light | neutral | muted
  style: string;      // minimal | luxury | cyberpunk | editorial | organic | ...
  niche: string;      // normalized industry (food, sports, technology, ...)
  rawNiche: string;   // specific slug (coffee, ramen, sushi, crossfit, ...)
  keywords: string[]; // content words from the prompt
  seed: number;       // variation seed (each slot differs)
  role: VisualRole;
}

// ─────────────────────────────────────────────────────────────────
// DETERMINISTIC RNG + COLOR HELPERS
// ─────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampByte(n: number): number { return Math.max(0, Math.min(255, Math.round(n))); }

function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || '#000000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return [17, 17, 17];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c => clampByte(c).toString(16).padStart(2, '0')).join('');
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// amt > 0 lightens toward white, amt < 0 darkens toward black
function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  return toHex([(target - r) * p + r, (target - g) * p + g, (target - b) * p + b]);
}

function mix(h1: string, h2: string, t: number): string {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

// ─────────────────────────────────────────────────────────────────
// NICHE MOTIFS — line-art subjects drawn in a 0 0 24 24 box.
// These make every generated image actually READ as the website's subject.
// ─────────────────────────────────────────────────────────────────

const MOTIFS: Record<string, string> = {
  coffee:     '<path d="M4 10h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 11h2.2a2.8 2.8 0 0 1 0 5.6H17"/><path d="M8 2.5c-.8 1.1-.8 2.1 0 3.2M12 2.5c-.8 1.1-.8 2.1 0 3.2"/>',
  food:       '<path d="M6 2v20M5 2v6a2 2 0 0 0 2 0V2"/><path d="M18 2c-1.7 0-3 2.2-3 5s1.3 4.5 3 4.5V22"/>',
  ramen:      '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M5.5 11c2.2-2 11-2 13 0"/><path d="M13 3.5l7 4.2M15.5 2l6 4"/><path d="M9 7.5c-.7-1-.7-1.8 0-2.8M12 7.5c-.7-1-.7-1.8 0-2.8"/>',
  sushi:      '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M3 12h18"/><circle cx="8" cy="12" r="1.4"/>',
  pizza:      '<path d="M12 2 3 19a1 1 0 0 0 1.3 1.3L12 17l7.7 3.3A1 1 0 0 0 21 19z"/><circle cx="10" cy="9" r="1"/><circle cx="13.5" cy="12" r="1"/>',
  bakery:     '<path d="M4 13c0-3 2-5 4-5 1.2 0 2 .8 2 2 0 1-.5 1.8-1.5 2.2M20 13c0-3-2-5-4-5-1.2 0-2 .8-2 2 0 1 .5 1.8 1.5 2.2"/><path d="M5 13h14l-1.5 6h-11z"/>',
  bar:        '<path d="M5 3h14l-7 8z"/><path d="M12 11v8M8 21h8"/>',
  sports:     '<path d="M6.5 6.5l11 11M4 9l2-2M4 9l2 2M4 9l-1 1M20 15l-2 2M20 15l-2-2M20 15l1-1"/><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/>',
  yoga:       '<circle cx="12" cy="5" r="2"/><path d="M12 8v6M4 20c2-4 5-6 8-6s6 2 8 6M7 14l5 0 5 0"/>',
  technology: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3"/><rect x="10.5" y="10.5" width="3" height="3"/>',
  photography:'<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" transform="scale(0.85) translate(2 1.5)"/><circle cx="12" cy="12.5" r="3.4"/>',
  fashion:    '<path d="M9 4a3 3 0 0 0 6 0"/><path d="M9 4 4 8l2.5 2.5L8 9v11h8V9l1.5 1.5L20 8z"/>',
  ecommerce:  '<path d="M6 8h12l-1 12H7z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  portfolio:  '<path d="M3 20l3-1 11-11-2-2L4 17z"/><path d="M14 6l2 2"/><path d="M3 20l1-3"/>',
  agency:     '<path d="M12 2c3 2 5 5 5 9 0 2-1 4-2 5l-3 3-3-3c-1-1-2-3-2-5 0-4 2-7 5-9z"/><circle cx="12" cy="10" r="2"/><path d="M8 17l-2 4 4-2M16 17l2 4-4-2"/>',
  wellness:   '<path d="M12 21c-4-2-7-5-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4-3 7-7 9z"/><path d="M12 10v6"/>',
  hospitality:'<path d="M3 21V9l9-5 9 5v12"/><path d="M9 21v-6h6v6"/><path d="M3 13h18"/>',
  general:    '<path d="M12 2l2.6 6.3L21 9l-4.8 4.2L17.8 21 12 17.3 6.2 21l1.6-7.8L3 9l6.4-.7z"/>',
};

const SUBNICHE_TO_MOTIF: Record<string, string> = {
  coffee: 'coffee', cafe: 'coffee', espresso: 'coffee', barista: 'coffee', latte: 'coffee', cappuccino: 'coffee',
  ramen: 'ramen', noodle: 'ramen', noodles: 'ramen', pho: 'ramen',
  sushi: 'sushi', sashimi: 'sushi', poke: 'sushi',
  pizza: 'pizza', pizzeria: 'pizza',
  bakery: 'bakery', pastry: 'bakery', croissant: 'bakery',
  bar: 'bar', cocktail: 'bar', brewery: 'bar', pub: 'bar', wine: 'bar',
  yoga: 'yoga', pilates: 'yoga', meditation: 'yoga', spa: 'wellness', massage: 'wellness',
  gym: 'sports', crossfit: 'sports', fitness: 'sports', boxing: 'sports', workout: 'sports',
};

function resolveMotif(spec: VisualSpec): string {
  // most specific: a content keyword that maps to a motif
  for (const kw of spec.keywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_TO_MOTIF[k] && MOTIFS[SUBNICHE_TO_MOTIF[k]]) return MOTIFS[SUBNICHE_TO_MOTIF[k]];
    if (MOTIFS[k]) return MOTIFS[k];
  }
  // raw niche slug
  const raw = spec.rawNiche.toLowerCase();
  if (SUBNICHE_TO_MOTIF[raw] && MOTIFS[SUBNICHE_TO_MOTIF[raw]]) return MOTIFS[SUBNICHE_TO_MOTIF[raw]];
  if (MOTIFS[raw]) return MOTIFS[raw];
  // normalized niche
  if (MOTIFS[spec.niche]) return MOTIFS[spec.niche];
  return MOTIFS.general;
}

// ─────────────────────────────────────────────────────────────────
// COMPOSITION ARCHETYPES
// Each returns the inner artwork markup (within a 0 0 1000 1000 canvas).
// ─────────────────────────────────────────────────────────────────

const VB = 1000;

interface Ctx { r: () => number; pal: VisualPalette; dark: boolean; spec: VisualSpec; }

function blob(cx: number, cy: number, rad: number, color: string, alpha: number, blur: number): string {
  return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${rgba(color, alpha)}" filter="url(#soft)" style="filter:url(#soft)"/>`;
}

// Aurora — layered radial glows; premium default (tech, agency, saas, general)
function archAurora(ctx: Ctx): string {
  const { r, pal } = ctx;
  const cols = [pal.primary, pal.secondary, pal.accent, mix(pal.accent, pal.primary, 0.5)];
  let out = '';
  const n = 4 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const cx = 120 + r() * 760;
    const cy = 120 + r() * 760;
    const rad = 220 + r() * 320;
    out += blob(cx, cy, rad, cols[i % cols.length], ctx.dark ? 0.42 : 0.30, 80);
  }
  return out;
}

// Mesh — overlapping translucent rings/circles for an organic gradient field
function archMesh(ctx: Ctx): string {
  const { r, pal } = ctx;
  const cols = [pal.accent, pal.primary, pal.secondary];
  let out = '';
  for (let i = 0; i < 7; i++) {
    const cx = r() * VB, cy = r() * VB, rad = 140 + r() * 260;
    out += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="none" stroke="${rgba(cols[i % cols.length], ctx.dark ? 0.30 : 0.22)}" stroke-width="${(2 + r() * 3).toFixed(1)}"/>`;
  }
  out += blob(500, 480, 360, pal.accent, ctx.dark ? 0.30 : 0.18, 80);
  return out;
}

// Geometric — bauhaus shapes (artistic, portfolio, fashion, editorial)
function archGeometric(ctx: Ctx): string {
  const { r, pal } = ctx;
  const cols = [pal.primary, pal.accent, pal.secondary, mix(pal.accent, pal.background, 0.3)];
  let out = blob(720, 280, 380, pal.accent, ctx.dark ? 0.35 : 0.22, 90);
  const shapes = 5 + Math.floor(r() * 3);
  for (let i = 0; i < shapes; i++) {
    const type = Math.floor(r() * 3);
    const c = cols[i % cols.length];
    const a = ctx.dark ? 0.5 : 0.4;
    const x = r() * VB, y = r() * VB, s = 90 + r() * 200;
    if (type === 0) out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s / 2).toFixed(0)}" fill="${rgba(c, a)}"/>`;
    else if (type === 1) out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${s.toFixed(0)}" height="${s.toFixed(0)}" rx="${(s * 0.1).toFixed(0)}" fill="${rgba(c, a)}" transform="rotate(${(r() * 45).toFixed(0)} ${(x + s / 2).toFixed(0)} ${(y + s / 2).toFixed(0)})"/>`;
    else out += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${s.toFixed(0)} 0 l${(-s / 2).toFixed(0)} ${(s * 0.86).toFixed(0)} z" fill="${rgba(c, a)}"/>`;
  }
  return out;
}

// Waves — flowing bands (organic, wellness, food, hospitality)
function archWaves(ctx: Ctx): string {
  const { r, pal } = ctx;
  const cols = [pal.accent, mix(pal.accent, pal.primary, 0.4), pal.secondary, pal.primary];
  let out = '';
  const bands = 4 + Math.floor(r() * 2);
  for (let i = 0; i < bands; i++) {
    const baseY = 200 + (i * 600) / bands + r() * 80;
    const amp = 60 + r() * 90;
    const c = cols[i % cols.length];
    const d = `M-50 ${baseY.toFixed(0)} C ${(VB * 0.25).toFixed(0)} ${(baseY - amp).toFixed(0)}, ${(VB * 0.5).toFixed(0)} ${(baseY + amp).toFixed(0)}, ${(VB * 0.75).toFixed(0)} ${baseY.toFixed(0)} S ${(VB + 50).toFixed(0)} ${(baseY - amp).toFixed(0)}, ${(VB + 50).toFixed(0)} ${baseY.toFixed(0)} L ${(VB + 50)} ${VB + 50} L -50 ${VB + 50} Z`;
    out += `<path d="${d}" fill="${rgba(c, ctx.dark ? 0.28 : 0.20)}"/>`;
  }
  return out;
}

// Grid — tech lattice + glow nodes (technology, saas, cyberpunk, futuristic)
function archGrid(ctx: Ctx): string {
  const { r, pal } = ctx;
  let out = blob(500 + (r() - 0.5) * 300, 480, 380, pal.accent, ctx.dark ? 0.32 : 0.18, 90);
  const step = 90;
  let lines = '';
  for (let x = step; x < VB; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${VB}"/>`;
  for (let y = step; y < VB; y += step) lines += `<line x1="0" y1="${y}" x2="${VB}" y2="${y}"/>`;
  out += `<g stroke="${rgba(pal.primary, ctx.dark ? 0.12 : 0.10)}" stroke-width="1.2">${lines}</g>`;
  for (let i = 0; i < 9; i++) {
    const gx = step * (1 + Math.floor(r() * 9));
    const gy = step * (1 + Math.floor(r() * 9));
    out += `<circle cx="${gx}" cy="${gy}" r="${(4 + r() * 5).toFixed(1)}" fill="${rgba(pal.accent, 0.9)}"/>`;
  }
  return out;
}

// Spotlight — radial focus behind the motif (food, coffee, product, photography)
function archSpotlight(ctx: Ctx): string {
  const { pal, r } = ctx;
  let out = `<rect width="${VB}" height="${VB}" fill="url(#spot)"/>`;
  out += blob(500, 430, 300, pal.accent, ctx.dark ? 0.4 : 0.24, 90);
  out += blob(260 + r() * 480, 760, 220, pal.secondary, ctx.dark ? 0.3 : 0.18, 90);
  return out;
}

type ArchFn = (ctx: Ctx) => string;
const ARCHETYPES: Record<string, ArchFn> = {
  aurora: archAurora, mesh: archMesh, geometric: archGeometric,
  waves: archWaves, grid: archGrid, spotlight: archSpotlight,
};

// Map style/niche → preferred archetype pool, then pick by seed for variety.
function archetypePool(spec: VisualSpec): string[] {
  const s = spec.style, n = spec.niche;
  if (['technology', 'saas'].includes(n) || ['cyberpunk', 'futuristic', 'high-tech', 'enterprise'].includes(s)) return ['grid', 'aurora', 'mesh'];
  if (['portfolio', 'fashion', 'photography', 'agency'].includes(n) || ['editorial', 'artistic', 'brutalist'].includes(s)) return ['geometric', 'mesh', 'aurora'];
  if (['food', 'wellness', 'hospitality'].includes(n) || ['organic', 'luxury', 'premium'].includes(s)) return ['spotlight', 'waves', 'aurora'];
  if (['sports'].includes(n)) return ['geometric', 'grid', 'aurora'];
  return ['aurora', 'mesh', 'geometric', 'waves'];
}

// ─────────────────────────────────────────────────────────────────
// MAIN SVG BUILDER
// ─────────────────────────────────────────────────────────────────

export function generateVisualSvg(spec: VisualSpec): string {
  const r = makeRng((spec.seed >>> 0) ^ hashStr(spec.niche + '|' + spec.rawNiche + '|' + spec.role));
  const pal = spec.palette;
  const dark = ['dark', 'dramatic', 'contrast', 'vibrant'].includes(spec.mood) ||
    hexToRgb(pal.background).reduce((a, b) => a + b, 0) < 300;
  const ctx: Ctx = { r, pal, dark, spec };

  const pool = archetypePool(spec);
  const archName = pool[Math.floor(r() * pool.length)];
  const arch = ARCHETYPES[archName] || archAurora;

  // Background gradient — deep, branded, mood-aware.
  const bgA = spec.role === 'avatar' ? mix(pal.surface, pal.primary, dark ? 0.25 : 0.10) : pal.background;
  const bgB = dark ? shade(mix(pal.surface, pal.primary, 0.18), -0.25) : mix(pal.surface, pal.accent, 0.06);
  const bgAngle = Math.floor(r() * 360);

  // Motif treatment
  const motif = resolveMotif(spec);
  const motifColor = dark ? shade(pal.accent, 0.35) : shade(pal.primary, -0.1);
  const motifGlow = pal.accent;
  // Place motif on a golden-ratio-ish focal point, scaled to canvas.
  const mScale = (spec.role === 'avatar' ? 9 : spec.role === 'feature' ? 16 : 20) + r() * 6;
  const mSize = 24 * mScale;
  const mx = (spec.role === 'avatar' ? 500 : 360 + r() * 280);
  const my = (spec.role === 'avatar' ? 500 : 380 + r() * 240);
  const motifStroke = (spec.role === 'avatar' ? 1.0 : 0.9);

  const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${bgAngle} 0.5 0.5)">
    <stop offset="0" stop-color="${bgA}"/>
    <stop offset="1" stop-color="${bgB}"/>
  </linearGradient>
  <radialGradient id="spot" cx="50%" cy="42%" r="62%">
    <stop offset="0" stop-color="${rgba(pal.accent, dark ? 0.22 : 0.14)}"/>
    <stop offset="1" stop-color="${rgba(pal.background, 0)}"/>
  </radialGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="75%">
    <stop offset="55%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="${rgba('#000000', dark ? 0.55 : 0.18)}"/>
  </radialGradient>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${rgba(motifGlow, dark ? 0.55 : 0.35)}"/>
    <stop offset="1" stop-color="${rgba(motifGlow, 0)}"/>
  </radialGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="70"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>`;

  const motifLayer = `
<g opacity="${dark ? 0.9 : 0.85}">
  <circle cx="${mx.toFixed(0)}" cy="${my.toFixed(0)}" r="${(mSize * 0.62).toFixed(0)}" fill="url(#halo)"/>
  <g transform="translate(${(mx - mSize / 2).toFixed(0)} ${(my - mSize / 2).toFixed(0)}) scale(${mScale.toFixed(2)})"
     fill="none" stroke="${motifColor}" stroke-width="${motifStroke}" stroke-linecap="round" stroke-linejoin="round">
    ${motif}
  </g>
</g>`;

  const grainLayer = `<rect width="${VB}" height="${VB}" filter="url(#grain)" opacity="${dark ? 0.10 : 0.06}"/>`;
  const vignetteLayer = `<rect width="${VB}" height="${VB}" fill="url(#vig)"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" preserveAspectRatio="xMidYMid slice" width="${VB}" height="${VB}">` +
    defs +
    `<rect width="${VB}" height="${VB}" fill="url(#bg)"/>` +
    arch(ctx) +
    motifLayer +
    grainLayer +
    vignetteLayer +
    `</svg>`;

  return svg.replace(/\n\s*/g, ' ').trim();
}

export function toDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function generateVisualDataUri(spec: VisualSpec): string {
  return toDataUri(generateVisualSvg(spec));
}

// Convenience: build a coherent SET of distinct visuals for one page/site.
// All share the niche/palette/mood (coherence); seed + role vary (variety).
export function buildVisualSet(base: Omit<VisualSpec, 'seed' | 'role'>, count: number, baseSeed: number, role: VisualRole = 'gallery'): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateVisualDataUri({ ...base, seed: baseSeed + i * 0x9E3779B1, role }));
  }
  return out;
}
