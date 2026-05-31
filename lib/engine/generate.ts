import { createOrchestrator } from './bootstrap';
import { renderMultiPageSite, planSiteImagery, detectNiche } from './html-renderer';
import { fetchSiteImagery } from './image-provider';
import type { ResolvedImagery } from './pexels';
import type { ISharedContext } from './core/types';
import type { ScoringArtifact } from './engines/scoring';
import type { PromptUnderstandingObject } from './prompt-engine';

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
  const orchestrator = createOrchestrator({ logEvents: false, persistMemory: false });

  const context = await orchestrator.run({
    userPrompt: prompt,
    constraints: {
      targetFramework: 'react',
      motionComplexity: 'high',
      responsiveBreakpoints: ['mobile', 'tablet', 'desktop'],
      accessibilityLevel: 'wcag2-aa',
    },
  }) as ISharedContext;

  if (context.errors.length > 0) {
    throw new Error(`Pipeline failed: ${context.errors.map((e) => e.message).join('; ')}`);
  }

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

  return {
    html: multiPage.primaryPage,
    pages: multiPage.pages,
    nav: multiPage.nav,
    gallerySlug: multiPage.gallerySlug,
    niche: understanding?.inferredIndustry || detectNiche(prompt),
    brandName,
    score: scoring?.overall ?? 0,
    artifacts: context.artifacts,
  };
}
