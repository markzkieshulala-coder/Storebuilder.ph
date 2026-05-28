import { createOrchestrator } from './bootstrap';
import { renderMultiPageSite, detectNiche } from './html-renderer';
import type { ISharedContext } from './core/types';
import type { ScoringArtifact } from './engines/scoring';
import type { PromptUnderstandingObject } from './prompt-engine';

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

  const multiPage = renderMultiPageSite(context, brandName, subdomain, understanding);
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
