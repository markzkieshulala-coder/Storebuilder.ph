// ---------------------------------------------------------------------------
// CANVAS-BASED IMAGE ENGINE
//
// Generates photorealistic rasterized PNG images using @napi-rs/canvas.
// Produces 800×500 PNGs, returned as data URIs.  Each scene is completely
// deterministic for a given VisualSpec.seed so the same product always
// renders the same image.
//
// Scenes are differentiated by drink/subject type — espresso, cappuccino,
// iced coffee, frappe, pour-over, beans, pastry — each with its own
// background palette, bokeh colour, and foreground object.
// ---------------------------------------------------------------------------

import { createCanvas } from '@napi-rs/canvas';
import type { VisualSpec } from './visual-engine';

// ─── Seeded RNG (same algorithm as visual-engine) ────────────────────────────

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Color utilities ─────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha = 1): string {
  let h = (hex || '#000000').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

// ─── Scene type detection (mirrors visual-engine.ts detectDrink) ─────────────

type Scene = 'espresso' | 'cappuccino' | 'iced' | 'frappe' | 'pourover' | 'beans' | 'pastry' | 'generic';

function detectScene(subject: string): Scene {
  const s = (subject || '').toLowerCase();
  if (/pastr|croissant|cake|cookie|muffin|donut|doughnut|scone|brownie|waffle/.test(s)) return 'pastry';
  if (/frapp|frappe|smoothie|shake|blended|whipped|milkshake/.test(s)) return 'frappe';
  if (/iced|cold[\s-]?brew|cold coffee|frozen/.test(s)) return 'iced';
  if (/espresso|macchiato|ristretto|cortado|doppio/.test(s)) return 'espresso';
  if (/cappuccino|latte|mocha|flat white|americano/.test(s)) return 'cappuccino';
  if (/pour.?over|v60|chemex|aeropress|artisan brew/.test(s)) return 'pourover';
  if (/\bbean|farm[\s-]to|harvest|sourcing|direct.trade|roastery/.test(s)) return 'beans';
  if (/coffee|brew|roast|drink/.test(s)) return 'cappuccino';
  return 'generic';
}

// Per-scene environment colours
interface SceneTheme {
  bgTop: string;   // background gradient top
  bgBot: string;   // background gradient bottom
  bokeh: string[]; // bokeh circle colours
  tableTop: string;
  tableBot: string;
}

function themeFor(scene: Scene): SceneTheme {
  switch (scene) {
    case 'espresso':
      return {
        bgTop: '#0a0402', bgBot: '#1a0b04',
        bokeh: ['#c47820', '#8a4010', '#e09030', '#702808'],
        tableTop: '#181008', tableBot: '#050302',
      };
    case 'iced':
      return {
        bgTop: '#050a14', bgBot: '#0a1828',
        bokeh: ['#4080c0', '#2050a0', '#80b8e8', '#1a3870'],
        tableTop: '#0d1520', tableBot: '#040810',
      };
    case 'frappe':
      return {
        bgTop: '#04100e', bgBot: '#091c18',
        bokeh: ['#208060', '#104838', '#40b890', '#0a2820'],
        tableTop: '#0a1a16', tableBot: '#040e0c',
      };
    case 'pourover':
      return {
        bgTop: '#0a0a0a', bgBot: '#181818',
        bokeh: ['#9ab8d8', '#6888b0', '#c0d8f0', '#445870'],
        tableTop: '#141414', tableBot: '#080808',
      };
    case 'beans':
      return {
        bgTop: '#0a0600', bgBot: '#1a0e00',
        bokeh: ['#806030', '#5a3818', '#c09050', '#3a2008'],
        tableTop: '#160c04', tableBot: '#060300',
      };
    case 'pastry':
      return {
        bgTop: '#1a0f08', bgBot: '#2a1808',
        bokeh: ['#d8a860', '#b07838', '#f0c880', '#885020'],
        tableTop: '#241408', tableBot: '#0e0804',
      };
    case 'cappuccino':
    default:
      return {
        bgTop: '#2a0e05', bgBot: '#160804',
        bokeh: ['#d4922a', '#e8a830', '#c47f20', '#f0b84a'],
        tableTop: '#3a1808', tableBot: '#1a0804',
      };
  }
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

type Ctx2D = ReturnType<ReturnType<typeof createCanvas>['getContext']>;

/** Draw blurred bokeh circles behind the scene. */
function drawBokeh(ctx: Ctx2D, rand: () => number, theme: SceneTheme, W: number, H: number): void {
  const count = 9 + Math.floor(rand() * 4);
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.75;
    const radius = 30 + rand() * 90;
    const col = theme.bokeh[i % theme.bokeh.length];
    const alpha = 0.25 + rand() * 0.30;
    (ctx as any).filter = 'blur(25px)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(col, alpha);
    ctx.fill();
    (ctx as any).filter = 'none';
  }
}

/** Draw a table surface occupying the bottom ~35% of the canvas. */
function drawTable(ctx: Ctx2D, theme: SceneTheme, W: number, H: number): void {
  const tableY = H * 0.65;
  const grad = ctx.createLinearGradient(0, tableY, 0, H);
  grad.addColorStop(0, theme.tableTop);
  grad.addColorStop(1, theme.tableBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, tableY, W, H - tableY);
  // Subtle highlight at the table edge
  const edgeGrad = ctx.createLinearGradient(0, tableY - 4, 0, tableY + 8);
  edgeGrad.addColorStop(0, 'rgba(255,255,255,0)');
  edgeGrad.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  edgeGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, tableY - 4, W, 12);
}

/** Draw steam wisps above a cup/glass opening. */
function drawSteam(ctx: Ctx2D, cx: number, openingY: number): void {
  const offsets = [-40, 0, 40];
  for (let i = 0; i < offsets.length; i++) {
    const sx = cx + offsets[i];
    const alpha = 0.5 - i * 0.08;
    (ctx as any).filter = 'blur(4px)';
    ctx.beginPath();
    ctx.moveTo(sx, openingY);
    ctx.bezierCurveTo(
      sx + (i % 2 === 0 ? 20 : -20), openingY - 60,
      sx + (i % 2 === 0 ? -15 : 15), openingY - 120,
      sx, openingY - 180
    );
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 5 - i;
    ctx.lineCap = 'round';
    ctx.stroke();
    (ctx as any).filter = 'none';
  }
}

/** Add a subtle film grain noise overlay. */
function drawGrain(ctx: Ctx2D, rand: () => number, W: number, H: number): void {
  const grainCount = 3000;
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < grainCount; i++) {
    const gx = rand() * W;
    const gy = rand() * H;
    const gs = 1 + rand() * 2;
    const gv = Math.floor(rand() * 255);
    ctx.fillStyle = `rgb(${gv},${gv},${gv})`;
    ctx.fillRect(gx, gy, gs, gs);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Subject drawers ──────────────────────────────────────────────────────────

function drawEspressoCup(ctx: Ctx2D, rand: () => number, cx: number, tableY: number): void {
  const cupW = 130, cupH = 110, rimRy = 14;
  const cy = tableY - 60;
  const bodyTop = cy - cupH / 2 + rimRy;

  // Drop shadow
  (ctx as any).filter = 'blur(8px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, cupW / 2 + 16, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Saucer
  const saucerGrad = ctx.createRadialGradient(cx - 15, tableY - 12, 4, cx, tableY - 6, cupW / 2 + 30);
  saucerGrad.addColorStop(0, '#f2eee9');
  saucerGrad.addColorStop(0.7, '#dbd4cc');
  saucerGrad.addColorStop(1, '#b0a89f');
  ctx.beginPath();
  ctx.ellipse(cx, tableY - 6, cupW / 2 + 28, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = saucerGrad;
  ctx.fill();

  // Cup body
  const cupGrad = ctx.createLinearGradient(cx - cupW / 2, 0, cx + cupW / 2, 0);
  cupGrad.addColorStop(0, '#1a1a1a');
  cupGrad.addColorStop(0.15, '#2e2e2e');
  cupGrad.addColorStop(0.5, '#222222');
  cupGrad.addColorStop(0.85, '#2e2e2e');
  cupGrad.addColorStop(1, '#1a1a1a');
  ctx.beginPath();
  ctx.roundRect(cx - cupW / 2, bodyTop, cupW, cupH - rimRy, 8);
  ctx.fillStyle = cupGrad;
  ctx.fill();

  // Rim
  const rimGrad = ctx.createLinearGradient(0, bodyTop - rimRy, 0, bodyTop + rimRy);
  rimGrad.addColorStop(0, '#383838');
  rimGrad.addColorStop(1, '#181818');
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2, rimRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Espresso liquid (dark)
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2 - 8, rimRy - 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#180a02';
  ctx.fill();

  // Crema layer (amber)
  const cremaGrad = ctx.createRadialGradient(cx - 10, bodyTop, 2, cx, bodyTop, cupW / 2 - 8);
  cremaGrad.addColorStop(0, 'rgba(200,140,40,0.85)');
  cremaGrad.addColorStop(0.6, 'rgba(160,90,20,0.70)');
  cremaGrad.addColorStop(1, 'rgba(100,50,10,0.50)');
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2 - 8, rimRy - 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = cremaGrad;
  ctx.fill();

  // Handle
  const hx = cx + cupW / 2;
  const hty = bodyTop + 22, hby = bodyTop + (cupH - rimRy) * 0.70;
  ctx.beginPath();
  ctx.moveTo(hx, hty);
  ctx.bezierCurveTo(hx + 55, hty, hx + 55, hby, hx, hby);
  ctx.strokeStyle = '#2e2e2e';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, hty);
  ctx.bezierCurveTo(hx + 45, hty, hx + 45, hby, hx, hby);
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 12;
  ctx.stroke();

  // Specular highlight
  const specGrad = ctx.createRadialGradient(cx - cupW * 0.22, bodyTop + 35, 2, cx - cupW * 0.22, bodyTop + 40, 14);
  specGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(cx - cupW * 0.22, bodyTop + 40, 12, 32, 0, 0, Math.PI * 2);
  ctx.fillStyle = specGrad;
  ctx.fill();

  // Steam
  drawSteam(ctx, cx, bodyTop - rimRy - 4);
}

function drawCappuccinoCup(ctx: Ctx2D, rand: () => number, cx: number, tableY: number): void {
  const cupW = 200, cupH = 160, rimRy = 22;
  const cy = tableY - 80;
  const bodyTop = cy - cupH / 2 + rimRy;

  // Shadow
  (ctx as any).filter = 'blur(10px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, cupW / 2 + 24, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Saucer
  const saucerGrad = ctx.createRadialGradient(cx - 20, tableY - 16, 6, cx, tableY - 8, cupW / 2 + 36);
  saucerGrad.addColorStop(0, '#f2eee9');
  saucerGrad.addColorStop(0.6, '#dbd4cc');
  saucerGrad.addColorStop(1, '#b0a89f');
  ctx.beginPath();
  ctx.ellipse(cx, tableY - 8, cupW / 2 + 36, 22, 0, 0, Math.PI * 2);
  ctx.fillStyle = saucerGrad;
  ctx.fill();

  // Cup body — warm cream ceramic
  const cupGrad = ctx.createLinearGradient(cx - cupW / 2, 0, cx + cupW / 2, 0);
  cupGrad.addColorStop(0, '#c8a878');
  cupGrad.addColorStop(0.12, '#e8c898');
  cupGrad.addColorStop(0.40, '#d8b888');
  cupGrad.addColorStop(0.68, '#e8c898');
  cupGrad.addColorStop(1, '#a88858');
  ctx.beginPath();
  ctx.roundRect(cx - cupW / 2, bodyTop, cupW, cupH - rimRy, 10);
  ctx.fillStyle = cupGrad;
  ctx.fill();

  // Bottom shading
  const botGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyTop + cupH - rimRy);
  botGrad.addColorStop(0, 'rgba(255,255,255,0)');
  botGrad.addColorStop(1, 'rgba(0,0,0,0.14)');
  ctx.beginPath();
  ctx.roundRect(cx - cupW / 2, bodyTop, cupW, cupH - rimRy, 10);
  ctx.fillStyle = botGrad;
  ctx.fill();

  // Rim
  const rimGrad = ctx.createLinearGradient(0, bodyTop - rimRy, 0, bodyTop + rimRy);
  rimGrad.addColorStop(0, '#e8dcbc');
  rimGrad.addColorStop(1, '#c0b090');
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2, rimRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = rimGrad;
  ctx.fill();

  // Dark coffee liquid
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2 - 10, rimRy - 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2d1204';
  ctx.fill();

  // Foam / latte art
  const foamGrad = ctx.createRadialGradient(cx, bodyTop, 2, cx, bodyTop, cupW / 2 - 10);
  foamGrad.addColorStop(0, 'rgba(232,213,176,0.95)');
  foamGrad.addColorStop(0.7, 'rgba(200,180,140,0.85)');
  foamGrad.addColorStop(1, 'rgba(168,144,96,0.60)');
  ctx.beginPath();
  ctx.ellipse(cx, bodyTop, cupW / 2 - 10, rimRy - 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = foamGrad;
  ctx.fill();

  // Latte art heart
  ctx.beginPath();
  ctx.moveTo(cx - 24, bodyTop - 4);
  ctx.bezierCurveTo(cx - 14, bodyTop - 16, cx, bodyTop - 3, cx, bodyTop - 3);
  ctx.bezierCurveTo(cx, bodyTop - 3, cx + 14, bodyTop - 16, cx + 24, bodyTop - 4);
  ctx.bezierCurveTo(cx + 10, bodyTop + 10, cx, bodyTop + 16, cx - 24, bodyTop - 4);
  ctx.fillStyle = 'rgba(240,223,192,0.75)';
  ctx.fill();

  // Handle
  const hx = cx + cupW / 2;
  const hty = bodyTop + 30, hby = bodyTop + (cupH - rimRy) * 0.72;
  ctx.beginPath();
  ctx.moveTo(hx, hty);
  ctx.bezierCurveTo(hx + 80, hty, hx + 80, hby, hx, hby);
  ctx.strokeStyle = '#b89060';
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx, hty);
  ctx.bezierCurveTo(hx + 68, hty, hx + 68, hby, hx, hby);
  ctx.strokeStyle = '#d8b080';
  ctx.lineWidth = 18;
  ctx.stroke();

  // Specular highlight
  ctx.beginPath();
  ctx.ellipse(cx - cupW * 0.20, bodyTop + 50, 14, 42, 0, 0, Math.PI * 2);
  const specGrad = ctx.createRadialGradient(cx - cupW * 0.20, bodyTop + 50, 2, cx - cupW * 0.20, bodyTop + 50, 18);
  specGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = specGrad;
  ctx.fill();

  // Coffee beans scattered on table
  const beanData: [number, number, number][] = [[-130, 20, -28], [140, 16, 18], [160, 42, -42], [-150, 44, 35], [-75, 58, -12]];
  for (const [dx, dy, ang] of beanData) {
    const bx = cx + dx + (rand() - 0.5) * 16;
    const by = tableY + dy + (rand() - 0.5) * 10;
    const sz = 12 + rand() * 6;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate((ang * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2d1204';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, sz - 1.5, (sz - 1.5) * 0.48, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3d1a08';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -(sz * 0.44));
    ctx.lineTo(0, sz * 0.44);
    ctx.strokeStyle = '#1a0802';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  drawSteam(ctx, cx, bodyTop - rimRy - 4);
}

function drawIcedCoffee(ctx: Ctx2D, rand: () => number, cx: number, tableY: number, frappe: boolean): void {
  const gW = 140, gH = 280, gTop = tableY - gH;
  const liquid = frappe ? '#b07840' : '#3a1d0a';
  const lightLiquid = frappe ? '#d8a868' : '#6a3818';

  // Shadow
  (ctx as any).filter = 'blur(8px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, gW / 2 + 12, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Liquid fill
  const liqTop = frappe ? gTop + 25 : gTop + 35;
  const liqGrad = ctx.createLinearGradient(0, liqTop, 0, tableY - 8);
  liqGrad.addColorStop(0, lightLiquid);
  liqGrad.addColorStop(1, liquid);
  ctx.beginPath();
  ctx.moveTo(cx - gW / 2 + 5, liqTop);
  ctx.lineTo(cx + gW / 2 - 5, liqTop);
  ctx.lineTo(cx + gW / 2 - 14, tableY - 8);
  ctx.lineTo(cx - gW / 2 + 14, tableY - 8);
  ctx.closePath();
  ctx.fillStyle = liqGrad;
  ctx.fill();

  // Ice cubes
  if (!frappe) {
    const cubes: [number, number, number][] = [[-20, 55, 12], [18, 42, -18], [-4, 80, 26], [22, 95, 8]];
    for (const [dx, dy, ang] of cubes) {
      const ix = cx + dx, iy = gTop + dy, sz = 26 + rand() * 8;
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate((ang * Math.PI) / 180);
      ctx.beginPath();
      ctx.roundRect(-sz / 2, -sz / 2, sz, sz, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Glass body
  const glassGrad = ctx.createLinearGradient(cx - gW / 2, 0, cx + gW / 2, 0);
  glassGrad.addColorStop(0, 'rgba(255,255,255,0.32)');
  glassGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  glassGrad.addColorStop(1, 'rgba(255,255,255,0.24)');
  ctx.beginPath();
  ctx.moveTo(cx - gW / 2, gTop);
  ctx.lineTo(cx + gW / 2, gTop);
  ctx.lineTo(cx + gW / 2 - 12, tableY - 6);
  ctx.lineTo(cx - gW / 2 + 12, tableY - 6);
  ctx.closePath();
  ctx.fillStyle = glassGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.48)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Specular streak
  ctx.beginPath();
  ctx.rect(cx - gW / 2 + 12, gTop + 8, 8, gH - 40);
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fill();

  if (frappe) {
    // Whipped cream dome
    for (let i = 0; i < 4; i++) {
      const wy = gTop - 6 - i * 22;
      const ww = gW / 2 + 6 - i * 12;
      const whipGrad = ctx.createRadialGradient(cx - 10, wy - 8, 2, cx, wy, Math.max(ww, 8));
      whipGrad.addColorStop(0, '#fffdf8');
      whipGrad.addColorStop(0.7, '#f0e8d8');
      whipGrad.addColorStop(1, '#d8ccb8');
      ctx.beginPath();
      ctx.ellipse(cx, wy, Math.max(ww, 8), 18 - i * 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = whipGrad;
      ctx.fill();
    }
    // Cherry
    ctx.beginPath();
    ctx.arc(cx, gTop - 88, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#cc2b2b';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 4, gTop - 94, 5, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fill();
  } else {
    // Condensation droplets
    for (let i = 0; i < 8; i++) {
      const dx = cx - gW / 2 + 22 + rand() * (gW - 44);
      const dy = gTop + 60 + rand() * (gH - 120);
      ctx.beginPath();
      ctx.arc(dx, dy, 2 + rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fill();
    }
  }

  // Straw
  const stX = cx + 42;
  const strawH = frappe ? 200 : 220;
  const strawOff = frappe ? 150 : 70;
  ctx.save();
  ctx.translate(stX, gTop);
  ctx.rotate((8 * Math.PI) / 180);
  ctx.beginPath();
  ctx.roundRect(-6, -strawOff, 12, strawH, 6);
  ctx.fillStyle = '#e84c6a';
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-6, -strawOff, 4, strawH, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();
}

function drawCoffeeBag(ctx: Ctx2D, rand: () => number, cx: number, tableY: number): void {
  const bagW = 160, bagH = 220, bagX = cx - bagW / 2, bagY = tableY - bagH + 25;

  // Bag shadow
  (ctx as any).filter = 'blur(10px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, bagW / 2 + 10, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Bag body
  const bagGrad = ctx.createLinearGradient(bagX, 0, bagX + bagW, 0);
  bagGrad.addColorStop(0, '#8a6028');
  bagGrad.addColorStop(0.45, '#c09040');
  bagGrad.addColorStop(1, '#7a5020');
  ctx.beginPath();
  ctx.roundRect(bagX, bagY + 18, bagW, bagH - 40, 10);
  ctx.fillStyle = bagGrad;
  ctx.fill();

  // Vertical shading
  const vGrad = ctx.createLinearGradient(0, bagY + 18, 0, bagY + bagH - 40);
  vGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
  vGrad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.beginPath();
  ctx.roundRect(bagX, bagY + 18, bagW, bagH - 40, 10);
  ctx.fillStyle = vGrad;
  ctx.fill();

  // Fold top
  ctx.beginPath();
  ctx.moveTo(bagX + 10, bagY + 28);
  ctx.lineTo(bagX + bagW - 10, bagY + 28);
  ctx.lineTo(bagX + bagW - 6, bagY + 44);
  ctx.lineTo(bagX + 6, bagY + 44);
  ctx.closePath();
  ctx.fillStyle = '#a07838';
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Craft label
  ctx.beginPath();
  ctx.roundRect(cx - 52, bagY + 64, 104, 52, 5);
  ctx.fillStyle = 'rgba(255,245,220,0.84)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,20,0.40)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bean icons on label
  for (let i = -1; i <= 1; i++) {
    const lbx = cx + i * 22, lby = bagY + 90;
    ctx.beginPath();
    ctx.ellipse(lbx, lby, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a2008';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(lbx, lby - 4);
    ctx.lineTo(lbx, lby + 4);
    ctx.strokeStyle = '#1a0802';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Scattered beans on table
  const beanLayout: [number, number, number][] = [
    [-120, 20, -28], [130, 18, 18], [150, 40, -42],
    [-140, 46, 35], [-68, 56, -12], [100, 50, 55],
    [-38, 70, 28], [175, 66, -20],
  ];
  for (const [dx, dy, ang] of beanLayout) {
    const bx = cx + dx + (rand() - 0.5) * 14;
    const by = tableY + dy + (rand() - 0.5) * 10;
    const sz = 10 + rand() * 6;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate((ang * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2d1204';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, sz - 1.5, (sz - 1.5) * 0.49, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#3d1a08';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -(sz * 0.44));
    ctx.lineTo(0, sz * 0.44);
    ctx.strokeStyle = '#1a0802';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

function drawPourOver(ctx: Ctx2D, rand: () => number, cx: number, tableY: number): void {
  const carafeW = 120, carafeH = 200, carafeTop = tableY - carafeH;
  const coneH = 130, coneW = 170, coneTop = carafeTop - coneH + 25;

  // Shadow
  (ctx as any).filter = 'blur(8px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, 115, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Carafe body
  const carafeGrad = ctx.createLinearGradient(cx - carafeW / 2 - 8, 0, cx + carafeW / 2 + 8, 0);
  carafeGrad.addColorStop(0, '#3a1a08');
  carafeGrad.addColorStop(0.4, '#6a3818');
  carafeGrad.addColorStop(1, '#2d1204');
  ctx.beginPath();
  ctx.moveTo(cx - carafeW / 2, carafeTop + 20);
  ctx.quadraticCurveTo(cx - carafeW / 2 - 6, tableY - 30, cx - carafeW / 2 + 14, tableY - 8);
  ctx.lineTo(cx + carafeW / 2 - 14, tableY - 8);
  ctx.quadraticCurveTo(cx + carafeW / 2 + 6, tableY - 30, cx + carafeW / 2, carafeTop + 20);
  ctx.closePath();
  ctx.fillStyle = carafeGrad;
  ctx.globalAlpha = 0.88;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Glass overlay on carafe
  const glassGrad = ctx.createLinearGradient(cx - carafeW / 2, 0, cx + carafeW / 2, 0);
  glassGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  glassGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  glassGrad.addColorStop(1, 'rgba(255,255,255,0.20)');
  ctx.beginPath();
  ctx.moveTo(cx - carafeW / 2, carafeTop + 20);
  ctx.quadraticCurveTo(cx - carafeW / 2 - 6, tableY - 30, cx - carafeW / 2 + 14, tableY - 8);
  ctx.lineTo(cx + carafeW / 2 - 14, tableY - 8);
  ctx.quadraticCurveTo(cx + carafeW / 2 + 6, tableY - 30, cx + carafeW / 2, carafeTop + 20);
  ctx.closePath();
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // Carafe neck
  const neckGrad = ctx.createLinearGradient(cx - 18, 0, cx + 18, 0);
  neckGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  neckGrad.addColorStop(1, 'rgba(255,255,255,0.20)');
  ctx.beginPath();
  ctx.roundRect(cx - 18, carafeTop, 36, 28, 5);
  ctx.fillStyle = neckGrad;
  ctx.strokeStyle = 'rgba(255,255,255,0.40)';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  // Carafe handle
  const hcx = cx + carafeW / 2 + 8, hcy = carafeTop + 50;
  ctx.beginPath();
  ctx.moveTo(hcx, hcy);
  ctx.bezierCurveTo(hcx + 50, hcy, hcx + 50, hcy + 90, hcx, hcy + 90);
  ctx.strokeStyle = '#3a2010';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hcx, hcy);
  ctx.bezierCurveTo(hcx + 40, hcy, hcx + 40, hcy + 90, hcx, hcy + 90);
  ctx.strokeStyle = '#5a3820';
  ctx.lineWidth = 13;
  ctx.stroke();

  // V60 cone (ceramic white)
  const coneGrad = ctx.createLinearGradient(cx - coneW / 2, 0, cx + coneW / 2, 0);
  coneGrad.addColorStop(0, '#c8c0b8');
  coneGrad.addColorStop(0.35, '#f0ece8');
  coneGrad.addColorStop(1, '#b0a8a0');
  ctx.beginPath();
  ctx.moveTo(cx - coneW / 2, coneTop + 20);
  ctx.lineTo(cx - 18, coneTop + coneH - 12);
  ctx.lineTo(cx + 18, coneTop + coneH - 12);
  ctx.lineTo(cx + coneW / 2, coneTop + 20);
  ctx.closePath();
  ctx.fillStyle = coneGrad;
  ctx.fill();

  // Cone rim ellipse
  ctx.beginPath();
  ctx.ellipse(cx, coneTop + 20, coneW / 2, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8e0d8';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Filter paper
  ctx.beginPath();
  ctx.moveTo(cx - coneW / 2 + 14, coneTop + 28);
  ctx.lineTo(cx - 8, coneTop + coneH - 16);
  ctx.lineTo(cx + 8, coneTop + coneH - 16);
  ctx.lineTo(cx + coneW / 2 - 14, coneTop + 28);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,252,248,0.72)';
  ctx.fill();

  // Coffee grounds
  ctx.beginPath();
  ctx.moveTo(cx - coneW / 2 + 32, coneTop + 50);
  ctx.lineTo(cx - 10, coneTop + coneH - 18);
  ctx.lineTo(cx + 10, coneTop + coneH - 18);
  ctx.lineTo(cx + coneW / 2 - 32, coneTop + 50);
  ctx.closePath();
  ctx.fillStyle = '#4a2208';
  ctx.globalAlpha = 0.82;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pour arc (water stream)
  const pourX = cx + 14, pourStart = coneTop - 70;
  (ctx as any).filter = 'blur(3px)';
  ctx.beginPath();
  ctx.moveTo(pourX + 34, pourStart);
  ctx.quadraticCurveTo(pourX + 18, pourStart + 38, pourX, coneTop + 32);
  ctx.strokeStyle = 'rgba(200,220,240,0.70)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();
  (ctx as any).filter = 'none';
  ctx.beginPath();
  ctx.moveTo(pourX + 34, pourStart);
  ctx.quadraticCurveTo(pourX + 18, pourStart + 38, pourX, coneTop + 32);
  ctx.strokeStyle = 'rgba(255,255,255,0.52)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Steam
  drawSteam(ctx, cx - 12, coneTop + 16);
}

function drawPastry(ctx: Ctx2D, rand: () => number, cx: number, tableY: number): void {
  const py = tableY - 25;

  // Plate shadow
  (ctx as any).filter = 'blur(8px)';
  ctx.beginPath();
  ctx.ellipse(cx, tableY, 120, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  (ctx as any).filter = 'none';

  // Plate
  const plateGrad = ctx.createRadialGradient(cx - 30, py + 22, 4, cx, py + 22, 110);
  plateGrad.addColorStop(0, '#ffffff');
  plateGrad.addColorStop(0.5, '#f4f0ec');
  plateGrad.addColorStop(0.85, '#e0d8d0');
  plateGrad.addColorStop(1, '#c8c0b8');
  ctx.beginPath();
  ctx.ellipse(cx, py + 22, 110, 20, 0, 0, Math.PI * 2);
  ctx.fillStyle = plateGrad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, py + 22, 96, 16, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, py + 22, 88, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f8f5f2';
  ctx.fill();

  // Croissant crescent
  const crustGrad = ctx.createLinearGradient(cx - 80, py - 35, cx + 40, py + 14);
  crustGrad.addColorStop(0, '#e8b96a');
  crustGrad.addColorStop(0.5, '#c8893a');
  crustGrad.addColorStop(1, '#9c5e20');
  ctx.beginPath();
  ctx.moveTo(cx - 78, py + 13);
  ctx.quadraticCurveTo(cx - 58, py - 36, cx, py - 30);
  ctx.quadraticCurveTo(cx + 58, py - 36, cx + 78, py + 13);
  ctx.quadraticCurveTo(cx + 45, py + 3, cx, py + 5);
  ctx.quadraticCurveTo(cx - 45, py + 3, cx - 78, py + 13);
  ctx.closePath();
  ctx.fillStyle = crustGrad;
  ctx.fill();

  // Flaky seams
  for (let i = -2; i <= 2; i++) {
    const sx = cx + i * 26;
    ctx.beginPath();
    ctx.moveTo(sx, py - 28);
    ctx.quadraticCurveTo(sx + 4, py - 10, sx, py + 4);
    ctx.strokeStyle = 'rgba(120,70,20,0.42)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Glaze sheen
  ctx.beginPath();
  ctx.moveTo(cx - 58, py - 24);
  ctx.quadraticCurveTo(cx, py - 32, cx + 58, py - 24);
  ctx.strokeStyle = 'rgba(255,240,200,0.55)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Crumbs
  for (let i = 0; i < 6; i++) {
    const dx = cx + (rand() - 0.5) * 180;
    const dy = py + 18 + (rand() - 0.5) * 10;
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5 + rand() * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#b87a32';
    ctx.fill();
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate an 800×500 PNG image for the given VisualSpec and return it as a
 * data URI ("data:image/png;base64,...").  Uses @napi-rs/canvas for rasterization.
 */
export function generateCanvasDataUri(spec: VisualSpec): string {
  const W = 800, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const scene = detectScene(spec.subject || '');
  // Vary theme slightly for 'generic' by mixing seed into scene selection
  const effectiveScene = scene === 'generic'
    ? (['cappuccino', 'espresso', 'cappuccino'] as Scene[])[(spec.seed >>> 0) % 3]
    : scene;
  const theme = themeFor(effectiveScene);
  const rand = rng(spec.seed);

  // ── Background gradient ────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(W * 0.35, H * 0.40, 0, W * 0.50, H * 0.50, W * 0.80);
  bgGrad.addColorStop(0, theme.bgTop);
  bgGrad.addColorStop(0.55, theme.bgBot);
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Bokeh ──────────────────────────────────────────────────────────────
  drawBokeh(ctx, rand, theme, W, H);

  // ── Table surface ──────────────────────────────────────────────────────
  const tableY = H * 0.65;
  drawTable(ctx, theme, W, H);

  // ── Foreground subject ─────────────────────────────────────────────────
  const cx = W / 2 + Math.floor((rand() - 0.5) * 40);
  switch (effectiveScene) {
    case 'espresso':
      drawEspressoCup(ctx, rand, cx, tableY);
      break;
    case 'iced':
      drawIcedCoffee(ctx, rand, cx, tableY, false);
      break;
    case 'frappe':
      drawIcedCoffee(ctx, rand, cx, tableY, true);
      break;
    case 'beans':
      drawCoffeeBag(ctx, rand, cx, tableY);
      break;
    case 'pourover':
      drawPourOver(ctx, rand, cx, tableY);
      break;
    case 'pastry':
      drawPastry(ctx, rand, cx, tableY);
      break;
    case 'cappuccino':
    default:
      drawCappuccinoCup(ctx, rand, cx, tableY);
      break;
  }

  // ── Vignette ───────────────────────────────────────────────────────────
  const vig = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.50, H * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── Film grain ─────────────────────────────────────────────────────────
  drawGrain(ctx, rand, W, H);

  return 'data:image/png;base64,' + (canvas.toBuffer('image/png') as Buffer).toString('base64');
}
