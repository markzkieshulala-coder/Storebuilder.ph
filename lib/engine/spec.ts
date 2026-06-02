// ---------------------------------------------------------------------------
// WEBSITE SPECIFICATION — Phase 1: source of truth for section inclusion.
//
// WebsiteSpec owns the answer to exactly two questions:
//   1. Which sections MUST appear in the rendered site?
//   2. Which sections MUST NEVER appear?
//
// The layout composer (composeLayoutGraph) still owns visual structure — node
// variants, ordering, spacing, and density. That is Phase 2. What it can no
// longer do is decide which semantic sections exist. That decision now lives
// here, built once per render, and threaded into every downstream consumer.
//
// Priority order for section inclusion:
//   1. extractRequirements(prompt)            — direct user directives (highest)
//   2. puo.customAttributes.llm.sections      — NLU-inferred gap-fill
//   3. puo.customAttributes.llm.excludedSections — additional forbidden
//
// An explicit "do not include X" always beats any affirmative inference.
// ---------------------------------------------------------------------------

import { canonicalKind, extractRequirements, type SectionKind } from './requirements';
import type { PromptUnderstandingObject } from './prompt-engine';

export interface WebsiteSpec {
  /** Canonical kinds the rendered site must contain. Source: requirements + NLU. */
  sections: SectionKind[];
  /** Canonical kinds that must never appear. Source: requirements + NLU exclusions. */
  forbiddenSections: SectionKind[];
}

function canonicalKindsOf(raw: unknown): SectionKind[] {
  if (!Array.isArray(raw)) return [];
  const out: SectionKind[] = [];
  for (const r of raw) {
    const k = canonicalKind(String(r));
    if (k && k !== 'cta' && !out.includes(k)) out.push(k);
  }
  return out;
}

/**
 * Build the WebsiteSpec — the sole source of truth for section inclusion.
 *
 * Call once per render, before composing the layout graph or building any
 * section HTML. Pass the returned spec into buildHomeMain as the authority
 * for what must and must not be rendered.
 */
export function buildWebsiteSpec(
  prompt: string,
  puo: PromptUnderstandingObject,
): WebsiteSpec {
  // Priority 1: what the prompt text directly and unambiguously states.
  const requirements = extractRequirements(prompt);

  // Priority 2: NLU-inferred sections and exclusions from the understanding object.
  const llm = (
    puo.customAttributes as { llm?: Record<string, unknown> } | undefined
  )?.llm;
  const nluSections  = canonicalKindsOf(llm?.sections);
  const nluExcluded  = canonicalKindsOf(llm?.excludedSections);

  // Forbidden is the union of prompt directives and NLU exclusions.
  // An explicit "do not include X" always wins — even over NLU inference.
  const forbidden = new Set<SectionKind>([
    ...requirements.forbidden,
    ...nluExcluded,
  ]);

  // Required: prompt requirements first, then NLU gap-fill, minus any forbidden.
  const required = new Set<SectionKind>();
  for (const k of requirements.required) {
    if (!forbidden.has(k)) required.add(k);
  }
  for (const k of nluSections) {
    if (!forbidden.has(k)) required.add(k);
  }

  return {
    sections:          [...required],
    forbiddenSections: [...forbidden],
  };
}
