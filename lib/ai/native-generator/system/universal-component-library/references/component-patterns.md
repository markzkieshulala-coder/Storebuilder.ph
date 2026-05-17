# Component Authoring Rules & Patterns

## Golden Rules

1. **Never hardcode a value.** Every color, font, spacing, radius, shadow, and motion value must reference a CSS custom property.
2. **Never use Tailwind utility literals for variable properties.** Use `bg-[var(--color-primary)]` not `bg-slate-900`. Use `rounded-[var(--shape-radius)]` not `rounded-lg`.
3. **Always provide fallbacks.** CSS variables in `globals.css` have default values so components never break if a token is missing.
4. **Layout is fluid, not fixed.** Components read `--layout-rhythm`, `--spacing-density`, and `--shape-radius` to adapt. Never assume a fixed grid or padding value.

## Variable Naming Convention

| Token Category | CSS Variable Prefix | Example |
|---------------|---------------------|---------|
| Colors | `--color-*` | `--color-primary` |
| Typography | `--font-*`, `--text-size-*`, `--line-height-*`, `--letter-spacing-*` | `--font-heading`, `--text-size-h1` |
| Spacing | `--space-*`, `--section-padding-*` | `--space-lg`, `--section-padding-y` |
| Shape | `--shape-radius*`, `--shape-radius-sm`, `--shape-radius-lg`, `--shape-radius-pill` | `--shape-radius` |
| Shadow | `--shadow-*` | `--shadow-md`, `--shadow-glass` |
| Layout | `--layout-*` | `--layout-rhythm`, `--layout-max-width` |
| Motion | `--motion-*` | `--motion-speed`, `--motion-easing` |

## Spacing System

The spacing system is multiplicative:

```
--space-xs  = 0.5rem  × --spacing-scale
--space-sm  = 1rem    × --spacing-scale
--space-md  = 1.5rem  × --spacing-scale
--space-lg  = 2rem    × --spacing-scale
--space-xl  = 3rem    × --spacing-scale
--space-2xl = 5rem    × --spacing-scale
--space-3xl = 8rem    × --spacing-scale
```

The `--spacing-scale` is controlled by the `data-density` attribute on `:root`:
- `tight` → 0.65×
- `normal` → 1×
- `airy` → 1.35×
- `spacious` → 2×

## Responsive Design

Components use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) for structural breakpoints only. Visual properties (colors, spacing, typography) come from CSS variables and are inherently responsive via `clamp()` values.

**Structural breakpoints** (when to switch layout):
- `sm` (640px): 2-column grids become active
- `md` (768px): section padding scales up, nav height considered
- `lg` (1024px): multi-column editorial layouts, sidebar patterns
- `xl` (1280px): 4-column grids, max-width containers

**Never** use responsive utilities for spacing values — the variable system handles that.

## Font Family Application

Always use the explicit `font-[family-name:var(--font-heading)]` pattern rather than relying on Tailwind's `font-sans` or `font-serif` utilities. This ensures the UDM-selected font is always applied.

```tsx
// Correct
<h1 className="font-[family-name:var(--font-heading)] ...">

// Incorrect
<h1 className="font-serif ...">
```

## Card Primitive

The `Card` component is the atomic surface container. All grid-based components (ProductGrid, Testimonials, Gallery) render `Card` as their item wrapper. Card properties:
- `padding`: controls internal spacing (`none`, `sm`, `md`, `lg`)
- `bg`: controls surface color (`background`, `surface`, `primary`, `secondary`)
- `shadow`: toggles shadow visibility
- `hover`: toggles hover lift effect
- `border`: toggles border visibility
- `interactive`: adds cursor-pointer and active scale

## Button Primitive

The `Button` component has 3 variants:
- `primary`: accent background, inverse text, hover brightness
- `secondary`: surface background, text color, border, hover primary invert
- `ghost`: transparent, text color, hover surface background

Size scale (`sm`, `md`, `lg`) uses variable-driven padding and text sizes.

## Container Primitive

The `Container` component centers content and applies responsive horizontal padding. It supports:
- `narrow` (max-w-960px)
- `wide` (max-w-1440px)
- `flush` (no horizontal padding — for fullscreen heroes)

Default max-width reads from `--layout-max-width`.

## Fluid Layout Patterns

### Hero Layouts

| Layout | Structure | Best For |
|--------|-----------|----------|
| `split` | 2-col text + image | SaaS, product pages |
| `centered` | Stacked centered | Landing pages, portfolios |
| `fullscreen` | Edge-to-edge bg | Lifestyle, emotional brands |
| `bento` | Asymmetric grid | Dashboards, feature showcases |
| `editorial` | Asymmetric text + image | Fashion, magazines, agencies |
| `minimal` | Ultra-sparse text | Luxury, minimal brands |

### Product Grid Rhythms

| Rhythm | Behavior | Best For |
|--------|----------|----------|
| `card-grid` | Uniform columns | Ecommerce, catalogs |
| `masonry` | Varying heights | Portfolios, Pinterest-style |
| `bento` | Featured items span cells | Feature highlights, dashboards |

### Gallery Rhythms

| Rhythm | Behavior | Best For |
|--------|----------|----------|
| `single-column` | Full-width stacked | Photography showcases |
| `card-grid` | Uniform thumbnails | Product galleries |
| `masonry` | Varying aspect ratios | Portfolios, inspiration boards |
| `bento` | Featured hero + tiles | Dashboards, editorial layouts |
| `editorial` | Text interleaved | Magazine spreads, case studies |

### Testimonial Layouts

| Layout | Behavior | Best For |
|--------|----------|----------|
| `single-column` | Stacked centered | Single strong quote focus |
| `card-grid` | 2–3 column cards | Multiple social proof |
| `editorial` | Featured + supporting | Case study pages, press |

## Shadow Type Mapping

The `--shadow-type` variable controls which shadow token is applied:

| `--shadow-type` | Applied Style |
|-----------------|---------------|
| `flat` | No shadow |
| `soft` | `shadow-md` (8px blur, low opacity) |
| `hard` | `shadow-lg` (32px blur, higher opacity) |
| `glass` | `shadow-glass` + `backdrop-blur-xl` |
| `neumorphic` | Dual inset/outset shadow |

## Motion Tokens

All transitions use:
```css
transition: all var(--motion-speed) var(--motion-easing);
```

Fast interactions (button clicks, hover states) use `var(--motion-speed-fast)` (0.5×).
Slow interactions (page transitions, reveals) use `var(--motion-speed-slow)` (1.5×).

## Edge Cases

### Sharp corners (`--shape-radius: 0`)
When the UDM specifies sharp corners, all `rounded-[var(--shape-radius)]` classes evaluate to `0px`. Components should still render correctly without accidental browser-default rounding. The `Card` and `Button` components explicitly apply the variable, so this is handled.

### Extreme density (`--spacing-density: spacious`)
At 2× scale, mobile screens may feel excessive. The `globals.css` uses `clamp()` on `--section-padding-y` to cap extreme values on small screens. Components should not add additional mobile-specific spacing overrides.

### Missing media assets
If `media.src` is empty or missing, the `Hero` component's media container still renders with the correct layout structure. The `img` element will show the browser's broken image icon unless an `onError` handler is added downstream.

### Dark mode
The UDM does not currently include a dark mode toggle. However, the color system is designed to support it: if `--color-background` is dark and `--color-text` is light, all components invert automatically without code changes.

### Font loading
The `globals.css` variables reference font family names, but the actual `@font-face` declarations or `<link>` tags for Google Fonts must be added in the application's root HTML/head. The component library assumes fonts are loaded before render.

## Testing Checklist

When integrating a new component into the library, verify:
- [ ] No hardcoded hex, rgb, or named colors in the .tsx file
- [ ] No hardcoded font names (use `var(--font-*)`)
- [ ] No hardcoded padding/margin pixel values
- [ ] No hardcoded border-radius values
- [ ] No hardcoded shadow values (use `var(--shadow-*)`)
- [ ] All transitions use `var(--motion-speed)` and `var(--motion-easing)`
- [ ] Component responds to `--layout-rhythm` changes
- [ ] Component responds to `--spacing-density` changes
- [ ] Component responds to `--shape-radius` changes
- [ ] Responsive breakpoints only for structural changes, not visual values
- [ ] Component works with all valid UDM token combinations
