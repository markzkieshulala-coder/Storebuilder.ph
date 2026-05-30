import { parsePrompt } from './prompt-engine/parser';
import type { PromptUnderstandingObject } from './prompt-engine';
import { analyzePromptWithLLM, mergeLlmIntoPuo } from './llm-understanding';

// Deterministic baseline understanding — always available, no network.
function parse(prompt: string): PromptUnderstandingObject {
  const result = parsePrompt(prompt);
  if (result.success) return result.object;
  return parsePrompt('modern professional website').object;
}

// Single source of truth for prompt understanding.
// Both /api/analyze and /api/generate call this, so the concept the user sees
// and the site that gets built are produced by exactly the same logic.
//
// When ANTHROPIC_API_KEY is configured, the deterministic understanding is
// deepened by a single LLM pass (see llm-understanding.ts) so the engine grasps
// the user's entire request — precise niche, named products, explicit copy,
// requested sections, brand voice — before it builds. Without a key it returns
// the deterministic understanding unchanged.
export async function buildUnderstanding(prompt: string): Promise<PromptUnderstandingObject> {
  const base = parse(prompt);
  const llm = await analyzePromptWithLLM(prompt);
  return llm ? mergeLlmIntoPuo(base, llm) : base;
}

// Synchronous deterministic-only understanding, for callers that cannot await.
export function buildUnderstandingSync(prompt: string): PromptUnderstandingObject {
  return parse(prompt);
}
