// ---------------------------------------------------------------------------
// SitePlan — the strict contract between the Claude PLANNER and the deterministic
// 3D RENDERER.
//
// The renderer renders ONLY what appears in a SitePlan. It never injects a
// section, button, or line of copy that the plan does not contain. Therefore the
// SitePlan is the single source of truth for prompt-adherence: if the user said
// "no FAQ", the planner omits the faq section (and records it in `excluded`), and
// the renderer — having nothing to render — cannot resurrect it.
//
// The schema is intentionally a flat superset: every section is one object with a
// `type` discriminator plus optional fields. The planner populates only the fields
// relevant to each type. This keeps the structured-output JSON schema simple and
// robust (no recursion, no deep unions) while staying expressive enough for any
// niche.
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Section kinds the renderer knows how to compose in the premium 3D design system. */
export const SECTION_TYPES = [
  'hero',
  'features',
  'about',
  'gallery',
  'products',
  'pricing',
  'testimonials',
  'faq',
  'stats',
  'team',
  'steps',
  'cta',
  'contact',
  'logos',
  'newsletter',
] as const;

/** A button / call-to-action. Every CTA the site shows must originate here. */
export const CtaSchema = z.object({
  label: z.string(),
  /** '#anchor-id' for in-page nav, 'contact', or an external/relative URL. */
  href: z.string(),
  variant: z.enum(['primary', 'secondary', 'ghost']),
});

/**
 * A generic item used across section types. Only the fields meaningful for a
 * given section are populated:
 *   features    → title, description, icon
 *   products    → title (name), description, price, cta
 *   pricing     → title (plan), price, period, description, features[], featured, cta
 *   testimonials→ description (quote), title (name), subtitle (role)
 *   faq         → title (question), description (answer)
 *   stats       → value, title (label)
 *   team        → title (name), subtitle (role)
 *   steps       → title, description
 *   gallery     → title (caption)
 *   logos       → title (name)
 */
export const SectionItemSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  value: z.string().optional(),
  price: z.string().optional(),
  period: z.string().optional(),
  featured: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  cta: z.string().optional(),
  icon: z.string().optional(),
});

export const SectionSchema = z.object({
  type: z.enum(SECTION_TYPES),
  /** Stable slug used as the anchor id and nav target (e.g. "features"). */
  id: z.string(),
  /**
   * Optional layout variant for the section renderer:
   * hero     → "left" (left-aligned) | "" (centred, default)
   * features → "list" (icon+text rows) | "" (card grid, default)
   * contact  → "with-form" (include a contact form) | "" (info + CTAs only)
   */
  layout: z.string().optional(),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  subheading: z.string().optional(),
  body: z.string().optional(),
  ctas: z.array(CtaSchema).optional(),
  items: z.array(SectionItemSchema).optional(),
});

export const ThemeSchema = z.object({
  mode: z.enum(['light', 'dark']),
  /** Primary brand colour as a hex string, e.g. "#6D28D9". Honour user-named colours exactly. */
  primary: z.string(),
  /** Secondary/accent colour as a hex string. */
  accent: z.string(),
  /** 3D design flavour applied deterministically by the renderer. */
  style: z.enum(['aurora', 'glass', 'neon', 'minimal', 'luxe']),
});

export const NavItemSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const SitePlanSchema = z.object({
  brandName: z.string(),
  tagline: z.string(),
  niche: z.string(),
  theme: ThemeSchema,
  /** Nav links — must reference only sections that exist in `sections`. */
  nav: z.array(NavItemSchema),
  /** Ordered sections. The renderer emits these verbatim, in this order, and nothing else. */
  sections: z.array(SectionSchema),
  /** Elements the user explicitly asked to exclude — recorded for transparency, never rendered. */
  excluded: z.array(z.string()),
});

export type SitePlan = z.infer<typeof SitePlanSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SectionItem = z.infer<typeof SectionItemSchema>;
export type Cta = z.infer<typeof CtaSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
