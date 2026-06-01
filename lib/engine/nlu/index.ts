// ---------------------------------------------------------------------------
// IN-HOUSE NLU ENGINE
//
// A purpose-built natural-language understanding engine that runs IN-PROCESS,
// in the SAME system as the website generator — no Claude, no OpenAI, no
// network of any kind.
//
// What it does:
//   1. Tokenise the prompt and detect the niche (for design tokens only)
//   2. Extract EXACTLY what the user stated: brand name, explicit copy (hero/
//      CTA/sections), listed products/services, colours
//   3. Extract semantic content: primary activity, audience, differentiator
//   4. Infer products/services from the extracted activity when none listed
//
// What it does NOT do:
//   Pull copy from a stored niche profile. Every word in the hero headline,
//   sub-text, and about copy comes from what the user actually wrote — fed into
//   structural interpolation templates in buildSiteCopy (html-renderer.ts).
//   The NLU's job is extraction, not template selection.
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
  // Semantic content extracted from the prompt — fed into dynamic copy synthesis
  audience?: string;        // "youth athletes", "couples", "small businesses"
  differentiator?: string;  // "handmade", "award-winning", "certified", "luxury"
  activityKeywords?: string[]; // content-rich keywords stripped of style/meta words
  // Enrichment signals — elevate copy to feel hand-written for this exact business
  credentialSignals?: string[];  // "award-winning", "5-star rated", "est. 1995"
  location?: string;             // city or area: "Manila", "Los Angeles"
  brandVoice?: { register: 'formal' | 'casual' | 'energetic' | 'luxe' | 'technical'; usesExclamations: boolean };
}

// ── Small deterministic helpers ─────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pick<T>(arr: T[], seed: number): T {
  const i = ((Math.trunc(seed) % arr.length) + arr.length) % arr.length;
  return arr[i];
}
function titleCase(s: string): string {
  return s.replace(/\w[\w''-]*/g, w =>
    /^(and|or|the|of|a|an|to|in|on|with|for)$/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).replace(/^\w/, c => c.toUpperCase());
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','for','with','that','this','of','to','in','on','at','by','from',
  'is','are','be','our','your','their','we','i','you','it','website','site','page','build','create',
  'make','want','need','please','would','like','should','can','will','about','section','sections',
  'business','company','brand','called','named','using','use','should','have','has','include','includes',
]);

// Style/meta words that describe HOW a site looks, not WHAT the business does.
// Filtered out so activity keywords always anchor on real subject matter.
const STYLE_META = new Set([
  'dark','light','bright','airy','warm','cold','cozy','muted','vibrant','neon','ethereal','dreamy',
  'dramatic','contrast','moody','calm','serene','intimate','atmospheric','lush','deep','pure','raw',
  'earthy','rustic','subtle','understated','timeless','minimal','minimalist','bold','elegant','clean',
  'modern','luxury','luxurious','premium','sleek','stylish','sophisticated','refined','classy','chic',
  'flat','brutalist','glassmorphism','neumorphism','cyberpunk','futuristic','retro','vintage','editorial',
  'corporate','playful','artistic','organic','industrial','vaporwave','cinematic','professional',
  'aesthetic','beautiful','stunning','gorgeous','fresh','trendy','crisp','smooth','polished','high',
  'upscale','classic','sharp','iconic','signature','curated','artisanal','bespoke','elevated','immersive',
  'great','best','good','nice','cool','awesome','simple','creative','unique','dynamic','energetic',
  'friendly','powerful','strong','exclusive','inspired','authentic','genuine','real','true','pure',
  'passionate','dedicated','committed','website','site','page','pages','landing','homepage','layout',
  'design','designs','style','styles','theme','color','colors','colour','font','fonts','typography',
  'build','create','make','generate','want','need','please','with','that','this','for','the','and',
  'have','has','look','feel','vibe','using','about','scheme','palette','brand','branding','visual',
]);

// ── Niche detection ─────────────────────────────────────────────────────────
function detectNiche(lower: string): { slug: string; broad: string } {
  let best: { slug: string; broad: string; score: number } | null = null;
  for (const niche of NICHES) {
    let score = 0;
    for (const t of niche.triggers) {
      const re = new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');
      if (re.test(lower)) score += t.includes(' ') ? 3 : 2;
    }
    if (niche.specific) score *= 1.5;
    if (score > 0 && (!best || score > best.score)) best = { slug: niche.slug, broad: niche.broad, score };
  }
  return best ? { slug: best.slug, broad: best.broad } : { slug: 'general', broad: 'general' };
}

// ── Colour extraction ───────────────────────────────────────────────────────
const AMBIGUOUS_COLORS = new Set([
  'coffee','espresso','mocha','caramel','chocolate','cream','mint','sage','olive','wine','salmon','peach','forest',
]);

function extractColors(text: string, lower: string, profile: NicheCopyProfile): NluContent['palette'] | undefined {
  const found: string[] = [];
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(text)) !== null) {
    let hex = m[0].toLowerCase();
    if (hex.length === 4) hex = '#' + hex.slice(1).split('').map(c => c + c).join('');
    if (!found.includes(hex)) found.push(hex);
  }
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
  if (/\b(dark|night|black|moody|midnight)\b/.test(lower)) palette.background = '#0a0a0c';
  else if (/\b(light|bright|white|airy|clean)\b/.test(lower)) palette.background = '#f8fafc';
  else if (profile.palette) palette.background = profile.palette.background;
  return palette;
}

// ── Brand-name extraction ───────────────────────────────────────────────────
const SKIP_BRAND_FIRST = new Set([
  "My","Our","Your","The","An","A","This","That","Their",
  "New","Best","Good","Top","Big","Small","Great","Just",
  "Build","Create","Make","Design","Develop","Launch","Start",
]);

function extractBrandName(text: string): string | undefined {
  const patterns = [
    /\b(?:called|named|brand(?:\s+name)?(?:\s+is)?|business(?:\s+name)?(?:\s+is)?|shop(?:\s+called)?|store(?:\s+called)?)\s+[""']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    /\b(?:for(?:\s+a|\s+my|\s+our)?)\s+(?:coffee shop|cafe|restaurant|brand|business|company|store|shop|studio|agency|firm)\s+(?:called|named)\s+[""']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    /\bfor\s+([A-Z][A-Za-z&''.-]{1,}(?:\s+[A-Z][A-Za-z&''.-]+){0,4})(?=\s|[,.!?\n]|$)/,
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

// ── Audience extraction ─────────────────────────────────────────────────────
// Pulls "for [audience]" and "serving [audience]" phrases. Skips matches that are
// proper nouns / brand names (checked via capitalisation in the original text).
function extractAudience(text: string, lower: string): string | undefined {
  // Try every "for X" occurrence, not just the first — the brand name comes before
  // the target audience in "for [Brand], a studio for [audience]" patterns.
  // Capture "for X" — stop at: period/comma, clause starters, "in/at/from" prepositions
  const re = /\bfor\s+(?:a\s+|the\s+|all\s+|busy\s+|young\s+|local\s+)?([a-z][a-z\s-]{2,30}?)(?:\s*[.,!?]|$|\s+who\b|\s+that\b|\s+looking\b|\s+wanting\b|\s+in\b|\s+at\b|\s+from\b)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const raw = m[1].trim().replace(/\s+/g, ' ');
    if (/\b(shop|store|studio|cafe|website|site|business|company|brand|platform|agency|firm|ramen|coffee|salon|spa|gym|restaurant|bar|bakery)\b/i.test(raw)) continue;
    if (raw.split(' ').length > 4) continue;
    // If every word of the match is capitalized in the ORIGINAL text, it's a proper noun (brand name).
    const lowerRaw = raw;
    const origIdx = text.toLowerCase().indexOf(lowerRaw, m.index);
    if (origIdx >= 0) {
      const origPhrase = text.slice(origIdx, origIdx + lowerRaw.length);
      const words = origPhrase.split(/\s+/).filter(Boolean);
      if (words.length > 0 && words.every(w => /^[A-Z]/.test(w))) continue;
    }
    return raw;
  }
  // "serving [lowercase audience]" — e.g. "serving small businesses", "serving homeowners"
  // Only match lowercase starts (cities are capitalized, audiences are not).
  const servM = lower.match(/\bserving\s+([a-z][a-z\s-]{2,25}?)(?:\s*[.,!?]|$|\s+(?:in|across|throughout|near|around|the|since|and|area|metro|region)\b)/);
  if (servM) {
    const raw = servM[1].trim();
    if (!/\b(area|metro|region|location|city|town|district|village|street|road|avenue|makati|manila|bgc|cebu)\b/i.test(raw) && raw.split(' ').length <= 4)
      return raw;
  }
  return undefined;
}

// ── Differentiator extraction ───────────────────────────────────────────────
// Pulls the strongest qualifier that distinguishes the business — used in hero
// copy to produce "Handmade Candles Worth Keeping" vs. "Award-Winning Cuisine".
const DIFFERENTIATORS: string[] = [
  'handmade','hand-made','handcrafted','hand-crafted','artisanal','artisan','small-batch','small batch',
  'award-winning','award winning','multi-award','prize-winning','five-star','5-star','highly-rated','top-rated','top rated',
  'certified','licensed','accredited','registered','qualified','insured','bonded',
  'family-owned','family owned','family-run','women-owned','female-owned','veteran-owned','minority-owned','locally-owned','locally owned','independent','independently-owned',
  'organic','sustainable','eco-friendly','eco-conscious','ethically sourced','locally sourced','farm-to-table','cruelty-free','vegan','plant-based','gluten-free','non-toxic','all-natural','plastic-free','zero-waste','carbon-neutral',
  'bespoke','custom','personalised','personalized','made-to-order','made to order','handpicked','hand-picked','curated',
  'luxury','ultra-luxury','fine','premier','premium','high-end','exclusive',
  'fast','same-day','24-hour','24 hour','round-the-clock','instant','rapid','on-demand','mobile',
  'affordable','budget-friendly','no-contract','money-back','satisfaction-guaranteed',
  'boutique','specialist','expert','master','professional','trusted','reliable','experienced','veteran',
];

function extractDifferentiator(lower: string): string | undefined {
  return DIFFERENTIATORS.find(d => lower.includes(d));
}

// ── Credential signal extraction ──────────────────────────────────────────────
// Pulls social-proof and trust signals from the prompt so the renderer can
// surface them in hero tags and about text.
const CREDENTIAL_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: 'award-winning',         re: /\baward[\s-]winning\b/i },
  { label: 'multi-award-winning',   re: /\bmulti[\s-]award\b/i },
  { label: '5-star rated',          re: /\b(5[\s-]star|five[\s-]star)\b/i },
  { label: 'highly rated',          re: /\b(highly[\s-]rated|top[\s-]rated)\b/i },
  { label: 'nationally recognised', re: /\b(nationally|internationally)[\s-](recognised|recognized|known|acclaimed)\b/i },
  { label: 'featured in the press', re: /\b(featured in|as seen in|as seen on)\b/i },
  { label: 'family-owned',          re: /\bfamily[\s-](owned|run|operated)\b/i },
  { label: 'locally-owned',         re: /\blocally[\s-](owned|run|operated)\b/i },
  { label: 'licensed & insured',    re: /\b(licensed\b[^.]*\binsured|bonded)\b/i },
  { label: 'veteran-owned',         re: /\bveteran[\s-](owned|run|operated)\b/i },
  { label: 'women-owned',           re: /\b(women|female|woman)[\s-](owned|run|led)\b/i },
  { label: 'minority-owned',        re: /\bminority[\s-](owned|run)\b/i },
];

function extractCredentialSignals(lower: string): string[] {
  const signals = CREDENTIAL_PATTERNS
    .filter(({ re }) => re.test(lower))
    .map(({ label }) => label);
  const yearM = lower.match(/\b(?:est\.?|established|founded|since|operating since)\s+(19\d{2}|20[0-2]\d)\b/i);
  if (yearM) signals.unshift(`est. ${yearM[1]}`);
  return signals.slice(0, 4);
}

// ── Location extraction ────────────────────────────────────────────────────────────
// Pulls a city/area when the user says "serving X", "based in X", or "located in X".
function extractLocation(text: string, lower: string): string | undefined {
  const patterns: RegExp[] = [
    /\bserving\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)(?:\s+area|\s+metro|\s+region|\s+homeowners?|\s+residents?|\s+drivers?|\s+customers?|\s*[,.]|\s+and|$)/,
    /\bbased in\s+([A-Z][a-zA-Z ]+?)(?:\s*[,.]|\s+and|$)/,
    /\blocated in\s+([A-Z][a-zA-Z ]+?)(?:\s*[,.]|\s+and|$)/,
    /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*[,.]\s+Philippines/,
    /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*[,.]\s+(?:USA|UK|Australia|Canada)\b/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const loc = m[1].trim().replace(/\s+/g, ' ');
      if (loc.length >= 3 && loc.length <= 35 &&
          !/\b(website|site|shop|store|business|brand|studio)\b/i.test(loc)) return loc;
    }
  }
  return undefined;
}

// ── Brand voice detection ────────────────────────────────────────────────────────
// Reads HOW the user wrote their prompt to infer the register they want, so
// copy adapts: "energetic" for all-caps/exclamations, "luxe" for premium vocabulary,
// "technical" for API/SaaS language, "formal" for long complex sentences.
function detectBrandVoice(text: string): NluContent['brandVoice'] {
  const exclamations = (text.match(/!/g) || []).length;
  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 4);
  const avgLen = sentences.length ? words / sentences.length : 10;
  const hasAllCaps = /\b[A-Z]{4,}\b/.test(text);
  const hasLuxeWords = /\b(luxury|luxurious|bespoke|exclusive|premium|curated|elevated|refined|distinguished)\b/i.test(text);
  const hasTechWords = /\b(api|saas|dashboard|automation|workflow|analytics|infrastructure|kubernetes)\b/i.test(text);
  let register: NonNullable<NluContent['brandVoice']>['register'];
  if (hasLuxeWords) register = 'luxe';
  else if (hasTechWords) register = 'technical';
  else if (exclamations >= 2 || hasAllCaps) register = 'energetic';
  else if (avgLen >= 18) register = 'formal';
  else register = 'casual';
  return { register, usesExclamations: exclamations >= 1 };
}

// Niche-driven implicit sections — high-confidence affordances every site in
// this niche benefits from, even if the user did not explicitly request them.
const NICHE_IMPLICIT_SECTIONS: Record<string, string[]> = {
  food:         ['Location'],
  homeservices: ['Location'],
  automotive:   ['Location'],
  wellness:     ['Pricing'],
  photography:  ['Gallery'],
  hospitality:  ['Gallery'],
};

// ── Activity keywords ────────────────────────────────────────────────────────
// Content-rich keywords extracted from the prompt with style/meta words removed.
// These drive the dynamic copy templates in buildSiteCopy so "basketball coaching"
// produces "Basketball at Its Best" rather than a generic "Sports at Full Speed".
function extractActivityKeywords(lower: string): string[] {
  const words = lower.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (w.length < 3 || STOPWORDS.has(w) || STYLE_META.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);
}

// ── Product / service list extraction ───────────────────────────────────────
const LIST_CUES = [
  'serve','serving','offer','offering','sell','selling','specialize in','specialise in',
  'menu','products','product','drinks','dishes','items','services','such as','including',
  'include','like','feature','featuring',
];

const FILLER_FIRST = new Set([
  'such','including','like','and','or','but','also','plus','featuring',
]);

function splitList(clause: string): string[] {
  const cleaned = clause.replace(/^[\s:;,–—-]+/, '');
  const parts = cleaned
    .split(/\s*,\s*|\s+and\s+|\s*&\s*|\s*\/\s*/i)
    .map(s => s.trim())
    .filter(Boolean);
  const items: string[] = [];
  for (let p of parts) {
    if (/\b(with|for|that|which|to|so|because|please|on|in|at)\b/i.test(p) && p.split(/\s+/).length > 4) break;
    p = p.replace(/^[""'']+|[""''.]+$/g, '').trim();
    const words = p.split(/\s+/);
    if (!p || words.length > 4) continue;
    if (p.length < 2 || p.length > 40) continue;
    if (FILLER_FIRST.has(words[0].toLowerCase())) continue;
    items.push(titleCase(p));
  }
  return items;
}

function extractProducts(text: string): NluProduct[] | undefined {
  const lower = text.toLowerCase();
  let bestList: string[] | null = null;
  let suchAsList: string[] | null = null;
  for (const cue of LIST_CUES) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(cue, from);
      if (idx < 0) break;
      from = idx + cue.length;
      const tail = text.slice(idx + cue.length, idx + cue.length + 200);
      const clause = tail.split(/[.!?\n]/)[0];
      const items = splitList(clause);
      if (items.length >= 2) {
        if (cue === 'such as' || cue === 'including') {
          if (!suchAsList || items.length > suchAsList.length) suchAsList = items;
        }
        if (!bestList || items.length > bestList.length) bestList = items;
      }
    }
  }
  const finalList = suchAsList && suchAsList.length >= (bestList?.length ?? 0) ? suchAsList : bestList;
  if (!finalList) return undefined;
  return finalList.slice(0, 8).map(name => ({ name }));
}

// ── Product inference from activity keywords ─────────────────────────────────
// When the user listed no products/services and the profile has no authored
// bank for this niche, infer plausible offerings from the activity keywords.
// Every generated item name uses the actual trade words from the prompt.
function inferProductsFromActivity(
  actKws: string[],
  industry: string,
  isProductBusiness: boolean,
): NluProduct[] {
  const act = actKws[0] || industry;
  const spec = actKws[1] || '';
  const actT = titleCase(act);
  const specT = spec ? titleCase(spec) : '';

  if (isProductBusiness) {
    return [
      { name: `${actT} Collection`, desc: `Our curated range of ${act} — crafted to the highest standard.` },
      { name: `Best Sellers`, desc: `The ${act} our customers reach for again and again.` },
      { name: `${specT ? specT + ' ' : ''}${actT}s`, desc: `${specT ? titleCase(specT) + ' ' : ''}${act} made with care, built to last.` },
      { name: `Gift Sets`, desc: `Beautifully packaged ${act} sets — ready to give.` },
    ];
  }
  return [
    { name: `Free Consultation`, desc: `An initial session to understand your goals and plan the right approach.` },
    { name: `${actT}${specT ? ' ' + specT : ''} Sessions`, desc: `Core ${act} sessions delivered with expertise and genuine care.` },
    { name: `Custom ${actT} Program`, desc: `A tailored plan built around your specific timeline and requirements.` },
    { name: `${actT} Membership`, desc: `Regular sessions, priority booking, and member-only benefits.` },
  ];
}

// ── Functional-intent detection ──────────────────────────────────────────────
// Reads the prompt for FUNCTIONAL requirements the user asked for — booking,
// online ordering, a map/location block, a newsletter signup, a blog, events,
// pricing, a gallery, etc. — and returns canonical section labels. These are
// merged into `sections` so the renderer includes the matching UI affordance
// (form, map block, signup, listing) rather than a fixed page skeleton.
//
// Honest scope: this surfaces the right front-end SECTION/affordance for each
// intent (e.g. a booking form, a location/map block, a newsletter signup form).
// It does not stand up live backends (real payments, real auth) — the output is
// a self-contained static site, so these render as functional UI, not services.
const FUNCTIONAL_INTENTS: Array<{ label: string; re: RegExp }> = [
  { label: 'Booking',       re: /\b(book(ing)?|appointment|schedul(e|ing)|reserve a (slot|spot|session|class)|make an appointment|online booking|book online|request a (quote|consultation|callback)|consultation request)\b/ },
  { label: 'Reservations',  re: /\b(reservation|reserve a table|table booking|book a table)\b/ },
  { label: 'Ordering',      re: /\b(online order(ing)?|order online|order ahead|takeout|take-out|takeaway|delivery|add to cart|checkout|shopping cart)\b/ },
  { label: 'Newsletter',    re: /\b(newsletter|subscribe|mailing list|email (signup|sign-up|list)|sign up for|join our list)\b/ },
  { label: 'Blog',          re: /\b(blog|articles?|news section|insights|journal|stories section)\b/ },
  { label: 'Events',        re: /\b(events?|calendar|upcoming events|event listing|classes schedule|class timetable|workshops?)\b/ },
  { label: 'Location',      re: /\b(map|location|directions|find us|visit us|address|store locator|where to find|opening hours|hours of operation)\b/ },
  { label: 'Gallery',       re: /\b(gallery|photo gallery|lookbook|portfolio gallery|image gallery|showcase)\b/ },
  { label: 'Pricing',       re: /\b(pricing|price list|plans|packages|tiers|rates|membership options)\b/ },
  { label: 'Team',          re: /\b(team|our staff|meet the team|our people|coaches|trainers|practitioners)\b/ },
  { label: 'Testimonials',  re: /\b(testimonials?|reviews?|client feedback|what (clients|customers|people) say)\b/ },
  { label: 'FAQ',           re: /\b(faqs?|frequently asked|questions section|help section)\b/ },
  { label: 'Contact',       re: /\b(contact form|contact us|get in touch|enquiry form|inquiry form|message us)\b/ },
];

function extractFunctionalIntents(lower: string): string[] {
  const out: string[] = [];
  for (const { label, re } of FUNCTIONAL_INTENTS) {
    if (re.test(lower) && !out.includes(label)) out.push(label);
  }
  return out;
}

// Merge explicitly-listed sections with detected functional intents, preserving
// the user's order first and de-duplicating case-insensitively.
function mergeSections(explicit: string[] | undefined, intents: string[]): string[] | undefined {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const s of [...(explicit || []), ...intents]) {
    const key = s.toLowerCase();
    if (!seen.has(key)) { seen.add(key); merged.push(s); }
  }
  return merged.length ? merged : undefined;
}

// ── Design cue detection ─────────────────────────────────────────────────────
const MOOD_CUES = ['dark','light','bright','vibrant','muted','soft','warm','cold','cool','dramatic','moody','ethereal','contrast','grounded','neutral','airy','cozy','serene','calm','energetic','bold','pastel','earthy','rustic','clean','crisp','dreamy','atmospheric'];
const STYLE_CUES = ['minimal','minimalist','brutalist','glassmorphism','glass','neumorphism','flat','material','cyberpunk','futuristic','retro','vintage','vaporwave','editorial','corporate','playful','artistic','organic','industrial','luxury','luxurious','premium','startup','enterprise','cinematic','high-tech','modern','clean','elegant','sleek','geometric','handdrawn','hand-drawn','grunge','y2k','art deco','art-deco','swiss','maximalist','monochrome','gradient','neon','typographic'];
const PERSONALITY_CUES = ['bold','elegant','aggressive','friendly','authoritative','whimsical','serious','approachable','exclusive','energetic','calm','rebellious','sophisticated','youthful','trustworthy','innovative','timeless','experimental','professional','fun','quirky','playful','confident','warm','edgy','refined','daring','wholesome','premium'];
const TONE_CUES = ['professional','casual','formal','playful','technical','luxury','accessible','disruptive','authoritative','empathetic','aggressive','conservative','witty','inspirational','reassuring','bold','friendly','warm','direct','no-nonsense'];

function hasCue(lower: string, cues: string[]): boolean {
  return cues.some(c => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`, 'i').test(lower));
}

// ── Product enrichment ───────────────────────────────────────────────────────
function enrichProducts(named: NluProduct[], profile: NicheCopyProfile): NluProduct[] {
  return named.map(p => {
    if (p.desc && p.price) return p;
    const match = profile.products.find(bp => bp.name.toLowerCase() === p.name.toLowerCase());
    if (match) return { name: p.name, desc: p.desc || match.desc, price: p.price || match.price };
    return p;
  });
}

// Product-oriented niches infer product cards; all others infer service cards.
const PRODUCT_INDUSTRIES = new Set([
  'ecommerce','fashion','florist','craft','jewelry','home','pet','beauty','retail','shop','store',
  'dessert','juicebar','bakery','coffee',
]);

// ── Main entry point ─────────────────────────────────────────────────────────
/**
 * Read a prompt and produce a structured, in-house understanding. Always returns
 * content — there is no network path and no failure mode that yields null.
 *
 * Design principle: the NLU is an EXTRACTOR, not a copy writer. It reads the
 * prompt and surfaces what is there — brand name, explicit copy, listed
 * products, semantic qualifiers (audience, differentiator). ALL prose copy
 * (heroHeadline, heroSub, about) is generated downstream in buildSiteCopy
 * from the extracted keywords and semantic context, so every site's copy is
 * unique to the prompt rather than pulled from a stored template pool.
 */
export function understandPrompt(prompt: string): NluContent {
  const text = (prompt || '').replace(/[""„‟″]/g, '"').replace(/[''‚‛′]/g, "'");
  const lower = text.toLowerCase();
  const seed = hash(lower);

  const { slug, broad } = detectNiche(lower);
  const profile = profileFor(slug, broad);

  const explicit = extractPromptCopy(prompt);
  const brandName = extractBrandName(text);
  const explicitPalette = extractColors(text, lower, profile);
  const palette = explicitPalette || (hasCue(lower, MOOD_CUES) ? undefined : profile.palette);

  // Semantic extraction — drives the DYNAMIC copy generator in buildSiteCopy
  const audience = extractAudience(text, lower);
  const differentiator = extractDifferentiator(lower);
  const activityKeywords = extractActivityKeywords(lower);
  const functionalIntents = extractFunctionalIntents(lower);
  // Enrichment signals — elevate copy quality and uniqueness per prompt
  const credentialSignals = extractCredentialSignals(lower);
  const location = extractLocation(text, lower);
  const brandVoice = detectBrandVoice(text);
  const implicit = NICHE_IMPLICIT_SECTIONS[slug] || NICHE_IMPLICIT_SECTIONS[broad] || [];

  // Keywords for the prompt-engine parser (all content words, slightly broader set)
  const keywords = activityKeywords;

  // Products: explicit user list → enriched from profile → inferred from activity
  const namedProducts = extractProducts(text);
  let products: NluProduct[] | undefined;
  if (namedProducts && namedProducts.length) {
    products = enrichProducts(namedProducts, profile);
  } else if (profile.products.length) {
    products = profile.products;
  } else {
    products = inferProductsFromActivity(activityKeywords, slug, PRODUCT_INDUSTRIES.has(slug));
  }

  const content: NluContent = {
    industry: slug,
    keywords,
    // Design tokens from profile (niche-appropriate defaults that the parser may
    // override when the user explicitly named a mood/style/personality/tone)
    mood:        hasCue(lower, MOOD_CUES)        ? undefined : profile.mood,
    designStyle: hasCue(lower, STYLE_CUES)       ? undefined : profile.designStyle,
    personality: hasCue(lower, PERSONALITY_CUES) ? undefined : profile.personality,
    tone:        hasCue(lower, TONE_CUES)        ? undefined : profile.tone,
    palette,
    brandName,
    // EXPLICIT user copy wins (what they actually wrote in the prompt).
    // Hero headline/sub/about are NOT synthesised here from a profile bank —
    // they are generated dynamically in buildSiteCopy from the extracted
    // keywords, audience, and differentiator below, so every site's copy is
    // unique and anchored in the real prompt content.
    heroHeadline: explicit?.heroHeadline || undefined,
    heroSub:      explicit?.heroSub      || undefined,
    tagline:      explicit?.tagline      || undefined,
    heroTag:      explicit?.heroTag      || undefined,
    primaryCta:   explicit?.primaryCta   || profile.cta,
    secondaryCta: explicit?.secondaryCta || profile.ctaSecondary,
    about:        undefined,
    // Sections the user explicitly listed PLUS functional affordances detected
    // from the prompt (booking, ordering, newsletter, map/location, blog…). The
    // renderer injects any of these the composed page doesn't already cover.
    // Sections: user-explicit → functional intents → niche implicit affordances.
    sections:     mergeSections(explicit?.sections, [...functionalIntents, ...implicit]),
    products,
    faqs:         profile.faqs,
    // Semantic qualifiers — passed to buildSiteCopy for richer dynamic copy
    audience,
    differentiator,
    activityKeywords,
    // Enrichment signals — colour copy uniqueness and credibility per-prompt
    credentialSignals: credentialSignals.length ? credentialSignals : undefined,
    location,
    brandVoice,
  };
  return content;
}
