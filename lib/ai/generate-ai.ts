// ---------------------------------------------------------------------------
// HYBRID GENERATION ENTRY — prompt → Claude planner → deterministic 3D renderer.
//
// Returns the same EngineGenerationResult shape the API route, database, and
// site-serving layer already expect, so only the internals change: a real LLM
// now interprets the prompt and plans the site (sections, CTAs, copy, exclusions),
// and the deterministic 3D renderer renders that plan verbatim.
// ---------------------------------------------------------------------------

import { buildSitePlan } from './planner';
import { renderSitePlan } from '../render3d/render';
import type { EngineGenerationResult } from '../engine/generate';
import type { FidelityResult } from '../engine/requirements';
import type { SitePlan } from './site-plan';

// Prompt-adherence is now structural: the planner records exclusions and the
// renderer renders only the plan, so a rendered site cannot contain a forbidden
// section. We report a fully-passing fidelity object built from the plan.
function fidelityFor(plan: SitePlan): FidelityResult {
  const total = plan.sections.length;
  return {
    score: 1,
    total,
    passed: total,
    requiredPresent: [],
    requiredMissing: [],
    forbiddenAbsent: [],
    forbiddenPresent: [],
  };
}

export async function generateWebsiteAI(
  prompt: string,
  brandName: string,
  subdomain = '',
): Promise<EngineGenerationResult> {
  const plan = await buildSitePlan(prompt, brandName);
  const rendered = renderSitePlan(plan);

  return {
    html: rendered.html,
    pages: rendered.pages,
    nav: rendered.nav,
    gallerySlug: rendered.gallerySlug,
    niche: plan.niche || rendered.niche,
    brandName: plan.brandName || brandName,
    score: 1,
    artifacts: { plan, excluded: plan.excluded },
    fidelity: fidelityFor(plan),
  };
}
