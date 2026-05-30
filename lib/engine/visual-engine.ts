// ---------------------------------------------------------------------------
// GENERATIVE VISUAL ENGINE v2 — PHOTOREALISTIC SCENE GENERATOR
//
// Produces rich scene-based SVG artwork entirely in-process — NO third-party
// image APIs. Every scene is built from the PromptUnderstandingObject so the
// niche, palette, and mood always match the website.
//
// v2 change: replaces flat line-art icon approach with layered 3D scene
// compositions — recognizable objects with proper lighting, depth, and texture.
// ---------------------------------------------------------------------------

export type VisualRole = 'hero' | 'feature' | 'gallery' | 'split' | 'avatar' | 'cta' | 'product';

export interface VisualPalette {
  primary: string; secondary: string; accent: string;
  background: string; surface: string; text: string; muted: string;
}

export interface VisualSpec {
  palette: VisualPalette;
  mood: string;
  style: string;
  niche: string;
  rawNiche: string;
  keywords: string[];
  seed: number;
  role: VisualRole;
  subject?: string;   // optional specific item name (e.g. a product/menu item)
}

// ─── RNG + COLOR HELPERS ─────────────────────────────────────────────────────

export function hashStr(s: string): number {
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
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

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

function lum(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// ─── FIELD COLORS (branded atmospheric base) ─────────────────────────────────

interface FieldColors {
  bgTop: string; bgBot: string;
  shapeA: string; shapeB: string; shapeC: string;
  glow: string; motif: string; motifGlow: string;
}

function buildField(pal: VisualPalette): FieldColors {
  const candidates = [pal.primary, pal.accent, pal.secondary].filter(Boolean);
  let base = candidates.find(c => lum(c) > 0.12 && lum(c) < 0.62) || pal.primary || '#2563EB';
  if (lum(base) > 0.62) base = shade(base, -0.4);
  if (lum(base) < 0.10) base = shade(base, 0.25);
  const bgTop = shade(base, 0.08);
  const bgBot = shade(base, -0.5);
  const glowSrc = pal.accent && lum(pal.accent) > 0.45 ? pal.accent : shade(pal.accent || base, 0.4);
  return {
    bgTop, bgBot,
    shapeA: shade(base, 0.22),
    shapeB: shade(pal.secondary || base, -0.15),
    shapeC: glowSrc,
    glow: glowSrc,
    motif: '#FFFFFF',
    motifGlow: glowSrc,
  };
}

function blob(cx: number, cy: number, rad: number, color: string, alpha: number): string {
  return `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="${rgba(color, alpha)}" filter="url(#soft)"/>`;
}

// ─── ATMOSPHERIC BACKGROUND ARCHETYPES (unchanged) ───────────────────────────

const VB = 1000;
interface Ctx { r: () => number; pal: VisualPalette; field: FieldColors; spec: VisualSpec; }

function archAurora(ctx: Ctx): string {
  const { r, field } = ctx;
  const cols = [field.shapeA, field.shapeB, field.glow, mix(field.glow, field.shapeA, 0.5)];
  let out = '';
  const n = 4 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const cx = 120 + r() * 760, cy = 120 + r() * 760, rad = 240 + r() * 320;
    out += blob(cx, cy, rad, cols[i % cols.length], 0.6);
  }
  return out;
}

function archMesh(ctx: Ctx): string {
  const { r, field } = ctx;
  const cols = [field.glow, field.shapeA, field.shapeB];
  let out = '';
  for (let i = 0; i < 7; i++) {
    const cx = r() * VB, cy = r() * VB, rad = 150 + r() * 280;
    out += `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${rad.toFixed(0)}" fill="none" stroke="${rgba(cols[i % cols.length], 0.5)}" stroke-width="${(3 + r() * 5).toFixed(1)}"/>`;
  }
  out += blob(500, 480, 380, field.glow, 0.5);
  return out;
}

function archGeometric(ctx: Ctx): string {
  const { r, field } = ctx;
  const cols = [field.shapeA, field.glow, field.shapeB, mix(field.glow, field.bgTop, 0.3)];
  let out = blob(720, 280, 400, field.glow, 0.5);
  const shapes = 5 + Math.floor(r() * 3);
  for (let i = 0; i < shapes; i++) {
    const type = Math.floor(r() * 3);
    const c = cols[i % cols.length];
    const x = r() * VB, y = r() * VB, s = 120 + r() * 240;
    if (type === 0) out += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(s / 2).toFixed(0)}" fill="${rgba(c, 0.62)}"/>`;
    else if (type === 1) out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${s.toFixed(0)}" height="${s.toFixed(0)}" rx="${(s * 0.12).toFixed(0)}" fill="${rgba(c, 0.6)}" transform="rotate(${(r() * 45).toFixed(0)} ${(x + s / 2).toFixed(0)} ${(y + s / 2).toFixed(0)})"/>`;
    else out += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${s.toFixed(0)} 0 l${(-s / 2).toFixed(0)} ${(s * 0.86).toFixed(0)} z" fill="${rgba(c, 0.58)}"/>`;
  }
  return out;
}

function archWaves(ctx: Ctx): string {
  const { r, field } = ctx;
  const cols = [field.glow, mix(field.glow, field.shapeA, 0.4), field.shapeB, field.shapeA];
  let out = '';
  const bands = 4 + Math.floor(r() * 2);
  for (let i = 0; i < bands; i++) {
    const baseY = 220 + (i * 620) / bands + r() * 70;
    const amp = 70 + r() * 100;
    const c = cols[i % cols.length];
    const d = `M-50 ${baseY.toFixed(0)} C ${(VB * 0.25).toFixed(0)} ${(baseY - amp).toFixed(0)}, ${(VB * 0.5).toFixed(0)} ${(baseY + amp).toFixed(0)}, ${(VB * 0.75).toFixed(0)} ${baseY.toFixed(0)} S ${(VB + 50).toFixed(0)} ${(baseY - amp).toFixed(0)}, ${(VB + 50).toFixed(0)} ${baseY.toFixed(0)} L ${VB + 50} ${VB + 50} L -50 ${VB + 50} Z`;
    out += `<path d="${d}" fill="${rgba(c, 0.5)}"/>`;
  }
  return out;
}

function archGrid(ctx: Ctx): string {
  const { r, field } = ctx;
  let out = blob(500 + (r() - 0.5) * 300, 480, 400, field.glow, 0.5);
  const step = 90;
  let lines = '';
  for (let x = step; x < VB; x += step) lines += `<line x1="${x}" y1="0" x2="${x}" y2="${VB}"/>`;
  for (let y = step; y < VB; y += step) lines += `<line x1="0" y1="${y}" x2="${VB}" y2="${y}"/>`;
  out += `<g stroke="${rgba(field.motif, 0.14)}" stroke-width="1.4">${lines}</g>`;
  for (let i = 0; i < 11; i++) {
    const gx = step * (1 + Math.floor(r() * 9)), gy = step * (1 + Math.floor(r() * 9));
    out += `<circle cx="${gx}" cy="${gy}" r="${(5 + r() * 6).toFixed(1)}" fill="${rgba(field.glow, 0.95)}"/>`;
  }
  return out;
}

function archSpotlight(ctx: Ctx): string {
  const { field, r } = ctx;
  let out = blob(500, 420, 360, field.glow, 0.55);
  out += blob(220 + r() * 560, 800, 260, field.shapeB, 0.45);
  out += blob(800, 180, 220, field.shapeA, 0.45);
  return out;
}

type ArchFn = (ctx: Ctx) => string;
const ARCHETYPES: Record<string, ArchFn> = {
  aurora: archAurora, mesh: archMesh, geometric: archGeometric,
  waves: archWaves, grid: archGrid, spotlight: archSpotlight,
};

function archetypePool(spec: VisualSpec): string[] {
  const s = spec.style, n = spec.niche;
  if (['technology', 'saas'].includes(n) || ['cyberpunk', 'futuristic', 'high-tech', 'enterprise'].includes(s)) return ['grid', 'aurora', 'mesh'];
  if (['portfolio', 'fashion', 'photography', 'agency'].includes(n) || ['editorial', 'artistic', 'brutalist'].includes(s)) return ['geometric', 'mesh', 'aurora'];
  if (['food', 'wellness', 'hospitality'].includes(n) || ['organic', 'luxury', 'premium'].includes(s)) return ['spotlight', 'waves', 'aurora'];
  if (['sports'].includes(n)) return ['geometric', 'grid', 'aurora'];
  return ['aurora', 'mesh', 'geometric', 'waves'];
}

// ─── PHOTOREALISTIC SCENE BUILDERS ───────────────────────────────────────────
// Each function draws foreground scene elements on top of the atmospheric
// background. Objects use multi-stop gradients and layered shapes for 3D form.

type SceneFn = (r: () => number, field: FieldColors, pal: VisualPalette, seed: number, subject: string) => string;

// Detect the specific coffee-shop item so each menu card renders a DIFFERENT,
// recognizable drink/food — espresso ≠ iced coffee ≠ frappuccino ≠ pastry.
type Drink = 'espresso' | 'cappuccino' | 'iced' | 'frappe' | 'tea' | 'pastry' | 'beans' | 'pourover' | 'cup';
function detectDrink(subject: string): Drink {
  const s = (subject || '').toLowerCase();
  // Baked goods — check first to avoid "espresso brownie" routing to espresso
  if (/pastr|croissant|cake|cookie|muffin|donut|doughnut|snack|scone|bagel|sandwich|toast|brownie|waffle|pie/.test(s)) return 'pastry';
  // Specific drink types take priority — a "single origin espresso" IS an espresso, not a beans bag
  if (/frapp|frappe|smoothie|shake|blended|whipped|milkshake/.test(s)) return 'frappe';
  if (/iced|cold[\s-]?brew|iced latte|cold coffee|frozen/.test(s)) return 'iced';
  if (/espresso|macchiato|ristretto|cortado|doppio/.test(s)) return 'espresso';
  if (/\btea\b|matcha|chai|herbal/.test(s)) return 'tea';
  if (/cappuccino|latte|mocha|flat white|americano/.test(s)) return 'cappuccino';
  // Pour-over / brewing equipment scene — after drink types so "drip coffee" can match cappuccino first
  if (/pour.?over|v60|chemex|aeropress|manual brew|brew method|artisan brew/.test(s)) return 'pourover';
  // Coffee concepts without an explicit drink type — sourcing, beans, roastery → bag of beans scene
  if (/\bbean|farm[\s-]to|harvest|sourcing|direct.trade|small.batch|roastery/.test(s)) return 'beans';
  // Generic "coffee", "brew", "roast" → cappuccino cup as the default hot drink
  if (/coffee|brew|roast|drink/.test(s)) return 'cappuccino';
  return 'cup';
}

// ── Coffee / Cafe ─────────────────────────────────────────────────────────────
function sceneCoffee(r: () => number, field: FieldColors, pal: VisualPalette, seed: number, subject: string): string {
  const p: string[] = [];
  const woodBase = '#5c3318', woodLight = '#8a5228', woodDark = '#2e1608';
  const tableY = 700;   // lower so larger cup has vertical room
  const drink = detectDrink(subject);
  const uid = (seed % 9973);   // unique gradient ids per image (avoid collisions in a multi-image page)

  // Bokeh warmth overlay in background
  const ambers = ['#d4922a', '#e8a830', '#c47f20', '#f0b84a'];
  for (let i = 0; i < 9; i++) {
    const bx = r() * 1000, by = 80 + r() * 480;
    const br = 55 + r() * 110;
    p.push(`<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${br.toFixed(0)}" fill="${rgba(ambers[i % ambers.length], 0.38 + r() * 0.22)}" filter="url(#bokeh)"/>`);
  }

  // Wood table surface
  p.push(`<defs>
    <linearGradient id="sc-wood${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${woodLight}"/>
      <stop offset="0.25" stop-color="${woodBase}"/>
      <stop offset="1" stop-color="${woodDark}"/>
    </linearGradient>
    <filter id="sc-wood-f${uid}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.012 0.22" numOctaves="4" seed="${(seed % 97) + 2}" result="noise"/>
      <feColorMatrix type="saturate" values="0.25" result="dn"/>
      <feBlend in="SourceGraphic" in2="dn" mode="overlay"/>
    </filter>
  </defs>`);
  p.push(`<rect x="0" y="${tableY}" width="1000" height="${1000 - tableY}" fill="url(#sc-wood${uid})" filter="url(#sc-wood-f${uid})"/>`);
  p.push(`<ellipse cx="500" cy="${tableY + 5}" rx="480" ry="20" fill="${rgba(ambers[0], 0.10)}" filter="url(#bokeh)"/>`);

  const cx = 490 + Math.floor(r() * 40) - 20;

  if (drink === 'pastry')   { drawPastry(p, r, cx, tableY, uid); return p.join(''); }
  if (drink === 'iced')     { drawIcedGlass(p, r, cx, tableY, uid, false); return p.join(''); }
  if (drink === 'frappe')   { drawIcedGlass(p, r, cx, tableY, uid, true); return p.join(''); }
  if (drink === 'beans')    { drawCoffeeBeans(p, r, cx, tableY, uid); return p.join(''); }
  if (drink === 'pourover') { drawPourOver(p, r, cx, tableY, uid); return p.join(''); }

  // Hot drink in a ceramic cup (cappuccino / latte / espresso / tea / generic).
  // warmOnly=true: restrict to earthy/warm ceramic glazes appropriate for a coffee shop.
  drawHotCup(p, r, cx, tableY, uid, drink, seed, true);
  return p.join('');
}

// Hot ceramic cup on a saucer with steam, foam, and scattered beans.
// Cups are drawn large (360-420px wide) so the object fills the frame like a
// real close-up product photograph rather than a small icon on a background.
function drawHotCup(p: string[], r: () => number, cx: number, tableY: number, uid: number, drink: Drink, seed = 0, warmOnly = false): void {
  const espresso = drink === 'espresso';
  const cupW = espresso ? 260 : 380;
  const cupH = espresso ? 210 : 310;
  const rimRy = espresso ? 22 : 32;
  const cy = tableY - (espresso ? 90 : 130);
  const foamCol = drink === 'tea'
    ? { a: '#cfe8b0', b: '#a8d080', c: '#86b85e' }
    : { a: '#e8d5b0', b: '#c8b48c', c: '#a89060' };
  const liquid = drink === 'tea' ? '#7a9a3a' : '#2d1204';

  // Warm ceramics: coffee/food/wellness niches — earthy, inviting.
  // Full set: also includes matte black and navy for bar/tech niches.
  const warmCeramics = [
    { mid: '#faf7f4', lo: '#b8b0a8', hi: '#dcd6d0', rim0: '#e8e2dc', rim1: '#c0b8b0' }, // classic white
    { mid: '#b05a3a', lo: '#7a3220', hi: '#d07050', rim0: '#c86848', rim1: '#8a4030' }, // terracotta
    { mid: '#8aaa88', lo: '#5a7a58', hi: '#b0c8ae', rim0: '#9ab898', rim1: '#6a8868' }, // sage green
    { mid: '#f0e8d0', lo: '#d0c0a0', hi: '#fffae8', rim0: '#e8dcbc', rim1: '#c0b090' }, // cream
    { mid: '#c8a878', lo: '#9a7448', hi: '#e8c898', rim0: '#d8b888', rim1: '#a88858' }, // warm tan
  ];
  const allCeramics = [
    ...warmCeramics,
    { mid: '#1a1a1a', lo: '#0a0a0a', hi: '#303030', rim0: '#383838', rim1: '#181818' }, // matte black
    { mid: '#3a5a8a', lo: '#1a3060', hi: '#6080b0', rim0: '#4a6a9a', rim1: '#2a4070' }, // navy blue
  ];
  const pool = warmOnly ? warmCeramics : allCeramics;
  const cer = pool[((seed >> 0) % pool.length + pool.length) % pool.length];

  p.push(`<ellipse cx="${cx}" cy="${tableY - 2}" rx="${cupW / 2 + 20}" ry="16" fill="rgba(0,0,0,0.42)" filter="url(#blur-sm)"/>`);

  p.push(`<defs>
    <radialGradient id="sc-saucer${uid}" cx="50%" cy="30%" r="65%">
      <stop offset="0" stop-color="#f2eee9"/><stop offset="0.6" stop-color="#dbd4cc"/><stop offset="1" stop-color="#b0a89f"/>
    </radialGradient>
    <linearGradient id="sc-cup${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${cer.lo}"/><stop offset="0.12" stop-color="${cer.hi}"/>
      <stop offset="0.40" stop-color="${cer.mid}"/><stop offset="0.68" stop-color="${cer.hi}"/>
      <stop offset="1" stop-color="${cer.lo}"/>
    </linearGradient>
    <linearGradient id="sc-cup-bot${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.14)"/>
    </linearGradient>
    <linearGradient id="sc-rim${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${cer.rim0}"/><stop offset="1" stop-color="${cer.rim1}"/>
    </linearGradient>
    <radialGradient id="sc-foam${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${foamCol.a}"/><stop offset="0.7" stop-color="${foamCol.b}"/><stop offset="1" stop-color="${foamCol.c}"/>
    </radialGradient>
  </defs>`);
  // Saucer — larger to match bigger cup
  p.push(`<ellipse cx="${cx}" cy="${tableY - 6}" rx="${cupW / 2 + 48}" ry="36" fill="url(#sc-saucer${uid})"/>`);
  p.push(`<ellipse cx="${cx}" cy="${tableY - 6}" rx="${cupW / 2 + 46}" ry="34" fill="none" stroke="rgba(0,0,0,0.10)" stroke-width="2"/>`);

  const bodyTop = cy - cupH / 2 + rimRy;
  p.push(`<rect x="${cx - cupW / 2}" y="${bodyTop}" width="${cupW}" height="${cupH - rimRy}" rx="14" fill="url(#sc-cup${uid})"/>`);
  p.push(`<rect x="${cx - cupW / 2}" y="${bodyTop}" width="${cupW}" height="${cupH - rimRy}" rx="14" fill="url(#sc-cup-bot${uid})"/>`);
  p.push(`<ellipse cx="${cx}" cy="${bodyTop}" rx="${cupW / 2}" ry="${rimRy}" fill="url(#sc-rim${uid})"/>`);
  p.push(`<ellipse cx="${cx}" cy="${bodyTop}" rx="${cupW / 2 - 10}" ry="${rimRy - 6}" fill="${liquid}"/>`);
  p.push(`<ellipse cx="${cx}" cy="${bodyTop}" rx="${cupW / 2 - 10}" ry="${rimRy - 6}" fill="url(#sc-foam${uid})" opacity="${espresso ? 0.6 : 0.92}"/>`);
  // Latte art heart/swirl at larger scale
  if (!espresso) {
    p.push(`<path d="M ${cx - 36} ${bodyTop - 6} Q ${cx - 20} ${bodyTop - 22} ${cx} ${bodyTop - 5} Q ${cx + 20} ${bodyTop - 22} ${cx + 36} ${bodyTop - 6} Q ${cx + 14} ${bodyTop + 16} ${cx} ${bodyTop + 24} Q ${cx - 14} ${bodyTop + 16} ${cx - 36} ${bodyTop - 6} Z" fill="#f0dfc0" opacity="0.72"/>`);
  }

  // Handle — wider gap from cup for the bigger size
  const hRX = cx + cupW / 2, hTY = bodyTop + 46, hBY = bodyTop + (cupH - rimRy) * 0.72;
  const hBow = espresso ? 90 : 120;
  p.push(`<path d="M ${hRX} ${hTY} C ${hRX + hBow} ${hTY}, ${hRX + hBow} ${hBY}, ${hRX} ${hBY}" fill="none" stroke="#d0c8c0" stroke-width="40" stroke-linecap="round"/>`);
  p.push(`<path d="M ${hRX} ${hTY} C ${hRX + hBow - 12} ${hTY}, ${hRX + hBow - 12} ${hBY}, ${hRX} ${hBY}" fill="none" stroke="#f0ece8" stroke-width="30" stroke-linecap="round"/>`);

  // Specular highlight on ceramic
  p.push(`<ellipse cx="${cx - cupW * 0.20}" cy="${bodyTop + 70}" rx="24" ry="65" fill="rgba(255,255,255,0.20)" filter="url(#blur-xs)"/>`);

  // Steam wisps — taller to use the extra headroom
  const steamX = [cx - 65, cx, cx + 65];
  for (let i = 0; i < 3; i++) {
    const sx = steamX[i], sy = bodyTop - rimRy - 12;
    const sw = (r() - 0.5) * 45;
    p.push(`<path d="M ${sx} ${sy} Q ${sx + sw} ${sy - 80} ${sx - sw} ${sy - 170} Q ${sx + sw * 0.5} ${sy - 255} ${sx} ${sy - 320}" fill="none" stroke="rgba(255,255,255,${(0.58 - i * 0.10).toFixed(2)})" stroke-width="${7 - i * 1.5}" stroke-linecap="round" filter="url(#steam-f)"/>`);
  }

  // Coffee beans on table — spread wider to fill the larger frame
  const beanData = [[-210, 30, -28], [220, 22, 18], [270, 65, -42], [-255, 70, 35], [-125, 90, -12], [175, 82, 55], [-70, 110, 28], [310, 105, -20]];
  for (const [dx, dy, ang] of beanData) {
    const bx = cx + dx + (r() - 0.5) * 25, by = tableY + dy + (r() - 0.5) * 15, sz = 18 + r() * 8;
    p.push(`<g transform="translate(${bx.toFixed(0)},${by.toFixed(0)}) rotate(${ang})">
      <ellipse rx="${sz.toFixed(1)}" ry="${(sz * 0.55).toFixed(1)}" fill="#2d1204"/>
      <ellipse rx="${(sz - 2).toFixed(1)}" ry="${(sz * 0.48).toFixed(1)}" fill="#3d1a08"/>
      <line x1="0" y1="${(-(sz * 0.45)).toFixed(1)}" x2="0" y2="${(sz * 0.45).toFixed(1)}" stroke="#1a0802" stroke-width="2"/>
    </g>`);
  }
}

// Tall clear glass — iced coffee (with ice cubes + straw) or a frappuccino
// (with a whipped-cream dome). Drawn large so it fills the frame like a photo.
function drawIcedGlass(p: string[], r: () => number, cx: number, tableY: number, uid: number, frappe: boolean): void {
  const gW = 280, gH = 500;   // was 180×320 — now much larger
  const gTop = tableY - gH;
  const liquid = frappe ? '#b07840' : '#3a1d0a';
  const lightLiquid = frappe ? '#d8a868' : '#6a3818';

  // Shadow
  p.push(`<ellipse cx="${cx}" cy="${tableY - 2}" rx="${gW / 2 + 18}" ry="15" fill="rgba(0,0,0,0.40)" filter="url(#blur-sm)"/>`);

  p.push(`<defs>
    <linearGradient id="sc-glass${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(255,255,255,0.30)"/>
      <stop offset="0.5" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.22)"/>
    </linearGradient>
    <linearGradient id="sc-liq${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lightLiquid}"/><stop offset="1" stop-color="${liquid}"/>
    </linearGradient>
  </defs>`);

  // Liquid fill (slightly inset, tapered glass)
  const liqTop = frappe ? gTop + 40 : gTop + 55;
  p.push(`<path d="M ${cx - gW / 2 + 8} ${liqTop} L ${cx + gW / 2 - 8} ${liqTop} L ${cx + gW / 2 - 22} ${tableY - 12} L ${cx - gW / 2 + 22} ${tableY - 12} Z" fill="url(#sc-liq${uid})"/>`);

  // Ice cubes (iced) — translucent rounded squares
  if (!frappe) {
    const cubes = [[-30, 90, 12], [25, 70, -18], [-5, 130, 26], [35, 150, 8], [-35, 175, -22]];
    for (const [dx, dy, ang] of cubes) {
      const ix = cx + dx, iy = gTop + dy, sz = 42 + r() * 14;
      p.push(`<rect x="${(ix - sz / 2).toFixed(0)}" y="${(iy - sz / 2).toFixed(0)}" width="${sz.toFixed(0)}" height="${sz.toFixed(0)}" rx="9" fill="rgba(255,255,255,0.26)" stroke="rgba(255,255,255,0.40)" stroke-width="2" transform="rotate(${ang} ${ix.toFixed(0)} ${iy.toFixed(0)})"/>`);
    }
  }

  // Glass body (over liquid/ice for the front pane)
  p.push(`<path d="M ${cx - gW / 2} ${gTop} L ${cx + gW / 2} ${gTop} L ${cx + gW / 2 - 18} ${tableY - 8} L ${cx - gW / 2 + 18} ${tableY - 8} Z" fill="url(#sc-glass${uid})" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>`);
  // Vertical specular streak
  p.push(`<rect x="${cx - gW / 2 + 22}" y="${gTop + 14}" width="14" height="${gH - 60}" rx="7" fill="rgba(255,255,255,0.30)"/>`);

  if (frappe) {
    // Whipped cream dome — scaled for the larger glass
    p.push(`<defs><radialGradient id="sc-whip${uid}" cx="42%" cy="32%" r="62%">
      <stop offset="0" stop-color="#fffdf8"/><stop offset="0.7" stop-color="#f0e8d8"/><stop offset="1" stop-color="#d8ccb8"/>
    </radialGradient></defs>`);
    for (let i = 0; i < 5; i++) {
      const wy = gTop - 10 - i * 38, ww = (gW / 2 + 8) - i * 22;
      p.push(`<ellipse cx="${cx}" cy="${wy}" rx="${Math.max(ww, 12)}" ry="${34 - i * 3}" fill="url(#sc-whip${uid})"/>`);
    }
    // Cherry on top
    p.push(`<circle cx="${cx}" cy="${gTop - 200}" r="26" fill="#cc2b2b"/>`);
    p.push(`<ellipse cx="${cx - 8}" cy="${gTop - 210}" rx="8" ry="5" fill="rgba(255,255,255,0.5)"/>`);
    // Drizzle
    p.push(`<path d="M ${cx - 80} ${gTop - 20} q 18 28 0 55 M ${cx + 64} ${gTop - 28} q -18 25 2 50" fill="none" stroke="#6a3818" stroke-width="6" stroke-linecap="round"/>`);
  }

  // Straw — taller for the larger glass
  const stX = cx + 55;
  const strawH = frappe ? 340 : 360;
  const strawOff = frappe ? 240 : 110;
  p.push(`<rect x="${stX - 10}" y="${gTop - strawOff}" width="20" height="${strawH}" rx="10" fill="#e84c6a" transform="rotate(8 ${stX} ${gTop})"/>`);
  p.push(`<rect x="${stX - 10}" y="${gTop - strawOff}" width="7" height="${strawH}" rx="3.5" fill="rgba(255,255,255,0.35)" transform="rotate(8 ${stX} ${gTop})"/>`);

  // Condensation droplets (iced)
  if (!frappe) {
    for (let i = 0; i < 10; i++) {
      const dx = cx - gW / 2 + 40 + r() * (gW - 80), dy = gTop + 110 + r() * (gH - 200);
      p.push(`<circle cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" r="${(3 + r() * 4.5).toFixed(1)}" fill="rgba(255,255,255,0.40)"/>`);
    }
  }
}

// Scattered roasted coffee beans spilling from a burlap / craft bag.
function drawCoffeeBeans(p: string[], r: () => number, cx: number, tableY: number, uid: number): void {
  // Craft-paper bag body
  const bagW = 260, bagH = 340, bagX = cx - bagW / 2, bagY = tableY - bagH + 40;
  p.push(`<defs>
    <linearGradient id="sc-bag${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b08040"/><stop offset="0.45" stop-color="#d4a858"/><stop offset="1" stop-color="#8a6028"/>
    </linearGradient>
    <linearGradient id="sc-bag-v${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.12)"/><stop offset="1" stop-color="rgba(0,0,0,0.30)"/>
    </linearGradient>
  </defs>`);
  // Bag body
  p.push(`<rect x="${bagX}" y="${bagY + 28}" width="${bagW}" height="${bagH - 60}" rx="18" fill="url(#sc-bag${uid})"/>`);
  p.push(`<rect x="${bagX}" y="${bagY + 28}" width="${bagW}" height="${bagH - 60}" rx="18" fill="url(#sc-bag-v${uid})"/>`);
  // Bag fold-top crease
  p.push(`<path d="M ${bagX + 16} ${bagY + 42} Q ${cx} ${bagY + 18} ${bagX + bagW - 16} ${bagY + 42}" fill="none" stroke="rgba(100,60,10,0.5)" stroke-width="6" stroke-linecap="round"/>`);
  p.push(`<path d="M ${bagX + 28} ${bagY + 28} L ${bagX + bagW - 28} ${bagY + 28} L ${bagX + bagW - 14} ${bagY + 58} L ${bagX + 14} ${bagY + 58} Z" fill="#c09040" opacity="0.7"/>`);
  // Craft label rectangle
  p.push(`<rect x="${cx - 80}" y="${bagY + 100}" width="160" height="80" rx="8" fill="rgba(255,245,220,0.82)" stroke="rgba(120,70,20,0.4)" stroke-width="2"/>`);
  p.push(`<rect x="${cx - 72}" y="${bagY + 108}" width="144" height="64" rx="5" fill="none" stroke="rgba(120,70,20,0.25)" stroke-width="1.5"/>`);
  // Decorative bean illustration on label
  for (let i = -1; i <= 1; i++) {
    const lbx = cx + i * 34, lby = bagY + 140;
    p.push(`<ellipse cx="${lbx}" cy="${lby}" rx="11" ry="7" fill="#4a2008"/>`);
    p.push(`<line x1="${lbx}" y1="${lby - 6}" x2="${lbx}" y2="${lby + 6}" stroke="#1a0802" stroke-width="1.5"/>`);
  }
  // Burlap texture lines
  for (let i = 0; i < 5; i++) {
    const lx = bagX + 18 + i * (bagW - 36) / 4;
    p.push(`<line x1="${lx}" y1="${bagY + 65}" x2="${lx + 6}" y2="${bagY + bagH - 50}" stroke="rgba(90,55,10,0.18)" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  // Beans scattered on the table, spilling from the bag
  const beanLayout = [
    [-200, 32, -28], [210, 28, 18], [240, 62, -42],
    [-220, 70, 35], [-110, 88, -12], [160, 78, 55],
    [-55, 108, 28], [290, 102, -20], [-170, 118, 44],
    [130, 120, -38], [-90, 140, 15], [210, 145, 30],
    [-280, 58, -8], [320, 68, 22],
  ];
  for (const [dx, dy, ang] of beanLayout) {
    const bx = cx + dx + (r() - 0.5) * 22, by = tableY + dy + (r() - 0.5) * 14;
    const sz = 17 + r() * 9;
    p.push(`<g transform="translate(${bx.toFixed(0)},${by.toFixed(0)}) rotate(${ang})">
      <ellipse rx="${sz.toFixed(1)}" ry="${(sz * 0.56).toFixed(1)}" fill="#2d1204"/>
      <ellipse rx="${(sz - 2).toFixed(1)}" ry="${(sz * 0.49).toFixed(1)}" fill="#3d1a08"/>
      <line x1="0" y1="${(-(sz * 0.44)).toFixed(1)}" x2="0" y2="${(sz * 0.44).toFixed(1)}" stroke="#1a0802" stroke-width="2"/>
    </g>`);
  }
  // A few beans tumbling out of the bag mouth
  for (let i = 0; i < 4; i++) {
    const bx = cx - 50 + i * 32 + (r() - 0.5) * 18;
    const by = bagY + bagH - 20 + i * 14 + (r() - 0.5) * 10;
    const sz = 13 + r() * 7;
    const ang = r() * 60 - 30;
    p.push(`<g transform="translate(${bx.toFixed(0)},${by.toFixed(0)}) rotate(${ang})">
      <ellipse rx="${sz.toFixed(1)}" ry="${(sz * 0.55).toFixed(1)}" fill="#2d1204"/>
      <ellipse rx="${(sz - 1.5).toFixed(1)}" ry="${(sz * 0.48).toFixed(1)}" fill="#3d1a08"/>
      <line x1="0" y1="${(-(sz * 0.43)).toFixed(1)}" x2="0" y2="${(sz * 0.43).toFixed(1)}" stroke="#1a0802" stroke-width="1.5"/>
    </g>`);
  }
}

// V60 pour-over cone dripper over a clear glass carafe, with a slow pour arc.
function drawPourOver(p: string[], r: () => number, cx: number, tableY: number, uid: number): void {
  const carafeW = 200, carafeH = 320;
  const carafeX = cx - carafeW / 2, carafeTop = tableY - carafeH;
  const coneH = 220, coneW = 280;
  const coneTop = carafeTop - coneH + 40;

  // Shadow
  p.push(`<ellipse cx="${cx}" cy="${tableY - 2}" rx="185" ry="18" fill="rgba(0,0,0,0.38)" filter="url(#blur-sm)"/>`);

  p.push(`<defs>
    <linearGradient id="sc-carafe${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(255,255,255,0.28)"/>
      <stop offset="0.5" stop-color="rgba(255,255,255,0.07)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.20)"/>
    </linearGradient>
    <linearGradient id="sc-coffee${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a3818"/><stop offset="1" stop-color="#2d1204"/>
    </linearGradient>
    <linearGradient id="sc-cone${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d0c8be"/><stop offset="0.35" stop-color="#f0ece8"/><stop offset="1" stop-color="#b8b0a8"/>
    </linearGradient>
  </defs>`);

  // Carafe body (tapered glass vessel)
  const botW = carafeW - 40;
  p.push(`<path d="M ${cx - carafeW/2} ${carafeTop + 30} Q ${cx - carafeW/2 - 10} ${tableY - 50} ${cx - botW/2} ${tableY - 12} L ${cx + botW/2} ${tableY - 12} Q ${cx + carafeW/2 + 10} ${tableY - 50} ${cx + carafeW/2} ${carafeTop + 30} Z" fill="url(#sc-coffee${uid})" opacity="0.88"/>`);
  p.push(`<path d="M ${cx - carafeW/2} ${carafeTop + 30} Q ${cx - carafeW/2 - 10} ${tableY - 50} ${cx - botW/2} ${tableY - 12} L ${cx + botW/2} ${tableY - 12} Q ${cx + carafeW/2 + 10} ${tableY - 50} ${cx + carafeW/2} ${carafeTop + 30} Z" fill="url(#sc-carafe${uid})"/>`);
  // Neck
  p.push(`<rect x="${cx - 28}" y="${carafeTop}" width="56" height="40" rx="8" fill="url(#sc-carafe${uid})" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>`);
  // Specular streak on carafe
  p.push(`<rect x="${cx - carafeW/2 + 18}" y="${carafeTop + 50}" width="12" height="${carafeH - 90}" rx="6" fill="rgba(255,255,255,0.28)"/>`);
  // Carafe handle
  const hcx = cx + carafeW/2 + 14, hcy = carafeTop + 80;
  p.push(`<path d="M ${hcx} ${hcy} C ${hcx + 80} ${hcy} ${hcx + 80} ${hcy + 140} ${hcx} ${hcy + 140}" fill="none" stroke="#5c3a1a" stroke-width="32" stroke-linecap="round"/>`);
  p.push(`<path d="M ${hcx} ${hcy} C ${hcx + 65} ${hcy} ${hcx + 65} ${hcy + 140} ${hcx} ${hcy + 140}" fill="none" stroke="#8a5a2a" stroke-width="22" stroke-linecap="round"/>`);

  // V60 dripper cone (ceramic, sitting on top of carafe neck)
  const coneBaseY = coneTop + coneH;
  const coneTipY = coneTop + coneH - 18;
  p.push(`<path d="M ${cx - coneW/2} ${coneTop + 30} L ${cx - 28} ${coneTipY} L ${cx + 28} ${coneTipY} L ${cx + coneW/2} ${coneTop + 30} Z" fill="url(#sc-cone${uid})"/>`);
  // Cone rim
  p.push(`<ellipse cx="${cx}" cy="${coneTop + 30}" rx="${coneW/2}" ry="22" fill="#e8e0d8" stroke="rgba(0,0,0,0.10)" stroke-width="2"/>`);
  // Cone ridges (V60 spiral ribs)
  for (let i = -3; i <= 3; i++) {
    const rx0 = cx + i * (coneW / 2 - 24) / 3, ry0 = coneTop + 38;
    const rx1 = cx + i * 18 / 3, ry1 = coneTipY - 8;
    p.push(`<line x1="${rx0.toFixed(0)}" y1="${ry0}" x2="${rx1.toFixed(0)}" y2="${ry1}" stroke="rgba(0,0,0,0.10)" stroke-width="2.5" stroke-linecap="round"/>`);
  }
  // Filter paper (white triangle inside cone)
  p.push(`<path d="M ${cx - coneW/2 + 22} ${coneTop + 44} L ${cx - 12} ${coneTipY - 4} L ${cx + 12} ${coneTipY - 4} L ${cx + coneW/2 - 22} ${coneTop + 44} Z" fill="rgba(255,252,248,0.72)"/>`);
  // Coffee grounds in filter
  p.push(`<path d="M ${cx - coneW/2 + 50} ${coneTop + 80} L ${cx - 14} ${coneTipY - 8} L ${cx + 14} ${coneTipY - 8} L ${cx + coneW/2 - 50} ${coneTop + 80} Z" fill="#4a2208" opacity="0.82"/>`);

  // Pour arc — thin stream of water from above
  const pourX = cx + 20;
  const pourStart = coneTop - 120;
  p.push(`<path d="M ${pourX + 55} ${pourStart} Q ${pourX + 30} ${pourStart + 60} ${pourX} ${coneTop + 50}" fill="none" stroke="rgba(200,220,240,0.70)" stroke-width="7" stroke-linecap="round" filter="url(#blur-xs)"/>`);
  p.push(`<path d="M ${pourX + 55} ${pourStart} Q ${pourX + 30} ${pourStart + 60} ${pourX} ${coneTop + 50}" fill="none" stroke="rgba(255,255,255,0.50)" stroke-width="4" stroke-linecap="round"/>`);
  // Kettle spout hint
  p.push(`<path d="M ${pourX + 60} ${pourStart - 30} Q ${pourX + 80} ${pourStart - 10} ${pourX + 55} ${pourStart + 10}" fill="none" stroke="#b0b8c0" stroke-width="24" stroke-linecap="round"/>`);
  p.push(`<path d="M ${pourX + 60} ${pourStart - 30} Q ${pourX + 80} ${pourStart - 10} ${pourX + 55} ${pourStart + 10}" fill="none" stroke="#d8dde2" stroke-width="16" stroke-linecap="round"/>`);

  // Steam from cone
  const stSX = cx - 20, stSY = coneTop + 24;
  p.push(`<path d="M ${stSX} ${stSY} Q ${stSX - 18} ${stSY - 55} ${stSX + 14} ${stSY - 110}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="5" stroke-linecap="round" filter="url(#steam-f)"/>`);
}

// A pastry / baked good on a small plate.
function drawPastry(p: string[], r: () => number, cx: number, tableY: number, uid: number): void {
  const py = tableY - 40;
  // Plate
  p.push(`<ellipse cx="${cx}" cy="${tableY}" rx="180" ry="30" fill="rgba(0,0,0,0.28)" filter="url(#blur-sm)"/>`);
  p.push(`<defs>
    <radialGradient id="sc-plate${uid}" cx="40%" cy="30%" r="65%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#efe9e2"/><stop offset="1" stop-color="#cfc6bd"/>
    </radialGradient>
    <linearGradient id="sc-crust${uid}" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#e8b96a"/><stop offset="0.5" stop-color="#c8893a"/><stop offset="1" stop-color="#9c5e20"/>
    </linearGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx}" cy="${py + 36}" rx="175" ry="30" fill="url(#sc-plate${uid})"/>`);
  p.push(`<ellipse cx="${cx}" cy="${py + 36}" rx="150" ry="24" fill="none" stroke="rgba(0,0,0,0.07)" stroke-width="2"/>`);

  // Croissant — layered crescent
  p.push(`<path d="M ${cx - 120} ${py + 20} Q ${cx - 90} ${py - 55} ${cx} ${py - 48} Q ${cx + 90} ${py - 55} ${cx + 120} ${py + 20} Q ${cx + 70} ${py + 5} ${cx} ${py + 8} Q ${cx - 70} ${py + 5} ${cx - 120} ${py + 20} Z" fill="url(#sc-crust${uid})"/>`);
  // Flaky layer seams
  for (let i = -2; i <= 2; i++) {
    const sx = cx + i * 38;
    p.push(`<path d="M ${sx} ${py - 44} Q ${sx + 6} ${py - 18} ${sx} ${py + 6}" fill="none" stroke="rgba(120,70,20,0.45)" stroke-width="3" stroke-linecap="round"/>`);
  }
  // Glaze sheen
  p.push(`<path d="M ${cx - 90} ${py - 38} Q ${cx} ${py - 50} ${cx + 90} ${py - 38}" fill="none" stroke="rgba(255,240,200,0.55)" stroke-width="5" stroke-linecap="round"/>`);
  // Crumbs
  for (let i = 0; i < 6; i++) {
    const dx = cx + (r() - 0.5) * 280, dy = py + 30 + (r() - 0.5) * 16;
    p.push(`<circle cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" r="${(2 + r() * 3).toFixed(1)}" fill="#b87a32"/>`);
  }
}

// ── Food / Restaurant ─────────────────────────────────────────────────────────
function sceneFood(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const tableY = 650;
  const warm = mix(pal.accent || '#d4922a', '#f5a020', 0.5);

  // Ambient bokeh
  for (let i = 0; i < 8; i++) {
    p.push(`<circle cx="${(r() * 1000).toFixed(0)}" cy="${(50 + r() * 500).toFixed(0)}" r="${(45 + r() * 90).toFixed(0)}" fill="${rgba(warm, 0.3 + r() * 0.2)}" filter="url(#bokeh)"/>`);
  }

  // Table cloth
  const tcColors = ['#f5f0eb', '#e8e0d8'];
  p.push(`<defs>
    <linearGradient id="sc-tc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${tcColors[0]}"/><stop offset="1" stop-color="${tcColors[1]}"/>
    </linearGradient>
    <filter id="sc-tc-f" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="${(seed % 80) + 5}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="soft-light"/>
    </filter>
  </defs>`);
  p.push(`<rect x="0" y="${tableY}" width="1000" height="${1000 - tableY}" fill="url(#sc-tc)" filter="url(#sc-tc-f)"/>`);

  const cx = 500, plateY = tableY - 80;

  // Plate shadow
  p.push(`<ellipse cx="${cx}" cy="${tableY + 2}" rx="175" ry="18" fill="rgba(0,0,0,0.30)" filter="url(#blur-sm)"/>`);

  // Plate
  p.push(`<defs>
    <radialGradient id="sc-plate" cx="38%" cy="28%" r="65%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#f4f0ec"/>
      <stop offset="0.85" stop-color="#e0d8d0"/><stop offset="1" stop-color="#c8c0b8"/>
    </radialGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx}" cy="${plateY}" rx="170" ry="28" fill="url(#sc-plate)"/>`);
  p.push(`<ellipse cx="${cx}" cy="${plateY}" rx="155" ry="24" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="2"/>`);
  // Raised rim
  p.push(`<ellipse cx="${cx}" cy="${plateY}" rx="140" ry="20" fill="#f8f5f2"/>`);

  // Food items on plate — colorful arranged pieces
  const foods = [
    { dx: -45, dy: -4, rx: 38, ry: 14, color: '#c0392b', deco: '#a93226' }, // red
    { dx: 35, dy: -5, rx: 32, ry: 12, color: '#e67e22', deco: '#d35400' }, // orange
    { dx: -8, dy: -8, rx: 28, ry: 10, color: '#27ae60', deco: '#1e8449' }, // green
    { dx: 50, dy: 6, rx: 24, ry: 9, color: '#f1c40f', deco: '#d4ac0d' }, // yellow
    { dx: -55, dy: 8, rx: 20, ry: 8, color: '#8e44ad', deco: '#7d3c98' }, // purple
  ];
  for (const f of foods) {
    p.push(`<ellipse cx="${cx + f.dx}" cy="${plateY + f.dy}" rx="${f.rx}" ry="${f.ry}" fill="${f.color}"/>`);
    p.push(`<ellipse cx="${cx + f.dx - f.rx * 0.2}" cy="${plateY + f.dy - f.ry * 0.25}" rx="${f.rx * 0.4}" ry="${f.ry * 0.35}" fill="rgba(255,255,255,0.20)"/>`);
  }

  // Herb garnish
  for (let i = 0; i < 5; i++) {
    const gx = cx + (r() - 0.5) * 120, gy = plateY + (r() - 0.5) * 16;
    p.push(`<ellipse cx="${gx.toFixed(0)}" cy="${gy.toFixed(0)}" rx="${(6 + r() * 5).toFixed(0)}" ry="${(3 + r() * 2).toFixed(0)}" fill="#2ecc71" transform="rotate(${(r() * 60 - 30).toFixed(0)} ${gx.toFixed(0)} ${gy.toFixed(0)})"/>`);
  }

  // Fork & knife
  const fkX = cx - 215, knX = cx + 185;
  p.push(`<rect x="${fkX - 3}" y="${tableY - 155}" width="6" height="140" rx="3" fill="#c0b8b0"/>`);
  p.push(`<rect x="${knX - 3}" y="${tableY - 155}" width="6" height="140" rx="3" fill="#c0b8b0"/>`);
  p.push(`<rect x="${knX - 5}" y="${tableY - 155}" width="10" height="45" rx="5" fill="#d0c8c0"/>`);
  for (let i = -1; i <= 1; i++) {
    p.push(`<line x1="${fkX + i * 4}" y1="${tableY - 155}" x2="${fkX + i * 4}" y2="${tableY - 120}" stroke="#c0b8b0" stroke-width="2.5" stroke-linecap="round"/>`);
  }

  return p.join('');
}

// ── Ramen / Asian Bowl ────────────────────────────────────────────────────────
function sceneRamen(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const tableY = 660;

  for (let i = 0; i < 7; i++) {
    p.push(`<circle cx="${(r() * 1000).toFixed(0)}" cy="${(60 + r() * 500).toFixed(0)}" r="${(50 + r() * 100).toFixed(0)}" fill="${rgba(mix('#c0392b', '#e67e22', r()), 0.28 + r() * 0.18)}" filter="url(#bokeh)"/>`);
  }

  // Dark wood table
  p.push(`<defs>
    <linearGradient id="sc-dwood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2010"/><stop offset="1" stop-color="#1a0c06"/>
    </linearGradient>
  </defs>`);
  p.push(`<rect x="0" y="${tableY}" width="1000" height="${1000 - tableY}" fill="url(#sc-dwood)"/>`);

  const cx = 500, bowlY = tableY - 90;
  const bowlRX = 175, bowlRY = 38;

  // Bowl shadow
  p.push(`<ellipse cx="${cx}" cy="${tableY + 2}" rx="${bowlRX + 18}" ry="20" fill="rgba(0,0,0,0.50)" filter="url(#blur-sm)"/>`);

  // Bowl exterior
  p.push(`<defs>
    <linearGradient id="sc-bowl-ext" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c1210"/><stop offset="0.15" stop-color="#3a2820"/>
      <stop offset="0.5" stop-color="#4a3428"/><stop offset="0.85" stop-color="#302018"/>
      <stop offset="1" stop-color="#180e0a"/>
    </linearGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx}" cy="${bowlY}" rx="${bowlRX}" ry="${bowlRY}" fill="url(#sc-bowl-ext)"/>`);

  // Broth surface (inside bowl)
  p.push(`<defs>
    <radialGradient id="sc-broth" cx="40%" cy="30%" r="70%">
      <stop offset="0" stop-color="#c4780a"/><stop offset="0.5" stop-color="#a0600a"/>
      <stop offset="1" stop-color="#703808"/>
    </radialGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx}" cy="${bowlY}" rx="${bowlRX - 10}" ry="${bowlRY - 4}" fill="url(#sc-broth)"/>`);

  // Noodle mass
  const noodleY = bowlY + 2;
  for (let i = 0; i < 6; i++) {
    const ny = noodleY + (i - 2.5) * 5;
    const sw = 3 + r() * 2;
    const cx1 = 350 + r() * 80, cx2 = 550 + r() * 80;
    p.push(`<path d="M ${cx - bowlRX * 0.7} ${ny.toFixed(0)} Q ${cx1.toFixed(0)} ${(ny - 15 + r() * 20).toFixed(0)} ${cx.toFixed(0)} ${(ny + 5 - r() * 8).toFixed(0)} Q ${cx2.toFixed(0)} ${(ny - 10 + r() * 18).toFixed(0)} ${cx + bowlRX * 0.7} ${ny.toFixed(0)}" fill="none" stroke="#e8d098" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="0.82"/>`);
  }

  // Toppings
  // Chashu (pork slice)
  p.push(`<defs>
    <linearGradient id="sc-chashu" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c0503a"/><stop offset="0.5" stop-color="#a03828"/><stop offset="1" stop-color="#803020"/>
    </linearGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx - 60}" cy="${bowlY - 8}" rx="38" ry="22" fill="url(#sc-chashu)" transform="rotate(-15 ${cx - 60} ${bowlY - 8})"/>`);
  p.push(`<ellipse cx="${cx - 60}" cy="${bowlY - 10}" rx="28" ry="14" fill="${rgba('#d06048', 0.5)}" transform="rotate(-15 ${cx - 60} ${bowlY - 10})"/>`);

  // Soft-boiled egg half
  p.push(`<defs>
    <radialGradient id="sc-egg" cx="42%" cy="35%" r="58%">
      <stop offset="0" stop-color="#f5e8b0"/><stop offset="0.5" stop-color="#f0c850"/><stop offset="1" stop-color="#e0a030"/>
    </radialGradient>
    <radialGradient id="sc-egg-white" cx="42%" cy="35%" r="58%">
      <stop offset="0" stop-color="#faf8f2"/><stop offset="1" stop-color="#e8e4d8"/>
    </radialGradient>
  </defs>`);
  p.push(`<ellipse cx="${cx + 65}" cy="${bowlY - 5}" rx="30" ry="26" fill="url(#sc-egg-white)"/>`);
  p.push(`<ellipse cx="${cx + 65}" cy="${bowlY - 5}" rx="18" ry="16" fill="url(#sc-egg)"/>`);

  // Green onion
  for (let i = 0; i < 8; i++) {
    const ox = cx + (r() - 0.5) * 120, oy = bowlY + (r() - 0.5) * 20;
    p.push(`<ellipse cx="${ox.toFixed(0)}" cy="${oy.toFixed(0)}" rx="${(5 + r() * 4).toFixed(0)}" ry="${(2 + r() * 1.5).toFixed(0)}" fill="#4db848" transform="rotate(${(r() * 60 - 30).toFixed(0)} ${ox.toFixed(0)} ${oy.toFixed(0)})"/>`);
  }

  // Nori sheet
  p.push(`<rect x="${cx + 90}" y="${bowlY - 28}" width="18" height="48" rx="3" fill="#1a2a18" transform="rotate(8 ${cx + 90} ${bowlY})"/>`);

  // Bowl outer rim gloss
  p.push(`<ellipse cx="${cx - bowlRX * 0.30}" cy="${bowlY - bowlRY * 0.55}" rx="${bowlRX * 0.18}" ry="${bowlRY * 0.22}" fill="rgba(255,255,255,0.16)" filter="url(#blur-xs)"/>`);

  return p.join('');
}

// ── Technology / SaaS ─────────────────────────────────────────────────────────
function sceneTechnology(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const accent = pal.accent || '#3b82f6';
  const glowCol = lum(accent) > 0.5 ? accent : shade(accent, 0.35);

  // Floating glass panels
  const panels = [
    { x: 120, y: 200, w: 320, h: 210, rot: -6, alpha: 0.78 },
    { x: 520, y: 150, w: 360, h: 250, rot: 4, alpha: 0.82 },
    { x: 200, y: 480, w: 580, h: 200, rot: -2, alpha: 0.72 },
  ];
  p.push(`<defs>
    <linearGradient id="sc-glass" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="0.5" stop-color="rgba(255,255,255,0.06)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.10)"/>
    </linearGradient>
  </defs>`);

  for (const panel of panels) {
    const px = panel.x, py = panel.y;
    p.push(`<g transform="rotate(${panel.rot} ${px + panel.w / 2} ${py + panel.h / 2})">`);
    p.push(`<rect x="${px}" y="${py}" width="${panel.w}" height="${panel.h}" rx="14" fill="${rgba(shade(pal.primary || '#1e293b', -0.2), panel.alpha)}" stroke="${rgba(glowCol, 0.35)}" stroke-width="1.5"/>`);
    p.push(`<rect x="${px}" y="${py}" width="${panel.w}" height="${panel.h}" rx="14" fill="url(#sc-glass)"/>`);
    // Traffic lights
    for (let i = 0; i < 3; i++) {
      const tlColors = ['#ff5f57', '#febc2e', '#28c840'];
      p.push(`<circle cx="${px + 20 + i * 18}" cy="${py + 18}" r="6" fill="${tlColors[i]}"/>`);
    }
    // Fake code lines
    const lineColors = [rgba(glowCol, 0.8), rgba('#f8f8f2', 0.5), rgba('#a8b8c8', 0.5), rgba(glowCol, 0.6)];
    for (let li = 0; li < Math.floor(panel.h / 28) - 2; li++) {
      const lw = 40 + r() * (panel.w * 0.65);
      p.push(`<rect x="${px + 30}" y="${py + 42 + li * 26}" width="${lw.toFixed(0)}" height="7" rx="3.5" fill="${lineColors[li % lineColors.length]}"/>`);
      if (r() > 0.45) {
        const lw2 = 20 + r() * (panel.w * 0.4);
        p.push(`<rect x="${px + 30 + lw + 10}" y="${py + 42 + li * 26}" width="${lw2.toFixed(0)}" height="7" rx="3.5" fill="${rgba('#f8f8f2', 0.28)}"/>`);
      }
    }
    p.push(`</g>`);
  }

  // Glow nodes / data points
  for (let i = 0; i < 14; i++) {
    const nx = 80 + r() * 840, ny = 80 + r() * 840;
    const nr = 3 + r() * 7;
    p.push(`<circle cx="${nx.toFixed(0)}" cy="${ny.toFixed(0)}" r="${nr.toFixed(1)}" fill="${rgba(glowCol, 0.9)}" filter="url(#blur-xs)"/>`);
  }

  // Connection lines between panels
  p.push(`<line x1="440" y1="305" x2="520" y2="275" stroke="${rgba(glowCol, 0.45)}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  p.push(`<line x1="700" y1="400" x2="680" y2="480" stroke="${rgba(glowCol, 0.35)}" stroke-width="1.5" stroke-dasharray="4 4"/>`);
  p.push(`<line x1="280" y1="410" x2="260" y2="480" stroke="${rgba(glowCol, 0.40)}" stroke-width="1.5" stroke-dasharray="4 4"/>`);

  // Accent glow
  p.push(`<circle cx="500" cy="480" r="280" fill="${rgba(glowCol, 0.08)}" filter="url(#soft)"/>`);

  return p.join('');
}

// ── Fitness / Sports ──────────────────────────────────────────────────────────
function sceneFitness(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const energy = pal.accent || '#ef4444';
  const darkFloor = shade(pal.primary || '#1a1a2e', -0.3);

  // Dynamic radial energy burst
  const burstX = 500, burstY = 520;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const len = 180 + r() * 220;
    const ex = burstX + Math.cos(angle) * len;
    const ey = burstY + Math.sin(angle) * len;
    p.push(`<line x1="${burstX}" y1="${burstY}" x2="${ex.toFixed(0)}" y2="${ey.toFixed(0)}" stroke="${rgba(energy, 0.18 + r() * 0.15)}" stroke-width="${(2 + r() * 4).toFixed(1)}" stroke-linecap="round"/>`);
  }
  p.push(blob(burstX, burstY, 280, energy, 0.18));

  // Floor
  p.push(`<defs>
    <linearGradient id="sc-floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(darkFloor, 0.15)}"/><stop offset="1" stop-color="${darkFloor}"/>
    </linearGradient>
  </defs>`);
  p.push(`<rect x="0" y="720" width="1000" height="280" fill="url(#sc-floor)"/>`);
  p.push(`<line x1="0" y1="720" x2="1000" y2="720" stroke="${rgba(energy, 0.35)}" stroke-width="2.5"/>`);

  // Dumbbell
  const dbCX = 490, dbCY = 620;
  p.push(`<defs>
    <linearGradient id="sc-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#606060"/><stop offset="0.3" stop-color="#909090"/>
      <stop offset="0.6" stop-color="#787878"/><stop offset="1" stop-color="#484848"/>
    </linearGradient>
  </defs>`);
  // Bar
  p.push(`<rect x="${dbCX - 150}" y="${dbCY - 8}" width="300" height="16" rx="8" fill="url(#sc-metal)"/>`);
  // Left plate
  for (let pl = 0; pl < 3; pl++) {
    const px = dbCX - 150 - pl * 14;
    const ph = 55 + pl * 12, pw = 26 - pl * 4;
    p.push(`<rect x="${px - pw / 2}" y="${dbCY - ph / 2}" width="${pw}" height="${ph}" rx="5" fill="${shade('#505050', pl * 0.08)}" stroke="${rgba('#808080', 0.5)}" stroke-width="1.5"/>`);
  }
  // Right plate
  for (let pl = 0; pl < 3; pl++) {
    const px = dbCX + 150 + pl * 14;
    const ph = 55 + pl * 12, pw = 26 - pl * 4;
    p.push(`<rect x="${px - pw / 2}" y="${dbCY - ph / 2}" width="${pw}" height="${ph}" rx="5" fill="${shade('#505050', pl * 0.08)}" stroke="${rgba('#808080', 0.5)}" stroke-width="1.5"/>`);
  }
  // Specular on bar
  p.push(`<rect x="${dbCX - 120}" y="${dbCY - 7}" width="240" height="5" rx="2.5" fill="rgba(255,255,255,0.20)"/>`);

  // Motion lines
  for (let i = 0; i < 5; i++) {
    const ly = dbCY - 40 + i * 20, lx = dbCX + 160 + i * 12;
    p.push(`<line x1="${lx}" y1="${ly}" x2="${lx + 40 + r() * 30}" y2="${ly}" stroke="${rgba(energy, 0.5 - i * 0.08)}" stroke-width="${(3 - i * 0.4).toFixed(1)}" stroke-linecap="round"/>`);
  }

  // Stat chips
  const stats = ['REP 12', 'SET 4', '85 KG'];
  for (let i = 0; i < stats.length; i++) {
    const sx = 130 + i * 270, sy = 820;
    p.push(`<rect x="${sx - 55}" y="${sy - 22}" width="110" height="44" rx="8" fill="${rgba(energy, 0.20)}" stroke="${rgba(energy, 0.60)}" stroke-width="1.5"/>`);
    p.push(`<text x="${sx}" y="${sy + 6}" text-anchor="middle" font-family="monospace" font-size="17" fill="${rgba('#ffffff', 0.90)}" font-weight="700">${stats[i]}</text>`);
  }

  return p.join('');
}

// ── Wellness / Spa / Yoga ─────────────────────────────────────────────────────
function sceneWellness(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const zen = mix(pal.accent || '#10b981', '#34d399', 0.4);
  const stone = '#8a8a8a', stoneLight = '#c8c8c8', stoneDark = '#4a4a4a';

  // Soft water ripples
  for (let i = 1; i <= 5; i++) {
    p.push(`<ellipse cx="500" cy="620" rx="${80 * i}" ry="${28 * i}" fill="none" stroke="${rgba(zen, 0.18 - i * 0.025)}" stroke-width="${3.5 - i * 0.4}"/>`);
  }

  // Water surface pool
  p.push(`<defs>
    <radialGradient id="sc-water" cx="45%" cy="40%" r="65%">
      <stop offset="0" stop-color="${mix(zen, '#1a3a48', 0.3)}"/>
      <stop offset="0.6" stop-color="${mix(zen, '#0d2530', 0.5)}"/>
      <stop offset="1" stop-color="${shade(pal.primary || '#0f4c5c', -0.2)}"/>
    </radialGradient>
  </defs>`);
  p.push(`<ellipse cx="500" cy="650" rx="340" ry="85" fill="url(#sc-water)" opacity="0.75"/>`);
  // Water reflection sheen
  p.push(`<ellipse cx="460" cy="630" rx="120" ry="22" fill="${rgba('#ffffff', 0.12)}" filter="url(#blur-xs)"/>`);

  // Stones (3D spheres using radial gradients)
  const stoneData = [
    { cx: 500, cy: 460, rx: 68, ry: 52, label: 'sc-s1' },
    { cx: 500, cy: 390, rx: 55, ry: 42, label: 'sc-s2' },
    { cx: 500, cy: 328, rx: 42, ry: 32, label: 'sc-s3' },
    { cx: 400, cy: 510, rx: 48, ry: 36, label: 'sc-s4' },
    { cx: 598, cy: 510, rx: 45, ry: 34, label: 'sc-s5' },
  ];
  p.push(`<defs>`);
  for (let i = 0; i < stoneData.length; i++) {
    const s = stoneData[i];
    const lightness = 0.08 + i * 0.04;
    p.push(`<radialGradient id="${s.label}" cx="35%" cy="28%" r="68%">
      <stop offset="0" stop-color="${shade(stoneLight, lightness)}"/>
      <stop offset="0.45" stop-color="${stone}"/>
      <stop offset="1" stop-color="${shade(stoneDark, -0.15)}"/>
    </radialGradient>`);
  }
  p.push(`</defs>`);
  for (let i = stoneData.length - 1; i >= 0; i--) {
    const s = stoneData[i];
    p.push(`<ellipse cx="${s.cx}" cy="${s.cy + 6}" rx="${s.rx - 5}" ry="${Math.round(s.ry * 0.25)}" fill="rgba(0,0,0,0.25)" filter="url(#blur-xs)"/>`);
    p.push(`<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="url(#${s.label})"/>`);
    p.push(`<ellipse cx="${s.cx - s.rx * 0.22}" cy="${s.cy - s.ry * 0.28}" rx="${s.rx * 0.30}" ry="${s.ry * 0.22}" fill="rgba(255,255,255,0.22)" filter="url(#blur-xs)"/>`);
  }

  // Botanical leaves
  const leafData = [[-240, -80, -35], [235, -60, 40], [-180, 80, 20], [220, 95, -28]];
  for (const [dx, dy, rot] of leafData) {
    const lx = 500 + dx, ly = 500 + dy;
    p.push(`<g transform="translate(${lx},${ly}) rotate(${rot})">
      <path d="M 0 -55 Q 38 -15 0 45 Q -38 -15 0 -55 Z" fill="${rgba(zen, 0.72)}"/>
      <line x1="0" y1="-55" x2="0" y2="45" stroke="${rgba(shade(zen, 0.3), 0.50)}" stroke-width="1.8"/>
    </g>`);
  }

  // Subtle incense smoke
  for (let i = 0; i < 2; i++) {
    const sx = 500 + (i === 0 ? -25 : 25);
    p.push(`<path d="M ${sx} 250 Q ${sx + 18} 215 ${sx - 12} 180 Q ${sx + 10} 145 ${sx} 110" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3" stroke-linecap="round" filter="url(#steam-f)"/>`);
  }

  return p.join('');
}

// ── Photography ───────────────────────────────────────────────────────────────
function scenePhotography(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const accent = pal.accent || '#f59e0b';

  // Bokeh balls (out-of-focus lights)
  for (let i = 0; i < 16; i++) {
    const bx = r() * 1000, by = r() * 700;
    const br = 25 + r() * 70;
    p.push(`<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="${br.toFixed(0)}" fill="${rgba(i % 2 === 0 ? accent : shade(accent, 0.4), 0.35 + r() * 0.3)}" filter="url(#bokeh)"/>`);
  }

  // Camera body
  const camX = 330, camY = 380, camW = 380, camH = 260;
  p.push(`<defs>
    <linearGradient id="sc-cam" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#383838"/><stop offset="0.4" stop-color="#282828"/>
      <stop offset="1" stop-color="#181818"/>
    </linearGradient>
    <radialGradient id="sc-lens" cx="42%" cy="38%" r="58%">
      <stop offset="0" stop-color="#606880"/><stop offset="0.3" stop-color="#303848"/>
      <stop offset="0.7" stop-color="#181c28"/><stop offset="1" stop-color="#0c0e18"/>
    </radialGradient>
    <radialGradient id="sc-lens-g" cx="35%" cy="30%" r="55%">
      <stop offset="0" stop-color="${rgba(accent, 0.35)}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>`);
  p.push(`<rect x="${camX}" y="${camY}" width="${camW}" height="${camH}" rx="18" fill="url(#sc-cam)"/>`);
  // Grip
  p.push(`<rect x="${camX}" y="${camY + 80}" width="80" height="${camH - 80}" rx="14" fill="#202020"/>`);
  // Shutter button
  p.push(`<circle cx="${camX + 68}" cy="${camY + 18}" r="14" fill="#404040"/>`);
  p.push(`<circle cx="${camX + 68}" cy="${camY + 18}" r="9" fill="${shade(accent, -0.2)}"/>`);
  // Mode dial
  p.push(`<circle cx="${camX + camW - 50}" cy="${camY + 22}" r="22" fill="#303030"/>`);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.push(`<line x1="${camX + camW - 50 + Math.cos(a) * 14}" y1="${camY + 22 + Math.sin(a) * 14}" x2="${camX + camW - 50 + Math.cos(a) * 20}" y2="${camY + 22 + Math.sin(a) * 20}" stroke="${rgba('#808080', 0.8)}" stroke-width="2"/>`);
  }
  // Lens barrel
  const lensX = camX + 155, lensY = camY + camH / 2;
  for (let ring = 4; ring >= 0; ring--) {
    const rr = 55 + ring * 22;
    p.push(`<circle cx="${lensX}" cy="${lensY}" r="${rr}" fill="#${['282828', '303030', '383838', '404040', '484848'][ring]}" stroke="${rgba('#606060', 0.4)}" stroke-width="1.5"/>`);
  }
  p.push(`<circle cx="${lensX}" cy="${lensY}" r="55" fill="url(#sc-lens)"/>`);
  p.push(`<circle cx="${lensX}" cy="${lensY}" r="55" fill="url(#sc-lens-g)"/>`);
  // Lens glass reflection
  p.push(`<ellipse cx="${lensX - 14}" cy="${lensY - 16}" rx="16" ry="12" fill="rgba(255,255,255,0.18)" filter="url(#blur-xs)"/>`);

  // Viewfinder
  p.push(`<rect x="${camX + 240}" y="${camY + 20}" width="90" height="60" rx="6" fill="#202020"/>`);
  p.push(`<rect x="${camX + 245}" y="${camY + 25}" width="80" height="50" rx="4" fill="#0a1020"/>`);

  // Lens cap nearby
  const lcX = camX + 490, lcY = camY + camH + 60;
  p.push(`<ellipse cx="${lcX}" cy="${lcY}" rx="48" ry="14" fill="rgba(0,0,0,0.30)" filter="url(#blur-xs)"/>`);
  p.push(`<circle cx="${lcX}" cy="${lcY - 8}" r="52" fill="#282828"/>`);
  p.push(`<circle cx="${lcX}" cy="${lcY - 8}" r="48" fill="#303030"/>`);
  p.push(`<circle cx="${lcX}" cy="${lcY - 8}" r="36" fill="#202020"/>`);

  return p.join('');
}

// ── Fashion / Apparel ─────────────────────────────────────────────────────────
function sceneFashion(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const accent = pal.accent || '#ec4899';
  const fabricBase = lum(pal.primary) > 0.5 ? shade(pal.primary, -0.15) : pal.primary;

  // Soft light studio background
  p.push(blob(500, 400, 380, mix(accent, '#ffffff', 0.5), 0.18));
  p.push(blob(250, 600, 220, shade(accent, 0.3), 0.15));
  p.push(blob(750, 300, 200, shade(accent, 0.2), 0.12));

  // Garment — stylized dress/shirt form
  const gCX = 500, gTY = 200;
  p.push(`<defs>
    <linearGradient id="sc-fabric" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${shade(fabricBase, 0.15)}"/>
      <stop offset="0.5" stop-color="${fabricBase}"/>
      <stop offset="1" stop-color="${shade(fabricBase, -0.25)}"/>
    </linearGradient>
    <filter id="sc-fab-f" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="2" seed="${(seed % 70) + 3}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feBlend in="SourceGraphic" mode="soft-light" result="out"/>
      <feComposite in="out" in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>`);

  // Dress/shirt outline path — flowing shape
  p.push(`<path d="M ${gCX - 55} ${gTY} C ${gCX - 65} ${gTY + 60} ${gCX - 90} ${gTY + 120} ${gCX - 140} ${gTY + 310} Q ${gCX - 160} ${gTY + 440} ${gCX - 100} ${gTY + 530} L ${gCX + 100} ${gTY + 530} Q ${gCX + 160} ${gTY + 440} ${gCX + 140} ${gTY + 310} C ${gCX + 90} ${gTY + 120} ${gCX + 65} ${gTY + 60} ${gCX + 55} ${gTY} Q ${gCX + 35} ${gTY - 20} ${gCX} ${gTY - 28} Q ${gCX - 35} ${gTY - 20} ${gCX - 55} ${gTY} Z" fill="url(#sc-fabric)" filter="url(#sc-fab-f)"/>`);

  // Collar/neckline highlight
  p.push(`<path d="M ${gCX - 35} ${gTY - 5} Q ${gCX} ${gTY + 20} ${gCX + 35} ${gTY - 5}" fill="none" stroke="${rgba('#ffffff', 0.30)}" stroke-width="3"/>`);

  // Drape fold lines (fabric texture)
  for (let i = 0; i < 5; i++) {
    const foldX = gCX - 80 + i * 40;
    p.push(`<path d="M ${foldX} ${gTY + 80 + i * 15} C ${foldX + (r() - 0.5) * 20} ${gTY + 180} ${foldX + (r() - 0.5) * 25} ${gTY + 300} ${foldX + (r() - 0.5) * 15} ${gTY + 430}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="1.5"/>`);
  }

  // Accent details — buttons, trim
  for (let b = 0; b < 4; b++) {
    p.push(`<circle cx="${gCX}" cy="${gTY + 80 + b * 65}" r="5" fill="${rgba(accent, 0.90)}"/>`);
    p.push(`<circle cx="${gCX}" cy="${gTY + 80 + b * 65}" r="3" fill="${rgba('#ffffff', 0.50)}"/>`);
  }

  // Brand label chip
  p.push(`<rect x="${gCX - 70}" y="${gTY + 620}" width="140" height="38" rx="6" fill="${rgba(accent, 0.18)}" stroke="${rgba(accent, 0.55)}" stroke-width="1.5"/>`);
  p.push(`<text x="${gCX}" y="${gTY + 644}" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${rgba(accent, 0.92)}" letter-spacing="3">FASHION</text>`);

  return p.join('');
}

// ── Agency / Portfolio / General ──────────────────────────────────────────────
function sceneGeneral(r: () => number, field: FieldColors, pal: VisualPalette, seed: number): string {
  const p: string[] = [];
  const accent = pal.accent || field.glow;

  // 3D floating cards / panels — premium minimal layout
  const cards = [
    { x: 130, y: 220, w: 280, h: 180, depth: 12 },
    { x: 560, y: 160, w: 320, h: 210, depth: 16 },
    { x: 210, y: 520, w: 240, h: 160, depth: 10 },
    { x: 580, y: 480, w: 280, h: 200, depth: 14 },
  ];

  p.push(`<defs>
    <linearGradient id="sc-card-g" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="0.5" stop-color="rgba(255,255,255,0.07)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.12)"/>
    </linearGradient>
  </defs>`);

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const rot = (r() - 0.5) * 8;
    const baseCol = i % 2 === 0 ? shade(pal.primary || '#1e293b', 0.05) : shade(pal.secondary || '#0f172a', -0.1);
    p.push(`<g transform="rotate(${rot.toFixed(1)} ${c.x + c.w / 2} ${c.y + c.h / 2})">`);
    // 3D depth edge
    p.push(`<rect x="${c.x + c.depth}" y="${c.y + c.depth}" width="${c.w}" height="${c.h}" rx="12" fill="${shade(baseCol, -0.3)}"/>`);
    // Card face
    p.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="12" fill="${rgba(baseCol, 0.92)}" stroke="${rgba(accent, 0.30)}" stroke-width="1.5"/>`);
    p.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="12" fill="url(#sc-card-g)"/>`);
    // Card content mockup
    p.push(`<rect x="${c.x + 20}" y="${c.y + 20}" width="${c.w * 0.55}" height="10" rx="5" fill="${rgba(accent, 0.7)}"/>`);
    for (let li = 0; li < 3; li++) {
      const lw = c.w * (0.4 + r() * 0.4);
      p.push(`<rect x="${c.x + 20}" y="${c.y + 45 + li * 22}" width="${lw.toFixed(0)}" height="7" rx="3.5" fill="${rgba('#ffffff', 0.30)}"/>`);
    }
    if (c.h > 170) {
      p.push(`<rect x="${c.x + 20}" y="${c.y + c.h - 45}" width="80" height="28" rx="7" fill="${rgba(accent, 0.25)}" stroke="${rgba(accent, 0.60)}" stroke-width="1.5"/>`);
    }
    p.push(`</g>`);
  }

  // Connecting arc lines between cards
  p.push(`<path d="M 270 310 Q 420 380 560 265" fill="none" stroke="${rgba(accent, 0.30)}" stroke-width="1.5" stroke-dasharray="5 5"/>`);
  p.push(`<path d="M 450 400 Q 520 460 580 500" fill="none" stroke="${rgba(accent, 0.25)}" stroke-width="1.5" stroke-dasharray="5 5"/>`);

  // Floating metric badges
  const metrics = ['98%', '4.9★', '200+'];
  for (let m = 0; m < metrics.length; m++) {
    const mx = 200 + m * 300, my = 800 + (r() - 0.5) * 40;
    p.push(`<rect x="${mx - 45}" y="${my - 22}" width="90" height="44" rx="22" fill="${rgba(accent, 0.22)}" stroke="${rgba(accent, 0.65)}" stroke-width="1.5"/>`);
    p.push(`<text x="${mx}" y="${my + 7}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="${rgba('#ffffff', 0.92)}">${metrics[m]}</text>`);
  }

  return p.join('');
}

// ─── SCENE DISPATCH ───────────────────────────────────────────────────────────

const SCENE_NICHE_MAP: Record<string, string> = {
  coffee: 'coffee', cafe: 'coffee', espresso: 'coffee', barista: 'coffee', latte: 'coffee',
  cappuccino: 'coffee', boba: 'coffee',
  food: 'food', restaurant: 'food', pizza: 'food', bakery: 'food', burger: 'food',
  dining: 'food', catering: 'food',
  ramen: 'ramen', sushi: 'ramen', noodle: 'ramen', pho: 'ramen', asian: 'ramen',
  technology: 'technology', tech: 'technology', saas: 'technology', software: 'technology',
  startup: 'technology', app: 'technology', digital: 'technology',
  fitness: 'fitness', gym: 'fitness', crossfit: 'fitness', boxing: 'fitness',
  sports: 'fitness', workout: 'fitness', training: 'fitness',
  yoga: 'wellness', pilates: 'wellness', meditation: 'wellness', spa: 'wellness',
  wellness: 'wellness', massage: 'wellness', therapy: 'wellness',
  photography: 'photography', photographer: 'photography', studio: 'photography',
  fashion: 'fashion', apparel: 'fashion', clothing: 'fashion', streetwear: 'fashion',
  beauty: 'fashion', cosmetics: 'fashion',
};

const SCENE_FNS: Record<string, SceneFn> = {
  coffee: sceneCoffee,
  food: sceneFood,
  ramen: sceneRamen,
  technology: sceneTechnology,
  fitness: sceneFitness,
  wellness: sceneWellness,
  photography: scenePhotography,
  fashion: sceneFashion,
  general: sceneGeneral,
};

function resolveSceneKey(spec: VisualSpec): string {
  // A specific product/menu-item name is the strongest signal for the scene.
  if (spec.subject) {
    for (const w of spec.subject.toLowerCase().split(/[^a-z]+/)) {
      if (w && SCENE_NICHE_MAP[w]) return SCENE_NICHE_MAP[w];
    }
  }
  for (const kw of spec.keywords) {
    const k = kw.toLowerCase();
    if (SCENE_NICHE_MAP[k]) return SCENE_NICHE_MAP[k];
  }
  const raw = spec.rawNiche.toLowerCase();
  if (SCENE_NICHE_MAP[raw]) return SCENE_NICHE_MAP[raw];
  if (SCENE_NICHE_MAP[spec.niche]) return SCENE_NICHE_MAP[spec.niche];
  return 'general';
}

function buildSceneLayer(spec: VisualSpec, field: FieldColors, r: () => number): string {
  const key = resolveSceneKey(spec);
  const fn = SCENE_FNS[key] || sceneGeneral;
  const seed = (spec.seed >>> 0) ^ hashStr(spec.niche + '|' + spec.rawNiche + '|' + spec.role + '|' + (spec.subject || ''));
  return fn(r, field, spec.palette, seed, spec.subject || '');
}

// Niches whose scene provides its own full atmospheric background (warm cafe,
// dark bokeh, zen garden, etc.). For these we skip the brand-palette aurora/mesh
// archetype — it would tint every image in the brand color (e.g. Facebook blue),
// making all product images look identical. The scene draws the atmosphere itself.
const SCENE_OWNS_BG = new Set(['coffee', 'food', 'ramen', 'wellness', 'photography']);

// Per-niche dark base background used when the scene owns the background.
const SCENE_BG: Record<string, [string, string]> = {
  coffee:      ['#1a0a02', '#3d1808'],
  food:        ['#1c0f08', '#382010'],
  ramen:       ['#120808', '#2a1010'],
  wellness:    ['#0a1a14', '#123020'],
  photography: ['#080808', '#181818'],
};

// ─── MAIN SVG BUILDER ─────────────────────────────────────────────────────────

export function generateVisualSvg(spec: VisualSpec): string {
  const r = makeRng((spec.seed >>> 0) ^ hashStr(spec.niche + '|' + spec.rawNiche + '|' + spec.role));
  const pal = spec.palette;
  const field = buildField(pal);
  const ctx: Ctx = { r, pal, field, spec };

  const sceneKey = resolveSceneKey(spec);
  const ownsBackground = SCENE_OWNS_BG.has(sceneKey);

  const pool = archetypePool(spec);
  const archName = pool[Math.floor(r() * pool.length)];
  const arch = ARCHETYPES[archName] || archAurora;
  const bgAngle = Math.floor(r() * 360);

  // When the scene owns its background, use a deep niche-appropriate dark base
  // instead of the brand-palette gradient so the rendered objects have the right
  // photographic context (warm cafe browns, not Facebook blue).
  const [bgTop, bgBot] = ownsBackground
    ? (SCENE_BG[sceneKey] || ['#0a0a0a', '#1a1a1a'])
    : [field.bgTop, field.bgBot];

  const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${bgAngle} 0.5 0.5)">
    <stop offset="0" stop-color="${bgTop}"/>
    <stop offset="1" stop-color="${bgBot}"/>
  </linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${rgba('#FFFFFF', 0.10)}"/>
    <stop offset="0.40" stop-color="${rgba('#FFFFFF', 0)}"/>
  </linearGradient>
  <radialGradient id="vig" cx="50%" cy="46%" r="72%">
    <stop offset="50%" stop-color="rgba(0,0,0,0)"/>
    <stop offset="100%" stop-color="${rgba('#000000', ownsBackground ? 0.62 : 0.52)}"/>
  </radialGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="75"/></filter>
  <filter id="bokeh" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="blur-sm" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="blur-xs" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="3.5"/></filter>
  <filter id="steam-f" x="-80%" y="-30%" width="260%" height="160%"><feGaussianBlur stdDeviation="4.5"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <filter id="mshadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="0.45"/></filter>
</defs>`;

  const grainLayer = `<rect width="${VB}" height="${VB}" filter="url(#grain)" opacity="0.09"/>`;
  const glossLayer = `<rect width="${VB}" height="${VB}" fill="url(#gloss)"/>`;
  const vignetteLayer = `<rect width="${VB}" height="${VB}" fill="url(#vig)"/>`;

  const sceneMarkup = buildSceneLayer(spec, field, r);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" preserveAspectRatio="xMidYMid slice" width="${VB}" height="${VB}">` +
    defs +
    `<rect width="${VB}" height="${VB}" fill="url(#bg)"/>` +
    // Only layer the brand-colored atmospheric archetype for non-food niches.
    // Food/coffee/wellness scenes draw their own background atmosphere.
    (!ownsBackground ? arch(ctx) : '') +
    glossLayer +
    sceneMarkup +
    grainLayer +
    vignetteLayer +
    `</svg>`;

  return svg.replace(/\n\s*/g, ' ').trim();
}

export function toDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function generateVisualDataUri(spec: VisualSpec): string {
  // Use canvas-based PNG renderer for coffee/food niches — more photorealistic.
  // Substring match so both normalized ("coffee") and raw ("coffee shop") niche
  // strings route to the PNG path (PNG output is what enables the bg photo swap).
  const canvasNiches = ['coffee', 'food', 'ramen', 'bakery', 'restaurant', 'wellness'];
  const niche = `${spec.niche || ''} ${spec.rawNiche || ''}`.toLowerCase();
  if (canvasNiches.some(n => niche.includes(n))) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateCanvasDataUri } = require('./canvas-engine');
      return generateCanvasDataUri(spec);
    } catch { /* canvas binding unavailable — fall through to SVG */ }
  }
  return toDataUri(generateVisualSvg(spec));
}

export function buildVisualSet(base: Omit<VisualSpec, 'seed' | 'role'>, count: number, baseSeed: number, role: VisualRole = 'gallery'): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateVisualDataUri({ ...base, seed: baseSeed + i * 0x9E3779B1, role }));
  }
  return out;
}
