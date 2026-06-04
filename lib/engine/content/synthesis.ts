// ---------------------------------------------------------------------------
// SYNTHESIS HELPERS — Phase 3: deterministic NLU-tier content composition.
//
// All functions here compose content from NLU signals (differentiator, audience,
// keywords, etc.) WITHOUT consulting niche banks. They are the [nlu] tier in the
// resolution chain. No external AI. No network calls.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from '../prompt-engine';

// ── Low-level utilities ──────────────────────────────────────────────────────

export function pick<T>(arr: readonly T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

export function rotate<T>(arr: T[], by: number): T[] {
  if (!arr.length) return arr;
  const n = ((by % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

const LABEL_ACRONYMS: Record<string, string> = {
  saas: 'SaaS', seo: 'SEO', crm: 'CRM', api: 'API', ui: 'UI', ux: 'UX',
  ai: 'AI', hr: 'HR', b2b: 'B2B', b2c: 'B2C', it: 'IT', pr: 'PR',
};

export function cleanLabel(s: string): string {
  const lc = s.toLowerCase();
  if (LABEL_ACRONYMS[lc]) return LABEL_ACRONYMS[lc];
  return titleCase(s.replace(/[-_]/g, ' '));
}

// Stop-words that signal the end of a title phrase
const TITLE_STOP_RE = /^(?:and|or|with|for|of|to|by|in|at|on|made|from|using|serving|offering|providing|specializing|focusing|including|featuring|available|designed|tailored|perfect)$/i;

function titleWords(s: string, max: number): string {
  const words = s.replace(/[,;.!?]+$/, '').trim().split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (const w of words) {
    if (result.length >= max) break;
    if (result.length > 0 && TITLE_STOP_RE.test(w)) break;
    result.push(w.charAt(0).toUpperCase() + w.slice(1));
  }
  return result.join(' ');
}

/**
 * Convert a user's descriptive sentence into a short 3-5 word title phrase.
 * "We serve authentic Hakata-style tonkotsu ramen" → "Authentic Hakata-Style Tonkotsu"
 */
export function spToTitle(sentence: string): string {
  let s = sentence.trim();
  let m: RegExpMatchArray | null;

  // "We serve/offer/make/create/use [only] X"
  m = s.match(/^(?:we\s+)?(?:serve|offer|make|create|use|provide|craft|sell|brew|bake|cook|build|design|deliver|specialize\s+in|focus\s+on|speciali[sz]e\s+in)\s+(?:only\s+)?(.+)/i);
  if (m) return titleWords(m[1], 5);

  // "I am a certified X" / "Our X is Y"
  m = s.match(/^(?:i\s+am|we\s+are|i'm|we're)\s+(?:a\s+|an\s+)?(.+)/i);
  if (m) return titleWords(m[1], 5);

  // "Our [product/service] [is/are] X"
  m = s.match(/^our\s+(\w+(?:\s+\w+)?)\s+(?:is|are)\s+(.+)/i);
  if (m) return titleWords(m[2], 4);

  // "Specializing in X" / "Focused on X"
  m = s.match(/^(?:speciali[sz]ing|focused|dedicated)\s+(?:in|on)\s+(.+)/i);
  if (m) return titleWords(m[1], 5);

  // "[Adjective] X [for/with/that] ..."
  m = s.match(/^((?:[A-Z]\w+\s+){1,3}\w+?)(?:\s+(?:for|with|that|which|to|and|in|at)\b.+)?$/);
  if (m) return titleWords(m[1], 5);

  // Fallback: first 5 non-stop words
  return titleWords(s, 5);
}

/**
 * Extract real numbers/stats from a prompt string.
 * "Over 500 clients", "12-year track record", "4.9-star rating"
 */
export function extractPromptStats(prompt: string): Array<{ number: string; label: string }> {
  const out: Array<{ number: string; label: string }> = [];
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => { number: string; label: string }]> = [
    [/\b([\d,]+)\+?\s*(client|customer|user|member|student|patient|guest|employee|team|partner|project|product)s?\b/gi,
      m => ({ number: m[1].replace(/,/g, '') + (m[0].includes('+') ? '+' : ''), label: titleCase(m[2]) + 's' })],
    [/\b([\d.]+)[- ](star|★)\s*(?:rating|rated|review)?\b/gi,
      m => ({ number: m[1] + '★', label: 'Rating' })],
    [/\b(\d+)[- ]?(?:yr|year)[- ]?(?:track\s+record|experience|in\s+business|operating)\b/gi,
      m => ({ number: m[1] + ' Yrs', label: 'Experience' })],
    [/\b([\d,]+)\+?\s*(award|accolade|certification|honour|honor)s?\b/gi,
      m => ({ number: m[1], label: 'Awards' })],
    [/\b(\d+(?:\.\d+)?)\s*(?:million|M)\s*(order|sale|customer|user)s?\b/gi,
      m => ({ number: m[1] + 'M', label: titleCase(m[2]) + 's' })],
  ];
  for (const [re, fn] of patterns) {
    let m: RegExpMatchArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(prompt)) !== null) {
      if (out.length >= 4) break;
      const stat = fn(m);
      if (!out.some(s => s.label === stat.label)) out.push(stat);
    }
  }
  return out;
}

// ── NLU signal extraction ────────────────────────────────────────────────────

export interface NluSignals {
  audience: string;
  differentiator: string;
  location: string;
  credSignals: string[];
  activityKeywords: string[];
  missionStatement: string;
  operatingHours: string;
  phone: string;
  startingPrice: string;
  /** All raw selling points from NLU. */
  sellingPoints: string[];
  /** Filtered: non-CTA sentences that describe the business. */
  descriptiveSPs: string[];
  intentCta: string;
  primaryCta: string;
  secondaryCta: string;
  heroTag: string;
  heroHeadline: string;
  heroSub: string;
  tagline: string;
  about: string;
  brandVoice: { register?: string; usesExclamations?: boolean } | undefined;
  /** `_fromUser` is true ONLY when the user explicitly listed this item in the
   *  prompt (inline "we offer X, Y" or a bullet list) — never for niche-bank or
   *  activity-inferred fallbacks. Resolvers use it to keep provenance honest. */
  products: Array<{ name: string; desc: string; price: string; fromUser: boolean }>;
  faqs: Array<{ q: string; a: string }>;
  sections: string[];
}

const CTA_VERB_RE = /\b(?:order|book|call|visit|contact|reserve|schedule|buy|shop|sign\s+up|get\s+started)\s+(?:now|today|us|here|online)\b/i;

export function extractNluSignals(puo: PromptUnderstandingObject): NluSignals {
  const llm = (puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm || {};
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  const sellingPoints = arr<string>(llm.sellingPoints).filter(Boolean);
  const descriptiveSPs = sellingPoints.filter(sp => !CTA_VERB_RE.test(sp));

  const products = arr<{ name?: string; desc?: string; price?: string; _fromUser?: boolean }>(llm.products)
    .filter(p => str(p?.name))
    .map(p => ({ name: str(p.name), desc: str(p.desc), price: str(p.price), fromUser: p._fromUser === true }));

  const faqs = arr<{ q?: string; a?: string }>(llm.faqs)
    .filter(f => str(f?.q) && str(f?.a))
    .map(f => ({ q: str(f.q), a: str(f.a) }));

  return {
    audience:        str(llm.audience),
    differentiator:  str(llm.differentiator),
    location:        str(llm.location),
    credSignals:     arr<string>(llm.credentialSignals),
    activityKeywords:arr<string>(llm.activityKeywords),
    missionStatement:str(llm.missionStatement),
    operatingHours:  str(llm.operatingHours),
    phone:           str(llm.phone),
    startingPrice:   str(llm.startingPrice),
    sellingPoints,
    descriptiveSPs,
    intentCta:       str(llm.intentCta),
    primaryCta:      str(llm.primaryCta),
    secondaryCta:    str(llm.secondaryCta),
    heroTag:         str(llm.heroTag),
    heroHeadline:    str(llm.heroHeadline),
    heroSub:         str(llm.heroSub),
    tagline:         str(llm.tagline),
    about:           str(llm.about),
    brandVoice:      llm.brandVoice as NluSignals['brandVoice'],
    products,
    faqs,
    sections:        arr<string>(llm.sections).map(String),
  };
}

// ── Keyword extraction ───────────────────────────────────────────────────────

const STYLE_WORDS = new Set([
  'dark','light','bright','airy','warm','cold','cozy','muted','vibrant','neon','ethereal','dreamy','dramatic','contrast','moody','calm','serene',
  'minimal','minimalist','bold','elegant','clean','modern','luxury','luxurious','premium','sleek','stylish','sophisticated','refined','classy','chic',
  'professional','aesthetic','beautiful','stunning','amazing','gorgeous','fresh','trendy','crisp','smooth','polished','high-end','upscale',
  'classic','sharp','iconic','signature','curated','handcrafted','artisanal','bespoke','elevated','immersive',
  'great','best','good','nice','cool','awesome','simple','creative','unique','dynamic','energetic','friendly','powerful','strong','exclusive',
  'website','site','page','pages','landing','homepage','webpage','webshop','layout','design','style','theme','color','colors','colour','font','fonts',
  // Deliverable / role meta-words — describe the artifact or job title, not the
  // business itself, so they must not pollute headlines or feature copy.
  'portfolio','freelance','freelancer','freelancing','resume',
  'build','create','make','generate','want','need','please','with','that','this','for','the','and','have','has','look','feel','using','about',
  'red','blue','green','yellow','orange','purple','pink','black','white','gray','grey','brown','cyan','magenta','teal',
  'indigo','violet','gold','silver','beige','navy','maroon','olive','lime','turquoise','lavender','peach','cream','charcoal','slate','ivory','mint','coral','amber','rose',
  'restaurant','shop','store','studio','brand','boutique','agency','firm','company','business','cafe','bar','salon',
  'clinic','gym','club','space','venue','place','spot','concept','market','office','practice','center','centre',
  'from','into','onto','upon','over','under','between','through','across','along','within','without','beyond',
  'also','just','very','too','more','most','less','much','many','some','any','all','new',
]);

export function getContentWords(puo: PromptUnderstandingObject): string[] {
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

// ── Headline patterns ────────────────────────────────────────────────────────

export function buildHeadlinePatterns(
  brand: string, mainKw: string, secKw: string, thirdKw: string,
  diffAdj: string, audFrag: string,
): Record<string, string[]> {
  return {
    bold: [
      `${brand} — ${mainKw} Redefined`, `The ${mainKw} Standard`, `${diffAdj}${mainKw}. Built Different.`,
      `${mainKw} Worth Choosing`, `${brand}: ${mainKw} Done Right`, `No Shortcuts. Just ${mainKw}.`,
      `${diffAdj}${mainKw} That Delivers`, `${brand} — Because ${mainKw} Matters`,
    ],
    elegant: [
      `${brand} — ${diffAdj}${mainKw} & ${secKw}`, `The Art of ${diffAdj}${mainKw}`, `${diffAdj}${mainKw}, Thoughtfully Done`,
      `${mainKw} with Intention`, `A Study in ${mainKw}`, `${mainKw} as It Should Be`,
      `${brand} — Where ${mainKw} Meets ${secKw}`, `${diffAdj}${mainKw}, Carefully Considered`,
    ],
    energetic: [
      `${mainKw} at Its Best${audFrag}`, `${brand}: ${mainKw} Meets ${secKw}`, `Elevate Your ${mainKw}`,
      `${mainKw} Unleashed`, `${brand} — Built for ${mainKw}`, `Fuel Your ${mainKw}`,
      `Take Your ${mainKw} Further`, `${mainKw} Without Limits${audFrag}`,
    ],
    friendly: [
      `Welcome to ${brand}`, `${mainKw} Made for You${audFrag}`, `${brand} — ${mainKw} You'll Love`,
      `Your ${mainKw} Starts Here`, `${mainKw} Made Simple${audFrag}`, `${brand}: Here for Your ${mainKw}`,
      `${mainKw} Done with Care`, `Let's Start with ${mainKw}`,
    ],
    authoritative: [
      `${brand}: Trusted ${mainKw}`, `The ${mainKw} Authority`, `${mainKw} Done Right${audFrag}`,
      `Setting the ${mainKw} Standard`, `${mainKw} You Can Count On`, `The Proven ${mainKw} Partner`,
      `${brand}: Leading ${mainKw}`, `Where ${mainKw} Expertise Lives`,
    ],
    innovative: [
      `${mainKw} Reimagined`, `The Future of ${mainKw}`, `${brand} — ${mainKw} Next`,
      `${mainKw} × ${secKw}`, `Reinventing ${mainKw}`, `${brand}: A New Kind of ${mainKw}`,
      `Beyond ${mainKw}`, `${mainKw}, Rethought`,
    ],
    sophisticated: [
      `${brand} — ${diffAdj}${mainKw} Elevated`, `Where ${mainKw} Meets ${secKw}`, `${diffAdj}${mainKw}. Elevated.`,
      `${mainKw} Worth Remembering`, `${brand} — Refined ${mainKw}`, `${mainKw} Without Compromise`,
      `The Considered ${mainKw}`, `${diffAdj}${mainKw}, Perfected`,
    ],
    trustworthy: [
      `${brand}: Your ${mainKw} Partner`, `${mainKw} You Can Trust${audFrag}`, `Reliable ${mainKw}`,
      `Trusted ${mainKw}${audFrag}`, `${brand} — ${mainKw} Without the Guesswork`, `Honest ${mainKw}, Every Time`,
      `${mainKw} Backed by Experience`, `${brand}: Dependable ${mainKw}`,
    ],
    calm: [
      `${brand} — ${mainKw} Done Right`, `A Space for ${mainKw}`, `${mainKw}, With Care`,
      `${mainKw} Worth Slowing Down For`, `${mainKw} the Way It Should Be`, `Quietly Exceptional ${mainKw}`,
      `${brand} — Unhurried ${mainKw}`, `${mainKw} That Stays with You`,
    ],
    exclusive: [
      `${diffAdj}${mainKw} Worth Having`, `${brand} — ${mainKw} Refined`, `The ${diffAdj}${mainKw} Edit`,
      `${mainKw}, Elevated`, `${brand}: For Those Who Know ${mainKw}`, `Only the Finest ${mainKw}`,
      `${mainKw} Reserved for the Few`, `${diffAdj}${mainKw} by ${brand}`,
    ],
    aggressive: [
      `${brand} vs. The Rest`, `${mainKw} Without Apology`, `Dominate Your ${mainKw}`,
      `${brand} Means Business`, `${mainKw}? We Own It.`, `Built to Win at ${mainKw}`,
      `${brand}: The ${mainKw} Competitor`, `Lead with ${mainKw}`,
    ],
    whimsical: [
      `${mainKw} and a Little Magic`, `${brand} — Where ${mainKw} Gets Fun`, `A Little ${mainKw}, A Lot of Joy`,
      `${mainKw} That Makes You Smile`, `Something ${mainKw}, Something Wonderful`,
      `${brand}: Playful ${mainKw}`, `Find Your ${mainKw} Happy Place`, `Joyful ${mainKw}${audFrag}`,
    ],
    serious: [
      `${brand}: Serious About ${mainKw}`, `${mainKw}. No Compromises.`, `${mainKw} That Performs`,
      `Precision in ${mainKw}`, `${brand} — Professional ${mainKw}`, `${mainKw} Done with Discipline`,
      `The ${mainKw} Specialists`, `When ${mainKw} Matters`,
    ],
    approachable: [
      `${mainKw} Made Easy${audFrag}`, `${brand} — ${mainKw} for Everyone`, `Start Your ${mainKw} Journey`,
      `${mainKw} Without the Jargon`, `${brand}: Friendly ${mainKw}`, `${mainKw} That Works for You`,
      `Getting Started with ${mainKw}`, `${mainKw} Simplified${audFrag}`,
    ],
    rebellious: [
      `${brand}: Break the ${mainKw} Rules`, `${mainKw} on Your Own Terms`, `${mainKw} the Industry Ignores`,
      `Against the ${mainKw} Grain`, `${brand} Does ${mainKw} Differently`, `Unconventional ${mainKw}`,
      `${mainKw} Unchained`, `The Anti-${mainKw} ${mainKw}`,
    ],
    youthful: [
      `${mainKw} for the Next Gen${audFrag}`, `${brand}: Fresh ${mainKw}`, `Your ${mainKw} Era Starts Now`,
      `Next-Level ${mainKw}`, `${brand} — ${mainKw} Made New`, `${mainKw} for Now${audFrag}`,
      `Fresh Perspective. ${mainKw}.`, `${mainKw} That Keeps Up${audFrag}`,
    ],
    timeless: [
      `${brand} — ${mainKw} Since Day One`, `${mainKw} Built to Last`, `A Legacy of ${mainKw}`,
      `${mainKw} That Endures`, `${brand}: ${mainKw} the Classic Way`, `${diffAdj}${mainKw}, Timeless Craft`,
      `Generations of ${mainKw}`, `${brand}: Standing the Test of ${secKw}`,
    ],
    experimental: [
      `${brand}: Redefining ${mainKw}`, `What If ${mainKw} Could Be More?`, `${mainKw} × ${secKw} × ${thirdKw}`,
      `${brand} — The ${mainKw} Experiment`, `${mainKw}: A New Hypothesis`, `Exploring the Edge of ${mainKw}`,
      `${mainKw} Uncharted`, `${brand}: ${mainKw} in Beta`,
    ],
    innovative_default: [
      `${mainKw} Reimagined`, `${brand} — ${mainKw} Next`, `${mainKw} × ${secKw}`,
      `Beyond ${mainKw}`, `Reinventing ${mainKw}`, `${mainKw}, Rethought`,
      `The New ${mainKw}`, `${brand}: A New Standard in ${mainKw}`,
    ],
  };
}
