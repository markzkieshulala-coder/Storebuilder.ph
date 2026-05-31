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
import type { ImageRequest, Orientation, ResolvedImagery } from './pexels';
// Image engines were removed; images come only from the pluggable image provider
// (lib/engine/image-provider.ts), injected via renderMultiPageSite. Empty slots
// render as a neutral CSS placeholder.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Placeholder theme — set per-render from the resolved palette (setPlaceholderTheme)
// so empty image slots are BRAND-tinted and clearly intentional, not flat dark
// voids. Defaults are a tasteful neutral until a render sets the real palette.
let _phPrimary = '#6366f1';
let _phAccent = '#22d3ee';
let _phBg = '#0a0a0c';
let _phDark = true;

function setPlaceholderTheme(primary: string, accent: string, bg: string, dark: boolean): void {
  if (primary) _phPrimary = primary;
  if (accent) _phAccent = accent;
  if (bg) _phBg = bg;
  _phDark = dark;
}

// Return a visible, branded SVG placeholder — never a transparent pixel, never a
// third-party URL. Each W×H pair gets a properly-sized SVG (so object-fit:cover
// scales it), tinted with the brand primary→accent over the page background, with
// a soft radial glow and a faint centered image glyph so the slot reads as
// intentional art while real photos are unavailable. Varied per slot by index.
let _phIdx = 0;
function ph(idOrUri: string, w: number, h: number): string {
  // Real Unsplash URL → append per-slot sizing/crop (Imgix params) so each
  // section gets a correctly-proportioned, optimized image.
  if (/^https?:\/\//.test(idOrUri)) {
    if (/images\.pexels\.com/.test(idOrUri)) {
      const sep = idOrUri.includes('?') ? '&' : '?';
      return `${idOrUri}${sep}w=${w}&h=${h}&fit=crop&auto=compress`;
    }
    return idOrUri;
  }
  if (idOrUri && /^(data:|<svg|\/|\.\/|blob:)/.test(idOrUri)) return idOrUri;
  const i = _phIdx++;
  // Alternate gradient direction/emphasis per slot so repeated sizes differ.
  const flip = i % 2 === 1;
  const [x1, y1, x2, y2] = flip ? [1, 0, 0, 1] : [0, 0, 1, 1];
  const glow = i % 3 === 0 ? _phAccent : _phPrimary;
  const glyphStroke = _phDark ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.18)';
  const gx = w / 2;
  const gy = h / 2;
  const r = Math.min(w, h) * 0.16;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>` +
    `<linearGradient id="g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0%" stop-color="${_phPrimary}"/>` +
    `<stop offset="55%" stop-color="${_phBg}"/>` +
    `<stop offset="100%" stop-color="${_phAccent}"/></linearGradient>` +
    `<radialGradient id="r" cx="${flip ? 0.7 : 0.3}" cy="0.32" r="0.75">` +
    `<stop offset="0%" stop-color="${glow}" stop-opacity="0.45"/>` +
    `<stop offset="100%" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#r)"/>` +
    // Faint centered "image" glyph (frame + sun + mountain) so the slot reads as a photo placeholder.
    `<g fill="none" stroke="${glyphStroke}" stroke-width="${Math.max(2, r * 0.06)}" stroke-linejoin="round">` +
    `<rect x="${gx - r}" y="${gy - r * 0.75}" width="${r * 2}" height="${r * 1.5}" rx="${r * 0.12}"/>` +
    `<circle cx="${gx - r * 0.45}" cy="${gy - r * 0.2}" r="${r * 0.18}"/>` +
    `<path d="M${gx - r} ${gy + r * 0.55} L${gx - r * 0.2} ${gy - r * 0.05} L${gx + r * 0.25} ${gy + r * 0.3} L${gx + r} ${gy - r * 0.25}"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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

// ─────────────────────────────────────────────────────────────────
// COLOR / CONTRAST GUARD
// The single most important correctness layer for legibility: no matter what
// palette the parser produced or what brand/background colors the NLU folded in,
// text must contrast its background. (The #1 bug: a light-theme palette whose
// `text` stayed dark after the NLU overrode `background` to a dark brand color —
// producing dark-on-dark headings everywhere except the hero, which had an inline
// #fff hack.) These helpers derive readable text/muted/accent values from the
// ACTUAL background luminance, so every render is legible by construction.
// ─────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex([r, g, b]: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// WCAG relative luminance (0 = black, 1 = white).
function relLuminance([r, g, b]: RGB): number {
  const ch = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Mix `fg` toward white or black (whichever opposes the background) by the
// smallest amount that reaches `targetRatio` against `bg`. Preserves hue when a
// little nudge suffices; falls back to near-white / near-black when needed.
function ensureContrast(fg: RGB, bg: RGB, targetRatio: number): RGB {
  if (contrastRatio(fg, bg) >= targetRatio) return fg;
  const pole: RGB = relLuminance(bg) < 0.5 ? [255, 255, 255] : [10, 10, 12];
  let best = fg;
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    best = mix(fg, pole, t);
    if (contrastRatio(best, bg) >= targetRatio) break;
  }
  return best;
}

function isDarkBg(hex: string): boolean {
  const rgb = hexToRgb(hex);
  return rgb ? relLuminance(rgb) < 0.42 : false;
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
  minimal:       { href:'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap', display:"'Sora',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
  flat:          { href:'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap', display:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif" },
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
  corporate:     { href:'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap', display:"'Fraunces',Georgia,serif", body:"'Inter',system-ui,sans-serif" },
  organic:       { href:'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500&display=swap', display:"'Fraunces',Georgia,serif", body:"'DM Sans',system-ui,sans-serif" },
  industrial:    { href:'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500&display=swap', display:"'Barlow Condensed',sans-serif", body:"'Barlow',sans-serif" },
  vaporwave:     { href:'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap', display:"'Outfit',system-ui,sans-serif", body:"'Outfit',system-ui,sans-serif" },
  retro:         { href:'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600&display=swap', display:"'DM Serif Display',Georgia,serif", body:"'DM Sans',system-ui,sans-serif" },
  skeuomorphic:  { href:'https://fonts.googleapis.com/css2?family=Merriweather:wght@700;900&family=Source+Sans+3:wght@400;500;600&display=swap', display:"'Merriweather',Georgia,serif", body:"'Source Sans 3',system-ui,sans-serif" },
  material:      { href:'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap', display:"'Roboto',system-ui,sans-serif", body:"'Roboto',system-ui,sans-serif" },
};

// Niche-driven font overrides — applied when the design style is generic
// (minimal/flat/corporate/etc.) so the typography reflects the actual industry
// instead of a style keyword that wasn't explicitly requested.
const NICHE_FONT_OVERRIDE: Record<string, string> = {
  // Food & beverage → warm organic serif
  coffee:'organic',cafe:'organic',espresso:'organic',ramen:'organic',sushi:'organic',
  pizza:'organic',bakery:'organic',bar:'organic',brunch:'organic',restaurant:'organic',
  dining:'organic',bistro:'organic',food:'organic',burger:'organic',
  // Sports & fitness → bold athletic condensed
  gym:'brutalist',crossfit:'brutalist',fitness:'brutalist',sports:'brutalist',boxing:'brutalist',
  // Wellness → refined luxury serif
  yoga:'luxury',spa:'luxury',wellness:'luxury',meditation:'luxury',pilates:'luxury',massage:'luxury',
  // Photography & creative → artistic sans
  photography:'artistic',photographer:'artistic',videography:'artistic',art:'artistic',illustration:'artistic',
  // Agency & branding → artistic
  agency:'artistic',marketing:'artistic',branding:'artistic',studio:'artistic',
  // Fashion & beauty → editorial high-fashion serif
  fashion:'editorial',beauty:'editorial',streetwear:'editorial',boutique:'editorial',
  // Technology & SaaS → futuristic clean sans
  technology:'futuristic',saas:'futuristic',startup:'futuristic',ai:'futuristic',fintech:'futuristic',
  // Gaming/crypto → cyberpunk
  gaming:'cyberpunk',crypto:'cyberpunk',
  // Portfolio & design → clean minimal
  portfolio:'minimal',design:'minimal',architecture:'minimal',
  // E-commerce → startup/outfit
  ecommerce:'startup',retail:'startup',
};
const GENERIC_STYLES = new Set(['minimal','flat','corporate','enterprise','material','neumorphism','startup']);
function getFontConfig(puo: PromptUnderstandingObject): FontConfig {
  const style = puo.designStyle;
  const industry = puo.inferredIndustry.toLowerCase();
  if (GENERIC_STYLES.has(style)) {
    const nicheFont = NICHE_FONT_OVERRIDE[industry];
    if (nicheFont && FONT_MAP[nicheFont]) return FONT_MAP[nicheFont];
  }
  return FONT_MAP[style] || FONT_MAP['minimal'];
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

  // Derive theme + readable colors from the ACTUAL background, not the mood flag.
  // This guarantees legibility even when the NLU folded a brand background color
  // into a palette whose text/muted were tuned for the opposite theme.
  const bgRgb = hexToRgb(cp.background) ?? [10, 10, 12];
  const isDark = isDarkBg(cp.background);
  // Body text: aim for a strong ratio (≥ 8) → effectively near-white on dark,
  // near-black on light. Falls back to the palette's own text if it already passes.
  const textRgb = ensureContrast(hexToRgb(cp.text) ?? (isDark ? [245, 245, 247] : [17, 17, 19]), bgRgb, 8);
  // Muted/secondary text: dimmer but still readable (ratio ≥ 4.5, WCAG AA body).
  const mutedRgb = ensureContrast(hexToRgb(cp.muted) ?? mix(textRgb, bgRgb, 0.45), bgRgb, 4.5);
  // Primary, when used AS TEXT (eyebrows, links, list bullets, icons), must be
  // legible too. Gradients/buttons keep the raw cp.primary via --grad below.
  const primaryRgb = ensureContrast(hexToRgb(cp.primary) ?? [99, 102, 241], bgRgb, 3.2);
  const secondaryRgb = ensureContrast(hexToRgb(cp.secondary) ?? primaryRgb, bgRgb, 3.2);
  const textColor = rgbToHex(textRgb);
  const mutedColor = rgbToHex(mutedRgb);
  const primaryColor = rgbToHex(primaryRgb);
  // Gradient used for TEXT clipping (.grad headings, stat numbers) must contrast
  // the background; the raw cp gradient (--grad) stays for button/badge fills.
  const gradText = `linear-gradient(135deg,${primaryColor},${rgbToHex(secondaryRgb)})`;

  const headingCase = ['brutalist','cinematic','industrial'].includes(puo.designStyle) ? 'uppercase' : 'none';
  const headingTracking = puo.designStyle === 'luxury' || puo.designStyle === 'editorial' ? '-0.02em' : puo.designStyle === 'brutalist' ? '0.04em' : '-0.015em';
  const btnShape = br.style === 'sharp' ? '0' : br.style === 'pill' ? '9999px' : br.md;
  const borderColor = isDark ? 'rgba(255,255,255,.14)' : cp.border;

  // Make image-slot placeholders brand-aware and visibly intentional (not the
  // old flat dark voids). See ph() / setPlaceholderTheme().
  setPlaceholderTheme(cp.primary, cp.accent || cp.secondary, cp.background, isDark);

  return `
:root{
  --bg:${cp.background};--surf:${cp.surface};--text:${textColor};--muted:${mutedColor};
  --bdr:${borderColor};--primary:${primaryColor};--secondary:${cp.secondary};--accent:${cp.accent};
  --display:${font.display};--body-font:${font.body};
  --radius:${br.md};--radius-lg:${br.lg};--radius-sm:${br.sm};
  --shadow:${sh.md};--shadow-lg:${sh.lg};--shadow-sm:${sh.sm};
  --grad:linear-gradient(135deg,${cp.primary},${cp.secondary});--grad-text:${gradText};
  --pad:${sp.section};--container:${sp.container};--gutter:${sp.gutter};--gap:${sp.gridGap};
  /* Premium responsive display scale — big, confident headlines that scale with the
     viewport instead of a fixed 4rem. This is the single biggest driver of an
     "ultra-premium" feel. */
  --hero-size:clamp(2.9rem,6.2vw,5.6rem);--h1-size:clamp(2.4rem,4.6vw,4.2rem);
  --h2-size:clamp(1.85rem,3.3vw,3rem);--h3-size:clamp(1.3rem,1.8vw,1.65rem);
  --body-size:${ty.scale.body};--small-size:${ty.scale.small};--caption-size:${ty.scale.caption};
  --weight-heading:${ty.weight.heading};--weight-body:${ty.weight.body};
  --leading-heading:1.05;--leading-body:${ty.lineHeight.body};
  --tracking-heading:${ty.letterSpacing.heading};
  --dur:${an.duration.normal};--dur-fast:${an.duration.fast};--ease:${an.easing.default};
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--body-font);background:var(--bg);color:var(--text);line-height:var(--leading-body);-webkit-font-smoothing:antialiased;overflow-x:hidden;font-size:var(--body-size)}
h1,h2,h3,h4,.display{font-family:var(--display);line-height:var(--leading-heading);letter-spacing:var(--tracking-heading);font-weight:var(--weight-heading);text-transform:${headingCase}}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block;object-fit:cover;background:linear-gradient(135deg,var(--surf),var(--bg))}
.wrap{max-width:var(--container);margin:0 auto;padding:0 var(--gutter)}
.grad{background:var(--grad-text);-webkit-background-clip:text;background-clip:text;color:transparent}
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
.hero-bg{position:absolute;inset:0;z-index:0;background:linear-gradient(135deg,${cp.primary}cc,${cp.accent||cp.secondary}88,${cp.background})}
.hero-bg img{width:100%;height:100%;object-fit:cover}
/* Dim real photos so text stays readable, but leave SVG/data-URI placeholders at full brightness */
.hero-bg img:not([src^="data:"]){filter:brightness(${isDark ? '0.65' : '0.80'});transform:scale(1.03);transition:transform 8s ease-out}
/* Overlay: heavy for real photos (text must be readable over any photo content),
   very light for placeholder (the gradient background IS the design) */
.hero-bg:has(img:not([src^="data:"]))::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.6) 60%,var(--bg) 100%)}
.hero-bg:not(:has(img:not([src^="data:"]), img[src=""]))::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,var(--bg) 100%)}
.hero-content{position:relative;z-index:1}
.hero-tag{display:inline-flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--primary) 12%,transparent);border:1px solid color-mix(in srgb,var(--primary) 30%,transparent);color:var(--primary);padding:5px 13px;border-radius:9999px;font-size:.82rem;font-weight:600;margin-bottom:20px;text-transform:uppercase;letter-spacing:.06em}
.hero h1{font-size:var(--hero-size);margin-bottom:20px;max-width:880px}
.hero .lead{font-size:clamp(.98rem,1.5vw,1.18rem);color:var(--muted);max-width:540px;margin-bottom:32px;line-height:1.72}
.hero-ctas{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.hero-split-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(40px,6vw,80px);align-items:center}
.hero-media{border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-lg)}
.hero-media img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
/* On phones the tall portrait becomes a cinematic banner so it doesn't eat the
   whole viewport before the copy is reached. */
@media(max-width:768px){.hero-split-grid{grid-template-columns:1fr}.hero-media img{aspect-ratio:16/10}}

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
.stat-number{font-family:var(--display);font-size:clamp(1.8rem,3.5vw,3rem);font-weight:var(--weight-heading);background:var(--grad-text);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
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
@media(max-width:768px){.split-media img{aspect-ratio:16/10}}
.split-text h2{font-size:var(--h2-size);margin-bottom:14px}
.split-text .split-body{color:var(--muted);margin-bottom:18px;line-height:1.72}
.split-list{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:24px}
.split-list li{display:flex;align-items:flex-start;gap:10px;color:var(--muted);font-size:var(--small-size)}
.split-list li::before{content:'→';color:var(--primary);font-weight:700;margin-top:1px;flex-shrink:0}
@media(max-width:768px){.split-section{grid-template-columns:1fr}.split-section.flip>.split-media{order:0}}

/* GALLERY — each variant has its OWN shape language so no two sites (and no two
   sections) read as the same repetitive square grid. Items carry intrinsic
   aspect-ratios; masonry mixes wide + tall tiles for an editorial rhythm. */
.gallery-grid{display:grid;gap:var(--gap)}
.gallery-grid.uniform{grid-template-columns:repeat(3,1fr)}
.gallery-grid.masonry{grid-template-columns:repeat(3,1fr);grid-auto-flow:dense}
.gallery-grid.panorama{grid-template-columns:repeat(2,1fr)}
.gallery-grid.filmstrip{display:flex;overflow-x:auto;gap:var(--gap);padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.gallery-grid.filmstrip .gallery-item{width:clamp(240px,72vw,300px);flex-shrink:0;aspect-ratio:4/5;scroll-snap-align:start}
.gallery-grid.filmstrip img{width:100%;height:100%}
.gallery-item{position:relative;overflow:hidden;border-radius:var(--radius)}
.gallery-item img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--ease)}
.gallery-item:hover img{transform:scale(1.05)}
/* Default tile shape per variant (non-square so it never looks like a 1:1 stamp). */
.gallery-grid.uniform .gallery-item{aspect-ratio:4/3}
.gallery-grid.panorama .gallery-item{aspect-ratio:16/9}
.gallery-grid.masonry .gallery-item{aspect-ratio:4/3}
/* Editorial accents: a wide hero tile and a tall portrait tile break the grid. */
.gallery-grid.masonry .gallery-item:nth-child(6n+1){grid-column:span 2;aspect-ratio:16/9}
.gallery-grid.masonry .gallery-item:nth-child(6n+4){grid-column:span 2;aspect-ratio:2/1}
/* TABLET — drop to 2 columns but keep the asymmetry. */
@media(max-width:768px){
  .gallery-grid.uniform,.gallery-grid.masonry{grid-template-columns:repeat(2,1fr)}
  .gallery-grid.masonry .gallery-item:nth-child(6n+4){grid-column:auto;aspect-ratio:4/3}
}
/* PHONE — a real editorial 2-col gallery (featured banner + varied shapes),
   NOT a monotonous full-width stack. */
@media(max-width:560px){
  .gallery-grid.uniform,.gallery-grid.masonry,.gallery-grid.panorama{grid-template-columns:repeat(2,1fr);grid-auto-flow:dense}
  .gallery-grid .gallery-item{aspect-ratio:1}
  .gallery-grid .gallery-item:nth-child(7n+1){grid-column:span 2;aspect-ratio:16/10}
  .gallery-grid .gallery-item:nth-child(7n+4){aspect-ratio:4/5}
  .gallery-grid.masonry .gallery-item:nth-child(6n+1){grid-column:span 2;aspect-ratio:16/10}
}

/* PRODUCT / MENU GRID — real items with name, description, price */
.product-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap)}
@media(max-width:900px){.product-grid{grid-template-columns:repeat(2,1fr)}}
/* Phones keep a real 2-up shop grid (like a storefront) with tighter spacing and
   square thumbnails, only dropping to a single column on the narrowest devices. */
@media(max-width:560px){
  .product-grid{grid-template-columns:repeat(2,1fr);gap:14px}
  .product-media{aspect-ratio:1}
  .product-body{padding:13px}
  .product-name{font-size:1rem}
  .product-row{flex-direction:column;gap:2px}
}
@media(max-width:360px){.product-grid{grid-template-columns:1fr}.product-media{aspect-ratio:4/3}}
.product-card{background:var(--surf);border:1px solid var(--bdr);border-radius:var(--radius);overflow:hidden;display:flex;flex-direction:column;transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s}
.product-card:hover{transform:translateY(-6px);box-shadow:0 24px 56px -16px rgba(0,0,0,.28)}
.product-media{aspect-ratio:4/3;overflow:hidden}
.product-media img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--ease)}
.product-card:hover .product-media img{transform:scale(1.06)}
.product-body{padding:clamp(16px,2vw,22px);display:flex;flex-direction:column;gap:8px}
.product-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.product-name{font-size:var(--h3-size);margin:0}
.product-price{font-family:var(--display);font-weight:var(--weight-heading);color:var(--primary);white-space:nowrap}
.product-desc{color:var(--muted);font-size:var(--small-size);line-height:1.6;margin:0}

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
@media(max-width:900px){.bento{grid-template-columns:repeat(2,1fr)}.bento .card:first-child{grid-column:span 2;grid-row:auto}}
@media(max-width:480px){.bento{grid-template-columns:repeat(2,1fr)}.bento .card:first-child{grid-column:span 2}}

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

/* Cinematic hero depth layer — only on real photos, not on data: placeholders */
.hero-fullbleed .hero-bg::before{content:'';position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at 25% 60%,${cp.primary}28 0%,transparent 65%)}

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
// IMAGE SOURCE — content-aware Unsplash photos (lib/engine/image-provider.ts).
// Each section's image is resolved from a query built from the ACTUAL content it
// sits next to (product/service name, niche, branding) and is globally unique —
// never reused across builds (see lib/engine/unsplash.ts). When no key is set the
// slots fall back to branded CSS placeholders.
// ─────────────────────────────────────────────────────────────────

// Imagery resolved by the image provider, injected by renderMultiPageSite. Safe
// as module state because the render is fully synchronous (no awaits), so no two
// renders interleave between set/clear.
//   INJECTED_POOL    — ordered, globally-unique niche/context images (hero, gallery, about, team…)
//   INJECTED_BY_NAME — exact per-product/per-feature image, keyed by normalized name
let INJECTED_POOL: string[] | null = null;
let INJECTED_BY_NAME: Record<string, string> | null = null;

// Normalize a product/service/feature name into a stable lookup key. MUST match
// the key planSiteImagery builds for the provider ('name:' + normName(...)).
function normName(name: string): string {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getPhotos(_puo: PromptUnderstandingObject, fp: number): string[] {
  const NEED = 12;

  // Distribute the unique pool across the generic slots. If the provider returned
  // nothing, every slot is an empty string → ph() emits a branded placeholder.
  if (INJECTED_POOL && INJECTED_POOL.length > 0) {
    const src = INJECTED_POOL;
    const out: string[] = [];
    const start = Math.abs(fp) % src.length;
    for (let i = 0; i < NEED; i++) out.push(src[(start + i) % src.length]);
    return out;
  }
  return new Array(NEED).fill('');
}

// Per-product image: prefer the EXACT content-matched photo resolved for this
// specific item name; otherwise fall back to a distinct pool image so each card
// still differs. With no imagery at all, returns '' → branded placeholder.
function productPhoto(puo: PromptUnderstandingObject, name: string, fp: number, i: number): string {
  if (INJECTED_BY_NAME) {
    const hit = INJECTED_BY_NAME[normName(name)];
    if (hit) return hit;
  }
  const photos = getPhotos(puo, fp).filter(Boolean);
  if (photos.length === 0) return '';
  const idx = (Math.abs(fp) ^ hashStr(name.toLowerCase()) ^ ((i + 1) * 0x9E3779B1)) % photos.length;
  return photos[idx];
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
  faqs: Array<{ q: string; a: string }>;
  products: Array<{ name: string; desc: string; price: string }> | null;
  productEyebrow: string;
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

// ─────────────────────────────────────────────────────────────────
// SUB-NICHE COPY BANKS — deeply niche-specific content so a coffee
// shop sounds like a coffee shop, not a SaaS tool with "coffee"
// substituted in. Keyed by the raw sub-niche slug (same keys used
// in SUBNICHE_PHOTOS and SUBNICHE_SCENES).
// ─────────────────────────────────────────────────────────────────

interface SubNicheCopyBank {
  featureTitles: string[];
  featureDescs: string[];
  heroSubs: string[];
  aboutBody: string;
  aboutBullets: string[];
  stats: Array<{ number: string; label: string }>;
  testimonialQuotes: string[];
  testimonialRoles: string[];
  missionBody: string;
  heroTag: string;
  ctaHeading: string;
  footerTagline: string;
  primaryCta: string;
  secondaryCta: string;
  contactSub?: string;
  ctaSub?: string;
  faqs?: Array<{ q: string; a: string }>;
  products?: Array<{ name: string; desc: string; price: string }>;
  productEyebrow?: string;
}

const SUBNICHE_COPY_BANK: Record<string, SubNicheCopyBank> = {
  coffee: {
    featureTitles: ['Single Origin Espresso','Artisan Pour-Overs','Farm-to-Cup Sourcing','Signature Seasonal Blends','Expert Barista Team','Specialty Brewing Methods'],
    featureDescs: [
      'Rich, complex single-origin shots pulled at peak extraction — every cup tells the story of where it grew.',
      'From V60 to Chemex — slow, deliberate, and extraordinary in every pour.',
      'Direct-trade relationships with farms across Ethiopia, Colombia, and Guatemala.',
      'Limited seasonal roasts crafted to highlight the best flavors of each harvest.',
      'Our baristas train to competition level — your cup is always in expert hands.',
      'Cold brew, siphon, AeroPress, and more — we brew for every palate.',
    ],
    heroSubs: [
      'We source directly from farms, roast in small batches, and pull every shot with precision. This is coffee as it should be.',
      'From the first crack of the roast to the last sip in your cup — every detail matters here.',
      'Specialty coffee crafted for curious palates. Single origins, seasonal blends, and expert brewing — all under one roof.',
    ],
    aboutBody: 'What began as a passion for exceptional coffee has grown into a community. We source our beans directly from farmers who share our obsession with quality — from the altitude of the growing region to the temperature of your cup. Every roast is small-batch, every shot is dialed in daily.',
    aboutBullets: ['Direct trade from origin farms','Small-batch roasting for optimal flavour','Precision extraction on every shot','Community-focused, always welcoming'],
    stats: [{number:'12+',label:'Origins Sourced'},{number:'4.9★',label:'Guest Rating'},{number:'Daily',label:'Fresh Roasted'},{number:'100%',label:'Direct Trade'}],
    testimonialQuotes: [
      'The single origin pour-over here completely changed how I think about coffee. I come in three times a week.',
      'Best espresso in the city, no contest. The baristas know their craft and it shows in every cup.',
      'I never knew coffee could taste this good until I walked in here. Now nowhere else compares.',
    ],
    testimonialRoles: ['Coffee Enthusiast','Daily Regular','Specialty Coffee Convert'],
    missionBody: 'Every coffee we serve is a conversation between farmer, roaster, and barista. We travel to origin, taste obsessively, and brew deliberately — because you deserve nothing less.',
    heroTag: 'Specialty Coffee',
    ctaHeading: 'Come In for a Cup',
    footerTagline: 'Specialty coffee, brewed with intention.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Our Story',
    contactSub: 'Questions about our menu, hours, or events? We\'d love to hear from you.',
  },
  cafe: {
    featureTitles: ['All-Day Breakfast Menu','House-Baked Pastries','Specialty Coffee Program','Seasonal Kitchen Menu','Cozy Dine-In Space','Catering & Private Events'],
    featureDescs: [
      'Full breakfast served all day — eggs, toast, avocado, and everything in between.',
      'Croissants, danishes, tarts, and loaves baked fresh every morning on-site.',
      'A full specialty coffee menu from espresso to cold brew, all dialled in daily.',
      'Our kitchen menu rotates with the seasons using the freshest local ingredients.',
      'A warm, welcoming space with great natural light — your neighbourhood third place.',
      'From intimate birthday brunches to corporate team events — we host it beautifully.',
    ],
    heroSubs: [
      'Your neighbourhood café — where good coffee, great food, and a warm welcome come together every single day.',
      'We serve breakfast all day, bake everything from scratch, and make every guest feel at home.',
      'Come for the coffee. Stay for the food. Come back for the community.',
    ],
    aboutBody: 'We opened our doors because we believed every neighbourhood deserves a truly great café — one that bakes fresh every morning, sources coffee with care, and greets every guest by name. This is that place.',
    aboutBullets: ['Baked from scratch every morning','Seasonal menu, local ingredients','Specialty coffee sourced with care','Welcoming every guest since day one'],
    stats: [{number:'7am',label:'Opens Daily'},{number:'4.9★',label:'Guest Rating'},{number:'100%',label:'House Baked'},{number:'Seasonal',label:'Fresh Menu'}],
    testimonialQuotes: [
      'My office is two blocks away and I\'m here every single morning. The food and coffee are just that good.',
      'The croissants are the best I\'ve had outside Paris. And the coffee? Exceptional.',
      'We had our team brunch here and everyone left raving. Perfect for groups and solo visits alike.',
    ],
    testimonialRoles: ['Office Regular','Brunch Enthusiast','Corporate Events Client'],
    missionBody: 'We believe a great café does more than serve food — it creates a space where people feel good. That means baking everything ourselves, sourcing thoughtfully, and welcoming everyone who walks through the door.',
    heroTag: 'Your Neighbourhood Café',
    ctaHeading: 'Come Say Hello',
    footerTagline: 'Great coffee. Fresh food. Every day.',
    primaryCta: 'See Our Menu',
    secondaryCta: 'Book a Table',
    contactSub: 'Questions about bookings, catering, or our menu? Get in touch — we\'re always happy to chat.',
  },
  espresso: {
    featureTitles: ['Double Espresso Perfection','Signature Latte Blends','Competition-Grade Baristas','Premium Italian Roasts','Espresso-Based Specialty Drinks','Direct Trade Beans'],
    featureDescs: [
      'Every double shot pulled with precision — 9 bars, 93°C, golden crema every time.',
      'Our signature lattes are built on a carefully calibrated house espresso blend.',
      'Our team trains to barista competition standards — your shot is never an afterthought.',
      'Premium Italian and Nordic roasts selected for complexity, balance, and crema quality.',
      'Cortado, flat white, macchiato, ristretto — crafted exactly as intended.',
      'Every bean sourced directly from growers who share our obsession with quality.',
    ],
    heroSubs: [
      'Every shot is dialled in, every pour is precise, and every cup is made with the kind of care that shows.',
      'We pull espresso the way it was meant to be made — with intention, expertise, and the best beans available.',
      'From the grind to the pour, this is specialty espresso at its finest.',
    ],
    aboutBody: 'Espresso isn\'t just coffee — it\'s a craft. We obsess over every variable: grind size, extraction temperature, pressure, and timing. When you taste the result, you\'ll understand why every detail matters.',
    aboutBullets: ['9-bar precision extraction','93°C optimal brew temperature','Daily grind calibration','Competition-trained baristas'],
    stats: [{number:'9 Bar',label:'Extraction Pressure'},{number:'93°C',label:'Brew Temperature'},{number:'4.9★',label:'Guest Rating'},{number:'Daily',label:'Freshly Dialled In'}],
    testimonialQuotes: [
      'Best espresso I\'ve had outside Italy. The crema is incredible and the flavours are complex without being harsh.',
      'They actually care about every shot. I watched the barista re-pull because it wasn\'t quite right. That tells you everything.',
      'The flat white here set the standard. I\'ve been to dozens of specialty cafés — this is the one I keep coming back to.',
    ],
    testimonialRoles: ['Espresso Purist','Coffee Geek','Specialty Coffee Traveller'],
    missionBody: 'Great espresso demands obsession. We bring that obsession to every extraction — sourcing the best beans, dialling in our recipe daily, and training our team to competition standards.',
    heroTag: 'Specialty Espresso Bar',
    ctaHeading: 'Come In for a Shot',
    footerTagline: 'Espresso pulled with obsession.',
    primaryCta: 'Our Menu',
    secondaryCta: 'Our Story',
  },
  ramen: {
    featureTitles: ['18-Hour Tonkotsu Broth','Handmade Fresh Noodles','Premium Chashu Pork','Seasoned Soft-Boiled Eggs','Seasonal Ramen Specials','Authentic Japanese Recipe'],
    featureDescs: [
      'Our tonkotsu broth simmers for 18 hours minimum — rich, milky, and layered with umami depth.',
      'Noodles made fresh in-house daily — the right springiness and bite for every broth style.',
      'Slow-braised chashu rolled and sliced to order — melt-in-your-mouth in every bowl.',
      'Soy-marinated eggs cured to a perfect soft, jammy centre — a bowl essential.',
      'Our rotating specials follow Japanese seasons — from shio summer bowls to miso winter warmers.',
      'Every recipe researched and refined through years of study in Japan — nothing is improvised here.',
    ],
    heroSubs: [
      'It starts with 18 hours of simmering bones and ends with a bowl that stops you mid-spoonful. This is ramen done right.',
      'Handmade noodles. Real broth. Toppings sourced with care. Every bowl is worth waiting for.',
      'We make ramen the way it\'s made in Japan — slow, patient, and with absolute commitment to the craft.',
    ],
    aboutBody: 'Every bowl we serve starts the night before — with pork bones and time. We don\'t use concentrates, shortcuts, or artificial anything. Our broth simmers for a minimum of 18 hours, our noodles are made fresh that morning, and our toppings are prepped with the same attention to detail you\'d find in a serious ramen-ya in Tokyo.',
    aboutBullets: ['18-hour minimum broth simmer','Fresh noodles made daily in-house','No shortcuts, no concentrates','Authentic Japanese recipe and technique'],
    stats: [{number:'18hr',label:'Broth Simmer Time'},{number:'4.9★',label:'Guest Rating'},{number:'Daily',label:'Noodles Made Fresh'},{number:'100%',label:'House-Made Broth'}],
    testimonialQuotes: [
      'This tonkotsu broth is the real deal — rich, creamy, and deeply layered. I\'ve been searching for something this good for years.',
      'The handmade noodles alone are worth the visit. Combined with the chashu and soft egg — this is a bowl I\'ll dream about.',
      'Best ramen outside Japan. I\'ve said that to everyone I know and they\'ve all agreed after visiting.',
    ],
    testimonialRoles: ['Ramen Enthusiast','Japan-Travelled Foodie','Loyal Weekly Guest'],
    missionBody: 'Great ramen is about patience — hours of simmering, years of refining, and an unwillingness to compromise. Every bowl we serve reflects that.',
    heroTag: 'Authentic Japanese Ramen',
    ctaHeading: 'Come Try a Bowl',
    footerTagline: 'Handmade. House-brewed. Always worth the wait.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Book a Table',
    contactSub: 'Want to reserve a table or ask about our menu? Get in touch — we\'re always happy to hear from you.',
  },
  sushi: {
    featureTitles: ['Daily Fresh Fish Delivery','Traditional Nigiri & Sashimi','Chef\'s Omakase Course','Premium Wagyu & Specialty Rolls','Curated Sake Menu','Live Sushi Counter'],
    featureDescs: [
      'Our fish arrives every morning — sourced from trusted suppliers and the finest seasonal catch.',
      'Classic nigiri and sashimi prepared with Japanese technique and genuine reverence for the ingredient.',
      'Let the chef decide — an 8 to 12-piece omakase journey through today\'s best.',
      'A5 Wagyu, black truffle, and premium seafood — for when the occasion demands more.',
      'Curated sake pairings from across Japan — junmai, ginjo, and daiginjo to complement every bite.',
      'Watch every piece being crafted at our counter — the full experience, nothing hidden.',
    ],
    heroSubs: [
      'From the fish market to your plate — nothing older than this morning. This is sushi with no compromise.',
      'Traditional Japanese technique, daily-sourced fish, and a reverence for every ingredient that shows in every bite.',
      'We serve sushi the way it deserves to be served — fresh, precise, and with complete respect for the craft.',
    ],
    aboutBody: 'The quality of sushi lives and dies with the freshness of the fish and the skill of the hands that prepare it. We source every piece daily, train every chef to traditional Japanese standards, and serve nothing we wouldn\'t proudly eat ourselves.',
    aboutBullets: ['Fresh fish sourced every morning','Traditional Japanese preparation','Omakase from 8 to 12 courses','Seasonal sake pairings available'],
    stats: [{number:'Daily',label:'Fresh Fish Sourced'},{number:'4.9★',label:'Dining Rating'},{number:'20+',label:'Varieties Served'},{number:'8–12',label:'Omakase Courses'}],
    testimonialQuotes: [
      'The omakase here is extraordinary — each piece more surprising and delicious than the last. One of the best meals I\'ve had.',
      'The fish quality is exceptional. You can taste the freshness in every single piece. This is sushi done properly.',
      'From the moment you sit at the counter you know you\'re somewhere special. The craft is evident in everything.',
    ],
    testimonialRoles: ['Omakase Regular','Sushi Enthusiast','Food Critic'],
    missionBody: 'We believe great sushi is about respect — for the ingredient, for the craft, and for the guest. Every piece we serve reflects that philosophy.',
    heroTag: 'Japanese Sushi Bar',
    ctaHeading: 'Reserve Your Seat',
    footerTagline: 'Freshness, craft, and reverence — in every piece.',
    primaryCta: 'View Menu',
    secondaryCta: 'Reserve Omakase',
    contactSub: 'Want to book an omakase seat or enquire about private dining? Reach out — we\'d love to host you.',
  },
  pizza: {
    featureTitles: ['Wood-Fired Brick Oven','Neapolitan-Style Dough','San Marzano Tomatoes','Fresh Mozzarella di Bufala','Daily Special Pies','Gluten-Free & Vegan Crust'],
    featureDescs: [
      'Our oven burns at 900°F — creating the char, leopard spotting, and crust that defines real Neapolitan pizza.',
      'Our dough ferments for a minimum of 72 hours — building flavour, structure, and the signature airy crust.',
      'Whole peeled San Marzano DOP tomatoes — crushed by hand, never cooked until the oven does the work.',
      'Fresh buffalo mozzarella delivered weekly — creamy, milky, and made to melt at exactly the right moment.',
      'Our daily special changes with the season and what\'s freshest — check the board when you arrive.',
      'Great pizza should be for everyone — our GF and vegan options don\'t compromise on flavour or texture.',
    ],
    heroSubs: [
      'True Neapolitan pizza — 72-hour dough, San Marzano tomatoes, fresh buffalo mozzarella, and a 900°F wood-fired oven.',
      'We make pizza the way it\'s made in Naples — simple ingredients, exceptional quality, and an unforgiving oven.',
      'Great pizza needs nothing more than great dough, great sauce, and great cheese — we obsess over all three.',
    ],
    aboutBody: 'We spent two years perfecting our dough recipe before opening our doors. The result is a 72-hour fermented base that delivers flavour, chew, and the signature Neapolitan char that only comes from doing it properly. Everything else follows from there.',
    aboutBullets: ['900°F wood-fired brick oven','72-hour dough fermentation','San Marzano DOP tomatoes','Buffalo mozzarella delivered fresh weekly'],
    stats: [{number:'900°F',label:'Oven Temperature'},{number:'72hr',label:'Dough Fermentation'},{number:'4.9★',label:'Guest Rating'},{number:'Daily',label:'Fresh Dough Made'}],
    testimonialQuotes: [
      'The crust is perfect — charred, chewy, flavourful. I\'ve been to Naples and this is as close as I\'ve found here.',
      'Best pizza I\'ve eaten. The San Marzano sauce and buffalo mozzarella combination is unbeatable.',
      'Wood-fired means something here. You can taste the smoke, the char, and the intention in every bite.',
    ],
    testimonialRoles: ['Italian Food Enthusiast','Pizza Purist','Weekly Regular'],
    missionBody: 'Great pizza is honest food — it only works if every ingredient is the best it can be. We source that way, prepare that way, and serve it that way.',
    heroTag: 'Authentic Neapolitan Pizza',
    ctaHeading: 'Come Try a Slice',
    footerTagline: 'Wood-fired. Handmade. Uncompromising.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Order Online',
  },
  burger: {
    featureTitles: ['Fresh-Ground Daily Beef Patties','House-Baked Brioche Buns','Signature Smash Burgers','Craft Sauce Program','Premium Toppings Bar','Hand-Cut Fries & Sides'],
    featureDescs: [
      'Our beef is ground fresh every morning — custom blend for the perfect fat ratio and flavour.',
      'Soft, slightly sweet brioche buns baked in-house — the perfect vehicle for our patties.',
      'Double smash, crispy edges, maximum crust — the Maillard reaction working at its finest.',
      'Six house-made sauces, each crafted to complement a different flavour profile.',
      'Premium aged cheddar, caramelised onions, house pickles, and heirloom tomatoes.',
      'Skin-on fries seasoned with our house blend — crispy outside, fluffy inside, always fresh.',
    ],
    heroSubs: [
      'Ground fresh daily, smashed to order, built to be the best burger you\'ve ever had.',
      'We care about every layer — the beef, the bun, the sauce, the toppings. The result speaks for itself.',
      'This is what a burger should be: bold, flavourful, and built from quality you can taste in every bite.',
    ],
    aboutBody: 'We got into the burger business because we kept eating disappointing ones. Our approach is simple: source great beef, grind it fresh every morning, make everything in-house, and never cut corners on flavour.',
    aboutBullets: ['Beef ground fresh every morning','Brioche buns baked in-house daily','Six house-made signature sauces','Premium toppings, never frozen'],
    stats: [{number:'Daily',label:'Fresh-Ground Beef'},{number:'6',label:'Signature Sauces'},{number:'4.9★',label:'Guest Rating'},{number:'100%',label:'Made to Order'}],
    testimonialQuotes: [
      'The best burger I\'ve eaten — and I eat a lot of burgers. The smash technique and fresh-ground beef make all the difference.',
      'The brioche bun and house sauce combination is incredible. This has become my weekly treat.',
      'I\'ve tried every burger spot in the city. This one wins. Not even close.',
    ],
    testimonialRoles: ['Burger Aficionado','Weekly Regular','Food Blogger'],
    missionBody: 'A great burger is about fresh ingredients treated with respect. We grind our beef daily, bake our buns fresh, and make every sauce from scratch because that\'s what it takes to do it properly.',
    heroTag: 'Smash Burger Bar',
    ctaHeading: 'Come in for a Burger',
    footerTagline: 'Fresh. Smashed. Unforgettable.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Order Now',
  },
  bakery: {
    featureTitles: ['Freshly Baked Every Morning','Artisan Sourdough Breads','Handcrafted Pastries & Tarts','Custom Celebration Cakes','Seasonal Specialty Menu','Gluten-Free Selection'],
    featureDescs: [
      'We bake from 4am every day — so when you walk in, everything is still warm from the oven.',
      'Our sourdough starter is years old — slow fermented, properly scored, and baked in a steam-injected deck oven.',
      'From almond croissants to seasonal tarts — every pastry is made by hand from scratch, daily.',
      'Weddings, birthdays, and celebrations — custom cakes designed to impress and made to remember.',
      'Our menu changes with the season — raspberry tarts in summer, spiced sticky buns in winter.',
      'Because everyone should enjoy great baked goods — our gluten-free range doesn\'t cut corners on flavour.',
    ],
    heroSubs: [
      'We start baking at 4am so you can walk in to a warm croissant, a fresh loaf, and something made just for you.',
      'Sourdough that took years to perfect. Pastries made from scratch every morning. Cakes built to celebrate.',
      'Real baking — real flour, real butter, real time. Everything we sell was made in this kitchen this morning.',
    ],
    aboutBody: 'Every morning starts before sunrise. We mix the dough, laminate the pastry, fill the tarts, and set the cakes before most people wake up. When you walk in, you get the result of that effort — still warm, full of flavour, and made with genuine care.',
    aboutBullets: ['Baking starts at 4am every day','Sourdough starter years in the making','Every pastry laminated by hand','Custom celebration cakes available'],
    stats: [{number:'4am',label:'Baking Starts'},{number:'4.9★',label:'Guest Rating'},{number:'Daily',label:'Baked Fresh'},{number:'100%',label:'From Scratch'}],
    testimonialQuotes: [
      'The almond croissant alone is worth waking up early for. I\'ve never had a better pastry from a local bakery.',
      'The sourdough has the perfect crust and crumb. I\'ve stopped buying bread anywhere else since discovering this place.',
      'The custom birthday cake they made for my daughter was stunning and absolutely delicious. Exceeded every expectation.',
    ],
    testimonialRoles: ['Morning Regular','Bread Lover','Happy Parent'],
    missionBody: 'Great baking is about honouring the ingredients and the process — no shortcuts, no compromises. We do it properly every single morning.',
    heroTag: 'Artisan Bakery',
    ctaHeading: 'Come In Fresh',
    footerTagline: 'Handmade every morning, gone by afternoon.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Order a Custom Cake',
    contactSub: 'Enquiries about custom cakes, wholesale, or catering? We\'d love to hear from you.',
  },
  bar: {
    featureTitles: ['Craft Cocktail Program','Premium Spirits Collection','Seasonal Signature Drinks','Live Music & Entertainment','Private Event Bookings','Curated Wine & Sake Selection'],
    featureDescs: [
      'Our bartenders are trained mixologists — every drink built with intention, technique, and premium ingredients.',
      'Over 200 spirits from across the globe — whiskey, rum, agave, gin, and everything in between.',
      'Our cocktail menu rotates seasonally — always something new, crafted with the freshest ingredients.',
      'From jazz nights to DJ sets — live entertainment that sets the mood perfectly.',
      'Exclusive venue hire for corporate events, private parties, and intimate gatherings.',
      'A curated list of natural wines and premium sakes — expertly selected to pair with our menu.',
    ],
    heroSubs: [
      'The kind of bar where every drink is worth ordering and every night becomes a story you\'ll be telling for years.',
      'Premium spirits, craft cocktails, and an atmosphere that makes every visit feel like a special occasion.',
      'From the first sip to the last — this is drinking done properly.',
    ],
    aboutBody: 'We built this bar around one belief: a great drink deserves a great setting, and a great setting deserves a great drink. Our team sources obsessively, trains constantly, and crafts every cocktail with the kind of care you\'ll taste in the glass.',
    aboutBullets: ['200+ premium spirits on our shelves','Seasonally rotating cocktail menu','Certified mixology team','Private events and venue hire available'],
    stats: [{number:'200+',label:'Spirits Available'},{number:'4.9★',label:'Guest Rating'},{number:'Seasonal',label:'Cocktail Menu'},{number:'Nightly',label:'Entertainment'}],
    testimonialQuotes: [
      'The cocktails here are on another level — complex, balanced, and beautiful to look at. I\'ve been to bars all over the world and this is special.',
      'The atmosphere and the drinks are the perfect combination. Every visit feels like a proper evening out.',
      'We hosted our company event here and the team absolutely nailed it — drinks, service, and setting were exceptional.',
    ],
    testimonialRoles: ['Cocktail Enthusiast','Regular Guest','Corporate Events Client'],
    missionBody: 'We believe every drink should feel like it was made specifically for you. That means seasonal menus, obsessive sourcing, and a team that treats bartending as the craft it is.',
    heroTag: 'Premium Cocktail Bar',
    ctaHeading: 'Make a Reservation',
    footerTagline: 'Crafted drinks. Unforgettable nights.',
    primaryCta: 'View Our Menu',
    secondaryCta: 'Book a Table',
    contactSub: 'Interested in booking a table or hosting a private event? Get in touch and we\'ll make it happen.',
  },
  gym: {
    featureTitles: ['Expert-Led Strength Classes','Personal Training Programs','Nutrition & Recovery Coaching','State-of-the-Art Equipment','Member Progress Tracking','Open Gym Access 24/7'],
    featureDescs: [
      'Our certified coaches lead group and individual sessions designed to build real strength, not just burn calories.',
      'Customised programs built around your specific goals — whether that\'s your first deadlift or your next competition.',
      'Macros, meal planning, and recovery protocols — because what happens outside the gym matters too.',
      'Barbells, cables, machines, and cardio equipment maintained to the highest standard and always available.',
      'Log your lifts, track your PRs, and see your progress over time — data-driven improvement.',
      'Train on your schedule with round-the-clock access — the gym works when you do.',
    ],
    heroSubs: [
      'This is where athletes are built — through expert coaching, progressive training, and an environment that demands your best.',
      'Real strength training, expert guidance, and a community that shows up every single day. This is your gym.',
      'We don\'t just give you a place to work out — we give you a system, a coach, and a community to get genuinely stronger.',
    ],
    aboutBody: 'We built this gym because we were tired of spaces that prioritised aesthetics over results. Here, everything is designed around one goal: making you measurably stronger, healthier, and more capable. Expert coaching, smart programming, and a community that keeps you accountable.',
    aboutBullets: ['CF-L2 certified coaching team','Progressive strength programming','Nutrition and recovery support','24/7 open gym access'],
    stats: [{number:'500+',label:'Active Members'},{number:'CF-L2',label:'Head Coach Certified'},{number:'5/5',label:'Coaching Rating'},{number:'24/7',label:'Open Access'}],
    testimonialQuotes: [
      'I\'ve been training here for 2 years and the progress I\'ve made is beyond anything I achieved in 5 years elsewhere. The coaching makes all the difference.',
      'The coaches actually care about your goals and design your training around them. I hit a 100kg deadlift I didn\'t think was possible.',
      'Best gym environment I\'ve ever been in — the community, the programming, and the coaching are all exceptional.',
    ],
    testimonialRoles: ['2-Year Member','Personal Training Client','Competitive Athlete'],
    missionBody: 'Strength doesn\'t come from working harder — it comes from working smarter, with expert guidance, smart programming, and a community that holds the standard.',
    heroTag: 'Premium Strength Gym',
    ctaHeading: 'Start Your Training',
    footerTagline: 'Built for athletes. Open to all.',
    primaryCta: 'Start Training',
    secondaryCta: 'View Programs',
    contactSub: 'Questions about membership, programs, or personal training? We\'re here to help.',
  },
  crossfit: {
    featureTitles: ['Daily CrossFit WODs','Olympic Weightlifting Program','Metcon & Endurance Training','CF-L2 Certified Coaches','Competition Prep Coaching','Open Gym & Skill Work'],
    featureDescs: [
      'Constantly varied, high-intensity functional movements — programmed to make you better at everything.',
      'Clean, snatch, jerk — proper Olympic lifting technique taught from first principles by certified specialists.',
      'AMRAPs, EMOMs, and chippers — metabolic conditioning that builds the engine to do anything.',
      'Every coach holds Level 2 certification minimum — your movement is always in expert, qualified hands.',
      'From your first local competition to the CrossFit Games — structured prep programs that get you ready.',
      'Drop into open gym to work on gymnastics, barbell cycling, or skills that need focused solo practice.',
    ],
    heroSubs: [
      'Every WOD is programmed to build a more complete athlete — strength, speed, power, and endurance, all in one community.',
      'CF-L2 coaches, proven programming, and a community that cheers you to the finish line every single time.',
      'We train together, we compete together, and we grow together. This is what CrossFit is supposed to feel like.',
    ],
    aboutBody: 'This box was built by athletes, for athletes. We program with intention — not just for fitness, but for real athletic development. From your first pull-up to your first competition, every stage has structured, expert-coached programming designed to take you further.',
    aboutBullets: ['CF-L2 certified coaches minimum','Constantly varied WOD programming','Olympic lifting and gymnastics skills','Competition prep for all levels'],
    stats: [{number:'200+',label:'Active Members'},{number:'CF-L2',label:'All Coaches Certified'},{number:'5+ yrs',label:'Affiliating'},{number:'Weekly',label:'Competition Prep'}],
    testimonialQuotes: [
      'I came in as a complete beginner and within 6 months I competed in my first local competition. The coaching here is incredible.',
      'The programming is thoughtful and progressive — I\'ve set more PRs in the last year than in the previous three years combined.',
      'Best CrossFit community I\'ve been part of. The coaches know everyone by name and genuinely care about your progress.',
    ],
    testimonialRoles: ['CrossFit Games Qualifier','3-Year Member','Beginner-Turned-Competitor'],
    missionBody: 'We program for real athletic development — not just fitness. Every WOD, every cycle, and every coaching cue is designed to make you more capable than you were yesterday.',
    heroTag: 'CrossFit Affiliate',
    ctaHeading: 'Join the Box',
    footerTagline: 'Strong. Fast. Capable. Together.',
    primaryCta: 'Free Trial Class',
    secondaryCta: 'View Programs',
    contactSub: 'Interested in a free trial class or want to learn about our programs? Get in touch.',
  },
  yoga: {
    featureTitles: ['Daily Yoga & Flow Classes','Meditation & Pranayama Sessions','Restorative & Yin Yoga','200-Hour Teacher Training','Private One-on-One Sessions','Workshops & Seasonal Retreats'],
    featureDescs: [
      'Morning and evening classes for all levels — from complete beginners to advanced practitioners.',
      'Guided breathwork and meditation that reduces stress and builds presence and clarity.',
      'Deep, slow, healing practices designed to restore the nervous system and release held tension.',
      'A comprehensive teacher training program built on authentic lineage, anatomy, and practice philosophy.',
      'Private sessions tailored entirely to your needs — injury recovery, deepening practice, or foundational learning.',
      'Monthly workshops, seasonal immersions, and annual retreats that take your practice to a new depth.',
    ],
    heroSubs: [
      'A practice that meets you where you are — whatever your level, your body, or your intention. This is your space.',
      'Classes for every style, every level, and every body. Come as you are. Leave feeling transformed.',
      'Yoga beyond the postures — movement, breath, meditation, and community, all in one place.',
    ],
    aboutBody: 'We created this studio to be the kind of space we always wanted to practice in — warm, inclusive, well-taught, and genuinely committed to the transformative potential of yoga. Our teachers are deeply trained and endlessly curious. Our space is designed for every stage of the practice.',
    aboutBullets: ['20+ weekly classes for all levels','200-hour YTT program available','Restorative, yin, and vinyasa','Workshops and retreats throughout the year'],
    stats: [{number:'20+',label:'Weekly Classes'},{number:'200hr',label:'YTT Program'},{number:'4.9★',label:'Student Rating'},{number:'All',label:'Levels Welcome'}],
    testimonialQuotes: [
      'I started as a complete beginner six months ago and I can already feel the difference in my body, my sleep, and my stress levels. The teachers here are exceptional.',
      'The restorative class on Sunday evenings has become the most important hour of my week. I can\'t recommend this studio enough.',
      'The 200-hour teacher training was life-changing. Deep, rigorous, and led with so much heart. Couldn\'t recommend it more.',
    ],
    testimonialRoles: ['6-Month Student','Restorative Yoga Devotee','YTT Graduate'],
    missionBody: 'Yoga has the power to transform how you feel in your body and how you show up in your life. Our job is to create the conditions — space, teaching, and community — for that to happen.',
    heroTag: 'Yoga & Meditation Studio',
    ctaHeading: 'Start Your Practice',
    footerTagline: 'Your practice. Your space. Your transformation.',
    primaryCta: 'View Schedule',
    secondaryCta: 'Free First Class',
    contactSub: 'Questions about our classes, teacher training, or retreats? We\'d love to hear from you.',
  },
  spa: {
    featureTitles: ['Signature Full-Body Massage','Advanced Facial Treatments','Hot Stone & Deep Tissue Therapy','Aromatherapy & Sensory Healing','Couples Wellness Packages','Day Retreat & Detox Programs'],
    featureDescs: [
      'Our signature 90-minute massage integrates Swedish, deep tissue, and myofascial techniques for total release.',
      'Medical-grade facials using premium active skincare — tailored to your skin type, season, and goals.',
      'Heated basalt stones combined with skilled pressure work — profound muscle release and full body relaxation.',
      'Custom essential oil blends selected for your mood and intention — calming, energising, or deeply restorative.',
      'A shared wellness journey for two — massages, facials, and a private relaxation suite for your perfect day.',
      'A full-day sanctuary experience with steam room, plunge pool, and a carefully sequenced treatment program.',
    ],
    heroSubs: [
      'A sanctuary from the relentless pace of modern life — where every treatment is crafted to restore, renew, and reconnect.',
      'We believe rest is not a luxury — it is essential. Every treatment here gives your body and mind what they need.',
      'Expert therapists, premium products, and a space designed for complete surrender. Your wellness starts the moment you arrive.',
    ],
    aboutBody: 'We opened this sanctuary with a simple belief — that genuine relaxation and expert wellness care should be beautiful, accessible, and deeply restorative. Every treatment is led by certified therapists trained in multiple modalities, using only the most carefully sourced products.',
    aboutBullets: ['15+ treatments offered','All therapists fully certified','Natural and organic products only','Couples and group packages available'],
    stats: [{number:'15+',label:'Treatments Offered'},{number:'4.9★',label:'Guest Rating'},{number:'Certified',label:'All Therapists'},{number:'100%',label:'Natural Products'}],
    testimonialQuotes: [
      'The hot stone massage was the deepest, most restorative treatment I\'ve ever experienced. I floated out of there.',
      'The facial transformed my skin in one session. The therapist took so much care to understand my skin before beginning. Outstanding.',
      'We came for our anniversary and the couples package was absolutely perfect. The attention to detail throughout was remarkable.',
    ],
    testimonialRoles: ['Wellness Regular','Skin Treatment Client','Anniversary Guest'],
    missionBody: 'We believe that deep rest, skilled touch, and a beautiful environment have the power to restore what modern life depletes. Every treatment we offer is built on that belief.',
    heroTag: 'Luxury Wellness Spa',
    ctaHeading: 'Book Your Treatment',
    footerTagline: 'Restore. Renew. Return.',
    primaryCta: 'Book a Treatment',
    secondaryCta: 'View All Treatments',
    contactSub: 'Ready to book a treatment or have a question about our packages? We\'re here to help.',
  },
  photography: {
    featureTitles: ['Commercial Brand Photography','Editorial Portrait Sessions','Product & Lifestyle Shoots','Event & Wedding Coverage','Advanced Post-Production','Studio Hire & Location Scouting'],
    featureDescs: [
      'Campaign imagery, brand storytelling, and commercial content that sells and tells your story.',
      'Portraits that capture authenticity — from executive headshots to full editorial character studies.',
      'Studio and location product photography that makes every item look its absolute best.',
      'Full coverage that captures every emotion, moment, and detail — from candid to choreographed.',
      'Advanced colour grading, skin retouching, and compositing — delivered to broadcast quality.',
      'A fully equipped studio available for rent, with location scouting service for any vision.',
    ],
    heroSubs: [
      'Every image we create is a deliberate decision — about light, framing, timing, and the story being told. That\'s the difference.',
      'Photography that doesn\'t just document — it transforms. We create images that move, persuade, and stay with you.',
      'From first concept to final delivery, we build every image around your vision and execute it with precision.',
    ],
    aboutBody: 'Photography is about far more than pressing a button — it\'s about seeing, preparing, and understanding what needs to be said. We\'ve spent years developing our eye, our technical skill, and our ability to work with any subject to create images that exceed expectations.',
    aboutBullets: ['300+ commercial shoots completed','12+ years professional experience','24-hour proof turnaround','Fully equipped studio available'],
    stats: [{number:'300+',label:'Shoots Completed'},{number:'12+',label:'Years Experience'},{number:'4.9★',label:'Client Rating'},{number:'24hr',label:'Proof Turnaround'}],
    testimonialQuotes: [
      'The campaign images they produced for our brand launch were simply outstanding — better than anything we\'d hoped for.',
      'Our portraits captured exactly who we are as a team. The photographer\'s ability to put people at ease is exceptional.',
      'Every product shot delivered exceeded the brief. The attention to detail and creative input were genuinely impressive.',
    ],
    testimonialRoles: ['Brand Director','Head of Marketing','E-commerce Director'],
    missionBody: 'Every image we make is a chance to say something true, beautiful, and useful. We approach every brief with that responsibility and the craft to execute it properly.',
    heroTag: 'Professional Photography',
    ctaHeading: 'Let\'s Create Something',
    footerTagline: 'Seeing the world. Capturing what matters.',
    primaryCta: 'View Portfolio',
    secondaryCta: 'Book a Shoot',
    contactSub: 'Ready to discuss your project or book a shoot? Get in touch — we\'d love to hear what you have in mind.',
  },
  fashion: {
    featureTitles: ['Curated Seasonal Collections','Sustainable & Ethical Sourcing','Signature House Designs','Limited Edition Drops','Personal Styling Consultations','Custom & Bespoke Tailoring'],
    featureDescs: [
      'Two collections per year — each piece designed to work across occasions and built to outlast trends.',
      'Every fabric and manufacturer chosen for quality, transparency, and environmental responsibility.',
      'Our in-house design team creates pieces that are distinctly our own — identifiable without being labeled.',
      'Exclusive runs in small quantities — designed to be coveted, not commoditised.',
      'One-on-one sessions with our stylists to find exactly what you need for your wardrobe and your life.',
      'Tailored to your measurements and finished to couture standard — clothing that fits only you.',
    ],
    heroSubs: [
      'Fashion built to last — in quality, in design, and in how it makes you feel every time you wear it.',
      'We design for the person who wants to look exceptional without following trends. Considered, refined, and always intentional.',
      'Every piece we make starts with the question: will this still feel right in ten years? If the answer is yes, we make it.',
    ],
    aboutBody: 'We started this label because we were tired of fashion that didn\'t last — in construction, in design, or in meaning. Every piece we release is considered, crafted from responsible materials, and designed to transcend seasons.',
    aboutBullets: ['Two thoughtful collections per year','100% ethical and sustainable sourcing','In-house design team','Custom and bespoke tailoring available'],
    stats: [{number:'2',label:'Collections per Year'},{number:'4.9★',label:'Customer Rating'},{number:'100%',label:'Ethical Sourcing'},{number:'Limited',label:'Edition Runs'}],
    testimonialQuotes: [
      'The quality of construction is unlike anything in this price range. I\'ve worn my jacket from their first collection almost weekly for two years.',
      'The personal styling session was worth every minute. They understand how to dress real people for real life.',
      'The bespoke suit they made me is the best piece of clothing I own. The fit and finish are immaculate.',
    ],
    testimonialRoles: ['2-Year Customer','Styling Client','Bespoke Tailoring Client'],
    missionBody: 'We make fashion with a conscience and a perspective — believing that the most stylish thing you can do is invest in quality that endures.',
    heroTag: 'Contemporary Fashion Label',
    ctaHeading: 'Explore the Collection',
    footerTagline: 'Designed to endure. Made to be worn.',
    primaryCta: 'Shop the Collection',
    secondaryCta: 'New Arrivals',
    contactSub: 'Questions about sizing, bespoke orders, or styling consultations? We\'d love to help.',
  },
};

function resolveSubNicheCopy(puo: PromptUnderstandingObject): SubNicheCopyBank | null {
  // Check extracted keywords first (most specific signal)
  for (const kw of puo.extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_COPY_BANK[k]) return SUBNICHE_COPY_BANK[k];
  }
  // Fall back to inferredIndustry (raw, not normalised — preserves 'yoga', 'ramen', etc.)
  const raw = puo.inferredIndustry.toLowerCase();
  return SUBNICHE_COPY_BANK[raw] || null;
}

// ─────────────────────────────────────────────────────────────────
// PRODUCT / MENU BANKS — real items with name, description, and price.
// Used to render a genuine Menu/Products/Shop grid (not just a photo
// gallery) for niches where customers browse purchasable items.
// ─────────────────────────────────────────────────────────────────

interface ProductBank { eyebrow: string; items: Array<{ name: string; desc: string; price: string }>; }

const SUBNICHE_PRODUCTS: Record<string, ProductBank> = {
  coffee: { eyebrow: 'Our Menu', items: [
    { name: 'Espresso', desc: 'A rich, full-bodied double shot with a thick golden crema.', price: '$3.50' },
    { name: 'Cappuccino', desc: 'Equal parts espresso, steamed milk, and velvety microfoam.', price: '$4.50' },
    { name: 'Caffè Latte', desc: 'Smooth espresso with steamed milk and a light layer of foam.', price: '$4.75' },
    { name: 'Flat White', desc: 'Ristretto shots topped with silky steamed milk — coffee-forward.', price: '$4.50' },
    { name: 'Iced Coffee', desc: 'Slow-steeped and served over ice for a crisp, refreshing cup.', price: '$4.25' },
    { name: 'Cold Brew', desc: 'Steeped 18 hours for a smooth, naturally sweet, low-acid finish.', price: '$5.00' },
    { name: 'Pour-Over', desc: 'Single-origin beans brewed by hand to highlight delicate notes.', price: '$5.50' },
    { name: 'Butter Croissant', desc: 'Flaky, golden, and baked fresh in-house every morning.', price: '$3.75' },
  ] },
  cafe: { eyebrow: 'Our Menu', items: [
    { name: 'Flat White', desc: 'Ristretto shots topped with silky steamed milk — coffee-forward.', price: '$4.50' },
    { name: 'Avocado Toast', desc: 'Sourdough, smashed avocado, chilli, and a soft poached egg.', price: '$11.00' },
    { name: 'Breakfast Bowl', desc: 'Eggs, greens, roasted veg, and house dressing — all day.', price: '$13.50' },
    { name: 'Almond Croissant', desc: 'Buttery croissant filled with frangipane and toasted almonds.', price: '$4.25' },
    { name: 'Iced Latte', desc: 'House espresso over cold milk and ice — smooth and refreshing.', price: '$4.75' },
    { name: 'Seasonal Cake', desc: 'A rotating slice baked fresh — ask about today\'s selection.', price: '$5.50' },
  ] },
  espresso: { eyebrow: 'Our Menu', items: [
    { name: 'Single Espresso', desc: 'A precise single shot pulled to highlight origin character.', price: '$3.00' },
    { name: 'Double Espresso', desc: 'Two shots of intense, balanced espresso with rich crema.', price: '$3.75' },
    { name: 'Cortado', desc: 'Equal espresso and warm milk — bold but beautifully smooth.', price: '$4.00' },
    { name: 'Macchiato', desc: 'Espresso "stained" with a dollop of textured milk foam.', price: '$3.75' },
    { name: 'Flat White', desc: 'Ristretto shots with silky microfoam — intensely coffee-forward.', price: '$4.50' },
    { name: 'Ristretto', desc: 'A short, concentrated extraction — sweeter and more intense.', price: '$3.50' },
  ] },
  ramen: { eyebrow: 'Our Menu', items: [
    { name: 'Tonkotsu Ramen', desc: '18-hour pork broth, chashu, soft egg, scallion, and nori.', price: '$16.00' },
    { name: 'Shoyu Ramen', desc: 'Soy-based clear broth with chicken, bamboo, and fresh noodles.', price: '$15.00' },
    { name: 'Miso Ramen', desc: 'Rich fermented-miso broth, corn, butter, and ground pork.', price: '$15.50' },
    { name: 'Spicy Tantanmen', desc: 'Sesame-chilli broth with minced pork and a fiery oil finish.', price: '$16.50' },
    { name: 'Vegetable Ramen', desc: 'Kombu-shiitake broth with seasonal vegetables and tofu.', price: '$14.50' },
    { name: 'Gyoza (6 pc)', desc: 'Pan-fried pork-and-cabbage dumplings with dipping sauce.', price: '$7.00' },
  ] },
  sushi: { eyebrow: 'Our Menu', items: [
    { name: 'Chef\'s Omakase', desc: 'An 8–12 piece journey through today\'s finest catch.', price: '$65.00' },
    { name: 'Salmon Nigiri (2 pc)', desc: 'Fresh salmon over hand-pressed seasoned rice.', price: '$7.00' },
    { name: 'Tuna Sashimi', desc: 'Five slices of premium daily-sourced bluefin tuna.', price: '$14.00' },
    { name: 'Dragon Roll', desc: 'Eel and cucumber topped with avocado and unagi glaze.', price: '$16.00' },
    { name: 'Spicy Tuna Roll', desc: 'Diced tuna, chilli mayo, and cucumber, finished with sesame.', price: '$12.00' },
    { name: 'Miso Soup', desc: 'Traditional dashi and miso with tofu, wakame, and scallion.', price: '$4.00' },
  ] },
  pizza: { eyebrow: 'Our Menu', items: [
    { name: 'Margherita', desc: 'San Marzano tomato, fresh mozzarella, basil, olive oil.', price: '$14.00' },
    { name: 'Marinara', desc: 'Tomato, garlic, oregano, and olive oil — no cheese, all flavour.', price: '$12.00' },
    { name: 'Diavola', desc: 'Spicy salami, mozzarella, tomato, and a chilli-oil finish.', price: '$16.00' },
    { name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, fontina, and parmesan.', price: '$17.00' },
    { name: 'Prosciutto & Rocket', desc: 'Cured ham, fresh rocket, and shaved parmesan after the bake.', price: '$18.00' },
    { name: 'Funghi', desc: 'Wild mushrooms, mozzarella, thyme, and truffle oil.', price: '$16.50' },
  ] },
  burger: { eyebrow: 'Our Menu', items: [
    { name: 'The Classic', desc: 'Fresh-ground patty, cheddar, lettuce, tomato, house sauce.', price: '$12.00' },
    { name: 'Double Smash', desc: 'Two smashed patties, American cheese, pickles, onions.', price: '$15.00' },
    { name: 'Bacon BBQ', desc: 'Smoked bacon, cheddar, crispy onions, and smoky BBQ sauce.', price: '$15.50' },
    { name: 'Mushroom Swiss', desc: 'Sautéed mushrooms, melted swiss, and garlic aioli.', price: '$14.50' },
    { name: 'Plant-Based', desc: 'House veggie patty, vegan cheese, and all the trimmings.', price: '$14.00' },
    { name: 'Hand-Cut Fries', desc: 'Skin-on fries with our signature seasoning blend.', price: '$5.00' },
  ] },
  bakery: { eyebrow: 'Fresh Today', items: [
    { name: 'Sourdough Loaf', desc: 'Naturally leavened, slow-fermented, with a crackling crust.', price: '$8.00' },
    { name: 'Butter Croissant', desc: 'Flaky, golden, and laminated by hand each morning.', price: '$3.75' },
    { name: 'Pain au Chocolat', desc: 'Buttery layers wrapped around rich dark chocolate batons.', price: '$4.25' },
    { name: 'Cinnamon Roll', desc: 'Soft, spiced, and finished with a cream-cheese glaze.', price: '$4.50' },
    { name: 'Fruit Danish', desc: 'Seasonal fruit on a vanilla custard pastry base.', price: '$4.75' },
    { name: 'Custom Cake', desc: 'Made to order for birthdays, weddings, and celebrations.', price: 'From $45' },
  ] },
  bar: { eyebrow: 'Cocktail List', items: [
    { name: 'Old Fashioned', desc: 'Bourbon, demerara, and aromatic bitters over a clear cube.', price: '$14.00' },
    { name: 'Negroni', desc: 'Equal parts gin, Campari, and sweet vermouth, orange twist.', price: '$13.00' },
    { name: 'Espresso Martini', desc: 'Vodka, coffee liqueur, and a fresh shot of espresso.', price: '$15.00' },
    { name: 'Margarita', desc: 'Blanco tequila, lime, and orange liqueur with a salt rim.', price: '$13.00' },
    { name: 'House Negroni Sbagliato', desc: 'Campari and vermouth lengthened with sparkling wine.', price: '$14.00' },
    { name: 'Seasonal Signature', desc: 'Ask your bartender about tonight\'s house creation.', price: '$16.00' },
  ] },
};

const NICHE_PRODUCTS: Record<string, ProductBank> = {
  food: { eyebrow: 'Our Menu', items: [
    { name: 'Chef\'s Signature', desc: 'Our most-loved dish, crafted from the freshest seasonal produce.', price: '$24.00' },
    { name: 'Starter Selection', desc: 'A rotating plate of house starters to begin your meal.', price: '$12.00' },
    { name: 'Daily Special', desc: 'Ask your server about today\'s freshly prepared special.', price: '$22.00' },
    { name: 'House Dessert', desc: 'A handmade sweet finish, changed with the season.', price: '$9.00' },
    { name: 'Seasonal Plate', desc: 'Built around what\'s best at the market this week.', price: '$20.00' },
    { name: 'Sharing Board', desc: 'A generous selection designed for the table to share.', price: '$26.00' },
  ] },
  ecommerce: { eyebrow: 'Featured Products', items: [
    { name: 'Best Seller', desc: 'Our most popular product, loved by thousands of customers.', price: '$49.00' },
    { name: 'New Arrival', desc: 'Fresh in this season — premium quality, limited stock.', price: '$59.00' },
    { name: 'Editor\'s Pick', desc: 'Hand-selected by our team for exceptional quality and value.', price: '$45.00' },
    { name: 'Bundle Set', desc: 'Everything you need in one carefully curated package.', price: '$89.00' },
    { name: 'Premium Edition', desc: 'Our top-tier offering with elevated materials and finish.', price: '$79.00' },
    { name: 'Essentials Kit', desc: 'The everyday staples, thoughtfully sourced and built to last.', price: '$39.00' },
  ] },
  fashion: { eyebrow: 'The Collection', items: [
    { name: 'Signature Coat', desc: 'Tailored from premium wool with a clean, timeless silhouette.', price: '$320.00' },
    { name: 'Everyday Knit', desc: 'Soft, breathable, and cut for an effortless modern fit.', price: '$120.00' },
    { name: 'Tailored Trouser', desc: 'A refined straight-leg trouser in a versatile mid-weight.', price: '$160.00' },
    { name: 'Classic Shirt', desc: 'Crisp, structured, and finished with mother-of-pearl buttons.', price: '$110.00' },
    { name: 'Leather Accessory', desc: 'Full-grain leather, hand-finished and built to age beautifully.', price: '$95.00' },
    { name: 'Limited Edition', desc: 'A small-run piece from our latest seasonal drop.', price: '$240.00' },
  ] },
};

function resolveProducts(puo: PromptUnderstandingObject, normIndustry: string): ProductBank | null {
  for (const kw of puo.extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_PRODUCTS[k]) return SUBNICHE_PRODUCTS[k];
  }
  const raw = puo.inferredIndustry.toLowerCase();
  if (SUBNICHE_PRODUCTS[raw]) return SUBNICHE_PRODUCTS[raw];
  return NICHE_PRODUCTS[normIndustry] || null;
}

// ─────────────────────────────────────────────────────────────────
// FAQ BANKS — niche-specific questions. A coffee shop never shows
// "Is there a free plan available?" — it shows hours, ordering, etc.
// ─────────────────────────────────────────────────────────────────

const NICHE_FAQ: Record<string, Array<{ q: string; a: string }>> = {
  food: [
    { q: 'Do you take reservations?', a: 'Yes — you can book a table through our contact page or by giving us a call. Walk-ins are always welcome too.' },
    { q: 'What are your opening hours?', a: 'We\'re open seven days a week. Check our contact section for today\'s hours — we\'re here morning through evening.' },
    { q: 'Do you cater to dietary requirements?', a: 'Absolutely. We offer vegetarian, vegan, and gluten-free options, and our team is happy to accommodate allergies.' },
    { q: 'Can I order for takeaway or delivery?', a: 'Yes — order ahead for pickup, and delivery is available through our partners in the local area.' },
  ],
  sports: [
    { q: 'Do I need experience to join?', a: 'Not at all. Our programs scale to every level, and our coaches will guide you from your very first session.' },
    { q: 'What should I bring to my first class?', a: 'Just comfortable training clothes, a water bottle, and a willingness to work. We\'ll handle the rest.' },
    { q: 'Are there flexible membership options?', a: 'Yes — we offer monthly, class-pack, and annual memberships so you can train on your terms.' },
    { q: 'Do you offer personal training?', a: 'We do. One-on-one coaching is available for anyone who wants a fully personalised program.' },
  ],
  wellness: [
    { q: 'How do I book a session?', a: 'You can book directly through our contact page or by calling us. We recommend booking ahead for popular times.' },
    { q: 'What should I expect on my first visit?', a: 'Arrive a few minutes early so we can welcome you, understand your needs, and make sure you\'re fully comfortable.' },
    { q: 'Do you offer packages or memberships?', a: 'Yes — we offer single sessions, multi-session packages, and memberships for regular guests.' },
    { q: 'Can I request a specific therapist or class?', a: 'Of course. Let us know your preference when booking and we\'ll do our best to accommodate you.' },
  ],
  photography: [
    { q: 'How do I book a shoot?', a: 'Reach out through our contact page with a few details about your project and we\'ll get back to you within 24 hours.' },
    { q: 'What\'s your turnaround time?', a: 'Proofs are typically delivered within 24–48 hours, with final edited images following shortly after.' },
    { q: 'Do you travel for shoots?', a: 'Yes — we shoot on location locally and can travel further afield for the right project.' },
    { q: 'Can we discuss the concept beforehand?', a: 'Absolutely. Every project starts with a conversation to align on vision, style, and deliverables.' },
  ],
  fashion: [
    { q: 'What is your sizing and fit like?', a: 'Each product page includes a detailed size guide. If you\'re between sizes, our team is happy to advise.' },
    { q: 'What is your returns policy?', a: 'We offer easy 30-day returns on unworn items. Bespoke and made-to-order pieces are final sale.' },
    { q: 'Do you ship internationally?', a: 'Yes — we ship worldwide, with rates and delivery times calculated at checkout.' },
    { q: 'Do you offer styling advice?', a: 'We do. Book a personal styling consultation and we\'ll help you build pieces that work for your life.' },
  ],
  ecommerce: [
    { q: 'How long does shipping take?', a: 'Standard orders ship within 1–2 business days, with delivery typically in 3–5 days depending on location.' },
    { q: 'What is your return policy?', a: 'We offer hassle-free 30-day returns. If you\'re not happy, send it back for a full refund.' },
    { q: 'Do you ship internationally?', a: 'Yes — we ship to most countries, with shipping costs calculated at checkout.' },
    { q: 'How can I track my order?', a: 'You\'ll receive a tracking link by email as soon as your order leaves our warehouse.' },
  ],
  agency: [
    { q: 'How do we start working together?', a: 'It begins with a discovery call to understand your goals, followed by a tailored proposal and scope.' },
    { q: 'What is your typical project timeline?', a: 'Timelines vary by scope, but most engagements run between four and twelve weeks from kickoff to delivery.' },
    { q: 'Do you work with our existing team?', a: 'Absolutely. We integrate seamlessly with in-house teams and can lead or support as needed.' },
    { q: 'How do you measure success?', a: 'We define clear KPIs at the outset and report against them throughout the engagement.' },
  ],
  portfolio: [
    { q: 'Are you available for new projects?', a: 'Yes — reach out through the contact page and let\'s talk about what you have in mind.' },
    { q: 'What is your process like?', a: 'Every project starts with understanding your goals, followed by concepts, refinement, and delivery.' },
    { q: 'Do you work remotely?', a: 'I work with clients both locally and remotely, collaborating however suits your team best.' },
    { q: 'How do we get started?', a: 'Send a short brief through the contact form and I\'ll get back to you to discuss next steps.' },
  ],
  hospitality: [
    { q: 'How do I make a booking?', a: 'You can book directly through our contact page or by calling our front desk — we\'re here to help.' },
    { q: 'What are your check-in times?', a: 'Check-in is from mid-afternoon and check-out is late morning. Early check-in is subject to availability.' },
    { q: 'Do you offer amenities and services?', a: 'Yes — from dining to concierge, we offer a full range of services to make your stay seamless.' },
    { q: 'Is parking available?', a: 'On-site and nearby parking options are available. Contact us ahead of your visit for details.' },
  ],
  technology: [
    { q: 'How do I get started?', a: 'Getting started is easy — sign up, follow the guided onboarding, and you\'ll be up and running in minutes.' },
    { q: 'Is there a free plan available?', a: 'Yes, we offer a free plan with core features so you can try the platform before upgrading.' },
    { q: 'Can I cancel at any time?', a: 'Absolutely. There are no long-term contracts — change or cancel your plan whenever you like.' },
    { q: 'Do you offer customer support?', a: 'We provide support through chat and email, with priority and dedicated support on higher plans.' },
  ],
  general: [
    { q: 'How do I get in touch?', a: 'The fastest way is through our contact page — we respond to every enquiry within 24 hours.' },
    { q: 'Where are you located?', a: 'You\'ll find our full address and opening hours in the contact section below.' },
    { q: 'What makes you different?', a: 'We pair genuine expertise with a relentless focus on quality and a service experience people remember.' },
    { q: 'Do you offer consultations?', a: 'Yes — reach out and we\'ll be happy to discuss exactly how we can help you.' },
  ],
};

function resolveFaqs(normIndustry: string): Array<{ q: string; a: string }> {
  return NICHE_FAQ[normIndustry] || NICHE_FAQ.general;
}

// Niche-appropriate CTA subline (replaces the SaaS "no credit card required").
const CTA_SUB_BY_NICHE: Record<string, string> = {
  food: 'Reserve your table or stop by today — we can\'t wait to welcome you.',
  sports: 'Book your first session today and feel the difference real coaching makes.',
  wellness: 'Book your treatment today and give yourself the rest you deserve.',
  photography: 'Tell us about your project — we\'ll bring your vision to life.',
  fashion: 'Explore the collection and find pieces made to last.',
  ecommerce: 'Browse the collection and enjoy fast, free shipping on every order.',
  agency: 'Let\'s talk about your goals and build something that moves the needle.',
  portfolio: 'Have a project in mind? Let\'s create something exceptional together.',
  hospitality: 'Book your stay today and experience hospitality done right.',
  technology: 'Get started in minutes. No credit card required.',
  general: 'Get in touch today — we\'d love to hear from you.',
};

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
  // Sub-niche copy bank — deeply specific content for known sub-niches.
  const subNiche = resolveSubNicheCopy(puo);

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
  const heroSubPatterns = subNiche?.heroSubs || [
    `Premium ${subjectPhrase} crafted for those who expect more — where ${supportPhrase} meets uncompromising quality.`,
    `Discover ${brand}: a new standard in ${subjectPhrase}, built around ${supportPhrase} and an obsession with detail.`,
    `Experience ${subjectPhrase} done right. Thoughtfully designed, expertly delivered, and made to leave an impression.`,
    `${brand} brings ${subjectPhrase} and ${supportPhrase} together into one seamless, elevated experience.`,
    `Where ${subjectPhrase} becomes an experience. Refined, considered, and crafted for you.`,
  ];
  const heroSub = pick(heroSubPatterns, fp + 2);

  // CTA text — NICHE first (so a coffee shop says "View Menu", not "Get Started"),
  // then fall back to layout direction, then a safe default.
  const ctaByNiche: Record<string, string> = {
    food: 'View Menu', sports: 'Start Training', technology: 'Start Free Trial',
    photography: 'View Portfolio', fashion: 'Shop the Collection', ecommerce: 'Shop Now',
    portfolio: 'View Work', agency: 'Start a Project', wellness: 'Book a Session',
    hospitality: 'Book Your Stay', professional: 'Get a Consultation',
  };
  const ctaMap: Record<string, string> = {
    'e-commerce': 'Shop Now', saas: 'Start Free Trial', 'lead-gen': 'Get Started Free',
    landing: 'Get Started', portfolio: 'View My Work', editorial: 'Read More',
    application: 'Launch App', showcase: 'Explore', dashboard: 'Open Dashboard',
    'multi-page': 'Get Started', 'single-page': 'Learn More',
  };
  const primaryCta = subNiche?.primaryCta || ctaByNiche[normIndustry] || ctaMap[direction] || 'Get Started';
  const secByNiche: Record<string, string> = {
    food: 'Book a Table', sports: 'See Programs', technology: 'Watch Demo',
    photography: 'See Our Work', fashion: 'New Arrivals', ecommerce: 'Browse Shop',
    portfolio: 'View Work', agency: 'Our Process', wellness: 'Learn More',
    hospitality: 'Explore Rooms', professional: 'Learn More',
  };
  const secondaryCta = subNiche?.secondaryCta || secByNiche[normIndustry] || pick(['Learn More', 'See How It Works', 'Explore', 'View Work', 'Discover More'] as const, fp + 1);

  // Hero tag
  const heroTags = ['New Launch', 'Now Available', `${mainKw} Platform`, `${industry !== 'general' ? titleCase(industry) + ' ' : ''}Solution`, 'Trusted by Thousands', 'Award Winning', 'Free to Start'];
  const heroTag = subNiche?.heroTag || pick(heroTags, fp + 3);

  // Section eyebrow
  const eyebrows = ['Why Choose Us', 'What We Offer', 'Our Approach', 'How We Help', 'The Difference', 'Built for You', 'What Sets Us Apart'];
  const sectionEyebrow = pick(eyebrows, fp + 7);

  // Feature heading — niche-safe phrasing (avoids SaaS-only idioms like "at Scale"
  // appearing on a coffee shop or restaurant).
  const featureHeadings = [`Crafted for ${mainKw} Lovers`, `Built Around ${mainKw}`, `The Complete ${mainKw} Experience`, `Why Choose Our ${mainKw}`, `Everything ${mainKw}, Done Right`];
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

  const allKwFeatures = subNiche
    ? subNiche.featureTitles.slice(0, 6).map((title, i) => ({
        icon: ICONS[(fp + i) % ICONS.length],
        title,
        desc: subNiche.featureDescs[i] || descFor(title.toLowerCase()),
        href: featureHref,
      }))
    : kws.slice(0, 6).map((kw, i) => ({
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
  const stats = (subNiche?.stats || statBanks[normIndustry] || statBanks.general).slice(0, 4);

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
  const roles = subNiche?.testimonialRoles || TESTIMONIAL_ROLES[normIndustry] || TESTIMONIAL_ROLES.general;

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
  const quotes = subNiche?.testimonialQuotes || TESTIMONIAL_QUOTES[normIndustry] || TESTIMONIAL_QUOTES.general;
  const names = ['Alex Chen', 'Sarah Miller', 'Marcus Johnson'];
  const testimonials = names.map((name, i) => ({
    quote: quotes[i] || quotes[0],
    name,
    role: roles[i] || roles[0],
  }));

  // About
  const aboutHeading = `The ${brand} Story`;
  const aboutBody = subNiche?.aboutBody || `We built ${brand} to solve the challenges we faced with ${mainKw} every day. What started as a simple idea has grown into the platform trusted by teams worldwide. Our mission: make ${mainKw} simple, powerful, and accessible for everyone.`;
  const aboutBullets = subNiche?.aboutBullets || [
    `${kws[0] ? titleCase(kws[0]) + '-first approach' : 'Customer-first approach'}`,
    `${kws[1] ? titleCase(kws[1]) + ' driven design' : 'Performance-driven design'}`,
    `${kws[2] ? titleCase(kws[2]) + ' at scale' : 'Built for scale from day one'}`,
    `Transparent, honest, always improving`,
  ];

  // Mission — distinct from the About story so stage + split sections never clone.
  const missionHeading = pick([`Our Approach`, `Why ${brand}`, `Built Different`, `What Drives Us`, `The ${brand} Difference`], fp + 4);
  const missionBody = subNiche?.missionBody || `Every detail at ${brand} is intentional. We pair deep ${mainKw} expertise with an obsession for ${secKw}, crafting an experience people come back to. No shortcuts — just work we're proud to put our name on.`;

  // Gallery
  const galleryLabel: Record<string, string> = { portfolio: 'Portfolio', ecommerce: 'Shop', technology: 'Features', food: 'Menu', sports: 'Gallery', photography: 'Portfolio', fashion: 'Collection', agency: 'Work', general: 'Gallery' };
  const galleryHeading = `Our ${(galleryLabel[normIndustry] || galleryLabel.general)}`;

  // Contact
  const contactHeading = `Let's Talk ${mainKw}`;
  const contactSub = subNiche?.contactSub || `Have questions about ${brand}? Ready to get started? Reach out and our team will get back to you within 24 hours.`;

  // CTA
  const ctaHeadings = [`Ready to Experience ${mainKw}?`, `Start Your ${mainKw} Journey`, `Join Thousands of ${mainKw} Leaders`, `Transform Your ${mainKw} Today`];
  const ctaHeading = subNiche?.ctaHeading || pick(ctaHeadings, fp + 9);
  const ctaSub = subNiche?.ctaSub || CTA_SUB_BY_NICHE[normIndustry] || CTA_SUB_BY_NICHE.general;

  // FAQ + product/menu content — niche-specific, resolved from the banks above.
  const faqs = subNiche?.faqs || resolveFaqs(normIndustry);
  const productBank = resolveProducts(puo, normIndustry);
  const products = productBank?.items || null;
  const productEyebrow = productBank?.eyebrow || 'Featured';

  // Footer tagline
  const footerTaglines = [`${mainKw} made powerful.`, `Building the future of ${mainKw}.`, `Your ${mainKw} platform.`, `${brand} — where ${mainKw} meets ${secKw}.`];
  const footerTagline = subNiche?.footerTagline || pick(footerTaglines, fp + 11);

  // Pricing plans (if saas/ecommerce)
  let pricingPlans: SiteCopy['pricingPlans'] = null;
  if (direction === 'saas' || direction === 'e-commerce' || industry === 'saas') {
    pricingPlans = [
      { name: 'Starter', price: 'Free', period: 'forever', desc: 'Perfect for individuals and small projects', features: [`Core ${mainKw} tools`, 'Up to 3 projects', 'Community support', '1GB storage'], featured: false },
      { name: 'Pro', price: '$49', period: '/month', desc: `Full ${mainKw} power for growing teams`, features: [`Unlimited ${mainKw}`, 'Advanced analytics', 'Priority support', '50GB storage', 'Custom integrations'], featured: true },
      { name: 'Enterprise', price: 'Custom', period: 'contact us', desc: `Enterprise-grade ${mainKw} at scale`, features: ['Everything in Pro', 'Dedicated support', 'Custom SLA', 'Unlimited storage', 'On-premise option'], featured: false },
    ];
  }

  const copy: SiteCopy = {
    heroHeadline, heroSub, heroTag, primaryCta, secondaryCta,
    sectionEyebrow, featureHeading, features, stats, testimonials,
    aboutHeading, aboutBody, aboutBullets, missionHeading, missionBody,
    galleryHeading, gallerySlug,
    contactHeading, contactSub, ctaHeading, ctaSub, footerTagline,
    pricingPlans, faqs, products, productEyebrow,
    hiddenPrimarySlug:    hiddenCfg.primary.slug,
    hiddenSecondarySlug:  hiddenCfg.secondary.slug,
    hiddenPrimaryCtaLabel:   hiddenCfg.primary.ctaLabel,
    hiddenSecondaryCtaLabel: hiddenCfg.secondary.ctaLabel,
  };

  // Prompt-specific content produced by the in-house NLU engine takes precedence
  // over the deterministic banks, so the built site reflects exactly what the
  // user described. (Channel name kept as `llm` for renderer compatibility.)
  return applyLlmCopy(copy, puo);
}

// Overlay the in-house NLU's prompt-specific copy (hero, tagline, about, named
// products, faqs) from customAttributes.llm onto the deterministic SiteCopy.
// Each field is
// applied only when present and non-empty; everything else is left untouched.
function applyLlmCopy(copy: SiteCopy, puo: PromptUnderstandingObject): SiteCopy {
  const llm = (puo.customAttributes as { llm?: {
    tagline?: string; heroHeadline?: string; heroSub?: string; about?: string;
    primaryCta?: string; secondaryCta?: string; heroTag?: string;
    products?: Array<{ name?: string; desc?: string; price?: string }>;
    faqs?: Array<{ q?: string; a?: string }>;
  } } | undefined)?.llm;
  if (!llm) return copy;

  const str = (s: unknown): string | null => (typeof s === 'string' && s.trim() ? s.trim() : null);
  const heroHeadline = str(llm.heroHeadline);
  const heroSub = str(llm.heroSub);
  const about = str(llm.about);
  const tagline = str(llm.tagline);
  const primaryCta = str(llm.primaryCta);
  const secondaryCta = str(llm.secondaryCta);
  const heroTag = str(llm.heroTag);
  if (heroHeadline) copy.heroHeadline = heroHeadline;
  if (heroSub) copy.heroSub = heroSub;
  if (about) copy.aboutBody = about;
  if (tagline) copy.footerTagline = tagline;
  // Explicit, user-named button labels override the deterministic CTA banks.
  // primaryCta/secondaryCta only: hiddenPrimaryCtaLabel is the split-section CTA
  // (distinct from the hero), so we don't overwrite it with the hero button text.
  if (primaryCta) copy.primaryCta = primaryCta;
  if (secondaryCta) copy.secondaryCta = secondaryCta;
  if (heroTag) copy.heroTag = heroTag;

  if (Array.isArray(llm.products) && llm.products.length) {
    const items = llm.products
      .filter(p => str(p?.name))
      .map(p => ({ name: str(p.name)!, desc: str(p.desc) || '', price: str(p.price) || '' }));
    if (items.length) copy.products = items;
  }

  if (Array.isArray(llm.faqs) && llm.faqs.length) {
    const faqs = llm.faqs
      .filter(f => str(f?.q) && str(f?.a))
      .map(f => ({ q: str(f.q)!, a: str(f.a)! }));
    if (faqs.length) copy.faqs = faqs;
  }

  return copy;
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
          <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-outline">${esc(copy.secondaryCta)} →</a>
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
      <a href="${esc(copy.hiddenPrimarySlug)}" class="btn btn-outline" style="${isDark||node.depth==='immersed'?'border-color:rgba(255,255,255,.4);color:#fff':''}">${esc(copy.secondaryCta)} →</a>
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

  // When the niche has real purchasable items (a coffee menu, a shop, a
  // collection), render a genuine PRODUCT grid — image + name + description +
  // price — instead of a bare photo gallery. This is what the user asked for.
  if (copy.products && copy.products.length) {
    const cards = copy.products.map((p, i) => {
      const photoId = productPhoto(ctx.puo, p.name, fp, i);
      return `<div class="product-card reveal reveal-delay-${i % 3}">
      <div class="product-media"><img src="${ph(photoId, 600, 440)}" alt="${esc(p.name)}" loading="lazy"/></div>
      <div class="product-body">
        <div class="product-row"><h3 class="product-name">${esc(p.name)}</h3><span class="product-price">${esc(p.price)}</span></div>
        <p class="product-desc">${esc(p.desc)}</p>
      </div>
    </div>`;
    }).join('');
    return `
<section>
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">${esc(copy.productEyebrow)}</span>
      <h2>${esc(copy.galleryHeading)}</h2>
    </div>
    <div class="product-grid">${cards}</div>
    <div style="text-align:center;margin-top:clamp(28px,4vw,44px)">
      <a href="${esc(copy.gallerySlug)}" class="btn btn-outline reveal">View Full ${esc(copy.productEyebrow.replace(/^Our\s+/i,''))} →</a>
    </div>
  </div>
</section>`;
  }

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
    const items = copy.faqs.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
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
  const { fp } = ctx;
  const { cards, eyebrow, heading } = nextFeatureSegment(ctx, 3);
  const items = cards.map((f, i) => {
    const photo = productPhoto(ctx.puo, f.title, fp, i + 4);
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

  // Real product/menu grid when the niche has purchasable items.
  let body: string;
  if (copy.products && copy.products.length) {
    const cards = copy.products.map((p, i) => {
      const photoId = productPhoto(puo, p.name, fp, i);
      return `<div class="product-card reveal reveal-delay-${i % 3}">
      <div class="product-media"><img src="${ph(photoId, 600, 440)}" alt="${esc(p.name)}" loading="lazy"/></div>
      <div class="product-body">
        <div class="product-row"><h3 class="product-name">${esc(p.name)}</h3><span class="product-price">${esc(p.price)}</span></div>
        <p class="product-desc">${esc(p.desc)}</p>
      </div>
    </div>`;
    }).join('');
    body = `<div class="product-grid">${cards}</div>`;
  } else {
    const galleryItems = Array.from({ length: 9 }, (_, i) => {
      const photoId = photos[(fp + i + 2) % photos.length];
      const hs = [320, 380, 280, 350, 400, 300];
      const h = hs[i % hs.length];
      return `<div class="gallery-item reveal">
      <img src="${ph(photoId, 600, h)}" alt="${esc(copy.galleryHeading)} item ${i+1}" loading="lazy"/>
    </div>`;
    }).join('');
    body = `<div class="gallery-grid masonry">${galleryItems}</div>`;
  }

  const main = `
<section style="padding-top:140px">
  <div class="wrap">
    <div class="sec-head centered reveal">
      <span class="eyebrow">${esc(copy.productEyebrow || copy.galleryHeading.replace(/^Our\s+/i, '') || 'Showcase')}</span>
      <h1 style="font-size:var(--h1-size)">${esc(copy.galleryHeading)}</h1>
    </div>
    ${body}
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
    <div class="gallery-grid masonry" style="margin-top:clamp(36px,5vw,56px)">${items}</div>
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

  // Singleton sections that must render at most once per page. The layout graph
  // can emit two galleries or two FAQ/testimonial blocks; rendering both reads
  // as a duplicate section. We keep the first occurrence and drop later repeats.
  const seenKinds = new Set<string>();
  const sectionKind = (node: LayoutNode): string | null => {
    if (node.type === 'gallery') return 'gallery';
    if (node.type === 'list') return node.variant === 'accordion' ? 'faq' : 'testimonials';
    if (node.type === 'strip') return 'strip';
    return null; // hero/cluster/tile/stage/frame/split/signal may repeat (varied content)
  };

  return graph.nodes.map(node => {
    const kind = sectionKind(node);
    if (kind) {
      if (seenKinds.has(kind)) return '';
      seenKinds.add(kind);
    }
    return renderNode(node, ctx, counters);
  }).filter(Boolean).join('\n');
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
  imagery?: ResolvedImagery,
): MultiPageOutput {
  const prompt = context.input.userPrompt;
  const brand  = brandName || 'Brand';
  const year   = new Date().getFullYear();
  const base   = subdomain ? `/sites/${subdomain}/` : '';

  // Inject the resolved content-aware imagery (if any) for the duration of this
  // fully synchronous render. Cleared in finally so nothing leaks to the next.
  INJECTED_POOL = imagery && imagery.pool.length ? imagery.pool : null;
  INJECTED_BY_NAME = imagery && imagery.byName && Object.keys(imagery.byName).length ? imagery.byName : null;
  _phIdx = 0; // reset placeholder color cycle so renders are deterministic
  try {
    return renderMultiPageSiteInner(context, brand, subdomain, base, year, prompt, understanding);
  } finally {
    INJECTED_POOL = null;
    INJECTED_BY_NAME = null;
  }
}

/**
 * Build the CONTENT-AWARE image plan for a site WITHOUT rendering it. Runs the
 * same deterministic understanding + copy logic the renderer uses, then emits one
 * Unsplash query per image slot, derived from the exact content that slot will
 * display:
 *   • products / services  → "<exact product name> <niche>"   (key: name:<norm>)
 *   • features             → "<exact feature title> <niche>"  (key: name:<norm>)
 *   • hero / gallery / team / about → niche + rotating context modifiers (key: pool:N)
 * The provider resolves each to a globally-unique photo; keys line up with what
 * productPhoto()/getPhotos() look up at render time.
 */
export function planSiteImagery(
  context: ISharedContext,
  brandName: string,
  understanding?: PromptUnderstandingObject,
): ImageRequest[] {
  const prompt = context.input.userPrompt;
  const brand = brandName || 'Brand';
  const puo = understanding ?? (() => {
    const r = parsePrompt(prompt);
    return r.success ? r.object : parsePrompt('modern professional website').object;
  })();
  const fp = fnv(brand + '|' + prompt);
  const copy = buildSiteCopy(puo, brand, fp);
  const niche = normalizeIndustry(puo.inferredIndustry);
  // A human-readable subject for the niche to anchor every query in the right world.
  const subject = (puo.inferredIndustry || niche || 'business').replace(/[_-]+/g, ' ').trim();

  const requests: ImageRequest[] = [];
  const seen = new Set<string>();
  const addName = (name: string, extra: string, orientation: Orientation) => {
    const key = 'name:' + normName(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    requests.push({ key, query: `${name} ${extra}`.trim(), orientation });
  };

  // Per-product / per-service / per-feature → exact-content queries.
  (copy.products ?? []).forEach((p) => addName(p.name, subject, 'squarish'));
  (copy.features ?? []).forEach((f) => addName(f.title, subject, 'landscape'));

  // Generic niche pool — rotate context modifiers so the 12 pool slots are varied
  // yet all clearly on-niche (hero, gallery, team, about, story, cta backgrounds).
  const modifiers = [
    '', 'lifestyle', 'close up detail', 'workspace interior', 'people working',
    'professional', 'equipment', 'product', 'environment', 'candid moment',
    'texture background', 'team',
  ];
  const orientations: Orientation[] = ['landscape', 'portrait', 'squarish'];
  for (let i = 0; i < 12; i++) {
    requests.push({
      key: `pool:${i}`,
      query: `${subject} ${modifiers[i % modifiers.length]}`.trim(),
      orientation: orientations[i % orientations.length],
    });
  }

  return requests;
}

function renderMultiPageSiteInner(
  context: ISharedContext,
  brand: string,
  subdomain: string,
  base: string,
  year: number,
  prompt: string,
  understanding?: PromptUnderstandingObject,
): MultiPageOutput {

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
