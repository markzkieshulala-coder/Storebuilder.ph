// ---------------------------------------------------------------------------
// PROMPT CONTRACT — strict interpretation + ultra-modern 3D design baseline
//
// Every generation runs in "strict" mode: sections, CTAs, and copy blocks appear
// only when the prompt (or explicit NLU extraction) requests them. Visual output
// always receives a premium glassmorphism / futuristic 3D treatment unless the
// user overrides design tokens in the prompt.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from './prompt-engine';
import type { VisualMood, DesignStyle, WebsitePersonality } from './prompt-engine/types';
import {
  extractRequirements,
  type RequirementSet,
  type SectionKind,
} from './requirements';
import type { WebsiteSpec } from './spec';

/** Baseline design DNA for every build — Stitch-like premium 3D ultra-modern. */
export function applyUltraModernDesignBaseline(puo: PromptUnderstandingObject): PromptUnderstandingObject {
  const out: PromptUnderstandingObject = { ...puo, visual: { ...puo.visual }, motion: { ...puo.motion } };

  const prompt = (puo.originalPrompt || '').toLowerCase();
  const userNamedStyle = /\b(glassmorphism|futuristic|3d|ultra[\s-]?modern|premium|luxury|cinematic|minimal|brutalist|neumorphism|cyberpunk|retro|editorial)\b/i.test(prompt);
  const userNamedMood = /\b(dark|light|dramatic|muted|vibrant|warm|cold|contrast)\b/i.test(prompt);

  if (!userNamedStyle) {
    out.designStyle = 'glassmorphism' as DesignStyle;
  } else if (/\b3d\b|ultra[\s-]?modern/i.test(prompt) && out.designStyle === 'skeuomorphic') {
    out.designStyle = 'glassmorphism' as DesignStyle;
  }

  if (!userNamedMood) {
    out.visualMood = 'dark' as VisualMood;
  }

  if (!/\b(calm|playful|whimsical|friendly|youthful)\b/i.test(prompt)) {
    out.websitePersonality = 'sophisticated' as WebsitePersonality;
  }

  out.visualDensity = 'balanced';
  out.modernityLevel = 'cutting-edge';
  out.motion = {
    ...out.motion,
    enabled: true,
    complexity: 'cinematic',
    duration: { ...out.motion.duration, normal: '0.55s', slow: '0.85s' },
    easing: { ...out.motion.easing, default: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  };

  const cp = out.visual.colorPalette;
  if (!/\b#[0-9a-f]{6}\b/i.test(prompt) && !/\b(black and gold|gold and black)\b/i.test(prompt)) {
    out.visual = {
      ...out.visual,
      colorPalette: {
        ...cp,
        background: cp.background || '#07070a',
        surface: cp.surface || '#111118',
        primary: cp.primary || '#6366f1',
        accent: cp.accent || '#a78bfa',
        secondary: cp.secondary || '#818cf8',
      },
    };
  }

  return out;
}

/** Merge prompt requirements with the authoritative WebsiteSpec for fidelity scoring. */
export function requirementSetFromSpec(prompt: string, spec: WebsiteSpec): RequirementSet {
  const base = extractRequirements(prompt);
  const required = new Set<SectionKind>(base.required);
  for (const k of spec.sections) required.add(k);
  const forbidden = new Set<SectionKind>([...base.forbidden, ...spec.forbiddenSections]);
  for (const k of required) forbidden.delete(k);

  return {
    required: [...required],
    forbidden: [...forbidden],
    requiredPages: base.requiredPages,
    forbiddenPages: base.forbiddenPages,
    rawRequired: base.rawRequired,
    rawForbidden: base.rawForbidden,
  };
}

export function sectionAllowed(spec: WebsiteSpec, kind: SectionKind): boolean {
  return spec.sections.includes(kind) && !spec.forbiddenSections.includes(kind);
}
