# Storebuilder.ph

## Website Generation Engine

No generation engine is currently integrated. `lib/engine/` has been wiped.

- API route: `app/api/generate/route.ts` — currently returns 503 (stub placeholder)
- Generated sites are served via iframe through `app/sites/[subdomain]` and `app/preview/[id]`

A new engine should be integrated at `lib/engine/` and wired into `app/api/generate/route.ts`.
