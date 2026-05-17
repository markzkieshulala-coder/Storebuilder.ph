# Style Extraction Methodology Reference

This document provides the detailed methodology for the StyleExtractor vision analysis stage.

## Color Palette Extraction

### Dominant Color Detection
1. Sample the image at multiple scales (full, 50%, 25%) to catch both large background areas and small accent details.
2. Cluster similar colors using a perceptual color space (Lab or HSL) with a distance threshold of ~15–20 in Lab space.
3. Rank clusters by pixel coverage.

### Role Assignment
Assign extracted colors to semantic roles based on usage context:

| Role | Visual Cues | Typical Coverage |
|------|-------------|----------------|
| **background** | Largest contiguous area, often top/bottom edges | 30–70% |
| **surface** | Card backgrounds, secondary panels | 10–30% |
| **primary** | Buttons, active links, prominent CTAs | 2–10% |
| **secondary** | Supporting UI elements, hover states | 1–5% |
| **accent** | Badges, highlights, decorative elements | < 2% |
| **text** | Body text, headings | 5–15% |
| **border** | Dividers, card outlines, input borders | < 1% |

### Validation
- If the background and surface colors are too similar (Delta E < 10), infer a surface color by lightening/darkening the background by 5%.
- If no obvious primary color exists, select the most saturated color from the top 5 clusters or default to a neutral primary (`#3B82F6` blue) with low confidence.

## Typography Extraction

### Heading vs Body Differentiation
- Headings are typically larger, bolder, shorter line lengths.
- Body text is smaller, longer line lengths, lighter weight.

### Style Classification
| Visual Signature | Classification | Confidence Boost |
|-----------------|---------------|-----------------|
| Feet at baseline, varying stroke width | serif | High if clearly visible |
| Uniform stroke, no feet | sans-serif | High if clearly visible |
| Slanted, handwritten | script / decorative | Medium |
| Monospaced letters, code-like | mono | High if clearly visible |
| Tall, condensed, bold | display / condensed | Medium |

### Fallback
If the image resolution is too low to read letterforms, classify by overall texture:
- Clean, geometric layouts → sans-serif
- Editorial, magazine-like → serif
- Playful, rounded shapes → rounded sans or display

## Spacing Density Classification

### Density Scale
| Label | Visual Cues | Section Padding | Card Gap |
|-------|-------------|-----------------|----------|
| **tight** | Elements touch or nearly touch; minimal whitespace | < 40px | < 12px |
| **normal** | Comfortable padding, clear grouping | 40–80px | 16–24px |
| **airy** | Generous whitespace, elements feel isolated | 80–120px | 32–48px |
| **spacious** | Extreme whitespace, editorial or luxury feel | > 120px | > 48px |

### Measurement Heuristic
Estimate based on the ratio of content pixels to whitespace pixels in a representative UI section. A ratio below 1:1 suggests tight; 1:1 to 1:2 is normal; above 1:3 is spacious.

## Corner Radius Extraction

### Radius Scale
| Label | Pixel Range | Visual Cue |
|-------|-------------|------------|
| **sharp** | 0px | Hard 90-degree corners, geometric |
| **subtle** | 2–4px | Slightly softened, almost square |
| **medium** | 8–12px | Clearly rounded, modern default |
| **rounded** | 16–24px | Playful, friendly, prominent |
| **pill** | 9999px | Fully rounded ends, capsule shape |

### Extraction Method
Locate visible UI components (buttons, cards, inputs) and estimate the corner curvature. If multiple radii are present (e.g., buttons are pill but cards are medium), record each separately and flag the inconsistency.

## Mood & Tone Extraction

### Mood Vocabulary
Use only these terms for consistency:
- **Luxury**: dark backgrounds, gold/metallic accents, serif fonts, generous spacing
- **Playful**: bright saturated colors, rounded shapes, illustrations, asymmetry
- **Corporate**: blue/gray palette, clean grids, moderate spacing, professional photography
- **Minimal**: monochrome or near-monochrome, extreme whitespace, thin lines
- **Retro**: muted warm colors, vintage textures, serif headings, decorative borders
- **Futuristic**: dark mode, neon/gradient accents, geometric shapes, mono fonts
- **Organic**: earth tones, rounded shapes, nature imagery, handwritten fonts
- **Editorial**: high contrast, large serif headings, asymmetric layouts, dramatic imagery
- **Friendly**: warm colors, rounded everything, illustrations, casual copy tone
- **Serious**: dark neutrals, sharp corners, dense data, minimal decoration

### Assignment Rule
Assign up to 3 mood tags, ordered by visual dominance. If the mood is ambiguous, include the top 2–3 possibilities and score each below 0.7.

## Layout Rhythm Extraction

### Rhythm Types
| Type | Description | Common For |
|------|-------------|------------|
| **single-column** | All content stacks vertically | Blogs, landing pages, mobile-first |
| **two-column** | Split layout, often 50/50 or 60/40 | SaaS features, about pages |
| **card-grid** | Equal-sized cards in rows | Ecommerce, dashboards, SaaS pricing |
| **masonry** | Unequal heights, Pinterest-style | Portfolios, galleries, blogs |
| **bento** | Mixed-size grid cells, asymmetric | Dashboards, portfolios, modern SaaS |
| **editorial** | Asymmetric, overlapping, magazine | Agencies, fashion, creative |
| **hero + grid** | Large hero followed by structured grid | Most multi-section websites |

## Shadow & Depth Extraction

### Depth Scale
| Type | Visual Signature |
|------|-----------------|
| **flat** | No shadows, no depth cues; everything is on one plane |
| **soft-shadow** | Diffused, large-radius shadows with low opacity; gentle elevation |
| **hard-shadow** | Sharp, small-offset shadows; brutalist or retro feel |
| **glassmorphism** | Translucent backgrounds with backdrop blur and subtle border |
| **neumorphism** | Soft inner/outer shadows creating a "pressed" or "extruded" plastic look |

## Texture Extraction

### Texture Types
| Type | Description |
|------|-------------|
| **solid** | Flat, single-color backgrounds |
| **gradient** | Linear, radial, or angular color transitions |
| **pattern** | Repeating geometric or organic motifs |
| **photo** | Full-bleed photographic backgrounds |
| **noise** | Subtle grain or film noise overlay |
| **mesh-gradient** | Complex multi-stop fluid gradients |

## Confidence Scoring Guidelines

| Field | High Confidence (≥0.8) | Medium (0.5–0.7) | Low (<0.5) |
|-------|----------------------|-------------------|------------|
| palette | Colors are distinct, roles obvious | Some ambiguity between primary/secondary | Monochrome or heavily filtered image |
| typography | Text readable, letterforms clear | Readable but style unclear | Text too small or blurry |
| spacing | Clear section boundaries visible | Mixed densities across image | Image is a cropped close-up |
| shape | Components visible at natural size | Components small or partially cropped | No UI components visible |
| mood | Strong stylistic signals (dark luxury, bright playful) | Mixed signals | Very neutral or generic image |
| layout | Full page screenshot visible | Partial screenshot or single component | No layout context |
| shadow | Shadow edges clearly visible | Shadows very subtle or inconsistent | Flat design, no shadows to analyze |
| texture | Background dominates image | Background partially visible | Focused on foreground content |

## Low-Confidence & Error Handling

### Valid Design Reference = False
Set `valid_design_reference: false` when any of the following are true:
- No UI components (buttons, cards, inputs, navigation) are visible.
- The image is entirely a photograph of a real-world scene (landscape, person, object).
- The image is a logo or icon on a plain background with no layout context.
- Resolution is below 400px on the shortest side, making all extractions unreliable.
- Image is heavily blurred, pixelated, or has extreme filters applied.

### Warnings Array
Populate `warnings` whenever:
- A confidence score is below 0.6.
- Multiple conflicting values are detected (e.g., mixed corner radii).
- A field had to be inferred rather than directly observed.
- The image is a partial screenshot (e.g., only a header is visible).
