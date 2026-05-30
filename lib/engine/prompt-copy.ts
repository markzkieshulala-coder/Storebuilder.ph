// ---------------------------------------------------------------------------
// DETERMINISTIC PROMPT-COPY EXTRACTOR
//
// Reads the user's prompt the way a human would and pulls out the copy they
// EXPLICITLY asked for — the hero headline they quoted, the exact button labels
// they named, an explicit tagline, and the sections they listed. This runs with
// NO network and NO API key, so the engine honors the user's own words whether
// or not the optional LLM understanding pass is enabled.
//
// The result is folded into the same `customAttributes.llm` channel the renderer
// already consumes (see html-renderer `applyLlmCopy`), so explicit prompt copy
// overrides the deterministic copy banks. When the LLM pass also runs, its
// richer output refines these values further.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';

export interface ExtractedPromptCopy {
  heroHeadline?: string;
  heroSub?: string;
  primaryCta?: string;
  secondaryCta?: string;
  heroTag?: string;
  tagline?: string;
  sections?: string[];
}

// Cue words that, when they appear just before a quoted phrase, mark it as the
// hero/headline message rather than a button label or feature name.
const HERO_CUES = ['hero', 'headline', 'welcoming', 'welcome message', 'tagline', 'slogan', 'hero message', 'title', 'heading', 'main message'];
// Cue words that mark a quoted phrase as a clickable call-to-action label.
const CTA_CUES = ['call-to-action', 'call to action', 'cta', 'button', 'buttons', 'link'];

function clean(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’.,;:–—-]+|[\s"'“”‘’.,;:–—-]+$/g, '')
    .trim()
    .slice(0, 120);
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract explicit, user-quoted copy from a prompt. Returns null when the prompt
 * contains no clear copy cues, so callers can fall through to the deterministic
 * copy banks unchanged.
 */
export function extractPromptCopy(prompt: string): ExtractedPromptCopy | null {
  if (!prompt || prompt.trim().length < 8) return null;

  // Normalize curly quotes to straight quotes so a single regex catches both.
  const text = prompt
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‘’‚‛′]/g, "'");
  const lower = text.toLowerCase();

  // Collect every double-quoted phrase with its position in the text.
  const quotes: Array<{ text: string; index: number }> = [];
  const re = /"([^"\n]{1,140})"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const phrase = clean(m[1]);
    if (phrase) quotes.push({ text: phrase, index: m.index });
  }

  const out: ExtractedPromptCopy = {};
  const usedIdx = new Set<number>();

  const precededBy = (idx: number, cues: string[], window = 80): boolean => {
    const region = lower.slice(Math.max(0, idx - window), idx);
    return cues.some(c => region.includes(c));
  };

  if (quotes.length) {
    // Hero headline: the first longer quote introduced by a hero/headline cue.
    for (const q of quotes) {
      if (q.text.length >= 14 && wordCount(q.text) >= 3 && precededBy(q.index, HERO_CUES, 90)) {
        out.heroHeadline = q.text;
        usedIdx.add(q.index);
        break;
      }
    }
    // Fallback: the single longest multi-word quote is almost always the hero line.
    if (!out.heroHeadline) {
      const longest = [...quotes].sort((a, b) => b.text.length - a.text.length)[0];
      if (longest && longest.text.length >= 20 && wordCount(longest.text) >= 4) {
        out.heroHeadline = longest.text;
        usedIdx.add(longest.index);
      }
    }

    // CTA labels: short quotes introduced by a button/CTA cue, in document order.
    const ctas: string[] = [];
    for (const q of quotes) {
      if (usedIdx.has(q.index)) continue;
      const wc = wordCount(q.text);
      if (wc >= 1 && wc <= 5 && precededBy(q.index, CTA_CUES, 70)) {
        if (!ctas.some(c => c.toLowerCase() === q.text.toLowerCase())) ctas.push(q.text);
      }
    }
    if (ctas[0]) out.primaryCta = ctas[0];
    if (ctas[1]) out.secondaryCta = ctas[1];
  }

  // Sections explicitly requested, e.g. "About section", "Menu / Products section".
  const sections: string[] = [];
  const secRe = /([A-Z][A-Za-z]+(?:\s*(?:\/|and|&)\s*[A-Z][A-Za-z]+)?(?:\s+[A-Z][A-Za-z]+)?)\s+section\b/g;
  let sm: RegExpExecArray | null;
  while ((sm = secRe.exec(text)) !== null) {
    const label = clean(sm[1]);
    if (label && label.length <= 40 && !sections.some(s => s.toLowerCase() === label.toLowerCase())) {
      sections.push(label);
    }
  }
  if (sections.length) out.sections = sections;

  return Object.keys(out).length ? out : null;
}

/**
 * Fold extracted prompt copy into the PUO's `customAttributes.llm` channel,
 * merging with anything already present. Existing values are kept unless the
 * extractor found an explicit replacement (explicit user text wins over banks).
 */
export function foldPromptCopyIntoPuo(
  puo: PromptUnderstandingObject,
  copy: ExtractedPromptCopy,
): PromptUnderstandingObject {
  const prev = ((puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm) || {};
  const merged: Record<string, unknown> = { ...prev };
  for (const [k, v] of Object.entries(copy)) {
    if (v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)) merged[k] = v;
  }
  return {
    ...puo,
    customAttributes: { ...puo.customAttributes, llm: merged },
  };
}
