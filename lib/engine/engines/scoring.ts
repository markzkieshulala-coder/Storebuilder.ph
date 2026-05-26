import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface ScoringArtifact {
  type: 'scoring';
  overall: number;
  dimensions: DimensionScore[];
  breakdown: Record<string, CategoryScore>;
  recommendations: string[];
}

export interface DimensionScore {
  name: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
}

export interface CategoryScore {
  score: number;
  max: number;
  checks: string[];
  issues: string[];
}

export class ScoringEngine extends BaseEngine<unknown, ScoringArtifact> {
  readonly name: EngineName = 'scoring';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['validation'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<ScoringArtifact>> {
    const validation = input.context.getArtifact<{ checks: Array<{ category: string; passed: boolean }>; issues: Array<{ severity: string; message: string }>; summary: { total: number; passed: number; errors: number; warnings: number } }>('validation');

    if (!validation) {
      return this.createFailureOutput('Missing validation artifact');
    }

    try {
      const dimensions = this.calculateDimensions(validation);
      const overall = Math.round(dimensions.reduce((sum, d) => sum + d.weightedScore, 0));
      const breakdown = this.buildBreakdown(validation);
      const recommendations = this.generateRecommendations(validation, dimensions);

      const artifact: ScoringArtifact = {
        type: 'scoring',
        overall,
        dimensions,
        breakdown,
        recommendations,
      };

      const logs = [this.createLog('info', `Pipeline scored: ${overall}/100`, { dimensions }, 'scoring')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private calculateDimensions(validation: any): DimensionScore[] {
    const categories = ['structure', 'accessibility', 'performance', 'security', 'seo'];
    const weights: Record<string, number> = {
      structure: 0.25,
      accessibility: 0.20,
      performance: 0.20,
      security: 0.15,
      seo: 0.20,
    };

    return categories.map((cat) => {
      const checks = validation.checks.filter((c: any) => c.category === cat);
      const passed = checks.filter((c: any) => c.passed).length;
      const max = checks.length || 1;
      const rawScore = Math.round((passed / max) * 100);
      const weight = weights[cat] || 0.2;
      return {
        name: cat,
        weight,
        rawScore,
        weightedScore: rawScore * weight,
      };
    });
  }

  private buildBreakdown(validation: any): Record<string, CategoryScore> {
    const categories = ['structure', 'accessibility', 'performance', 'security', 'seo'];
    const result: Record<string, CategoryScore> = {};

    for (const cat of categories) {
      const checks = validation.checks.filter((c: any) => c.category === cat);
      const passed = checks.filter((c: any) => c.passed).length;
      const issues = validation.issues.filter((i: any) => {
        const check = checks.find((c: any) => c.id === i.checkId);
        return !!check;
      });

      result[cat] = {
        score: Math.round((passed / (checks.length || 1)) * 100),
        max: 100,
        checks: checks.map((c: any) => c.name),
        issues: issues.map((i: any) => i.message),
      };
    }

    return result;
  }

  private generateRecommendations(validation: any, dimensions: DimensionScore[]): string[] {
    const recs: string[] = [];
    const lowest = dimensions.sort((a, b) => a.rawScore - b.rawScore)[0];

    if (lowest.rawScore < 70) {
      recs.push(`Focus on improving ${lowest.name}: current score is ${lowest.rawScore}`);
    }

    if (validation.summary.errors > 0) {
      recs.push(`Address ${validation.summary.errors} critical errors before deployment`);
    }

    if (validation.summary.warnings > 5) {
      recs.push('High warning count suggests review of generated artifacts is needed');
    }

    if (recs.length === 0) {
      recs.push('All dimensions scoring well — ready for final rendering');
    }

    return recs;
  }
}
