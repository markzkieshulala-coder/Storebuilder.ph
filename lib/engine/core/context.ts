import { v4 as uuidv4 } from 'uuid';
import {
  ISharedContext,
  PipelineInput,
  ExecutionMetadata,
  ExecutionLogEntry,
  PipelineError,
  StageStatus,
  DEFAULT_PIPELINE_CONFIG,
  PipelineConfig,
} from './types';

export class SharedContext implements ISharedContext {
  pipelineId: string;
  input: PipelineInput;
  artifacts: Record<string, unknown> = {};
  metadata: ExecutionMetadata;
  logs: ExecutionLogEntry[] = [];
  errors: PipelineError[] = [];

  private config: PipelineConfig;

  constructor(input: PipelineInput, config?: Partial<PipelineConfig>) {
    this.pipelineId = uuidv4();
    this.input = input;
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.metadata = {
      startedAt: new Date(),
      stageStatuses: {},
      version: '1.0.0',
    };
  }

  getPipelineConfig(): PipelineConfig {
    return { ...this.config };
  }

  setArtifact(key: string, value: unknown): void {
    this.artifacts[key] = value;
  }

  getArtifact<T = unknown>(key: string): T | undefined {
    return this.artifacts[key] as T | undefined;
  }

  hasArtifact(key: string): boolean {
    return key in this.artifacts;
  }

  addLog(entry: ExecutionLogEntry): void {
    this.logs.push(entry);
  }

  addError(error: PipelineError): void {
    this.errors.push(error);
  }

  initStageStatus(stageName: string, engineName: string): void {
    this.metadata.stageStatuses[stageName] = {
      status: 'pending',
      attempts: 0,
      engineName,
    };
  }

  setStageRunning(stageName: string): void {
    const status = this.metadata.stageStatuses[stageName];
    if (status) {
      status.status = 'running';
      status.startedAt = new Date();
      status.attempts += 1;
    }
  }

  setStageCompleted(stageName: string): void {
    const status = this.metadata.stageStatuses[stageName];
    if (status) {
      status.status = 'completed';
      status.completedAt = new Date();
    }
  }

  setStageFailed(stageName: string): void {
    const status = this.metadata.stageStatuses[stageName];
    if (status) {
      status.status = 'failed';
      status.completedAt = new Date();
    }
  }

  setStageSkipped(stageName: string): void {
    const status = this.metadata.stageStatuses[stageName];
    if (status) {
      status.status = 'skipped';
    }
  }

  getStageStatus(stageName: string): StageStatus | undefined {
    return this.metadata.stageStatuses[stageName];
  }

  markComplete(): void {
    this.metadata.completedAt = new Date();
  }

  toJSON(): Omit<ISharedContext, 'getArtifact' | 'setArtifact' | 'hasArtifact'> {
    return {
      pipelineId: this.pipelineId,
      input: this.input,
      artifacts: this.artifacts,
      metadata: this.metadata,
      logs: this.logs,
      errors: this.errors,
    };
  }
}
