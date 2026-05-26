# Storebuilder.ph

## Website Generation Engine

The primary website generator is an in-process TypeScript orchestration engine
at `lib/engine/`. It runs a 9-stage pipeline (planning → blueprint → design-dna
→ component → frontend → motion → validation → scoring → final-rendering) with
no external AI API calls — fully deterministic and self-contained.

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

The engine's only runtime deps are `uuid` and `eventemitter3`. There is no
dependency on Claude/Anthropic or any external LLM.

### Scope note
The uploaded engine archive also contains ~250 auxiliary "rich" modules
(art-direction, typography, component-engine, scoring-engine, etc.). Those are
NOT on the executable critical path: they are not staged in the pipeline, some
ship corrupted (truncated) source, and they do not type-check under the repo's
strict config. Only the 28-file runnable orchestration core is integrated here
so `next build` stays green. Future work can repair and stage those modules.
