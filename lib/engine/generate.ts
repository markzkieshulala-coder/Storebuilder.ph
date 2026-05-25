import { createOrchestrator } from './bootstrap';
import { renderSiteHtml } from './html-renderer';
import type { ISharedContext } from './core/types';
import type { PlanningArtifact } from './engines/planning';
import type { ScoringArtifact } from './engines/scoring';

export interface EngineGenerationResult {
  html: string;
  niche: string;
  brandName: string;
  score: number;
  artifacts: Record<string, unknown>;
}

function deriveNiche(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('restaurant') || p.includes('ramen') || p.includes('cafe') || p.includes('food')) return 'restaurant';
  if (p.includes('portfolio') || p.includes('photographer')) return 'portfolio';
  if (p.includes('shop') || p.includes('store') || p.includes('apparel') || p.includes('fashion')) return 'ecommerce';
  if (p.includes('agency') || p.includes('studio')) return 'agency';
  if (p.includes('saas') || p.includes('software') || p.includes('app')) return 'saas';
  return 'business';
}

// Runs the full 9-stage orchestration pipeline (planning -> blueprint ->
// design-dna -> component -> frontend -> motion -> validation -> scoring ->
// final-rendering) entirely in-process, then composes a self-contained HTML
// document from the design + planning artifacts. No external AI calls.
export async function generateWebsite(
  prompt: string,
  brandName: string,
): Promise<EngineGenerationResult> {
  const orchestrator = createOrchestrator({ logEvents: false, persistMemory: false });

  const context = await orchestrator.run({
    userPrompt: prompt,
    constraints: {
      targetFramework: 'react',
      motionComplexity: 'medium',
      responsiveBreakpoints: ['mobile', 'tablet', 'desktop'],
      accessibilityLevel: 'wcag2-aa',
    },
  }) as ISharedContext;

  if (context.errors.length > 0) {
    throw new Error(`Pipeline failed: ${context.errors.map((e: { message: string }) => e.message).join('; ')}`);
  }

  const html = renderSiteHtml(context, brandName);
  const plan = context.getArtifact<PlanningArtifact>('planning');
  const scoring = context.getArtifact<ScoringArtifact>('scoring');

  return {
    html,
    niche: deriveNiche(prompt),
    brandName,
    score: scoring?.overall ?? 0,
    artifacts: context.artifacts,
  };
}
