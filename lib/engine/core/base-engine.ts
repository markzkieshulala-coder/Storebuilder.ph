import {
  IEngine,
  EngineName,
  EngineInput,
  EngineOutput,
  ExecutionLogEntry,
} from './types';

export abstract class BaseEngine<TInput = unknown, TOutput = unknown> implements IEngine<TInput, TOutput> {
  abstract readonly name: EngineName;
  abstract readonly version: string;
  readonly dependencies: EngineName[] = [];

  protected createLog(
    level: ExecutionLogEntry['level'],
    message: string,
    data?: unknown,
    stage?: string
  ): ExecutionLogEntry {
    return {
      timestamp: new Date(),
      level,
      stage,
      engine: this.name,
      message,
      data,
    };
  }

  protected createSuccessOutput(
    artifact: TOutput,
    logs: ExecutionLogEntry[] = [],
    metadata?: Record<string, unknown>
  ): EngineOutput<TOutput> {
    return {
      success: true,
      artifact,
      logs,
      metadata,
    };
  }

  protected createFailureOutput(
    errorMessage: string,
    logs: ExecutionLogEntry[] = []
  ): EngineOutput<TOutput> {
    return {
      success: false,
      artifact: undefined as TOutput,
      logs,
      errors: [
        {
          stage: 'unknown',
          engine: this.name,
          message: errorMessage,
          timestamp: new Date(),
          recoverable: true,
        },
      ],
    };
  }

  abstract execute(input: EngineInput<TInput>): Promise<EngineOutput<TOutput>>;
}
