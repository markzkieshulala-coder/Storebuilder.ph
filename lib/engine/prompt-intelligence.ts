// ---------------------------------------------------------------------------
// Prompt Intelligence Layer
//
// Deeply analyses the raw user prompt and extracts design signals that drive
// EVERY visual decision downstream: CSS architecture, typography, hero style,
// color intensity, section order and page set. Two prompts in the same niche
// with different style language MUST produce radically different websites.
//
// Signal detection is intentionally lenient — partial matches (e.g. "cinema"
// hitting "cinematic") are fine because the scoring normalises the weight.
// ---------------------------------------------------------------------------

import type { Niche } from './html-renderer';

// ---------------------------------------------------------------------------
// Design moods — each maps to a completely distinct CSS architecture
// ---------------------------------------------------------------------------
export type DesignMood =
  | 'cinematic-dark'      // epic full-bleed, dark overlay, Barlow Condensed 900
  | 'athletic-bold'       // sports energy, neon, condensed caps
  | 'minimal-clean'       // white space, restrained, light weight type
  | 'editorial-elegant'   // serif display, warm/cream, refined spacing
  | 'tech-modern'         // dark navy, Space Grotesk, data-forward grid
  | 'warm-inviting'       // earthy tones, cozy, hospitality feel
  | 'creative-expressive' // Syne, asymmetric, mixed scales, editorial
  | 'professional-trust'; // Merriweather, clean blue, institutional

// ---------------------------------------------------------------------------
// Signal word banks — each mood is defined by its keyword vocabulary
// ---------------------------------------------------------------------------
const MOOD_SIGNALS: Record<DesignMood, string[]> = {
  'cinematic-dark': [
    'dark', 'cinematic', 'noir', 'dramatic', 'epic', 'shadow', 'moody',
    'atmosphere', 'intense', 'powerful', 'immersive', 'night', 'black',
    'mysterious', 'sinister', 'haunting', 'gothic', 'brooding', 'midnight',
    'deep', 'abyss', 'charcoal', 'obsidian', 'stealth',
  ],
  'athletic-bold': [
    'sports', 'sport', 'athletic', 'energetic', 'dynamic', 'explosive',
    'nba', 'basketball', 'champion', 'performance', 'bold', 'aggressive',
    'fierce', 'hustle', 'grind', 'training', 'gym', 'fitness', 'workout',
    'strength', 'power', 'speed', 'agility', 'competition', 'league',
    'team', 'jersey', 'sneaker', 'hoops', 'court', 'crossfit',
  ],
  'minimal-clean': [
    'minimal', 'minimalist', 'clean', 'simple', 'white', 'airy', 'open',
    'fresh', 'breathing', 'space', 'restrained', 'pure', 'understated',
    'quiet', 'calm', 'zen', 'scandinav', 'swiss', 'japanese', 'muji',
    'uncluttered', 'crisp', 'bare', 'stripped', 'essentialist', 'plain',
  ],
  'editorial-elegant': [
    'elegant', 'luxury', 'premium', 'refined', 'sophisticated', 'editorial',
    'exclusive', 'artisan', 'curated', 'bespoke', 'upscale', 'fine',
    'noble', 'haute', 'couture', 'vogue', 'tasteful', 'high-end',
    'opulent', 'lavish', 'distinguished', 'prestige', 'manor', 'classic',
  ],
  'tech-modern': [
    'saas', 'software', 'platform', 'dashboard', 'app', 'tech', 'startup',
    'productivity', 'automation', 'workflow', 'analytics', 'data', 'modern',
    'future', 'innovation', 'digital', 'cloud', 'api', 'developer',
    'engineering', 'code', 'interface', 'product', 'b2b', 'enterprise',
    'scale', 'infrastructure', 'devops', 'ml', 'ai',
  ],
  'warm-inviting': [
    'warm', 'cozy', 'inviting', 'welcoming', 'friendly', 'earthy', 'rustic',
    'comfort', 'home', 'natural', 'organic', 'family', 'nourish', 'hearty',
    'bistro', 'bakery', 'cafe', 'coffee', 'ramen', 'brunch', 'kitchen',
    'homemade', 'artisan food', 'local', 'seasonal', 'farm', 'garden',
  ],
  'creative-expressive': [
    'creative', 'artistic', 'expressive', 'colorful', 'vibrant', 'unique',
    'unconventional', 'playful', 'imaginative', 'artsy', 'experimental',
    'avant', 'garde', 'surreal', 'abstract', 'portfolio', 'design',
    'illustration', 'photography', 'filmmaker', 'musician', 'artist',
    'studio', 'gallery', 'agency', 'branding', 'campaign',
  ],
  'professional-trust': [
    'professional', 'corporate', 'reliable', 'trusted', 'established',
    'formal', 'executive', 'institutional', 'academic', 'certified',
    'credible', 'authority', 'expert', 'business', 'consulting', 'finance',
    'legal', 'medical', 'healthcare', 'insurance', 'accounting', 'firm',
    'enterprise', 'reputable', 'dependable', 'solid',
  ],
};

// Niche fallback moods — used when no mood has a clear signal lead
const NICHE_DEFAULT_MOOD: Record<Niche, DesignMood> = {
  sports:    'athletic-bold',
  restaurant:'warm-inviting',
  portfolio: 'creative-expressive',
  ecommerce: 'editorial-elegant',
  saas:      'tech-modern',
  agency:    'creative-expressive',
  business:  'professional-trust',
};

// ---------------------------------------------------------------------------
// Hero style
// ---------------------------------------------------------------------------
export type HeroStyle =
  | 'fullbleed-overlay'  // viewport-height, dark image + text overlay
  | 'split-media'        // text left, image right (or reversed)
  | 'centered-type'      // centred, large type, minimal media
  | 'stack-bold'         // text-only stack, huge heading, no image
  | 'asymmetric';        // off-grid, editorial

// Mood → default hero style
const MOOD_HERO: Record<DesignMood, HeroStyle> = {
  'cinematic-dark':      'fullbleed-overlay',
  'athletic-bold':       'fullbleed-overlay',
  'minimal-clean':       'centered-type',
  'editorial-elegant':   'split-media',
  'tech-modern':         'split-media',
  'warm-inviting':       'split-media',
  'creative-expressive': 'asymmetric',
  'professional-trust':  'split-media',
};

// ---------------------------------------------------------------------------
// Full intelligence result
// ---------------------------------------------------------------------------
export interface PromptIntelligence {
  niche: Niche;
  mood: DesignMood;
  heroStyle: HeroStyle;
  darkMode: boolean;

  // Typography personality
  typographyStyle:
    | 'condensed-caps'   // Barlow Condensed, UPPERCASE, 900
    | 'editorial-serif'  // Cormorant Garamond, sentence case
    | 'clean-geometric'  // Inter, light weight
    | 'display-syne'     // Syne, expressive
    | 'technical-grotesk'// Space Grotesk, structured
    | 'elegant-serif'    // Fraunces / DM Serif, tasteful
    | 'classic-serif';   // Merriweather, trustworthy

  // Color intensity preference
  colorIntensity: 'neon' | 'vibrant' | 'muted' | 'warm' | 'cool' | 'mono';

  // Section content priorities (what matters most in this prompt)
  sectionFocus: Array<
    'products' | 'stats' | 'gallery' | 'about' | 'services' | 'features' |
    'testimonials' | 'pricing' | 'team' | 'menu' | 'process' | 'cta'
  >;

  // Pages to generate
  pages: Array<'home' | 'about' | 'gallery' | 'contact' | 'pricing'>;

  // Stable per-generation fingerprint (more entropy than just brand hash)
  fingerprint: number;
}

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------
export function analyzePrompt(prompt: string, brandName: string, niche: Niche): PromptIntelligence {
  const p = prompt.toLowerCase();

  // --- Mood scoring ---
  let bestMood: DesignMood = NICHE_DEFAULT_MOOD[niche];
  let bestScore = -1;

  for (const [mood, words] of Object.entries(MOOD_SIGNALS) as [DesignMood, string[]][]) {
    const score = words.reduce((n, w) => n + (p.includes(w) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestMood = mood; }
  }

  // Force niche-specific overrides for very strong keyword presence
  if (/(basketball|nba|sneaker|jersey|hoops)/.test(p) && bestMood !== 'cinematic-dark') {
    bestMood = 'athletic-bold';
  }
  if (/(minimal|minimalist|clean|simple)/.test(p) && niche === 'sports') {
    bestMood = 'minimal-clean'; // "minimalist training academy" case
  }

  const darkMode = ['cinematic-dark', 'athletic-bold', 'tech-modern'].includes(bestMood);

  // --- Typography mapping ---
  const typMap: Record<DesignMood, PromptIntelligence['typographyStyle']> = {
    'cinematic-dark':      'condensed-caps',
    'athletic-bold':       'condensed-caps',
    'minimal-clean':       'clean-geometric',
    'editorial-elegant':   'editorial-serif',
    'tech-modern':         'technical-grotesk',
    'warm-inviting':       'elegant-serif',
    'creative-expressive': 'display-syne',
    'professional-trust':  'classic-serif',
  };

  // --- Color intensity ---
  const colMap: Record<DesignMood, PromptIntelligence['colorIntensity']> = {
    'cinematic-dark':      'neon',
    'athletic-bold':       'neon',
    'minimal-clean':       'mono',
    'editorial-elegant':   'warm',
    'tech-modern':         'cool',
    'warm-inviting':       'warm',
    'creative-expressive': 'vibrant',
    'professional-trust':  'muted',
  };

  // --- Section focus ---
  const focus: PromptIntelligence['sectionFocus'] = [];
  if (/(product|gear|shop|buy|order|price|₱|\$)/.test(p))         focus.push('products');
  if (/(stat|number|result|win|achieve|award|record)/.test(p))     focus.push('stats');
  if (/(gallery|photo|image|visual|portfolio|work|project)/.test(p)) focus.push('gallery');
  if (/(team|staff|coach|crew|founder|about|story|us)/.test(p))    focus.push('about');
  if (/(service|offer|feature|solution|plan|package)/.test(p))     focus.push('services');
  if (/(review|testimonial|client|trust|rating|feedback)/.test(p)) focus.push('testimonials');
  if (/(price|pricing|plan|tier|subscription|free|trial)/.test(p)) focus.push('pricing');
  if (/(menu|dish|food|cuisine|recipe|eat|taste)/.test(p))         focus.push('menu');
  if (/(process|how|step|method|workflow|approach)/.test(p))       focus.push('process');
  // Defaults if nothing matched
  if (focus.length === 0) {
    if (niche === 'saas')      focus.push('features', 'pricing', 'testimonials');
    else if (niche === 'ecommerce') focus.push('products', 'gallery', 'testimonials');
    else if (niche === 'restaurant') focus.push('menu', 'gallery', 'about');
    else if (niche === 'portfolio') focus.push('gallery', 'about', 'process');
    else if (niche === 'sports')    focus.push('products', 'stats', 'gallery');
    else if (niche === 'agency')    focus.push('gallery', 'services', 'about');
    else                            focus.push('services', 'about', 'testimonials');
  }

  // --- Pages to generate ---
  const pages: PromptIntelligence['pages'] = ['home', 'about', 'gallery', 'contact'];
  if (focus.includes('pricing') || niche === 'saas' || niche === 'ecommerce') {
    pages.push('pricing');
  }

  // --- Fingerprint: hash of brand + full prompt (not just brand + niche) ---
  let h = 2166136261;
  const fp = (brandName + '|' + prompt).toLowerCase();
  for (let i = 0; i < fp.length; i++) { h ^= fp.charCodeAt(i); h = Math.imul(h, 16777619); }
  const fingerprint = h >>> 0;

  return {
    niche,
    mood: bestMood,
    heroStyle: MOOD_HERO[bestMood],
    darkMode,
    typographyStyle: typMap[bestMood],
    colorIntensity: colMap[bestMood],
    sectionFocus: focus,
    pages,
    fingerprint,
  };
}
