import { createOrchestrator } from './bootstrap';
import { renderSiteHtml, detectNiche } from './html-renderer';
import type { ISharedContext } from './core/types';
import type { ScoringArtifact } from './engines/scoring';

export interface EngineGenerationResult {
  html: string;
  niche: string;
  brandName: string;
  score: number;
  artifacts: Record<string, unknown>;
}

// Runs the full orchestration pipeline (planning -> blueprint -> design-dna ->
// component -> frontend -> motion -> validation -> scoring -> final-rendering)
// in-process, then composes a self-contained ultra-premium HTML document from
// the design + planning artifacts. No external AI calls.
export async function generateWebsite(
  prompt: string,
  brandName: string,
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

  const html = renderSiteHtml(context, brandName);
  const scoring = context.getArtifact<ScoringArtifact>('scoring');

  return {
    html,
    niche: detectNiche(prompt),
    brandName,
    score: scoring?.overall ?? 0,
    artifacts: context.artifacts,
  };
}
