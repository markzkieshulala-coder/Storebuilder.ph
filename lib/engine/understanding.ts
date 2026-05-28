import { parsePrompt } from './prompt-engine/parser';
import type { PromptUnderstandingObject } from './prompt-engine';

// Single source of truth for prompt understanding.
// Both /api/analyze and /api/generate call this, so the concept the user sees
// and the site that gets built are produced by exactly the same logic.
export function buildUnderstanding(prompt: string): PromptUnderstandingObject {
  const result = parsePrompt(prompt);
  if (result.success) return result.object;
  return parsePrompt('modern professional website').object;
}
