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

### In-house NLU understanding (zero external AI, one process)
Prompt comprehension is 100% in-house and runs in the SAME process as the
generator — there is NO external AI of any kind (no Claude, OpenAI, Google/Gemini,
or Ollama) and NO network call anywhere in the understand→generate path.

`lib/engine/understanding.ts` → `buildUnderstanding(prompt)` is the single source
of truth, called by BOTH `/api/analyze` and `/api/generate`, so the concept the
user previews and the site that gets built come from identical logic. It runs a
unified pipeline:

1. **In-house NLU** (`lib/engine/nlu/`) — `understandPrompt(prompt)` reads the
   WHOLE prompt with rule + lexicon logic: it detects the precise (sub-)niche,
   the brand name, the colours the user named, the hero headline and button
   labels they wrote (via the `prompt-copy` sub-module), the products/services
   they listed, and the sections they requested — then synthesises any on-brand
   copy the prompt left implicit from the niche profile lexicon
   (`lib/engine/nlu/lexicon.ts`). It suppresses its own niche defaults for any
   design dimension the user spoke to explicitly, so explicit words always win.
2. **Deterministic parser** (`lib/engine/prompt-engine`) — fed the NLU's niche as
   an override plus the salient keywords, it computes the full design-token set
   (palette, typography, layout, motion); explicit design words in the prompt
   still win here too.
3. **Fold** (`lib/engine/nlu/fold.ts`) — `foldNluIntoPuo` layers the NLU's rich,
   prompt-specific content onto the PUO's `customAttributes.llm` channel (the name
   is retained for renderer compatibility), which `html-renderer.ts`
   (`applyLlmCopy`) overlays onto the deterministic copy banks. It also fills any
   design dimension the parser left at its generic fallback (e.g. for niches the
   parser carries no defaults for) and applies explicit/niche colours.

The whole path is synchronous, in-process, and dependency-free, so `next build`
stays green offline.

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

The engine's core runtime deps are `uuid` and `eventemitter3`. Building a site —
including understanding the prompt — requires no external LLM, no API key, and no
network. There is no Anthropic/OpenAI/Google SDK in the dependency tree.

### Scope note
The uploaded engine archive also contains ~250 auxiliary "rich" modules
(art-direction, typography, component-engine, scoring-engine, etc.). Those are
NOT on the executable critical path: they are not staged in the pipeline, some
ship corrupted (truncated) source, and they do not type-check under the repo's
strict config. Only the 28-file runnable orchestration core is integrated here
so `next build` stays green. Future work can repair and stage those modules.
