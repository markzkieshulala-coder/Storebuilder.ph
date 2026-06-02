// ---------------------------------------------------------------------------
// REQUIREMENT ENFORCEMENT + FIDELITY SCORING
//
// Single source of truth for: (1) what sections the user REQUIRED, (2) what
// sections the user FORBADE, (3) mapping free-text to canonical section kinds,
// (4) detecting which kinds a rendered page actually contains, and (5) scoring
// how faithfully the rendered site honoured the user's stated requirements.
//
// This module is the contract the renderer enforces and the gate generate.ts
// checks. It is 100% in-process and dependency-free — no external AI, no network.
// ---------------------------------------------------------------------------

export type SectionKind =
  | 'newsletter' | 'booking' | 'location' | 'blog' | 'events'
  | 'testimonials' | 'faq' | 'stats' | 'team' | 'pricing'
  | 'products' | 'gallery' | 'story' | 'features' | 'contact' | 'cta';

export const ALL_SECTION_KINDS: SectionKind[] = [
  'newsletter','booking','location','blog','events','testimonials','faq',
  'stats','team','pricing','products','gallery','story','features','contact','cta',
];

// ── Canonical kind mapping ───────────────────────────────────────────────────
// Map any free-text section phrase the user wrote → a canonical kind the
// renderer can produce. Ordering matters: more specific patterns first.
const KIND_TABLE: Array<[RegExp, SectionKind]> = [
  [/news\s*letter|subscribe|sign\s*up|signup|mailing list|email list/, 'newsletter'],
  [/book|appointment|schedul|reserv|enquiry|inquiry|request a (quote|callback|consultation)/, 'booking'],
  [/map|location|directions|find us|store locator|opening hours|hours of operation|address/, 'location'],
  [/blog|articles?|insights|journal|news section|stories section/, 'blog'],
  [/events?|calendar|workshops?|timetable/, 'events'],
  [/testimonial|reviews?|client feedback|what (people|clients|customers) say/, 'testimonials'],
  [/faqs?|frequently asked|questions section|help section/, 'faq'],
  [/stat|metric|by the numbers/, 'stats'],
  // Athletes / players / roster belong to a "team / featured people" section
  [/team|staff|coaches|trainers|practitioners|athletes?|players?|roster|line\s*up|ambassadors?/, 'team'],
  [/pricing|price list|plans|packages|tiers?|rates|membership options|loyalty|rewards program|points program/, 'pricing'],
  // Product / catalog / collection / merch / editions
  [/menu|products?|shop|store|catalog|collections?|lookbook|new arrivals|jerseys?|shoes|sneakers|apparel|merch|limited edition|special edition|drops?/, 'products'],
  [/gallery|portfolio|showcase|photos|moments|instagram|lookbook/, 'gallery'],
  [/about|story|heritage|journey|mission|values|who we are/, 'story'],
  [/feature|benefit|why (us|choose)|what we (offer|do)|services|offerings|how it works|class(es)?|programs?|courses?|lessons?|sessions?|workouts?|treatments?/, 'features'],
  [/contact|get in touch|reach us|visit us|contact page/, 'contact'],
  [/cta|call to action/, 'cta'],
];

export function canonicalKind(raw: string): SectionKind | null {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  for (const [re, kind] of KIND_TABLE) if (re.test(s)) return kind;
  return null;
}

// ── Rendered-kind detection ──────────────────────────────────────────────────
// Detect which canonical kinds appear in a chunk of RENDERED section HTML.
// These match the structural markers the renderer's section builders emit, so
// detection is precise on a single section fragment OR a whole page body.
// NOTE: must be run on rendered <section> bodies, not the full document (whose
// <style> block contains class names like `.faq-list` that aren't real sections).
const RENDER_MARKERS: Array<[RegExp, SectionKind]> = [
  [/newsletter-section/, 'newsletter'],
  [/booking-section/, 'booking'],
  [/location-section/, 'location'],
  [/blog-section/, 'blog'],
  [/events-section/, 'events'],
  [/testimonial-card/, 'testimonials'],
  [/class="faq-list reveal"/, 'faq'],
  [/stat-number|class="stat\b/, 'stats'],
  [/People Behind|>Our Team<|team-card/, 'team'],
  [/price-grid|price-card/, 'pricing'],
  [/product-grid|product-card/, 'products'],
  [/gallery-grid/, 'gallery'],
  [/split-section/, 'story'],
  [/card-icon/, 'features'],
  [/contact-detail|>Get in Touch<|>Contact</, 'contact'],
  [/signal-section/, 'cta'],
];

export function detectRenderedKinds(html: string): Set<SectionKind> {
  const present = new Set<SectionKind>();
  for (const [re, kind] of RENDER_MARKERS) if (re.test(html)) present.add(kind);
  return present;
}

// ── Negative-constraint detection ────────────────────────────────────────────
// A clause is a "do not" directive if it explicitly tells us to omit content.
// We deliberately require an exclusion verb so ordinary prose ("no-contract",
// "without delay") never strips a section the user actually wants.
const NEG_DIRECTIVE = new RegExp(
  [
    '\\b(?:do\\s+not|don\'?t|please\\s+(?:do\\s+not|don\'?t))\\s+(?:include|add|use|show|display|put|have|want|feature|insert)\\b',
    '\\b(?:no\\s+need\\s+for|without|exclude|excluding|omit|skip|leave\\s+out|avoid|never\\s+(?:include|add|show))\\b',
    '\\bno\\s+\\w+(?:\\s+\\w+)?\\s+(?:section|sections|page|pages|block|blocks)\\b',
    '\\bi\\s+(?:do\\s+not|don\'?t)\\s+want\\b',
    '\\bwe\\s+(?:do\\s+not|don\'?t)\\s+want\\b',
  ].join('|'),
  'i',
);

// Split a prompt into clauses (sentences + bullet lines) and classify each as a
// negative directive or positive content. Preserves clauses as discrete items so
// a "Requirements:" bullet list maps one canonical kind per line.
function splitClauses(text: string): { positiveClauses: string[]; negativeClauses: string[] } {
  const clauses = text.split(/(?<=[.!?])\s+|\n+/).map(c => c.trim()).filter(Boolean);
  const negativeClauses: string[] = [];
  const positiveClauses: string[] = [];
  for (const c of clauses) {
    if (NEG_DIRECTIVE.test(c)) negativeClauses.push(c);
    else positiveClauses.push(c);
  }
  return { positiveClauses, negativeClauses };
}

// Map a negative clause to the canonical kinds it forbids. We scan the clause
// for every section keyword (not just the first) so "no testimonials or FAQs"
// forbids both.
function forbiddenKindsInClause(clause: string): SectionKind[] {
  const out = new Set<SectionKind>();
  for (const [re, kind] of KIND_TABLE) {
    // Avoid over-broad kinds in negations: 'features'/'contact'/'story' patterns
    // are too generic and would mis-fire on phrases like "no placeholder content".
    if (kind === 'features' || kind === 'contact' || kind === 'story' || kind === 'cta') continue;
    if (re.test(clause.toLowerCase())) out.add(kind);
  }
  return [...out];
}

// ── Requirement extraction ───────────────────────────────────────────────────
export interface RequirementSet {
  /** Canonical kinds the user explicitly asked for. */
  required: SectionKind[];
  /** Canonical kinds the user explicitly forbade. */
  forbidden: SectionKind[];
  /** The user's literal requested phrases, for reporting. */
  rawRequired: string[];
  /** The user's literal forbidding clauses, for reporting. */
  rawForbidden: string[];
}

export function extractRequirements(prompt: string): RequirementSet {
  const text = (prompt || '').replace(/[""„‟″]/g, '"').replace(/[''‚‛′]/g, "'");
  const { positiveClauses, negativeClauses } = splitClauses(text);

  // Forbidden — from the negative directives ONLY.
  const forbidden = new Set<SectionKind>();
  const rawForbidden: string[] = [];
  for (const clause of negativeClauses) {
    const kinds = forbiddenKindsInClause(clause);
    if (kinds.length) { rawForbidden.push(clause); kinds.forEach(k => forbidden.add(k)); }
  }

  // Required — one canonical kind per positive clause (negations already stripped).
  // A "Requirements:" bullet list yields one requirement per line.
  const required = new Set<SectionKind>();
  const rawRequired: string[] = [];
  for (const clause of positiveClauses) {
    const phrase = clause.replace(/^[-*•·\d.)\s]+/, '').trim();
    if (!phrase || phrase.length > 80) continue;
    const kind = canonicalKind(phrase);
    if (!kind || kind === 'cta') continue;
    if (forbidden.has(kind)) continue; // an explicit "do not" always wins
    if (!required.has(kind)) { required.add(kind); rawRequired.push(phrase); }
  }

  return {
    required: [...required],
    forbidden: [...forbidden],
    rawRequired,
    rawForbidden,
  };
}

// ── Fidelity scoring ─────────────────────────────────────────────────────────
export interface FidelityResult {
  score: number;                    // 0..1 — fraction of requirement checks passed
  total: number;                    // number of checks (required + forbidden)
  passed: number;
  requiredPresent: SectionKind[];
  requiredMissing: SectionKind[];
  forbiddenAbsent: SectionKind[];
  forbiddenPresent: SectionKind[];  // violations — these MUST be empty
}

// Score the rendered HTML against a requirement set. Every required kind must be
// present and every forbidden kind must be absent; each is one check.
export function scoreFidelity(req: RequirementSet, renderedSectionsHtml: string): FidelityResult {
  const present = detectRenderedKinds(renderedSectionsHtml);

  const requiredPresent: SectionKind[] = [];
  const requiredMissing: SectionKind[] = [];
  for (const k of req.required) (present.has(k) ? requiredPresent : requiredMissing).push(k);

  const forbiddenAbsent: SectionKind[] = [];
  const forbiddenPresent: SectionKind[] = [];
  for (const k of req.forbidden) (present.has(k) ? forbiddenPresent : forbiddenAbsent).push(k);

  const total = req.required.length + req.forbidden.length;
  const passed = requiredPresent.length + forbiddenAbsent.length;
  const score = total === 0 ? 1 : passed / total;

  return { score, total, passed, requiredPresent, requiredMissing, forbiddenAbsent, forbiddenPresent };
}

// ── Enforcement ──────────────────────────────────────────────────────────────
// Filter already-rendered section fragments to DROP any whose detected kind is
// forbidden, then ENSURE every required kind is present by injecting the ones
// the composed layout omitted. The injector is supplied by the renderer so this
// module stays free of rendering concerns.
export interface EnforceResult {
  sections: string[];               // final, compliant section fragments
  dropped: SectionKind[];           // forbidden kinds that were removed
  injected: SectionKind[];          // required kinds that had to be added
}

export function enforceSections(
  rendered: string[],
  required: SectionKind[],
  forbidden: SectionKind[],
  inject: (kind: SectionKind) => string,
  headingOf: (html: string) => string | null,
): EnforceResult {
  const forbiddenSet = new Set(forbidden);
  const dropped: SectionKind[] = [];

  // 1. Drop forbidden fragments (catches composer-emitted testimonials/FAQ etc.)
  const kept = rendered.filter(frag => {
    const kinds = detectRenderedKinds(frag);
    for (const k of kinds) {
      if (forbiddenSet.has(k)) { if (!dropped.includes(k)) dropped.push(k); return false; }
    }
    return true;
  });

  // 2. Ensure every required (non-forbidden) kind is present; inject if missing.
  const present = detectRenderedKinds(kept.join('\n'));
  const seenHeadings = new Set<string>();
  for (const frag of kept) { const h = headingOf(frag); if (h) seenHeadings.add(h); }

  const injected: SectionKind[] = [];
  const toInject: string[] = [];
  for (const kind of required) {
    if (forbiddenSet.has(kind)) continue;
    if (present.has(kind)) continue;
    let html = '';
    try { html = inject(kind); } catch { html = ''; }
    if (!html) continue;
    // Never let an injected section be (or contain) a forbidden kind
    const injKinds = detectRenderedKinds(html);
    if ([...injKinds].some(k => forbiddenSet.has(k))) continue;
    const h = headingOf(html);
    if (h && seenHeadings.has(h)) continue;
    if (h) seenHeadings.add(h);
    present.add(kind);
    toInject.push(html);
    injected.push(kind);
  }

  // Slot injected sections before the closing CTA so the page still ends on its CTA.
  let insertAt = kept.length;
  for (let i = kept.length - 1; i >= 0; i--) {
    if (/signal-section/.test(kept[i])) { insertAt = i; break; }
  }
  const sections = [...kept];
  sections.splice(insertAt, 0, ...toInject);

  return { sections, dropped, injected };
}
