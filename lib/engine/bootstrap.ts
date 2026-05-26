import {
  EngineRegistry,
  PipelineDefinition,
  PipelineStage,
  PipelineConfig,
  PipelineEventBus,
  PipelineEventType,
  PipelineInput,
} from './core';
import { MemoryManager, InMemoryPersistenceAdapter } from './memory';
import { PipelineOrchestrator } from './pipeline';
import {
  PlanningEngine,
  BlueprintEngine,
  DesignDNAEngine,
  ComponentEngine,
  FrontendEngine,
  MotionEngine,
  ValidationEngine,
  ScoringEngine,
  FinalRenderingEngine,
} from './engines';
import { PipelineDefinitionValidator } from './validators';
import { RenderPipeline } from './render';

export interface BootstrapConfig {
  pipelineConfig?: Partial<PipelineConfig>;
  logEvents?: boolean;
  persistMemory?: boolean;
}

export class OrchestratorBootstrap {
  private registry = new EngineRegistry();
  private eventBus = new PipelineEventBus();
  private memoryManager: MemoryManager;
  private orchestrator: PipelineOrchestrator;
  private validator = new PipelineDefinitionValidator();
  private renderPipeline = new RenderPipeline();

  constructor(config: BootstrapConfig = {}) {
    this.memoryManager = new MemoryManager(
      config.persistMemory ? new InMemoryPersistenceAdapter() : undefined
    );

    this.orchestrator = new PipelineOrchestrator({
      eventBus: this.eventBus,
      memoryManager: this.memoryManager,
    });

    this.registerDefaultEngines();

    if (config.logEvents !== false) {
      this.attachDefaultEventLogging();
    }
  }

  private registerDefaultEngines(): void {
    this.registry.register(new PlanningEngine());
    this.registry.register(new BlueprintEngine());
    this.registry.register(new DesignDNAEngine());
    this.registry.register(new ComponentEngine());
    this.registry.register(new FrontendEngine());
    this.registry.register(new MotionEngine());
    this.registry.register(new ValidationEngine());
    this.registry.register(new ScoringEngine());
    this.registry.register(new FinalRenderingEngine());

    this.registry.validateDependencies();
  }

  private attachDefaultEventLogging(): void {
    this.eventBus.on(PipelineEventType.PIPELINE_START, (event) => {
      console.log(`[PIPELINE START] ${event.pipelineId} | Prompt: "${event.input.userPrompt}"`);
    });

    this.eventBus.on(PipelineEventType.STAGE_START, (event) => {
      console.log(`  [STAGE START] ${event.stageName} (engine: ${event.engineName})`);
    });

    this.eventBus.on(PipelineEventType.STAGE_COMPLETE, (event) => {
      console.log(`  [STAGE COMPLETE] ${event.stageName} (${event.durationMs}ms)`);
    });

    this.eventBus.on(PipelineEventType.STAGE_ERROR, (event) => {
      console.error(`  [STAGE ERROR] ${event.stageName}: ${event.error.message}`);
    });

    this.eventBus.on(PipelineEventType.STAGE_RETRY, (event) => {
      console.warn(`  [STAGE RETRY] ${event.stageName} attempt ${event.attempt}/${event.maxRetries}`);
    });

    this.eventBus.on(PipelineEventType.ENGINE_COMPLETE, (event) => {
      console.log(`    [ENGINE OK] ${event.engineName} -> ${event.artifactType}`);
    });

    this.eventBus.on(PipelineEventType.ENGINE_ERROR, (event) => {
      console.error(`    [ENGINE FAIL] ${event.engineName}: ${event.error.message}`);
    });

    this.eventBus.on(PipelineEventType.LOG, (event) => {
      const prefix = `[${event.entry.level.toUpperCase()}]`;
      const stage = event.entry.stage ? ` (${event.entry.stage})` : '';
      console.log(`      ${prefix}${stage} ${event.entry.message}`);
    });

    this.eventBus.on(PipelineEventType.PIPELINE_COMPLETE, (event) => {
      console.log(`[PIPELINE COMPLETE] ${event.pipelineId} | Duration: ${event.durationMs}ms`);
    });

    this.eventBus.on(PipelineEventType.PIPELINE_ERROR, (event) => {
      console.error(`[PIPELINE ERROR] ${event.pipelineId}: ${event.error.message}`);
    });
  }

  getRegistry(): EngineRegistry {
    return this.registry;
  }

  getEventBus(): PipelineEventBus {
    return this.eventBus;
  }

  buildDefaultPipeline(config?: Partial<PipelineConfig>): PipelineDefinition {
    const getEngine = (name: string) => {
      const engine = this.registry.get(name as any);
      if (!engine) throw new Error(`Engine '${name}' not found in registry`);
      return engine;
    };

    const pipeline: PipelineDefinition = {
      id: 'ai-website-pipeline',
      name: 'AI Website Generator Pipeline',
      config: {
        maxRetries: 3,
        retryDelayMs: 1000,
        parallelExecution: false,
        logLevel: 'info',
        persistMemory: true,
        timeoutMs: 120000,
        ...config,
      },
      stages: [
        {
          name: 'planning',
          engine: getEngine('planning'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'blueprint',
          engine: getEngine('blueprint'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'design-dna',
          engine: getEngine('design-dna'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'component',
          engine: getEngine('component'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'frontend',
          engine: getEngine('frontend'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'motion',
          engine: getEngine('motion'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
        {
          name: 'validation',
          engine: getEngine('validation'),
          strategy: 'sequential',
          retries: 1,
          skipOnFailure: false,
        },
        {
          name: 'scoring',
          engine: getEngine('scoring'),
          strategy: 'sequential',
          retries: 1,
          skipOnFailure: false,
        },
        {
          name: 'final-rendering',
          engine: getEngine('final-rendering'),
          strategy: 'sequential',
          retries: 2,
          skipOnFailure: false,
        },
      ],
    };

    const validation = this.validator.validate(pipeline);
    if (!validation.valid) {
      throw new Error(`Pipeline validation failed:\n${validation.errors.join('\n')}`);
    }

    return pipeline;
  }

  async run(input: PipelineInput, pipelineConfig?: Partial<PipelineConfig>): Promise<any> {
    const pipeline = this.buildDefaultPipeline(pipelineConfig);
    const context = await this.orchestrator.run(pipeline, input);
    return context;
  }

  async runAndRender(
    input: PipelineInput,
    pipelineConfig?: Partial<PipelineConfig>,
    renderOptions?: Parameters<RenderPipeline['execute']>[1]
  ): Promise<{ context: any; renderResult: any }> {
    const context = await this.run(input, pipelineConfig);
    const finalArtifact = context.getArtifact('final-rendering');

    if (!finalArtifact) {
      throw new Error('Final rendering artifact not found in context');
    }

    const renderResult = await this.renderPipeline.execute(finalArtifact, renderOptions);
    return { context, renderResult };
  }
}

export function createOrchestrator(config?: BootstrapConfig): OrchestratorBootstrap {
  return new OrchestratorBootstrap(config);
}
