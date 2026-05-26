export interface ISharedContext {
  pipelineId: string;
  input: PipelineInput;
  artifacts: Record<string, unknown>;
  metadata: ExecutionMetadata;
  logs: ExecutionLogEntry[];
  errors: PipelineError[];
  getArtifact<T = unknown>(key: string): T | undefined;
  setArtifact(key: string, value: unknown): void;
  hasArtifact(key: string): boolean;
}

// Data-only projection of the context (no methods) — used for event payloads
// and serialization where the behavior-bearing interface is not needed.
export type ContextSnapshot = Omit<ISharedContext, 'getArtifact' | 'setArtifact' | 'hasArtifact'>;

export interface PipelineInput {
  userPrompt: string;
  constraints?: GenerationConstraints;
  config?: Partial<PipelineConfig>;
}

export interface GenerationConstraints {
  maxComponents?: number;
  themePreference?: string;
  motionComplexity?: 'low' | 'medium' | 'high';
  responsiveBreakpoints?: string[];
  accessibilityLevel?: 'wcag2-a' | 'wcag2-aa' | 'wcag2-aaa';
  targetFramework?: 'react' | 'vue' | 'svelte' | 'vanilla';
}

export interface PipelineConfig {
  maxRetries: number;
  retryDelayMs: number;
  parallelExecution: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  persistMemory: boolean;
  timeoutMs: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  parallelExecution: true,
  logLevel: 'info',
  persistMemory: true,
  timeoutMs: 120000,
};

export interface ExecutionMetadata {
  startedAt: Date;
  completedAt?: Date;
  stageStatuses: Record<string, StageStatus>;
  version: string;
}

export interface StageStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  engineName: string;
}

export interface ExecutionLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  stage?: string;
  engine?: string;
  message: string;
  data?: unknown;
}

export interface PipelineError {
  stage: string;
  engine: string;
  message: string;
  stack?: string;
  timestamp: Date;
  recoverable: boolean;
}

export type EngineName =
  | 'layout-fingerprint'
  | 'mutation'
  | 'niche-dna'
  | 'cinematic-image'
  | 'visual-memory'
  | 'routing'
  | 'cta-mapping'
  | 'asset-injection'
  | 'diversity'
  | 'planning'
  | 'blueprint'
  | 'design-dna'
  | 'component'
  | 'frontend'
  | 'motion'
  | 'validation'
  | 'scoring'
  | 'final-rendering';

export interface EngineInput<T = unknown> {
  context: ISharedContext;
  previousArtifact?: unknown;
  config?: T;
}

export interface EngineOutput<T = unknown> {
  success: boolean;
  artifact: T;
  logs?: ExecutionLogEntry[];
  errors?: PipelineError[];
  metadata?: Record<string, unknown>;
}

export interface IEngine<TInput = unknown, TOutput = unknown> {
  readonly name: EngineName;
  readonly version: string;
  readonly dependencies: EngineName[];
  execute(input: EngineInput<TInput>): Promise<EngineOutput<TOutput>>;
}

export type ExecutionStrategy = 'sequential' | 'parallel' | 'dependency-graph';

export interface PipelineStage {
  name: string;
  engine: IEngine;
  strategy: ExecutionStrategy;
  dependsOn?: string[];
  retries?: number;
  timeoutMs?: number;
  skipOnFailure?: boolean;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  stages: PipelineStage[];
  config: PipelineConfig;
}
