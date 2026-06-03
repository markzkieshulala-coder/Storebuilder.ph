# Storebuilder.ph

## Website Generation Engine — Hybrid (Claude planner → deterministic 3D renderer)

The generator is a HYBRID pipeline: Claude interprets the prompt and produces a
strict, validated **SitePlan**; a deterministic in-house engine renders that plan
into ONE premium, "3D ultra-modern" HTML document. The model strictly follows the
prompt — it includes only the sections, CTAs, and copy the prompt asks for, and
honours explicit exclusions ("no FAQ", "no testimonials"). The renderer renders
ONLY what the plan contains: it never injects a section, button, or line of copy
that is not in the plan, uses no RNG, and uses no template/copy banks. This is what
makes output prompt-specific instead of template-shaped.

Flow: `prompt → buildSitePlan() [Claude] → SitePlan → renderSitePlan() → HTML`.

- **Plan contract:** `lib/ai/site-plan.ts` — the `SitePlan` zod schema (brand,
  theme, nav, ordered `sections[]`, explicit `excluded[]`). The single source of
  truth for what may appear on the site.
- **Planner:** `lib/ai/planner.ts` → `buildSitePlan(prompt, brandName)`. Calls
  Claude (`claude-opus-4-8`, adaptive thinking, `effort: high`) via
  `@anthropic-ai/sdk` with a hand-authored strict JSON-Schema structured output
  (`output_config.format`), then validates the JSON with the zod schema. A strong
  system prompt enforces strict adherence + exclusions. Prompt-cached system block.
  Uses a hand-written JSON Schema (not the SDK zod helper) because the project pins
  zod v3 while the SDK helper targets zod v4.
- **Client:** `lib/ai/client.ts` — lazily constructed Anthropic client. Importing
  the module needs no key (keeps `next build` green offline); `getAnthropic()`
  throws `MissingApiKeyError` only at call time. Env: `ANTHROPIC_API_KEY` (required).
- **3D renderer:** `lib/render3d/render.ts` → `renderSitePlan(plan)`. Deterministic
  premium design system (aurora lighting, glassmorphism, gradient text, 3D pointer
  tilt, IntersectionObserver reveals, Google Fonts) with one renderer per section
  type, each reading ONLY its plan data. Returns the same multi-page result shape
  the route/DB/serving layer expects (`{ html, pages, nav, ... }`); the site is a
  single rich page with in-page anchor nav (`pages = { '/': html }`).
- **Entry:** `lib/ai/generate-ai.ts` → `generateWebsiteAI(prompt, brandName)` wires
  planner→renderer and returns the legacy `EngineGenerationResult` shape so the DB
  and iframe serving (`app/sites/[subdomain]`, `app/preview/[id]`) are unchanged.
- **API route:** `app/api/generate/route.ts` (POST) calls `generateWebsiteAI`,
  stores the HTML in `Website.htmlContent` + pages in `jsonContent`, deducts a
  credit. Returns 503 if `ANTHROPIC_API_KEY` is missing. The raw INSERT casts the
  `WebsiteType` enum (`$N::"WebsiteType"`) and includes the required `prompt` column.

> Premium photography (Pexels) is currently not wired into the 3D renderer — image
> slots use on-brand CSS gradient art. Re-integrating `lib/engine/pexels.ts` per
> plan content is a natural follow-up.

### LEGACY (superseded) — in-house deterministic engine `lib/engine/`

The previous generator was a 100%-in-house, zero-AI engine: an NLU + deterministic
parser produced design tokens and copy from niche template banks, and
`lib/engine/html-renderer.ts` composed the HTML. It is **no longer on the
`/api/generate` critical path** (it produced repetitive, template-shaped sites and
sometimes emitted sections the prompt excluded — the reason for the hybrid rewrite).
The code remains in the tree and its `__tests__` still pass; treat it as reference,
not the active pipeline. The historical "no external AI / no network" description
below applies to that legacy engine only.

### (Legacy) In-house NLU understanding (zero external AI, one process)
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

### Strict prompt contract + ultra-modern 3D baseline
Every build applies `lib/engine/prompt-contract.ts` after NLU fold:
- **Sections** appear only when named in requirement bullets or an explicit
  `sections:` list — functional-intent regex no longer auto-adds FAQ/testimonials.
- **CTAs** render only when the user wrote CTA text or an intent phrase (`order now`, etc.).
- **Layout graph** nodes are filtered to `WebsiteSpec.sections`; composer never
  falls back to an unrestricted graph.
- **Visual baseline**: glassmorphism + dark mood + high motion unless the prompt
  names other design tokens. Global CSS includes premium 3D depth (perspective cards,
  glass surfaces, floating hero media).
- **Fidelity gate** scores rendered HTML against `requirementSetFromSpec(prompt, spec)`.

### Images: content-aware Pexels photos (unique per build)
Real visuals come from the **Pexels Search API**, resolved per section from the
EXACT content that section displays — not a single broad keyword.

- `html-renderer.ts` → `planSiteImagery(context, brandName, understanding)` runs
  the SAME deterministic understanding + `buildSiteCopy` logic the renderer uses,
  then emits one Pexels query per image slot:
  - products / services → `"<exact product name> <niche>"` (key `name:<norm>`)
  - features            → `"<exact feature title> <niche>"` (key `name:<norm>`)
  - hero / gallery / team / about → niche + rotating context modifiers (`pool:N`)
- `lib/engine/pexels.ts` → `resolveSiteImagery(requests, seed)` calls the
  Pexels Search API (`Authorization: <PEXELS_API_KEY>`), and enforces GLOBAL
  uniqueness via a persistent ledger of every photo id ever used
  (`public/generated/.pexels-used.json`) — so no image is reused across builds,
  even within the same niche. A per-generation page offset (from `seed`) further
  varies which slice of results each query draws from.
- `lib/engine/image-provider.ts` → `fetchSiteImagery(plan, seed)` is the bridge:
  it bounds the whole phase with a timeout (`PEXELS_BUDGET_MS`, default 30s) and
  degrades gracefully to empty imagery on any failure.
- `generate.ts` plans → fetches → injects the `ResolvedImagery` (`pool` +
  `byName`) into `renderMultiPageSite`. `productPhoto(name)` returns the exact
  content-matched photo by normalized name; `getPhotos` distributes the unique
  pool across hero/gallery/about/team. `ph(url,w,h)` appends per-slot sizing
  (`w=W&h=H&fit=crop&auto=compress`) to each Pexels URL.

If `PEXELS_API_KEY` is unset, or the API is rate-limited / unreachable, every slot
falls back to a BRANDED CSS placeholder (palette gradient + glow + photo glyph) —
site generation never hangs or breaks.

Env: `PEXELS_API_KEY` (required for real photos; free at https://www.pexels.com/api/),
`PEXELS_BUDGET_MS` (default 30000), `PEXELS_TIMEOUT_MS` (per-search, default 8000).
The earlier self-hosted Stable Diffusion image engine (`lib/engine/image-engine/`,
`tools/image-generator/`) and the in-house illustration engines were removed.

The engine's core runtime deps are `uuid` and `eventemitter3`. Building a site —
including understanding the prompt — requires no external LLM (no Anthropic /
OpenAI / Google SDK in the tree); the only network call anywhere is the Pexels
photo lookup, which is optional and degrades to placeholders.

### Scope note
The uploaded engine archive also contains ~250 auxiliary "rich" modules
(art-direction, typography, component-engine, scoring-engine, etc.). Those are
NOT on the executable critical path: they are not staged in the pipeline, some
ship corrupted (truncated) source, and they do not type-check under the repo's
strict config. Only the 28-file runnable orchestration core is integrated here
so `next build` stays green. Future work can repair and stage those modules.
