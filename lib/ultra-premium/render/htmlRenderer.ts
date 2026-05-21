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

function getProps(s: Section): Record<string, any> {
  return (s.component?.props ?? {}) as Record<string, any>;
}

function getItems(s: Section): any[] {
  const p = getProps(s);
  return (p.items || p.products || p.cards || p.blocks || p.events || []) as any[];
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
    s.component?.assetSlots?.[0]?.generatedUrl ||
    ""
  );
}

function isHeroSection(s: Section): boolean {
  return /Hero/i.test(s.name) || /Header/i.test(s.name);
}

function isFooterSection(s: Section): boolean {
  return /Footer/i.test(s.name);
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
  const SECONDARY = hex(c.secondary || c.background, BG);
  const heading = s.copy?.heading || bp.copy.hero?.headline || "";
  const body = s.copy?.body || bp.copy.hero?.subheadline || "";
  const cta = s.copy?.cta || bp.copy.hero?.ctaPrimary || "Get Started";
  const heroImg = getHeroImage(s);

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}"
  style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,${BG} 0%, ${SECONDARY} 100%);">
  ${heroImg ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.45;filter:saturate(1.05) contrast(1.05);"/>` : ""}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg, ${alpha(BG, "00")} 0%, ${alpha(BG, "cc")} 100%);"></div>
  <div style="position:relative;z-index:10;text-align:center;max-width:1100px;padding:0 24px;">
    <span data-editable="text" style="display:inline-block;padding:6px 14px;border:1px solid ${alpha(ACCENT, "55")};color:${ACCENT};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;border-radius:99px;margin-bottom:32px;">${esc((bp.copy as any).labels?.[0] || "Featured Collection")}</span>
    <h1 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(40px, 8vw, 96px);font-weight:800;line-height:0.95;letter-spacing:-0.02em;margin:0 0 24px;color:${TEXT};text-transform:uppercase;">${esc(heading)}</h1>
    <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:clamp(16px, 1.3vw, 20px);line-height:1.6;max-width:680px;margin:0 auto 40px;color:${alpha(TEXT, "b3")};">${esc(body)}</p>
    <a href="#products" data-editable="button" style="display:inline-block;padding:18px 42px;background:${PRIMARY};color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;transition:transform .25s ease, box-shadow .25s ease;box-shadow:0 14px 40px ${alpha(PRIMARY, "55")};">${esc(cta)}</a>
  </div>
</section>`;
}

function renderProductGrid(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const SECONDARY = hex(c.secondary || "#111", "#111");
  const items = getItems(s);
  const heading = s.copy?.heading || "Featured Products";
  const body = s.copy?.body || "";

  const cards = items.slice(0, 8).map((item) => `
    <article data-editable="container" style="background:${SECONDARY};border:1px solid ${alpha(TEXT, "11")};border-radius:18px;overflow:hidden;transition:transform .3s ease, border-color .3s ease;position:relative;">
      ${item.image ? `<div style="aspect-ratio:1/1;overflow:hidden;background:${BG};"><img src="${esc(item.image)}" alt="${esc(item.title || item.name)}" data-editable="image" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>` : ""}
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
<section id="products" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}"
  style="padding:120px 24px;background:${BG};">
  <div style="max-width:1280px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:64px;">
      <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 5vw, 56px);font-weight:800;color:${TEXT};margin:0 0 16px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      ${body ? `<p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;color:${alpha(TEXT, "99")};max-width:640px;margin:0 auto;line-height:1.6;">${esc(body)}</p>` : ""}
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
  const SECONDARY = hex(c.secondary || c.background, BG);
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";
  const heroImg = getHeroImage(s);

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}"
  style="padding:120px 24px;background:${SECONDARY};">
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;">
    <div>
      <span data-editable="text" style="display:inline-block;padding:6px 14px;border:1px solid ${alpha(ACCENT, "55")};color:${ACCENT};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;border-radius:99px;margin-bottom:24px;">${esc((bp.copy as any).labels?.[1] || "Why Choose Us")}</span>
      <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 4.5vw, 52px);font-weight:800;color:${TEXT};margin:0 0 24px;line-height:1.05;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;line-height:1.65;color:${alpha(TEXT, "b3")};margin:0 0 32px;">${esc(body)}</p>
      ${s.copy?.cta ? `<a href="#" data-editable="button" style="display:inline-block;padding:16px 36px;background:${PRIMARY};color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;">${esc(s.copy.cta)}</a>` : ""}
    </div>
    <div style="position:relative;border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:${BG};">
      ${heroImg ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image" style="width:100%;height:100%;object-fit:cover;display:block;"/>` : ""}
    </div>
  </div>
</section>`;
}

function renderCta(s: Section, bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const BG = hex(c.background, "#0a0a0a");
  const PRIMARY = hex(c.primary, "#ff4d00");
  const ACCENT = hex(c.accent || c.primary, PRIMARY);
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";
  const cta = s.copy?.cta || bp.copy.hero?.ctaPrimary || "Get Started";

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}"
  style="padding:140px 24px;background:linear-gradient(135deg, ${PRIMARY} 0%, ${ACCENT} 100%);text-align:center;color:${BG};">
  <div style="max-width:880px;margin:0 auto;">
    <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(36px, 6vw, 72px);font-weight:800;margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-0.02em;">${esc(heading)}</h2>
    <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:19px;opacity:0.92;line-height:1.55;margin:0 0 40px;">${esc(body)}</p>
    <a href="#" data-editable="button" style="display:inline-block;padding:20px 52px;background:${BG};color:${PRIMARY};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-radius:99px;transition:transform .25s ease;">${esc(cta)}</a>
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
  const heading = s.copy?.heading || "";
  const body = s.copy?.body || "";

  const steps = items.slice(0, 4).map((item, i) => `
    <div data-editable="container" style="display:flex;gap:24px;padding:32px 0;border-bottom:1px solid ${alpha(TEXT, "1a")};align-items:center;">
      <div style="flex-shrink:0;width:64px;height:64px;border-radius:50%;background:${PRIMARY};display:flex;align-items:center;justify-content:center;color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};font-size:24px;font-weight:800;">${String(i + 1).padStart(2, "0")}</div>
      ${item.image ? `<img src="${esc(item.image)}" alt="" data-editable="image" style="width:140px;height:96px;object-fit:cover;border-radius:12px;"/>` : ""}
      <div style="flex:1;">
        <h3 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:22px;font-weight:700;color:${TEXT};margin:0 0 8px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(item.title || item.name)}</h3>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:15px;color:${alpha(TEXT, "99")};margin:0;line-height:1.6;">${esc(item.description || item.body || "")}</p>
      </div>
    </div>
  `).join("");

  return `
<section data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}"
  style="padding:120px 24px;background:${BG};">
  <div style="max-width:960px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:48px;">
      <h2 data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:clamp(32px, 5vw, 56px);font-weight:800;color:${TEXT};margin:0 0 16px;text-transform:uppercase;letter-spacing:-0.01em;">${esc(heading)}</h2>
      ${body ? `<p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:17px;color:${alpha(TEXT, "99")};max-width:640px;margin:0 auto;line-height:1.6;">${esc(body)}</p>` : ""}
    </div>
    <div>${steps}</div>
  </div>
</section>`;
}

function renderFooter(bp: SiteBlueprint, idx: number): string {
  const c = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const SECONDARY = hex(c.secondary || "#0a0a0a", "#0a0a0a");
  const nav = bp.navigation?.items ?? [];
  const footerCopy = bp.copy?.footer;
  const copyright = footerCopy?.copyright || `(c) ${new Date().getFullYear()} ${bp.niche.toUpperCase()}`;
  const brand =
    bp.copy?.hero?.headline?.split(/[,-]/)[0]?.trim() ||
    bp.niche.toUpperCase();

  const links = nav.map((n) => `<a href="${esc(n.path)}" data-editable="link" style="color:${alpha(TEXT, "99")};text-decoration:none;font-size:13px;letter-spacing:0.06em;">${esc(n.label)}</a>`).join("");

  return `
<footer data-editable="section" data-section-index="${idx}" data-section-name="Footer"
  style="padding:80px 24px 40px;background:${SECONDARY};border-top:1px solid ${alpha(TEXT, "1a")};">
  <div style="max-width:1280px;margin:0 auto;">
    <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between;align-items:flex-start;margin-bottom:48px;">
      <div style="max-width:340px;">
        <div data-editable="text" style="font-family:${fontStack(bp.theme.typography.headingFont)};font-size:22px;font-weight:800;color:${TEXT};text-transform:uppercase;letter-spacing:-0.01em;margin-bottom:14px;">${esc(brand)}</div>
        <p data-editable="text" style="font-family:${fontStack(bp.theme.typography.bodyFont)};font-size:14px;line-height:1.6;color:${alpha(TEXT, "80")};margin:0;">${esc(bp.copy?.hero?.subheadline || "")}</p>
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
  if (isFooterSection(s)) return "";
  if (isHeroSection(s)) return renderHero(s, bp, idx);
  if (isProductSection(s)) {
    if (/Timeline|Parallax|RhythmStack|HorizonLine|OverlappingSplit/i.test(s.name)) {
      return renderTimeline(s, bp, idx);
    }
    return renderProductGrid(s, bp, idx);
  }
  if (/Holographic|CTA|Card|Marquee|Glass/i.test(s.name)) {
    return renderCta(s, bp, idx);
  }
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
    `<a href="${esc(n.path)}" data-editable="link" style="color:${alpha(TEXT, "cc")};text-decoration:none;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;font-weight:600;">${esc(n.label)}</a>`
  ).join("");
  const ctaItem = nav.find((n) => n.isCta);
  const ctaHtml = ctaItem
    ? `<a href="${esc(ctaItem.path)}" data-editable="button" style="padding:10px 22px;background:${PRIMARY};color:${BG};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;font-weight:700;border-radius:99px;">${esc(ctaItem.label)}</a>`
    : "";

  const sectionsHtml = page.sections
    .map((s, i) => renderSection(s, bp, i))
    .filter(Boolean)
    .join("\n");

  const footerHtml = renderFooter(bp, page.sections.length);

  const brand =
    bp.copy?.hero?.headline?.split(/[,-]/)[0]?.trim() ||
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
html,body { margin:0; padding:0; background:${BG}; color:${TEXT}; font-family:${fontStack(bp.theme.typography.bodyFont)}; -webkit-font-smoothing:antialiased; }
img { max-width:100%; display:block; }
a { color: inherit; }
button { font: inherit; cursor: pointer; }
[data-editable="button"]:hover, a[data-editable="button"]:hover { transform: translateY(-2px); }
article:hover { transform: translateY(-4px); border-color: ${alpha(PRIMARY, "66")} !important; }
@media (max-width: 768px) {
  section > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; gap: 32px !important; }
  nav > div { gap: 14px !important; }
  nav { padding: 14px 18px !important; }
}
@keyframes sb-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
section, footer { animation: sb-fade-up .8s cubic-bezier(0.16, 1, 0.3, 1) both; }
section:nth-of-type(2) { animation-delay: .08s; }
section:nth-of-type(3) { animation-delay: .16s; }
section:nth-of-type(4) { animation-delay: .24s; }
section:nth-of-type(5) { animation-delay: .32s; }
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
</body>
</html>`;
}
