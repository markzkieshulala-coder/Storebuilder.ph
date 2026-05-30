// ---------------------------------------------------------------------------
// LLM UNDERSTANDING LAYER
//
// Deep, LLM-powered comprehension of the user's prompt, fused into the existing
// deterministic engine. When ANTHROPIC_API_KEY is set, this calls Claude once to
// read the WHOLE prompt the way a human would — pulling out the precise niche,
// the named menu items / products, explicit hero copy, requested sections, brand
// voice, and any color cues the user mentioned — then folds that understanding
// back into the PromptUnderstandingObject (PUO) that drives layout, copy, fonts,
// and imagery. The generation engine itself stays deterministic and in-process;
// the LLM only sharpens the understanding so the built site matches the request.
//
// If no key is configured (or the call fails / times out), the engine falls back
// to the deterministic parser with zero behavioral change — the LLM is a pure
// enhancement, never a hard dependency. This keeps `next build` green offline.
//
// The Anthropic SDK is imported dynamically so the package only loads when the
// feature is actually enabled.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';
import type {
  VisualMood, DesignStyle, WebsitePersonality, BusinessTone,
} from './prompt-engine/types';

// Allowed enum vocabularies — the LLM must pick from these so its output maps
// cleanly onto the engine's design tokens.
const MOODS: VisualMood[] = ['dark','light','contrast','muted','vibrant','ethereal','grounded','dramatic','soft','warm','cold','neutral'];
const STYLES: DesignStyle[] = ['minimal','brutalist','glassmorphism','neumorphism','skeuomorphic','flat','material','cyberpunk','futuristic','retro','vaporwave','editorial','corporate','playful','artistic','organic','industrial','luxury','premium','startup','enterprise','cinematic','high-tech'];
const PERSONALITIES: WebsitePersonality[] = ['bold','elegant','aggressive','friendly','authoritative','whimsical','serious','approachable','exclusive','energetic','calm','rebellious','sophisticated','youthful','trustworthy','innovative','timeless','experimental'];
const TONES: BusinessTone[] = ['professional','casual','formal','playful','technical','luxury','accessible','disruptive','authoritative','empathetic','aggressive','conservative'];

const MODEL = process.env.LLM_MODEL || 'claude-opus-4-8';
const LLM_TIMEOUT = Number(process.env.LLM_TIMEOUT_MS || 30000);

const HEX = /^#?[0-9a-fA-F]{6}$/;
const normHex = (s: unknown): string | null => {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return HEX.test(t) ? (t.startsWith('#') ? t : '#' + t) : null;
};

// The shape we ask Claude to return. Mirrors the fields the renderer consumes.
export interface LlmContent {
  industry: string;                 // precise sub-niche slug, e.g. "coffee", "ramen", "crossfit"
  keywords: string[];               // salient content words, incl. named products/dishes
  mood: string;
  designStyle: string;
  personality: string;
  tone: string;
  palette?: { primary?: string; accent?: string; background?: string };
  brandName?: string;
  tagline?: string;
  heroHeadline?: string;
  heroSub?: string;
  about?: string;
  sections?: string[];              // explicitly requested sections (hero, menu, gallery, ...)
  products?: Array<{ name: string; desc?: string; price?: string }>;
  faqs?: Array<{ q: string; a: string }>;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    industry: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
    mood: { type: 'string', enum: MOODS as string[] },
    designStyle: { type: 'string', enum: STYLES as string[] },
    personality: { type: 'string', enum: PERSONALITIES as string[] },
    tone: { type: 'string', enum: TONES as string[] },
    palette: {
      type: 'object', additionalProperties: false,
      properties: { primary: { type: 'string' }, accent: { type: 'string' }, background: { type: 'string' } },
    },
    brandName: { type: 'string' },
    tagline: { type: 'string' },
    heroHeadline: { type: 'string' },
    heroSub: { type: 'string' },
    about: { type: 'string' },
    sections: { type: 'array', items: { type: 'string' } },
    products: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { name: { type: 'string' }, desc: { type: 'string' }, price: { type: 'string' } },
        required: ['name'],
      },
    },
    faqs: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { q: { type: 'string' }, a: { type: 'string' } },
        required: ['q', 'a'],
      },
    },
  },
  required: ['industry', 'keywords', 'mood', 'designStyle', 'personality', 'tone'],
} as const;

// Stable across every request → a strong prompt-cache prefix.
const SYSTEM_PROMPT = `You are the comprehension engine for an Ultra-Premium website generator. You read a user's website request and extract a precise, structured understanding that downstream deterministic code turns into a finished site.

Rules:
- Identify the MOST SPECIFIC niche/sub-niche as a short lowercase slug ("coffee", "ramen", "sushi", "crossfit", "yoga", "law", "saas", "photography", ...). Prefer the specific sub-niche over a broad category.
- keywords: 6-12 salient lowercase content words drawn from the niche and the prompt — include any explicitly named products, dishes, or services. Never include style/mood/color words here.
- mood, designStyle, personality, tone: choose the single best fit from the allowed enum values.
- palette: only include colors the user explicitly requested or that strongly fit the brand; 6-digit hex.
- brandName/tagline/heroHeadline/heroSub/about: write crisp, on-brand copy that fits THIS specific business. Do NOT use generic SaaS filler ("No credit card required", "Start your free trial") unless the niche is actually software. Do not leak style/mood/location words into copy.
- sections: list the sections the user explicitly asked for, if any.
- products: real, niche-appropriate items with names and (where natural) short descriptions and prices. For a coffee shop, real drinks; for a law firm, practice areas; etc.
- faqs: 3-5 questions a real customer of THIS business would ask.
Return ONLY the structured object.`;

let warnedNoKey = false;

/**
 * Call Claude once to deeply understand the prompt. Returns null when the
 * feature is disabled or the call fails — callers must treat null as "use the
 * deterministic understanding unchanged".
 */
export async function analyzePromptWithLLM(prompt: string): Promise<LlmContent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    if (!warnedNoKey) { console.info('[llm-understanding] ANTHROPIC_API_KEY not set — using deterministic understanding.'); warnedNoKey = true; }
    return null;
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey, timeout: LLM_TIMEOUT });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA as any } },
      messages: [{ role: 'user', content: `Website request:\n"""${prompt}"""` }],
    } as any);

    const block = response.content.find((b: any) => b.type === 'text') as { text?: string } | undefined;
    if (!block?.text) return null;
    return JSON.parse(block.text) as LlmContent;
  } catch (err) {
    console.warn('[llm-understanding] LLM analysis failed, using deterministic understanding:', (err as Error)?.message);
    return null;
  }
}

/**
 * Fold the LLM's understanding into the deterministic PUO. Only overwrites
 * fields the LLM filled with valid values; everything else is left intact. Rich
 * content (copy, products, faqs, sections) is stashed under
 * `customAttributes.llm` for the renderer to consume verbatim.
 */
export function mergeLlmIntoPuo(puo: PromptUnderstandingObject, llm: LlmContent): PromptUnderstandingObject {
  const out: PromptUnderstandingObject = { ...puo };

  if (llm.industry && llm.industry.trim()) out.inferredIndustry = llm.industry.trim().toLowerCase();

  if (Array.isArray(llm.keywords) && llm.keywords.length) {
    const merged = new Set<string>([...llm.keywords.map(k => String(k).toLowerCase()), ...puo.extractedKeywords]);
    out.extractedKeywords = Array.from(merged);
  }

  if (MOODS.includes(llm.mood as VisualMood)) out.visualMood = llm.mood as VisualMood;
  if (STYLES.includes(llm.designStyle as DesignStyle)) out.designStyle = llm.designStyle as DesignStyle;
  if (PERSONALITIES.includes(llm.personality as WebsitePersonality)) out.websitePersonality = llm.personality as WebsitePersonality;
  if (TONES.includes(llm.tone as BusinessTone)) out.businessTone = llm.tone as BusinessTone;

  // Apply explicit user-requested colors onto the palette.
  if (llm.palette) {
    const p = normHex(llm.palette.primary);
    const a = normHex(llm.palette.accent);
    const bg = normHex(llm.palette.background);
    out.visual = { ...puo.visual, colorPalette: { ...puo.visual.colorPalette } };
    if (p) out.visual.colorPalette.primary = p;
    if (a) out.visual.colorPalette.accent = a;
    if (bg) out.visual.colorPalette.background = bg;
  }

  // Stash the rich, prompt-specific content for the renderer.
  out.customAttributes = {
    ...puo.customAttributes,
    llm: {
      brandName: llm.brandName,
      tagline: llm.tagline,
      heroHeadline: llm.heroHeadline,
      heroSub: llm.heroSub,
      about: llm.about,
      sections: Array.isArray(llm.sections) ? llm.sections : undefined,
      products: Array.isArray(llm.products) ? llm.products : undefined,
      faqs: Array.isArray(llm.faqs) ? llm.faqs : undefined,
    },
  };

  out.confidence = Math.max(puo.confidence, 0.9);
  return out;
}
