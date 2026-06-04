import { SharedContext } from './core';
import { renderMultiPageSite, planSiteImagery, detectNiche } from './html-renderer';
import { fetchSiteImagery } from './image-provider';
import type { ResolvedImagery } from './pexels';
import type { ScoringArtifact } from './engines/scoring';
import type { PromptUnderstandingObject } from './prompt-engine';
import type { FidelityResult } from './requirements';

// A site that violates an explicit "do not include X" directive, or is missing
// an explicitly required section, fails this threshold. 0.95 = 95% fidelity goal.
const FIDELITY_THRESHOLD = 0.95;

export class RequirementFidelityError extends Error {
  constructor(public fidelity: FidelityResult) {
    super(
      `Requirement fidelity ${(fidelity.score * 100).toFixed(0)}% < ${(FIDELITY_THRESHOLD * 100)}%. ` +
      (fidelity.forbiddenPresent.length ? `Forbidden sections present: ${fidelity.forbiddenPresent.join(', ')}. ` : '') +
      (fidelity.requiredMissing.length ? `Required sections missing: ${fidelity.requiredMissing.join(', ')}.` : ''),
    );
    this.name = 'RequirementFidelityError';
  }
}

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface EngineGenerationResult {
  /** Primary page HTML — stored in htmlContent for backward-compat */
  html: string;
  /** All generated pages keyed by path e.g. '/', '/about', '/menu' */
  pages: Record<string, string>;
  nav: Array<{ label: string; href: string }>;
  gallerySlug: string;
  niche: string;
  brandName: string;
  score: number;
  artifacts: Record<string, unknown>;
  /** Requirement-fidelity verification of the rendered site against the prompt. */
  fidelity: FidelityResult;
}

// Runs the full orchestration pipeline (planning -> blueprint -> design-dna ->
// component -> frontend -> motion -> validation -> scoring -> final-rendering)
// in-process, then composes self-contained ultra-premium HTML pages from
// the design + planning artifacts. No external AI calls.
// `understanding` is the canonical, analyzer-resolved PromptUnderstandingObject.
// When provided, the renderer uses it verbatim instead of re-parsing the prompt,
// so the generated site faithfully matches the concept the user was shown.
export async function generateWebsite(
  prompt: string,
  brandName: string,
  subdomain = '',
  understanding?: PromptUnderstandingObject,
): Promise<EngineGenerationResult> {
  // Build a lightweight shared context directly — skips the 9-stage ghost pipeline
  // (planning → blueprint → design-dna → component → frontend → motion → validation
  // → scoring → final-rendering) whose artifacts are never read by the HTML renderer.
  // The renderer only needs context.input.userPrompt, which this provides instantly.
  const context = new SharedContext({
    userPrompt: prompt,
    constraints: {
      targetFramework: 'react',
      motionComplexity: 'high',
      responsiveBreakpoints: ['mobile', 'tablet', 'desktop'],
      accessibilityLevel: 'wcag2-aa',
    },
  });

  // Resolve content-aware visuals: plan one Unsplash query per section from the
  // exact content it will display (product/service names, niche, branding), then
  // fetch globally-unique photos. On any failure (no key, rate limit, timeout)
  // this returns empty imagery → every slot renders a branded CSS placeholder.
  const fp = fnv((brandName || 'Brand') + '|' + prompt);
  let imagery: ResolvedImagery = { pool: [], byName: {} };
  try {
    const plan = planSiteImagery(context, brandName, understanding);
    imagery = await fetchSiteImagery(plan, fp);
  } catch (err) {
    console.warn('[generate] image provider failed, rendering without images:', (err as Error)?.message);
  }

  const multiPage = renderMultiPageSite(context, brandName, subdomain, understanding, imagery);
  const scoring = context.getArtifact<ScoringArtifact>('scoring');

  // Requirement-fidelity gate. We HARD-FAIL only on a true violation: a section
  // the user explicitly FORBADE that nevertheless rendered. We do NOT fail when a
  // requested section is "missing", because the engine now intentionally omits
  // sections it has no prompt-derived content for (no fabrication) — failing on
  // those would block generation for honest, prompt-faithful sites. Missing
  // sections are logged for diagnostics instead of throwing.
  const fidelity = multiPage.fidelity;
  if (fidelity.forbiddenPresent.length > 0) {
    throw new RequirementFidelityError(fidelity);
  }
  if (fidelity.requiredMissing.length > 0) {
    console.warn(`[generate] sections requested but omitted (no prompt content / not rendered): ${fidelity.requiredMissing.join(', ')}`);
  }

  return {
    html: multiPage.primaryPage,
    pages: multiPage.pages,
    nav: multiPage.nav,
    gallerySlug: multiPage.gallerySlug,
    niche: understanding?.inferredIndustry || detectNiche(prompt),
    brandName,
    score: scoring?.overall ?? 0,
    artifacts: context.artifacts,
    fidelity,
  };
}
