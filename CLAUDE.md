# Storebuilder.ph

## Website Generation Engine

The primary website generator is an in-process TypeScript orchestration engine
at `lib/engine/`. It runs a 9-stage pipeline (planning → blueprint → design-dna
→ component → frontend → motion → validation → scoring → final-rendering). The
generation/rendering itself is fully deterministic and self-contained — no
external API is required to build a site.

- Entry point: `lib/engine/generate.ts` → `generateWebsite(prompt, brandName)`
- Orchestration: `lib/engine/bootstrap.ts` wires the engines into a
  `PipelineOrchestrator` (registry, retry, event bus, in-memory persistence).
- Premium HTML composition: `lib/engine/html-renderer.ts` turns the design-dna
  (palette, typography, spacing, motion tokens, light/dark theme) and planning
  artifacts into ONE self-contained, responsive, animated HTML document —
  niche-aware copy (restaurant / portfolio / ecommerce / agency / saas /
  business), Google Fonts, glassmorphism nav, cinematic hero, feature grid,
  showcase, gallery, stats, testimonials, CTA, contact form, footer, and
  IntersectionObserver scroll reveals. No external assets beyond Google Fonts.
- API route: `app/api/generate/route.ts` (POST) runs the engine, stores the HTML
  in `Website.htmlContent`, and deducts a credit. The raw INSERT casts the
  `WebsiteType` enum (`$N::"WebsiteType"`) and includes the required `prompt`
  column.
- Generated sites are served via iframe through `app/sites/[subdomain]` and
  `app/preview/[id]`.

### Unified LLM understanding (optional, key-gated)
`lib/engine/understanding.ts` → `buildUnderstanding(prompt)` is the single source
of truth for prompt comprehension, called by BOTH `/api/analyze` and
`/api/generate`. It always produces a deterministic `PromptUnderstandingObject`
(PUO) via `parsePrompt`. When `ANTHROPIC_API_KEY` is set, it additionally runs a
single Claude pass (`lib/engine/llm-understanding.ts`) that reads the WHOLE
prompt — precise sub-niche, named products/dishes, explicit hero copy, requested
sections, brand voice, color cues — and folds the result back into the PUO
(`mergeLlmIntoPuo`): it refines `inferredIndustry`/`extractedKeywords`/mood/style/
tone/palette and stashes prompt-specific copy under `customAttributes.llm`, which
`html-renderer.ts` (`applyLlmCopy`) overlays onto the deterministic copy banks.
The Anthropic SDK is loaded via dynamic `import()` and the call has graceful
timeout/error fallback, so with no key (or offline) the engine behaves exactly as
the deterministic parser and `next build` stays green. Model is configurable via
`LLM_MODEL` (default `claude-opus-4-8`). The LLM only sharpens understanding —
the rendering engine remains deterministic and in-process.

### In-house image engine (no third-party sources)
Images are produced entirely in-house — NO Unsplash, Pexels, stock APIs, or
shared CDN library. `lib/engine/image-backend.ts` → `generateSiteImages` uses two
in-house paths: (1) an optional self-hosted Stable-Diffusion/SDXL generator at
`IMAGE_GEN_URL` (auto-probed; photoreal, niche-matched; cached to
`public/generated`), and (2) the in-process generative visual engine
(`lib/engine/visual-engine.ts`), which is ALWAYS available, needs no network, and
is seeded per (prompt-fingerprint × slot) so every image is unique — two
same-niche sites never share a visual and no image repeats within a site. Set
`IMAGE_GEN_ENABLED=0` to force the visual engine only.

The engine's core runtime deps are `uuid` and `eventemitter3`. Building a site
requires no external LLM; `@anthropic-ai/sdk` is an OPTIONAL enhancement used only
for the prompt-understanding pass when `ANTHROPIC_API_KEY` is configured.

### Scope note
The uploaded engine archive also contains ~250 auxiliary "rich" modules
(art-direction, typography, component-engine, scoring-engine, etc.). Those are
NOT on the executable critical path: they are not staged in the pipeline, some
ship corrupted (truncated) source, and they do not type-check under the repo's
strict config. Only the 28-file runnable orchestration core is integrated here
so `next build` stays green. Future work can repair and stage those modules.
