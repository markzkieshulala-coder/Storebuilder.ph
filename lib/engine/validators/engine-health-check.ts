import { IEngine, EngineInput, EngineOutput } from '../core/types';

export interface HealthCheckResult {
  engineName: string;
  healthy: boolean;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
  lastCheckedAt: Date;
}

export class EngineHealthChecker {
  async check(engine: IEngine, sampleContext?: EngineInput): Promise<HealthCheckResult> {
    const checks: Array<{ name: string; passed: boolean; message?: string }> = [];

    // Check 1: Engine has required properties
    checks.push({
      name: 'properties',
      passed: !!(engine.name && engine.version && typeof engine.execute === 'function'),
      message: engine.name ? undefined : 'Missing engine.name',
    });

    // Check 2: Execute is callable (dry-run with minimal input if available)
    if (sampleContext) {
      try {
        const result = await engine.execute(sampleContext);
        checks.push({
          name: 'dry-run',
          passed: result !== undefined && typeof result === 'object',
          message: result === undefined ? 'Engine returned undefined' : undefined,
        });
      } catch (err) {
        checks.push({
          name: 'dry-run',
          passed: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      checks.push({
        name: 'dry-run',
        passed: true,
        message: 'Skipped — no sample context provided',
      });
    }

    // Check 3: Dependencies are valid names
    checks.push({
      name: 'dependencies',
      passed: Array.isArray(engine.dependencies) && engine.dependencies.every((d) => typeof d === 'string'),
      message: !Array.isArray(engine.dependencies) ? 'dependencies must be an array' : undefined,
    });

    return {
      engineName: engine.name || 'unnamed',
      healthy: checks.every((c) => c.passed),
      checks,
      lastCheckedAt: new Date(),
    };
  }
}
