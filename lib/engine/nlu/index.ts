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
import { parseBrief, type Brief } from '../brief/parse';
import { COLOR_HEX, NICHES, profileFor, type NicheCopyProfile } from './lexicon';
import { extractRequirements, canonicalKind, type SectionKind } from '../requirements';

export interface NluProduct { name: string; desc?: string; price?: string; _fromUser?: boolean }
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
  /** Explicit navigation the user listed, in order, with exact labels. Authoritative. */
  navItems?: string[];
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
  intentCta?: string;        // "Order Now", "Book a Table", "Shop Now" — extracted from user's action phrases
  // The user's actual descriptive sentences about their business — used directly
  // as heroSub and aboutBody copy so their words appear on the site, verbatim.
  sellingPoints?: string[];
  missionStatement?: string; // "our mission is to...", "we exist to...", "we believe..."
  operatingHours?: string;  // "Monday to Saturday 9am–8pm", "Open daily 10am–9pm"
  phone?: string;           // "+63 917 123 4567", "0917-123-4567"
  startingPrice?: string;   // "₱2,500", "$99", "from $49" — lowest price mentioned
  // Canonical section kinds the user EXPLICITLY forbade ("do not include X").
  // The renderer drops any matching section and the fidelity gate verifies absence.
  excludedSections?: string[];
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
  'passionate','dedicated','committed','website','site','page','pages','webpage','landing','homepage','layout',
  'design','designs','style','styles','theme','color','colors','colour','font','fonts','typography',
  'build','create','make','generate','want','need','please','with','that','this','for','the','and',
  'have','has','look','feel','vibe','using','about','scheme','palette','brand','branding','visual',
  // Deliverable / role meta-words — the artifact or job title, not the business.
  'portfolio','freelance','freelancer','freelancing','resume',
  // Design / UI vocabulary — describes the site's appearance, never its content.
  'mobile','desktop','tablet','responsive','card','cards','ui','interface','shadow','shadows',
  'border','borders','rounded','scrolling','scroll','hover','animation','animations','transition',
  'transitions','accent','accents','soft','subtle','smooth','spacing','whitespace','grid','rgb',
  'inspired','similar','trustworthy','professional','section','sections','page','pages',
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
    // "called / named [Brand]" — most explicit
    /\b(?:called|named|brand(?:\s+name)?(?:\s+is)?|business(?:\s+name)?(?:\s+is)?|shop(?:\s+called)?|store(?:\s+called)?)\s+[""']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    // "for a coffee shop called [Brand]"
    /\b(?:for(?:\s+a|\s+my|\s+our)?)\s+(?:coffee shop|cafe|restaurant|brand|business|company|store|shop|studio|agency|firm)\s+(?:called|named)\s+[""']?([A-Z][\w&''.-]*(?:\s+[A-Z][\w&''.-]*){0,4})/,
    // "for [Brand]" — common shorthand
    /\bfor\s+([A-Z][A-Za-z&''.-]{1,}(?:\s+[A-Z][A-Za-z&''.-]+){0,4})(?=\s|[,.!?\n]|$)/,
    // "[Brand] is a..." or "[Brand] — "
    /^([A-Z][A-Za-z&''.-]{1,}(?:\s+[A-Z][A-Za-z&''.-]+){0,3})\s+(?:is\s+a|is\s+an|—|–|-)\s+/m,
    // "[Brand]. We/Our/I..." — opening-line business introduction
    /^([A-Z][A-Za-z0-9&''.-]+(?:\s+[A-Z][A-Za-z0-9&''.-]+){0,3})\.\s+(?:We\s|Our\s|I\s)/m,
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
// Words that are services/actions/logistics — NOT audience descriptors.
// "Order now for delivery" → "delivery" is NOT an audience.
const AUDIENCE_STOP = new Set([
  'delivery','pickup','takeout','takeaway','dine-in','dinein','catering','online','offline',
  'sale','hire','rent','lease','free','discount','order','booking','reservation','consultation',
  'now','today','here','me','us','you','everyone','anyone','all',
  'business','businesses','work','life','home','homes',
]);
function extractAudience(text: string, lower: string): string | undefined {
  // Try every "for X" occurrence, not just the first — the brand name comes before
  // the target audience in "for [Brand], a studio for [audience]" patterns.
  // Capture "for X" — stop at: period/comma, clause starters, "in/at/from" prepositions
  const re = /\bfor\s+(?:a\s+|the\s+|all\s+|busy\s+|young\s+|local\s+)?([a-z][a-z\s-]{2,30}?)(?:\s*[.,!?]|$|\s+who\b|\s+that\b|\s+looking\b|\s+wanting\b|\s+in\b|\s+at\b|\s+from\b)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    const raw = m[1].trim().replace(/\s+/g, ' ');
    // "[deliverable] for X" → X is who the SITE is for (the owner/business), not a
    // target audience. "a portfolio website for a freelance manager" must not make
    // "freelance manager" the audience.
    const before = lower.slice(Math.max(0, m.index - 24), m.index);
    if (/\b(?:web\s*site|website|web\s*page|webpage|site|page|portfolio|landing\s*page|home\s*page)\s*$/.test(before)) continue;
    // The business's own role/title is not an audience.
    if (/\b(freelance|freelancer|manager|specialist|consultant|owner|founder|agency|studio|practitioner)\b/.test(raw)) continue;
    if (/\b(shop|store|studio|cafe|website|site|business|company|brand|platform|agency|firm|ramen|coffee|salon|spa|gym|restaurant|bar|bakery)\b/i.test(raw)) continue;
    if (raw.split(' ').length > 4) continue;
    // Reject service/logistics/action words masquerading as audience
    if (AUDIENCE_STOP.has(raw.split(' ')[0]) || AUDIENCE_STOP.has(raw)) continue;
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
  for (const d of DIFFERENTIATORS) {
    if (!lower.includes(d)) continue;
    // Guard the design-ambiguous "mobile": "mobile-first / mobile-friendly /
    // mobile design" is a responsiveness spec, NOT a business differentiator —
    // unless the prompt clearly means a mobile (on-location) SERVICE.
    if (d === 'mobile'
      && /\bmobile[\s-](?:first|friendly|responsive|design|app|site|optimi[sz]ed|view|layout|version)\b/.test(lower)
      && !/\bmobile\s+(?:service|business|barber|salon|detailing|grooming|mechanic|vet|clinic|bar|cafe|coffee|spa|massage|pet|car\s*wash|notary|repair)\b/.test(lower)) {
      continue;
    }
    return d;
  }
  return undefined;
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
// Pulls a city/area when the user says "serving X", "based in X", "located in X",
// or uses a brand-context phrase like "called [Brand] in [City]".
function extractLocation(text: string, lower: string): string | undefined {
  const patterns: RegExp[] = [
    /\bserving\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)(?:\s+area|\s+metro|\s+region|\s+homeowners?|\s+residents?|\s+drivers?|\s+customers?|\s*[,.]|\s+and|$)/,
    /\bbased in\s+([A-Z][a-zA-Z ]+?)(?:\s*[,.]|\s+and|$)/,
    /\blocated in\s+([A-Z][a-zA-Z ]+?)(?:\s*[,.]|\s+and|$)/,
    /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*[,.]\s+Philippines/,
    /\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s*[,.]\s+(?:USA|UK|Australia|Canada)\b/,
    // "called/named [Brand] in [City]" — brand-context location
    /\b(?:called|named)\s+[A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,3}\s+in\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/,
    // "I run/own/have a ... in [City]"
    /\bI\s+(?:run|own|have|operate|am\s+running|am\s+opening)\s+[^.!?\n]{0,60}\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/,
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

// ── Operating hours extraction ───────────────────────────────────────────────────
// Extracts schedule info like "Open Monday to Saturday 9am-8pm" or "Mon–Fri 9am–5pm".
function extractOperatingHours(text: string): string | undefined {
  // Match a time range like "9am-8pm", "9:00am–10pm", "9 AM to 9 PM"
  const TIME_PAIR = /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:-|–|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i;
  const tm = TIME_PAIR.exec(text);
  if (!tm) return undefined;
  const timePart = tm[0].trim();
  // Look at the text before the time match for day/open context
  const before = text.slice(Math.max(0, tm.index - 80), tm.index);
  const afterOpen = before.replace(/^[\s\S]*\bopen\b\s*/i, '').trim();
  if (afterOpen && /\bopen\b/i.test(before)) {
    return `${afterOpen} ${timePart}`.replace(/\s+/g, ' ').trim();
  }
  // Day range without "Open": "Monday to Saturday 9am-8pm"
  const DAY_RE = /\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:to|[-–])\s*(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
  const dm = DAY_RE.exec(before);
  if (dm) return `${dm[1]} to ${dm[2]} ${timePart}`.replace(/\s+/g, ' ').trim();
  return undefined;
}

// ── Phone number extraction ──────────────────────────────────────────────────────
// Extracts Philippine-format or international phone numbers from the prompt.
function extractPhone(text: string): string | undefined {
  // Philippine: 09XX XXX XXXX or +63 9XX XXX XXXX (with any separators)
  const PH_RE = /(?:\+63|0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/;
  // International: +X XXX XXX XXXX
  const INTL_RE = /\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{4}/;
  // US/local: (XXX) XXX-XXXX or XXX-XXX-XXXX (7+ consecutive digits)
  const US_RE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/;
  const m = PH_RE.exec(text) || INTL_RE.exec(text) || US_RE.exec(text);
  return m ? m[0].trim() : undefined;
}

// ── Starting price extraction ────────────────────────────────────────────────────
// Pulls the lowest / starting price mentioned, for display in product cards and hero.
function extractStartingPrice(text: string): string | undefined {
  // "starting at ₱2,500" | "from $99" | "prices from £50" | "₱500 per session"
  const STARTING_RE = /\b(?:starting\s+(?:at|from)|from\s+(?:just\s+)?|priced\s+(?:at|from)|prices?\s+(?:from|starting))\s*([$€£₱¥₩]\s*[\d,]+(?:\.\d{1,2})?)/i;
  const m = STARTING_RE.exec(text);
  if (m) return m[1].replace(/\s+/g, '').trim();
  // Standalone price with currency symbol, only if preceded by list context
  const PRICE_RE = /([$€£₱¥₩])\s*([\d,]+(?:\.\d{1,2})?)/;
  const pm = PRICE_RE.exec(text);
  return pm ? `${pm[1]}${pm[2]}` : undefined;
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
  // Catalog/category enumerations common in e-commerce briefs.
  'categories','category','collections','collection','catalog','catalogue','shop',
];

const FILLER_FIRST = new Set([
  'such','including','like','and','or','but','also','plus','featuring',
]);

// A list item that begins with a builder/imperative verb is an instruction
// ("use a dark theme", "add a button"), not a product — never catalog it.
const ITEM_VERB_FIRST = new Set([
  'use','add','include','make','create','build','set','put','place',
  'design','remove','exclude','omit','show','display','want','need','have',
]);
// A list item naming a page-structure element is chrome, not a product.
const NON_PRODUCT_ITEM_RE = /\b(?:sections?|pages?|buttons?|ctas?|call to action|navbar|nav|navigation|footer|header|hero|headlines?|taglines?|layout|theme|palette)\b/i;

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
    if (ITEM_VERB_FIRST.has(words[0].toLowerCase())) continue;   // builder directive, not a product
    if (NON_PRODUCT_ITEM_RE.test(p)) continue;                   // page-structure noun, not a product
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
  // Extract inline price if embedded in the item name, e.g. "Massage (₱2,500)"
  const INLINE_PRICE = /([$€£₱¥₩]\s*[\d,]+(?:\.\d{1,2})?|\d+\s*[$€£₱¥])\s*(?:each|per\s+\w+|\/\w+)?/;
  return finalList.slice(0, 8).map(name => {
    const pm = INLINE_PRICE.exec(name);
    if (pm) return { name: name.replace(pm[0], '').replace(/[\s()[\]-]+$/, '').trim(), price: pm[1].replace(/\s+/g, '').trim() };
    return { name };
  });
}

// ── Bullet-list product extraction ───────────────────────────────────────────────
// Users frequently enumerate their catalog as a Requirements bullet list of
// product CATEGORIES ("- Jersey collections", "- Basketball shoes catalog",
// "- Limited edition products") rather than a prose "we sell X, Y, Z" sentence.
// Pull those category phrases so the product grid shows the user's real catalog
// instead of a generic niche-profile fallback. Only lines that read as products
// (per the canonical-kind map) are taken — gallery/newsletter/contact bullets are
// not products. "Do not" lines are skipped.
const PRODUCT_TAIL = /\b(catalog|catalogue|section|page|program|programme|lineup|line\s*up|range|store|shop)\b\s*$/i;
function extractBulletProducts(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\n+|(?<=[.!?])\s+/).map(l => l.trim());
  for (const line of lines) {
    if (/\b(do not|don't|dont|without|exclude|no\s+\w+\s+section)\b/i.test(line)) continue;
    const phrase = line.replace(/^[-*•·\d.)\s]+/, '').trim();
    if (!phrase || phrase.length < 3 || phrase.length > 48) continue;
    // Skip directive / spec / label lines that merely MENTION products
    // ("Buttons: Shop Shoes…", "Categories:", "Product cards should include…",
    // "Add to Cart button", "Available sizes"). These are instructions, not items.
    if (/^(?:buttons?|categor(?:y|ies)|display|each|product\s+cards?|form|fields?|sizes?|available|price|rating|add\s+to\s+cart|quick\s+view|product\s+(?:image|name|description)|include|create|generate)\b/i.test(phrase)) continue;
    if (/\b(?:add to cart|quick view|button|should include|product image|product name)\b/i.test(phrase)) continue;
    if (canonicalKind(phrase) !== 'products') continue;
    // Strip trailing meta nouns so "Basketball shoes catalog" → "Basketball Shoes".
    const cleaned = phrase.replace(PRODUCT_TAIL, '').replace(/\bproducts?\b\s*$/i, '').trim();
    const name = titleCase(cleaned || phrase);
    const key = name.toLowerCase();
    if (name.length >= 3 && !seen.has(key)) { seen.add(key); out.push(name); }
  }
  return out.slice(0, 8);
}

// ── Audience inference from product names ────────────────────────────────────────
// When no explicit "for [audience]" phrase exists, product names may reveal the
// target audience — e.g. "Couples Package" → audience = "couples".
const PRODUCT_AUDIENCE_WORDS = new Set([
  'couples','couple','kids','children','child','seniors','senior','women','men',
  'family','families','students','student','athletes','athlete','beginners','beginner',
  'teens','teen','adults','adult','professionals','professional','corporate','executive',
  'bridal','bride','groom','wedding','birthday','anniversary',
]);
function inferAudienceFromProducts(products: NluProduct[]): string | undefined {
  for (const p of products) {
    const words = p.name.toLowerCase().split(/\s+/);
    const match = words.find(w => PRODUCT_AUDIENCE_WORDS.has(w));
    if (match) return match === 'couple' ? 'couples' : match === 'child' ? 'children' : match === 'bridal' ? 'couples' : match === 'bride' || match === 'groom' ? 'couples' : match;
  }
  return undefined;
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

// ── Selling-points extractor ─────────────────────────────────────────────────
// Pulls the user's own descriptive sentences from the prompt verbatim.
// Three acceptance paths: (A) sentence starts with we/our/I + describes the
// business; (B) sentence contains a quality/authenticity signal word; (C)
// sentence contains one of the activity keywords. Website-building instructions
// are always excluded regardless.
const BUILD_INTENT_RE = /\b(build|create|make|design|develop|generate|launch|set\s+up)\s+(?:me\s+|us\s+)?(?:a\s+|an\s+|the\s+)?(?:website|web\s*site|web\s*page|site|page|landing\s+page|online\s+store|ecommerce|e-commerce|store)\b/i;

// Builder DIRECTIVES — instructions to the generator about the site's structure
// or chrome ("Add an Order Now button", "Include a pricing section", "Use a dark
// theme", "the headline should say X"). These describe HOW to build the page, not
// the business itself, so they must never become selling points / feature cards.
// The match requires an imperative verb AND a UI/structure noun nearby, so genuine
// business prose ("We make custom cakes") is never caught (cakes is not a UI noun).
const DIRECTIVE_RE = new RegExp(
  [
    '\\b(?:add|include|put|place|insert|use|feature|remove|exclude|omit|set\\s+up|give\\s+(?:me|us|it))\\b[^.!?]{0,40}\\b(?:buttons?|ctas?|call[- ]to[- ]actions?|links?|sections?|pages?|headlines?|sub-?head(?:line|ing)s?|taglines?|hero|nav(?:bar|igation)?|footer|colou?rs?|fonts?|theme|palette|layout)\\b',
    '\\b(?:buttons?|ctas?|headlines?|taglines?|links?|sections?)\\b[^.!?]{0,20}\\b(?:that|which)\\s+says?\\b',
    '\\b(?:buttons?|ctas?|headlines?|taglines?|sub-?head(?:line|ing)?)\\s+should\\s+(?:say|read|be)\\b',
    '\\bcall[- ]to[- ]action\\b',
  ].join('|'),
  'i',
);

// Sentences whose SUBJECT is the deliverable ("a portfolio website for…",
// "build me a landing page…") describe the SITE to build, not the business — they
// must never become a headline or feature card.
const DELIVERABLE_RE = /^(?:a|an|the|my|our|this|build|create|make|design|develop|need|want|i\s+want|i\s+need|i'd\s+like|please|looking\s+for|here\s+is)\b[^.!?]{0,50}\b(?:web\s*site|website|web\s*page|webpage|landing\s+page|one[-\s]page\s+(?:site|website)|portfolio\s+(?:site|website|page)|online\s+store|web\s*shop|home\s*page)\b/i;
// Imperative instruction openers ("Show my services", "Explain experience…",
// "Mention platforms…", "Emphasize…", "Clearly state…") are directions to the
// builder, not business copy.
const DISPLAY_DIRECTIVE_RE = /^(?:clearly\s+|please\s+|kindly\s+|also\s+)?(?:show|showcase|display|highlight|list|feature|introduce|explain|describe|mention|emphasi[sz]e|state|focus\s+on|include|add|ensure|make\s+sure|use)\b/i;

// DESIGN / VISUAL specifications describe how the SITE should LOOK, not the
// business. These are everywhere in structured briefs ("Primary colors: …",
// "Light card-based design with soft borders", "Clean typography", "Fully
// responsive", "Inspired by Facebook's UI") and must never become content. The
// design vocabulary here does not occur in genuine business descriptions.
const DESIGN_SPEC_RE = /\b(?:colou?rs?|colour|palette|hex|#[0-9a-fA-F]{3,6}\b|typograph\w*|fonts?|font-|layout|card[- ]based|cards?\b|soft\s+borders?|borders?|subtle\s+shadows?|shadows?|rounded\s+corners?|responsive|mobile[- ]first|desktop|tablet|\bUI\b|user\s+interface|aesthetics?|theme|animations?|hover|smooth\s+scroll\w*|transitions?|inspired\s+by|whitespace|spacing|grid\s+layout|wireframe|mock[- ]?up|profile\s+card|design\s+style|visual\s+style|colou?r\s+scheme|clean\s+(?:ui|interface|layout|design|typography))\b/i;

// Label/header lines from a structured brief — "Name:", "Business Name:",
// "Primary colors:", "Design Style", "Visual:", "Navigation", "Hero Section".
const META_LABEL_RE = /^\s*(?:business\s+name|name|brand(?:\s+name)?|primary\s+colou?rs?|secondary\s+colou?rs?|accent\s+colou?rs?|colou?r\s+scheme|design\s+style|design|visual(?:\s+requirements?)?|navigation|nav|hero(?:\s+section)?|footer|sub-?head(?:line|ing)?|headline|tagline|subheadline)\s*[:\-–—]/i;
// Matches sentences that start with first-person business ownership language.
// NOTE: deliberately avoids `we\s+\w` with a trailing \b (broken — `we s[erve]`
// would need \b after 's' which fails because 'e' follows). Instead, match the
// full opener and rely on word-count to filter trivially short results.
const FIRST_PERSON_START = /^(?:we\b|our\b|i\s+(?:am\b|offer\b|speciali[zs]|create\b|make\b|serve\b|sell\b|help\b|run\b|own\b|founded\b|built\b|provide\b)|i'm\s+(?:a\b|an?\s))/i;
// Quality/authenticity/action signals anywhere in the sentence.
const BUSINESS_DESC_RE = /\b(?:authentic|handmade|hand[- ]crafted|artisan|organic|fresh|local|seasonal|signature|specialty|bespoke|custom|certified|licensed|award|slow[- ]cook|from\s+scratch|offer|serve|speciali[zs]|feature|provide|craft|deliver|mission|founded|established|since\s+\d{4}|perfect\s+for|designed\s+for|tailored\s+for|ideal\s+for|known\s+for|famous\s+for)\b/i;

function extractSellingPoints(text: string, actKws: string[], brandName?: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const kwSet = new Set(actKws.map(k => k.toLowerCase()));
  const bNameLower = (brandName || '').toLowerCase();
  const STOP_WORDS = new Set(['the','a','an','and','or','but','for','with','in','on','at','to','of','is','are','was','were','be','it','its','i','we','our','this','that','these','those','which','who']);
  const points: string[] = [];

  for (const sent of sentences) {
    if (sent.length < 20) continue;
    if (BUILD_INTENT_RE.test(sent)) continue;
    if (DIRECTIVE_RE.test(sent)) continue;        // builder instruction, not a selling point
    if (DESIGN_SPEC_RE.test(sent)) continue;      // describes the site's look, not the business
    if (META_LABEL_RE.test(sent)) continue;       // "Name:", "Primary colors:", header line
    if (DELIVERABLE_RE.test(sent)) continue;      // describes the site to build, not the business
    if (DISPLAY_DIRECTIVE_RE.test(sent)) continue; // "show my services" — an instruction, not content
    // Skip bare brand-name references
    if (bNameLower && sent.toLowerCase().trim() === bNameLower) continue;
    if (bNameLower && /^(for|by|from|at)\s/i.test(sent) && sent.toLowerCase().includes(bNameLower) && sent.split(/\s+/).length <= 5) continue;
    const words = sent.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    if (words.length < 3) continue;
    const hasKw = words.some(w => kwSet.has(w));
    const isFirstPerson = FIRST_PERSON_START.test(sent) && words.length >= 3;
    const isBusinessDesc = BUSINESS_DESC_RE.test(sent);
    // Qualify using three tiers:
    //  1. First-person opener ("We serve...", "Our broth is...") — always include
    //  2. Business descriptor signal + enough words — include
    //  3. Keyword match alone — needs substantial content (≥6 words) so pure
    //     brand-name labels like "Sweet Dreams Bakery." are excluded
    if (isFirstPerson) {
      // accept
    } else if (isBusinessDesc && words.length >= 4) {
      // accept
    } else if (hasKw && words.length >= 6) {
      // accept
    } else {
      continue;
    }
    let cleaned = sent.replace(/^[-–—•·*\d.)\s]+/, '').trim();
    // Strip a leading section/label prefix ("About Me: …", "Services: …"). If what
    // follows the label is a comma list (the user enumerating items), it belongs to
    // products/features — skip it as a selling point rather than turning the whole
    // list into one garbled card title.
    const labelMatch = cleaned.match(/^(?:about(?:\s+me|\s+us)?|services?|home|contact|menu|hero|story|mission|overview|products?|portfolio|gallery|offerings?)\s*[:\-–—]\s*(.*)$/i);
    if (labelMatch) {
      const rest = labelMatch[1].trim();
      if ((rest.match(/,/g) || []).length >= 2) continue; // a list → handled as products/features
      cleaned = rest;
    }
    if (cleaned.length < 20) continue;
    if (!points.some(p => p.toLowerCase() === cleaned.toLowerCase())) points.push(cleaned);
  }
  return points.slice(0, 6);
}

// ── Intent CTA extractor ─────────────────────────────────────────────────────
// When the user writes an action phrase in their prompt ("order now", "book a
// table", "shop our collection"), extract a clean, short CTA label from it.
// This replaces the niche-template default ("View Menu", "Shop Now") so the
// hero button says what the USER actually wrote, not what we guessed.
const INTENT_CTA_PATTERNS: Array<[RegExp, string]> = [
  [/\border\s+(?:now|online|today|here)\b/i,                                               'Order Now'],
  [/\border\s+(?:for\s+)?delivery\b/i,                                                     'Order for Delivery'],
  [/\b(?:place|send)\s+(?:an?\s+)?order\b/i,                                               'Order Now'],
  [/\bbook\s+a\s+table\b/i,                                                                'Book a Table'],
  [/\breserve\s+(?:a\s+)?(?:table|spot|seat)\b/i,                                          'Reserve a Table'],
  [/\bmake\s+a\s+reservation\b/i,                                                          'Reserve a Table'],
  // "book online" / "book now" — broad booking intent without specific noun
  [/\bbook\s+(?:online|now|today|here|an?\s+appointment|with\s+us)\b/i,                   'Book Now'],
  [/\bbook\s+(?:a\s+)?(?:room|stay|appointment|session|class|slot|service)\b/i,            'Book Now'],
  [/\bshop\s+(?:now|our|the|online|collection)\b/i,                                       'Shop Now'],
  [/\bbuy\s+(?:now|online|today)\b/i,                                                      'Buy Now'],
  [/\bsign\s+up\b/i,                                                                       'Sign Up Free'],
  [/\bjoin\s+(?:us\s+)?(?:now|today)\b/i,                                                  'Join Now'],
  [/\bstart\s+(?:a\s+)?free\s+trial\b/i,                                                   'Start Free Trial'],
  [/\btry\s+(?:it\s+)?(?:for\s+)?free\b/i,                                                 'Try for Free'],
  [/\bget\s+(?:a\s+)?(?:free\s+)?quote\b/i,                                                'Get a Free Quote'],
  [/\bschedule\s+(?:a\s+)?(?:consultation|call|meeting|appointment|demo)\b/i,              'Schedule a Call'],
  [/\bdownload\s+(?:now|(?:the\s+)?app|(?:for\s+)?free)\b/i,                               'Download Now'],
  [/\bwatch\s+(?:the\s+)?(?:demo|video|tour)\b/i,                                          'Watch Demo'],
  [/\bcontact\s+us\b/i,                                                                    'Contact Us'],
  [/\bcall\s+us\b/i,                                                                       'Call Now'],
  [/\bget\s+started\b/i,                                                                   'Get Started'],
];

function extractIntentCta(text: string): string | undefined {
  for (const [pattern, label] of INTENT_CTA_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return undefined;
}

// ── Section-aware content extraction ─────────────────────────────────────────
// Structured briefs group instructions under headers ("## Design Style",
// "## Visual Requirements", "## Navigation", "## IMPORTANT REQUIREMENTS"). The
// text under those headers describes the SITE'S APPEARANCE / rules — not the
// business — and must NEVER be mined for About copy, feature cards, or products.
// stripNonContentSections removes those blocks so the CONTENT extractors only see
// real business sections (Home, About/Story, Shoes, Jerseys, Products, Contact …).
// (Colours, niche, brand, nav, and forbidden-section rules are still read from the
// FULL prompt elsewhere.)
// NOTE: bare "Requirements:" is often a CONTENT list (the user enumerating
// sections/products), so it is NOT stripped. Only QUALIFIED meta headers are
// ("Visual Requirements" → visual, "IMPORTANT REQUIREMENTS" → important, etc.).
const NON_CONTENT_HEADER_RE = /\b(?:design|visual|navigation|nav|important|technical|tech\s+stack|seo|performance|accessibility|animations?|interactions?|colou?rs?|typography|layout|branding|styling|aesthetics?|guidelines?)\b/i;
// Content headers we always keep, even if they incidentally contain a stop word.
const CONTENT_HEADER_RE = /\b(?:home|hero|about|story|mission|shoes?|jerseys?|products?|collections?|catalog|menu|services?|features?|contact|pricing|gallery|team|shop|store|page)\b/i;

export function stripNonContentSections(text: string): string {
  const lines = text.split(/\n/);
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    // A markdown (## …) or bold (**…**) line is always a block boundary.
    const strong = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/) || line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/);
    // A bare header is a SHORT line where EVERY word is Title-Case ("Design Style",
    // "Visual Requirements"). Requiring every word capitalised avoids matching
    // instruction lines like "Only include:" or "Add to cart".
    const bare = !strong && line.match(/^\s*([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z&/]*){0,4})\s*:?\s*$/);
    const header = (strong ? strong[1] : bare ? bare[1] : '').replace(/[*:#]/g, '').trim();

    if (strong) {
      // Markdown/bold header: re-evaluate the skip state in either direction.
      skipping = NON_CONTENT_HEADER_RE.test(header) && !CONTENT_HEADER_RE.test(header);
      continue;
    }
    if (bare) {
      if (NON_CONTENT_HEADER_RE.test(header) && !CONTENT_HEADER_RE.test(header)) { skipping = true; continue; }
      if (CONTENT_HEADER_RE.test(header)) { skipping = false; continue; }
      // An unrecognised bare line is NOT a header — fall through and treat as content
      // (unless we're already inside a skipped block).
    }
    if (!skipping) out.push(line);
  }
  return out.join('\n');
}

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
export function understandPrompt(prompt: string, briefOverride?: Brief): NluContent {
  const text = (prompt || '').replace(/[""„‟″]/g, '"').replace(/[''‚‛′]/g, "'");
  const lower = text.toLowerCase();
  const seed = hash(lower);

  // CONTENT text = the prompt with design/visual/meta instruction blocks removed,
  // so business-content extractors never mine appearance specs. Niche, brand,
  // colours, navigation, and forbidden-section rules still use the FULL prompt.
  const contentText = stripNonContentSections(text);
  const contentLower = contentText.toLowerCase();

  // AUTHORITATIVE understanding model. When an AI understanding is supplied
  // (briefOverride), it is used verbatim; otherwise the deterministic parseBrief
  // reads the structured document. Either way this drives the sections, their
  // order, navigation, and per-section content — exactly what the user asked for.
  const brief = (briefOverride ?? parseBrief(prompt)) as Brief & { forbidden?: SectionKind[]; brandName?: string };
  const briefKinds: SectionKind[] = [];
  const briefProducts: NluProduct[] = [];
  const briefCtas: string[] = [];
  let briefHeadline: string | undefined;
  let briefSub: string | undefined;
  let briefAbout: string | undefined;
  if (brief.isStructured) {
    for (const s of brief.sections) {
      if (s.kind === 'hero') {
        briefHeadline = briefHeadline || s.headline;
        briefSub = briefSub || s.subheadline;
        for (const c of s.ctas) if (!briefCtas.includes(c)) briefCtas.push(c);
      } else if (s.kind === 'story') {
        if (!briefAbout && s.body && s.body.length > 20) briefAbout = s.body;
        if (!briefKinds.includes('story')) briefKinds.push('story');
      } else if (s.kind === 'products' || s.kind === 'features') {
        // Listed items become user catalog/service items (priced & carded later).
        for (const name of s.items) briefProducts.push({ name, _fromUser: true });
        if (!briefKinds.includes(s.kind)) briefKinds.push(s.kind);
      } else if (s.kind !== 'unknown') {
        if (!briefKinds.includes(s.kind)) briefKinds.push(s.kind);
        // Section-level CTAs (e.g. contact "Send Message") are surfaced too.
        for (const c of s.ctas) if (!briefCtas.includes(c)) briefCtas.push(c);
      }
    }
  }

  const { slug, broad } = detectNiche(lower);
  const profile = profileFor(slug, broad);

  const explicit = extractPromptCopy(prompt);
  const brandName = extractBrandName(text);
  const explicitPalette = extractColors(text, lower, profile);
  const palette = explicitPalette || (hasCue(lower, MOOD_CUES) ? undefined : profile.palette);

  const differentiator = extractDifferentiator(contentLower);
  const activityKeywords = extractActivityKeywords(contentLower);
  const requirements = extractRequirements(prompt);
  const forbiddenKinds = new Set(requirements.forbidden);
  // Sections the AI understanding flagged as excluded are forbidden too.
  for (const k of brief.forbidden ?? []) forbiddenKinds.add(k);

  // Extract products early so we can infer audience from product names.
  // Priority: inline-listed products ("we offer X, Y, Z") → product/category items
  // the user enumerated in a Requirements bullet list ("Jersey collections",
  // "Basketball shoes catalog") → niche profile bank → inferred from activity.
  // The bullet path matters because users often specify their catalog as a list of
  // product CATEGORIES, not a prose sentence — and falling back to a generic niche
  // bank ("Signature Tee") is exactly the "generic placeholder content" they reject.
  const namedProducts = extractProducts(contentText);
  const bulletProducts = extractBulletProducts(contentText);
  let products: NluProduct[] | undefined;
  if (briefProducts.length) {
    // Structured brief listed product/category items — these are authoritative.
    products = briefProducts;
  } else if (namedProducts && namedProducts.length) {
    products = enrichProducts(namedProducts, profile).map(p => ({ ...p, _fromUser: true }));
  } else if (bulletProducts.length >= 2) {
    products = bulletProducts.map(name => ({ name, _fromUser: true }));
  } else if (requirements.required.includes('products' as SectionKind) || PRODUCT_INDUSTRIES.has(slug)) {
    products = profile.products.length
      ? profile.products
      : inferProductsFromActivity(activityKeywords, slug, PRODUCT_INDUSTRIES.has(slug));
  } else {
    products = undefined;
  }

  // Semantic extraction — drives the DYNAMIC copy generator in buildSiteCopy
  // Audience: explicit "for [X]" phrase → implicit from product names → undefined
  const audience = extractAudience(contentText, contentLower) || inferAudienceFromProducts(namedProducts || []);
  // Enrichment signals — elevate copy quality and uniqueness per prompt
  const credentialSignals = extractCredentialSignals(contentLower);
  const location = extractLocation(contentText, contentLower);
  const brandVoice = detectBrandVoice(text);
  // The user's own descriptive sentences — used verbatim in heroSub / aboutBody.
  // Mined from CONTENT sections only (design/visual blocks already stripped).
  const sellingPoints = extractSellingPoints(contentText, activityKeywords, brandName);
  // Action phrases the user wrote ("order now", "book a table") → hero CTA label
  const intentCta = extractIntentCta(text);
  // Mission/purpose statements — "our mission is to...", "we exist to...", "we believe..."
  const MISSION_RE = /(?:^|\.\s+|\n)(?:our\s+)?mission\s+(?:statement\s+)?(?:is\s+(?:to\s+)?)?([A-Za-z].{15,200}?)(?:\.|$)/im;
  const PURPOSE_RE = /we\s+(?:exist\s+to|(?:was\s+)?(?:built|created|founded|started)\s+(?:to|for)\s+)([A-Za-z].{15,200}?)(?:\.|$)/i;
  const BELIEF_RE = /we\s+believe\s+(?:that\s+)?([A-Za-z].{15,200}?)(?:\.|$)/i;
  const missionM = MISSION_RE.exec(contentText) || PURPOSE_RE.exec(contentText) || BELIEF_RE.exec(contentText);
  const missionStatement = missionM ? missionM[1].trim() : undefined;
  // Business logistics — shown in contact/footer sections
  const operatingHours = extractOperatingHours(text);
  const phone = extractPhone(text);
  const startingPrice = extractStartingPrice(text);

  // Keywords for the prompt-engine parser (all content words, slightly broader set)
  const keywords = activityKeywords;

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
    brandName: brief.brandName || brandName,
    // EXPLICIT user copy wins (what they actually wrote in the prompt).
    // Hero headline/sub/about are NOT synthesised here from a profile bank —
    // they are generated dynamically in buildSiteCopy from the extracted
    // keywords, audience, and differentiator below, so every site's copy is
    // unique and anchored in the real prompt content.
    // Structured brief wins, then explicit prompt-copy, then dynamic synthesis.
    heroHeadline: briefHeadline || explicit?.heroHeadline || undefined,
    heroSub:      briefSub      || explicit?.heroSub      || undefined,
    tagline:      explicit?.tagline      || undefined,
    heroTag:      explicit?.heroTag      || undefined,
    // Only set these when the user EXPLICITLY wrote CTA text (quoted or cued).
    // Profile defaults are handled by ctaByNiche in buildSiteCopy, so setting
    // them here would overwrite the intentCta that was extracted from the prompt.
    primaryCta:   briefCtas[0] || explicit?.primaryCta   || undefined,
    secondaryCta: briefCtas[1] || explicit?.secondaryCta || undefined,
    // About body comes from the brief's About/Story section when present.
    about:        briefAbout || undefined,
    // Sections: a structured brief is authoritative (its exact section set, in
    // order); otherwise fall back to explicit "sections:" lines + requirements.
    sections:     filterForbidden(
                    brief.isStructured && briefKinds.length
                      ? briefKinds
                      : mergeSections(explicit?.sections, requirements.required),
                    forbiddenKinds,
                  ),
    // Navigation: the brief's nav list wins, then an inline "Navigation:" list.
    navItems:     brief.nav.length ? brief.nav : (explicit?.navItems && explicit.navItems.length ? explicit.navItems : undefined),
    products,
    faqs:         undefined, // FAQs are template content, not user-written — omit so renderer only shows them when explicitly requested
    // Semantic qualifiers — passed to buildSiteCopy for richer dynamic copy
    audience,
    differentiator,
    activityKeywords,
    // Enrichment signals — colour copy uniqueness and credibility per-prompt
    credentialSignals: credentialSignals.length ? credentialSignals : undefined,
    location,
    brandVoice,
    sellingPoints: sellingPoints.length ? sellingPoints : undefined,
    intentCta,
    missionStatement,
    // Business logistics — rendered in contact, footer, and product sections
    operatingHours,
    phone,
    startingPrice,
    // Forbidden sections — canonical kinds the user told us to omit.
    excludedSections: requirements.forbidden.length ? requirements.forbidden : undefined,
  };
  return content;
}

// Remove any section label whose canonical kind is in the forbidden set.
function filterForbidden(sections: string[] | undefined, forbidden: Set<string>): string[] | undefined {
  if (!sections) return sections;
  const kept = sections.filter(s => { const k = canonicalKind(s); return !(k && forbidden.has(k)); });
  return kept.length ? kept : undefined;
}
