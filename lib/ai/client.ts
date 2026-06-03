// ---------------------------------------------------------------------------
// Anthropic client — lazily constructed so importing this module never requires
// an API key (keeps `next build` green offline). The key is only needed at
// request time, when buildSitePlan() actually calls Claude.
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

/** The planner model. Claude Opus 4.8 — most capable for faithful prompt interpretation. */
export const PLANNER_MODEL = 'claude-opus-4-8';

let _client: Anthropic | null = null;

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'ANTHROPIC_API_KEY is not set. The website generator now uses Claude to ' +
        'interpret the prompt and plan the site. Set ANTHROPIC_API_KEY in your environment.',
    );
    this.name = 'MissingApiKeyError';
  }
}

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new MissingApiKeyError();
  if (!_client) {
    // Resolves the key from ANTHROPIC_API_KEY automatically.
    _client = new Anthropic();
  }
  return _client;
}
