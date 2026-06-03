// ---------------------------------------------------------------------------
// AI ENGINE CLIENT — provider-agnostic, OpenAI-compatible chat client.
//
// The website generator no longer depends on Anthropic. Instead it talks to ANY
// engine that exposes the de-facto-standard OpenAI Chat Completions API
// (`POST {baseURL}/chat/completions`). That covers your own self-hosted engine as
// well as OpenAI, Ollama, vLLM, LM Studio, LocalAI, DeepSeek, Groq, Together, etc.
//
// Point it at whatever you run via env — no SDK, just `fetch`, so importing this
// module never requires a key and `next build` stays green offline. The key is
// only read at call time, inside callChatModel().
// ---------------------------------------------------------------------------

/** Resolved at call time so the build never needs credentials. */
export interface AIEngineConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'AI_API_KEY is not set. The website generator calls an OpenAI-compatible AI ' +
        'engine to generate each site. Set AI_API_KEY (and optionally AI_BASE_URL / ' +
        'AI_MODEL to point at your own engine) in your environment.',
    );
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Read engine configuration from the environment.
 * @throws MissingApiKeyError if AI_API_KEY is unset.
 */
export function getEngineConfig(): AIEngineConfig {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  return {
    apiKey,
    // Trailing slash trimmed so we can safely append "/chat/completions".
    baseURL: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o',
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Per-request timeout. Generation can be long; default 110s to stay under the route's 120s. */
  timeoutMs?: number;
}

/**
 * Call the configured OpenAI-compatible chat model and return the assistant's
 * text. Provider-agnostic: only the standard fields are sent.
 *
 * @throws MissingApiKeyError if AI_API_KEY is unset.
 * @throws Error on transport failure, non-2xx response, or empty completion.
 */
export async function callChatModel(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const { baseURL, apiKey, model } = getEngineConfig();
  const { temperature = 0.8, maxTokens = 16000, timeoutMs = 110_000 } = opts;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`AI engine timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw new Error(`AI engine request failed: ${err?.message ?? 'network error'}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AI engine returned ${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }

  const data: any = await res.json().catch(() => null);
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error('AI engine returned an empty completion.');
  }
  return content;
}
