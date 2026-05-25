import { IEngine, EngineInput, EngineOutput, ISharedContext } from '../core/types';
import { PipelineEventBus, PipelineEventType } from '../core/events';

export interface StrategyExecutor {
  execute(
    engines: IEngine[],
    context: ISharedContext,
    eventBus: PipelineEventBus,
    input?: unknown
  ): Promise<EngineOutput[]>;
}

export class SequentialStrategy implements StrategyExecutor {
  async execute(
    engines: IEngine[],
    context: ISharedContext,
    eventBus: PipelineEventBus,
    previousInput?: unknown
  ): Promise<EngineOutput[]> {
    const results: EngineOutput[] = [];
    let currentInput = previousInput;

    for (const engine of engines) {
      const engineInput: EngineInput = {
        context,
        previousArtifact: currentInput,
      };

      eventBus.emit(PipelineEventType.ENGINE_START, {
        pipelineId: context.pipelineId,
        stageName: 'sequential',
        engineName: engine.name,
        timestamp: new Date(),
      });

      const result = await engine.execute(engineInput);
      results.push(result);

      if (result.success) {
        currentInput = result.artifact;
        eventBus.emit(PipelineEventType.ENGINE_COMPLETE, {
          pipelineId: context.pipelineId,
          stageName: 'sequential',
          engineName: engine.name,
          timestamp: new Date(),
          artifactType: typeof result.artifact === 'object' && result.artifact !== null
            ? (result.artifact as any).type || 'object'
            : typeof result.artifact,
        });
      } else {
        eventBus.emit(PipelineEventType.ENGINE_ERROR, {
          pipelineId: context.pipelineId,
          stageName: 'sequential',
          engineName: engine.name,
          timestamp: new Date(),
          error: result.errors![0],
        });
        break;
      }
    }

    return results;
  }
}

export class ParallelStrategy implements StrategyExecutor {
  async execute(
    engines: IEngine[],
    context: ISharedContext,
    eventBus: PipelineEventBus,
    previousInput?: unknown
  ): Promise<EngineOutput[]> {
    const promises = engines.map(async (engine) => {
      const engineInput: EngineInput = {
        context,
        previousArtifact: previousInput,
      };

      eventBus.emit(PipelineEventType.ENGINE_START, {
        pipelineId: context.pipelineId,
        stageName: 'parallel',
        engineName: engine.name,
        timestamp: new Date(),
      });

      const result = await engine.execute(engineInput);

      if (result.success) {
        eventBus.emit(PipelineEventType.ENGINE_COMPLETE, {
          pipelineId: context.pipelineId,
          stageName: 'parallel',
          engineName: engine.name,
          timestamp: new Date(),
          artifactType: typeof result.artifact === 'object' && result.artifact !== null
            ? (result.artifact as any).type || 'object'
            : typeof result.artifact,
        });
      } else {
        eventBus.emit(PipelineEventType.ENGINE_ERROR, {
          pipelineId: context.pipelineId,
          stageName: 'parallel',
          engineName: engine.name,
          timestamp: new Date(),
          error: result.errors![0],
        });
      }

      return result;
    });

    return Promise.all(promises);
  }
}

export class DependencyGraphStrategy implements StrategyExecutor {
  async execute(
    engines: IEngine[],
    context: ISharedContext,
    eventBus: PipelineEventBus,
    previousInput?: unknown
  ): Promise<EngineOutput[]> {
    const completed = new Map<string, EngineOutput>();
    const engineMap = new Map(engines.map((e) => [e.name, e]));

    const resolveDependencies = (engine: IEngine): boolean => {
      return engine.dependencies.every((dep) => completed.has(dep));
    };

    const executeEngine = async (engine: IEngine): Promise<EngineOutput> => {
      const depArtifacts = engine.dependencies
        .map((dep) => completed.get(dep)?.artifact)
        .filter(Boolean);

      const engineInput: EngineInput = {
        context,
        previousArtifact: depArtifacts.length > 0 ? depArtifacts : previousInput,
      };

      eventBus.emit(PipelineEventType.ENGINE_START, {
        pipelineId: context.pipelineId,
        stageName: 'dependency-graph',
        engineName: engine.name,
        timestamp: new Date(),
      });

      const result = await engine.execute(engineInput);

      if (result.success) {
        eventBus.emit(PipelineEventType.ENGINE_COMPLETE, {
          pipelineId: context.pipelineId,
          stageName: 'dependency-graph',
          engineName: engine.name,
          timestamp: new Date(),
          artifactType: typeof result.artifact === 'object' && result.artifact !== null
            ? (result.artifact as any).type || 'object'
            : typeof result.artifact,
        });
      } else {
        eventBus.emit(PipelineEventType.ENGINE_ERROR, {
          pipelineId: context.pipelineId,
          stageName: 'dependency-graph',
          engineName: engine.name,
          timestamp: new Date(),
          error: result.errors![0],
        });
      }

      return result;
    };

    const pending = new Set(engines.map((e) => e.name));

    while (pending.size > 0) {
      const ready = Array.from(pending).filter((name) => {
        const engine = engineMap.get(name);
        return engine && resolveDependencies(engine);
      });

      if (ready.length === 0 && pending.size > 0) {
        throw new Error('Circular dependency detected or unmet dependencies in engine graph');
      }

      const batch = ready.map((name) => {
        pending.delete(name);
        const engine = engineMap.get(name)!;
        return executeEngine(engine).then((result) => {
          completed.set(name, result);
          return result;
        });
      });

      await Promise.all(batch);
    }

    return engines.map((e) => completed.get(e.name)!);
  }
}
