# Storebuilder.ph — Claude Code Project Rules

## CRITICAL: UI & Website Generation Must Use Stitch MCP

**These rules are permanent and apply to every session in this project.**

---

### Rule 1 — All UI/Website Design Generation Goes Through Stitch MCP

When any user request involves generating, designing, or producing:

- A new website layout or page
- UI components (hero sections, nav bars, footers, product grids, etc.)
- Website section content (features, testimonials, about, pricing, etc.)
- Design tokens (colors, typography, spacing, visual style)
- Full website generation from a user prompt

You **MUST** call the connected Stitch MCP server first to generate the design. Do not begin implementing until Stitch has returned its design output.

---

### Rule 2 — Generic AI-Generated HTML/CSS/UI is Forbidden

You are **forbidden** from:

- Writing HTML, CSS, or UI component code from your own default patterns or training knowledge
- Guessing layout structures, color palettes, or typographic choices without Stitch input
- Using hardcoded "template-style" designs (generic hero + features + footer patterns)
- Producing any UI that is not explicitly derived from Stitch's output for that request

There are **no exceptions** to this rule, regardless of prompt wording.

---

### Rule 3 — Workflow: Stitch First, Implement Second

The required workflow for every UI/website generation request is:

1. **Call Stitch MCP** with the user's prompt and any relevant context
2. **Receive design tokens, layout structure, and component specs** from Stitch
3. **Implement exactly** what Stitch returns — faithfully translating its output into code
4. Do not add, remove, or substitute any design decisions not provided by Stitch

Your role in UI generation is **implementation only**, not design authorship.

---

### Rule 4 — Design Fidelity is Mandatory

When implementing Stitch output:

- Use the **exact color values** returned by Stitch — do not substitute or "improve" them
- Use the **exact typography** (font families, sizes, weights) specified by Stitch
- Preserve the **exact layout structure** and section ordering from Stitch
- Keep all **copy, labels, and content** as provided by Stitch unless the user explicitly requests a change
- Do not apply personal aesthetic judgments or "cleanup" that modifies the Stitch design

---

### Rule 5 — What You May Do Without Stitch

The following tasks do not require Stitch and may be handled with your standard logic:

- Backend API routes (`/app/api/...`)
- Database schema changes (Prisma, migrations)
- Authentication, session, and server-side logic
- Bug fixes in existing non-UI code
- Performance, security, and infrastructure work
- Integrating Stitch output into the existing renderer/component system

---

### Rule 6 — If Stitch MCP Is Unavailable

If the Stitch MCP server is not reachable or returns an error:

1. **Stop and inform the user** that Stitch is unavailable
2. **Do not fall back** to generating UI from your own knowledge
3. Ask the user how they want to proceed (e.g. retry, provide Stitch output manually, or defer the task)

Do not silently substitute your own design work for Stitch output.

---

### Summary

| Task | Source |
|------|--------|
| UI layout, design tokens, visual style | Stitch MCP only |
| Component implementation | Stitch output → your code |
| Backend, API, DB, auth | Your standard logic |
| Copy / content adjustments | User direction |

**When in doubt: call Stitch first.**
