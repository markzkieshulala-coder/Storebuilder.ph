# Build Pipeline — Step-by-Step Generation Process

This document describes the exact compiler stages for transforming a UDM + ACM into a deployable React/Tailwind bundle.

---

## Stage 0: Input Validation

Inputs: `udm.json`, `acm.json`, `component-library/` directory

Validation checks:
1. UDM `meta.version` must be `1.0.0` (current supported version)
2. ACM `meta.linked_udm_id` must match UDM `meta.id`
3. All component files referenced in the pipeline exist in `component-library/`
4. Every ACM `copy` key has a matching UDM `niche_requirements` section

If validation fails, output a `build-errors.json` with specific missing fields and halt.

---

## Stage 1: Layout Hierarchy Mapping

Goal: Produce `layout-tree.json` — a JSON representation of the DOM section sequence extracted from the user's reference image.

### Process

1. **Section Detection**: Analyze the reference image vertically. Look for:
   - Background color / image boundaries
   - Horizontal rule separators
   - Whitespace blocks wider than 40% of viewport height
   - Component boundaries (cards, grids, carousels)

2. **Component Classification**: For each detected section, classify:
   - `nav` — top horizontal bar with links/buttons
   - `hero` — large headline + media, usually first
   - `features` / `benefits` — icon + text grid
   - `product-grid` — repeated card pattern
   - `gallery` — image grid or masonry
   - `testimonials` — quote cards or editorial layout
   - `pricing` — tiered card comparison
   - `cta` — single centered CTA block
   - `footer` — bottom multi-column links

3. **Hierarchy Encoding**: Output ordered nodes:

```json
{
  "pages": [
    {
      "route": "/",
      "name": "Home",
      "sections": [
        { "type": "nav", "component": "Nav", "sticky": true, "height": "64px" },
        { "type": "hero", "component": "Hero", "layout_variant": "split" },
        { "type": "features", "component": "CardGrid", "columns": 3 },
        { "type": "product-grid", "component": "ProductGrid", "rhythm": "card-grid" },
        { "type": "testimonials", "component": "Testimonials", "layout": "editorial" },
        { "type": "cta", "component": "CtaSection" },
        { "type": "footer", "component": "Footer", "columns": 4 }
      ]
    }
  ]
}
```

4. **Variant Selection**: Map detected visual density/spacing to UDM tokens:
   - Sections with tight padding → UDM `spacing.density: tight`
   - Large rounded cards → UDM `shape.corner_radius: rounded`
   - Dark hero + light rest → UDM `colors.background` vs `colors.surface`

---

## Stage 2: Token-to-CSS Translation

Goal: Generate `globals.css` with 100% of UDM tokens as CSS variables.

### Process

1. Read `udm.resolved_tokens`
2. Map each token to a CSS variable using the naming convention from `universal-component-library`
3. Generate font-face `@import` or `<link>` entries for all font families
4. Calculate density scale math:
   - `data-density="tight"` → `--spacing-scale: 0.65`
   - `data-density="normal"` → `--spacing-scale: 1`
   - `data-density="airy"` → `--spacing-scale: 1.35`
   - `data-density="spacious"` → `--spacing-scale: 2`

5. Generate utility class mappings for common patterns
6. Add `color-scheme` meta tag if dark mode is detected

### Critical Output Rules

- Every `--color-*` must be a valid hex (6 or 8 char) or OKLCH value
- Every `--font-*` must reference a valid font stack with fallbacks
- `--text-size-hero` must use `clamp()` for fluid scaling
- `--section-padding-y` must use `clamp()` to cap extremes on mobile
- Shadow types must map to concrete `box-shadow` declarations
- All variables must have the `!default` equivalent — never assume the variable is defined elsewhere

---

## Stage 3: Page Composition

Goal: Generate `.tsx` page files for each route.

### Process

For each page in `layout-tree.json.pages`:

1. **Import Header**: Emit React imports + component imports from the library
2. **Metadata**: Generate `<head>` or Next.js `metadata` export with ACM SEO fields
3. **Body Assembly**: Iterate sections in order. For each section:
   a. Determine component name from `component` field
   b. Map UDM tokens to component props (e.g., `layout` → Hero layout variant)
   c. Map ACM content to component props (e.g., `copy.headline` → `headline`)
   d. Map ACM assets to component props (e.g., `assets.hero_images[0]` → `media.src`)
   e. Render JSX with all props filled
4. **Wrapper**: Wrap page in `<main>` or `<div>` with `bg-[var(--color-background)]`

### Component Prop Mapping

| Layout Tree Field | Component Prop | UDM Source | ACM Source |
|-------------------|----------------|------------|------------|
| `layout_variant` | `layout` | `layout.rhythm` | — |
| `sticky` | `sticky` | `layout.nav_behavior` | — |
| `headline` | `headline` | — | `copy.headline` |
| `subheadline` | `subheadline` | — | `copy.subheadline` |
| `cta_text` | `ctaPrimary.text` | — | `copy.cta_primary` |
| `hero_image` | `media.src` | — | `assets.hero_images[0].url` |
| `products` | `products` | `niche_requirements` | `assets.product_images` + `copy.benefits` |
| `testimonials` | `testimonials` | — | `copy.testimonials` + `assets.testimonial_avatars` |
| `columns` | `columns` | `layout.grid_columns` | — |
| `rhythm` | `rhythm` | `layout.rhythm` | — |

---

## Stage 4: Route Generation

Goal: Create routing configuration.

### Next.js App Router (default)

For each page:
- Create `app/{route}/page.tsx` (or `app/page.tsx` for home)
- If route is dynamic (e.g., `/products/[id]`), create `app/products/[id]/page.tsx`

### React Router (alternative)

Create `src/App.tsx` with:
```tsx
<Routes>
  {pages.map(page => (
    <Route key={page.route} path={page.route} element={<page.component />} />
  ))}
</Routes>
```

---

## Stage 5: Asset Binding

Goal: Bind ACM asset URLs into component JSX.

### Rules

1. **Images**: Use standard `<img>` (simpler, no domain config) or Next.js `<Image>` (if Next.js is selected)
2. **Alt text**: Always use ACM `assets[n].alt_text` or `copy` fallback
3. **Background images**: Use `style={{ backgroundImage: 'url(...)' }}` or Tailwind `bg-[url(var(--hero-bg))]`
4. **Video**: Use `<video>` with `autoPlay muted loop playsInline`
5. **Icons**: Use inline SVG or a lightweight icon library (Lucide). Never use emoji as icons.

### Asset Fallback Strategy

If an asset URL is missing or invalid:
1. Generate a placeholder `<div>` with:
   - Correct `aspect-ratio` from UDM or component default
   - `bg-[var(--color-surface)]` background
   - `border border-[var(--color-border)]` border
   - Optional: subtle pattern or gradient using UDM colors
2. Never output a broken `<img>` with `src=""` or `src={undefined}`

---

## Stage 6: Build Output

Goal: Produce a complete project tree.

### Output Structure

```
output/
├── package.json
├── tailwind.config.js
├── next.config.js          (or vite.config.js for React Router)
├── tsconfig.json
├── .gitignore
├── public/
│   └── favicon.ico
├── app/                    (Next.js App Router)
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx            (Home)
│   ├── [route1]/
│   │   └── page.tsx
│   └── [route2]/
│       └── page.tsx
├── src/
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── Gallery.tsx
│   │   ├── Testimonials.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Container.tsx
│   │   ├── Nav.tsx
│   │   ├── Footer.tsx
│   │   └── CtaSection.tsx
│   ├── lib/
│   │   └── utils.ts        (cn() utility if needed)
│   └── data/
│       ├── udm.json
│       ├── acm.json
│       └── layout-tree.json
└── README.md               (deployment instructions)
```

### Configuration Files

**package.json**
```json
{
  "name": "generated-website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**tailwind.config.js**
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**next.config.js**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['images.unsplash.com', 'cdn.example.com'],
  },
};
module.exports = nextConfig;
```

---

## Build Verification

After output generation, perform these checks:

1. **Syntax Check**: Every `.tsx` file parses without TypeScript errors
2. **Import Resolution**: Every component import resolves to an existing file
3. **Variable Coverage**: Every CSS variable referenced in components exists in `globals.css`
4. **Asset Coverage**: Every `<img src>` references a valid ACM asset or a fallback
5. **Content Coverage**: No placeholder text remains in any `.tsx` file
6. **SEO Coverage**: Every page has `<title>` and `<meta name="description">`
7. **Responsive Check**: Every page uses Tailwind responsive prefixes for structural changes

If any check fails, add a warning to `build-warnings.json` but continue generation. If critical (syntax/import errors), halt and report.
