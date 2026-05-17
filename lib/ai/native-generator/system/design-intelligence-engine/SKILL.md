---
name: design-intelligence-engine
description: Use when the user wants to generate, analyze, or systematize website design systems from a text prompt and/or uploaded reference image. Activates for requests about design DNA extraction, style replication, visual system creation, website type detection, or any task that requires parsing user intent into a structured universal design manifest.
---

# Vision-Driven Design Intelligence Engine

A system that turns a user's text prompt and optional uploaded design reference image into a structured, versioned Universal Design Manifest (JSON). The manifest is the single source of truth for all downstream visual generation.

## Architecture

The engine has three sequential stages:

1. **IntentParser** — classifies the website type from the user's text prompt.
2. **StyleExtractor** — performs vision analysis on an uploaded reference image to extract a "Design DNA" (colors, typography, spacing, shape language, mood).
3. **UniversalDesignManifest (UDM)** — merges the niche requirements with the style DNA into one authoritative JSON document that dictates every visual rule.

## Stage 1: IntentParser

### Purpose
Analyze the user's free-text prompt and classify the website type.

### Supported Website Types
- ecommerce
- portfolio
- saas
- blog
- landing-page
- dashboard
- restaurant
- agency
- education
- real-estate

### Classification Method
1. Look for explicit keywords (e.g., "online store" → ecommerce, "my photography work" → portfolio).
2. Infer from domain context if keywords are absent (e.g., "sell products" → ecommerce, "track metrics" → dashboard).
3. If classification confidence is below 0.7, default to `landing-page` and log a low-confidence flag.

### Output
```json
{
  "website_type": "ecommerce",
  "confidence": 0.95,
  "extracted_keywords": ["store", "products", "cart"],
  "inferred": false
}
```

## Stage 2: StyleExtractor

### Purpose
Analyze an uploaded design reference image and extract the "Design DNA" — a structured description of every visual primitive.

### Extraction Targets

| Target | What to Extract | Granularity |
|--------|----------------|-------------|
| **Palette** | All dominant colors | Hex values, grouped by role (primary, secondary, accent, background, surface, text, border) |
| **Typography** | Font family style | Serif, sans-serif, display, mono, or a specific named font if clearly identifiable |
| **Spacing Density** | Tight / normal / airy / spacious | Based on whitespace ratios and padding apparent in the image |
| **Corner Radius** | Sharp, subtle (2-4px), medium (8-12px), rounded (16px+), pill | Based on visible UI components |
| **Mood & Tone** | Emotional impression | Keywords like "luxury", "playful", "corporate", "minimal", "retro", "futuristic" |
| **Layout Rhythm** | Grid density | Single-column, two-column, card-grid, masonry, bento, editorial |
| **Shadow & Depth** | Elevation style | Flat, soft shadow, hard shadow, glassmorphism, neumorphism |
| **Texture** | Background fills | Solid, gradient, pattern, photo, noise, mesh gradient |

### Confidence Scoring
Every extracted field must include a `confidence` score (0.0–1.0). If any field scores below 0.5, flag the entire extraction as `low_confidence: true` and add a `warnings` array.

### Error Handling for Non-Design Images
If the uploaded image is clearly not a UI design (e.g., a photograph of a landscape, a blurry screenshot, or a logo-only image), the StyleExtractor must:
- Set `valid_design_reference: false`
- Return an empty `design_dna` object
- Provide a `fallback_recommendation` describing a modern minimal default style
- Include a human-readable `error_message` in the UDM output

### Output
```json
{
  "valid_design_reference": true,
  "design_dna": {
    "palette": {
      "primary": "#3B82F6",
      "secondary": "#1E40AF",
      "accent": "#F59E0B",
      "background": "#FFFFFF",
      "surface": "#F3F4F6",
      "text": "#111827",
      "border": "#E5E7EB"
    },
    "typography": {
      "heading_style": "sans-serif",
      "body_style": "sans-serif",
      "heading_weight": "bold",
      "body_weight": "regular",
      "scale_ratio": "1.25"
    },
    "spacing": {
      "density": "normal",
      "section_padding": "80px",
      "card_gap": "24px"
    },
    "shape": {
      "corner_radius": "medium",
      "button_radius": "pill",
      "card_radius": "12px"
    },
    "mood": ["modern", "clean", "professional"],
    "layout_rhythm": "card-grid",
    "shadow_depth": "soft-shadow",
    "texture": "solid"
  },
  "confidence_scores": {
    "palette": 0.92,
    "typography": 0.78,
    "spacing": 0.65,
    "shape": 0.88,
    "mood": 0.70,
    "layout_rhythm": 0.60,
    "shadow_depth": 0.55,
    "texture": 0.50
  },
  "low_confidence": false,
  "warnings": []
}
```

## Stage 3: Universal Design Manifest (UDM)

### Purpose
Merge the IntentParser result with the StyleExtractor DNA and layer on niche-specific design requirements. Produce a single authoritative JSON document.

### Conflict Resolution Rule
When the user's text prompt implies a style that contradicts the uploaded image (e.g., prompt says "dark theme" but image is bright), the UDM **merges both** and records the conflict explicitly in a `conflicts` array. Neither source is silently overwritten. The `resolution` field documents the chosen value and which source was prioritized for that field.

### Niche-Specific Requirement Layering
Every website type has design requirements that must be injected into the manifest. See `references/website-type-requirements.md` for the full table of niche rules.

Key principles:
- Palette overrides from the niche are **defaults**, not hard locks. The StyleExtractor palette always takes precedence unless the niche explicitly demands a specific functional color (e.g., ecommerce checkout buttons need a high-contrast CTA).
- Typography defaults from the niche (e.g., SaaS prefers clean sans-serif) only apply if the StyleExtractor could not identify a font style (low confidence).
- Layout defaults from the niche (e.g., portfolio needs a hero gallery) are additive — they extend the base layout, they don't replace it.

### Manifest Schema
The full JSON schema is documented in `assets/manifest-template.json`. The UDM output must contain the following top-level sections:

- `meta` — version, timestamp, engine_name
- `intent` — IntentParser result
- `design_dna` — StyleExtractor output
- `niche_requirements` — injected rules from the website type
- `resolved_tokens` — final merged values (colors, fonts, spacing, shapes, shadows, layout)
- `component_rules` — per-component styling directives
- `conflicts` — array of prompt-vs-image conflicts with resolutions
- `warnings` — aggregated from all stages

### Versioning
Every manifest must include `meta.version` in semver format. Increment minor version when niche requirements change; increment patch when only token values change.

## Using This Skill

When the user provides a text prompt and/or an image:
1. Run the IntentParser on the prompt.
2. If an image is present, run the StyleExtractor on the image.
3. Merge both into a UDM JSON, applying niche rules and conflict resolution.
4. Return only the UDM JSON (or a markdown-wrapped JSON block). Do not explain the engine stages unless asked.

If the user only wants one stage (e.g., "just analyze this image"), run only that stage and return its native output format.

## Gotchas

- Do not invent hex values if the image is too low-resolution to read colors. Flag low confidence instead.
- Mood extraction is subjective — always provide the `mood` array but score it low confidence (0.5–0.7) unless the mood is visually unambiguous.
- The `layout_rhythm` field should describe the *dominant* rhythm, not every possible layout variation.
- When no image is provided, the StyleExtractor is skipped and the UDM uses only `niche_requirements` defaults plus any style hints from the prompt.
- The `component_rules` section must be populated even when no image is present — fall back to niche defaults.
