import { parsePrompt } from './prompt-engine/parser';
import type { PromptUnderstandingObject } from './prompt-engine';
import { analyzePromptWithLLM, mergeLlmIntoPuo } from './llm-understanding';
import { extractPromptCopy, foldPromptCopyIntoPuo } from './prompt-copy';

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
// Understanding is built in three layers, each strictly enriching the last:
//   1. Deterministic parser — niche, palette, tokens (always runs, no network).
//   2. Deterministic prompt-copy extractor — the hero line, button labels, and
//      sections the user EXPLICITLY wrote, so their own words drive the build
//      even with no API key.
//   3. Optional LLM pass — when ANTHROPIC_API_KEY is set, one Claude call reads
//      the whole prompt and refines niche, copy, named products, and brand voice.
// Each layer only overwrites fields it actually filled, so the site always
// reflects the user's request as closely as the available signals allow.
export async function buildUnderstanding(prompt: string): Promise<PromptUnderstandingObject> {
  let puo = parse(prompt);

  // Honor the user's explicitly-quoted copy regardless of LLM availability.
  const explicit = extractPromptCopy(prompt);
  if (explicit) puo = foldPromptCopyIntoPuo(puo, explicit);

  // Sharpen with the LLM when configured; it refines but never erases explicit copy.
  const llm = await analyzePromptWithLLM(prompt);
  if (llm) puo = mergeLlmIntoPuo(puo, llm);

  return puo;
}

// Synchronous deterministic-only understanding, for callers that cannot await.
// Still honors the user's explicitly-quoted copy.
export function buildUnderstandingSync(prompt: string): PromptUnderstandingObject {
  let puo = parse(prompt);
  const explicit = extractPromptCopy(prompt);
  if (explicit) puo = foldPromptCopyIntoPuo(puo, explicit);
  return puo;
}
