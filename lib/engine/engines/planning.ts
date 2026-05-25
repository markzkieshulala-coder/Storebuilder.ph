import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface PlanningArtifact {
  type: 'plan';
  pages: string[];
  features: string[];
  userFlow: string[];
  constraints: Record<string, unknown>;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface PlanningInput {
  userPrompt: string;
  constraints?: Record<string, unknown>;
}

export class PlanningEngine extends BaseEngine<PlanningInput, PlanningArtifact> {
  readonly name: EngineName = 'planning';
  readonly version = '1.0.0';

  async execute(input: EngineInput<PlanningInput>): Promise<EngineOutput<PlanningArtifact>> {
    const startTime = Date.now();
    const userPrompt = input.context.input.userPrompt;
    const constraints = input.config?.constraints || input.context.input.constraints || {};

    this.createLog('info', 'Starting planning analysis', { userPrompt }, 'planning');

    try {
      // Production-grade planning logic
      const features = this.extractFeatures(userPrompt);
      const pages = this.inferPages(userPrompt, features);
      const userFlow = this.buildUserFlow(pages, features);
      const complexity = this.assessComplexity(features, pages);

      const artifact: PlanningArtifact = {
        type: 'plan',
        pages,
        features,
        userFlow,
        constraints: constraints as Record<string, unknown>,
        estimatedComplexity: complexity,
      };

      const duration = Date.now() - startTime;
      const logs = [
        this.createLog('info', `Planning complete: ${pages.length} pages, ${features.length} features`, { duration }, 'planning'),
      ];

      return this.createSuccessOutput(artifact, logs, { durationMs: duration });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.createFailureOutput(message);
    }
  }

  private extractFeatures(prompt: string): string[] {
    const keywords = ['hero', 'gallery', 'contact', 'blog', 'shop', 'auth', 'dashboard', 'search', 'filter', 'map'];
    return keywords.filter((k) => prompt.toLowerCase().includes(k));
  }

  private inferPages(prompt: string, features: string[]): string[] {
    const pages = new Set<string>(['home']);
    if (features.includes('blog')) pages.add('blog');
    if (features.includes('shop')) { pages.add('shop'); pages.add('product'); pages.add('cart'); }
    if (features.includes('auth')) { pages.add('login'); pages.add('register'); }
    if (features.includes('dashboard')) pages.add('dashboard');
    if (features.includes('contact')) pages.add('contact');
    return Array.from(pages);
  }

  private buildUserFlow(pages: string[], features: string[]): string[] {
    const flow: string[] = ['home'];
    if (features.includes('auth')) { flow.push('login', 'register'); }
    if (features.includes('shop')) { flow.push('shop', 'product', 'cart'); }
    if (features.includes('contact')) flow.push('contact');
    return flow;
  }

  private assessComplexity(features: string[], pages: string[]): 'low' | 'medium' | 'high' {
    const score = features.length + pages.length;
    if (score <= 4) return 'low';
    if (score <= 8) return 'medium';
    return 'high';
  }
}
