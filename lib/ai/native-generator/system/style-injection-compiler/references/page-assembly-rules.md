# Page Assembly Rules — Multi-Page Composition & Routing

Rules for composing multiple pages from a single UDM + ACM + layout tree.

---

## Page Types

The UDM defines page types. Each type gets a default section template:

| Page Type | Default Sections | Special Rules |
|-----------|-----------------|---------------|
| `home` | nav, hero, features, product-grid/gallery, testimonials, cta, footer | Hero is always `split` or `fullscreen` |
| `about` | nav, hero (minimal), text-content, team-grid, testimonials, footer | Hero uses `minimal` or `centered` |
| `products` / `services` | nav, hero (centered), product-grid, features, footer | Grid is primary content |
| `contact` | nav, hero (minimal), contact-form, map/location, footer | Form component injected |
| `blog` / `news` | nav, hero (minimal), article-grid, sidebar, footer | Article cards use `Card` primitive |
| `pricing` | nav, hero (minimal), pricing-tiers, features-comparison, faq, footer | Pricing cards get special styling |
| `portfolio` | nav, hero (editorial), gallery (masonry), testimonials, footer | Gallery is primary content |

---

## Shared Components

These components appear on every page:

### Navigation (`Nav`)
- Reads `navigation.links` from UDM
- Logo uses `design_dna.branding.logo_type`
- CTA button uses `niche_requirements.component_rules.nav_cta_variant`
- Mobile: hamburger menu with slide-out drawer

### Footer (`Footer`)
- Reads `niche_requirements.footer` from UDM
- Columns: brand, links, contact, social
- Copyright year auto-generated

---

## Routing

### Next.js App Router (default)

```
app/
├── layout.tsx          # Root layout with Nav + Footer
├── page.tsx            # Home page
├── about/
│   └── page.tsx
├── products/
│   └── page.tsx
├── contact/
│   └── page.tsx
└── [catchall]/
    └── page.tsx         # 404
```

### React Router (alternative)

```
src/
├── App.tsx             # Routes definition
├── pages/
│   ├── Home.tsx
│   ├── About.tsx
│   ├── Products.tsx
│   ├── Contact.tsx
│   └── NotFound.tsx
└── components/
    ├── Nav.tsx
    └── Footer.tsx
```

---

## Content Distribution Rules

### Single-Page vs Multi-Page ACM

If ACM has assets for only one page:
- Home page gets all hero images, product images, testimonials
- Other pages reuse relevant assets or get fallback placeholders
- About page uses `assets.team_photos` if available, otherwise `assets.testimonial_avatars`
- Contact page uses no product/gallery assets

### Multi-Page ACM

If ACM has page-specific assets:
```json
{
  "assets": {
    "pages": {
      "home": { "hero_images": [...], "product_images": [...] },
      "about": { "team_photos": [...] },
      "products": { "product_images": [...] }
    }
  }
}
```

Route-specific assets take precedence over shared assets.

---

## Layout Inheritance

Every page extends a base layout:

```tsx
// app/layout.tsx (Next.js)
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-density={udm.resolved_tokens.spacing.density}>
      <body className="bg-[var(--color-background)] text-[var(--color-text)] font-[family-name:var(--font-body)]">
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

The `data-density` attribute on `<html>` triggers CSS density overrides.

---

## Page-Specific Overrides

Any page can override the base layout:

### Transparent Nav (Home with fullscreen hero)
```tsx
// Home page overrides nav to be transparent
<Nav transparent overlay />
<Hero layout="fullscreen" />
```

### No Footer (Landing page)
```tsx
// Omit Footer for focused landing pages
<main>{children}</main>
```

### Full-Width Content (Portfolio gallery)
```tsx
// Container uses `flush` mode
<Container flush>
  <Gallery rhythm="masonry" />
</Container>
```

---

## Section Ordering Rules

### Standard Order (Home)
1. Nav
2. Hero
3. Social Proof / Trust badges (optional, inserted by niche)
4. Features / Benefits
5. Product Grid / Gallery / Portfolio showcase
6. Testimonials
7. CTA Section
8. Footer

### Ecommerce Order
1. Nav (with cart icon)
2. Hero (promotion-focused)
3. Featured Products
4. Categories Grid
5. Best Sellers
6. Testimonials
7. Newsletter CTA
8. Footer

### Portfolio Order
1. Nav (minimal)
2. Hero (editorial)
3. Gallery (masonry, primary content)
4. About snippet
5. Testimonials
6. Contact CTA
7. Footer

### SaaS Order
1. Nav
2. Hero (split)
3. Logo Cloud (trust badges)
4. Features (3-column)
5. How It Works
6. Pricing Tiers
7. Testimonials
8. FAQ
9. CTA
10. Footer

---

## Section Skip Rules

Skip a section if:
- The section type is not in the reference image AND the UDM does not require it
- The ACM has zero assets/copy for that section type AND no fallback is defined
- The page type does not typically include that section (e.g., no product grid on a contact page)

---

## Dynamic Content Injection

### Conditional Rendering

Components render conditionally based on available content:

```tsx
// Hero only renders CTA if copy exists
{acm.copy.cta_primary && (
  <Button variant="primary" href={acm.copy.cta_primary_href}>
    {acm.copy.cta_primary}
  </Button>
)}

// ProductGrid only renders if products array has items
{acm.assets.product_images?.length > 0 && (
  <ProductGrid products={mappedProducts} />
)}
```

### Default Content Fallbacks

If ACM content is missing, use UDM defaults:

| Missing ACM Field | Fallback |
|-------------------|----------|
| `copy.headline` | UDM `niche_requirements.default_copy.headline` |
| `copy.subheadline` | UDM `niche_requirements.default_copy.subheadline` |
| `copy.cta_primary` | UDM `niche_requirements.default_copy.cta_primary` |
| `assets.hero_images` | Generate gradient placeholder using UDM colors |
| `assets.product_images` | Generate colored placeholder cards |
| `copy.testimonials` | Use UDM `niche_requirements.required_sections.testimonials.default_count` generic quotes |

---

## SEO Per Page

Every page generates:

```tsx
// Next.js metadata export
export const metadata = {
  title: acm.copy.seo_meta_title || `${udm.intent.brand_name} — ${pageName}`,
  description: acm.copy.seo_meta_description || udm.niche_requirements.seo.default_description,
  openGraph: {
    title: acm.copy.seo_meta_title,
    description: acm.copy.seo_meta_description,
    images: [acm.assets.og_image?.url],
  },
};
```
