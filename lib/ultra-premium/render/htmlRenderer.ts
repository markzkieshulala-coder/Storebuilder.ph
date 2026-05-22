/**
 * Ultra-Premium HTML Renderer — Multi-Page SPA Edition
 *
 * Renders a SiteBlueprint into a fully self-contained HTML document with:
 *  - Hash-based SPA routing (Home / Products / About / Contact)
 *  - Pollinations.ai fallback images for every item and section
 *  - Canvas particle field, animated gradient blobs, CSS 3D card tilt
 *  - IntersectionObserver scroll-reveal with per-child stagger
 *  - Nav links that open distinct pages, not just scroll to anchors
 */

import type { SiteBlueprint, Page, Section } from "../types/SiteBlueprint";

// ─── String utilities ─────────────────────────────────────────────────────────

function esc(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function fonts(f: string) { return `'${f}','Inter','Helvetica Neue',Arial,sans-serif`; }
function hex(c?: string, fb = "#ffffff"): string {
  if (!c) return fb;
  const v = c.trim();
  return /^#[0-9a-fA-F]{3}$/.test(v)
    ? "#" + v.slice(1).split("").map(x => x + x).join("")
    : v;
}
function alpha(c?: string, a = "ff", fb = "#ffffff") { return hex(c, fb) + a; }
function lighten(c?: string, n = 16, fb = "#0d0d0d"): string {
  const h = hex(c, fb);
  if (h.length !== 7) return h;
  const ch = (s: string) => Math.min(255, parseInt(s, 16) + n).toString(16).padStart(2, "0");
  return `#${ch(h.slice(1,3))}${ch(h.slice(3,5))}${ch(h.slice(5,7))}`;
}
/** Strip engine placeholder text. */
function clean(s?: string | null): string {
  if (!s) return "";
  if (/section\s+\d+/i.test(s) || /generated body content/i.test(s)) return "";
  return s.trim();
}

// ─── Image utilities ──────────────────────────────────────────────────────────

function pollinationsUrl(prompt: string, seed: number, w = 800, h = 800): string {
  const enc = encodeURIComponent(prompt).slice(0, 300);
  const s   = Math.abs(seed) % 9_999_997;
  return `https://image.pollinations.ai/prompt/${enc}?seed=${s}&model=flux&width=${w}&height=${h}&nologo=true`;
}

function bpSeed(bp: SiteBlueprint): number {
  const raw = (bp.seed || "a1b2c3d4").replace(/[^0-9a-f]/gi, "").slice(0, 8) || "1a2b3c4d";
  return parseInt(raw, 16) % 9_999_997;
}

function getProps(s: Section): Record<string, any> {
  return (s.component?.props ?? {}) as Record<string, any>;
}

function assetUrls(s: Section): string[] {
  return ((s.component?.assetSlots ?? []) as any[]).map((sl: any) => sl?.generatedUrl).filter(Boolean);
}

/** Scan every string prop for a URL — handles any prop name the engine might use. */
function extractUrl(obj: Record<string, any>): string {
  const known = ["image","imageSrc","imageUrl","thumbnail","photo","src","cover","poster","artwork","productImage","img","heroImageSrc","heroMediaSrc","mediaSrc","backgroundMedia","backgroundTexture","foregroundProduct","glitchTexture","marqueeTexture","transitionTexture","glassBackground","leftMediaSrc","rightMediaSrc","featuredImage"];
  for (const k of known) {
    if (typeof obj[k] === "string" && obj[k].startsWith("http")) return obj[k];
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && v.startsWith("https://image.pollinations.ai")) return v;
    if (typeof v === "string" && /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif)/i.test(v)) return v;
  }
  return "";
}

function getItemImage(item: any, bp: SiteBlueprint, idx: number): string {
  const found = extractUrl(item);
  if (found) return found;
  return pollinationsUrl(
    `${bp.niche} ${item.title || item.name || "product"} premium product photography cinematic lighting 4k studio`,
    bpSeed(bp) + idx * 137
  );
}

function getSectionBg(s: Section, bp: SiteBlueprint, idx: number, hint = ""): string {
  const p = getProps(s);
  const found = extractUrl(p);
  if (found) return found;
  const slot = assetUrls(s)[0];
  if (slot) return slot;
  return pollinationsUrl(
    `${bp.niche} ${hint || clean(s.copy?.heading) || "premium"} cinematic photography dramatic moody 4k ultra-high quality`,
    bpSeed(bp) + idx * 239,
    1400, 800
  );
}

function getPageBg(bp: SiteBlueprint, context: string, offset: number): string {
  return pollinationsUrl(
    `${bp.niche} ${context} atmospheric cinematic premium photography moody dark 4k`,
    bpSeed(bp) + offset,
    1600, 900
  );
}

function getItems(s: Section): any[] {
  const p = getProps(s);
  const arr = p.items || p.products || p.cards || p.blocks || p.events || p.secondaryItems;
  if (Array.isArray(arr) && arr.length) return arr;
  if (p.featuredItem && typeof p.featuredItem === "object") return [p.featuredItem];
  // Check flat image arrays
  for (const k of ["images","photos","media"]) {
    if (Array.isArray(p[k]) && p[k].length) return p[k];
  }
  return [];
}

function allItems(bp: SiteBlueprint): any[] {
  const items: any[] = [];
  for (const s of bp.pages[0]?.sections ?? []) {
    for (const it of getItems(s)) items.push(it);
  }
  return items;
}

// ─── Shared CSS + keyframes ───────────────────────────────────────────────────

function sharedCss(TEXT: string, BG: string, PRI: string, ACC: string, hf: string, bf: string): string {
  return `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;padding:0;background:${BG};color:${TEXT};font-family:${fonts(bf)};-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
input,textarea,select{font:inherit}

/* Page transitions */
[data-page]{display:none;opacity:0;transition:opacity .45s ease}
[data-page].page-active{display:block;opacity:1}

/* Reveal */
[data-reveal] [data-rc],[data-rc]{opacity:0;transform:translateY(44px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
[data-reveal].vis [data-rc],[data-rc].vis{opacity:1;transform:translateY(0)}
[data-reveal="hero"] [data-rc]{transform:translateY(72px)}
[data-reveal="hero"].vis [data-rc]{transform:translateY(0)}

/* Card 3D tilt */
.card-3d{transform-style:preserve-3d;transition:transform .4s cubic-bezier(.16,1,.3,1),box-shadow .4s ease,border-color .4s ease}
.card-3d:hover{transform:perspective(800px) rotateX(4deg) rotateY(-4deg) translateY(-10px) !important;box-shadow:0 40px 90px ${alpha(BG,"dd")},0 0 0 1px ${alpha(PRI,"44")} !important}
.card-3d:hover img.card-img{transform:scale(1.07)}

/* Image shimmer placeholder */
.img-wrap{background:linear-gradient(135deg,${lighten(BG,20)},${lighten(BG,8)});overflow:hidden;position:relative}
.img-wrap img{width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .7s ease}
.img-wrap img.loaded{opacity:1}

/* Buttons */
.btn-pri{display:inline-flex;align-items:center;gap:10px;padding:16px 40px;background:${PRI};color:${BG};font-family:${fonts(hf)};font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;border-radius:99px;border:none;cursor:pointer;box-shadow:0 14px 44px ${alpha(PRI,"55")};transition:transform .25s,box-shadow .25s,filter .25s}
.btn-pri:hover{transform:translateY(-3px);box-shadow:0 22px 60px ${alpha(PRI,"66")};filter:brightness(1.07)}
.btn-sec{display:inline-flex;align-items:center;padding:16px 36px;background:transparent;color:${TEXT};font-family:${fonts(hf)};font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;border-radius:99px;border:1px solid ${alpha(TEXT,"44")};cursor:pointer;backdrop-filter:blur(8px);transition:all .25s}
.btn-sec:hover{border-color:${alpha(PRI,"aa")};color:${PRI}}

/* Form */
.form-field{width:100%;padding:14px 18px;background:${lighten(BG,14)};border:1px solid ${alpha(TEXT,"22")};border-radius:12px;color:${TEXT};font-size:15px;transition:border-color .25s}
.form-field:focus{outline:none;border-color:${PRI}}
.form-field::placeholder{color:${alpha(TEXT,"55")}}
label.form-label{display:block;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:${ACC};margin-bottom:8px;font-weight:600}

/* Nav active state */
nav a.nav-active{color:${PRI} !important}
nav.scrolled{padding:12px 32px !important;background:${alpha(BG,"f0")} !important;border-bottom-color:${alpha(PRI,"55")} !important}

/* Hover on non-button links */
a:not(.btn-pri):not(.btn-sec)[data-editable="link"]:hover{color:${PRI} !important}

/* Blobs */
.blob{position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none}
.blob-a{animation:blob-a 13s ease-in-out infinite alternate}
.blob-b{animation:blob-b 17s ease-in-out infinite alternate}

/* Mobile */
@media(max-width:900px){
  .grid-2{grid-template-columns:1fr !important}
  .grid-3{grid-template-columns:1fr !important}
  .hide-mobile{display:none !important}
  nav .nav-links{display:none !important}
}

/* Reduced motion */
@media(prefers-reduced-motion:reduce){
  [data-rc],[data-reveal] [data-rc]{opacity:1 !important;transform:none !important;transition:none !important}
  .blob,[data-marquee],#sb-canvas{animation:none !important;transform:none !important}
}

/* Keyframes */
@keyframes blob-a{0%{transform:translate(0,0) scale(1)}100%{transform:translate(44px,-32px) scale(1.14)}}
@keyframes blob-b{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-32px,24px) scale(.9)}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}
@keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(10px)}}
@keyframes fade-in{from{opacity:0}to{opacity:1}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes page-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
`;
}

// ─── Blobs decoration ────────────────────────────────────────────────────────

function blobs(PRI: string, ACC: string, flip = false): string {
  const [y1, y2] = flip ? ["60%","-20%"] : ["-25%","65%"];
  return `
  <div class="blob blob-a" style="top:${y1};left:-18%;width:600px;height:600px;background:radial-gradient(circle,${alpha(PRI,"1e")} 0%,transparent 65%);"></div>
  <div class="blob blob-b" style="top:${y2};right:-14%;width:420px;height:420px;background:radial-gradient(circle,${alpha(ACC,"18")} 0%,transparent 65%);"></div>`;
}

// ─── Section badge ────────────────────────────────────────────────────────────

function badge(s: Section, fb: string, ACC: string): string {
  const label = (s.copy?.microCopy?.[0]) || fb;
  return `<span data-editable="text" style="display:inline-flex;align-items:center;gap:7px;padding:7px 18px;border:1px solid ${alpha(ACC,"55")};color:${ACC};font-size:10px;letter-spacing:.32em;text-transform:uppercase;border-radius:99px;background:${alpha(ACC,"0e")};backdrop-filter:blur(8px);">
    <span style="width:5px;height:5px;border-radius:50%;background:${ACC};flex-shrink:0;"></span>${esc(label)}</span>`;
}

// ─── Image wrapper ────────────────────────────────────────────────────────────

function imgWrap(src: string, alt: string, style = "", cls = ""): string {
  return `<div class="img-wrap ${cls}" style="${style}">
    <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"
      onload="this.classList.add('loaded')"
      onerror="this.style.display='none'"
      class="card-img"
    />
  </div>`;
}

// ─── Particle canvas script ───────────────────────────────────────────────────

function particleScript(PRI: string): string {
  return `<script>
(function(){
  var cv=document.getElementById('sb-canvas');
  if(!cv)return;
  var ctx=cv.getContext('2d'),W,H,pts,ani;
  function resize(){
    W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;init();
  }
  function rand(a,b){return a+Math.random()*(b-a)}
  function init(){
    var n=Math.min(100,Math.floor(W*H/10000));
    pts=[];
    for(var i=0;i<n;i++) pts.push({x:rand(0,W),y:rand(0,H),vx:rand(-.3,.3),vy:rand(-.3,.3),r:rand(1.2,2.8)});
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<pts.length;i++){
      var p=pts[i];
      p.x+=p.vx;p.y+=p.vy;
      if(p.x<0)p.x=W;if(p.x>W)p.x=0;
      if(p.y<0)p.y=H;if(p.y>H)p.y=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.5)';ctx.fill();
      for(var j=i+1;j<pts.length;j++){
        var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<130){
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle='rgba(255,255,255,'+(0.12*(1-d/130)).toFixed(3)+')';
          ctx.lineWidth=.7;ctx.stroke();
        }
      }
    }
    ani=requestAnimationFrame(draw);
  }
  window.addEventListener('resize',resize);
  resize();draw();
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){cancelAnimationFrame(ani);}else{draw();}
  });
})();
</script>`;
}

// ─── Product card ─────────────────────────────────────────────────────────────

function productCard(item: any, bp: SiteBlueprint, idx: number, c: SiteBlueprint["theme"]["colors"]): string {
  const TEXT   = hex(c.textPrimary);
  const BG     = hex(c.background, "#0a0a0a");
  const PRI    = hex(c.primary, "#ff4d00");
  const ACC    = hex(c.accent || c.primary, PRI);
  const SURF   = lighten(c.secondary || c.background, 18);
  const hf     = bp.theme.typography.headingFont;
  const bf     = bp.theme.typography.bodyFont;
  const img    = getItemImage(item, bp, idx);
  const name   = esc(item.title || item.name || "Product");
  const desc   = esc(clean(item.description || item.body));
  const price  = item.price ? esc(item.price) : "";
  const tag    = item.tag ? esc(item.tag) : "";
  const cta    = esc(item.cta || "View Details");

  return `
<article class="card-3d" data-editable="container" data-rc data-reveal-delay="${idx * 70}"
  style="background:${SURF};border:1px solid ${alpha(TEXT,"12")};border-radius:20px;overflow:hidden;cursor:pointer;position:relative;">
  ${imgWrap(img, name, "aspect-ratio:1/1;", "")}
  <div style="padding:22px 24px;">
    ${tag ? `<span data-editable="text" style="display:inline-block;font-size:9px;letter-spacing:.26em;text-transform:uppercase;color:${ACC};margin-bottom:10px;border:1px solid ${alpha(ACC,"44")};padding:3px 10px;border-radius:99px;">${tag}</span>` : ""}
    <h3 data-editable="text" style="font-family:${fonts(hf)};font-size:17px;font-weight:700;color:${TEXT};margin:0 0 8px;line-height:1.2;">${name}</h3>
    ${desc ? `<p data-editable="text" style="font-family:${fonts(bf)};font-size:13px;color:${alpha(TEXT,"88")};margin:0 0 18px;line-height:1.55;">${desc}</p>` : ""}
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;">
      ${price ? `<span data-editable="text" style="font-family:${fonts(hf)};font-size:20px;font-weight:800;color:${PRI};">${price}</span>` : "<span></span>"}
      <a href="#" class="btn-pri" data-editable="button" style="padding:10px 20px;font-size:10px;">${cta}</a>
    </div>
  </div>
</article>`;
}

// ═══════════════════════════════════════════════════════════════════
// PAGE RENDERERS
// ═══════════════════════════════════════════════════════════════════

// ─── HOME PAGE ────────────────────────────────────────────────────

function renderHomePage(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const SURF = lighten(c.secondary || c.background, 14);
  const hf   = bp.theme.typography.headingFont;
  const bf   = bp.theme.typography.bodyFont;

  const heroSection  = bp.pages[0]?.sections.find(s => /Hero|Header|GlitchHeader/i.test(s.name));
  const heroImg      = heroSection ? getSectionBg(heroSection, bp, 0, "hero cinematic scene") : getPageBg(bp, "hero cinematic scene", 0);
  const heading      = clean(heroSection?.copy?.heading) || clean(bp.copy.hero?.headline) || bp.niche;
  const subheadline  = clean(heroSection?.copy?.body)    || clean(bp.copy.hero?.subheadline) || "";
  const cta1         = clean(heroSection?.copy?.cta)     || clean(bp.copy.hero?.ctaPrimary)  || "Explore";
  const cta2         = clean(bp.copy.hero?.ctaSecondary);
  const badgeText    = heroSection?.copy?.microCopy?.[0] || clean(bp.copy.hero?.badgeLabel) || "Ultra Premium";

  // featured items (up to 4)
  const featuredItems = allItems(bp).slice(0, 4);

  // about snippet from first feature-band section
  const aboutSection = bp.pages[0]?.sections.find(s =>
    !/Hero|Header|Footer|Marquee|Velocity/i.test(s.name) &&
    !/CTA|Holographic|Glass/i.test(s.name) &&
    getItems(s).length === 0
  );
  const aboutImg     = aboutSection ? getSectionBg(aboutSection, bp, 5, "brand story lifestyle") : getPageBg(bp, "brand story lifestyle", 400);
  const aboutHead    = clean(aboutSection?.copy?.heading) || `About ${bp.niche}`;
  const aboutBody    = clean(aboutSection?.copy?.body) || `Premium ${bp.niche} experience crafted with uncompromising quality and attention to detail.`;

  // stats row from microCopy
  const stats = (aboutSection?.copy?.microCopy ?? []).slice(0, 4);

  // CTA section
  const ctaSection   = bp.pages[0]?.sections.find(s => /CTA|Holographic|Glass/i.test(s.name));
  const ctaHead      = clean(ctaSection?.copy?.heading) || "Ready to Experience It?";
  const ctaBody      = clean(ctaSection?.copy?.body)    || `Discover our full range of premium ${bp.niche} offerings.`;
  const ctaCta       = clean(ctaSection?.copy?.cta)     || clean(bp.copy.hero?.ctaPrimary) || "Get Started";
  const ctaImg       = ctaSection ? getSectionBg(ctaSection, bp, 8, "call to action") : "";

  return `
<!-- ═══ HOME PAGE ═══ -->
<div id="page-home" data-page class="page-active">

  <!-- HERO -->
  <section data-editable="section" data-reveal="hero"
    style="position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${BG};">
    <canvas id="sb-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:.5;"></canvas>
    ${imgWrap(heroImg, heading, "position:absolute;inset:-8% -4%;width:110%;height:116%;z-index:2;opacity:.48;filter:saturate(1.12) contrast(1.07);", "")}
    <div style="position:absolute;inset:0;z-index:3;background:linear-gradient(160deg,${alpha(BG,"cc")} 0%,${alpha(BG,"55")} 50%,${alpha(BG,"bb")} 100%);"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:220px;z-index:4;background:linear-gradient(180deg,${alpha(BG,"ee")} 0%,transparent 100%);pointer-events:none;"></div>
    ${blobs(PRI, ACC)}
    <div style="position:relative;z-index:10;text-align:center;max-width:1120px;padding:120px 28px 60px;">
      <div data-rc data-reveal-delay="0">${badge(heroSection || {} as any, badgeText, ACC)}</div>
      <h1 data-editable="text" data-rc data-reveal-delay="80"
        style="font-family:${fonts(hf)};font-size:clamp(44px,9vw,112px);font-weight:900;
          line-height:.92;letter-spacing:-.03em;margin:24px 0;color:${TEXT};text-transform:uppercase;
          text-shadow:0 2px 60px ${alpha(BG,"99")};">
        ${esc(heading)}
      </h1>
      ${subheadline ? `<p data-editable="text" data-rc data-reveal-delay="160"
        style="font-family:${fonts(bf)};font-size:clamp(16px,1.5vw,22px);line-height:1.7;
          max-width:640px;margin:0 auto 44px;color:${alpha(TEXT,"cc")};">
        ${esc(subheadline)}
      </p>` : `<div style="height:44px;"></div>`}
      <div data-rc data-reveal-delay="240" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
        <a href="#" onclick="navigate('products');return false;" class="btn-pri" data-editable="button">${esc(cta1)}<span style="font-size:13px;">→</span></a>
        ${cta2 ? `<a href="#" onclick="navigate('about');return false;" class="btn-sec" data-editable="button">${esc(cta2)}</a>` : ""}
      </div>
    </div>
    <div style="position:absolute;bottom:36px;left:50%;z-index:10;display:flex;flex-direction:column;
      align-items:center;gap:10px;color:${alpha(TEXT,"55")};font-size:9.5px;letter-spacing:.36em;
      text-transform:uppercase;animation:bob 2.6s ease-in-out infinite;">
      <span>Scroll</span>
      <span style="width:1px;height:44px;background:linear-gradient(180deg,${alpha(TEXT,"66")},transparent);"></span>
    </div>
  </section>

  <!-- FEATURED COLLECTION -->
  ${featuredItems.length ? `
  <section data-editable="section" data-reveal style="padding:130px 28px;background:${BG};position:relative;overflow:hidden;">
    ${blobs(PRI, ACC, true)}
    <div style="max-width:1300px;margin:0 auto;position:relative;">
      <div style="text-align:center;margin-bottom:72px;">
        <span data-rc style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:14px;">Featured</span>
        <h2 data-editable="text" data-rc data-reveal-delay="60"
          style="font-family:${fonts(hf)};font-size:clamp(32px,5vw,60px);font-weight:900;
            color:${TEXT};margin:0;text-transform:uppercase;letter-spacing:-.015em;">
          The Collection
        </h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:24px;" class="grid-2">
        ${featuredItems.map((item, i) => productCard(item, bp, i, c)).join("")}
      </div>
      <div style="text-align:center;margin-top:56px;" data-rc data-reveal-delay="200">
        <a href="#" onclick="navigate('products');return false;" class="btn-sec" data-editable="button">View Full Collection →</a>
      </div>
    </div>
  </section>` : ""}

  <!-- ABOUT TEASER -->
  <section data-editable="section" data-reveal
    style="padding:0;background:${SURF};overflow:hidden;position:relative;">
    <div style="display:grid;grid-template-columns:1fr 1fr;min-height:70vh;" class="grid-2">
      <div data-rc style="position:relative;overflow:hidden;min-height:400px;">
        ${imgWrap(aboutImg, aboutHead, "position:absolute;inset:-5%;width:110%;height:110%;", "")}
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 50%,${alpha(SURF,"99")} 100%);pointer-events:none;"></div>
      </div>
      <div data-rc data-reveal-delay="120"
        style="display:flex;align-items:center;padding:80px 64px;position:relative;">
        ${blobs(PRI, ACC)}
        <div style="position:relative;z-index:2;max-width:480px;">
          <span style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:20px;">Our Story</span>
          <h2 data-editable="text"
            style="font-family:${fonts(hf)};font-size:clamp(28px,4vw,50px);font-weight:900;
              color:${TEXT};margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-.02em;">
            ${esc(aboutHead)}
          </h2>
          <p data-editable="text"
            style="font-family:${fonts(bf)};font-size:17px;line-height:1.7;color:${alpha(TEXT,"cc")};margin:0 0 36px;">
            ${esc(aboutBody)}
          </p>
          <a href="#" onclick="navigate('about');return false;" class="btn-pri" data-editable="button">Our Story →</a>
        </div>
      </div>
    </div>
  </section>

  <!-- STATS BAR -->
  ${stats.length >= 2 ? `
  <section data-reveal style="padding:60px 28px;background:${BG};border-top:1px solid ${alpha(PRI,"22")};border-bottom:1px solid ${alpha(PRI,"22")};">
    <div style="max-width:1100px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-around;gap:32px;text-align:center;">
      ${stats.map((s: string, i: number) => `
      <div data-rc data-reveal-delay="${i * 80}" style="padding:0 24px;">
        <div style="font-family:${fonts(hf)};font-size:clamp(36px,5vw,64px);font-weight:900;color:${PRI};line-height:1;">
          ${i === 0 ? "100+" : i === 1 ? "50K+" : i === 2 ? "#1" : "5★"}
        </div>
        <div style="font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:${alpha(TEXT,"88")};margin-top:10px;">${esc(s)}</div>
      </div>`).join("")}
    </div>
  </section>` : ""}

  <!-- CTA BANNER -->
  <section data-editable="section" data-reveal
    style="padding:150px 28px;position:relative;overflow:hidden;text-align:center;
      background:linear-gradient(135deg,${PRI} 0%,${ACC} 100%);color:${BG};">
    ${ctaImg ? `${imgWrap(ctaImg, "", "position:absolute;inset:0;width:100%;height:100%;opacity:.12;mix-blend-mode:overlay;", "")}` : ""}
    <div style="position:absolute;inset:0;background-image:linear-gradient(${alpha(BG,"08")} 1px,transparent 1px),linear-gradient(90deg,${alpha(BG,"08")} 1px,transparent 1px);background-size:48px 48px;pointer-events:none;"></div>
    ${blobs(BG, BG)}
    <div style="position:relative;z-index:2;max-width:860px;margin:0 auto;">
      <h2 data-editable="text" data-rc
        style="font-family:${fonts(hf)};font-size:clamp(36px,6.5vw,76px);font-weight:900;
          margin:0 0 24px;line-height:.96;text-transform:uppercase;letter-spacing:-.025em;">
        ${esc(ctaHead)}
      </h2>
      <p data-editable="text" data-rc data-reveal-delay="80"
        style="font-family:${fonts(bf)};font-size:19px;opacity:.9;line-height:1.6;margin:0 0 44px;">
        ${esc(ctaBody)}
      </p>
      <a href="#" onclick="navigate('products');return false;" class="btn-pri" data-editable="button" data-rc data-reveal-delay="160"
        style="background:${BG};color:${PRI};box-shadow:0 20px 60px ${alpha(BG,"55")};">
        ${esc(ctaCta)} →
      </a>
    </div>
  </section>

</div>`;
}

// ─── PRODUCTS PAGE ───────────────────────────────────────────────

function renderProductsPage(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const hf   = bp.theme.typography.headingFont;
  const bf   = bp.theme.typography.bodyFont;

  const items  = allItems(bp);
  const bgImg  = getPageBg(bp, "product showcase collection", 500);
  const tags   = [...new Set(items.map((it: any) => it.tag).filter(Boolean))].slice(0, 6);

  // Get any product-section heading
  const prodSection = bp.pages[0]?.sections.find(s => getItems(s).length > 0 && !/Hero|Footer/i.test(s.name));
  const pageHead    = clean(prodSection?.copy?.heading) || "The Collection";
  const pageSub     = clean(prodSection?.copy?.body) || `Explore our full range of premium ${bp.niche} offerings.`;

  return `
<!-- ═══ PRODUCTS PAGE ═══ -->
<div id="page-products" data-page>

  <!-- PAGE HERO -->
  <section data-editable="section" style="position:relative;min-height:44vh;display:flex;align-items:flex-end;overflow:hidden;background:${BG};padding-top:96px;">
    ${imgWrap(bgImg, pageHead, "position:absolute;inset:0;width:100%;height:100%;opacity:.4;filter:saturate(1.1);", "")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,${alpha(BG,"44")} 0%,${alpha(BG,"ee")} 100%);"></div>
    ${blobs(PRI, ACC)}
    <div style="position:relative;z-index:2;max-width:1300px;margin:0 auto;padding:60px 28px;width:100%;">
      <span style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:16px;">Catalog</span>
      <h1 style="font-family:${fonts(hf)};font-size:clamp(40px,7vw,88px);font-weight:900;color:${TEXT};margin:0 0 16px;text-transform:uppercase;letter-spacing:-.02em;">${esc(pageHead)}</h1>
      <p style="font-family:${fonts(bf)};font-size:17px;color:${alpha(TEXT,"aa")};max-width:560px;line-height:1.6;">${esc(pageSub)}</p>
    </div>
  </section>

  <!-- FILTER BAR -->
  ${tags.length ? `
  <section style="padding:28px;background:${BG};border-bottom:1px solid ${alpha(TEXT,"0e")};position:sticky;top:72px;z-index:40;backdrop-filter:blur(20px);">
    <div style="max-width:1300px;margin:0 auto;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
      <span style="font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:${alpha(TEXT,"55")};margin-right:8px;">Filter:</span>
      <button onclick="filterCards('all',this)" style="padding:7px 18px;border-radius:99px;border:1px solid ${alpha(PRI,"88")};background:${PRI};color:${BG};font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;cursor:pointer;" data-filter="all">All</button>
      ${tags.map((t: string) => `<button onclick="filterCards('${esc(t)}',this)" style="padding:7px 18px;border-radius:99px;border:1px solid ${alpha(TEXT,"33")};background:transparent;color:${alpha(TEXT,"aa")};font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;cursor:pointer;" data-filter="${esc(t)}">${esc(t)}</button>`).join("")}
    </div>
  </section>` : ""}

  <!-- PRODUCT GRID -->
  <section data-editable="section" data-reveal style="padding:80px 28px 130px;background:${BG};position:relative;overflow:hidden;">
    ${blobs(PRI, ACC, true)}
    <div style="max-width:1300px;margin:0 auto;position:relative;">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:28px;" class="grid-2" id="product-grid">
        ${items.length
          ? items.map((item: any, i: number) => {
              const tag = item.tag || "";
              return productCard(item, bp, i, c).replace("<article", `<article data-tag="${esc(tag)}"`);
            }).join("")
          : `<div style="grid-column:1/-1;text-align:center;padding:80px 0;color:${alpha(TEXT,"55")};">
              <p style="font-size:17px;">Products are being generated. Regenerate to see them.</p>
            </div>`
        }
      </div>
    </div>
  </section>

</div>`;
}

// ─── ABOUT PAGE ──────────────────────────────────────────────────

function renderAboutPage(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const SURF = lighten(c.secondary || c.background, 14);
  const hf   = bp.theme.typography.headingFont;
  const bf   = bp.theme.typography.bodyFont;

  const bgImg     = getPageBg(bp, "brand story heritage lifestyle documentary", 800);
  const brand     = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche;
  const subhead   = clean(bp.copy?.hero?.subheadline) || `Premium ${bp.niche} experience.`;

  // Pull body copy from feature/split sections
  const storySections = (bp.pages[0]?.sections ?? []).filter(s =>
    !/Hero|Header|Footer|Marquee|Velocity/i.test(s.name) && getItems(s).length === 0
  ).slice(0, 3);

  // Values from microCopy
  const allMicro: string[] = [];
  for (const s of bp.pages[0]?.sections ?? []) {
    for (const m of (s.copy?.microCopy ?? [])) {
      if (!allMicro.includes(m)) allMicro.push(m);
    }
  }
  const valueCards = allMicro.slice(0, 3);

  // Timeline items from any timeline section
  const tlSection = (bp.pages[0]?.sections ?? []).find(s => /Timeline|Parallax|RhythmStack|Horizon/i.test(s.name));
  const tlItems   = tlSection ? getItems(tlSection).slice(0, 4) : [];

  const valIcons = ["◈", "◉", "◇"];

  return `
<!-- ═══ ABOUT PAGE ═══ -->
<div id="page-about" data-page>

  <!-- CINEMATIC HEADER -->
  <section data-editable="section" data-reveal="hero"
    style="position:relative;min-height:80vh;display:flex;align-items:center;overflow:hidden;background:${BG};padding-top:88px;">
    ${imgWrap(bgImg, brand, "position:absolute;inset:0;width:100%;height:100%;opacity:.5;filter:saturate(1.1);", "")}
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${alpha(BG,"dd")} 0%,${alpha(BG,"66")} 60%,${alpha(BG,"cc")} 100%);"></div>
    ${blobs(PRI, ACC)}
    <div style="position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:80px 28px;">
      <span data-rc style="display:inline-block;font-size:10px;letter-spacing:.36em;text-transform:uppercase;color:${ACC};margin-bottom:24px;">About Us</span>
      <h1 data-editable="text" data-rc data-reveal-delay="80"
        style="font-family:${fonts(hf)};font-size:clamp(48px,9vw,110px);font-weight:900;
          color:${TEXT};margin:0 0 28px;line-height:.92;text-transform:uppercase;letter-spacing:-.03em;">
        Our<br/>Story
      </h1>
      <p data-editable="text" data-rc data-reveal-delay="160"
        style="font-family:${fonts(bf)};font-size:clamp(17px,1.5vw,22px);line-height:1.7;
          max-width:600px;color:${alpha(TEXT,"cc")};">
        ${esc(subhead)}
      </p>
    </div>
  </section>

  <!-- STORY SECTIONS -->
  ${storySections.map((s, i) => {
    const head  = clean(s.copy?.heading);
    const body  = clean(s.copy?.body);
    if (!head && !body) return "";
    const sImg  = getSectionBg(s, bp, i + 10, "brand lifestyle");
    const isOdd = i % 2 === 0;
    return `
  <section data-editable="section" data-reveal
    style="padding:0;background:${i % 2 ? SURF : BG};overflow:hidden;position:relative;">
    <div style="display:grid;grid-template-columns:1fr 1fr;min-height:60vh;" class="grid-2">
      ${isOdd ? `
      <div data-rc style="position:relative;overflow:hidden;min-height:360px;">
        ${imgWrap(sImg, head, "position:absolute;inset:-5%;width:110%;height:110%;", "")}
        <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent 50%,${alpha(i % 2 ? SURF : BG,"99")} 100%);pointer-events:none;"></div>
      </div>
      <div data-rc data-reveal-delay="120" style="display:flex;align-items:center;padding:80px 64px;position:relative;">
      ` : `
      <div data-rc data-reveal-delay="120" style="display:flex;align-items:center;padding:80px 64px;position:relative;">
      `}
        ${blobs(PRI, ACC, isOdd)}
        <div style="position:relative;z-index:2;max-width:480px;">
          <span style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:20px;">${esc(s.copy?.microCopy?.[0] || "Our Journey")}</span>
          <h2 data-editable="text"
            style="font-family:${fonts(hf)};font-size:clamp(28px,4vw,48px);font-weight:900;
              color:${TEXT};margin:0 0 24px;line-height:1.0;text-transform:uppercase;letter-spacing:-.02em;">
            ${esc(head)}
          </h2>
          <p data-editable="text"
            style="font-family:${fonts(bf)};font-size:16px;line-height:1.75;color:${alpha(TEXT,"cc")};margin:0 0 32px;">
            ${esc(body)}
          </p>
          ${s.copy?.cta ? `<a href="#" onclick="navigate('contact');return false;" class="btn-pri" data-editable="button">${esc(s.copy.cta)}</a>` : ""}
        </div>
      </div>
      ${!isOdd ? `
      <div data-rc style="position:relative;overflow:hidden;min-height:360px;">
        ${imgWrap(sImg, head, "position:absolute;inset:-5%;width:110%;height:110%;", "")}
        <div style="position:absolute;inset:0;background:linear-gradient(270deg,transparent 50%,${alpha(i % 2 ? SURF : BG,"99")} 100%);pointer-events:none;"></div>
      </div>` : ""}
    </div>
  </section>`;
  }).join("")}

  <!-- VALUES PILLARS -->
  ${valueCards.length ? `
  <section data-reveal style="padding:120px 28px;background:${BG};position:relative;overflow:hidden;">
    ${blobs(PRI, ACC, true)}
    <div style="max-width:1100px;margin:0 auto;position:relative;">
      <div style="text-align:center;margin-bottom:72px;">
        <span data-rc style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:14px;">What We Stand For</span>
        <h2 data-rc data-reveal-delay="60"
          style="font-family:${fonts(hf)};font-size:clamp(30px,5vw,56px);font-weight:900;
            color:${TEXT};margin:0;text-transform:uppercase;letter-spacing:-.015em;">
          Our Values
        </h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:28px;" class="grid-3">
        ${valueCards.map((v: string, i: number) => `
        <div data-rc data-reveal-delay="${i * 100}"
          style="background:${lighten(c.secondary || c.background, 18)};border:1px solid ${alpha(TEXT,"12")};
            border-radius:20px;padding:40px 32px;text-align:center;position:relative;overflow:hidden;">
          <div style="width:64px;height:64px;border-radius:50%;background:${PRI};
            display:flex;align-items:center;justify-content:center;
            font-size:28px;color:${BG};margin:0 auto 24px;
            box-shadow:0 12px 36px ${alpha(PRI,"55")};">
            ${valIcons[i] || "◈"}
          </div>
          <h3 style="font-family:${fonts(hf)};font-size:18px;font-weight:700;color:${TEXT};
            margin:0 0 12px;text-transform:uppercase;letter-spacing:-.01em;">
            ${esc(v)}
          </h3>
          <p style="font-family:${fonts(bp.theme.typography.bodyFont)};font-size:14px;
            color:${alpha(TEXT,"77")};line-height:1.6;margin:0;">
            Premium quality and uncompromising standards in every detail.
          </p>
        </div>`).join("")}
      </div>
    </div>
  </section>` : ""}

  <!-- PROCESS / TIMELINE -->
  ${tlItems.length ? `
  <section data-reveal style="padding:120px 28px;background:${SURF};position:relative;overflow:hidden;">
    ${blobs(PRI, ACC)}
    <div style="max-width:900px;margin:0 auto;position:relative;">
      <div style="text-align:center;margin-bottom:60px;">
        <span data-rc style="display:inline-block;font-size:10px;letter-spacing:.32em;text-transform:uppercase;color:${ACC};margin-bottom:14px;">${esc(tlSection?.copy?.microCopy?.[0] || "How We Work")}</span>
        <h2 data-rc data-reveal-delay="60"
          style="font-family:${fonts(hf)};font-size:clamp(28px,5vw,52px);font-weight:900;
            color:${TEXT};margin:0;text-transform:uppercase;letter-spacing:-.015em;">
          ${esc(clean(tlSection?.copy?.heading) || "Our Process")}
        </h2>
      </div>
      ${tlItems.map((item: any, i: number) => `
      <div data-rc data-reveal-delay="${i * 110}"
        style="display:flex;gap:28px;padding:36px 0;border-bottom:1px solid ${alpha(TEXT,"14")};align-items:flex-start;">
        <div style="flex-shrink:0;width:60px;height:60px;border-radius:50%;background:${PRI};
          display:flex;align-items:center;justify-content:center;color:${BG};
          font-family:${fonts(hf)};font-size:22px;font-weight:900;
          box-shadow:0 10px 32px ${alpha(PRI,"55")};">
          ${String(i + 1).padStart(2, "0")}
        </div>
        ${imgWrap(getItemImage(item, bp, i + 40), "", "width:120px;height:80px;border-radius:12px;flex-shrink:0;", "")}
        <div style="flex:1;padding-top:4px;">
          <h3 style="font-family:${fonts(hf)};font-size:20px;font-weight:700;color:${TEXT};margin:0 0 8px;text-transform:uppercase;">
            ${esc(item.title || item.name || `Step ${i + 1}`)}
          </h3>
          <p style="font-family:${fonts(bp.theme.typography.bodyFont)};font-size:14px;color:${alpha(TEXT,"88")};margin:0;line-height:1.65;">
            ${esc(clean(item.description || item.body))}
          </p>
        </div>
      </div>`).join("")}
    </div>
  </section>` : ""}

</div>`;
}

// ─── CONTACT PAGE ───────────────────────────────────────────────

function renderContactPage(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const SURF = lighten(c.secondary || c.background, 14);
  const hf   = bp.theme.typography.headingFont;
  const bf   = bp.theme.typography.bodyFont;

  const bgImg = getPageBg(bp, "luxury interior premium ambiance contact", 1200);
  const brand = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche;

  // Niche-appropriate hours
  const hoursMap: Record<string, string> = {
    restaurant: "Mon–Thu 5pm–10pm · Fri–Sat 5pm–11pm · Sun 4pm–9pm",
    salon: "Tue–Fri 9am–7pm · Sat 9am–6pm · Sun 10am–4pm · Mon Closed",
    store: "Mon–Sat 10am–8pm · Sun 11am–6pm",
    basketball: "Mon–Fri 9am–9pm · Sat–Sun 10am–7pm",
    cybersecurity: "Mon–Fri 8am–6pm · Emergency line 24/7",
    portfolio: "Available by appointment · Response within 24 hours",
  };
  const niche = bp.niche.toLowerCase();
  const hours = Object.entries(hoursMap).find(([k]) => niche.includes(k))?.[1]
    ?? "Mon–Fri 9am–6pm · Sat 10am–4pm · Sun Closed";

  return `
<!-- ═══ CONTACT PAGE ═══ -->
<div id="page-contact" data-page>

  <!-- HEADER -->
  <section data-editable="section" data-reveal="hero"
    style="position:relative;min-height:50vh;display:flex;align-items:center;overflow:hidden;background:${BG};padding-top:88px;">
    ${imgWrap(bgImg, "Contact", "position:absolute;inset:0;width:100%;height:100%;opacity:.44;filter:saturate(1.1);", "")}
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${alpha(BG,"ee")} 0%,${alpha(BG,"77")} 60%,${alpha(BG,"cc")} 100%);"></div>
    ${blobs(PRI, ACC)}
    <div style="position:relative;z-index:2;max-width:1100px;margin:0 auto;padding:80px 28px;">
      <span data-rc style="display:inline-block;font-size:10px;letter-spacing:.36em;text-transform:uppercase;color:${ACC};margin-bottom:20px;">Get In Touch</span>
      <h1 data-editable="text" data-rc data-reveal-delay="80"
        style="font-family:${fonts(hf)};font-size:clamp(44px,8vw,100px);font-weight:900;
          color:${TEXT};margin:0;line-height:.92;text-transform:uppercase;letter-spacing:-.03em;">
        Let's<br/>Connect
      </h1>
    </div>
  </section>

  <!-- FORM + INFO -->
  <section data-reveal style="padding:100px 28px 130px;background:${BG};position:relative;overflow:hidden;">
    ${blobs(PRI, ACC, true)}
    <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:64px;position:relative;" class="grid-2">

      <!-- FORM -->
      <div data-rc>
        <h2 style="font-family:${fonts(hf)};font-size:clamp(24px,3.5vw,42px);font-weight:900;color:${TEXT};margin:0 0 36px;text-transform:uppercase;letter-spacing:-.015em;">Send a Message</h2>
        <form onsubmit="handleContactForm(event)" style="display:flex;flex-direction:column;gap:22px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;" class="grid-2">
            <div>
              <label class="form-label">First Name</label>
              <input type="text" class="form-field" placeholder="John" required/>
            </div>
            <div>
              <label class="form-label">Last Name</label>
              <input type="text" class="form-field" placeholder="Doe"/>
            </div>
          </div>
          <div>
            <label class="form-label">Email Address</label>
            <input type="email" class="form-field" placeholder="john@example.com" required/>
          </div>
          <div>
            <label class="form-label">Subject</label>
            <input type="text" class="form-field" placeholder="How can we help?"/>
          </div>
          <div>
            <label class="form-label">Message</label>
            <textarea class="form-field" rows="5" placeholder="Tell us about your inquiry..." style="resize:vertical;"></textarea>
          </div>
          <button type="submit" class="btn-pri" style="align-self:flex-start;margin-top:8px;">
            Send Message →
          </button>
          <div id="form-success" style="display:none;padding:16px 20px;background:${alpha(ACC,"22")};border:1px solid ${ACC};border-radius:12px;color:${ACC};font-size:14px;font-weight:600;">
            ✓ Message sent! We'll get back to you shortly.
          </div>
        </form>
      </div>

      <!-- INFO PANEL -->
      <div data-rc data-reveal-delay="120" style="display:flex;flex-direction:column;gap:28px;padding-top:80px;">
        ${[
          { icon: "✦", label: "Brand", value: esc(brand) },
          { icon: "◎", label: "Hours", value: esc(hours) },
          { icon: "→", label: "Location", value: `Premium ${esc(bp.niche)} District` },
        ].map(info => `
        <div style="display:flex;gap:20px;align-items:flex-start;">
          <div style="flex-shrink:0;width:48px;height:48px;border-radius:50%;background:${alpha(PRI,"22")};
            border:1px solid ${alpha(PRI,"44")};display:flex;align-items:center;justify-content:center;
            color:${PRI};font-size:18px;margin-top:4px;">
            ${info.icon}
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:${ACC};margin-bottom:6px;">${info.label}</div>
            <div style="font-family:${fonts(hf)};font-size:17px;font-weight:700;color:${TEXT};line-height:1.4;">${info.value}</div>
          </div>
        </div>`).join("")}

        <!-- LOCATION VISUAL -->
        <div style="margin-top:16px;border-radius:20px;overflow:hidden;aspect-ratio:16/9;border:1px solid ${alpha(TEXT,"14")};">
          ${imgWrap(getPageBg(bp, "luxury location exterior premium", 1400), "Location", "width:100%;height:100%;", "")}
        </div>
      </div>
    </div>
  </section>

</div>`;
}

// ─── NAV ─────────────────────────────────────────────────────────

type PageDef = { id: string; label: string; isCta?: boolean };

function detectPages(bp: SiteBlueprint): PageDef[] {
  const nav   = bp.navigation?.items ?? [];
  const pages: PageDef[] = [];
  const added = new Set<string>();

  function add(id: string, label: string, isCta = false) {
    if (!added.has(id)) { pages.push({ id, label, isCta }); added.add(id); }
  }

  add("home", "Home");

  for (const item of nav) {
    const l = (item.label + " " + item.path).toLowerCase();
    if (/product|shop|store|collection|menu|catalog|item|order/i.test(l))  add("products",  item.label, item.isCta);
    else if (/about|story|brand|heritage|us\b|who/i.test(l))               add("about",     item.label, item.isCta);
    else if (/contact|book|reserv|touch|appointment|inquir/i.test(l))      add("contact",   item.label, item.isCta);
    else if (!/home/i.test(l))                                              add(item.isCta ? "products" : "about", item.label, item.isCta);
  }

  if (!added.has("products")) add("products", "Shop");
  if (!added.has("about"))    add("about",    "About");
  if (!added.has("contact"))  add("contact",  "Contact");

  return pages;
}

function renderNav(bp: SiteBlueprint, pages: PageDef[]): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const hf   = bp.theme.typography.headingFont;
  const brand = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();

  const links = pages.map(pg =>
    pg.isCta
      ? `<a href="#" onclick="navigate('${pg.id}');return false;" class="btn-pri" data-editable="button" data-nav-page="${pg.id}" style="padding:10px 24px;font-size:11px;">${esc(pg.label)}</a>`
      : `<a href="#" onclick="navigate('${pg.id}');return false;" data-editable="link" data-nav-page="${pg.id}"
          style="color:${alpha(TEXT,"cc")};font-size:12px;letter-spacing:.22em;text-transform:uppercase;
            font-weight:600;transition:color .25s ease;white-space:nowrap;padding:4px 0;"
          class="${pg.id === 'home' ? 'nav-active' : ''}">
          ${esc(pg.label)}
        </a>`
  ).join("");

  return `
<nav id="sb-nav"
  style="position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;
    justify-content:space-between;padding:20px 32px;
    background:${alpha(BG,"bb")};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
    border-bottom:1px solid ${alpha(TEXT,"0d")};
    transition:padding .3s ease,background .3s ease,border-color .3s ease;animation:fade-in .7s ease both;">
  <a href="#" onclick="navigate('home');return false;" data-editable="link"
    style="font-family:${fonts(hf)};font-size:15px;font-weight:900;letter-spacing:.12em;
      text-transform:uppercase;color:${TEXT};transition:color .25s ease;">
    ${esc(brand)}
  </a>
  <div class="nav-links" style="display:flex;align-items:center;gap:28px;flex-wrap:nowrap;">
    ${links}
  </div>
</nav>`;
}

// ─── Footer ──────────────────────────────────────────────────────

function renderFooter(bp: SiteBlueprint, pages: PageDef[]): string {
  const c     = bp.theme.colors;
  const TEXT  = hex(c.textPrimary);
  const BG    = hex(c.background, "#0a0a0a");
  const SURF  = lighten(c.secondary || c.background, 10);
  const PRI   = hex(c.primary, "#ff4d00");
  const ACC   = hex(c.accent || c.primary, PRI);
  const hf    = bp.theme.typography.headingFont;
  const bf    = bp.theme.typography.bodyFont;
  const brand = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();
  const copy  = bp.copy?.footer?.copyright || `© ${new Date().getFullYear()} ${brand.toUpperCase()}`;
  const tag   = bp.copy?.footer?.tagline || "";
  const sub   = clean(bp.copy?.hero?.subheadline) || "";

  const navLinks = pages.map(pg =>
    `<a href="#" onclick="navigate('${pg.id}');return false;" data-editable="link"
      style="color:${alpha(TEXT,"77")};font-size:13.5px;transition:color .2s ease;display:block;padding:4px 0;">
      ${esc(pg.label)}
    </a>`
  ).join("");

  return `
<footer data-editable="section"
  style="padding:90px 28px 44px;background:${SURF};border-top:1px solid ${alpha(PRI,"33")};position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;right:0;height:1px;
    background:linear-gradient(90deg,transparent 0%,${PRI} 40%,${ACC} 60%,transparent 100%);"></div>
  ${blobs(PRI, ACC)}
  <div style="max-width:1280px;margin:0 auto;position:relative;">
    <div style="display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:48px;margin-bottom:56px;" class="grid-3">
      <div>
        <div data-editable="text" style="font-family:${fonts(hf)};font-size:22px;font-weight:900;color:${TEXT};text-transform:uppercase;letter-spacing:-.01em;margin-bottom:14px;">${esc(brand)}</div>
        ${sub ? `<p data-editable="text" style="font-family:${fonts(bf)};font-size:14px;line-height:1.65;color:${alpha(TEXT,"88")};margin:0 0 10px;max-width:300px;">${esc(sub)}</p>` : ""}
        ${tag ? `<p data-editable="text" style="font-size:12px;font-style:italic;color:${alpha(TEXT,"55")};margin:0;">${esc(tag)}</p>` : ""}
      </div>
      <div>
        <h4 style="font-family:${fonts(hf)};font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:${ACC};margin:0 0 20px;">Navigate</h4>
        ${navLinks}
      </div>
      <div>
        <h4 style="font-family:${fonts(hf)};font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:${ACC};margin:0 0 20px;">Connect</h4>
        <a href="#" onclick="navigate('contact');return false;" style="color:${alpha(TEXT,"77")};font-size:13.5px;display:block;padding:4px 0;transition:color .2s ease;">Get In Touch</a>
        <a href="#" onclick="navigate('products');return false;" style="color:${alpha(TEXT,"77")};font-size:13.5px;display:block;padding:4px 0;transition:color .2s ease;">Shop Now</a>
        <a href="#" onclick="navigate('about');return false;" style="color:${alpha(TEXT,"77")};font-size:13.5px;display:block;padding:4px 0;transition:color .2s ease;">Our Story</a>
      </div>
    </div>
    <div style="padding-top:28px;border-top:1px solid ${alpha(TEXT,"12")};display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;font-size:12px;color:${alpha(TEXT,"50")};">
      <span data-editable="text">${esc(copy)}</span>
      <span>Powered by <strong style="color:${PRI};">Storebuilder.ph</strong></span>
    </div>
  </div>
</footer>`;
}

// ─── Router + interactions script ───────────────────────────────

function routerScript(BG: string, PRI: string): string {
  return `<script>
(function(){
  var currentPage = 'home';

  window.navigate = function(id) {
    if (id === currentPage) return;
    var old = document.getElementById('page-' + currentPage);
    var next = document.getElementById('page-' + id);
    if (!next) return;
    if (old) {
      old.style.opacity = '0';
      setTimeout(function(){ old.classList.remove('page-active'); old.style.display='none'; }, 380);
    }
    next.style.display = 'block';
    setTimeout(function(){
      next.style.opacity = '1';
      next.classList.add('page-active');
    }, 10);
    currentPage = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update nav active state
    document.querySelectorAll('[data-nav-page]').forEach(function(a) {
      a.classList.toggle('nav-active', a.getAttribute('data-nav-page') === id);
    });

    // Re-run reveal for new page
    setTimeout(function() { runReveal(); }, 200);
  };

  // Reveal-on-scroll
  function runReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-rc]').forEach(function(el){ el.classList.add('vis'); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('vis');
        el.querySelectorAll('[data-rc]').forEach(function(ch) {
          var d = parseInt(ch.getAttribute('data-reveal-delay') || '0', 10);
          setTimeout(function(){ ch.classList.add('vis'); }, d);
        });
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.page-active [data-reveal]').forEach(function(el){ io.observe(el); });
  }

  // Parallax
  var pEls = [];
  function onScroll() {
    if (!pEls.length) return;
    var sy = window.scrollY;
    pEls.forEach(function(el) {
      var r = el.getBoundingClientRect();
      var off = window.innerHeight/2 - (r.top + r.height/2);
      var str = parseFloat(el.getAttribute('data-parallax') || '.2');
      el.style.transform = 'translate3d(0,' + (off * str * -1).toFixed(1) + 'px,0)';
    });
  }
  window.addEventListener('scroll', function() {
    pEls = Array.from(document.querySelectorAll('.page-active [data-parallax]'));
    onScroll();
  }, { passive: true });

  // Nav shrink
  var nav = document.getElementById('sb-nav');
  window.addEventListener('scroll', function() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  // Contact form
  window.handleContactForm = function(e) {
    e.preventDefault();
    var success = document.getElementById('form-success');
    if (success) { success.style.display = 'block'; }
    e.target.querySelectorAll('input,textarea').forEach(function(f){ f.value=''; });
    setTimeout(function(){ if(success) success.style.display='none'; }, 5000);
  };

  // Product filter
  window.filterCards = function(tag, btn) {
    document.querySelectorAll('[data-filter]').forEach(function(b) {
      var active = b.getAttribute('data-filter') === tag;
      b.style.background = active ? '${PRI}' : 'transparent';
      b.style.color      = active ? '${BG}' : '';
      b.style.borderColor = active ? '${PRI}' : '';
    });
    document.querySelectorAll('#product-grid article').forEach(function(card) {
      var t = card.getAttribute('data-tag') || '';
      card.style.display = (tag === 'all' || t === tag) ? '' : 'none';
    });
  };

  // Initial reveal
  runReveal();
})();
</script>`;
}

// ═══════════════════════════════════════════════════════════════════
// TOP-LEVEL RENDERER
// ═══════════════════════════════════════════════════════════════════

export function renderBlueprintToHtml(bp: SiteBlueprint): string {
  const c    = bp.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const hf   = bp.theme.typography.headingFont;
  const bf   = bp.theme.typography.bodyFont;

  const page: Page | undefined = bp.pages[0];
  if (!page) return `<!doctype html><html><body style="background:${BG};color:${TEXT};font-family:sans-serif;padding:40px;"><p>Empty blueprint.</p></body></html>`;

  const pages    = detectPages(bp);
  const brand    = bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();
  const title    = page.meta?.title || brand;
  const desc     = page.meta?.description || clean(bp.copy?.hero?.subheadline) || "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(hf)}:wght@400;600;700;800;900&family=${encodeURIComponent(bf)}:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
${sharedCss(TEXT, BG, PRI, ACC, hf, bf)}
</style>
</head>
<body>
${renderNav(bp, pages)}
<main style="padding-top:0;">
${renderHomePage(bp)}
${renderProductsPage(bp)}
${renderAboutPage(bp)}
${renderContactPage(bp)}
${renderFooter(bp, pages)}
</main>
${particleScript(PRI)}
${routerScript(BG, PRI)}
</body>
</html>`;
}
