// ---------------------------------------------------------------------------
// AI PROMPT UNDERSTANDING (OpenAI) — understanding ONLY, not generation.
//
// The model reads the user's ENTIRE prompt — any phrasing, any niche, structured
// or prose — and returns a structured spec in the exact `Brief` shape the
// in-house renderer already consumes (nav + ordered sections + per-section
// content). The website itself is still generated 100% by the in-house engines;
// no HTML is ever sent to OpenAI, only the prompt comes back as a spec.
//
// Safe by construction:
//   • The API key is read at CALL time, so importing this never needs a key and
//     `next build` stays green offline.
//   • Any failure (no key, network, bad JSON, timeout) returns null, and the
//     caller falls back to the deterministic parseBrief()/NLU path.
// ---------------------------------------------------------------------------

import { canonicalKind, type SectionKind } from '../requirements';
import type { Brief, BriefSection } from '../brief/parse';

const KNOWN_KINDS: SectionKind[] = [
  'newsletter', 'booking', 'location', 'blog', 'events', 'testimonials', 'faq',
  'stats', 'team', 'pricing', 'products', 'gallery', 'story', 'features', 'contact', 'cta',
];

const SYSTEM_PROMPT = `You convert a website brief into a STRICT JSON spec for an in-house website renderer. You ONLY interpret the user's prompt — you do not write HTML.

Read the user's ENTIRE prompt and capture EXACTLY what they asked for — their pages, their sections (in order), their headings, their copy, their buttons, their listed items — and nothing they did not ask for. Honour explicit exclusions ("do not include testimonials"). Do not invent sections, products, or marketing copy the user did not provide; leave a field empty rather than fabricating. If the user wrote design/visual instructions (colours, fonts, layout, responsiveness), those describe appearance — NOT content — so do not turn them into sections or copy.

Output ONLY a JSON object with this shape:
{
  "brandName": string,                      // business/brand name, or ""
  "niche": string,                          // short niche label, e.g. "basketball ecommerce store", or ""
  "nav": string[],                          // navigation labels in the user's exact order (omit if none stated)
  "forbidden": string[],                    // section kinds the user said to exclude
  "sections": [                             // content sections IN ORDER
    {
      "kind": one of ["hero","story","features","products","gallery","pricing","testimonials","faq","team","contact","stats","newsletter","booking","location","blog","events","cta"],
      "heading": string,                    // the user's heading for this section
      "headline": string,                   // hero headline (hero only) else ""
      "subheadline": string,                // hero subheadline (hero only) else ""
      "body": string,                       // the user's prose for this section, else ""
      "items": string[],                    // listed items: products/services/features/categories/faq questions, else []
      "ctas": string[]                      // button/CTA labels in this section, else []
    }
  ]
}

Kind guidance: a Home/Hero section -> "hero"; About/Our Story/Mission -> "story"; Services/What We Offer/Features -> "features"; Menu/Shop/Products/any catalog or category list -> "products"; photo gallery/portfolio -> "gallery"; plans/pricing -> "pricing"; reviews/testimonials -> "testimonials"; FAQ -> "faq"; team/staff -> "team"; contact -> "contact". Put the hero's buttons in the hero section's "ctas".

Return ONLY the JSON object — no markdown, no commentary.`;

interface RawSection {
  kind?: string; heading?: string; headline?: string; subheadline?: string;
  body?: string; items?: unknown; ctas?: unknown;
}
interface RawSpec {
  brandName?: string; niche?: string; nav?: unknown; forbidden?: unknown; sections?: RawSection[];
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(x => String(x ?? '').trim()).filter(Boolean).slice(0, 24);
}

function coerceKind(raw: string | undefined, heading: string, items: string[], body: string): BriefSection['kind'] {
  const r = String(raw || '').toLowerCase().trim();
  if (r === 'hero') return 'hero';
  if ((KNOWN_KINDS as string[]).includes(r)) return r as SectionKind;
  // Map free-text via the canonical table; otherwise infer from shape.
  return canonicalKind(r) || canonicalKind(heading) || (items.length ? 'features' : body ? 'story' : 'unknown');
}

/** What the AI spec adds beyond the base Brief (brand, niche, forbidden kinds). */
export interface AiUnderstanding extends Brief {
  brandName?: string;
  niche?: string;
  forbidden: SectionKind[];
}

/**
 * Understand a prompt with OpenAI and return a renderer-ready spec, or null to
 * fall back to the deterministic parser (no key / failure / invalid output).
 */
export async function aiUnderstand(prompt: string): Promise<AiUnderstanding | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !prompt || prompt.trim().length < 8) return null;

  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const baseURL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');

  const body = JSON.stringify({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  // One attempt, plus a single retry on a transient 429 rate-limit.
  const callOnce = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS) || 25_000);
    try {
      return await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res = await callOnce();
    if (res.status === 429) {
      const errText = await res.text().catch(() => '');
      // Insufficient quota is NOT transient — don't retry; surface it clearly.
      if (/insufficient_quota|exceeded your current quota|billing/i.test(errText)) {
        console.warn('[ai-understand] OpenAI 429 — the API key has no available quota/credits. Add billing/credits to your OpenAI account. Falling back to the deterministic parser.');
        return null;
      }
      console.warn('[ai-understand] OpenAI 429 rate-limited — retrying once in 2s…');
      await new Promise(r => setTimeout(r, 2000));
      res = await callOnce();
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[ai-understand] OpenAI ${res.status} ${res.statusText}: ${errText.slice(0, 200)} — falling back to deterministic parser.`);
      return null;
    }
    const data: any = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const spec = JSON.parse(content) as RawSpec;
    const rawSections = Array.isArray(spec.sections) ? spec.sections : [];

    const sections: BriefSection[] = rawSections.map((s) => {
      const heading = String(s.heading ?? '').trim();
      const items = strArray(s.items);
      const body = String(s.body ?? '').trim();
      return {
        kind: coerceKind(s.kind, heading, items, body),
        heading,
        headline: String(s.headline ?? '').trim() || undefined,
        subheadline: String(s.subheadline ?? '').trim() || undefined,
        body,
        items,
        ctas: strArray(s.ctas),
      };
    }).filter(s => s.kind !== 'unknown' || s.body || s.items.length || s.headline);

    if (sections.length === 0 && strArray(spec.nav).length === 0) return null;

    const forbidden: SectionKind[] = [];
    for (const f of strArray(spec.forbidden)) {
      const k = canonicalKind(f);
      if (k && !forbidden.includes(k)) forbidden.push(k);
    }

    return {
      isStructured: true,
      nav: strArray(spec.nav),
      sections,
      forbidden,
      brandName: String(spec.brandName ?? '').trim() || undefined,
      niche: String(spec.niche ?? '').trim() || undefined,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') console.warn('[ai-understand] timed out — using deterministic parser.');
    else console.warn('[ai-understand] failed — using deterministic parser:', (err as Error)?.message);
    return null;
  }
}
