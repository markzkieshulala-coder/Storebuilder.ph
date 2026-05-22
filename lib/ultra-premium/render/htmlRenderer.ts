/**
 * ============================================================================
 * BLUEPRINT -> HTML RENDERER  (ultra-premium edition)
 * ============================================================================
 * Converts a SiteBlueprint into a complete, self-contained HTML document with:
 *  • Canvas particle-field background on hero
 *  • CSS animated aurora / gradient-mesh on every section
 *  • IntersectionObserver scroll-reveal + parallax
 *  • CSS-perspective 3D card hover tilt
 *  • All nav/button links mapped to in-page #anchor IDs
 *  • Placeholder text ("SECTION N", "Generated body content") suppressed
 *  • data-editable attributes for HtmlEditor.tsx
 */

import type { SiteBlueprint, Page, Section } from "../types/SiteBlueprint";

// ── String utilities ──────────────────────────────────────────────────────────

function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fontStack(f: string): string {
  return `'${f}', 'Inter', 'Helvetica Neue', Arial, sans-serif`;
}

/** Expand #RGB → #RRGGBB. */
function hex(c: string | undefined, fb = "#ffffff"): string {
  if (!c) return fb;
  const v = c.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(v))
    return "#" + v.slice(1).split("").map((x) => x + x).join("");
  return v;
}

/** hex + 2-char alpha suffix. */
function alpha(c: string | undefined, a: string, fb = "#ffffff"): string {
  return hex(c, fb) + a;
}

/** Lighten a hex by `n` per channel so secondary ≠ background. */
function lighten(c: string | undefined, n = 16, fb = "#0a0a0a"): string {
  const h = hex(c, fb);
  if (h.length !== 7) return h;
  const ch = (s: string) =>
    Math.max(0, Math.min(255, parseInt(s, 16) + n)).toString(16).padStart(2, "0");
  return `#${ch(h.slice(1, 3))}${ch(h.slice(3, 5))}${ch(h.slice(5, 7))}`;
}

/** Return null/undefined as empty string; filter engine placeholder strings. */
function clean(s: string | undefined | null): string {
  if (!s) return "";
  // Engine fallbacks we never want rendered
  if (/section\s+\d+/i.test(s)) return "";
  if (/generated body content/i.test(s)) return "";
  return s.trim();
}

// ── Blueprint accessors ───────────────────────────────────────────────────────

function getProps(s: Section): Record<string, any> {
  return (s.component?.props ?? {}) as Record<string, any>;
}

function getItems(s: Section): any[] {
  const p = getProps(s);
  const arr = p.items || p.products || p.cards || p.blocks || p.events || p.secondaryItems;
  if (Array.isArray(arr) && arr.length > 0) return arr;
  if (p.featuredItem && typeof p.featuredItem === "object") return [p.featuredItem];
  return [];
}

function getAssetUrls(s: Section): string[] {
  return ((s.component?.assetSlots ?? []) as any[])
    .map((sl: any) => sl?.generatedUrl)
    .filter(Boolean);
}

function getHeroImage(s: Section): string {
  const p = getProps(s);
  return (
    p.heroImageSrc || p.heroMediaSrc || p.mediaSrc ||
    p.backgroundMedia || p.backgroundTexture ||
    p.foregroundProduct || p.glitchTexture ||
    p.marqueeTexture || p.transitionTexture || p.glassBackground ||
    p.leftMediaSrc || p.rightMediaSrc ||
    p.featuredItem?.image || p.featuredImage || p.image ||
    getAssetUrls(s)[0] || ""
  );
}

function getSplitImages(s: Section): { left: string; right: string } | null {
  const p = getProps(s);
  if (p.leftMediaSrc && p.rightMediaSrc) return { left: p.leftMediaSrc, right: p.rightMediaSrc };
  const slots = getAssetUrls(s);
  if (slots.length >= 2) return { left: slots[0], right: slots[1] };
  return null;
}

function getMarqueeImages(s: Section): string[] {
  const p = getProps(s);
  for (const k of ["images", "photos", "media"]) {
    if (Array.isArray(p[k]) && p[k].length > 0) return p[k].filter(Boolean);
  }
  const fromItems = getItems(s).map((i: any) => i?.image).filter(Boolean);
  if (fromItems.length > 0) return fromItems;
  return getAssetUrls(s);
}

function badgeFor(s: Section, fb: string): string {
  const m = s.copy?.microCopy;
  if (Array.isArray(m) && m[0]) return m[0];
  return fb;
}

// ── Section type detection ────────────────────────────────────────────────────

const isHero     = (s: Section) => /Hero|Header|GlitchHeader/i.test(s.name);
const isFooter   = (s: Section) => /Footer/i.test(s.name);
const isMarquee  = (s: Section) => /Marquee|Velocity/i.test(s.name);
const isSplit    = (s: Section) => /OverlappingSplit|SplitReveal|SplitText/i.test(s.name);
const isCta      = (s: Section) => /Holographic|CTA|LiquidGlass|GlassPanel/i.test(s.name);
const isTimeline = (s: Section) => /Timeline|Parallax|RhythmStack|HorizonLine/i.test(s.name);
const hasItems   = (s: Section) => getItems(s).length > 0;

/** Stable #id for each section so nav anchors work. */
function sectionId(s: Section, idx: number): string {
  if (isHero(s))     return "hero";
  if (isFooter(s))   return "footer";
  if (isMarquee(s))  return "gallery";
  if (isSplit(s))    return "story";
  if (isCta(s))      return "cta";
  if (isTimeline(s)) return "process";
  if (hasItems(s))   return "products";
  return `section-${idx}`;
}

/**
 * Map a nav path like "/products" or "/about" to the closest #anchor on the page.
 * Falls back to "#" so nothing 404s.
 */
function navAnchor(path: string, label: string, sections: Section[]): string {
  const p = (path || "").toLowerCase();
  const l = (label || "").toLowerCase();

  const match = (patterns: RegExp) =>
    sections.find((s, i) => {
      const id = sectionId(s, i);
      return patterns.test(id) || patterns.test(s.name.toLowerCase());
    });

  if (/product|shop|store|collection|menu|item|order/i.test(p + l))
    return "#products";
  if (/about|story|brand|who|us|heritage|craft/i.test(p + l))
    return "#story";
  if (/gallery|work|portfolio|look|photo|image/i.test(p + l))
    return "#gallery";
  if (/process|how|step|service|offer|work/i.test(p + l))
    return "#process";
  if (/contact|book|reserv|inquir|reach|touch|appointment/i.test(p + l))
    return "#contact";
  if (/cta|start|join|sign|get/i.test(p + l))
    return "#cta";

  // Fall back to the first non-hero non-footer section
  const fallback = sections.find((s, i) => !isHero(s) && !isFooter(s));
  if (fallback) return `#${sectionId(fallback, sections.indexOf(fallback))}`;
  return "#";
}

// ── Shared CSS decorations ────────────────────────────────────────────────────

/** Animated gradient-blob pair — used as section accent lighting. */
function blobs(PRIMARY: string, ACCENT: string, top = true): string {
  const y1 = top ? "-30%" : "80%";
  const y2 = top ? "60%"  : "-20%";
  return `
  <div aria-hidden="true" style="position:absolute;top:${y1};left:-20%;width:700px;height:700px;border-radius:50%;
    background:radial-gradient(circle, ${alpha(PRIMARY, "1e")} 0%, transparent 65%);
    filter:blur(60px);pointer-events:none;animation:sb-blob-a 12s ease-in-out infinite alternate;"></div>
  <div aria-hidden="true" style="position:absolute;top:${y2};right:-15%;width:500px;height:500px;border-radius:50%;
    background:radial-gradient(circle, ${alpha(ACCENT, "18")} 0%, transparent 65%);
    filter:blur(60px);pointer-events:none;animation:sb-blob-b 16s ease-in-out infinite alternate;"></div>`;
}

// ── Section renderers ─────────────────────────────────────────────────────────

function renderHero(s: Section, bp: SiteBlueprint, idx: number): string {
  const c      = bp.theme.colors;
  const TEXT   = hex(c.textPrimary);
  const BG     = hex(c.background, "#0a0a0a");
  const PRI    = hex(c.primary,    "#ff4d00");
  const ACC    = hex(c.accent || c.primary, PRI);
  const SEC    = lighten(c.secondary || c.background);
  const heading  = clean(s.copy?.heading) || clean(bp.copy.hero?.headline) || bp.niche;
  const body     = clean(s.copy?.body)    || clean(bp.copy.hero?.subheadline) || "";
  const cta1     = clean(s.copy?.cta)     || clean(bp.copy.hero?.ctaPrimary)  || "Explore";
  const cta2     = clean(bp.copy.hero?.ctaSecondary);
  const badge    = badgeFor(s, clean(bp.copy.hero?.badgeLabel) || "Ultra Premium");
  const heroImg  = getHeroImage(s);
  const sections = bp.pages[0]?.sections ?? [];

  return `
<section id="hero" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal="hero"
  style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${BG};">
  <!-- particle canvas -->
  <canvas id="sb-particles" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:0.55;"></canvas>
  <!-- hero image -->
  ${heroImg ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image" data-parallax="0.28"
    style="position:absolute;inset:-8% -4%;width:108%;height:116%;object-fit:cover;object-position:center;
      opacity:0.52;filter:saturate(1.12) contrast(1.06);will-change:transform;z-index:2;"/>` : ""}
  <!-- cinematic gradient veil -->
  <div aria-hidden="true" style="position:absolute;inset:0;z-index:3;
    background:linear-gradient(160deg, ${alpha(BG,"cc")} 0%, ${alpha(BG,"55")} 45%, ${alpha(BG,"aa")} 100%);"></div>
  <!-- nav shadow -->
  <div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:220px;z-index:4;
    background:linear-gradient(180deg, ${alpha(BG,"ee")} 0%, transparent 100%);pointer-events:none;"></div>
  <!-- accent blobs -->
  ${blobs(PRI, ACC)}
  <!-- content -->
  <div style="position:relative;z-index:10;text-align:center;max-width:1120px;padding:100px 28px 0;">
    <div data-reveal-child data-reveal-delay="0" style="margin-bottom:28px;">
      <span data-editable="text"
        style="display:inline-flex;align-items:center;gap:8px;padding:8px 20px;
          border:1px solid ${alpha(ACC,"66")};color:${ACC};
          font-size:10.5px;letter-spacing:0.32em;text-transform:uppercase;border-radius:99px;
          background:${alpha(ACC,"12")};backdrop-filter:blur(12px);">
        <span style="width:6px;height:6px;border-radius:50%;background:${ACC};display:inline-block;"></span>
        ${esc(badge)}
      </span>
    </div>
    <h1 data-editable="text" data-reveal-child data-reveal-delay="80"
      style="font-family:${fontStack(bp.theme.typography.headingFont)};
        font-size:clamp(42px, 8.5vw, 108px);font-weight:900;line-height:0.92;
        letter-spacing:-0.03em;margin:0 0 28px;color:${TEXT};text-transform:uppercase;
        text-shadow:0 2px 60px ${alpha(BG,"99")};">
      ${esc(heading)}
    </h1>
    ${body ? `<p data-editable="text" data-reveal-child data-reveal-delay="160"
      style="font-family:${fontStack(bp.theme.typography.bodyFont)};
        font-size:clamp(16px, 1.45vw, 22px);line-height:1.7;max-width:660px;
        margin:0 auto 44px;color:${alpha(TEXT,"cc")};">
      ${esc(body)}
    </p>` : `<div style="height:44px;"></div>`}
    <div data-reveal-child data-reveal-delay="240" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
      <a href="${navAnchor("/products","shop",sections)}" data-editable="button"
        style="display:inline-flex;align-items:center;gap:10px;padding:18px 44px;
          background:${PRI};color:${BG};
          font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:12.5px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
          text-decoration:none;border-radius:99px;
          box-shadow:0 16px 56px ${alpha(PRI,"66")};transition:transform .25s ease,box-shadow .25s ease;">
        ${esc(cta1)}
        <span style="width:18px;height:18px;border-radius:50%;background:${alpha(BG,"33")};
          display:flex;align-items:center;justify-content:center;font-size:10px;">→</span>
      </a>
      ${cta2 ? `<a href="${navAnchor("/about","about",sections)}" data-editable="button"
        style="display:inline-flex;align-items:center;padding:18px 36px;
          background:transparent;color:${TEXT};
          font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:12.5px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
          text-decoration:none;border-radius:99px;border:1px solid ${alpha(TEXT,"44")};
          backdrop-filter:blur(8px);transition:all .25s ease;">
        ${esc(cta2)}
      </a>` : ""}
    </div>
  </div>
  <!-- scroll cue -->
  <div aria-hidden="true"
    style="position:absolute;bottom:36px;left:50%;transform:translateX(-50%);z-index:10;
      display:flex;flex-direction:column;align-items:center;gap:10px;
      color:${alpha(TEXT,"55")};font-size:9.5px;letter-spacing:0.36em;text-transform:uppercase;
      animation:sb-bob 2.6s ease-in-out infinite;">
    <span>Scroll</span>
    <span style="width:1px;height:44px;background:linear-gradient(180deg, ${alpha(TEXT,"66")}, transparent);"></span>
  </div>
</section>`;
}

function renderProductGrid(s: Section, bp: SiteBlueprint, idx: number): string {
  const c     = bp.theme.colors;
  const TEXT  = hex(c.textPrimary);
  const BG    = hex(c.background, "#0a0a0a");
  const PRI   = hex(c.primary,    "#ff4d00");
  const ACC   = hex(c.accent || c.primary, PRI);
  const SURF  = lighten(c.secondary || c.background, 18);
  const items = getItems(s);
  const heading = clean(s.copy?.heading) || "The Collection";
  const body    = clean(s.copy?.body);

  const cards = items.slice(0, 8).map((item: any, i: number) => `
    <article data-editable="container" data-reveal-child data-reveal-delay="${i * 70}"
      data-tilt
      style="background:${SURF};border:1px solid ${alpha(TEXT,"12")};border-radius:20px;
        overflow:hidden;cursor:pointer;
        transform-style:preserve-3d;transform:perspective(800px) rotateX(0deg) rotateY(0deg);
        transition:transform .4s cubic-bezier(0.16,1,0.3,1),border-color .4s ease,box-shadow .4s ease;
        position:relative;will-change:transform;">
      ${item.image ? `
      <div style="aspect-ratio:1/1;overflow:hidden;background:${BG};position:relative;">
        <img src="${esc(item.image)}" alt="${esc(item.title || item.name || "")}"
          data-editable="image"
          style="width:100%;height:100%;object-fit:cover;display:block;
            transition:transform .7s cubic-bezier(0.16,1,0.3,1);"/>
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,${alpha(BG,"88")} 100%);pointer-events:none;"></div>
      </div>` : `<div style="aspect-ratio:1/1;background:linear-gradient(135deg,${alpha(PRI,"22")},${alpha(ACC,"11")});"></div>`}
      <div style="padding:22px 24px;">
        ${item.tag ? `<span data-editable="text"
          style="display:inline-block;font-size:9.5px;letter-spacing:0.26em;
            text-transform:uppercase;color:${ACC};margin-bottom:10px;
            border:1px solid ${alpha(ACC,"44")};padding:3px 10px;border-radius:99px;">
          ${esc(item.tag)}</span>` : ""}
        <h3 data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.headingFont)};
            font-size:17px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.2;">
          ${esc(item.title || item.name || "Product")}
        </h3>
        <p data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.bodyFont)};
            font-size:13px;color:${alpha(TEXT,"88")};margin:0 0 18px;line-height:1.55;">
          ${esc(clean(item.description || item.body))}
        </p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          ${item.price ? `<span data-editable="text"
            style="font-family:${fontStack(bp.theme.typography.headingFont)};
              font-size:21px;font-weight:800;color:${PRI};">
            ${esc(item.price)}</span>` : "<span></span>"}
          <a href="#" data-editable="button"
            style="font-size:10.5px;letter-spacing:0.2em;text-transform:uppercase;
              color:${BG};font-weight:700;text-decoration:none;
              padding:10px 20px;background:${PRI};border-radius:99px;
              transition:all .25s ease;box-shadow:0 6px 20px ${alpha(PRI,"44")};">
            ${esc(item.cta || "View")}
          </a>
        </div>
      </div>
    </article>`).join("");

  return `
<section id="products" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:130px 28px;background:${BG};position:relative;overflow:hidden;">
  ${blobs(PRI, ACC, false)}
  <div style="max-width:1300px;margin:0 auto;position:relative;">
    <div style="text-align:center;margin-bottom:72px;">
      <span data-editable="text" data-reveal-child
        style="display:inline-block;font-size:10.5px;letter-spacing:0.3em;
          text-transform:uppercase;color:${ACC};margin-bottom:16px;">
        ${esc(badgeFor(s, "Our Collection"))}
      </span>
      <h2 data-editable="text" data-reveal-child data-reveal-delay="60"
        style="font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:clamp(32px, 5vw, 60px);font-weight:900;color:${TEXT};
          margin:0 0 18px;text-transform:uppercase;letter-spacing:-0.015em;">
        ${esc(heading)}
      </h2>
      ${body ? `<p data-editable="text" data-reveal-child data-reveal-delay="120"
        style="font-family:${fontStack(bp.theme.typography.bodyFont)};
          font-size:17px;color:${alpha(TEXT,"88")};max-width:620px;
          margin:0 auto;line-height:1.65;">
        ${esc(body)}
      </p>` : ""}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:24px;">
      ${cards}
    </div>
  </div>
</section>`;
}

function renderFeatureBand(s: Section, bp: SiteBlueprint, idx: number): string {
  const c      = bp.theme.colors;
  const TEXT   = hex(c.textPrimary);
  const BG     = hex(c.background, "#0a0a0a");
  const PRI    = hex(c.primary,    "#ff4d00");
  const ACC    = hex(c.accent || c.primary, PRI);
  const SURF   = lighten(c.secondary || c.background, 12);
  const heading = clean(s.copy?.heading);
  const body    = clean(s.copy?.body);
  const cta     = clean(s.copy?.cta);
  const heroImg = getHeroImage(s);
  const badge   = badgeFor(s, "Signature");
  const secId   = sectionId(s, idx);

  if (!heading && !body) return ""; // skip empty sections entirely

  return `
<section id="${secId}" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:130px 28px;background:${SURF};position:relative;overflow:hidden;">
  ${blobs(PRI, ACC)}
  <!-- corner geometry accent -->
  <div aria-hidden="true" style="position:absolute;bottom:-120px;right:-80px;
    width:360px;height:360px;border:1px solid ${alpha(PRI,"22")};border-radius:50%;pointer-events:none;"></div>
  <div aria-hidden="true" style="position:absolute;bottom:-60px;right:-40px;
    width:200px;height:200px;border:1px solid ${alpha(ACC,"33")};border-radius:50%;pointer-events:none;"></div>
  <div style="max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;">
    <div data-reveal-child>
      <span data-editable="text"
        style="display:inline-block;padding:8px 18px;
          border:1px solid ${alpha(ACC,"55")};color:${ACC};
          font-size:10.5px;letter-spacing:0.3em;text-transform:uppercase;
          border-radius:99px;margin-bottom:26px;background:${alpha(ACC,"10")};">
        ${esc(badge)}
      </span>
      <h2 data-editable="text"
        style="font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:clamp(30px, 4.5vw, 54px);font-weight:900;color:${TEXT};
          margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-0.02em;">
        ${esc(heading)}
      </h2>
      <p data-editable="text"
        style="font-family:${fontStack(bp.theme.typography.bodyFont)};
          font-size:17px;line-height:1.7;color:${alpha(TEXT,"cc")};margin:0 0 36px;">
        ${esc(body)}
      </p>
      ${cta ? `<a href="#products" data-editable="button"
        style="display:inline-flex;align-items:center;gap:10px;
          padding:16px 38px;background:${PRI};color:${BG};
          font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
          text-decoration:none;border-radius:99px;
          box-shadow:0 12px 36px ${alpha(PRI,"55")};">
        ${esc(cta)}
      </a>` : ""}
    </div>
    <div data-reveal-child data-reveal-delay="140"
      style="position:relative;border-radius:28px;overflow:hidden;aspect-ratio:4/5;
        background:${BG};box-shadow:0 40px 100px ${alpha(BG,"cc")};
        transform:perspective(900px) rotateY(-4deg);">
      ${heroImg
        ? `<img src="${esc(heroImg)}" alt="${esc(heading)}" data-editable="image"
            style="width:100%;height:100%;object-fit:cover;display:block;"/>`
        : `<div style="width:100%;height:100%;
            background:linear-gradient(135deg,${alpha(PRI,"44")} 0%,${alpha(ACC,"18")} 100%);"></div>`}
      <div style="position:absolute;inset:0;
        background:linear-gradient(180deg,transparent 50%,${alpha(BG,"aa")} 100%);
        pointer-events:none;"></div>
      <!-- shine layer -->
      <div aria-hidden="true" style="position:absolute;top:0;left:-60%;width:50%;height:100%;
        background:linear-gradient(105deg,transparent 40%,${alpha(TEXT,"08")} 50%,transparent 60%);
        pointer-events:none;"></div>
    </div>
  </div>
</section>`;
}

function renderSplit(s: Section, bp: SiteBlueprint, idx: number): string {
  const c       = bp.theme.colors;
  const TEXT    = hex(c.textPrimary);
  const BG      = hex(c.background, "#0a0a0a");
  const PRI     = hex(c.primary,    "#ff4d00");
  const ACC     = hex(c.accent || c.primary, PRI);
  const split   = getSplitImages(s) || { left: getHeroImage(s), right: "" };
  const heading = clean(s.copy?.heading);
  const body    = clean(s.copy?.body);
  const cta     = clean(s.copy?.cta);

  if (!heading && !body) return "";

  return `
<section id="story" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="background:${BG};overflow:hidden;position:relative;">
  <div style="display:grid;grid-template-columns:1fr 1fr;min-height:88vh;">
    <div data-reveal-child style="position:relative;overflow:hidden;background:${BG};">
      ${split.left
        ? `<img src="${esc(split.left)}" alt="" data-editable="image" data-parallax="0.18"
            style="width:100%;height:100%;object-fit:cover;display:block;will-change:transform;position:absolute;inset:-5%;width:110%;height:110%;"/>`
        : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${alpha(PRI,"33")},${alpha(ACC,"11")});"></div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 50%,${alpha(BG,"99")} 100%);"></div>
    </div>
    <div data-reveal-child data-reveal-delay="100"
      style="position:relative;display:flex;align-items:center;padding:100px 64px;
        background:${lighten(c.secondary || c.background, 10)};overflow:hidden;">
      ${split.right
        ? `<img src="${esc(split.right)}" alt="" data-editable="image"
            style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.12;pointer-events:none;"/>`
        : ""}
      ${blobs(PRI, ACC, false)}
      <div style="position:relative;z-index:2;max-width:480px;">
        <span data-editable="text"
          style="display:inline-block;font-size:10.5px;letter-spacing:0.3em;
            text-transform:uppercase;color:${ACC};margin-bottom:22px;">
          ${esc(badgeFor(s, "The Story"))}
        </span>
        <h2 data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.headingFont)};
            font-size:clamp(28px, 4vw, 50px);font-weight:900;color:${TEXT};
            margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-0.02em;">
          ${esc(heading)}
        </h2>
        <p data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.bodyFont)};
            font-size:17px;line-height:1.7;color:${alpha(TEXT,"cc")};margin:0 0 36px;">
          ${esc(body)}
        </p>
        ${cta ? `<a href="#products" data-editable="button"
          style="display:inline-block;padding:14px 34px;background:${PRI};color:${BG};
            font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
            text-decoration:none;border-radius:99px;box-shadow:0 10px 30px ${alpha(PRI,"55")};">
          ${esc(cta)}
        </a>` : ""}
      </div>
    </div>
  </div>
</section>`;
}

function renderMarquee(s: Section, bp: SiteBlueprint, idx: number): string {
  const c      = bp.theme.colors;
  const TEXT   = hex(c.textPrimary);
  const BG     = hex(c.background, "#0a0a0a");
  const PRI    = hex(c.primary,    "#ff4d00");
  const ACC    = hex(c.accent || c.primary, PRI);
  const SURF   = lighten(c.secondary || c.background, 8);
  const images = getMarqueeImages(s);
  const heading = clean(s.copy?.heading);
  const labels  = (s.copy?.microCopy?.length ? s.copy.microCopy : [heading || bp.niche.toUpperCase()]);

  const imgItems = [...images, ...images, ...images].map((img: string) =>
    `<div style="flex-shrink:0;width:260px;height:320px;border-radius:20px;overflow:hidden;
      background:${SURF};box-shadow:0 20px 60px ${alpha(BG,"99")};">
      <img src="${esc(img)}" alt="" data-editable="image"
        style="width:100%;height:100%;object-fit:cover;display:block;"/>
    </div>`
  ).join("");

  const txtItems = [...labels, ...labels, ...labels, ...labels].map((l: string) =>
    `<span style="flex-shrink:0;
      font-family:${fontStack(bp.theme.typography.headingFont)};
      font-size:clamp(52px,9vw,120px);font-weight:900;
      color:${alpha(TEXT,"15")};text-transform:uppercase;
      letter-spacing:-0.025em;white-space:nowrap;">
      ${esc(l)}&nbsp;<span style="color:${PRI};opacity:0.6;">•</span>&nbsp;
    </span>`
  ).join("");

  return `
<section id="gallery" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:${images.length > 0 ? "110px 0" : "70px 0"};background:${BG};overflow:hidden;position:relative;">
  ${heading && images.length > 0
    ? `<div style="max-width:1280px;margin:0 auto 52px;padding:0 28px;text-align:center;">
        <h2 data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.headingFont)};
            font-size:clamp(28px,4vw,48px);font-weight:900;color:${TEXT};margin:0;
            text-transform:uppercase;letter-spacing:-0.015em;">
          ${esc(heading)}
        </h2>
      </div>` : ""}
  <!-- edge fade masks -->
  <div aria-hidden="true" style="position:absolute;top:0;bottom:0;left:0;width:120px;z-index:2;
    background:linear-gradient(90deg, ${BG} 0%, transparent 100%);pointer-events:none;"></div>
  <div aria-hidden="true" style="position:absolute;top:0;bottom:0;right:0;width:120px;z-index:2;
    background:linear-gradient(270deg, ${BG} 0%, transparent 100%);pointer-events:none;"></div>
  <div data-marquee style="display:flex;gap:${images.length > 0 ? "20px" : "48px"};
    align-items:center;
    animation:sb-marquee ${images.length > 0 ? "42s" : "28s"} linear infinite;
    will-change:transform;">
    ${images.length > 0 ? imgItems : txtItems}
  </div>
</section>`;
}

function renderCta(s: Section, bp: SiteBlueprint, idx: number): string {
  const c       = bp.theme.colors;
  const TEXT    = hex(c.textPrimary);
  const BG      = hex(c.background, "#0a0a0a");
  const PRI     = hex(c.primary,    "#ff4d00");
  const ACC     = hex(c.accent || c.primary, PRI);
  const heading = clean(s.copy?.heading);
  const body    = clean(s.copy?.body);
  const cta     = clean(s.copy?.cta) || clean(bp.copy.hero?.ctaPrimary) || "Get Started";
  const ctaImg  = getHeroImage(s);
  const sections = bp.pages[0]?.sections ?? [];

  if (!heading && !body) return "";

  return `
<section id="cta" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:150px 28px;position:relative;overflow:hidden;text-align:center;color:${BG};
    background:linear-gradient(135deg, ${PRI} 0%, ${ACC} 100%);">
  ${ctaImg ? `<img src="${esc(ctaImg)}" alt="" data-editable="image"
    style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
      opacity:0.14;mix-blend-mode:overlay;pointer-events:none;"/>` : ""}
  <!-- animated light orbs -->
  <div aria-hidden="true" style="position:absolute;top:-120px;left:-100px;
    width:480px;height:480px;border-radius:50%;
    background:${alpha(TEXT,"12")};filter:blur(80px);pointer-events:none;
    animation:sb-blob-a 10s ease-in-out infinite alternate;"></div>
  <div aria-hidden="true" style="position:absolute;bottom:-120px;right:-80px;
    width:400px;height:400px;border-radius:50%;
    background:${alpha(BG,"22")};filter:blur(80px);pointer-events:none;
    animation:sb-blob-b 14s ease-in-out infinite alternate;"></div>
  <!-- grid lines decoration -->
  <div aria-hidden="true" style="position:absolute;inset:0;
    background-image:linear-gradient(${alpha(BG,"08")} 1px, transparent 1px),
      linear-gradient(90deg, ${alpha(BG,"08")} 1px, transparent 1px);
    background-size:48px 48px;pointer-events:none;"></div>
  <div style="position:relative;z-index:2;max-width:880px;margin:0 auto;">
    <span data-editable="text" data-reveal-child
      style="display:inline-block;font-size:10.5px;letter-spacing:0.34em;
        text-transform:uppercase;color:${alpha(BG,"cc")};margin-bottom:24px;">
      ${esc(badgeFor(s, "Take Action"))}
    </span>
    <h2 data-editable="text" data-reveal-child data-reveal-delay="60"
      style="font-family:${fontStack(bp.theme.typography.headingFont)};
        font-size:clamp(36px, 6.5vw, 76px);font-weight:900;margin:0 0 24px;
        line-height:0.96;text-transform:uppercase;letter-spacing:-0.025em;">
      ${esc(heading)}
    </h2>
    ${body ? `<p data-editable="text" data-reveal-child data-reveal-delay="120"
      style="font-family:${fontStack(bp.theme.typography.bodyFont)};
        font-size:19px;opacity:0.9;line-height:1.6;margin:0 0 44px;">
      ${esc(body)}
    </p>` : `<div style="height:44px;"></div>`}
    <a href="${navAnchor("/products","shop",sections)}" data-editable="button" data-reveal-child data-reveal-delay="200"
      style="display:inline-flex;align-items:center;gap:12px;
        padding:20px 54px;background:${BG};color:${PRI};
        font-family:${fontStack(bp.theme.typography.headingFont)};
        font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;
        text-decoration:none;border-radius:99px;
        box-shadow:0 20px 60px ${alpha(BG,"55")};
        transition:transform .25s ease;">
      ${esc(cta)}
      <span style="width:20px;height:20px;border-radius:50%;
        background:${alpha(PRI,"22")};display:flex;align-items:center;
        justify-content:center;font-size:11px;">→</span>
    </a>
  </div>
</section>`;
}

function renderTimeline(s: Section, bp: SiteBlueprint, idx: number): string {
  const items = getItems(s);
  if (items.length === 0) return renderFeatureBand(s, bp, idx);
  const c       = bp.theme.colors;
  const TEXT    = hex(c.textPrimary);
  const BG      = hex(c.background, "#0a0a0a");
  const PRI     = hex(c.primary,    "#ff4d00");
  const ACC     = hex(c.accent || c.primary, PRI);
  const heading = clean(s.copy?.heading);
  const body    = clean(s.copy?.body);

  const steps = items.slice(0, 5).map((item: any, i: number) => `
    <div data-editable="container" data-reveal-child data-reveal-delay="${i * 110}"
      style="display:flex;gap:28px;padding:36px 0;
        border-bottom:1px solid ${alpha(TEXT,"14")};align-items:flex-start;">
      <div style="flex-shrink:0;width:60px;height:60px;border-radius:50%;
        background:${PRI};
        display:flex;align-items:center;justify-content:center;
        color:${BG};font-family:${fontStack(bp.theme.typography.headingFont)};
        font-size:22px;font-weight:900;
        box-shadow:0 10px 32px ${alpha(PRI,"55")};">
        ${String(i + 1).padStart(2, "0")}
      </div>
      ${item.image ? `<img src="${esc(item.image)}" alt="" data-editable="image"
        style="width:130px;height:88px;object-fit:cover;border-radius:14px;flex-shrink:0;"/>` : ""}
      <div style="flex:1;padding-top:4px;">
        <h3 data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.headingFont)};
            font-size:20px;font-weight:700;color:${TEXT};
            margin:0 0 10px;text-transform:uppercase;letter-spacing:-0.01em;">
          ${esc(item.title || item.name || `Step ${i + 1}`)}
        </h3>
        <p data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.bodyFont)};
            font-size:14.5px;color:${alpha(TEXT,"88")};margin:0;line-height:1.65;">
          ${esc(clean(item.description || item.body))}
        </p>
      </div>
    </div>`).join("");

  return `
<section id="process" data-editable="section" data-section-index="${idx}" data-section-name="${esc(s.name)}" data-reveal
  style="padding:130px 28px;background:${BG};position:relative;overflow:hidden;">
  ${blobs(PRI, ACC, false)}
  <div style="max-width:960px;margin:0 auto;position:relative;">
    ${heading ? `<div style="text-align:center;margin-bottom:56px;">
      <span data-editable="text" data-reveal-child
        style="display:inline-block;font-size:10.5px;letter-spacing:0.3em;
          text-transform:uppercase;color:${ACC};margin-bottom:16px;">
        ${esc(badgeFor(s, "The Process"))}
      </span>
      <h2 data-editable="text" data-reveal-child data-reveal-delay="60"
        style="font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:clamp(30px, 5vw, 56px);font-weight:900;color:${TEXT};
          margin:0 0 18px;text-transform:uppercase;letter-spacing:-0.015em;">
        ${esc(heading)}
      </h2>
      ${body ? `<p data-editable="text" data-reveal-child data-reveal-delay="120"
        style="font-family:${fontStack(bp.theme.typography.bodyFont)};
          font-size:17px;color:${alpha(TEXT,"88")};max-width:600px;
          margin:0 auto;line-height:1.65;">
        ${esc(body)}
      </p>` : ""}
    </div>` : ""}
    <div>${steps}</div>
  </div>
</section>`;
}

function renderFooter(bp: SiteBlueprint, idx: number, src?: Section): string {
  const c       = bp.theme.colors;
  const TEXT    = hex(c.textPrimary);
  const BG      = hex(c.background, "#0a0a0a");
  const SURF    = lighten(c.secondary || c.background, 10);
  const PRI     = hex(c.primary,    "#ff4d00");
  const ACC     = hex(c.accent || c.primary, PRI);
  const nav     = bp.navigation?.items ?? [];
  const fc      = bp.copy?.footer;
  const copyright = fc?.copyright || `© ${new Date().getFullYear()} ${bp.niche.toUpperCase()}. All Rights Reserved.`;
  const tagline   = fc?.tagline || "";
  const brand     = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();
  const bgImg     = src ? getHeroImage(src) : "";
  const sections  = bp.pages[0]?.sections ?? [];

  const links = nav.map((n) =>
    `<a href="${navAnchor(n.path, n.label, sections)}" data-editable="link"
      style="color:${alpha(TEXT,"88")};text-decoration:none;font-size:13px;
        letter-spacing:0.06em;transition:color .2s ease;white-space:nowrap;">
      ${esc(n.label)}
    </a>`
  ).join("");

  const quickLinks = [
    { label: "Home",     href: "#hero" },
    { label: "Products", href: "#products" },
    { label: "About",    href: "#story" },
    { label: "Contact",  href: "#cta" },
  ];

  return `
<footer id="contact" data-editable="section" data-section-index="${idx}" data-section-name="Footer"
  style="padding:90px 28px 44px;background:${SURF};
    border-top:1px solid ${alpha(PRI,"33")};position:relative;overflow:hidden;">
  ${bgImg ? `<img src="${esc(bgImg)}" alt="" data-editable="image"
    style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
      opacity:0.07;pointer-events:none;"/>` : ""}
  <!-- top accent line -->
  <div aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent 0%,${PRI} 40%,${ACC} 60%,transparent 100%);"></div>
  ${blobs(PRI, ACC)}
  <div style="max-width:1280px;margin:0 auto;position:relative;">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:48px;margin-bottom:56px;">
      <!-- brand column -->
      <div>
        <div data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.headingFont)};
            font-size:24px;font-weight:900;color:${TEXT};
            text-transform:uppercase;letter-spacing:-0.015em;margin-bottom:16px;">
          ${esc(brand)}
        </div>
        <p data-editable="text"
          style="font-family:${fontStack(bp.theme.typography.bodyFont)};
            font-size:14px;line-height:1.65;color:${alpha(TEXT,"88")};
            margin:0 0 14px;max-width:300px;">
          ${esc(clean(bp.copy?.hero?.subheadline))}
        </p>
        ${tagline ? `<p data-editable="text"
          style="font-size:12px;font-style:italic;color:${alpha(TEXT,"55")};margin:0;">
          ${esc(tagline)}
        </p>` : ""}
      </div>
      <!-- nav links column -->
      <div>
        <h4 style="font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;
          color:${ACC};margin:0 0 20px;">
          Navigate
        </h4>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${links || quickLinks.map(l =>
            `<a href="${l.href}" data-editable="link"
              style="color:${alpha(TEXT,"88")};text-decoration:none;font-size:13.5px;
                transition:color .2s ease;">
              ${l.label}
            </a>`
          ).join("")}
        </div>
      </div>
      <!-- contact column -->
      <div>
        <h4 style="font-family:${fontStack(bp.theme.typography.headingFont)};
          font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;
          color:${ACC};margin:0 0 20px;">
          Connect
        </h4>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <a href="#cta" data-editable="link"
            style="color:${alpha(TEXT,"88")};text-decoration:none;font-size:13.5px;">
            Get In Touch
          </a>
          <a href="#products" data-editable="link"
            style="color:${alpha(TEXT,"88")};text-decoration:none;font-size:13.5px;">
            Shop Now
          </a>
          <a href="#story" data-editable="link"
            style="color:${alpha(TEXT,"88")};text-decoration:none;font-size:13.5px;">
            Our Story
          </a>
        </div>
      </div>
    </div>
    <div style="padding-top:32px;border-top:1px solid ${alpha(TEXT,"14")};
      display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;
      font-size:12px;color:${alpha(TEXT,"55")};">
      <span data-editable="text">${esc(copyright)}</span>
      <span data-editable="text">Powered by <strong style="color:${PRI};">Storebuilder.ph</strong></span>
    </div>
  </div>
</footer>`;
}

// ── Section dispatcher ────────────────────────────────────────────────────────

function renderSection(s: Section, bp: SiteBlueprint, idx: number): string {
  if (isFooter(s))  return "";
  if (isHero(s))    return renderHero(s, bp, idx);
  if (isMarquee(s)) return renderMarquee(s, bp, idx);
  if (isSplit(s))   return renderSplit(s, bp, idx);
  if (hasItems(s)) {
    if (isTimeline(s)) return renderTimeline(s, bp, idx);
    return renderProductGrid(s, bp, idx);
  }
  if (isCta(s))     return renderCta(s, bp, idx);
  return renderFeatureBand(s, bp, idx);
}

// ── Canvas particle script ────────────────────────────────────────────────────
// Lightweight floating connected-dot particle field rendered in hero canvas.

function particleScript(primary: string): string {
  const col = primary.replace("#", "");
  return `
<script>
(function(){
  var c = document.getElementById('sb-particles');
  if (!c) return;
  var ctx = c.getContext('2d');
  var W, H, pts;
  var PRI = '#${col}';

  function resize(){
    W = c.width  = c.offsetWidth;
    H = c.height = c.offsetHeight;
    init();
  }

  function rand(a, b){ return a + Math.random() * (b - a); }

  function init(){
    var n = Math.min(90, Math.floor(W * H / 12000));
    pts = [];
    for (var i = 0; i < n; i++){
      pts.push({
        x: rand(0, W), y: rand(0, H),
        vx: rand(-0.28, 0.28), vy: rand(-0.28, 0.28),
        r: rand(1.5, 3)
      });
    }
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pts.length; i++){
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
      for (var j = i + 1; j < pts.length; j++){
        var q = pts[j];
        var dx = p.x - q.x, dy = p.y - q.y;
        var d = Math.sqrt(dx*dx + dy*dy);
        if (d < 120){
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 * (1 - d/120)).toFixed(3) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
</script>`;
}

// ── Top-level renderer ────────────────────────────────────────────────────────

export function renderBlueprintToHtml(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary,    "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);

  const page: Page | undefined = bp.pages[0];
  if (!page) return "<!doctype html><html><body><p>Empty blueprint.</p></body></html>";

  const sections  = page.sections;
  const nav       = bp.navigation?.items ?? [];
  const brand     = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();
  const title     = page.meta?.title || brand;
  const desc      = page.meta?.description || clean(bp.copy?.hero?.subheadline) || "";

  // Nav links — map every item to the correct in-page anchor
  const navLinks = nav.slice(0, 6)
    .filter((n) => !n.isCta)
    .map((n) =>
      `<a href="${navAnchor(n.path, n.label, sections)}" data-editable="link"
        style="color:${alpha(TEXT,"cc")};text-decoration:none;font-size:12px;
          letter-spacing:0.22em;text-transform:uppercase;font-weight:600;
          transition:color .25s ease,opacity .25s ease;white-space:nowrap;">
        ${esc(n.label)}
      </a>`
    ).join("");

  const ctaItem = nav.find((n) => n.isCta);
  const ctaHtml = ctaItem
    ? `<a href="${navAnchor(ctaItem.path, ctaItem.label, sections)}" data-editable="button"
        style="padding:10px 24px;background:${PRI};color:${BG};
          font-size:11.5px;letter-spacing:0.2em;text-transform:uppercase;
          text-decoration:none;font-weight:700;border-radius:99px;
          box-shadow:0 6px 24px ${alpha(PRI,"55")};transition:all .25s ease;
          white-space:nowrap;">
        ${esc(ctaItem.label)}
      </a>`
    : "";

  const sectionsHtml = sections
    .map((s, i) => renderSection(s, bp, i))
    .filter(Boolean)
    .join("\n");

  const footerSection = sections.find(isFooter);
  const footerHtml    = renderFooter(bp, sections.length, footerSection);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(bp.theme.typography.headingFont)}:wght@400;600;700;800;900&family=${encodeURIComponent(bp.theme.typography.bodyFont)}:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin:0; padding:0; background:${BG}; color:${TEXT};
  font-family:${fontStack(bp.theme.typography.bodyFont)};
  -webkit-font-smoothing:antialiased; overflow-x:hidden; }
img { max-width:100%; display:block; }
a { color: inherit; }

/* ── Button interactions ── */
a[data-editable="button"]:hover { transform:translateY(-2px); filter:brightness(1.08); }
a[data-editable="link"]:hover   { color:${PRI} !important; }

/* ── Card 3D hover ── */
article[data-tilt]:hover {
  transform: perspective(800px) rotateX(3deg) rotateY(-3deg) translateY(-8px) !important;
  border-color: ${alpha(PRI,"66")} !important;
  box-shadow: 0 36px 80px ${alpha(BG,"cc")}, 0 0 0 1px ${alpha(PRI,"22")} !important;
}
article[data-tilt]:hover img { transform: scale(1.07); }

/* ── Reveal-on-scroll ── */
[data-reveal] [data-reveal-child],
[data-reveal-child] {
  opacity: 0;
  transform: translateY(44px);
  transition: opacity .95s cubic-bezier(0.16,1,0.3,1),
              transform .95s cubic-bezier(0.16,1,0.3,1);
}
[data-reveal].is-visible [data-reveal-child],
[data-reveal-child].is-visible { opacity:1; transform:translateY(0); }
[data-reveal="hero"] [data-reveal-child] { transform:translateY(68px); }
[data-reveal="hero"].is-visible [data-reveal-child] { transform:translateY(0); }

/* ── Responsive ── */
@media (max-width: 900px) {
  div[style*="grid-template-columns:1fr 1fr"] { grid-template-columns: 1fr !important; gap:40px !important; }
  div[style*="grid-template-columns:1.4fr"] { grid-template-columns: 1fr !important; gap:32px !important; }
  div[style*="min-height:88vh"] > div { grid-template-columns: 1fr !important; min-height:auto !important; }
  div[style*="min-height:88vh"] > div > div:first-child { height:56vw !important; position:relative !important; }
  nav > div { gap:12px !important; }
  nav a:not([data-editable="button"]) { display:none; }
  nav a[data-editable="button"] { display:inline-block !important; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion:reduce) {
  [data-reveal] [data-reveal-child],[data-reveal-child]
    { opacity:1 !important; transform:none !important; transition:none !important; }
  [data-marquee],[data-parallax],canvas { animation:none !important; transform:none !important; }
}

/* ── Keyframes ── */
@keyframes sb-marquee  { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
@keyframes sb-bob      { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(9px)} }
@keyframes sb-blob-a   { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(40px,-30px) scale(1.12)} }
@keyframes sb-blob-b   { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(-30px,20px) scale(0.92)} }
@keyframes sb-fade-in  { from{opacity:0} to{opacity:1} }
@keyframes sb-nav-in   { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }

nav { animation: sb-nav-in .7s cubic-bezier(0.16,1,0.3,1) both; }

/* ── Nav scroll-shrink ── */
nav.scrolled {
  padding: 12px 28px !important;
  background: ${alpha(BG,"ee")} !important;
  border-bottom-color: ${alpha(PRI,"44")} !important;
}
</style>
</head>
<body>

<!-- ═══ NAV ═══ -->
<nav id="sb-nav"
  style="position:fixed;top:0;left:0;right:0;z-index:100;
    display:flex;align-items:center;justify-content:space-between;
    padding:20px 32px;
    background:${alpha(BG,"bb")};
    backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
    border-bottom:1px solid ${alpha(TEXT,"0e")};
    transition:padding .3s ease,background .3s ease,border-color .3s ease;">
  <a href="#hero" data-editable="link"
    style="font-family:${fontStack(bp.theme.typography.headingFont)};
      font-size:15px;font-weight:900;letter-spacing:0.12em;
      text-transform:uppercase;color:${TEXT};text-decoration:none;
      transition:color .25s ease;">
    ${esc(brand)}
  </a>
  <div style="display:flex;align-items:center;gap:30px;flex-wrap:nowrap;">
    ${navLinks}
    ${ctaHtml}
  </div>
</nav>

<main style="padding-top:0;">
${sectionsHtml}
${footerHtml}
</main>

${particleScript(PRI)}

<script>
(function(){
  /* ── scroll-reveal ── */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('is-visible');
        el.querySelectorAll('[data-reveal-child]').forEach(function(ch){
          var d = parseInt(ch.getAttribute('data-reveal-delay') || '0', 10);
          setTimeout(function(){ ch.classList.add('is-visible'); }, d);
        });
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -72px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function(el){ io.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal],[data-reveal-child]')
      .forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ── parallax ── */
  var pEls = document.querySelectorAll('[data-parallax]');
  if (pEls.length && !window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
    var tick = false;
    function onScroll(){
      if (tick) return; tick = true;
      requestAnimationFrame(function(){
        pEls.forEach(function(el){
          var r = el.getBoundingClientRect();
          var off = (window.innerHeight/2 - (r.top + r.height/2));
          var str = parseFloat(el.getAttribute('data-parallax') || '0.2');
          el.style.transform = 'translate3d(0,' + (off * str * -1).toFixed(1) + 'px,0)';
        });
        tick = false;
      });
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ── nav shrink on scroll ── */
  var nav = document.getElementById('sb-nav');
  if (nav) {
    window.addEventListener('scroll', function(){
      if (window.scrollY > 60) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }, {passive:true});
  }

  /* ── smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
})();
</script>
</body>
</html>`;
}
