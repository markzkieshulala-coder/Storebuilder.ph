# Code Generation Patterns & Standards

Rules for generating clean, modular, and maintainable React/Tailwind code.

---

## Code Style

### TypeScript
- All components use `.tsx` with explicit prop interfaces
- No `any` types — define interfaces for all props
- Use `React.FC<Props>` for consistency with the component library

### Tailwind CSS
- Use arbitrary value syntax for CSS variables: `bg-[var(--color-primary)]`
- Never use Tailwind color utilities (e.g., `bg-blue-500`, `text-slate-900`)
- Never use Tailwind spacing utilities (e.g., `p-4`, `gap-6`) for variable properties
- Structural responsive utilities are OK: `grid-cols-1 md:grid-cols-2`
- Font utilities are OK for structural differentiation: `font-bold`, `font-light`

### Component Imports
- Import from relative paths: `import { Hero } from '../components/Hero'`
- Group imports: React → Components → Types → Utils

### File Naming
- PascalCase for components: `Hero.tsx`, `ProductGrid.tsx`
- camelCase for utilities: `utils.ts`, `helpers.ts`
- kebab-case for pages (Next.js convention): `page.tsx`, `layout.tsx`

---

## Generated Page Template

```tsx
// app/page.tsx (Home page)
import { Metadata } from 'next';
import { Nav } from '../components/Nav';
import { Hero } from '../components/Hero';
import { ProductGrid } from '../components/ProductGrid';
import { Testimonials } from '../components/Testimonials';
import { Footer } from '../components/Footer';

import udm from '../data/udm.json';
import acm from '../data/acm.json';

export const metadata: Metadata = {
  title: acm.copy.seo_meta_title,
  description: acm.copy.seo_meta_description,
};

export default function HomePage() {
  return (
    <>
      <Nav
        links={udm.navigation.links}
        sticky={true}
        transparent={false}
      />

      <Hero
        layout="split"
        preTitle={acm.copy.pre_title}
        headline={acm.copy.headline}
        subheadline={acm.copy.subheadline}
        ctaPrimary={{ text: acm.copy.cta_primary, href: acm.copy.cta_primary_href }}
        ctaSecondary={{ text: acm.copy.cta_secondary, href: acm.copy.cta_secondary_href }}
        media={{
          src: acm.assets.hero_images[0]?.url,
          alt: acm.assets.hero_images[0]?.alt_text,
        }}
        stats={[
          { value: '10K+', label: 'Customers' },
          { value: '99%', label: 'Satisfaction' },
        ]}
      />

      <ProductGrid
        title={acm.copy.features_title}
        subtitle={acm.copy.features_subtitle}
        products={acm.assets.product_images.map((img, i) => ({
          id: `product-${i}`,
          name: acm.copy.benefits?.[i]?.title || `Product ${i + 1}`,
          description: acm.copy.benefits?.[i]?.body,
          price: acm.copy.pricing?.[i]?.price,
          image: img.url,
          imageAlt: img.alt_text,
          ctaText: 'View Details',
          ctaHref: `/products/${i}`,
        }))}
      />

      <Testimonials
        title={acm.copy.testimonials_title}
        subtitle={acm.copy.testimonials_subtitle}
        testimonials={acm.copy.testimonials.map((t, i) => ({
          id: `testimonial-${i}`,
          quote: t.quote,
          name: t.name,
          role: t.role,
          company: t.company,
          avatar: acm.assets.testimonial_avatars?.[i]?.url,
          rating: t.rating,
        }))}
      />

      <Footer
        brandName={udm.intent.brand_name}
        links={udm.niche_requirements.footer.links}
      />
    </>
  );
}
```

---

## Data Binding Patterns

### Direct Prop Pass
Pass ACM/UDM values directly as component props:
```tsx
<Hero headline={acm.copy.headline} />
```

### Array Mapping
Map ACM arrays to component arrays:
```tsx
products={acm.assets.product_images.map((img, i) => ({
  id: `product-${i}`,
  image: img.url,
  ...
}))}
```

### Conditional Fallback
Use nullish coalescing for missing values:
```tsx
headline={acm.copy.headline ?? udm.niche_requirements.default_copy.headline}
```

### Computed Values
Derive values from UDM tokens:
```tsx
const navHeight = udm.resolved_tokens.layout.nav_height ?? '64px';
const maxWidth = udm.resolved_tokens.layout.max_width ?? '1280px';
```

---

## Responsive Generation

### Mobile-First
Generate base styles for mobile, then add responsive prefixes:
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### Fluid Typography
Use `clamp()` in CSS variables for all text sizes. Never use fixed pixel values.

### Density-Aware Padding
Use CSS variable spacing so density changes apply automatically:
```tsx
className="p-[var(--space-md)] gap-[var(--layout-gap)]"
```

---

## Image Handling

### Next.js Image (optimal)
```tsx
import Image from 'next/image';
<Image src={src} alt={alt} width={800} height={600} className="object-cover" />
```
Requires domain in `next.config.js`.

### Standard img (simpler)
```tsx
<img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
```
No config needed. Use for external URLs or when Next.js is not used.

### Fallback Placeholder
```tsx
{src ? (
  <img src={src} alt={alt} />
) : (
  <div className="w-full h-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
    <span className="text-[var(--color-text-muted)]">Image</span>
  </div>
)}
```

---

## Animation Patterns

Use CSS transitions with UDM motion tokens:
```tsx
className="udm-transition hover:-translate-y-1"
```

For scroll-triggered animations, use a lightweight intersection observer hook:
```tsx
// Generated inline in page or as a shared hook
const useInView = () => { ... };
```

Never add animation libraries (Framer Motion, GSAP) as dependencies unless explicitly requested.

---

## Accessibility Requirements

Every generated page must include:
1. `lang` attribute on `<html>`
2. `<main>` landmark wrapping page content
3. Alt text on all images
4. Focus states on all interactive elements (handled by Button primitive)
5. Semantic headings (`h1` once per page, `h2` for sections)
6. Color contrast meets WCAG AA (verified by UDM token selection)

---

## Performance Patterns

1. **Lazy loading**: All below-fold images use `loading="lazy"`
2. **Font loading**: Use `font-display: swap` in font-face declarations
3. **CSS variables**: All styles use variables (no runtime JS color calculations)
4. **Minimal JS**: No state management library. Pages are static or server-rendered.
5. **Code splitting**: Next.js handles this automatically via App Router

---

## Output Verification Checklist

Before returning the final bundle, verify:

- [ ] No literal color values in any `.tsx` file
- [ ] No literal spacing values (px, rem) for padding/gap in components
- [ ] Every component import resolves
- [ ] Every image has `alt` text
- [ ] Every page has metadata
- [ ] No `any` types
- [ ] No placeholder text (lorem ipsum, "Coming Soon", etc.)
- [ ] `globals.css` defines all variables referenced in components
- [ ] `package.json` has all required dependencies
- [ ] `tailwind.config.js` content array covers all file paths
- [ ] Build succeeds with `npm run build` (or equivalent)
