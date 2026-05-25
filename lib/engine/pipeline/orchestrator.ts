import {
  PipelineDefinition,
  PipelineStage,
  PipelineConfig,
  EngineOutput,
  PipelineInput,
  ISharedContext,
  DEFAULT_PIPELINE_CONFIG,
} from '../core/types';
import { SharedContext } from '../core/context';
import { PipelineEventBus, PipelineEventType } from '../core/events';
import { MemoryManager } from '../memory/persistence';
import { buildRetryPolicy, withRetry, RetryPolicy } from './retry';
import {
  SequentialStrategy,
  ParallelStrategy,
  DependencyGraphStrategy,
  StrategyExecutor,
} from './strategies';

export interface OrchestratorOptions {
  eventBus?: PipelineEventBus;
  memoryManager?: MemoryManager;
  strategyOverrides?: Record<string, StrategyExecutor>;
}

export class PipelineOrchestrator {
  private eventBus: PipelineEventBus;
  private memoryManager: MemoryManager;
  private strategies: Record<string, StrategyExecutor>;

  constructor(options?: OrchestratorOptions) {
    this.eventBus = options?.eventBus || new PipelineEventBus();
    this.memoryManager = options?.memoryManager || new MemoryManager();
    this.strategies = {
      sequential: new SequentialStrategy(),
      parallel: new ParallelStrategy(),
      'dependency-graph': new DependencyGraphStrategy(),
      ...options?.strategyOverrides,
    };
  }

  getEventBus(): PipelineEventBus {
    return this.eventBus;
  }

  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  async run(pipeline: PipelineDefinition, input: PipelineInput): Promise<ISharedContext> {
    const config = { ...DEFAULT_PIPELINE_CONFIG, ...pipeline.config };
    const context = new SharedContext(input, config);
    const startedAt = Date.now();

    this.eventBus.emit(PipelineEventType.PIPELINE_START, {
      pipelineId: context.pipelineId,
      input: { userPrompt: input.userPrompt },
      config,
    });

    if (config.persistMemory) {
      await this.memoryManager.persist(context);
    }

    try {
      for (const stage of pipeline.stages) {
        await this.executeStage(stage, context, config);

        if (config.persistMemory) {
          await this.memoryManager.persist(context);
        }
      }

      context.markComplete();
      const durationMs = Date.now() - startedAt;

      this.eventBus.emit(PipelineEventType.PIPELINE_COMPLETE, {
        pipelineId: context.pipelineId,
        context,
        durationMs,
      });

      if (config.persistMemory) {
        await this.memoryManager.persist(context);
      }

      return context;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const pipelineError = {
        stage: 'orchestrator',
        engine: 'orchestrator',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        recoverable: false,
      };

      context.addError(pipelineError);
      context.markComplete();

      this.eventBus.emit(PipelineEventType.PIPELINE_ERROR, {
        pipelineId: context.pipelineId,
        error: pipelineError,
        fatal: true,
      });

      if (config.persistMemory) {
        await this.memoryManager.persist(context);
      }

      return context;
    }
  }

  private async executeStage(
    stage: PipelineStage,
    context: SharedContext,
    config: PipelineConfig
  ): Promise<void> {
    const retryPolicy = buildRetryPolicy(config);
    const strategy = this.strategies[stage.strategy];

    if (!strategy) {
      throw new Error(`Unknown execution strategy: ${stage.strategy}`);
    }

    context.initStageStatus(stage.name, stage.engine.name);
    context.setStageRunning(stage.name);

    this.eventBus.emit(PipelineEventType.STAGE_START, {
      pipelineId: context.pipelineId,
      stageName: stage.name,
      engineName: stage.engine.name,
      timestamp: new Date(),
      contextSnapshot: context.toJSON(),
    });

    const stageStart = Date.now();

    try {
      const previousArtifact = context.getArtifact(stage.name);
      const engines = [stage.engine];

      const result = await withRetry(
        () => strategy.execute(engines, context, this.eventBus, previousArtifact).then((r) => r[0]),
        stage.name,
        stage.engine.name,
        context.pipelineId,
        { ...retryPolicy, maxRetries: stage.retries ?? retryPolicy.maxRetries },
        this.eventBus
      );

      const durationMs = Date.now() - stageStart;

      if (result.success) {
        context.setArtifact(stage.name, result.artifact);
        context.setStageCompleted(stage.name);

        if (result.logs) {
          for (const log of result.logs) {
            context.addLog(log);
            this.eventBus.emit(PipelineEventType.LOG, { pipelineId: context.pipelineId, entry: log });
          }
        }

        this.eventBus.emit(PipelineEventType.ARTIFACT_CREATED, {
          pipelineId: context.pipelineId,
          stageName: stage.name,
          artifactKey: stage.name,
          artifactType: typeof result.artifact === 'object' && result.artifact !== null
            ? (result.artifact as any).type || 'object'
            : typeof result.artifact,
        });

        this.eventBus.emit(PipelineEventType.STAGE_COMPLETE, {
          pipelineId: context.pipelineId,
          stageName: stage.name,
          engineName: stage.engine.name,
          timestamp: new Date(),
          durationMs,
        });
      } else {
        context.setStageFailed(stage.name);

        if (result.errors) {
          for (const err of result.errors) {
            context.addError(err);
          }
        }

        this.eventBus.emit(PipelineEventType.STAGE_ERROR, {
          pipelineId: context.pipelineId,
          stageName: stage.name,
          engineName: stage.engine.name,
          timestamp: new Date(),
          error: result.errors?.[0] || {
            stage: stage.name,
            engine: stage.engine.name,
            message: 'Unknown error',
            timestamp: new Date(),
            recoverable: false,
          },
        });

        if (!stage.skipOnFailure) {
          throw new Error(`Stage '${stage.name}' failed and skipOnFailure is false`);
        }
      }
    } catch (error) {
      const durationMs = Date.now() - stageStart;
      context.setStageFailed(stage.name);

      const err = {
        stage: stage.name,
        engine: stage.engine.name,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        recoverable: false,
      };

      context.addError(err);

      this.eventBus.emit(PipelineEventType.STAGE_ERROR, {
        pipelineId: context.pipelineId,
        stageName: stage.name,
        engineName: stage.engine.name,
        timestamp: new Date(),
        error: err,
      });

      if (!stage.skipOnFailure) {
        throw error;
      }
    }
  }
}
