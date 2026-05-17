# Layout Hierarchy Mapper

This module analyzes a user's uploaded reference image and produces a `layout-tree.json` describing the page structure. It is the bridge between visual design and component assembly.

---

## Input

- Reference image (PNG/JPG/WebP) — a screenshot, mockup, or live website capture
- UDM `design_dna` and `niche_requirements` — for context on density, rhythm, and required sections

## Output

`layout-tree.json` — ordered list of sections per page with component assignments and variants.

---

## Detection Algorithm

### Step 1: Vertical Scan

Scan the image top-to-bottom. Identify section boundaries by:

| Signal | Boundary Type |
|--------|---------------|
| Large horizontal whitespace (>8% viewport height) | Section break |
| Background color change (ΔE > 30 in LAB) | Section boundary |
| Horizontal rule / line (1-3px, full-width) | Section boundary |
| Repeating element pattern starts/ends | Section boundary |
| Image → text transition at column boundary | Section boundary |

### Step 2: Section Classification

For each detected block, classify by visual pattern:

#### Navigation (`nav`)
- Horizontal bar at top 0-80px
- Contains text links or button clusters
- May be transparent over hero or solid

#### Hero (`hero`)
- Typically first section below nav
- Contains large text (headline scale) + media
- Often spans 60-100vh

#### Features / Benefits (`features`)
- Grid of 2-6 items
- Each item: icon + headline + short text
- Usually 3 columns on desktop

#### Product Grid (`product-grid`)
- Repeating card pattern
- Cards contain image + title + price/CTA
- Usually 3-4 columns

#### Gallery (`gallery`)
- Image-dominant section
- May be masonry, uniform grid, or single-column
- No price/CTA on images (unlike product grid)

#### Testimonials (`testimonials`)
- Quote text + avatar/author name
- May be cards or editorial layout
- Often has star ratings

#### Pricing (`pricing`)
- 2-4 tiered cards
- Cards have header, price, feature list, CTA button
- Usually center-aligned header above cards

#### CTA Section (`cta`)
- Single centered block
- Headline + button, no grid
- Often has contrasting background

#### Footer (`footer`)
- Bottom section
- Multi-column links, logo, social icons
- Copyright text

### Step 3: Variant Detection

For each classified section, detect the visual variant:

#### Hero Variants
| Visual Cue | Variant |
|------------|---------|
| Text left + image right, 50/50 | `split` |
| All centered, single column | `centered` |
| Full-bleed background image | `fullscreen` |
| Asymmetric grid with stats | `bento` |
| Magazine-style text + image | `editorial` |
| Ultra-minimal, just text | `minimal` |

#### Product Grid Variants
| Visual Cue | Variant |
|------------|---------|
| Uniform square cards | `card-grid` |
| Varying heights | `masonry` |
| Featured large item + small items | `bento` |

#### Testimonial Variants
| Visual Cue | Variant |
|------------|---------|
| Stacked centered quotes | `single-column` |
| 2-3 column card grid | `card-grid` |
| Large featured + small supporting | `editorial` |

### Step 4: Density & Spacing Detection

Measure padding between elements and within sections:

| Measurement | Density |
|-------------|---------|
| Card padding < 12px, gap < 12px | `tight` |
| Card padding 16-24px, gap 16-24px | `normal` |
| Card padding 32-48px, gap 32-48px | `airy` |
| Card padding > 48px, gap > 48px | `spacious` |

Cross-reference with UDM `spacing.density`. If UDM specifies a different density, use UDM (user intent overrides image analysis).

### Step 5: Corner Radius Detection

Measure border radius on prominent cards/buttons:

| Measurement | Radius Token |
|-------------|--------------|
| 0px | `sharp` |
| 2-4px | `subtle` |
| 6-10px | `medium` |
| 12-20px | `rounded` |
| 24px+ or pill | `pill` |

### Step 6: Repeated Pattern Detection

If the same section type appears multiple times (e.g., two product grids), number them:
```json
{ "type": "product-grid", "component": "ProductGrid", "index": 1, "rhythm": "card-grid" }
{ "type": "product-grid", "component": "ProductGrid", "index": 2, "rhythm": "masonry" }
```

---

## Edge Cases

### Ambiguous Section
If a section matches multiple classifications (e.g., product grid vs gallery):
1. Check for price text — presence → `product-grid`
2. Check for CTA buttons per item — presence → `product-grid`
3. Check for captions/artistic presentation → `gallery`
4. Default to UDM `intent.type` bias (ecommerce → product-grid, portfolio → gallery)

### Transparent Nav Over Hero
If the nav has no distinct background and overlaps the hero:
- Set `nav.sticky: true`
- Set `nav.transparent: true`
- Hero gets `margin-top: 0` instead of pushing below nav

### Missing Footer
If no footer is detected in the reference image but the UDM requires it:
- Inject a standard footer at the bottom
- Use UDM `niche_requirements.required_sections` to determine footer columns

### Multi-Page References
If the reference image shows multiple page thumbnails or a navigation with page names:
- Create a `layout-tree.json` with multiple pages
- Map nav links to page routes
- Use UDM `navigation.pages` to fill in sections for non-home pages

---

## layout-tree.json Schema

```json
{
  "version": "1.0.0",
  "source_image": "reference.png",
  "pages": [
    {
      "route": "/",
      "name": "Home",
      "meta": {
        "title": "...",
        "description": "..."
      },
      "sections": [
        {
          "id": "nav-1",
          "type": "nav",
          "component": "Nav",
          "sticky": true,
          "transparent": false,
          "height": "64px",
          "links": [
            { "label": "Products", "href": "/products" },
            { "label": "About", "href": "/about" }
          ]
        },
        {
          "id": "hero-1",
          "type": "hero",
          "component": "Hero",
          "layout_variant": "split",
          "detected_density": "normal",
          "detected_radius": "medium"
        },
        {
          "id": "product-grid-1",
          "type": "product-grid",
          "component": "ProductGrid",
          "rhythm": "card-grid",
          "columns": 4
        }
      ]
    }
  ]
}
```
