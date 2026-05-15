# Storebuilder.ph — Claude Code Project Rules

## CRITICAL: UI & Website Generation Must Use the Native Premium Generator

**These rules are permanent and apply to every session in this project.**

The previous Stitch MCP rule has been retired. Stitch is no longer used for
website generation. Storebuilder.ph now ships with an internal generator —
referred to here as the **Native Premium Generator** — and that engine is the
single source of truth for all UI and website design generation in this
project.

---

### Rule 1 — All UI/Website Design Generation Goes Through the Native Premium Generator

When any user request involves generating, designing, or producing:

- A new website layout or page
- UI components (hero sections, nav bars, footers, product grids, etc.)
- Website section content (features, testimonials, about, pricing, etc.)
- Design tokens (colors, typography, spacing, visual style)
- Full website generation from a user prompt

You **MUST** call the Native Premium Generator (the internal engine wired into
`lib/ai/generate.ts` and reached via `app/api/generate/route.ts`). Do not begin
implementing UI changes until that generator has returned its output.

---

### Rule 2 — Generic AI-Generated HTML/CSS/UI Is Forbidden

You are **forbidden** from:

- Writing HTML, CSS, or UI component code from your own default patterns or
  training knowledge
- Guessing layout structures, color palettes, or typographic choices outside
  of what the Native Premium Generator returns
- Using hardcoded "template-style" designs (generic hero + features + footer
  patterns)
- Producing any generated website UI that is not derived from the Native
  Premium Generator's output for that request

There are **no exceptions** to this rule, regardless of prompt wording.

---

### Rule 3 — Workflow: Generator First, Implement Second

The required workflow for every UI/website generation request is:

1. **Call the Native Premium Generator** with the user's prompt and any
   relevant context
2. **Receive the generated HTML, metadata, and any design tokens** it returns
3. **Implement / persist exactly** what the generator returns — faithfully
   storing its output as the source of truth
4. Do not add, remove, or substitute any design decisions the generator did
   not produce

Your role in UI generation is **integration and persistence**, not design
authorship.

---

### Rule 4 — Design Fidelity Is Mandatory

When handling the generator's output:

- Use the **exact HTML, color values, typography, and structure** returned by
  the generator — do not substitute or "improve" them
- Preserve **copy, labels, and content** as produced unless the user
  explicitly requests a change
- Do not apply personal aesthetic judgments or "cleanup" that modifies the
  generated design

---

### Rule 5 — What You May Do Without the Generator

The following tasks do not require the Native Premium Generator and may be
handled with your standard logic:

- Backend API routes (`/app/api/...`)
- Database schema changes (Prisma, migrations)
- Authentication, session, and server-side logic
- Bug fixes in existing non-UI code
- Performance, security, and infrastructure work
- Integrating generator output into the existing renderer, editor, and
  preview pipeline
- The editor surface itself (`components/editor/HtmlEditor.tsx` and the
  iframe + `data-editable` bridge) — this is application chrome around the
  generated HTML, not a design decision

---

### Rule 6 — If the Native Premium Generator Is Unavailable

If the generator throws, fails, or returns an empty/invalid result:

1. **Stop and inform the user** that the generator is unavailable
2. **Do not fall back** to generating UI from your own knowledge, an external
   API, or any previously-retired engine (including Stitch)
3. Ask the user how they want to proceed (retry, provide output manually,
   defer the task)

Do not silently substitute your own design work for the generator's output.

---

### Summary

| Task | Source |
|------|--------|
| UI layout, design tokens, visual style | Native Premium Generator only |
| Component implementation / persistence | Generator output → your code |
| Backend, API, DB, auth | Your standard logic |
| Copy / content adjustments | User direction |

**When in doubt: call the Native Premium Generator first.**
