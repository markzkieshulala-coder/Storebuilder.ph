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

// ─────────────────────────────────────────────────────────────────
// CURATED REAL-PHOTO LIBRARY (keyless, reliable Unsplash CDN ids)
//
// These serve REAL photographs from images.unsplash.com/photo-<id> — the same
// keyless CDN that already works in the app. Keyed by SUB-NICHE first (so coffee
// shows coffee, not a generic restaurant plate) then broad niche then general.
// Used as the default image source and as the fallback for keyword search.
// ─────────────────────────────────────────────────────────────────

const SUBNICHE_PHOTOS: Record<string, string[]> = {
  coffee:   ['1495474472287-4d71bcdd2085','1509042239860-f550ce710b93','1447933601403-0c6688de566e','1461023058943-07fcbe16d735','1442512595331-e89e73853f31','1521017432531-fbd92d768814'],
  cafe:     ['1442512595331-e89e73853f31','1521017432531-fbd92d768814','1554118811-1e0d58224f24','1453614512568-c4024d13c247','1495474472287-4d71bcdd2085','1509042239860-f550ce710b93'],
  espresso: ['1461023058943-07fcbe16d735','1447933601403-0c6688de566e','1495474472287-4d71bcdd2085','1509042239860-f550ce710b93','1442512595331-e89e73853f31','1521017432531-fbd92d768814'],
  ramen:    ['1557872943-16a5ac26437e','1591814468924-caf88d1232e1','1569718212165-3a8278d5f624','1618841557871-b4664fbf0cb3','1543826173-70651703c5a4','1574484284002-952d92456975'],
  sushi:    ['1579584425555-c3ce17fd4351','1611143669185-af224c5e3252','1553621042-f6e147245754','1583623025817-d180a2221d0a','1564489563601-c53cfc451e93','1607301405390-d831c242f59b'],
  pizza:    ['1513104890138-7c749659a591','1565299624946-b28f40a0ae38','1574071318508-1cdbab80d002','1593560708920-61dd98c46a4e','1571066811602-716837d681de','1604068549290-dea0e4a305ca'],
  burger:   ['1568901346375-23c9450c58cd','1571091718767-18b5b1457add','1550547660-d9450f859349','1572802419224-296b0aeee0d9','1586190848861-99aa4a171e90','1606131731446-5568d87113aa'],
  bakery:   ['1509440159596-0249088772ff','1486427944299-d1955d23e34d','1555507036-ab1f4038808a','1517433670267-08bbd4be890f','1568254183919-78a4f43a2877','1608198093002-ad4e005484ec'],
  bar:      ['1514362545857-3bc16c4c7d1b','1470337458703-46ad1756a187','1551024601-bec78aea704b','1536935338788-846bb9981813','1572116469696-31de0f17cc34','1543007630-9710e4a00a20'],
  gym:      ['1534438327276-14e5300c3a48','1571019613454-1cb2f99b2d8b','1517836357463-d25dfeac3438','1581009146145-b5ef050c2e1e','1599058917212-d750089bc07e','1534258936925-c58bed479fcb'],
  crossfit: ['1534258936925-c58bed479fcb','1599058917212-d750089bc07e','1581009146145-b5ef050c2e1e','1517836357463-d25dfeac3438','1534438327276-14e5300c3a48','1571019613454-1cb2f99b2d8b'],
  yoga:     ['1545205597-3d9d02c29597','1506126613408-eca07ce68773','1544367567-0f2fcb009e0b','1575052814086-f385e2e2ad1b','1599901860904-17e6ed7083a0','1591291621164-2c6367723315'],
  spa:      ['1540555700478-4be289fbecef','1544161515-4ab6ce6db874','1600334089648-b0d9d3028eb2','1571019613454-1cb2f99b2d8b','1556760544-74068565f05c','1519823551278-64ac92734fb1'],
};

const NICHE_PHOTOS: Record<string, string[]> = {
  food:        ['1517248135467-4c7edcad34c4','1414235077428-338989a2e8c0','1466978913421-da2e5dbfca53','1567620905732-2d1ec7ab7445','1555244162-af5a7e0d12bb','1504674900247-0877df9cc836'],
  sports:      ['1534438327276-14e5300c3a48','1571019613454-1cb2f99b2d8b','1517836357463-d25dfeac3438','1581009146145-b5ef050c2e1e','1599058917212-d750089bc07e','1534258936925-c58bed479fcb'],
  photography: ['1452587925148-ce544e77e70d','1581291518857-4d27a4f0e37a','1517048676732-d65bc937f952','1492551557933-34265f7af79e','1504703552179-6b32d9f5e310','1551316179-ef83f3bf93a5'],
  technology:  ['1551434678-e076c223a692','1460925895917-afdab827c52f','1504384308090-c894fdcc538d','1518770660439-4636190af475','1519389950473-47ba0277781c','1496171367470-9ed9a91ea931'],
  fashion:     ['1483985988355-763728e1935b','1490481651871-ab68de25d43d','1441986300917-64674bd600d8','1525507119028-ed4c629a60a3','1509631179647-0177331693ae','1485518882345-15568b007407'],
  ecommerce:   ['1523275335684-37898b6baf30','1542291026-7eec264c27ff','1553062407-98eeb64c6a62','1491553895911-0055eca6402d','1556742400-b75a4bbdd8e7','1515886657613-9f3515b0c78f'],
  portfolio:   ['1497366216548-37526070297c','1497366811353-6870744d04b2','1522202176988-66273c2fd55f','1544717305-2782549b5bd6','1541462608143-67571c6738dd','1534670007418-5a73bcb45b52'],
  agency:      ['1556761175-5973dc0f32e7','1542744173-8e7e53415bb0','1497215842964-222b430dc094','1531403009284-440f080d1e12','1542744094-3a31f272c490','1551836022-d5d88e9218df'],
  wellness:    ['1540555700478-4be289fbecef','1545205597-3d9d02c29597','1506126613408-eca07ce68773','1544161515-4ab6ce6db874','1571019614242-c5c5dee9f50b','1600334089648-b0d9d3028eb2'],
  professional:['1454165804606-c3d57bc86b40','1542744173-8e7e53415bb0','1531973576160-7125cd663d86','1521737604893-d14cc237f11d','1556761175-5973dc0f32e7','1517245386807-bb43f82c33c4'],
  hospitality: ['1566073771259-470de1bed68c','1520250497591-112f2f40a3f4','1571896349842-33c89424de2d','1551882547-ff40c63fe5fa','1582719478250-c89cae4dc85b','1611892440504-42a792e24d32'],
  general:     ['1486406146926-c627a92ad1ab','1497215842964-222b430dc094','1507679799987-c73779587ccf','1542744173-8e7e53415bb0','1519389950473-47ba0277781c','1531973576160-7125cd663d86'],
};

function nicheKey(puo: PromptUnderstandingObject): string {
  const raw = puo.inferredIndustry.toLowerCase();
  if (NICHE_PHOTOS[raw]) return raw;
  // map common synonyms to broad banks
  const M: Record<string, string> = {
    restaurant: 'food', dining: 'food', bistro: 'food', cafe: 'food', coffee: 'food', brunch: 'food',
    fitness: 'sports', gym: 'sports', crossfit: 'sports', workout: 'sports', yoga: 'sports', pilates: 'sports', boxing: 'sports',
    saas: 'technology', software: 'technology', startup: 'technology', ai: 'technology', tech: 'technology',
    beauty: 'fashion', apparel: 'fashion', clothing: 'fashion', streetwear: 'fashion', salon: 'fashion', barbershop: 'fashion',
    retail: 'ecommerce', shop: 'ecommerce', store: 'ecommerce',
    art: 'portfolio', design: 'portfolio', architecture: 'portfolio',
    marketing: 'agency', consulting: 'agency', branding: 'agency', studio: 'agency',
    spa: 'wellness', massage: 'wellness', meditation: 'wellness', therapy: 'wellness', dental: 'wellness', clinic: 'wellness',
    law: 'professional', legal: 'professional',
    hotel: 'hospitality', resort: 'hospitality', travel: 'hospitality',
    photographer: 'photography', film: 'photography', videography: 'photography',
  };
  return M[raw] || 'general';
}

/**
 * Return an ordered list of REAL Unsplash photo IDs that match the prompt's
 * actual subject — sub-niche first (coffee→coffee), then broad niche, then
 * general. Deterministically rotated so each brand gets a different start.
 */
export function curatedPhotoIds(puo: PromptUnderstandingObject): string[] {
  // 1) sub-niche from a content keyword
  for (const kw of puo.extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_PHOTOS[k]) return rotateIds(SUBNICHE_PHOTOS[k], puo);
  }
  const raw = puo.inferredIndustry.toLowerCase();
  if (SUBNICHE_PHOTOS[raw]) return rotateIds(SUBNICHE_PHOTOS[raw], puo);
  // 2) broad niche
  return rotateIds(NICHE_PHOTOS[nicheKey(puo)] || NICHE_PHOTOS.general, puo);
}

function rotateIds(ids: string[], puo: PromptUnderstandingObject): string[] {
  const fp = fnv(puo.originalPrompt);
  const n = ids.length ? Math.abs(fp) % ids.length : 0;
  return ids.slice(n).concat(ids.slice(0, n));
}

/**
 * Short keyword search query for stock-photo APIs (Unsplash/Pexels). Uses the
 * real subject + a couple of setting words. Varies slightly per slot.
 */
export function buildSearchQuery(puo: PromptUnderstandingObject, index: number): string {
  // Prefer a concrete sub-niche keyword, else the niche.
  let subject = '';
  for (const kw of puo.extractedKeywords) {
    const k = kw.toLowerCase();
    if (SUBNICHE_PHOTOS[k] || SUBNICHE_SCENES[k]) { subject = k; break; }
  }
  if (!subject) subject = puo.inferredIndustry.toLowerCase();
  if (!subject || subject === 'general') subject = 'modern business';
  const modifiers = ['', ' interior', ' close up', ' lifestyle', ' detail', ' professional'];
  return (subject + modifiers[index % modifiers.length]).trim();
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
