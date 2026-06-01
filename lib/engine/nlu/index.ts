// ---------------------------------------------------------------------------
// IN-HOUSE NLU ENGINE
//
// A purpose-built natural-language understanding engine that runs IN-PROCESS,
// in the SAME system as the website generator — no Claude, no OpenAI, no Google,
// no Ollama, no network of any kind. It reads the user's whole prompt and
// extracts a structured understanding (niche, brand name, colours, the hero copy
// and button labels they wrote, the products/services they listed, requested
// sections) and synthesises any on-brand copy the prompt left implicit, drawing
// on the niche lexicon.
//
// The output is folded into the PromptUnderstandingObject's `customAttributes.llm`
// channel — the exact shape the renderer already consumes — so the generator
// builds the site the user described. Understanding and generation are one
// pipeline in one process.
//
// Pipeline:
//   tokenize → detect niche → extract explicit copy (hero/CTA/sections)
//   → extract brand name → extract colours → extract listed products
//   → synthesise missing copy from the niche profile → assemble NluContent
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from '../prompt-engine';
import type { VisualMood, DesignStyle, WebsitePersonality, BusinessTone } from '../prompt-engine/types';
import { extractPromptCopy } from '../prompt-copy';
import { COLOR_HEX, NICHES, profileFor, type NicheCopyProfile } from './lexicon';

export interface NluProduct { name: string; desc?: string; price?: string }
export interface NluFaq { q: string; a: string }

// The structured understanding the renderer consumes (via customAttributes.llm).
export interface NluContent {
  industry: string;
  keywords: string[];
  mood?: VisualMood;
  designStyle?: DesignStyle;
  personality?: WebsitePersonality;
  tone?: BusinessTone;
  palette?: { primary?: string; accent?: string; background?: string };
  brandName?: string;
  tagline?: string;
  heroHeadline?: string;
  heroSub?: string;
  heroTag?: string;
  primaryCta?: string;
  secondaryCta?: string;
  about?: string;
  sections?: string[];
  products?: NluProduct[];
  faqs?: NluFaq[];
}

// ── Small deterministic helpers ─────────────────────────────────────────────

// A stable hash so a given prompt always picks the same copy variant (no random
// drift between /api/analyze and /api/generate).
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pick<T>(arr: T[], seed: number): T {
  // Tolerate any (even negative) seed — signed shifts upstream can go negative.
  const i = ((Math.trunc(seed) % arr.length) + arr.length) % arr.length;
  return arr[i];
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','for','with','that','this','of','to','in','on','at','by','from',
  'is','are','be','our','your','their','we','i','you','it','website','site','page','build','create',
  'make','want','need','please','would','like','should','can','will','about','section','sections',
  'business','company','brand','called','named','using','use','should','have','has','include','includes',
]);

// ── Niche detection ─────────────────────────────────────────────────────────
// Walk the lexicon, score every niche by how many of its trigger phrases appear
// (longer phrases score higher, specific niches break ties over umbrella ones).
function detectNiche(lower: string): { slug: string; broad: string } {
  let best: { slug: string; broad: string; score: number } | null = null;
  for (const niche of NICHES) {
    let score = 0;
    for (const t of niche.triggers) {
      // word-boundary-ish match so "barber" doesn't fire inside "barbershop" twice incorrectly
      const re = new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
      if (re.test(lower)) score += t.includes(' ') ? 3 : 2;
    }
    if (niche.specific) score *= 1.5;
    if (score > 0 && (!best || score > best.score)) best = { slug: niche.slug, broad: niche.broad, score };
  }
  return best ? { slug: best.slug, broad: best.broad } : { slug: 'general', broad: 'general' };
}

// Colour names that double as common nouns / niche words. These only count as a
// palette colour when sitting next to a colour-context cue.
const AMBIGUOUS_COLORS = new Set([
  'coffee', 'espresso', 'mocha', 'caramel', 'chocolate', 'cream',
  'mint', 'sage', 'olive', 'wine', 'salmon', 'peach', 'forest',
]);

// ── Colour extraction ───────────────────────────────────────────────────────
// Pull out hex codes the user typed and named colours, mapping the first two to
// primary/accent. Background follows the niche default unless a dark/light cue
// is present.
function extractColors(text: string, lower: string, profile: NicheCopyProfile): NluContent['palette'] | undefined {
  const found: string[] = [];
  // Explicit hex codes win.
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(text)) !== null) {
    let hex = m[0].toLowerCase();
    if (hex.length === 4) hex = '#' + hex.slice(1).split('').map(c => c + c).join('');
    if (!found.includes(hex)) found.push(hex);
  }
  // Named colours, in the order they appear. Several colour names are also common
  // nouns or niche words ("coffee", "espresso", "mint", "rose", "wine", ...), so
  // we partition matches into those backed by a colour-context cue ("palette",
  // "colour", "scheme", "theme", "accent", ...) and bare ones. If any cue-backed
  // colours exist we trust only those; otherwise we fall back to bare matches but
  // drop the ambiguous food/niche words to avoid mistaking "coffee shop" for brown.
  const CUE_RE = /\b(colou?rs?|palette|scheme|theme|tones?|accent|primary|background|shades?|hues?)\b/gi;
  const cuePositions: number[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = CUE_RE.exec(lower)) !== null) cuePositions.push(cm.index);
  const nearCue = (idx: number) => cuePositions.some(c => Math.abs(c - idx) <= 45);

  const cueBacked: Array<{ hex: string; idx: number }> = [];
  const bare: Array<{ hex: string; idx: number }> = [];
  for (const [name, hex] of Object.entries(COLOR_HEX)) {
    const re = new RegExp(`(^|[^a-z])${name}([^a-z]|$)`, 'i');
    const idx = lower.search(re);
    if (idx < 0) continue;
    if (nearCue(idx)) cueBacked.push({ hex, idx });
    else if (!AMBIGUOUS_COLORS.has(name)) bare.push({ hex, idx });
  }
  const chosen = cueBacked.length ? cueBacked : bare;
  chosen.sort((a, b) => a.idx - b.idx);
  for (const p of chosen) if (!found.includes(p.hex)) found.push(p.hex);

  if (!found.length) return undefined;
  const palette: NonNullable<NluContent['palette']> = {};
  palette.primary = found[0];
  if (found[1]) palette.accent = found[1];
  // Honour explicit dark/light cues for the background; else use niche default.
  if (/\b(dark|night|black|moody|midnight)\b/.test(lower)) palette.background = '#0a0a0c';
  else if (/\b(light|bright|white|airy|clean)\b/.test(lower)) palette.background = '#f8fafc';
  else if (profile.palette) palette.background = profile.palette.background;
  return palette;
}

// ── Brand-name extraction ───────────────────────────────────────────────────
// Recognise “called X”, “named X”, “brand X”, “for X”, or a leading proper noun.

// First word of a captured phrase that should not be treated as a brand name.
const SKIP_BRAND_FIRST = new Set([
  "My", "Our", "Your", "The", "An", "A", "This", "That", "Their",
  "New", "Best", "Good", "Top", "Big", "Small", "Great", "Just",
  "Build", "Create", "Make", "Design", "Develop", "Launch", "Start",
]);

function extractBrandName(text: string): string | undefined {
  const patterns = [
    // Explicit: “called Rodriguez Coffee”, “named The Morning Grind”, “brand name is...”
    /\b(?:called|named|brand(?:\s+name)?(?:\s+is)?|business(?:\s+name)?(?:\s+is)?|shop(?:\s+called)?|store(?:\s+called)?)\s+[“”']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    // “for a coffee shop called The Grind”
    /\b(?:for(?:\s+a|\s+my|\s+our)?)\s+(?:coffee shop|cafe|restaurant|brand|business|company|store|shop|studio|agency|firm)\s+(?:called|named)\s+[“”']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    // “for Rodriguez Coffee Shop” — capitalized proper-noun phrase following “for”
    /\bfor\s+([A-Z][A-Za-z&''.-]{1,}(?:\s+[A-Z][A-Za-z&''.-]+){0,4})(?=\s|[,.!?\n]|$)/,
    // “[BrandName] is a [niche]” — brand stated at the start of a clause
    /^([A-Z][A-Za-z&''.-]{1,}(?:\s+[A-Z][A-Za-z&''.-]+){0,3})\s+(?:is\s+a|is\s+an|—|–|-)\s+/m,
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && m[1]) {
      const name = m[1].replace(/[.,;:!?\-\s]+$/, '').trim();
      const firstWord = name.split(/\s+/)[0];
      if (SKIP_BRAND_FIRST.has(firstWord)) continue;
      if (name.length >= 2 && name.length <= 50) return name;
    }
  }
  return undefined;
}

// ── Product / service list extraction ───────────────────────────────────────
// Find comma/“and”-separated lists introduced by an offering cue
// ("we serve / offer / sell / menu / products / drinks like ...").
const LIST_CUES = [
  'serve', 'serving', 'offer', 'offering', 'sell', 'selling', 'specialize in', 'specialise in',
  'menu', 'products', 'product', 'drinks', 'dishes', 'items', 'services', 'such as', 'including',
  'include', 'like', 'feature', 'featuring',
];

function extractProducts(text: string): NluProduct[] | undefined {
  const lower = text.toLowerCase();
  let bestList: string[] | null = null;
  // Track the best list specifically from a "such as" / "including" cue since
  // those introduce the cleanest enumerations (e.g. "drinks such as espresso,
  // latte, cappuccino").  If we find one with ≥2 items it wins outright.
  let suchAsList: string[] | null = null;

  for (const cue of LIST_CUES) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(cue, from);
      if (idx < 0) break;
      from = idx + cue.length;
      // Grab the clause after the cue, up to sentence end.
      const tail = text.slice(idx + cue.length, idx + cue.length + 200);
      const clause = tail.split(/[.!?\n]/)[0];
      const items = splitList(clause);
      if (items.length >= 2) {
        // Prefer the "such as" cue result over generic cues — it reliably
        // follows the complete product list without extra noise.
        if (cue === 'such as' || cue === 'including') {
          if (!suchAsList || items.length > suchAsList.length) suchAsList = items;
        }
        if (!bestList || items.length > bestList.length) bestList = items;
      }
    }
  }
  // A "such as / including" result takes priority when it is at least as long
  // as the generic best — it filters out noise from other cue matches.
  const finalList = suchAsList && suchAsList.length >= (bestList?.length ?? 0)
    ? suchAsList
    : bestList;
  if (!finalList) return undefined;
  return finalList.slice(0, 8).map(name => ({ name }));
}

// Filler words that can appear at the start of a list item when a cue like
// “drinks such as espresso, latte” fires — the tail “such as espresso, latte”
// gets split and “such as espresso” becomes the first token.  Drop them.
const FILLER_FIRST = new Set([
  'such', 'including', 'like', 'and', 'or', 'but', 'also', 'plus', 'featuring',
]);

// Split “A, B, C and D” / “A, B & C” into clean title-cased items.
function splitList(clause: string): string[] {
  const cleaned = clause.replace(/^[\s:;,–—-]+/, '');
  const parts = cleaned
    .split(/\s*,\s*|\s+and\s+|\s*&\s*|\s*\/\s*/i)
    .map(s => s.trim())
    .filter(Boolean);
  const items: string[] = [];
  for (let p of parts) {
    // Stop the list at obvious sentence continuations.
    if (/\b(with|for|that|which|to|so|because|please|on|in|at)\b/i.test(p) && p.split(/\s+/).length > 4) break;
    p = p.replace(/^[“”'']+|[“”''.]+$/g, '').trim();
    // Reject fragments that are clearly prose, keep short noun phrases.
    const words = p.split(/\s+/);
    if (!p || words.length > 4) continue;
    if (p.length < 2 || p.length > 40) continue;
    // Skip items whose first word is a filler/connector — artefacts of cues like
    // “such as” or “including” being included in the extracted clause tail.
    // e.g. “drinks such as espresso, latte” → tail “ such as espresso, latte”
    // → split yields “such as espresso” as first part → skip it.
    if (FILLER_FIRST.has(words[0].toLowerCase())) continue;
    items.push(titleCase(p));
  }
  return items;
}

function titleCase(s: string): string {
  return s.replace(/\w[\w''-]*/g, w =>
    /^(and|or|the|of|a|an|to|in|on|with|for)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).replace(/^\w/, c => c.toUpperCase());
}

// ── Keyword extraction ──────────────────────────────────────────────────────
function extractKeywords(lower: string): string[] {
  const words = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
}

// ── Explicit design-cue detection ───────────────────────────────────────────
// If the user explicitly named a mood/style/personality/tone, we must NOT let
// the niche profile's default override their choice. We detect which dimensions
// the prompt speaks to and suppress the profile default for those, leaving the
// deterministic parser's explicit-words-win result to stand.
const MOOD_CUES = ['dark','light','bright','vibrant','muted','soft','warm','cold','cool','dramatic','moody','ethereal','contrast','grounded','neutral'];
const STYLE_CUES = ['minimal','minimalist','brutalist','glassmorphism','glass','neumorphism','flat','material','cyberpunk','futuristic','retro','vintage','vaporwave','editorial','corporate','playful','artistic','organic','industrial','luxury','luxurious','premium','startup','enterprise','cinematic','high-tech','modern','clean','elegant','sleek'];
const PERSONALITY_CUES = ['bold','elegant','aggressive','friendly','authoritative','whimsical','serious','approachable','exclusive','energetic','calm','rebellious','sophisticated','youthful','trustworthy','innovative','timeless','experimental','professional','fun','quirky'];
const TONE_CUES = ['professional','casual','formal','playful','technical','luxury','accessible','disruptive','authoritative','empathetic','aggressive','conservative'];

function hasCue(lower: string, cues: string[]): boolean {
  return cues.some(c => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`, 'i').test(lower));
}

// ── Copy synthesis ──────────────────────────────────────────────────────────
// Build niche-appropriate hero/sub/tagline/about copy, substituting the brand
// name. Explicit user copy (extracted separately) always overrides these.
function synthesizeCopyFrom(heroes: string[], profile: NicheCopyProfile, brand: string, seed: number) {
  const sub = (s: string) => s.replace(/\{brand\}/g, brand);
  return {
    heroHeadline: sub(pick(heroes, seed)),
    heroSub: sub(pick(profile.subs, seed >> 3)),
    tagline: sub(pick(profile.taglines, seed >> 5)),
    about: sub(pick(profile.abouts, seed >> 7)),
  };
}

// Attach niche-appropriate descriptions/prices to user-named products that came
// with only a name, by matching against the profile's known products.
function enrichProducts(named: NluProduct[], profile: NicheCopyProfile): NluProduct[] {
  return named.map(p => {
    if (p.desc && p.price) return p;
    const match = profile.products.find(bp => bp.name.toLowerCase() === p.name.toLowerCase());
    if (match) return { name: p.name, desc: p.desc || match.desc, price: p.price || match.price };
    return p;
  });
}

// ── Main entry point ────────────────────────────────────────────────────────
/**
 * Read a prompt and produce a structured, in-house understanding. Always returns
 * content — there is no network path and no failure mode that yields null.
 */
export function understandPrompt(prompt: string): NluContent {
  const text = (prompt || '').replace(/[“”„‟″]/g, '"').replace(/[''‚‛′]/g, "'");
  const lower = text.toLowerCase();
  const seed = hash(lower);

  const { slug, broad } = detectNiche(lower);
  const profile = profileFor(slug, broad);

  const explicit = extractPromptCopy(prompt);          // hero/CTA/sections the user wrote
  const brandName = extractBrandName(text);
  // When we know the brand name, substitute it into copy. When we don't, use a
  // placeholder that the renderer's own brand-name logic will overwrite.
  const brand = brandName || 'We';
  // Explicit colours win. Otherwise use the niche default palette — but only when
  // the user gave no mood cue (e.g. "dark"), so we don't fight the parser's
  // mood-derived palette.
  const explicitPalette = extractColors(text, lower, profile);
  const palette = explicitPalette || (hasCue(lower, MOOD_CUES) ? undefined : profile.palette);
  const namedProducts = extractProducts(text);

  // When a brand name was found, prefer the brand-personalised hero pool so the
  // headline feels specific to this business rather than generic niche copy.
  const heroPool = brandName && profile.brandHeroes?.length
    ? profile.brandHeroes
    : profile.heroes;
  const synth = synthesizeCopyFrom(heroPool, profile, brand, seed);

  // Products: prefer the user's explicit list (enriched with niche detail), else
  // the niche's representative offering.
  const products = namedProducts && namedProducts.length
    ? enrichProducts(namedProducts, profile)
    : profile.products;

  // Suppress profile token defaults the user spoke to explicitly, so the parser's
  // explicit-words-win result stands for those dimensions.
  const content: NluContent = {
    industry: slug,
    keywords: extractKeywords(lower),
    mood: hasCue(lower, MOOD_CUES) ? undefined : profile.mood,
    designStyle: hasCue(lower, STYLE_CUES) ? undefined : profile.designStyle,
    personality: hasCue(lower, PERSONALITY_CUES) ? undefined : profile.personality,
    tone: hasCue(lower, TONE_CUES) ? undefined : profile.tone,
    palette,
    brandName,
    // Explicit user copy wins; otherwise the synthesised niche copy fills in.
    heroHeadline: explicit?.heroHeadline || synth.heroHeadline,
    heroSub: explicit?.heroSub || synth.heroSub,
    tagline: explicit?.tagline || synth.tagline,
    heroTag: explicit?.heroTag,
    // Explicit button text wins; otherwise the niche profile's own CTA labels
    // drive the hero buttons so they read correctly for the trade (a florist
    // says "Shop Bouquets", a law firm "Request a Consultation").
    primaryCta: explicit?.primaryCta || profile.cta,
    secondaryCta: explicit?.secondaryCta || profile.ctaSecondary,
    about: synth.about,
    sections: explicit?.sections,
    products,
    faqs: profile.faqs,
  };
  return content;
}
