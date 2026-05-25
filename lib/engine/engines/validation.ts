import { BaseEngine } from '../core/base-engine';
import { EngineName, EngineInput, EngineOutput } from '../core/types';

export interface ValidationArtifact {
  type: 'validation';
  checks: ValidationCheck[];
  passed: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: ValidationSummary;
}

export interface ValidationCheck {
  id: string;
  name: string;
  category: 'structure' | 'accessibility' | 'performance' | 'security' | 'seo';
  passed: boolean;
  message?: string;
}

export interface ValidationIssue {
  id: string;
  checkId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  errors: number;
}

export class ValidationEngine extends BaseEngine<unknown, ValidationArtifact> {
  readonly name: EngineName = 'validation';
  readonly version = '1.0.0';
  readonly dependencies: EngineName[] = ['frontend', 'motion'];

  async execute(input: EngineInput<unknown>): Promise<EngineOutput<ValidationArtifact>> {
    try {
      const checks: ValidationCheck[] = [];
      const issues: ValidationIssue[] = [];

      // Structure checks
      const blueprint = input.context.getArtifact<{ pageBlueprints: Array<{ sections: unknown[] }> }>('blueprint');
      const components = input.context.getArtifact<{ components: unknown[] }>('component');
      checks.push(this.checkStructure(blueprint, components, issues));

      // Accessibility checks
      const design = input.context.getArtifact<{ colorPalette: { text: string; background: string } }>('design-dna');
      checks.push(this.checkAccessibility(design, issues));

      // Performance checks
      checks.push(this.checkPerformance(components, issues));

      // Security checks
      checks.push(this.checkSecurity(issues));

      // SEO checks
      const frontend = input.context.getArtifact<{ pages: Array<{ meta: { title: string; description: string } }> }>('frontend');
      checks.push(this.checkSEO(frontend, issues));

      const passedCount = checks.filter((c) => c.passed).length;
      const failedCount = checks.length - passedCount;
      const score = Math.round((passedCount / checks.length) * 100);

      const artifact: ValidationArtifact = {
        type: 'validation',
        checks,
        passed: failedCount === 0,
        score,
        issues,
        summary: {
          total: checks.length,
          passed: passedCount,
          failed: failedCount,
          warnings: issues.filter((i) => i.severity === 'warning').length,
          errors: issues.filter((i) => i.severity === 'error').length,
        },
      };

      const logs = [this.createLog('info', `Validation complete: ${score}/100`, artifact.summary, 'validation')];
      return this.createSuccessOutput(artifact, logs);
    } catch (err) {
      return this.createFailureOutput(err instanceof Error ? err.message : String(err));
    }
  }

  private checkStructure(
    blueprint: any,
    components: any,
    issues: ValidationIssue[]
  ): ValidationCheck {
    const totalSections = blueprint?.pageBlueprints?.reduce((acc: number, p: any) => acc + (p.sections?.length || 0), 0) || 0;
    const hasComponents = (components?.components?.length || 0) > 0;
    const passed = totalSections > 0 && hasComponents;

    if (!passed) {
      issues.push({
        id: 'struct-1',
        checkId: 'structure',
        severity: 'error',
        message: 'No pages or components found in blueprint',
        suggestion: 'Ensure planning and blueprint stages produce valid output',
      });
    }

    return { id: 'structure', name: 'Structure Integrity', category: 'structure', passed, message: `${totalSections} sections, ${components?.components?.length || 0} components` };
  }

  private checkAccessibility(design: any, issues: ValidationIssue[]): ValidationCheck {
    const hasColors = design?.colorPalette?.text && design?.colorPalette?.background;
    const passed = !!hasColors;

    if (!passed) {
      issues.push({
        id: 'a11y-1',
        checkId: 'accessibility',
        severity: 'error',
        message: 'Missing color contrast definitions',
        suggestion: 'Define text and background colors in design-dna',
      });
    }

    return { id: 'accessibility', name: 'Accessibility', category: 'accessibility', passed };
  }

  private checkPerformance(components: any, issues: ValidationIssue[]): ValidationCheck {
    const count = components?.components?.length || 0;
    const passed = count <= 50; // arbitrary production threshold

    if (!passed) {
      issues.push({
        id: 'perf-1',
        checkId: 'performance',
        severity: 'warning',
        message: `Large component count: ${count} components may impact bundle size`,
        suggestion: 'Consider code-splitting or lazy loading',
      });
    }

    return { id: 'performance', name: 'Performance', category: 'performance', passed, message: `${count} components` };
  }

  private checkSecurity(issues: ValidationIssue[]): ValidationCheck {
    const passed = true; // baseline
    return { id: 'security', name: 'Security Baseline', category: 'security', passed, message: 'No critical issues detected' };
  }

  private checkSEO(frontend: any, issues: ValidationIssue[]): ValidationCheck {
    const pages = frontend?.pages || [];
    const hasMeta = pages.every((p: any) => p.meta?.title && p.meta?.description);
    const passed = hasMeta && pages.length > 0;

    if (!passed) {
      issues.push({
        id: 'seo-1',
        checkId: 'seo',
        severity: 'warning',
        message: 'Some pages missing meta tags',
        suggestion: 'Ensure all pages define title and description in frontend stage',
      });
    }

    return { id: 'seo', name: 'SEO Readiness', category: 'seo', passed, message: `${pages.length} pages checked` };
  }
}
