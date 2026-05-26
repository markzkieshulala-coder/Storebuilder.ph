import { PipelineDefinition, PipelineStage, IEngine } from '../core/types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PipelineDefinitionValidator {
  validate(definition: PipelineDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!definition.id) errors.push('Pipeline must have an id');
    if (!definition.name) errors.push('Pipeline must have a name');
    if (!definition.stages || definition.stages.length === 0) errors.push('Pipeline must have at least one stage');

    const stageNames = new Set<string>();
    const engineNames = new Set<string>();

    for (let i = 0; i < definition.stages.length; i++) {
      const stage = definition.stages[i];
      const prefix = `Stage ${i + 1} (${stage.name || 'unnamed'})`;

      if (!stage.name) {
        errors.push(`${prefix}: Stage must have a name`);
        continue;
      }

      if (stageNames.has(stage.name)) {
        errors.push(`${prefix}: Duplicate stage name '${stage.name}'`);
      }
      stageNames.add(stage.name);

      if (!stage.engine) {
        errors.push(`${prefix}: Stage must have an engine`);
        continue;
      }

      if (engineNames.has(stage.engine.name)) {
        errors.push(`${prefix}: Engine '${stage.engine.name}' is already used in another stage`);
      }
      engineNames.add(stage.engine.name);

      const validStrategies = ['sequential', 'parallel', 'dependency-graph'];
      if (!validStrategies.includes(stage.strategy)) {
        errors.push(`${prefix}: Invalid strategy '${stage.strategy}'. Must be one of: ${validStrategies.join(', ')}`);
      }

      if (stage.dependsOn) {
        for (const dep of stage.dependsOn) {
          if (!stageNames.has(dep)) {
            errors.push(`${prefix}: Depends on unknown stage '${dep}'`);
          }
        }
      }

      for (const dep of stage.engine.dependencies) {
        if (!engineNames.has(dep)) {
          const depStage = definition.stages.find((s) => s.engine.name === dep);
          if (!depStage) {
            errors.push(`${prefix}: Engine dependency '${dep}' is not present in pipeline stages`);
          } else {
            const depIndex = definition.stages.indexOf(depStage);
            if (depIndex >= i) {
              warnings.push(`${prefix}: Engine dependency '${dep}' appears after or at same position as dependent stage`);
            }
          }
        }
      }
    }

    if (definition.stages.length > 1 && !definition.stages.some((s) => s.dependsOn || s.engine.dependencies.length > 0)) {
      warnings.push('Multiple stages but no explicit dependencies defined — all stages will run in order');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateEngine(engine: IEngine): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!engine.name) errors.push('Engine must have a name');
    if (!engine.version) warnings.push(`Engine '${engine.name || 'unnamed'}' has no version`);
    if (!engine.execute) errors.push(`Engine '${engine.name || 'unnamed'}' must implement execute method`);
    if (engine.dependencies.includes(engine.name as any)) {
      errors.push(`Engine '${engine.name}' cannot depend on itself`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
