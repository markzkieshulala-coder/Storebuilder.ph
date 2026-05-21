/**
 * ============================================================================
 * BLUEPRINT -> HTML RENDERER
 * ============================================================================
 * Converts an Ultra-Premium SiteBlueprint into a complete, editor-compatible
 * HTML document. The HTML uses real images (Pollinations URLs), real copy
 * (niche-aware), and inline CSS using the blueprint's typography + colors.
 *
 * Consumed by:
 *   - components/editor/HtmlEditor.tsx (data-editable attributes for in-place edit)
 *   - app/sites/[subdomain]/page.tsx (iframe srcDoc for the published page)
 *   - app/preview/[id]/page.tsx (iframe srcDoc for the preview)
 */

import type { SiteBlueprint, Page, Section } from "../types/SiteBlueprint";

function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fontStack(family: string): string {
  return `'${family}', 'Inter', 'Helvetica Neue', Arial, sans-serif`;
}

/** Expand #RGB to #RRGGBB so concatenating an alpha suffix yields valid hex. */
function hex(c: string | undefined, fallback = "#ffffff"): string {
  if (!c) return fallback;
  const v = c.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return "#" + v.slice(1).split("").map((ch) => ch + ch).join("");
  }
  return v;
}

/** hex + alpha (alpha(c.textPrimary, "99") -> "#ffffff99") */
function alpha(c: string | undefined, a: string, fallback = "#ffffff"): string {
  return hex(c, fallback) + a;
}

/** Slightly tint a color so footer/secondary surfaces don't visually equal background. */
function tint(c: string | undefined, fallback = "#0a0a0a"): string {
  const h = hex(c, fallback);
  if (h.length !== 7) return h;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  // shift each channel up by ~14 (clamped) for a subtle, always-visible delta
  const shift = (v: number) => Math.max(0, Math.min(255, v + 14)).toString(16).padStart(2, "0");
  return `#${shift(r)}${shift(g)}${shift(b)}`;
}

function getProps(s: Section): Record<string, any> {
  return (s.component?.props ?? {}) as Record<string, any>;
}

function getItems(s: Section): any[] {
  const p = getProps(s);
  // Standard item arrays
  const arr = (p.items || p.products || p.cards || p.blocks || p.events || p.secondaryItems || []) as any[];
  if (arr.length > 0) return arr;
  // Synthesize from featuredItem if that's all we have
  if (p.featuredItem && typeof p.featuredItem === "object") {
    return [p.featuredItem];
  }
  return [];
}

function getAssetUrls(s: Section): string[] {
  const slots = (s.component?.assetSlots ?? []) as any[];
  return slots.map((sl) => sl?.generatedUrl).filter(Boolean) as string[];
}

function getHeroImage(s: Section): string {
  const p = getProps(s);
  return (
    p.heroImageSrc ||
    p.heroMediaSrc ||
    p.mediaSrc ||
    p.backgroundMedia ||
    p.backgroundTexture ||
    p.foregroundProduct ||
    p.glitchTexture ||
    p.marqueeTexture ||
    p.transitionTexture ||
    p.glassBackground ||
    p.leftMediaSrc ||
    p.rightMediaSrc ||
    p.featuredItem?.image ||
    p.featuredImage ||
    p.image ||
    getAssetUrls(s)[0] ||
    ""
  );
}

function getSplitImages(s: Section): { left: string; right: string } | null {
  const p = getProps(s);
  if (p.leftMediaSrc && p.rightMediaSrc) {
    return { left: p.leftMediaSrc, right: p.rightMediaSrc };
  }
  const slots = getAssetUrls(s);
  if (slots.length >= 2) return { left: slots[0], right: slots[1] };
  return null;
}

function getMarqueeImages(s: Section): string[] {
  const p = getProps(s);
  if (Array.isArray(p.images)) return p.images.filter(Boolean);
  if (Array.isArray(p.photos)) return p.photos.filter(Boolean);
  if (Array.isArray(p.media)) return p.media.filter(Boolean);
  const items = getItems(s).map((i) => i?.image).filter(Boolean);
  if (items.length > 0) return items;
  return getAssetUrls(s);
}

function badgeFor(s: Section, fallback: string): string {
  const micro = s.copy?.microCopy;
  if (Array.isArray(micro) && micro.length > 0 && micro[0]) return micro[0];
  return fallback;
}

function isHeroSection(s: Section): boolean {
  return /Hero|Header/i.test(s.name);
}

function isFooterSection(s: Section): boolean {
  return /Footer/i.test(s.name);
}

function isMarqueeSection(s: Section): boolean {
  return /Marquee|Velocity/i.test(s.name);
}

function isSplitSection(s: Section): boolean {
  return /OverlappingSplit|SplitReveal/i.test(s.name);
}

function isCtaSection(s: Section): boolean {
  return /Holographic|CTA|Glass|LiquidGlass/i.test(s.name);
}

function isTimelineSection(s: Section): boolean {
  return /Timeline|Parallax|RhythmStack|HorizonLine/i.test(s.name);
}

function isProductSection(s: Section): boolean {
  return getItems(s).length > 0;
}

// Section renderers ----------------------------------------------------------

function renderHero(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const SECONDARY = tint(c.secondary || c.background, BG);
  const heading = s.copy?.heading || bp.copy.hero?.headline || "";
  const body = s.copy?.body || bp.copy.hero?.subheadline || "";
  const cta = s.copy?.cta || bp.copy.hero?.ctaPrimary || "Get Started";
  const ctaSecondary = bp.copy.hero?.ctaSecondary;
  const badge = badgeFor(s, bp.copy.hero?.badgeLabel || "Featured Collection");
  const heroImg = getHeroImage(s);

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal="hero"
  style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 30% 20%, ${alpha(PRIMARY, "22")} 0%, transparent 60%), linear-gradient(135deg,${BG} 0%, ${SECONDARY} 100%);">
  ${heroImg ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image" data-parallax="0.3" style="position:absolute;inset:-10% -5%;width:110%;height:120%;object-fit:cover;opacity:0.55;filter:saturate(1.1) contrast(1.08);will-change:transform;"/>` : ""}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg, ${alpha(BG, "33")} 0%, ${alpha(BG, "dd")} 100%);"></div>
  <div style="position:absolute;top:0;left:0;right:0;height:200px;background:linear-gradient(180deg, ${alpha(BG, "cc")} 0%, transparent 100%);pointer-events:none;"></div>
  <div style="position:relative;z-index:10;text-align:center;max-width:1100px;padding:0 24px;">
    <span data-editable="text" data-reveal-child style="display:inline-block;padding:8px 18px;border:1px solid ${alpha(ACCENT, "66")};color:${ACCENT};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;border-radius:99px;margin-bottom:32px;background:${alpha(ACCENT, "11")};backdrop-filter:blur(8px);">${esc(badge)}</span>
    <h1 data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(40px, 8vw, 104px);font-weight:800;line-height:0.95;letter-spacing:-0.025em;margin:0 0 24px;color:${TEXT};text-transform:uppercase;text-shadow:0 4px 40px ${alpha(BG, "99")};">${esc(heading)}</h1>
    <p data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:clamp(16px, 1.4vw, 21px);line-height:1.65;max-width:680px;margin:0 auto 40px;color:${alpha(TEXT, "cc")};">${esc(body)}</p>
    <div data-reveal-child style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
      <a href="#products" data-editable="button" style="display:inline-block;padding:18px 42px;background:${PRIMARY};color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;transition:transform .25s ease, box-shadow .25s ease;box-shadow:0 14px 50px ${alpha(PRIMARY, "66")};">${esc(cta)}</a>
      ${ctaSecondary ? `<a href="#about" data-editable="button" style="display:inline-block;padding:18px 36px;background:transparent;color:${TEXT};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;border:1px solid ${alpha(TEXT, "44")};transition:all .25s ease;">${esc(ctaSecondary)}</a>` : ""}
    </div>
  </div>
  <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:5;display:flex;flex-direction:column;align-items:center;gap:10px;color:${alpha(TEXT, "66")};font-size:10px;letter-spacing:0.32em;text-transform:uppercase;animation:sb-bob 2.4s ease-in-out infinite;">
    <span>Scroll</span>
    <span style="width:1px;height:40px;background:linear-gradient(180deg, ${alpha(TEXT, "55")}, transparent);"></span>
  </div>
</section>`;
}

function renderProductGrid(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const SECONDARY = tint(c.secondary || c.background, BG);
  const items = getItems(s);
  const heading = s.copy?.heading || "Featured Products";
  const body = s.copy?.body || "";

  const cards = items.slice(0, 8).map((item, i) => `
    <article data-editable="container" data-reveal-child data-reveal-delay="${i * 80}" style="background:${SECONDARY};border:1px solid ${alpha(TEXT, "14")};border-radius:18px;overflow:hidden;transition:transform .35s cubic-bezier(0.16,1,0.3,1), border-color .35s ease, box-shadow .35s ease;position:relative;">
      ${item.image ? `<div style="aspect-ratio:1/1;overflow:hidden;background:${BG};position:relative;"><img src="${esc(item.image)}" alt="${esc(item.title || item.name)}" data-editable="image" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s cubic-bezier(0.16,1,0.3,1);"/></div>` : ""}
      <div style="padding:22px;">
        ${item.tag ? `<span data-editable="text" style="display:inline-block;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:${ACCENT};margin-bottom:10px;">${esc(item.tag)}</span>` : ""}
        <h3 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:18px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.25;">${esc(item.title || item.name)}</h3>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:13px;color:${alpha(TEXT, "99")};margin:0 0 16px;line-height:1.55;">${esc(item.description || item.body || "")}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          ${item.price ? `<span data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:20px;font-weight:700;color:${PRIMARY};">${esc(item.price)}</span>` : "<span></span>"}
          <a href="#" data-editable="button" style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${TEXT};font-weight:700;text-decoration:none;padding:10px 18px;border:1px solid ${alpha(TEXT, "33")};border-radius:99px;transition:all .25s ease;">${esc(item.cta || "View")}</a>
        </div>
      </div>
    </article>
  `).join("");

  return `
<section id="products" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:120px 24px;background:${BG};">
  <div style="max-width:1280px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <span data-editable="text" data-reveal-child style="display:inline-block;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${ACCENT};margin-bottom:18px;">${esc(badgeFor(s, "Collection"))}</span>
      <h2 data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 5vw, 56px);font-weight:800;color:${TEXT};margin:0 0 16px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      ${body ? `<p data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;color:${alpha(TEXT, "99")};max-width:640px;margin:0 auto;line-height:1.6;">${esc(body)}</p>` : ""}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;">
      ${cards}
    </div>
  </div>
</section>`;
}

function renderFeatureBand(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const SECONDARY = tint(c.secondary || c.background, BG);
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";
  const heroImg = getHeroImage(s);
  const badge = badgeFor(s, "Signature");

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:120px 24px;background:${SECONDARY};position:relative;overflow:hidden;">
  <div style="position:absolute;top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle, ${alpha(PRIMARY, "1a")} 0%, transparent 70%);pointer-events:none;"></div>
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;position:relative;">
    <div data-reveal-child>
      <span data-editable="text" style="display:inline-block;padding:8px 16px;border:1px solid ${alpha(ACCENT, "55")};color:${ACCENT};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;border-radius:99px;margin-bottom:24px;">${esc(badge)}</span>
      <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 4.5vw, 52px);font-weight:800;color:${TEXT};margin:0 0 24px;line-height:1.05;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;line-height:1.65;color:${alpha(TEXT, "cc")};margin:0 0 32px;">${esc(body)}</p>
      ${s.copy?.cta ? `<a href="#" data-editable="button" style="display:inline-block;padding:16px 36px;background:${PRIMARY};color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;box-shadow:0 10px 30px ${alpha(PRIMARY, "55")};">${esc(s.copy.cta)}</a>` : ""}
    </div>
    <div data-reveal-child data-reveal-delay="120" style="position:relative;border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:${BG};box-shadow:0 30px 80px ${alpha(BG, "cc")};">
      ${heroImg ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image" style="width:100%;height:100%;object-fit:cover;display:block;"/>` : `<div style="width:100%;height:100%;background:linear-gradient(135deg, ${alpha(PRIMARY, "33")} 0%, ${alpha(ACCENT, "11")} 100%);"></div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 60%, ${alpha(BG, "99")} 100%);pointer-events:none;"></div>
    </div>
  </div>
</section>`;
}

function renderSplit(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const split = getSplitImages(s) || { left: getHeroImage(s), right: "" };
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:0;background:${BG};">
  <div style="display:grid;grid-template-columns:1fr 1fr;min-height:80vh;">
    <div data-reveal-child style="position:relative;overflow:hidden;background:${BG};">
      ${split.left ? `<img src="${esc(split.left)}" alt="" data-editable="image" data-parallax="0.2" style="width:100%;height:100%;object-fit:cover;display:block;will-change:transform;"/>` : ""}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg, transparent 60%, ${alpha(BG, "88")} 100%);"></div>
    </div>
    <div data-reveal-child data-reveal-delay="120" style="position:relative;overflow:hidden;display:flex;align-items:center;padding:80px 60px;background:${tint(c.secondary, BG)};">
      ${split.right ? `<img src="${esc(split.right)}" alt="" data-editable="image" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.18;"/>` : ""}
      <div style="position:relative;z-index:2;max-width:480px;">
        <span data-editable="text" style="display:inline-block;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${ACCENT};margin-bottom:20px;">${esc(badgeFor(s, "The Story"))}</span>
        <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 4vw, 52px);font-weight:800;color:${TEXT};margin:0 0 24px;line-height:1.05;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;line-height:1.65;color:${alpha(TEXT, "cc")};margin:0 0 32px;">${esc(body)}</p>
        ${s.copy?.cta ? `<a href="#" data-editable="button" style="display:inline-block;padding:14px 32px;background:${PRIMARY};color:${BG};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;">${esc(s.copy.cta)}</a>` : ""}
      </div>
    </div>
  </div>
</section>`;
}

function renderMarquee(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const images = getMarqueeImages(s);
  const heading = s.copy?.heading || "";

  // If no images at all, fall back to text marquee using microCopy
  const labels = (s.copy?.microCopy && s.copy.microCopy.length > 0)
    ? s.copy.microCopy
    : [heading || bp.niche.toUpperCase()];

  const items = images.length > 0
    ? [...images, ...images, ...images].map((img) => `<div style="flex-shrink:0;width:280px;height:340px;border-radius:18px;overflow:hidden;background:${tint(c.secondary, BG)};"><img src="${esc(img)}" alt="" data-editable="image" style="width:100%;height:100%;object-fit:cover;"/></div>`).join("")
    : [...labels, ...labels, ...labels, ...labels].map((l) => `<span style="flex-shrink:0;font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(48px,9vw,120px);font-weight:800;color:${alpha(TEXT, "1a")};text-transform:uppercase;letter-spacing:-0.02em;white-space:nowrap;">${esc(l)} <span style="color:${PRIMARY};">•</span></span>`).join("");

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:${images.length > 0 ? "100px 0" : "60px 0"};background:${BG};overflow:hidden;position:relative;">
  ${heading && images.length > 0 ? `<div style="max-width:1280px;margin:0 auto 48px;padding:0 24px;text-align:center;"><h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(28px,4vw,44px);font-weight:800;color:${TEXT};margin:0;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2></div>` : ""}
  <div data-marquee style="display:flex;gap:${images.length > 0 ? "20px" : "40px"};align-items:center;animation:sb-marquee ${images.length > 0 ? "40s" : "30s"} linear infinite;will-change:transform;">
    ${items}
  </div>
</section>`;
}

function renderCta(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";
  const cta = s.copy?.cta || bp.copy.hero?.ctaPrimary || "Get Started";
  const ctaImg = getHeroImage(s);

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:140px 24px;background:linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%);text-align:center;color:${BG};position:relative;overflow:hidden;">
  ${ctaImg ? `<img src="${esc(ctaImg)}" alt="" data-editable="image" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.18;mix-blend-mode:overlay;"/>` : ""}
  <div style="position:absolute;top:-100px;left:-100px;width:400px;height:400px;border-radius:50%;background:${alpha(TEXT, "11")};filter:blur(80px);pointer-events:none;"></div>
  <div style="position:absolute;bottom:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:${alpha(BG, "22")};filter:blur(80px);pointer-events:none;"></div>
  <div style="position:relative;z-index:2;max-width:880px;margin:0 auto;">
    <span data-editable="text" data-reveal-child style="display:inline-block;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:${BG};opacity:0.7;margin-bottom:24px;">${esc(badgeFor(s, "Join Us"))}</span>
    <h2 data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(36px, 6vw, 72px);font-weight:800;margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-0.02em;">${esc(heading)}</h2>
    <p data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:19px;opacity:0.92;line-height:1.55;margin:0 0 40px;">${esc(body)}</p>
    <a href="#" data-editable="button" data-reveal-child style="display:inline-block;padding:20px 52px;background:${BG};color:${PRIMARY};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;transition:transform .25s ease;box-shadow:0 18px 50px ${alpha(BG, "55")};">${esc(cta)}</a>
  </div>
</section>`;
}

function renderTimeline(s: Section, bp: SiteBlueprint, idx: number): string {
  const items = getItems(s);
  if (items.length === 0) return renderFeatureBand(s, bp, idx);
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";

  const steps = items.slice(0, 4).map((item, i) => `
    <div data-editable="container" data-reveal-child data-reveal-delay="${i * 120}" style="display:flex;gap:24px;padding:32px 0;border-bottom:1px solid ${alpha(TEXT, "1a")};align-items:center;">
      <div style="flex-shrink:0;width:64px;height:64px;border-radius:50%;background:${PRIMARY};display:flex;align-items:center;justify-content:center;color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:24px;font-weight:800;box-shadow:0 10px 30px ${alpha(PRIMARY, "55")};">${String(i + 1).padStart(2, "0")}</div>
      ${item.image ? `<img src="${esc(item.image)}" alt="" data-editable="image" style="width:140px;height:96px;object-fit:cover;border-radius:12px;flex-shrink:0;"/>` : ""}
      <div style="flex:1;">
        <h3 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(item.title || item.name)}</h3>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:15px;color:${alpha(TEXT, "99")};margin:0;line-height:1.6;">${esc(item.description || item.body || "")}</p>
      </div>
    </div>
  `).join("");

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:120px 24px;background:${BG};">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:48px;">
      <span data-editable="text" data-reveal-child style="display:inline-block;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${ACCENT};margin-bottom:18px;">${esc(badgeFor(s, "Process"))}</span>
      <h2 data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 5vw, 56px);font-weight:800;color:${TEXT};margin:0 0 16px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      ${body ? `<p data-editable="text" data-reveal-child style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;color:${alpha(TEXT, "99")};max-width:640px;margin:0 auto;line-height:1.6;">${esc(body)}</p>` : ""}
    </div>
    <div>${steps}</div>
  </div>
</section>`;
}

function renderFooter(bp: SiteBlueprint, idx: number, sourceSection?: Section): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const SECONDARY = tint(c.secondary || c.background, BG);
  const PRIMARY = hex(c.primary, "#ff4d00");
  const nav = bp.navigation?.items ?? [];
  const footerCopy = bp.copy?.footer;
  const copyright = footerCopy?.copyright || `© ${new Date().getFullYear()} ${bp.niche.toUpperCase()}`;
  const tagline = footerCopy?.tagline || "";
  const brand =
    bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() ||
    bp.niche.toUpperCase();
  const bgImg = sourceSection ? getHeroImage(sourceSection) : "";

  const links = nav.map((n) => `<a href="${esc(n.path)}" data-editable="link" style="color:${alpha(TEXT, "99")};text-decoration:none;font-size:13px;letter-spacing:0.06em;transition:color .2s ease;">${esc(n.label)}</a>`).join("");

  return `
<footer data-editable="section" data-section-index="${idx}" data-section-name="Footer"
  style="padding:80px 24px 40px;background:${SECONDARY};border-top:1px solid ${alpha(PRIMARY, "33")};position:relative;overflow:hidden;">
  ${bgImg ? `<img src="${esc(bgImg)}" alt="" data-editable="image" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.08;pointer-events:none;"/>` : ""}
  <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg, transparent 0%, ${PRIMARY} 50%, transparent 100%);"></div>
  <div style="max-width:1280px;margin:0 auto;position:relative;">
    <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between;align-items:flex-start;margin-bottom:48px;">
      <div style="max-width:340px;">
        <div data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:22px;font-weight:800;color:${TEXT};text-transform:uppercase;letter-spacing:-0.01em;margin-bottom:14px;">${esc(brand)}</div>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:14px;line-height:1.6;color:${alpha(TEXT, "99")};margin:0 0 12px;">${esc(bp.copy?.hero?.subheadline || "")}</p>
        ${tagline ? `<p data-editable="text" style="font-size:12px;font-style:italic;color:${alpha(TEXT, "66")};margin:0;">${esc(tagline)}</p>` : ""}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:24px;">
        ${links}
      </div>
    </div>
    <div style="padding-top:32px;border-top:1px solid ${alpha(TEXT, "14")};display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;font-size:12px;color:${alpha(TEXT, "66")};">
      <span data-editable="text">${esc(copyright)}</span>
      <span data-editable="text">Powered by Storebuilder.ph</span>
    </div>
  </div>
</footer>`;
}

// Section dispatcher --------------------------------------------------------

function renderSection(s: Section, bp: SiteBlueprint, idx: number): string {
  if (isFooterSection(s)) return ""; // rendered separately at end
  if (isHeroSection(s)) return renderHero(s, bp, idx);
  if (isMarqueeSection(s)) return renderMarquee(s, bp, idx);
  if (isSplitSection(s)) return renderSplit(s, bp, idx);
  if (isProductSection(s)) {
    if (isTimelineSection(s)) return renderTimeline(s, bp, idx);
    return renderProductGrid(s, bp, idx);
  }
  if (isCtaSection(s)) return renderCta(s, bp, idx);
  return renderFeatureBand(s, bp, idx);
}

// Top-level renderer --------------------------------------------------------

export function renderBlueprintToHtml(bp: SiteBlueprint): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const page: Page | undefined = bp.pages[0];
  if (!page) return "<!doctype html><html><body><p>Empty blueprint.</p></body></html>";

  const nav = bp.navigation?.items ?? [];
  const navLinks = nav.slice(0, 6).map((n) =>
    `<a href="${esc(n.path)}" data-editable="link" style="color:${alpha(TEXT, "cc")};text-decoration:none;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;transition:color .2s ease;">${esc(n.label)}</a>`
  ).join("");
  const ctaItem = nav.find((n) => n.isCta);
  const ctaHtml = ctaItem
    ? `<a href="${esc(ctaItem.path)}" data-editable="button" style="padding:10px 22px;background:${PRIMARY};color:${BG};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;font-weight:700;border-radius:99px;box-shadow:0 6px 20px ${alpha(PRIMARY, "55")};">${esc(ctaItem.label)}</a>`
    : "";

  const sectionsHtml = page.sections
    .map((s, i) => renderSection(s, bp, i))
    .filter(Boolean)
    .join("\n");

  const footerSection = page.sections.find(isFooterSection);
  const footerHtml = renderFooter(bp, page.sections.length, footerSection);

  const brand =
    bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() ||
    bp.niche.toUpperCase();

  const title = page.meta?.title || brand;
  const description = page.meta?.description || bp.copy?.hero?.subheadline || "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(bp.theme.typography.headingFont)}:wght@400;600;700;800;900&family=${encodeURIComponent(bp.theme.typography.bodyFont)}:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after { box-sizing: border-box; }
html,body { margin:0; padding:0; background:${BG}; color:${TEXT}; font-family:${fontStack(bp.theme.typography.bodyFont)}; -webkit-font-smoothing:antialiased; scroll-behavior:smooth; }
img { max-width:100%; display:block; }
a { color: inherit; }
button { font: inherit; cursor: pointer; }

/* Hover lift */
[data-editable="button"]:hover, a[data-editable="button"]:hover { transform: translateY(-2px); filter: brightness(1.05); }
article:hover { transform: translateY(-6px); border-color: ${alpha(PRIMARY, "66")} !important; box-shadow: 0 30px 60px ${alpha(BG, "cc")} !important; }
article:hover img { transform: scale(1.06); }
a:not([data-editable="button"]):hover { color: ${PRIMARY} !important; }

/* Mobile collapse */
@media (max-width: 768px) {
  section > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; gap: 32px !important; }
  section > div[style*="min-height:80vh"] { min-height: auto !important; }
  nav > div { gap: 14px !important; }
  nav { padding: 14px 18px !important; }
  nav a:not([data-editable="button"]) { display: none; }
  nav a:not([data-editable="button"]):first-of-type, nav a[data-editable="button"] { display: inline-block; }
}

/* Reveal-on-scroll: initial state */
[data-reveal] [data-reveal-child],
[data-reveal-child] { opacity: 0; transform: translateY(40px); transition: opacity .9s cubic-bezier(0.16, 1, 0.3, 1), transform .9s cubic-bezier(0.16, 1, 0.3, 1); }
[data-reveal].is-visible [data-reveal-child],
[data-reveal-child].is-visible { opacity: 1; transform: translateY(0); }

/* Hero — slightly different entry */
[data-reveal="hero"] [data-reveal-child] { transform: translateY(60px); }
[data-reveal="hero"].is-visible [data-reveal-child] { transform: translateY(0); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  [data-reveal] [data-reveal-child], [data-reveal-child] { opacity: 1 !important; transform: none !important; transition: none !important; }
  [data-marquee], [data-parallax] { animation: none !important; transform: none !important; }
}

/* Keyframes */
@keyframes sb-marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
@keyframes sb-bob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(8px); } }
@keyframes sb-fade-in { from { opacity: 0; } to { opacity: 1; } }

main > section:first-child, main > nav { animation: sb-fade-in .8s ease both; }
</style>
</head>
<body>
<nav style="position:fixed;top:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 28px;background:${alpha(BG, "cc")};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid ${alpha(TEXT, "11")};">
  <a href="/" data-editable="link" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:15px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${TEXT};text-decoration:none;">${esc(brand)}</a>
  <div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap;">
    ${navLinks}
    ${ctaHtml}
  </div>
</nav>
<main>
${sectionsHtml}
${footerHtml}
</main>
<script>
(function(){
  // Reveal-on-scroll via IntersectionObserver
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          // Stagger children with data-reveal-delay
          var children = e.target.querySelectorAll('[data-reveal-child]');
          children.forEach(function(child){
            var d = parseInt(child.getAttribute('data-reveal-delay') || '0', 10);
            setTimeout(function(){ child.classList.add('is-visible'); }, d);
          });
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal], [data-reveal-child]').forEach(function(el){ el.classList.add('is-visible'); });
  }

  // Parallax on elements with data-parallax (value = strength 0..1)
  var parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    var onScroll = function(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        var sy = window.scrollY;
        parallaxEls.forEach(function(el){
          var rect = el.getBoundingClientRect();
          var center = rect.top + rect.height / 2;
          var offset = (window.innerHeight / 2 - center);
          var strength = parseFloat(el.getAttribute('data-parallax') || '0.2');
          el.style.transform = 'translate3d(0,' + (offset * strength * -1).toFixed(1) + 'px,0)';
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
</script>
</body>
</html>`;
}
