---
name: universal-component-library
description: Use when building React components for a website generation project. Activates for requests involving Tailwind CSS, React UI components, design systems, component libraries, hero sections, product grids, galleries, testimonials, or any frontend component construction. Also triggers when integrating a Universal Design Manifest into a component-based architecture.
---

# Universal Master Component Library

A React + Tailwind CSS component library where every component is **style-agnostic**, **CSS-variable-driven**, and **fluid** — automatically adapting layout, density, and visual weight based on the Universal Design Manifest (UDM). No hardcoded colors, fonts, spacing, or radii exist in any component.

## Architecture Principles

1. **CSS Variables as the Single Source of Truth**
   All visual values are consumed from CSS custom properties defined in `globals.css`. Components reference these via Tailwind's `var()` syntax (e.g., `bg-[var(--color-primary)]`).

2. **Fluid Layout System**
   Components read `layout` tokens from the UDM and morph their structure:
   - **Density** (`--spacing-density`) controls padding, gap, and margin scales
   - **Layout rhythm** (`--layout-rhythm`) switches between single-column, card-grid, masonry, bento, and editorial layouts
   - **Shape** (`--shape-radius`) controls border-radius globally

3. **Zero Hardcoded Values**
   No literal hex codes, pixel values, or font names in any `.tsx` file. Every style decision is a variable lookup.

4. **UDM Reactive**
   The `globals.css` file is the only artifact that changes between website generations. All components remain identical across projects.

## File Structure

```
/assets/
  globals.css                 # CSS variables mapped to UDM tokens
  components/
    Hero.tsx                  # Fluid hero with 6 layout variants
    ProductGrid.tsx           # Fluid product grid with 4 density modes
    Gallery.tsx               # Fluid gallery with 5 rhythm variants
    Testimonials.tsx          # Fluid testimonials with 3 layout styles
    Button.tsx                # Shared primitive: CTA button
    Card.tsx                  # Shared primitive: surface card
    Badge.tsx                 # Shared primitive: label badge
    Container.tsx             # Shared primitive: max-width wrapper
/references/
  component-patterns.md       # Component authoring rules and patterns
```

## CSS Variables → UDM Mapping

The `globals.css` file exports a complete variable system. Each variable maps 1:1 to a UDM token:

| CSS Variable | UDM Token | Example Value |
|-------------|-----------|---------------|
| `--color-primary` | `resolved_tokens.colors.primary` | `#0F172A` |
| `--color-secondary` | `resolved_tokens.colors.secondary` | `#334155` |
| `--color-accent` | `resolved_tokens.colors.accent` | `#6366F1` |
| `--color-background` | `resolved_tokens.colors.background` | `#FFFFFF` |
| `--color-surface` | `resolved_tokens.colors.surface` | `#F8FAFC` |
| `--color-text` | `resolved_tokens.colors.text` | `#0F172A` |
| `--color-text-muted` | `resolved_tokens.colors.text_muted` | `#64748B` |
| `--color-text-inverse` | `resolved_tokens.colors.text_inverse` | `#FFFFFF` |
| `--color-border` | `resolved_tokens.colors.border` | `#E2E8F0` |
| `--font-heading` | `resolved_tokens.typography.heading_family` | `serif` or `sans-serif` |
| `--font-body` | `resolved_tokens.typography.body_family` | `sans-serif` |
| `--font-mono` | `resolved_tokens.typography.mono_family` | `monospace` |
| `--spacing-density` | `resolved_tokens.spacing.density` | `normal` (1x) |
| `--spacing-scale` | `resolved_tokens.spacing.scale` | `1` |
| `--shape-radius` | `resolved_tokens.shape.corner_radius` | `0.5rem` |
| `--shadow-type` | `resolved_tokens.shadow.type` | `soft` |
| `--layout-rhythm` | `resolved_tokens.layout.rhythm` | `card-grid` |
| `--layout-max-width` | `resolved_tokens.layout.max_width` | `1280px` |
| `--motion-speed` | `resolved_tokens.motion.speed` | `normal` |
| `--motion-easing` | `resolved_tokens.motion.easing` | `cubic-bezier(0.4,0,0.2,1)` |

## Component Patterns

### Fluid Layout Selection

Every major component exposes a `layout` prop that defaults to the CSS variable `--layout-rhythm`. The component uses a switch or conditional class map to render a different DOM structure.

```tsx
// Pattern used in Hero, ProductGrid, Gallery, Testimonials
const layoutClass = {
  'single-column': 'flex flex-col',
  'card-grid': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  'masonry': 'columns-1 md:columns-2 lg:columns-3',
  'bento': 'grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(200px,auto)]',
  'editorial': 'grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-lg)]',
}[layout || 'card-grid'];
```

### Density-Driven Spacing

Padding and gap values are multiplied by `--spacing-scale`:

```tsx
// spacing values are CSS variables that scale with density
const space = {
  tight: { xs: '0.25rem', sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem' },
  normal: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem' },
  airy: { xs: '0.75rem', sm: '1.5rem', md: '2.5rem', lg: '4rem', xl: '6rem' },
  spacious: { xs: '1rem', sm: '2rem', md: '4rem', lg: '6rem', xl: '10rem' },
};
```

Components read `--spacing-density` to select the correct scale.

### Shape-Driven Border Radius

All rounded corners use `--shape-radius` directly. No component uses `rounded-lg` or `rounded-sm`.

```tsx
className="rounded-[var(--shape-radius)]"
```

### Shadow-Driven Depth

Shadow styles are looked up from a variable map:

```tsx
const shadowMap = {
  flat: 'shadow-none',
  soft: 'shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
  hard: 'shadow-[0_8px_32px_rgba(0,0,0,0.16)]',
  glass: 'backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
  neumorphic: 'shadow-[8px_8px_16px_rgba(0,0,0,0.08),-8px_-8px_16px_rgba(255,255,255,0.9)]',
};
```

### Motion-Driven Transitions

All transitions use `--motion-speed` and `--motion-easing`:

```tsx
className="transition-all duration-[var(--motion-speed)] ease-[var(--motion-easing)]"
```

## Component Catalog

### Hero.tsx
6 layout variants controlled by `--layout-rhythm`:
1. **Split** — 2-column text + image, classic landing page
2. **Centered** — stacked centered content, single-column focus
3. **Fullscreen** — edge-to-edge background image with overlay text
4. **Bento** — asymmetric grid with featured media and stats
5. **Editorial** — magazine-style asymmetric text + image
6. **Minimal** — ultra-sparse centered text, maximum whitespace

### ProductGrid.tsx
4 density modes:
1. **Tight** — compact cards, minimal padding, information-dense
2. **Normal** — balanced padding, clear hierarchy
3. **Airy** — generous spacing, luxury feel
4. **Spacious** — editorial spacing, gallery-like presentation

Plus 3 grid rhythms:
- `card-grid` — uniform columns
- `masonry` — Pinterest-style varying heights
- `bento` — featured items span multiple cells

### Gallery.tsx
5 layout rhythms:
- `single-column` — full-width images stacked
- `card-grid` — uniform thumbnail grid
- `masonry` — varying aspect ratios
- `bento` — featured hero image with supporting tiles
- `editorial` — text captions interleaved with images

### Testimonials.tsx
3 layout styles:
- `single-column` — stacked quote cards
- `card-grid` — 2–3 column grid of cards
- `editorial` — large featured quote + smaller supporting quotes

## Shared Primitives

### Button.tsx
A single CTA primitive with 3 visual roles (`primary`, `secondary`, `ghost`). All colors, radius, shadow, and spacing are variable-driven.

### Card.tsx
A surface container with configurable padding, radius, shadow, and background. Used as the building block for grids, testimonials, and product cards.

### Badge.tsx
A small label component for tags, categories, and status indicators.

### Container.tsx
A max-width wrapper that reads `--layout-max-width`. Centers content and applies responsive padding.

## Usage in a Generation Pipeline

1. The build system reads the UDM JSON.
2. It generates `globals.css` by mapping each UDM token to a CSS variable.
3. Components are imported as-is — no source modification.
4. Changing `--layout-rhythm` to `editorial` causes Hero, Gallery, and Testimonials to instantly switch to editorial layouts.
5. Changing `--spacing-density` to `spacious` instantly increases all padding and gaps across the entire site.

## Gotchas

- **Tailwind arbitrary values**: Since we use `bg-[var(--color-primary)]`, ensure `tailwind.config.js` includes `var()` in the safelist or uses `mode: 'jit'` which handles arbitrary values automatically.
- **CSS variable defaults**: All variables must have fallback values in `globals.css` so components render correctly even if a token is missing from the UDM.
- **Server-side rendering**: CSS variables work in SSR environments, but the initial render may flash if the variable stylesheet is loaded late. Inline critical variables in `<head>`.
- **Font loading**: `--font-heading` and `--font-body` should reference `@font-face` declarations or Google Fonts loaded in the HTML `<head>`.
- **Masonry layout**: Requires `columns-*` utilities. For complex masonry with React, consider `react-masonry-css` or CSS columns. The library provides the CSS-columns fallback.
- **Shape radius extremes**: When `--shape-radius` is `0` (sharp), ensure components don't accidentally inherit browser defaults. Always explicitly apply `rounded-[var(--shape-radius)]`.
- **Density and responsive design**: The density scale is applied *before* responsive breakpoints. A `spacious` mobile view may feel excessive — components should cap extreme density values on small screens by reading `clamp()` in the CSS variable definition.
