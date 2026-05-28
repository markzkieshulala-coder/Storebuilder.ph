import { parsePrompt } from './prompt-engine';
import type { PromptUnderstandingObject, UnderstandingOverrides } from './prompt-engine';

// ─────────────────────────────────────────────────────────────────
// UNIFIED UNDERSTANDING LAYER
// ─────────────────────────────────────────────────────────────────
// A single function turns a prompt (plus optional upstream-analyzer output)
// into ONE canonical PromptUnderstandingObject. Both /api/analyze (what the
// user is shown) and /api/generate (what the renderer builds) call this, so
// the displayed concept and the generated site can never diverge.

// Structured concept emitted by the Gemini understanding step. Field values
// are constrained by the analyze route's system prompt to the engine's own
// vocabularies; anything off-vocabulary is dropped during validation downstream.
export interface AnalyzerConcept {
  niche?: string;
  designStyle?: string;
  visualMood?: string;
  personality?: string;
  tone?: string;
  audience?: string;
  keywords?: string[];
  sections?: string[];
  artisticDirection?: string;
  colorHint?: string;
}

// Near-miss synonyms → engine vocabulary. Keeps a slightly-off analyzer value
// useful instead of silently falling back to a deterministic guess.
const MOOD_SYNONYMS: Record<string, string> = {
  cool: 'cold', natural: 'grounded', earthy: 'grounded', energetic: 'vibrant',
  bright: 'light', moody: 'dramatic', dreamy: 'ethereal', bold: 'dramatic',
};
const STYLE_SYNONYMS: Record<string, string> = {
  modern: 'minimal', classic: 'editorial', bold: 'brutalist', elegant: 'luxury',
  clean: 'minimal', sleek: 'minimal', professional: 'corporate', tech: 'high-tech',
};
const PERSONALITY_SYNONYMS: Record<string, string> = {
  professional: 'trustworthy', creative: 'experimental', modern: 'innovative',
  fun: 'whimsical', premium: 'exclusive', luxurious: 'exclusive',
};
const TONE_SYNONYMS: Record<string, string> = {
  conversational: 'casual', inspirational: 'empathetic', bold: 'authoritative',
  warm: 'empathetic', friendly: 'accessible', confident: 'authoritative',
};

function norm(v: string | undefined, syn: Record<string, string>): string | undefined {
  if (!v) return undefined;
  const lower = v.trim().toLowerCase();
  return syn[lower] ?? lower;
}

// Parse free-text colour guidance ("deep navy, gold accents, cream text") into
// the named/hex tokens the palette generator understands.
function parseColorHint(hint: string | undefined): string[] {
  if (!hint) return [];
  const hexes = hint.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
  const named = hint.toLowerCase().match(
    /\b(red|green|blue|yellow|orange|purple|pink|teal|cyan|indigo|violet|gold|emerald|rose|amber|coral|navy|maroon|lime|turquoise|sapphire|ruby|mint|crimson|forest|copper|bronze|charcoal|cream|ivory|olive|burgundy)\b/g
  ) ?? [];
  return [...new Set([...hexes, ...named])];
}

export function conceptToOverrides(concept?: AnalyzerConcept | null): UnderstandingOverrides | undefined {
  if (!concept) return undefined;
  const overrides: UnderstandingOverrides = {};
  if (concept.niche?.trim()) overrides.industry = concept.niche.trim().toLowerCase();
  const mood = norm(concept.visualMood, MOOD_SYNONYMS);
  if (mood) overrides.visualMood = mood;
  const style = norm(concept.designStyle, STYLE_SYNONYMS);
  if (style) overrides.designStyle = style;
  const personality = norm(concept.personality, PERSONALITY_SYNONYMS);
  if (personality) overrides.websitePersonality = personality;
  const tone = norm(concept.tone, TONE_SYNONYMS);
  if (tone) overrides.businessTone = tone;
  if (concept.audience?.trim()) overrides.audience = concept.audience.trim();
  if (concept.artisticDirection?.trim()) overrides.artisticDirection = concept.artisticDirection.trim();
  if (Array.isArray(concept.keywords) && concept.keywords.length) {
    overrides.keywords = concept.keywords.filter((k) => typeof k === 'string' && k.trim()).map((k) => k.trim());
  }
  const colors = parseColorHint(concept.colorHint);
  if (colors.length) overrides.extractedColors = colors;
  return overrides;
}

// THE single source of truth. Given a prompt and optional analyzer concept,
// returns the canonical PUO that drives BOTH the concept display and the render.
export function buildUnderstanding(prompt: string, concept?: AnalyzerConcept | null): PromptUnderstandingObject {
  const overrides = conceptToOverrides(concept);
  const result = parsePrompt(prompt, undefined, overrides);
  if (result.success) return result.object;
  // Safe fallback if the prompt somehow fails to parse.
  return parsePrompt('modern professional website').object;
}
