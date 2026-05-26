import { EventEmitter } from 'eventemitter3';
import {
  ISharedContext,
  ContextSnapshot,
  EngineName,
  ExecutionLogEntry,
  PipelineError,
  PipelineConfig,
} from './types';

export enum PipelineEventType {
  PIPELINE_START = 'pipeline:start',
  PIPELINE_COMPLETE = 'pipeline:complete',
  PIPELINE_ERROR = 'pipeline:error',
  STAGE_START = 'stage:start',
  STAGE_COMPLETE = 'stage:complete',
  STAGE_ERROR = 'stage:error',
  STAGE_RETRY = 'stage:retry',
  ENGINE_START = 'engine:start',
  ENGINE_COMPLETE = 'engine:complete',
  ENGINE_ERROR = 'engine:error',
  LOG = 'log',
  CONTEXT_UPDATED = 'context:updated',
  ARTIFACT_CREATED = 'artifact:created',
}

export interface PipelineStartEvent {
  pipelineId: string;
  input: { userPrompt: string };
  config: PipelineConfig;
}

export interface StageEvent {
  pipelineId: string;
  stageName: string;
  engineName: EngineName;
  timestamp: Date;
  contextSnapshot?: ContextSnapshot;
}

export interface EngineEvent {
  pipelineId: string;
  stageName: string;
  engineName: EngineName;
  timestamp: Date;
  durationMs?: number;
  artifactType?: string;
}

export interface LogEvent {
  pipelineId: string;
  entry: ExecutionLogEntry;
}

export interface ContextUpdateEvent {
  pipelineId: string;
  key: string;
  previousValue?: unknown;
  newValue: unknown;
}

export interface ArtifactEvent {
  pipelineId: string;
  stageName: string;
  artifactKey: string;
  artifactType: string;
}

export type PipelineEventMap = {
  [PipelineEventType.PIPELINE_START]: (event: PipelineStartEvent) => void;
  [PipelineEventType.PIPELINE_COMPLETE]: (event: { pipelineId: string; context: ISharedContext; durationMs: number }) => void;
  [PipelineEventType.PIPELINE_ERROR]: (event: { pipelineId: string; error: PipelineError; fatal: boolean }) => void;
  [PipelineEventType.STAGE_START]: (event: StageEvent) => void;
  [PipelineEventType.STAGE_COMPLETE]: (event: StageEvent & { durationMs: number }) => void;
  [PipelineEventType.STAGE_ERROR]: (event: StageEvent & { error: PipelineError }) => void;
  [PipelineEventType.STAGE_RETRY]: (event: StageEvent & { attempt: number; maxRetries: number }) => void;
  [PipelineEventType.ENGINE_START]: (event: EngineEvent) => void;
  [PipelineEventType.ENGINE_COMPLETE]: (event: EngineEvent & { artifactType: string }) => void;
  [PipelineEventType.ENGINE_ERROR]: (event: EngineEvent & { error: PipelineError }) => void;
  [PipelineEventType.LOG]: (event: LogEvent) => void;
  [PipelineEventType.CONTEXT_UPDATED]: (event: ContextUpdateEvent) => void;
  [PipelineEventType.ARTIFACT_CREATED]: (event: ArtifactEvent) => void;
};

class TypedEventEmitter extends EventEmitter<PipelineEventMap> {}

export class PipelineEventBus {
  private emitter = new TypedEventEmitter();

  on<K extends keyof PipelineEventMap>(event: K, listener: PipelineEventMap[K]): () => void {
    this.emitter.on(event, listener as any);
    return () => this.emitter.off(event, listener as any);
  }

  once<K extends keyof PipelineEventMap>(event: K, listener: PipelineEventMap[K]): void {
    this.emitter.once(event, listener as any);
  }

  emit<K extends keyof PipelineEventMap>(event: K, ...args: Parameters<PipelineEventMap[K]>): void {
    (this.emitter.emit as (event: K, ...a: unknown[]) => boolean)(event, ...args);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }

  listenerCount<K extends keyof PipelineEventMap>(event: K): number {
    return this.emitter.listenerCount(event);
  }
}
