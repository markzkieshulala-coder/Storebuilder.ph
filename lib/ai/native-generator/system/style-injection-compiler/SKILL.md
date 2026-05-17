---
name: style-injection-compiler
description: Use when assembling a final website from a Design Manifest, Content Object, and React components. Triggers for requests involving code generation, React project scaffolding, website build, style injection, layout assembly, multi-page structure creation, or outputting a deployable code bundle from design tokens and component libraries.
---

# Style-Injection Code Compiler

A compiler that consumes the **Universal Design Manifest (UDM)**, the **Asset + Copy Manifest (ACM)**, and the **Universal Component Library** to produce a complete, deployable React/Tailwind website. Every visual decision in the output traces back to the UDM. Every piece of content traces back to the ACM.

## Architecture

```
Input: UDM JSON + ACM JSON + Component Library
         ↓
    [Layout Hierarchy Mapper] — reads reference image structure
         ↓
    [Page Assembly Engine] — composes pages from components
         ↓
    [Style Injector] — generates globals.css from UDM tokens
         ↓
    [Content Injector] — binds ACM copy + assets to component props
         ↓
    [Code Generator] — outputs .tsx pages, components, and config files
         ↓
Output: Clean React/Tailwind project bundle
```

## Core Responsibilities

1. **Style Injection**: Convert every UDM token into a CSS custom property in `globals.css`. No token is dropped or approximated.
2. **Content Injection**: Bind every ACM asset (image URL) and copy block (headline, body, CTA) to the matching component prop.
3. **Layout Assembly**: Map the visual hierarchy of the user's reference image to a sequence of components on each page. Detect repeated patterns (header → hero → grid → testimonials → footer) and instantiate them.
4. **Multi-Page Routing**: Generate a page tree from the UDM `navigation.pages` array. Create route files in Next.js App Router or React Router format.
5. **Responsive Output**: Every generated page includes Tailwind responsive classes and CSS variable breakpoints. No page is desktop-only.

## Reference Files

- `references/build-pipeline.md` — Step-by-step generation process
- `references/layout-hierarchy-mapper.md` — How to read a reference image and build a page layout tree
- `references/page-assembly-rules.md` — Multi-page composition and routing rules
- `references/code-generation-patterns.md` — Output code standards and patterns
- `references/output-project-template.md` — Final bundle directory structure

## Compiler Stages

### Stage 1: Layout Hierarchy Mapping
Analyze the user's uploaded reference image to extract the DOM-level section sequence. Output a `layout-tree.json` with ordered nodes.

### Stage 2: Token-to-CSS Translation
Generate `globals.css` with every UDM token mapped to a CSS variable. Include density scale math, font-face declarations, and critical inline styles.

### Stage 3: Page Composition
For each page in the UDM navigation:
1. Read `layout-tree.json`
2. Instantiate component imports from the Universal Component Library
3. Inject ACM content into component props
4. Render as a `.tsx` page file

### Stage 4: Route Generation
Create routing configuration (Next.js `page.tsx` files or React Router `Routes`).

### Stage 5: Asset Binding
Write static asset references (images from ACM) as `<img src>` or `background-image` bindings.

### Stage 6: Build Output
Produce a project tree with `package.json`, `tailwind.config.js`, `next.config.js`, and all source files.

## Quality Gate

The output must meet these criteria:
- Every CSS value is a variable reference, never a literal
- Every component import traces to the Universal Component Library
- Every page has `<meta>` title/description from ACM `seo_meta`
- Every image has `alt` text from ACM
- No placeholder text or `lorem ipsum` remains in output
- No broken imports or unresolved variables
- `npm run build` succeeds without errors (assuming dependencies installed)

## Gotchas

- **Font loading**: The compiler must emit `<link>` tags or `@import` for Google Fonts referenced in `--font-heading` and `--font-body`.
- **Image domains**: If using Next.js `<Image>`, add external image domains to `next.config.js`. If using standard `<img>`, no config needed.
- **Tailwind JIT**: The generated code uses arbitrary values like `bg-[var(--color-primary)]`. Ensure `tailwind.config.js` sets `mode: 'jit'` or uses Tailwind v3+ which handles arbitrary values natively.
- **CSS variable scoping**: All variables must be defined in `:root` inside `globals.css`. Never scope variables to component-level classes.
- **Hydration mismatches**: When using Next.js App Router, ensure client components that read CSS variables at runtime are marked with `"use client"`.
- **Asset fallback**: If an ACM asset URL is empty or fails, the compiler should output a `<div>` with the correct aspect ratio and background color instead of a broken `<img>`.
- **Page duplication**: If the UDM has multiple pages with identical layout trees, the compiler should still generate separate files — do not attempt to reuse a single page component.
