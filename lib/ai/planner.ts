// ---------------------------------------------------------------------------
// PLANNER — turns a user prompt into a strict, validated SitePlan using Claude.
//
// This is where prompt-adherence is enforced. The model is instructed to include
// ONLY what the prompt asks for or clearly implies, to honour explicit exclusions
// absolutely, and to write copy specific to the described business rather than
// generic template filler. The deterministic renderer then renders exactly this
// plan and nothing more.
//
// We drive structured output with a hand-authored JSON Schema (full control over
// strict-mode rules: additionalProperties:false and every property required) and
// validate the model's JSON against the project's zod schema. This avoids coupling
// to the SDK's zod helper, which targets a different zod major version.
// ---------------------------------------------------------------------------

import { getAnthropic, PLANNER_MODEL } from './client';
import { SitePlanSchema, SECTION_TYPES, type SitePlan } from './site-plan';

const SYSTEM_PROMPT = `You are an elite website planner for a premium site generator. You convert a user's prompt into a precise, structured SitePlan that a deterministic renderer turns into a high-end, 3D ultra-modern website.

Your ONE job is to faithfully and literally follow the user's instructions. The renderer builds EXACTLY the plan you produce — every section, button, and word of copy comes from you, and nothing you omit can appear on the site.

STRICT ADHERENCE RULES (non-negotiable):
1. Include ONLY sections the user asked for or that are clearly essential to the described business. Do NOT pad the site with sections the prompt does not motivate.
2. If the user says NOT to include something ("no FAQ", "no testimonials", "don't add pricing", "without a contact form", etc.), you MUST NOT include that section, and you MUST add a short note for it to the "excluded" array (e.g. "faq", "testimonials").
3. Never invent facts, statistics, prices, quotes, team members, or features the user did not provide or clearly imply. If the user gave specific products, services, prices, names, or copy, use them verbatim. Where you must write supporting copy, keep it concrete, specific to THIS business, and free of generic filler.
4. Every CTA / button must be something the prompt asks for or a natural action for the described business (e.g. "Order Now", "Book a Table", "Get a Quote"). Do not add buttons the prompt does not motivate. If the user specified exact button text, use it exactly.
5. The nav must list only sections that actually exist in your sections array, referencing them by "#<section id>".
6. Honour any colours, tone, or style the user names. If the user names brand colours, set theme.primary/accent to those exact hex values. Otherwise choose a palette and 3D style that fits the niche.
7. Write a hero for almost every site (it is the page header). Everything between the hero and footer is driven strictly by the prompt.

OUTPUT FORMAT: Every field in the schema is required. For any field that does not apply to a given section, return an empty value ("" for text, [] for lists, false for booleans) — do not fabricate content to fill it.

SECTION FIELD CONVENTIONS (populate only the relevant fields per type; leave the rest empty):
- hero: heading (headline), subheading, body (optional), ctas[]. id usually "home".
- features/services: eyebrow, heading, items[] with {title, description, icon} (icon = one short lowercase keyword like "rocket", "shield", "spark", "bolt", "star", "heart", "chart", "globe", "clock", "users", "lock", "leaf", "camera", "code", "palette").
- about: eyebrow, heading, body. Optional items[] as bullet highlights {title}.
- products: heading, items[] with {title (name), description, price, cta (button label)}.
- pricing: heading, items[] with {title (plan), price, period, description, features[] (bullets), featured (true for ONE highlighted plan), cta (button label)}.
- testimonials: heading, items[] with {description (quote), title (person name), subtitle (role/company)}.
- faq: heading, items[] with {title (question), description (answer)}.
- stats: optional heading, items[] with {value (e.g. "10k+"), title (label)}.
- team: heading, items[] with {title (name), subtitle (role)}.
- steps/process: eyebrow, heading, items[] with {title, description}.
- gallery: heading, items[] with {title (caption)} — one per image slot.
- logos: optional heading, items[] with {title (brand name)}.
- cta: heading, body, ctas[].
- contact: heading, body, ctas[] (e.g. email / phone actions).
- newsletter: heading, body, ctas[] (e.g. "Subscribe").

Keep copy tight and editorial. Section ids are short slugs ("features", "pricing", "contact"). Produce a complete plan in one pass.`;

// JSON Schema for the strict structured output. Every object sets
// additionalProperties:false and lists every property in `required` (strict-mode
// rule); optionality is expressed by allowing empty values, not by omission.
const str = { type: 'string' } as const;
const CTA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: str,
    href: str,
    variant: { type: 'string', enum: ['primary', 'secondary', 'ghost'] },
  },
  required: ['label', 'href', 'variant'],
};
const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: str,
    subtitle: str,
    description: str,
    value: str,
    price: str,
    period: str,
    featured: { type: 'boolean' },
    features: { type: 'array', items: str },
    cta: str,
    icon: str,
  },
  required: ['title', 'subtitle', 'description', 'value', 'price', 'period', 'featured', 'features', 'cta', 'icon'],
};
const SECTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: SECTION_TYPES as unknown as string[] },
    id: str,
    eyebrow: str,
    heading: str,
    subheading: str,
    body: str,
    ctas: { type: 'array', items: CTA_SCHEMA },
    items: { type: 'array', items: ITEM_SCHEMA },
  },
  required: ['type', 'id', 'eyebrow', 'heading', 'subheading', 'body', 'ctas', 'items'],
};
const SITE_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    brandName: str,
    tagline: str,
    niche: str,
    theme: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mode: { type: 'string', enum: ['light', 'dark'] },
        primary: str,
        accent: str,
        style: { type: 'string', enum: ['aurora', 'glass', 'neon', 'minimal', 'luxe'] },
      },
      required: ['mode', 'primary', 'accent', 'style'],
    },
    nav: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { label: str, href: str },
        required: ['label', 'href'],
      },
    },
    sections: { type: 'array', items: SECTION_SCHEMA },
    excluded: { type: 'array', items: str },
  },
  required: ['brandName', 'tagline', 'niche', 'theme', 'nav', 'sections', 'excluded'],
};

/**
 * Plan a website from a prompt. Returns a validated SitePlan whose sections,
 * CTAs, and copy strictly reflect the user's instructions.
 *
 * @throws MissingApiKeyError if ANTHROPIC_API_KEY is unset.
 * @throws Error if the model could not produce a valid plan (refusal / truncation / invalid JSON).
 */
export async function buildSitePlan(prompt: string, brandName?: string): Promise<SitePlan> {
  const client = getAnthropic();

  const userText = brandName
    ? `Business / brand name: ${brandName}\n\nWebsite request:\n${prompt}`
    : `Website request:\n${prompt}`;

  const response = await client.messages.create({
    model: PLANNER_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Stable prefix → cacheable across generations (engages once large enough).
        cache_control: { type: 'ephemeral' },
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: SITE_PLAN_JSON_SCHEMA },
      effort: 'high',
    },
    messages: [{ role: 'user', content: userText }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('Planner could not produce a site plan: the request was refused.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Planner could not produce a site plan: the plan was too large to complete.');
  }

  const raw = response.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!raw) throw new Error('Planner returned no content.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Planner returned invalid JSON.');
  }

  const result = SitePlanSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Planner returned a plan that failed validation: ${result.error.message}`);
  }
  return result.data;
}
