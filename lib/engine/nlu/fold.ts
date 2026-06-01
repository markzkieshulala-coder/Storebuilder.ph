// ---------------------------------------------------------------------------
// FOLD NLU UNDERSTANDING INTO THE PUO
//
// Merges the in-house NLU engine's structured understanding into the
// PromptUnderstandingObject that drives layout, copy, fonts, and imagery. Only
// fields the NLU actually resolved overwrite the deterministic parser's values;
// everything else is left intact. Rich, prompt-specific content (copy, products,
// faqs, sections) is stashed under `customAttributes.llm` — the exact channel the
// renderer's `applyLlmCopy` already consumes.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from '../prompt-engine';
import type { VisualMood, DesignStyle, WebsitePersonality, BusinessTone } from '../prompt-engine/types';
import type { NluContent } from './index';

const MOODS: VisualMood[] = ['dark','light','contrast','muted','vibrant','ethereal','grounded','dramatic','soft','warm','cold','neutral'];
const STYLES: DesignStyle[] = ['minimal','brutalist','glassmorphism','neumorphism','skeuomorphic','flat','material','cyberpunk','futuristic','retro','vaporwave','editorial','corporate','playful','artistic','organic','industrial','luxury','premium','startup','enterprise','cinematic','high-tech'];
const PERSONALITIES: WebsitePersonality[] = ['bold','elegant','aggressive','friendly','authoritative','whimsical','serious','approachable','exclusive','energetic','calm','rebellious','sophisticated','youthful','trustworthy','innovative','timeless','experimental'];
const TONES: BusinessTone[] = ['professional','casual','formal','playful','technical','luxury','accessible','disruptive','authoritative','empathetic','aggressive','conservative'];

const HEX = /^#?[0-9a-fA-F]{6}$/;
const normHex = (s: unknown): string | null => {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return HEX.test(t) ? (t.startsWith('#') ? t : '#' + t) : null;
};

export function foldNluIntoPuo(puo: PromptUnderstandingObject, nlu: NluContent): PromptUnderstandingObject {
  const out: PromptUnderstandingObject = { ...puo };

  // Niche: the NLU's detection is more granular than the bare parser, so adopt
  // it whenever it found something more specific than "general".
  if (nlu.industry && nlu.industry !== 'general') out.inferredIndustry = nlu.industry.toLowerCase();

  if (Array.isArray(nlu.keywords) && nlu.keywords.length) {
    out.extractedKeywords = Array.from(new Set([...nlu.keywords.map(k => k.toLowerCase()), ...puo.extractedKeywords]));
  }

  // Design tokens: the NLU only emits a value for dimensions the user did NOT
  // speak to explicitly (it suppresses its niche default otherwise), so adopting
  // these is safe — they fill gaps the parser left at its generic fallback for
  // niches the parser itself doesn't carry defaults for (e.g. "ramen").
  if (nlu.mood && MOODS.includes(nlu.mood)) out.visualMood = nlu.mood;
  if (nlu.designStyle && STYLES.includes(nlu.designStyle)) out.designStyle = nlu.designStyle;
  if (nlu.personality && PERSONALITIES.includes(nlu.personality)) out.websitePersonality = nlu.personality;
  if (nlu.tone && TONES.includes(nlu.tone)) out.businessTone = nlu.tone;

  // Palette: apply only the colours the user explicitly requested / niche fit.
  if (nlu.palette) {
    const p = normHex(nlu.palette.primary);
    const a = normHex(nlu.palette.accent);
    const bg = normHex(nlu.palette.background);
    out.visual = { ...puo.visual, colorPalette: { ...puo.visual.colorPalette } };
    if (p) out.visual.colorPalette.primary = p;
    if (a) out.visual.colorPalette.accent = a;
    if (bg) out.visual.colorPalette.background = bg;
  }

  // Stash the rich, prompt-specific content for the renderer. Merge onto anything
  // already present (e.g. the prompt-copy extractor's earlier fold) so explicit
  // user text is never erased — only non-empty NLU fields overwrite.
  const prevLlm = ((puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm) || {};
  const fresh: Record<string, unknown> = {
    brandName: nlu.brandName,
    tagline: nlu.tagline,
    heroHeadline: nlu.heroHeadline,
    heroSub: nlu.heroSub,
    heroTag: nlu.heroTag,
    primaryCta: nlu.primaryCta,
    secondaryCta: nlu.secondaryCta,
    about: nlu.about,
    sections: Array.isArray(nlu.sections) ? nlu.sections : undefined,
    products: Array.isArray(nlu.products) ? nlu.products : undefined,
    faqs: Array.isArray(nlu.faqs) ? nlu.faqs : undefined,
    // Semantic qualifiers — used by buildSiteCopy to enrich dynamic copy
    audience: nlu.audience,
    differentiator: nlu.differentiator,
    activityKeywords: Array.isArray(nlu.activityKeywords) ? nlu.activityKeywords : undefined,
  };
  const mergedLlm: Record<string, unknown> = { ...prevLlm };
  for (const [k, v] of Object.entries(fresh)) {
    if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) mergedLlm[k] = v;
  }
  out.customAttributes = { ...puo.customAttributes, llm: mergedLlm };

  out.confidence = Math.max(puo.confidence, 0.85);
  return out;
}
