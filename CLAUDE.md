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

### Images: Website Image Engine (integrated as one system)
Real, niche-matched photos are produced by the **Website Image Engine**, vendored
in-repo at `lib/engine/image-engine/` and run as part of the same pipeline:
- `image-engine/analyze.ts` infers niche / audience / tone / style / visual-mode /
  palette from the prompt.
- `image-engine/engine.ts` (`WebsiteImageEngine.generate`) plans N distinct assets
  (hero / feature / background / detail / product / lifestyle), builds rich SD
  prompts (variation pools + strong negative prompt + preset steps/cfg), calls the
  local Stable Diffusion server, writes PNGs to `public/generated/`, and keeps a
  repetition-guard memory (`public/generated/.image-engine-memory.json`) so
  visuals don't repeat across sites.
- `image-engine/backend/automatic1111.ts` POSTs `/sdapi/v1/txt2img` (the same SD
  server `tools/image-generator` runs on `:7860`).

`lib/engine/image-provider.ts` is the single bridge: `generateSiteImages(puo, fp,
brandName)` builds the engine request from the resolved PUO (prompt, palette,
mood, industry → brand context), runs the engine, and maps the written files to
public `/generated/*.png` URLs that `generate.ts` injects into the renderer
(hero, split, gallery, product cards, CTA). It is bounded by a total timeout
(`IMAGE_ENGINE_TIMEOUT_MS`, default 180s) and a graceful fallback: if the SD
server is offline/slow or `IMAGE_GEN_ENABLED=0`, it returns `[]` and every slot
renders a neutral CSS gradient placeholder (transparent pixel over
`linear-gradient(--surf,--bg)`) — so site generation never hangs or breaks. No
third-party image source is contacted; only your own local SD server.

Env: `IMAGE_GEN_URL` (default `http://127.0.0.1:7860`), `IMAGE_GEN_ENABLED`,
`IMAGE_GEN_COUNT` (1–8, default 6), `IMAGE_GEN_PRESET` (balanced|premium|fast),
`IMAGE_ENGINE_TIMEOUT_MS`. The earlier in-house illustration engines
(`visual-engine.ts`, `canvas-engine.ts`, `image-backend.ts`, `image-cache.ts`,
`image-agent.ts`, `placeholder.ts`) were removed.

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
