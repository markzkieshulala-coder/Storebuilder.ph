# Phase 5 — Renderer → ContentPlan Migration Notes

Status after **Phase 3C**: `ContentPlan` (`content/plan.ts`) is the single source of
content *generation*. Every section renderer, however, still consumes the flat
`SiteCopy` shape produced by the compatibility adapter
(`content/adapter.ts → contentPlanToSiteCopy`). This document records what is left
to migrate and what blocks direct `ContentPlan` consumption. **Phase 5 is not started.**

## The seam

```
buildSiteCopy(puo, brand, fp, spec, layoutPlan)        // html-renderer.ts:1269
  → buildContentPlan(...)         // returns ContentPlan (provenance-tagged)
  → contentPlanToSiteCopy(plan)   // adapter.ts — UNWRAPS .value, DROPS provenance
  → SiteCopy                      // every renderer consumes this
```

The adapter is the single choke point. Renderers never see `ContentValue<T>` —
only the unwrapped `.value`. Provenance therefore never reaches rendering and is
available only via `getLastContentPlan()` for reporting/audit.

## Renderers still consuming `SiteCopy` (Phase 5 targets)

### A. Home section renderers (driven by `RenderCtx.copy`)
These read `ctx.copy.*` and are on the **live** home-render path:

| Renderer | Fields consumed | Notes |
|---|---|---|
| `renderHeroSection` | heroHeadline, heroSub, heroTag, primaryCta, secondaryCta | live |
| `renderClusterSection` / `renderFrameSection` | features, sectionEyebrow, featureHeading | live (features) |
| `renderStripSection` | stats | live |
| `renderSplitSection` / `renderTileSection` / `renderStageSection` | aboutBody, missionBody, headings | live (story) |
| `renderGallerySection` | products, galleryHeading, productEyebrow | live (products) |
| `renderSignalSection` | ctaHeading, ctaSub, primaryCta | live (cta) |
| `renderListSection` | testimonials, faqs | live (testimonials/faq) |
| `renderPricingSection` | pricingPlans | live (pricing) |
| `renderContactBandSection` | contactHeading, contactSub | live (contact) |

### B. Standalone page builders (driven by `copy: SiteCopy` param) — live
`buildAboutMain`, `renderAboutPage`, `buildGalleryMain`, `renderGalleryPageHtml`,
`buildContactMain`, `renderContactPageHtml`, `buildPricingMain`,
`renderPricingPageHtml`, `buildCartMain`, `buildCheckoutMain`, `buildTeamMain`,
`buildReservationsMain`, `buildFooter`.

### C. Standalone page builders — **DEAD** (no live call site)
Only reachable through `buildHiddenPrimaryPage` / `buildHiddenSecondaryPage`, which
have **zero callers** (verified Phase 3 audit): `buildServicesMain`,
`buildProcessMain`, `buildOurStoryMain`, `buildDemoMain`, `buildCaseStudiesMain`,
`buildProgramsMain`, `buildCoachesMain`, `buildLookbookMain`, `buildNewArrivalsMain`.
These carry niche template banks (`SERVICES_BY_INDUSTRY`, `PROCESS_STEPS_BY_INDUSTRY`).
**Phase 5 should delete them** (and the two dead dispatchers) rather than migrate.

### D. Content generated OUTSIDE ContentPlan (deferred to Phase 4, not Phase 5)
These fabricate structural placeholder content and are explicitly marked
`DEFERRED CONTENT (Phase 4)` in `html-renderer.ts`. They carry **no** provenance:

- `renderEventsSection` — 3 placeholder events
- `renderBlogSection` — 3 placeholder posts
- `renderTeamSection` / `buildTeamMain` — placeholder people
- cart/checkout microcopy, nav labels, page `<title>`s

`buildPricingMain`'s hardcoded FAQ was **removed in Phase 3C**; the pricing page now
renders FAQs only from `copy.faqs` (i.e. from ContentPlan).

## What blocks direct `ContentPlan` consumption

1. **Field-shape coupling.** Renderers read bare strings/arrays (`copy.heroHeadline`,
   `copy.products`). Direct consumption means changing every read site to
   `plan.heroHeadline.value` (or adding a typed accessor). Mechanical but wide
   (~24 RenderCtx renderers + ~13 page builders).
2. **`RenderCtx` carries `copy: SiteCopy`.** Phase 5 must add `plan: ContentPlan`
   to `RenderCtx` (or replace `copy`), then update all `ctx.copy.*` reads.
3. **Post-build mutation of `copy`.** `renderMultiPageSiteInner` rewrites CTA targets
   on the flat object after build (`copy.gallerySlug = layoutPlan.primaryCtaTarget`,
   `copy.hiddenPrimarySlug = …`). These are *layout* targets, not content, and are
   intentionally not in `ContentPlan`. Phase 5 must keep a small layout-targets
   struct separate from `ContentPlan` rather than folding them in.
4. **Adapter-only fields.** `gallerySlug`, `hiddenPrimarySlug/SecondarySlug`,
   `hiddenPrimaryCtaLabel/SecondaryCtaLabel` exist in `SiteCopy` but not in
   `ContentPlan`. They are layout wiring; keep them out of `ContentPlan`.
5. **Provenance-aware rendering is optional.** Direct consumption *enables*
   provenance-driven rendering (e.g. suppress a section when `source === 'generic'`),
   but nothing requires it yet. Phase 5 can migrate shape first, then opt into
   provenance decisions incrementally.

## Suggested Phase 5 order

1. Add `plan: ContentPlan` to `RenderCtx` alongside `copy` (no behaviour change).
2. Migrate home section renderers (group A) to read `plan.*.value`.
3. Migrate live page builders (group B).
4. Delete dead builders + dispatchers (group C).
5. Remove `copy: SiteCopy` and the `contentPlanToSiteCopy` adapter once no reader
   remains. Keep a tiny `LayoutTargets` struct for the CTA-target wiring.
6. (Optional) Begin provenance-driven rendering decisions.
