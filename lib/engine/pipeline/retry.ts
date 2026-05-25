import { PipelineEventBus, PipelineEventType } from '../core/events';
import { PipelineConfig, EngineOutput, PipelineError, EngineName } from '../core/types';

export interface RetryPolicy {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
};

export function buildRetryPolicy(config: PipelineConfig): RetryPolicy {
  return {
    maxRetries: config.maxRetries,
    delayMs: config.retryDelayMs,
    backoffMultiplier: 2,
    maxDelayMs: 30000,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, policy: RetryPolicy): number {
  const delay = policy.delayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
  return Math.min(delay, policy.maxDelayMs);
}

export async function withRetry<TInput, TOutput>(
  fn: () => Promise<EngineOutput<TOutput>>,
  stageName: string,
  engineName: string,
  pipelineId: string,
  policy: RetryPolicy,
  eventBus: PipelineEventBus
): Promise<EngineOutput<TOutput>> {
  let lastError: PipelineError | undefined;

  for (let attempt = 1; attempt <= policy.maxRetries + 1; attempt++) {
    try {
      const result = await fn();
      if (result.success) {
        return result;
      }
      lastError = result.errors?.[0];
    } catch (err) {
      lastError = {
        stage: stageName,
        engine: engineName,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        timestamp: new Date(),
        recoverable: true,
      };
    }

    if (attempt <= policy.maxRetries) {
      eventBus.emit(PipelineEventType.STAGE_RETRY, {
        pipelineId,
        stageName,
        engineName: engineName as EngineName,
        timestamp: new Date(),
        attempt,
        maxRetries: policy.maxRetries + 1,
      });

      const delay = calculateDelay(attempt, policy);
      await sleep(delay);
    }
  }

  return {
    success: false,
    artifact: undefined as TOutput,
    errors: [
      lastError || {
        stage: stageName,
        engine: engineName,
        message: `Failed after ${policy.maxRetries + 1} attempts`,
        timestamp: new Date(),
        recoverable: false,
      },
    ],
  };
}
