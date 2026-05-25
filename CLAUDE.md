# Storebuilder.ph

## Website Generation Engine

The primary website generator is an in-process TypeScript orchestration engine
at `lib/engine/`. It runs a 9-stage pipeline (planning → blueprint → design-dna
→ component → frontend → motion → validation → scoring → final-rendering) with
no external AI API calls — fully deterministic.

- Entry point: `lib/engine/generate.ts` → `generateWebsite(prompt, brandName)`
- HTML composition: `lib/engine/html-renderer.ts` turns design/planning artifacts
  into one self-contained HTML document (inlined CSS + JS, no external assets).
- API route: `app/api/generate/route.ts` (POST) runs the engine, stores the HTML
  in `Website.htmlContent`, and deducts a credit.
- Generated sites are served via iframe through `app/sites/[subdomain]` and
  `app/preview/[id]`.

The engine's only runtime deps are `uuid` and `eventemitter3`. There is no
dependency on Claude/Anthropic or any external LLM.
