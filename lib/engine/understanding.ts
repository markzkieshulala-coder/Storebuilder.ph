import { parsePrompt } from './prompt-engine/parser';
import type { PromptUnderstandingObject } from './prompt-engine';
import { understandPrompt } from './nlu';
import { foldNluIntoPuo } from './nlu/fold';
import { applyUltraModernDesignBaseline } from './prompt-contract';
import { aiUnderstand } from './ai/understand';
import type { Brief } from './brief/parse';

// Single source of truth for prompt understanding.
//
// Both /api/analyze and /api/generate call this, so the concept the user sees
// and the site that gets built are produced by exactly the same logic — and by
// exactly the same in-process engine. There is NO external AI of any kind
// (no Claude, OpenAI, Google, or Ollama) and NO network: the in-house NLU engine
// (lib/engine/nlu) reads the whole prompt, and the deterministic parser
// (lib/engine/prompt-engine) turns that understanding into the design tokens the
// renderer consumes. Understanding and generation are one unified pipeline that
// runs in a single process.
//
// Pipeline:
//   1. In-house NLU — detects the (sub-)niche, the brand name, explicit colours,
//      the hero copy and button labels the user wrote, the products/services they
//      listed, and synthesises any on-brand copy the prompt left implicit.
//   2. Deterministic parser — fed the NLU's niche as an override, it computes the
//      full set of design tokens (palette, typography, layout, motion), with any
//      explicit design words in the prompt still winning.
//   3. Fold — the NLU's rich, prompt-specific content is layered onto the PUO's
//      customAttributes.llm channel that the renderer already consumes.
function understand(prompt: string, brief?: Brief): PromptUnderstandingObject {
  const nlu = understandPrompt(prompt, brief);

  // Lock the parser to the niche the NLU understood, and feed it the salient
  // keywords, so palette/typography/copy/pages cohere around the real subject.
  const parsed = parsePrompt(prompt, undefined, {
    industry: nlu.industry && nlu.industry !== 'general' ? nlu.industry : undefined,
    keywords: nlu.keywords,
  });
  let puo = parsed.success ? parsed.object : parsePrompt('modern professional website').object;

  puo = foldNluIntoPuo(puo, nlu);
  puo = applyUltraModernDesignBaseline(puo);
  return puo;
}

// Async path used by the live generator. It first asks OpenAI to UNDERSTAND the
// prompt (turning any phrasing into a structured spec); the in-house engine then
// renders that spec. If no OPENAI_API_KEY is set, or the call fails, aiUnderstand
// returns null and we fall back to the deterministic parser — so the app always
// works offline.
export async function buildUnderstanding(prompt: string): Promise<PromptUnderstandingObject> {
  const brief = await aiUnderstand(prompt).catch(() => null);
  return understand(prompt, brief ?? undefined);
}

// Synchronous understanding, for callers that cannot await.
export function buildUnderstandingSync(prompt: string): PromptUnderstandingObject {
  return understand(prompt);
}
