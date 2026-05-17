---
name: premium-asset-pipeline
description: Use when the user needs high-quality visual assets, brand imagery, icons, or professional conversion-focused copy for a website generation project. Activates for requests about sourcing images, generating AI visuals, finding unique assets, writing website copy, or integrating assets into a design system. Also triggers when merging asset manifests with the Universal Design Manifest.
---

# Premium Asset & Branding Pipeline

A system that sources high-fidelity visual assets and generates professional, conversion-optimized copy for website projects. It connects to image search APIs (e.g., Unsplash) and AI image generators (e.g., Flux), enforces uniqueness across generations via an Anti-Repetition Engine, and produces a NicheCopywriter that delivers industry-matched, non-placeholder text.

## Architecture

The pipeline has three independent stages that can run in parallel:

1. **ImageAssetPipeline** — fetches or generates visual assets (hero images, product shots, backgrounds, icons) based on the website type and design DNA.
2. **Anti-Repetition Engine** — tracks every used asset ID in persistent storage and enforces uniqueness across all generations.
3. **NicheCopywriter** — generates professional, conversion-focused copy that matches the industry, tone, and design DNA from the user's request.

The final output is an **Asset Manifest** (standalone JSON) plus optional **inline references** inside the Universal Design Manifest (UDM).

## Prerequisites: External API Integration

This skill references image tools that must be added to the workspace via MCP or custom tools:
- **Unsplash API** (or similar stock photo API) for real-world photography search
- **Flux / DALL-E / Stable Diffusion** for AI-generated custom imagery

If these tools are not configured in the workspace, the pipeline falls back to placeholder asset entries with `source: "pending"` and a detailed `fetch_instructions` block so the agent knows exactly what to retrieve once the APIs are connected.

## Stage 1: Image Asset Pipeline

### Asset Categories
Every website generation defines a set of required asset slots. The pipeline fills each slot from the best available source.

| Slot | Description | Typical Count | Source Priority |
|------|-------------|---------------|-----------------|
| `hero_images` | Large above-the-fold visuals | 1–3 | AI generate > Unsplash search |
| `product_images` | Product/service shots | 3–8 | Unsplash > AI generate |
| `background_textures` | Subtle ambient backgrounds | 0–2 | AI generate > Unsplash |
| `icon_set` | UI icons (outline or filled) | 20–40 | Icon library > AI generate |
| `testimonial_avatars` | Person portraits for reviews | 3–6 | Unsplash > AI generate |
| `team_photos` | Professional headshots | 2–8 | Unsplash > AI generate |
| `gallery_images` | Portfolio / showcase shots | 4–12 | Unsplash > AI generate |
| `lifestyle_images` | Context / usage photography | 2–6 | Unsplash > AI generate |
| `decorative_illustrations` | Custom graphics, patterns | 0–4 | AI generate |

### Source Priority Logic
1. **AI Generate** — use when the design DNA calls for a specific, unique visual style (e.g., "futuristic glassmorphism hero," "custom illustrated characters"). Also preferred for hero images where brand uniqueness matters most.
2. **Unsplash Search** — use for real-world photography, lifestyle shots, product contexts, and any slot where authenticity and diversity are important.
3. **Icon Library** — use for icon_set slots; search by semantic keyword (e.g., "shopping-cart", "user-profile").
4. **Fallback** — if no external tool is available, emit a structured `pending_asset` entry with detailed generation/search instructions.

### Asset Record Schema
Each asset is recorded as:
```json
{
  "id": "uuid",
  "slot": "hero_images",
  "source": "unsplash|flux|icon_library|pending",
  "external_id": "unsplash_photo_id_or_flux_job_id",
  "url": "https://...",
  "alt_text": "Descriptive accessible text",
  "prompt_or_query": "The exact search query or generation prompt used",
  "dimensions": { "width": 1920, "height": 1080 },
  "aspect_ratio": "16:9",
  "dominant_colors": ["#hex1", "#hex2"],
  "mood_match_score": 0.87,
  "used_in_components": ["hero", "cta_background"]
}
```

### Mood Match Scoring
When selecting from multiple search results, score each candidate against the design DNA:
- **Color harmony** (40%): dominant colors align with the UDM palette
- **Subject relevance** (30%): image subject matches the website type and slot purpose
- **Composition** (20%): aspect ratio and framing fit the component layout
- **Quality** (10%): resolution, sharpness, professional aesthetic

Select the top-scoring image that also passes the Anti-Repetition Engine.

## Stage 2: Anti-Repetition Engine

### Purpose
Track every asset used across all website generations to prevent the same Unsplash photo, AI seed, or icon from appearing in multiple client projects.

### Storage
Used-asset records are persisted in `/skills/premium-asset-pipeline/data/used-assets.json`.

```json
{
  "version": "1.0.0",
  "last_updated": "2026-05-15T00:00:00Z",
  "assets": [
    {
      "id": "uuid",
      "external_id": "unsplash_photo_id",
      "source": "unsplash",
      "slot": "hero_images",
      "website_type": "ecommerce",
      "timestamp": "2026-05-10T14:22:00Z",
      "project_id": "optional-user-ref"
    }
  ]
}
```

### Deduplication Rules
1. **Exact ID match** — any asset with a matching `external_id` and `source` is permanently blocked from reuse.
2. **Semantic similarity** — if an exact match is unavailable, check the `prompt_or_query` field. Block assets whose query/prompt is ≥80% similar (Levenshtein or embedding distance) to a previously used one within the same `website_type`.
3. **Visual similarity** — for Unsplash, also block assets from the same photographer or same collection if ≥2 assets from that source were already used.
4. **Icon dedup** — icon names (e.g., "shopping-cart") are globally unique; once used, the same semantic icon cannot be reused unless the icon library provides a stylistically different variant.

### Uniqueness Scoring
For each candidate asset, compute:
```
uniqueness_score = 1.0 - similarity_to_used_assets
```
Assets with `uniqueness_score < 0.3` are rejected. Assets with `0.3–0.6` are flagged as `borderline` and require an explicit `warning` in the manifest.

### Maintenance
- Append new entries after every generation.
- If the log exceeds 1000 entries, archive the oldest 200 entries to `/skills/premium-asset-pipeline/data/used-assets-archive.json`.
- If no log file exists, initialize it with an empty `assets` array.

## Stage 3: NicheCopywriter

### Purpose
Generate professional, conversion-focused website copy that matches the industry, tone, and design DNA. Never output placeholder text ("Lorem ipsum", "Your Company Name", "Sample Product").

### Input Requirements
The NicheCopywriter requires:
- `website_type` (from IntentParser)
- `industry_niche` (e.g., "luxury watches", "B2B SaaS analytics", "vegan meal delivery")
- `tone` (from design DNA mood tags + user prompt modifiers)
- `target_audience` (e.g., "C-suite executives", "Gen Z consumers", "new parents")
- `key_value_proposition` (extracted or inferred from user prompt)
- `conversion_goals` (e.g., "purchase", "signup", "book demo", "subscribe")

### Copy Modules
For each website type, the NicheCopywriter generates these standard modules:

| Module | Purpose | Length Target |
|--------|---------|---------------|
| `headline` | Hero H1 — immediate value statement | 6–12 words |
| `subheadline` | Hero H2 — expands on the promise | 12–25 words |
| `cta_primary` | Main call-to-action button text | 2–5 words |
| `cta_secondary` | Secondary CTA (learn more, watch demo) | 3–6 words |
| `benefits` | 3–6 benefit cards with title + description | Title: 3–5 words, Description: 15–30 words each |
| `social_proof_intro` | Intro text before testimonials/logos | 10–20 words |
| `testimonials` | 3–6 quotes with name, role, company | Quote: 20–40 words each |
| `pricing_toggle` | Monthly / Annual toggle label | 2 words |
| `pricing_cta` | Pricing card button text | 2–4 words |
| `faq_intro` | FAQ section header + subtext | Header: 2–4 words, Subtext: 10–20 words |
| `faq_items` | 4–8 Q&A pairs | Question: 8–15 words, Answer: 25–60 words |
| `footer_tagline` | Brand sign-off | 6–12 words |
| `seo_meta_title` | `<title>` tag | 50–60 chars |
| `seo_meta_description` | `<meta name="description">` | 150–160 chars |
| `nav_labels` | Navigation item labels | 1–3 words each |

### Industry-Specific Copy Rules

#### Ecommerce
- Headlines focus on scarcity, quality, or transformation ("The Last Jacket You'll Ever Need").
- Benefits emphasize shipping, returns, material quality.
- CTAs use action verbs + urgency ("Shop Now", "Get Yours", "Claim Your Discount").
- Testimonials include specific outcomes ("Arrived in 2 days, fits perfectly").

#### SaaS
- Headlines lead with the outcome, not the feature ("Close 30% More Deals" not "CRM Software").
- Benefits are feature → outcome pairs ("Automated follow-ups → never lose a lead").
- CTAs reduce friction ("Start Free Trial", "See It In Action", "No Credit Card Required").
- Social proof emphasizes metrics ("10,000+ teams", "99.9% uptime").

#### Portfolio
- Headlines are identity-forward ("Crafting Digital Experiences").
- Tone is confident but not arrogant; let work speak.
- CTAs are low-commitment ("View Projects", "Let's Talk").
- Testimonials are replaced by "client praise" or "collaborator notes."

#### Restaurant
- Headlines evoke sensory experience ("Where Every Bite Tells a Story").
- Benefits are ambiance + cuisine + service.
- CTAs are reservation-focused ("Book a Table", "View Menu", "Order Online").
- Copy uses appetite-triggering adjectives.

#### Agency
- Headlines promise transformation ("We Build Brands That People Remember").
- Benefits are process → result ("Strategy → Design → Growth").
- CTAs invite consultation ("Start a Project", "Get a Proposal").
- Social proof is case-study-driven.

#### Real Estate
- Headlines emphasize lifestyle + location ("Live Where the City Meets the Park").
- Benefits highlight convenience, investment value, community.
- CTAs are inquiry-driven ("Schedule a Tour", "Get a Valuation").
- Copy uses aspirational but grounded language.

### Tone Calibration
Map design DNA mood tags to copy tone:

| Mood Tag | Tone Keywords | Sentence Style |
|----------|-------------|---------------|
| luxury | refined, exclusive, understated | Longer sentences, precise vocabulary, minimal punctuation |
| playful | energetic, fun, approachable | Short sentences, contractions, exclamation points |
| corporate | confident, clear, authoritative | Active voice, data-driven, no fluff |
| minimal | essential, direct, uncluttered | Shortest possible phrasing, no adverbs |
| retro | nostalgic, warm, story-driven | Storytelling structures, period-appropriate idioms |
| futuristic | bold, visionary, cutting-edge | Forward-looking verbs, tech terminology, imperative mood |
| organic | natural, honest, warm | Earth metaphors, first-person plural, gentle persuasion |
| editorial | sophisticated, cultured, opinionated | Varied sentence length, literary references, confident takes |
| friendly | welcoming, helpful, conversational | Second person, questions, inclusive language |
| serious | factual, professional, respectful | Third person, measured tone, evidence-based claims |

## Output: Asset Manifest

The pipeline produces a standalone JSON file. See `assets/asset-manifest-template.json` for the full schema.

Key sections:
- `meta` — pipeline version, timestamp, source DNA reference
- `assets` — array of all sourced/generated assets
- `copy` — all NicheCopywriter modules organized by page section
- `anti_repetition_log` — snapshot of the uniqueness state for this generation
- `warnings` — flagged borderline assets, missing slots, or fallback entries

## UDM Integration

The Asset Manifest can be merged into the Universal Design Manifest by adding a `media` section:

```json
{
  "media": {
    "asset_manifest_version": "1.0.0",
    "asset_manifest_url": "./asset-manifest.json",
    "hero_image_ref": "asset_id_hero_01",
    "palette_verification": {
      "asset_dominant_colors": ["#hex1", "#hex2"],
      "udm_palette_match_score": 0.85
    },
    "copy_refs": {
      "headline": "copy_module_headline",
      "benefits": "copy_module_benefits"
    }
  }
}
```

This lets downstream generators pull asset URLs and copy by reference without duplicating content.

## Gotchas

- If no external image API is configured, the pipeline still runs but marks every asset as `pending`. The user must connect Unsplash/Flux via MCP before assets can be resolved.
- The Anti-Repetition Engine only tracks exact `external_id` matches automatically. Semantic similarity requires manual comparison of `prompt_or_query` fields; do not block assets solely on vague similarity.
- AI-generated images often lack alt text — the pipeline must auto-generate descriptive alt text from the generation prompt, not leave it blank.
- Unsplash images may have attribution requirements; the pipeline records `photographer_name` and `attribution_url` for every Unsplash asset.
- The NicheCopywriter must never generate copyrighted brand names or real person names for testimonials unless the user explicitly provides them. Use generic but realistic names and companies (e.g., "Sarah Chen, VP of Operations, Atlas Logistics").
- If the user prompt is extremely vague on industry niche, infer from `website_type` + `design_dna.mood` and flag the inference in `warnings`.
