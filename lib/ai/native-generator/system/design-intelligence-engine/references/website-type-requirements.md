# Website Type Requirements Reference

This document defines the niche-specific design rules that the Universal Design Manifest injects when each website type is detected.

## ecommerce

- **Required sections**: header, hero, product-grid, product-detail, cart, checkout, footer
- **Default layout**: multi-column card-grid
- **Typography bias**: clean sans-serif, high legibility at small sizes (12–14px labels)
- **Spacing bias**: tight — maximize information density; product cards should feel compact
- **Component overrides**:
  - `button.primary_radius`: `pill` — CTA buttons must be highly visible
  - `card.hover`: `shadow-md + translateY(-4px)` — products need tactile feedback
  - `badge`: required for sale badges, new-arrival badges, stock-status badges
  - `input`: search bar must be prominent, usually full-width in header
  - `price.display`: large, bold, primary-colored; compare-at price in strikethrough muted text
- **Palette notes**: checkout buttons must pass WCAG AA against white background; trust colors (green for secure, blue for primary) are strongly recommended

## portfolio

- **Required sections**: hero, gallery, about, contact, footer
- **Default layout**: masonry or bento-grid for visual work
- **Typography bias**: expressive — serif or display font for headings is encouraged if the user prompt suggests creativity
- **Spacing bias**: airy — large gutters between work pieces; whitespace is a design element
- **Component overrides**:
  - `card.radius`: `0px` or `small` — let the artwork bleed to edges
  - `image.hover`: `overlay with project title + scale(1.03)`
  - `navigation`: minimal, often transparent over hero image
  - `hero`: full-bleed background image or video, centered name/headline
- **Palette notes**: neutral background (white, off-white, charcoal) to let work stand out; accent color only for CTAs and active states

## saas

- **Required sections**: header, hero, features-grid, pricing, testimonials, cta, footer
- **Default layout**: single-column with alternating feature sections, then card-grid for pricing
- **Typography bias**: clean sans-serif, geometric; strong hierarchy with tight leading on headings
- **Spacing bias**: normal — consistent section padding, generous but not wasteful
- **Component overrides**:
  - `pricing.card`: highlighted plan gets `shadow-lg + primary border`
  - `feature.icon`: contained in a rounded square with soft background tint of primary at 10% opacity
  - `button.primary`: slightly larger padding (`14px 28px`) for trial CTAs
  - `testimonial.card`: quote icon in primary color, author avatar circular
- **Palette notes**: primary color must feel trustworthy (blue, teal, indigo); avoid warm tones for primary

## blog

- **Required sections**: header, featured-post, post-list, sidebar (optional), footer
- **Default layout**: two-column (content + sidebar) on desktop, single-column on mobile
- **Typography bias**: serif for long-form body text if the StyleExtractor supports it; sans-serif headings
- **Spacing bias**: spacious — line-height at 1.6–1.8, generous paragraph spacing
- **Component overrides**:
  - `article.body`: max-width `65ch` for optimal reading measure
  - `post-card`: thumbnail left, metadata and excerpt right
  - `tag.badge`: small, subtle, pill-shaped
  - `blockquote`: left border accent in primary color, italic body
  - `pagination`: minimal, centered, with hover underline
- **Palette notes**: high-contrast text on background for reading comfort; dark mode toggle is a common expectation

## landing-page

- **Required sections**: header, hero, benefits, social-proof, cta, footer
- **Default layout**: single-column scroll narrative with occasional two-column splits
- **Typography bias**: bold, large headings; punchy, short copy
- **Spacing bias**: dramatic — huge section padding, large gaps between elements to create scroll rhythm
- **Component overrides**:
  - `hero.heading`: oversized (up to `64px–80px`), tight leading
  - `cta.section`: contrasting background (primary tint or dark surface) to break the scroll
  - `social-proof`: logo bar in grayscale, hover to full color
  - `benefit.card`: icon top, title, short description; no border, just whitespace separation
- **Palette notes**: one strong primary color for all CTAs; the rest should be neutral to avoid distraction

## dashboard

- **Required sections**: sidebar, top-bar, main-content-area, widget-grid
- **Default layout**: sidebar + main area on desktop; top-bar + stacked widgets on mobile
- **Typography bias**: utilitarian sans-serif; tabular numbers for data; small sizes (12–14px) common
- **Spacing bias**: tight — information density is the priority
- **Component overrides**:
  - `widget.card`: small padding (`16px`), no shadow or very subtle shadow, clear border
  - `chart.container`: neutral background, grid lines in `border` color
  - `table`: zebra striping or subtle row hover, monospace for numeric columns
  - `sidebar`: collapsible, icon + label, active state with primary background tint
  - `top-bar`: search + notifications + user menu, fixed height
- **Palette notes**: data visualization needs a distinct categorical palette separate from the UI palette; use semantic colors (green up, red down) sparingly and only where culturally appropriate

## restaurant

- **Required sections**: hero, menu, gallery, reservation, location, footer
- **Default layout**: single-column with full-bleed imagery, menu as structured list or card-grid
- **Typography bias**: warm serif or elegant display for headings; clean sans-serif for menu prices and details
- **Spacing bias**: generous — imagery needs room to breathe; menu items need clear separation
- **Component overrides**:
  - `menu.item`: title left, description below, price right-aligned, dotted leader optional
  - `reservation.form`: minimal fields, inline on desktop, stacked on mobile
  - `gallery`: masonry or carousel, lightbox on click
  - `hero`: full-bleed food or ambiance photo, overlaid text with scrim gradient
- **Palette notes**: warm earth tones, deep greens, burgundy, or gold accents; never cold clinical palettes unless explicitly requested

## agency

- **Required sections**: header, hero, services, case-studies, team, testimonials, contact, footer
- **Default layout**: editorial — asymmetric grids, overlapping elements, bold use of whitespace
- **Typography bias**: mix of display/serif headings with clean sans-serif body; confident, large type
- **Spacing bias**: dramatic — whitespace is used as a compositional tool; uneven spacing is intentional
- **Component overrides**:
  - `case-study.card`: large thumbnail, title overlays image with gradient scrim
  - `service.item`: numbered list with oversized numbers in muted primary
  - `team.card`: circular avatar, name, role, minimal bio
  - `hero`: asymmetric split — text left, abstract shape or image right
- **Palette notes**: bold primary + neutral everything else; agencies often use black/white/one-accent for maximum impact

## education

- **Required sections**: header, hero, programs/courses, instructors, testimonials, enrollment-cta, footer
- **Default layout**: structured grid, card-based course listings, clear hierarchy
- **Typography bias**: friendly, approachable sans-serif; slightly rounded if available
- **Spacing bias**: normal — clear separation between modules, not too tight, not too airy
- **Component overrides**:
  - `course.card`: thumbnail, title, instructor avatar + name, duration, rating, price/cta
  - `progress.bar`: visible, color-coded by completion percentage
  - `enrollment.form`: multi-step if complex, inline if simple
  - `instructor.card`: photo, name, expertise tags, social links
- **Palette notes**: trustworthy blues and greens; accent color for CTAs; avoid aggressive reds/oranges as primary

## real-estate

- **Required sections**: header, search-bar, property-grid, property-detail, map, contact-agent, footer
- **Default layout**: search bar pinned, results as card-grid or split map+list
- **Typography bias**: clean sans-serif; numbers (prices, sqft) in tabular or semi-bold
- **Spacing bias**: normal — cards need padding but results should feel scannable
- **Component overrides**:
  - `property.card`: image top, price + address + specs (bed/bath/sqft) below, favorite icon
  - `search.filter`: horizontal pill filters on desktop, bottom sheet on mobile
  - `map.pin`: price bubble on map markers, cluster groups for dense areas
  - `property.detail.gallery`: thumbnail strip + main image, lightbox capable
- **Palette notes**: trustworthy blue for primary; green for "for sale", gray for "sold"; luxury listings may use gold/dark navy
