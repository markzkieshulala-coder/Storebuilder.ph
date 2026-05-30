// ---------------------------------------------------------------------------
// NEUTRAL IMAGE PLACEHOLDER
//
// The previous in-house "visual engine" (lib/engine/visual-engine.ts) and its
// canvas scene renderer (lib/engine/canvas-engine.ts) were DELETED — they drew
// illustrated/cartoon-style scenes (coffee cups, etc.) that were not wanted.
//
// This module is their minimal replacement: it produces a clean, neutral
// brand-coloured gradient PNG for each image slot. It draws NO scenes or
// objects — just a soft, on-brand backdrop — so:
//   • sites are never blank while the real photo is being generated, and
//   • because it returns a PNG, the background "real photo" swap still works
//     (see lib/engine/image-cache.ts): the diffusion server overwrites the
//     placeholder in place and it swaps in automatically.
//
// 100% in-house, no third-party image source.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createCanvas } from '@napi-rs/canvas';

export type VisualRole = 'hero' | 'feature' | 'gallery' | 'split' | 'avatar' | 'cta' | 'product';

export interface VisualPalette {
  primary: string; secondary: string; accent: string;
  background: string; surface: string; text: string; muted: string;
}

export interface VisualSpec {
  palette: VisualPalette;
  mood?: string;
  style?: string;
  niche?: string;
  rawNiche?: string;
  keywords?: string[];
  seed: number;
  role: VisualRole;
  subject?: string;
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1_000_000) / 1_000_000; };
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return [120, 120, 130];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix([r1, g1, b1]: number[], [r2, g2, b2]: number[], t: number): string {
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Neutral, on-brand gradient PNG placeholder. No illustrated content. Seeded so
 * different slots get a gently different angle/tint, but never a "scene".
 */
export function generateVisualDataUri(spec: VisualSpec): string {
  const W = 800, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const rand = rng((spec.seed >>> 0) ^ hashStr((spec.subject || '') + '|' + (spec.role || '')));

  const p = spec.palette || ({} as VisualPalette);
  const c1 = hexToRgb(p.surface || p.background || '#1a1a1f');
  const c2 = hexToRgb(p.primary || p.accent || '#2a2a33');
  const c3 = hexToRgb(p.background || p.surface || '#101014');

  // Soft diagonal gradient between two brand tones.
  const ang = rand() * Math.PI * 2;
  const x0 = W / 2 + Math.cos(ang) * W * 0.6, y0 = H / 2 + Math.sin(ang) * H * 0.6;
  const x1 = W / 2 - Math.cos(ang) * W * 0.6, y1 = H / 2 - Math.sin(ang) * H * 0.6;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, mix(c3, c1, 0.65));
  grad.addColorStop(0.55, mix(c1, c2, 0.35 + rand() * 0.2));
  grad.addColorStop(1, mix(c2, c3, 0.5));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // A couple of large, very soft radial highlights for depth (no shapes/objects).
  for (let i = 0; i < 3; i++) {
    const cx = rand() * W, cy = rand() * H, r = (0.25 + rand() * 0.35) * W;
    const accent = hexToRgb([p.accent, p.primary, p.secondary][i % 3] || '#888');
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, `rgba(${accent[0]},${accent[1]},${accent[2]},${0.10 + rand() * 0.08})`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }

  // Gentle vignette to keep edges calm.
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  return 'data:image/png;base64,' + (canvas.toBuffer('image/png') as Buffer).toString('base64');
}
