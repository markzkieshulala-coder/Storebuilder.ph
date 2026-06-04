// ---------------------------------------------------------------------------
// STRUCTURED-BRIEF PARSER — the deterministic front-end of the generator.
//
// Users write structured briefs: headers (## Home Page, ### Hero Section,
// ## Shoes Page), labelled fields (Headline:, Subheadline:, Buttons:,
// Categories:), and bullet lists. This module reads that document AS WRITTEN and
// produces an ordered model of exactly what the user asked for — pages, the
// sections inside them (in order), and each section's content (heading, body,
// items, CTAs). Design/visual/meta blocks are ignored (they describe how the site
// looks, not its content).
//
// There is NO model and NO inference here — it is pure structured-document
// parsing. When a prompt has no structure, isStructured is false and the caller
// falls back to the lexical NLU.
// ---------------------------------------------------------------------------

import { canonicalKind, type SectionKind } from '../requirements';

export interface BriefSection {
  /** Canonical section kind (story, products, contact, features, gallery…) or 'hero'. */
  kind: SectionKind | 'hero' | 'unknown';
  /** The user's own header text for this section, e.g. "Our Story", "Shoes". */
  heading: string;
  /** Labelled hero fields when present. */
  headline?: string;
  subheadline?: string;
  /** Prose body the user wrote under the header (quotes/labels stripped). */
  body: string;
  /** Enumerated items (Categories:, bullet lists, "A, B, C"). */
  items: string[];
  /** Button / CTA labels declared in this section. */
  ctas: string[];
}

export interface Brief {
  isStructured: boolean;
  /** Navigation labels in order, if the user listed them. */
  nav: string[];
  /** Content sections in document order (design/meta excluded). */
  sections: BriefSection[];
}

// Headers whose BLOCK is design/visual/meta — never content.
const META_HEADER = /\b(?:design|visual|requirements?|navigation|nav|important|technical|tech\s+stack|seo|performance|accessibility|animations?|interactions?|colou?rs?|typography|layout|branding|styling|aesthetics?|guidelines?|footer)\b/i;
// Content headers we always keep (even if a stop word appears incidentally).
const CONTENT_HEADER = /\b(?:home|hero|about|story|mission|shoes?|jerseys?|products?|collections?|catalog|menu|services?|features?|contact|pricing|gallery|team|shop|store|page|overview|why)\b/i;

const PAGE_RE = /\bpage\b/i;
const FIELD_RE = /^\s*(headline|sub-?headline|subheading|sub-?heading|title|tagline|buttons?|cta|call to action|categories|category|collections?|form\s*fields?|fields?|products?)\s*[:\-]\s*(.*)$/i;
const BULLET_RE = /^\s*(?:[-*•·]|\d+[.)]|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\s*(.+)$/u;

function isHeaderLine(line: string): { text: string; strong: boolean } | null {
  const md = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
  if (md) return { text: md[1].trim(), strong: true };
  const bold = line.match(/^\s*\*\*(.+?)\*\*\s*:?\s*$/);
  if (bold) return { text: bold[1].trim(), strong: true };
  // Bare Title-Case header: every word capitalised, ≤6 words, no trailing list.
  const bare = line.match(/^\s*([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z&/]*){0,5})\s*:?\s*$/);
  if (bare) return { text: bare[1].trim(), strong: false };
  return null;
}

function splitItems(s: string): string[] {
  return s
    .split(/\s*,\s*|\s+\/\s+|\s*\|\s*|\s+and\s+/i)
    .map(x => x.replace(/^[\s"'“”‘’]+|[\s"'“”‘’.]+$/g, '').replace(/\([^)]*\)/g, '').trim())
    .filter(x => x.length >= 2 && x.length <= 48);
}

function clean(s: string): string {
  return s.replace(/^[\s"'“”‘’*:–—-]+|[\s"'“”‘’*]+$/g, '').trim();
}

// Map a header to a section kind. "Hero" is special; pages like "Shoes"/"Jerseys"
// map to products; "Our Story"/"About" → story; "Featured Products" → products.
function kindForHeader(header: string): BriefSection['kind'] {
  const h = header.toLowerCase();
  if (/\bhero\b/.test(h)) return 'hero';
  if (/\b(home|landing)\b/.test(h) && !/\b(about|shoe|jersey|product|contact|service|story)\b/.test(h)) return 'hero';
  const k = canonicalKind(header.replace(/\bpage\b/i, ' ').replace(/\bsection\b/i, ' '));
  return k ?? 'unknown';
}

export function parseBrief(prompt: string): Brief {
  const text = (prompt || '').replace(/[“”„‟″]/g, '"').replace(/[‘’‚‛′]/g, "'");
  const lines = text.split(/\n/);

  // A brief is "structured" only if it actually uses headers/labelled fields.
  const headerCount = lines.filter(l => isHeaderLine(l)).length;
  const fieldCount = lines.filter(l => FIELD_RE.test(l)).length;
  const isStructured = headerCount >= 3 || (headerCount >= 1 && fieldCount >= 2);

  const sections: BriefSection[] = [];
  const nav: string[] = [];
  let cur: BriefSection | null = null;
  let skipping = false;
  let inNav = false;

  const flush = () => {
    if (cur && (cur.body || cur.items.length || cur.headline || cur.subheadline || cur.ctas.length || cur.kind !== 'unknown')) {
      cur.body = cur.body.trim();
      sections.push(cur);
    }
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const hdr = isHeaderLine(line);

    if (hdr) {
      const isMeta = META_HEADER.test(hdr.text) && !CONTENT_HEADER.test(hdr.text);
      // For a bare (non-markdown) header, only let it START a skip or open a real
      // content section; ignore ambiguous bare lines so prose isn't mis-split.
      if (hdr.strong || isMeta || CONTENT_HEADER.test(hdr.text) || PAGE_RE.test(hdr.text)) {
        flush();
        inNav = /\bnav(?:igation|bar)?\b/i.test(hdr.text);
        // A nav block is meta for CONTENT, but we still capture its items below,
        // so do not set the content-skip flag while inside it.
        skipping = isMeta && !inNav;
        if (!skipping && !inNav) {
          cur = { kind: kindForHeader(hdr.text), heading: clean(hdr.text).replace(/\s+(page|section)$/i, ''), body: '', items: [], ctas: [] };
        }
        continue;
      }
    }

    if (skipping) continue;

    const body = line.trim();
    if (!body) continue;

    // Navigation list items.
    if (inNav) {
      if (/^only include/i.test(body)) continue;
      if (/^no (additional|extra|other)/i.test(body)) { inNav = false; continue; }
      const bm = body.match(BULLET_RE);
      const item = clean(bm ? bm[1] : body);
      if (item && item.length <= 24) nav.push(item);
      continue;
    }

    // Labelled field (Headline:, Buttons:, Categories: …).
    const fm = body.match(FIELD_RE);
    if (fm && cur) {
      const label = fm[1].toLowerCase();
      const val = clean(fm[2]);
      if (/headline/.test(label) && !/sub/.test(label)) cur.headline = val || cur.headline;
      else if (/sub/.test(label)) cur.subheadline = val || cur.subheadline;
      else if (/button|cta|call to action/.test(label)) cur.ctas.push(...splitItems(val));
      else if (/categor|collection|product/.test(label)) cur.items.push(...splitItems(val));
      else if (/title|tagline/.test(label)) cur.headline = cur.headline || val;
      continue;
    }

    // Bullet item.
    const bm = body.match(BULLET_RE);
    if (bm && cur) {
      const item = clean(bm[1]);
      if (item) cur.items.push(item);
      continue;
    }

    // Prose line → body.
    if (cur) cur.body += (cur.body ? ' ' : '') + clean(body);
  }
  flush();

  // De-dupe items per section.
  for (const s of sections) {
    const seen = new Set<string>();
    s.items = s.items.filter(i => { const k = i.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    s.ctas = [...new Set(s.ctas)];
  }

  return { isStructured, nav, sections };
}
