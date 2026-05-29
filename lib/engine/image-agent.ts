// ---------------------------------------------------------------------------
// IMAGE-PROMPT AGENT
//
// The "brain" that converts the website's PromptUnderstandingObject (niche,
// keywords, mood, design style, atmosphere, palette) into a precise, photographic
// text-to-image PROMPT for the self-hosted image generator. This is what makes a
// generated image actually MATCH the website — a coffee shop gets a coffee scene,
// a ramen bar gets a ramen scene, a gym gets a training scene, etc.
//
// Pure, deterministic TypeScript — runs inside your own engine. No third party.
// The prompts it emits are consumed by lib/engine/image-backend.ts, which sends
// them to your local Stable-Diffusion / SDXL service.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';

export type ImageRole = 'hero' | 'feature' | 'gallery' | 'split' | 'avatar' | 'cta' | 'product';

export interface ImagePromptSpec {
  prompt: string;        // positive text-to-image prompt
  negative: string;      // negative prompt (things to avoid)
  seed: number;          // deterministic seed for reproducibility
  width: number;
  height: number;
  role: ImageRole;
}

// ─────────────────────────────────────────────────────────────────
// NICHE → PHOTOGRAPHIC SUBJECT SCENES
// Each scene is written so a diffusion model renders a real, on-topic photo.
// `subject` = the focal thing; `setting` = the environment; extra detail words
// reinforce realism. Sub-niche slugs override the broad niche where available.
// ─────────────────────────────────────────────────────────────────

interface Scene { subject: string; setting: string; details: string; }

const SUBNICHE_SCENES: Record<string, Scene> = {
  coffee:     { subject: 'a freshly poured cup of specialty coffee with latte art, soft steam rising', setting: 'on a wooden counter in a cozy artisan cafe, espresso machine bokeh behind', details: 'rich crema, ceramic cup, warm window light' },
  cafe:       { subject: 'a beautifully styled flat white and a croissant', setting: 'on a marble cafe table near a sunny window', details: 'morning light, plants, inviting atmosphere' },
  espresso:   { subject: 'a double espresso shot pulling from a portafilter into a cup', setting: 'on a professional espresso machine, dark cafe interior', details: 'golden crema, droplets, dramatic lighting' },
  ramen:      { subject: 'a steaming bowl of tonkotsu ramen with chashu, soft egg, scallions and nori', setting: 'on a dark wooden table in a Japanese ramen bar', details: 'rising steam, chopsticks, moody warm light' },
  sushi:      { subject: 'an assortment of fresh nigiri and maki sushi on a slate board', setting: 'at a minimalist sushi counter', details: 'glistening fish, wasabi, pickled ginger, clean lighting' },
  pizza:      { subject: 'a wood-fired Neapolitan pizza with bubbling mozzarella and basil', setting: 'fresh out of a brick oven, rustic pizzeria', details: 'charred crust, melted cheese, warm light' },
  bakery:     { subject: 'an array of artisan breads and golden pastries', setting: 'on a bakery shelf, flour-dusted counter', details: 'crusty texture, warm tones, inviting' },
  bar:        { subject: 'a craft cocktail with garnish and ice', setting: 'on a dark elegant bar top, bottles backlit', details: 'moody lighting, condensation, premium' },
  gym:        { subject: 'an athlete mid-workout lifting weights', setting: 'in a modern industrial gym', details: 'dramatic lighting, sweat, determination, dynamic' },
  crossfit:   { subject: 'an athlete doing a barbell clean in a functional fitness box', setting: 'industrial gym with rigs and plates', details: 'chalk dust, intensity, dramatic side light' },
  yoga:       { subject: 'a person in a graceful yoga pose', setting: 'in a serene sunlit studio with wooden floor', details: 'calm atmosphere, soft natural light, minimalist' },
  spa:        { subject: 'a tranquil spa setting with candles, stones and orchids', setting: 'in a calm wellness retreat', details: 'soft diffused light, towels, serene mood' },
  photography:{ subject: 'a professional photographer with a camera capturing a scene', setting: 'in a studio with softboxes, or on location at golden hour', details: 'shallow depth of field, cinematic, bokeh' },
  fashion:    { subject: 'a stylish model wearing a contemporary outfit', setting: 'in an editorial fashion shoot, clean studio backdrop', details: 'high fashion lighting, elegant pose, magazine quality' },
  ecommerce:  { subject: 'a clean product flatlay of premium goods', setting: 'on a minimalist surface with soft shadows', details: 'studio product photography, crisp, well-lit' },
  technology: { subject: 'a sleek modern workspace with a laptop showing a dashboard', setting: 'in a bright minimalist office', details: 'clean, futuristic, soft gradient light' },
  saas:       { subject: 'an abstract 3d render of glowing data and interface panels', setting: 'floating in a dark gradient space', details: 'neon accents, depth, premium tech aesthetic' },
  portfolio:  { subject: 'a creative designer at work surrounded by sketches and a tablet', setting: 'in a bright modern studio', details: 'artistic, clean, inspiring' },
  agency:     { subject: 'a creative team collaborating around a table with sticky notes and screens', setting: 'in a stylish agency office', details: 'energetic, bright, professional' },
  wellness:   { subject: 'a calm wellness scene with natural elements and soft textures', setting: 'in a bright serene space', details: 'natural light, plants, peaceful' },
  hospitality:{ subject: 'an elegant boutique hotel lobby with warm lighting', setting: 'luxury interior, plush seating', details: 'inviting, upscale, golden hour glow' },
};

const NICHE_SCENES: Record<string, Scene> = {
  food:        { subject: 'an exquisitely plated gourmet dish', setting: 'on a rustic table in an upscale restaurant', details: 'fresh ingredients, steam, warm appetizing light' },
  sports:      { subject: 'a dynamic athlete in motion', setting: 'in a professional training facility', details: 'dramatic lighting, energy, determination' },
  technology:  { subject: 'a sleek modern device and clean interface', setting: 'in a minimalist tech environment', details: 'futuristic, premium, soft glow' },
  photography: { subject: 'a striking cinematic photograph', setting: 'shot at golden hour with professional gear', details: 'shallow depth of field, bokeh, editorial' },
  fashion:     { subject: 'a fashionable model in a designer look', setting: 'in an editorial studio shoot', details: 'high fashion, elegant, magazine quality' },
  ecommerce:   { subject: 'a premium product beautifully presented', setting: 'in studio product photography', details: 'clean, crisp, well-lit, commercial' },
  portfolio:   { subject: 'a creative professional and their work', setting: 'in a bright modern studio', details: 'artistic, inspiring, clean composition' },
  agency:      { subject: 'a creative team at work', setting: 'in a stylish modern office', details: 'energetic, collaborative, professional' },
  wellness:    { subject: 'a serene wellness and self-care scene', setting: 'in a calm bright space', details: 'natural light, peaceful, soft textures' },
  hospitality: { subject: 'an elegant hospitality interior', setting: 'luxury hotel or resort setting', details: 'warm inviting light, upscale, premium' },
  professional:{ subject: 'a confident professional in a corporate setting', setting: 'in a modern office with glass and natural light', details: 'clean, trustworthy, polished' },
  general:     { subject: 'a clean premium brand lifestyle scene', setting: 'in a bright modern setting', details: 'professional, polished, inviting' },
};

// ─────────────────────────────────────────────────────────────────
// MOOD → lighting / color grade.  STYLE → photographic treatment.
// ─────────────────────────────────────────────────────────────────

const MOOD_GRADE: Record<string, string> = {
  dark:     'dark moody low-key lighting, deep shadows, dramatic',
  dramatic: 'high-contrast dramatic chiaroscuro lighting, cinematic',
  contrast: 'bold high-contrast lighting, punchy',
  vibrant:  'vibrant saturated colors, lively, energetic light',
  warm:     'warm golden-hour tones, cozy soft light',
  cold:     'cool blue tones, crisp clean light',
  ethereal: 'soft dreamy diffused light, airy pastel tones',
  light:    'bright airy natural daylight, clean and fresh',
  neutral:  'balanced natural lighting, true-to-life color',
  muted:    'muted desaturated tones, understated, refined',
};

const STYLE_TREATMENT: Record<string, string> = {
  minimal:    'minimalist composition, lots of negative space',
  luxury:     'luxurious premium aesthetic, elegant, refined',
  premium:    'high-end premium look, polished',
  editorial:  'editorial magazine photography, sophisticated',
  cinematic:  'cinematic film still, anamorphic, dramatic depth',
  organic:    'natural organic textures, earthy',
  industrial: 'raw industrial textures, gritty',
  futuristic: 'futuristic sleek, high-tech',
  cyberpunk:  'neon cyberpunk aesthetic, glowing accents',
  artistic:   'artistic creative composition',
  corporate:  'clean corporate professional photography',
  brutalist:  'bold raw brutalist aesthetic',
  retro:      'retro vintage film aesthetic, grain',
  playful:    'bright playful cheerful aesthetic',
};

// Role → framing / aspect
const ROLE_FRAMING: Record<ImageRole, { framing: string; w: number; h: number }> = {
  hero:    { framing: 'wide establishing shot, hero banner composition', w: 1024, h: 576 },
  split:   { framing: 'medium shot, vertical composition', w: 768, h: 1024 },
  feature: { framing: 'close-up detail shot', w: 768, h: 512 },
  gallery: { framing: 'gallery shot, varied angle', w: 768, h: 768 },
  product: { framing: 'product shot, centered subject', w: 768, h: 768 },
  cta:     { framing: 'atmospheric wide background shot', w: 1024, h: 576 },
  avatar:  { framing: 'professional headshot portrait', w: 512, h: 512 },
};

const BASE_QUALITY = 'professional photography, ultra realistic, highly detailed, 8k, sharp focus, depth of field, premium';
const BASE_NEGATIVE = 'illustration, drawing, cartoon, render, 3d, cgi, painting, sketch, low quality, blurry, deformed, watermark, text, logo, signature, jpeg artifacts, oversaturated, ugly, distorted';

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function normalizeNiche(raw: string): string {
  // Mirror of html-renderer's normalizeIndustry but local to avoid a cycle.
  const r = raw.toLowerCase();
  if (NICHE_SCENES[r]) return r;
  return 'general';
}

function resolveScene(puo: PromptUnderstandingObject): Scene {
  const raw = puo.inferredIndustry.toLowerCase();
  // sub-niche keyword in the prompt wins (most specific)
  for (const kw of puo.extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_SCENES[k]) return SUBNICHE_SCENES[k];
  }
  if (SUBNICHE_SCENES[raw]) return SUBNICHE_SCENES[raw];
  if (NICHE_SCENES[raw]) return NICHE_SCENES[raw];
  return NICHE_SCENES[normalizeNiche(raw)] || NICHE_SCENES.general;
}

/**
 * Build a precise, niche-matched image prompt for one section/slot.
 * Deterministic: same (prompt, role, index) always yields the same spec.
 */
export function buildImagePrompt(puo: PromptUnderstandingObject, role: ImageRole, index: number): ImagePromptSpec {
  const scene = resolveScene(puo);
  const grade = MOOD_GRADE[puo.visualMood] || MOOD_GRADE.neutral;
  const treatment = STYLE_TREATMENT[puo.designStyle] || STYLE_TREATMENT.minimal;
  const framing = ROLE_FRAMING[role] || ROLE_FRAMING.gallery;

  // Compose the positive prompt: subject + setting + framing + grade + treatment + quality
  const prompt = [
    scene.subject,
    scene.setting,
    scene.details,
    framing.framing,
    grade,
    treatment,
    BASE_QUALITY,
  ].join(', ');

  const seed = fnv(`${puo.originalPrompt}|${role}|${index}`) % 2_147_483_647;

  return {
    prompt,
    negative: BASE_NEGATIVE,
    seed,
    width: framing.w,
    height: framing.h,
    role,
  };
}
