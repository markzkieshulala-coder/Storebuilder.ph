// ---------------------------------------------------------------------------
// DETERMINISTIC PROMPT-COPY EXTRACTOR
//
// Reads the user's prompt the way a human would and pulls out the copy they
// EXPLICITLY asked for — the hero headline they wrote, the exact button labels
// they named, an explicit tagline/subheadline, and the sections they listed.
// Handles the way people ACTUALLY write: single OR double quotes, cues before
// OR after a phrase ("Order Online" button / button that says "Order Online"),
// and unquoted directives ("headline: Wake Up Happy", "a Join Now button").
// Runs with NO network and NO API key.
//
// This is a sub-module of the in-house NLU engine (lib/engine/nlu): the NLU calls
// extractPromptCopy() to capture the user's exact words, then layers its
// niche-aware synthesis underneath. The result reaches the renderer through the
// `customAttributes.llm` channel (see html-renderer `applyLlmCopy`), so explicit
// prompt copy always overrides the deterministic copy banks.
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
  /** Explicit navigation the user listed, in order, with their exact labels. */
  navItems?: string[];
}

// Extract an explicit navigation list the user typed, e.g.
//   "Navigation:\nHome\nAbout Us\nMenu\nContact"   or
//   "Navigation (IMPORTANT) Only include: Home, About Me, Services, Contact"
// Returns the labels in order. This is authoritative: when present, the site's nav
// and section set are built from EXACTLY these items — no auto-detected extras.
const NAV_CUE = /\b(navigation|nav\s*bar|navbar|nav\s*menu|menu\s*items|page\s*links?|nav)\b/i;
const NAV_STOP = /\b(no\s+extra|no\s+other|do\s+not|don'?t|hero|section|footer|headline|sub-?head|cta|button|colou?r|design|visual|layout|style|font|theme|primary|secondary)\b/i;
export function extractNavItems(text: string): string[] {
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].trim();
    if (!NAV_CUE.test(header)) continue;
    // The cue must be a short LABEL line ("Navigation:", "Nav (important):"), not
    // prose that merely mentions navigation.
    if (header.replace(/\(important\)/i, '').split(/\s+/).length > 6) continue;

    const items: string[] = [];
    const pushList = (raw: string) => {
      const seed = raw.replace(/\(important\)/i, '').replace(/^\s*only\s+include\s*:?/i, '').split(/[.!?](?:\s|$)/)[0];
      for (const p of seed.split(/\s*,\s*|\s+\/\s+|\s*\|\s*/)) {
        const c = clean(p);
        if (c) items.push(c);
      }
    };
    // Inline items after a colon on the header line.
    const colon = header.indexOf(':');
    if (colon >= 0) pushList(header.slice(colon + 1));

    // Following lines, one item per line, until a blank line or a sentence/stop.
    for (let j = i + 1; j < lines.length && items.length < 12; j++) {
      let l = lines[j].trim().replace(/^[-*•·\d.)\s]+/, '').trim();
      if (!l) { if (items.length) break; else continue; }
      if (/^only\s+include\s*:?/i.test(l)) { l = l.replace(/^only\s+include\s*:?/i, '').trim(); if (!l) continue; }
      if (NAV_STOP.test(l)) break;
      if (l.length > 24 || l.split(/\s+/).length > 4) break; // a sentence → list is over
      pushList(l);
    }

    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of items) {
      const k = it.toLowerCase();
      if (it && it.length <= 24 && !seen.has(k)) { seen.add(k); out.push(it); }
    }
    if (out.length >= 2) return out.slice(0, 8);
  }
  return [];
}

function clean(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’.,;:–—\-]+|[\s"'“”‘’.,;:–—\-]+$/g, '')
    .trim()
    .slice(0, 120);
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

// Cut an unquoted captured value at the first point where a NEW directive begins,
// so "Time, Perfected and the main button should say…" → "Time, Perfected".
function trimAtNextDirective(s: string): string {
  const cut = s.search(
    /\s+(?:and|with|plus|then|also)\s+(?:the\s+|a\s+|an\s+)?(?:main\s+|primary\s+|secondary\s+)?(?:button|cta|call[- ]to[- ]action|link|tagline|sub-?(?:title|heading|headline)|section|colou?r|font|theme)\b/i,
  );
  let v = cut >= 0 ? s.slice(0, cut) : s;
  // Also stop before a trailing standalone "… X button" / "… cta" fragment.
  v = v.replace(/\s+(?:button|cta|call[- ]to[- ]action|link)\b.*$/i, '');
  return v;
}

const CTA_STOP = /^(?:button|cta|link|page|section|that|which|saying|labelled?|labeled)$/i;

/**
 * Extract explicit, user-quoted copy from a prompt. Returns null when the prompt
 * contains no clear copy cues, so callers fall through to the deterministic banks.
 */
export function extractPromptCopy(prompt: string): ExtractedPromptCopy | null {
  if (!prompt || prompt.trim().length < 8) return null;

  // Normalize curly quotes so one set of regexes catches both.
  const text = prompt.replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'");
  const lower = text.toLowerCase();
  const out: ExtractedPromptCopy = {};

  // ── Collect quoted phrases (double, and "safe" single quotes that aren't
  //    contractions), each with its position so we can associate cues. ────────
  interface Q { text: string; index: number; end: number }
  const quotes: Q[] = [];
  let m: RegExpExecArray | null;
  const reDouble = /"([^"\n]{1,140})"/g;
  while ((m = reDouble.exec(text)) !== null) {
    const t = clean(m[1]);
    if (t) quotes.push({ text: t, index: m.index, end: m.index + m[0].length });
  }
  // Single quotes: only when the opening ' starts a token and the closing ' ends
  // one — so "don't"/"it's" never register as phrases.
  const reSingle = /(?:^|[\s(\[:>])'([^'\n]{2,140}?)'(?=[\s).,!?\]\n]|$)/g;
  while ((m = reSingle.exec(text)) !== null) {
    const t = clean(m[1]);
    if (t) quotes.push({ text: t, index: m.index, end: m.index + m[0].length });
  }
  quotes.sort((a, b) => a.index - b.index);

  const used = new Set<number>();
  // True when `cues` appear within `window` chars BEFORE the quote OR right AFTER it.
  const near = (q: Q, cues: string[], window = 90): boolean => {
    const before = lower.slice(Math.max(0, q.index - window), q.index);
    const after = lower.slice(q.end, q.end + 28);
    return cues.some((c) => before.includes(c) || after.includes(c));
  };

  const HERO_CUES = ['hero', 'headline', 'head line', 'tagline', 'slogan', 'title', 'heading', 'main message', 'hero text', 'hero copy'];
  const SUB_CUES = ['subheadline', 'sub-headline', 'subheading', 'sub-heading', 'subtitle', 'sub-title', 'subhead', 'supporting text'];
  const CTA_CUES = ['button', 'cta', 'call-to-action', 'call to action', 'link'];

  // ── 0. Reserve quotes that are clearly BUTTON labels (a button/cta cue sits
  //    immediately after, e.g. `"Order Online" button`, or immediately before,
  //    e.g. `button that says "Order Online"`). These never become the headline.
  const ctaQuoteIdx = new Set<number>();
  const cueRightAfter = (q: Q) => /^[\s,]*(?:button|cta|call[- ]to[- ]action|link)\b/i.test(text.slice(q.end, q.end + 24));
  const cueRightBefore = (q: Q) => /(?:button|cta|call[- ]to[- ]action|link)\s*(?:that\s+says|which\s+says|labell?ed|saying|reads?|says?|[:=])?\s*$/i.test(text.slice(Math.max(0, q.index - 44), q.index));
  for (const q of quotes) if (cueRightAfter(q) || cueRightBefore(q)) ctaQuoteIdx.add(q.index);

  // ── 1. HERO HEADLINE ──────────────────────────────────────────────────────
  // a) Unquoted directive — the most explicit form ("headline: X", "title is X").
  {
    const d = text.match(/\b(?:the\s+)?(?:hero\s+)?(?:head\s*line|headline|main\s+(?:title|message|heading)|hero\s+(?:text|message|copy|title)|slogan|page\s+title)\b\s*(?:should\s+(?:say|read|be)|that\s+says|which\s+says|to\s+say|says?|reads?|is|will\s+be|=|:|-)\s*["']?([^"'\n.!?]{3,90})/i);
    if (d) { const v = clean(trimAtNextDirective(d[1])); if (v && wordCount(v) >= 1) out.heroHeadline = v; }
  }
  // b) A quote explicitly cued as the headline (but never a reserved button quote).
  if (!out.heroHeadline) {
    for (const q of quotes) {
      if (ctaQuoteIdx.has(q.index) || used.has(q.index)) continue;
      if (near(q, HERO_CUES, 80) && wordCount(q.text) >= 2) { out.heroHeadline = q.text; used.add(q.index); break; }
    }
  }
  // c) Fallback: the single longest multi-word, non-button quote is the hero line.
  if (!out.heroHeadline) {
    const longest = [...quotes].filter((q) => !used.has(q.index) && !ctaQuoteIdx.has(q.index)).sort((a, b) => b.text.length - a.text.length)[0];
    if (longest && longest.text.length >= 18 && wordCount(longest.text) >= 4) { out.heroHeadline = longest.text; used.add(longest.index); }
  }

  // ── 2. SUBHEADLINE ────────────────────────────────────────────────────────
  for (const q of quotes) {
    if (used.has(q.index)) continue;
    if (near(q, SUB_CUES, 90)) { out.heroSub = q.text; used.add(q.index); break; }
  }
  if (!out.heroSub) {
    const d = text.match(/\b(?:sub-?(?:headline|heading|title)|subhead|supporting\s+(?:text|copy)|tagline\s+below)\b\s*(?:should\s+(?:say|read|be)|that\s+says|says?|reads?|is|=|:|-)\s*["']?([^"'\n]{3,120})/i);
    if (d) { const v = clean(trimAtNextDirective(d[1])); if (v) out.heroSub = v; }
  }

  // ── 3. TAGLINE ────────────────────────────────────────────────────────────
  {
    const d = text.match(/\btagline\b\s*(?:should\s+(?:say|read|be)|that\s+says|says?|reads?|is|=|:|-)\s*["']?([^"'\n]{3,90})/i);
    if (d) { const v = clean(trimAtNextDirective(d[1])); if (v) out.tagline = v; }
  }

  // ── 4. CTA / BUTTON LABELS ────────────────────────────────────────────────
  const ctas: string[] = [];
  const pushCta = (raw: string) => {
    const c = clean(raw);
    if (!c) return;
    if (CTA_STOP.test(c)) return;                       // stray cue word, not a label
    if (wordCount(c) > 5 || c.length > 32) return;       // labels are short
    if (ctas.some((x) => x.toLowerCase() === c.toLowerCase())) return;
    ctas.push(c);
  };
  // a) The button quotes reserved in step 0, in document order.
  for (const q of quotes) {
    if (ctaQuoteIdx.has(q.index)) { pushCta(q.text); used.add(q.index); }
  }
  // b) "button (says|labeled|that says|:) X"  (value quoted or short unquoted run).
  const reBtnSays = /\b(?:main|primary|secondary|cta|call[- ]to[- ]action)?\s*(?:button|cta|link)\s*(?:should\s+(?:say|read)|that\s+says|which\s+says|labell?ed|reads?|says?|=|:)\s*["']?([^"'\n.!?,]{1,32})/gi;
  while ((m = reBtnSays.exec(text)) !== null) pushCta(m[1]);
  // c) Unquoted "a Join Now button" / "the Get Started CTA" — capitalized label.
  const reCapBtn = /\b(?:a|an|the|with\s+a|add\s+a|include\s+a|and\s+a)\s+([A-Z][A-Za-z0-9]*(?:\s+[A-Z0-9][A-Za-z0-9]*){0,3})\s+(?:button|cta)\b/g;
  while ((m = reCapBtn.exec(text)) !== null) pushCta(m[1]);
  if (ctas[0]) out.primaryCta = ctas[0];
  if (ctas[1]) out.secondaryCta = ctas[1];

  // ── 5. SECTIONS THE USER LISTED ───────────────────────────────────────────
  const sections: string[] = [];
  const addSection = (label: string) => {
    const l = clean(label).replace(/\bsections?\b/i, '').replace(/\bsignup\b/i, 'Signup').trim();
    if (l && l.length <= 40 && wordCount(l) <= 4 && !sections.some((s) => s.toLowerCase() === l.toLowerCase())) sections.push(l);
  };
  const splitSecList = (clause: string): string[] =>
    clause
      .split(/\s*,\s*|\s+and\s+|\s*&\s*|\s*\/\s*/i)
      .map((s) => s.replace(/^(?:a|an|our|the|including|like|such as|for|and|plus|also)\s+/i, '').trim())
      .filter(Boolean);
  // a) "sections (for|like|including|:) A, B, and C"  — the cue/colon may follow
  //    the word with no space ("Sections: a, b, c").
  const listMatch = text.match(/\b(?:sections?|pages?)\b\s*(?:[:=]|for|like|including|such as|that\s+(?:include|cover)|of)\s+([^.!?\n]+)/i);
  if (listMatch) splitSecList(listMatch[1]).forEach(addSection);
  // b) Individual "X section" (e.g. "an About section, a Pricing section").
  const reSec = /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+section\b/g;
  while ((m = reSec.exec(text)) !== null) addSection(m[1]);
  if (sections.length) out.sections = sections;

  // ── 6. EXPLICIT NAVIGATION ────────────────────────────────────────────────
  const navItems = extractNavItems(text);
  if (navItems.length) out.navItems = navItems;

  return Object.keys(out).length ? out : null;
}

/**
 * Fold extracted prompt copy into the PUO's `customAttributes.llm` channel,
 * merging with anything already present. Explicit user text wins over banks.
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
