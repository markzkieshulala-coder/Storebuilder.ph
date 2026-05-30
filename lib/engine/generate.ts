import { createOrchestrator } from './bootstrap';
import { renderMultiPageSite, detectNiche } from './html-renderer';
import { generateSiteImages } from './image-provider';
import type { ISharedContext } from './core/types';
import type { ScoringArtifact } from './engines/scoring';
import type { PromptUnderstandingObject } from './prompt-engine';
import { parsePrompt } from './prompt-engine';

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

  // Fetch the site's images from the pluggable image provider (lib/engine/
  // image-provider.ts — wire your own image generator in there). When it returns
  // an empty list, every image slot renders as a neutral CSS placeholder.
  const puo = understanding ?? (() => {
    const r = parsePrompt(prompt);
    return r.success ? r.object : parsePrompt('modern professional website').object;
  })();
  const fp = fnv((brandName || 'Brand') + '|' + prompt);
  let images: string[] = [];
  try {
    images = await generateSiteImages(puo, fp, brandName);
  } catch (err) {
    console.warn('[generate] image provider failed, rendering without images:', (err as Error)?.message);
  }

  const multiPage = renderMultiPageSite(context, brandName, subdomain, understanding, images);
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
