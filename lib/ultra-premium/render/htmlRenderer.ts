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
function darken(c?: string, n = 16, fb = "#ffffff"): string {
  const h = hex(c, fb);
  if (h.length !== 7) return h;
  const ch = (s: string) => Math.max(0, parseInt(s, 16) - n).toString(16).padStart(2, "0");
  return `#${ch(h.slice(1,3))}${ch(h.slice(3,5))}${ch(h.slice(5,7))}`;
}
/** True if the background color is bright (light theme). */
function isLight(c?: string): boolean {
  const h = hex(c, "#0a0a0a");
  if (h.length !== 7) return false;
  const r = parseInt(h.slice(1,3), 16);
  const g = parseInt(h.slice(3,5), 16);
  const b = parseInt(h.slice(5,7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
/** Pick a surface color guaranteed to contrast with background. */
function surfaceFor(c: { background?: string; surface?: string; secondary?: string }): string {
  const bg = hex(c.background, "#0a0a0a");
  if (isLight(bg)) return c.surface ? hex(c.surface) : darken(bg, 8);
  return c.secondary ? lighten(c.secondary, 14) : lighten(bg, 14);
}
/** Strip engine placeholder text. */
function clean(s?: string | null): string {
  if (!s) return "";
  if (/section\s+\d+/i.test(s) || /generated body content/i.test(s)) return "";
  return s.trim();
}

// ─── Image utilities ──────────────────────────────────────────────────────────

// ─── Pollinations image engine ────────────────────────────────────────────────
//
// Pollinations.ai (https://pollinations.ai) generates AI images for free with no
// API key. The `nologo=true` parameter removes their watermark. We also include
// explicit "no text, no words" in every prompt to prevent the AI from rendering
// labels/signs inside the image. Seeds are deterministic so the same product
// always produces the same image (Pollinations caches by prompt+seed).

/**
 * Style modifier injected into every Pollinations prompt so the AI image
 * matches the user's requested aesthetic (minimal / luxury / bold / etc.).
 */
function styleModifier(style?: string): string {
  switch (style) {
    case "minimal":
      return "minimalist composition, lots of negative space, clean white or soft background, single subject, ultra clean, understated, no clutter,";
    case "luxury":
      return "luxury editorial, opulent details, golden hour lighting, high-end magazine cover, premium materials,";
    case "bold":
      return "bold dramatic composition, high contrast, vivid saturated colors, edgy attitude,";
    case "playful":
      return "playful vibrant colorful, energetic composition, fun atmosphere, bright,";
    case "tech":
      return "futuristic high-tech, neon accent lighting, glass and chrome surfaces, sleek modern,";
    default:
      return "cinematic premium,";
  }
}

/**
 * Build a Pollinations URL for a PRODUCT CARD image.
 * The prompt describes the exact product type and niche so the image is
 * relevant to what's actually in the card. Style modifier ensures the
 * rendered image matches the requested aesthetic (minimalist / luxury / etc.).
 */
function productImageUrl(
  productName: string,
  niche: string,
  seed: number,
  w = 800,
  h = 800,
  style?: string
): string {
  const prompt = `${styleModifier(style)} ${buildProductPrompt(productName, niche)}`;
  const s = Math.abs(seed) % 999983;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${s}&width=${w}&height=${h}&model=flux`;
}

/**
 * Build a Pollinations URL for a SECTION / PAGE background image.
 * Role-specific and niche-specific so hero, about, products, contact each
 * pull from distinct visual contexts. Style modifier matches user's request.
 */
function sectionImageUrl(
  niche: string,
  role: string,
  seed: number,
  w = 1600,
  h = 900,
  style?: string
): string {
  const prompt = `${styleModifier(style)} ${buildSectionPrompt(niche, role)}`;
  const s = Math.abs(seed) % 999983;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${s}&width=${w}&height=${h}&model=flux`;
}

/** Picsum — fallback when Pollinations fails (onerror). Always loads. */
function picsumUrl(seed: number, w = 800, h = 800): string {
  const s = Math.abs(seed) % 9_999_997;
  return `https://picsum.photos/seed/sb${s}/${w}/${h}`;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Generate a specific product photography prompt so the AI renders exactly
 * what the product card describes.
 */
function buildProductPrompt(name: string, niche: string): string {
  const n = (name  || "").toLowerCase();
  const base = "professional product photography, clean studio background, cinematic lighting, ultra realistic, 8k, no text, no words, no labels, no watermarks, no logos";

  switch (niche.toLowerCase()) {
    case "basketball":
      if (/shoe|sneaker|jordan|curry|lebron|kobe|kd|tatum|luka|giannis|zoom|kyrie/i.test(n))
        return `premium basketball sneakers floating mid-air on dark gradient background, ${base}`;
      if (/jersey|swingman|lakers|warriors|celtics|bulls|nets|bucks|heat|mavericks|uniform/i.test(n))
        return `basketball jersey laid flat on hardwood floor with dramatic lighting, ${base}`;
      if (/short|pant/i.test(n))
        return `basketball shorts athletic apparel on dark background, ${base}`;
      if (/\bball\b/i.test(n))
        return `basketball on hardwood court with dramatic spotlights and bokeh background, ${base}`;
      return `basketball sports equipment premium display, ${base}`;

    case "food":
    case "restaurant":
      if (/coffee|espresso|latte|cappuccino/i.test(n))
        return `artisan coffee drink in white ceramic cup, steam rising, dark moody cafe background, ${base}`;
      if (/steak|beef|fillet|ribeye/i.test(n))
        return `premium grilled steak on slate plate with garnishes, restaurant fine dining, ${base}`;
      if (/burger|sandwich/i.test(n))
        return `gourmet burger with fresh ingredients stacked tall on dark wooden board, ${base}`;
      if (/seafood|fish|sushi|salmon/i.test(n))
        return `elegant seafood dish beautifully plated on white plate, fine dining, ${base}`;
      if (/pasta|spaghetti|ravioli/i.test(n))
        return `artisan pasta dish with sauce and herbs on dark plate, restaurant style, ${base}`;
      if (/pizza/i.test(n))
        return `artisan pizza with fresh toppings on wooden board, rustic Italian style, ${base}`;
      if (/cake|dessert|pastry/i.test(n))
        return `elegant dessert with chocolate and berries on white plate, patisserie style, ${base}`;
      return `gourmet dish beautifully plated, fine dining restaurant, ${base}`;

    case "barber":
    case "barbershop":
      if (/pomade|wax|clay|gel|product/i.test(n))
        return `premium men's grooming product dark glass jar on marble surface, ${base}`;
      if (/razor|blade/i.test(n))
        return `vintage straight razor on dark leather barbershop surface, ${base}`;
      if (/trim|fade|cut|service/i.test(n))
        return `professional barbershop service close-up with scissors and comb, ${base}`;
      return `premium barbershop grooming product on dark marble, ${base}`;

    case "salon":
    case "beauty":
      if (/nail|manicure/i.test(n))
        return `elegant manicure with luxury nail polish on white background, beauty, ${base}`;
      if (/skin|facial|serum/i.test(n))
        return `luxury skincare serum glass bottle with dropper on white marble, ${base}`;
      if (/hair|shampoo|conditioner/i.test(n))
        return `premium hair care product glass bottle on white background, salon, ${base}`;
      return `luxury beauty product on white marble surface, high-end cosmetics, ${base}`;

    case "watchmaking":
      if (/sport|dive|diver/i.test(n))
        return `luxury sports dive watch on wet black rock surface with water drops, ${base}`;
      if (/chrono|chronograph/i.test(n))
        return `premium chronograph watch on dark carbon fiber surface, macro photography, ${base}`;
      if (/pilot|aviation/i.test(n))
        return `aviation pilot watch on dark leather with instruments background, ${base}`;
      return `luxury mechanical watch on dark velvet surface, macro closeup, ${base}`;

    case "jewelry":
      if (/ring|diamond/i.test(n))
        return `diamond engagement ring on white velvet cushion, jewelry store display, ${base}`;
      if (/necklace|chain/i.test(n))
        return `elegant gold necklace on white marble surface, luxury jewelry, ${base}`;
      if (/bracelet/i.test(n))
        return `luxury diamond bracelet on dark velvet, high-end jewelry display, ${base}`;
      return `luxury jewelry piece on white velvet, premium display, ${base}`;

    case "fashion":
      if (/dress|gown/i.test(n))
        return `elegant luxury dress on minimal white background, fashion photography, ${base}`;
      if (/jacket|coat|blazer/i.test(n))
        return `premium fashion jacket on dark minimal background, high-end menswear, ${base}`;
      if (/shoe|heel|boot/i.test(n))
        return `designer shoe on clean white background, luxury fashion, ${base}`;
      if (/bag|handbag|purse/i.test(n))
        return `luxury leather handbag on white marble, fashion editorial, ${base}`;
      return `luxury fashion apparel on clean minimal background, editorial photography, ${base}`;

    case "coffee":
      return `artisan coffee drink in specialty cafe, latte art, moody lighting, ${base}`;

    case "fitness":
      if (/protein|supplement/i.test(n))
        return `premium fitness supplement container on dark gym floor, ${base}`;
      if (/equipment|weight|dumbbell/i.test(n))
        return `premium fitness equipment on dark gym floor with dramatic lighting, ${base}`;
      return `premium fitness product on dark gym background, athletic, ${base}`;

    default:
      return `premium product display on dark minimal background, professional, ${base}`;
  }
}

/**
 * Build a section/page background prompt tailored to niche × role so
 * hero, about, products, and contact each show a distinct cinematic scene.
 */
function buildSectionPrompt(niche: string, role: string): string {
  const base = "cinematic photography, ultra realistic, 8k, dramatic lighting, no text, no words, no signs, no labels, no watermarks, no logos, wide angle";

  const n = niche.toLowerCase();
  const r = role.toLowerCase();

  switch (n) {
    case "basketball":
      if (r === "hero")     return `NBA basketball arena interior at night with dramatic court lighting and empty seats glowing, ${base}`;
      if (r === "about")    return `basketball team in locker room pre-game motivational moment dramatic lighting, ${base}`;
      if (r === "products") return `premium basketball sneaker store interior with glowing shelves and dark atmosphere, ${base}`;
      if (r === "contact")  return `indoor basketball training facility with dramatic spotlights on empty court, ${base}`;
      if (r === "cta")      return `packed basketball arena crowd celebrating at night with lights and confetti, ${base}`;
      return `basketball court with dramatic spotlights at night, ${base}`;

    case "restaurant":
    case "food":
      if (r === "hero")     return `upscale restaurant interior with warm candlelight and elegant table settings, ${base}`;
      if (r === "about")    return `executive chef in professional kitchen plating gourmet dish with intense concentration, ${base}`;
      if (r === "products") return `beautifully arranged charcuterie and gourmet dishes on dark marble table, ${base}`;
      if (r === "contact")  return `intimate restaurant dining room with warm lighting and white tablecloths, ${base}`;
      return `fine dining restaurant with elegant atmosphere, ${base}`;

    case "barber":
    case "barbershop":
      if (r === "hero")     return `classic vintage barbershop interior with leather chairs mirrors and wood paneling, warm light, ${base}`;
      if (r === "about")    return `master barber doing precise straight razor shave close-up dramatic light, ${base}`;
      if (r === "products") return `premium grooming products arranged on dark marble counter, barbershop aesthetic, ${base}`;
      if (r === "contact")  return `barbershop waiting area with vintage chairs dark wood and warm Edison bulbs, ${base}`;
      return `classic barbershop interior with leather chairs and mirrors, ${base}`;

    case "salon":
    case "beauty":
      if (r === "hero")     return `luxury modern hair salon interior with white and gold decor and dramatic lighting, ${base}`;
      if (r === "about")    return `professional hair stylist team in sleek modern salon, ${base}`;
      if (r === "products") return `luxury beauty and cosmetics products arranged on white marble, ${base}`;
      if (r === "contact")  return `elegant salon reception area with flowers and minimal white decor, ${base}`;
      return `luxury beauty salon modern interior, ${base}`;

    case "watchmaking":
      if (r === "hero")     return `luxury watch store interior with dark wood and soft spotlights on glass display cases, ${base}`;
      if (r === "about")    return `master watchmaker hands working on mechanical watch movement with tools and loupe, ${base}`;
      if (r === "products") return `row of luxury watches displayed on dark velvet in glass case with spotlight, ${base}`;
      if (r === "contact")  return `watch boutique showroom with marble floors and glass display cases, ${base}`;
      return `luxury watch boutique interior with dramatic lighting, ${base}`;

    case "jewelry":
      if (r === "hero")     return `luxury jewelry store interior with diamond displays and crystal chandeliers, ${base}`;
      if (r === "about")    return `master jeweler crafting ring at workbench with magnifying tools, ${base}`;
      if (r === "products") return `luxury jewelry collection displayed on dark velvet with spotlights, ${base}`;
      if (r === "contact")  return `high-end jewelry boutique interior with marble and gold accents, ${base}`;
      return `luxury jewelry boutique with elegant displays, ${base}`;

    case "fashion":
      if (r === "hero")     return `luxury fashion runway show with dramatic lighting and silhouetted models, ${base}`;
      if (r === "about")    return `fashion designer atelier with fabrics patterns and sewing table, ${base}`;
      if (r === "products") return `high-end boutique interior with minimal white walls and clothes on racks, ${base}`;
      if (r === "contact")  return `minimalist luxury fashion boutique entrance with white walls, ${base}`;
      return `luxury fashion editorial environment, ${base}`;

    case "coffee":
      if (r === "hero")     return `cozy specialty coffee shop interior with warm light exposed brick and latte art, ${base}`;
      if (r === "about")    return `barista carefully pouring latte art in artisan coffee shop, ${base}`;
      if (r === "products") return `coffee beans and brewing equipment on dark wooden counter, ${base}`;
      if (r === "contact")  return `coffee shop interior with comfortable seating and warm ambient light, ${base}`;
      return `specialty coffee shop interior with warm lighting, ${base}`;

    case "fitness":
      if (r === "hero")     return `premium gym interior at night with dramatic lighting and rows of equipment, ${base}`;
      if (r === "about")    return `personal trainer coaching client with intense gym lighting, ${base}`;
      if (r === "products") return `fitness equipment and supplements arranged on dark gym floor, ${base}`;
      if (r === "contact")  return `modern gym reception area with sleek design, ${base}`;
      return `premium fitness gym interior with dramatic lighting, ${base}`;

    case "cybersecurity":
      if (r === "hero")     return `server room with glowing blue server racks and dramatic lighting, ${base}`;
      if (r === "about")    return `cybersecurity team in dark office with multiple monitors and code, ${base}`;
      if (r === "products") return `cybersecurity dashboard on monitors with data visualizations, ${base}`;
      if (r === "contact")  return `modern tech office interior with blue ambient lighting, ${base}`;
      return `dark server room with glowing blue racks and data streams, ${base}`;

    default: {
      // Generic premium commercial photography for unknown niches
      const prompts: Record<string, string> = {
        hero:     `modern premium commercial business interior with dramatic lighting, ${base}`,
        about:    `professional team meeting in modern office with large windows, ${base}`,
        products: `premium products displayed on dark minimal background with spotlights, ${base}`,
        contact:  `elegant modern office reception area with warm lighting, ${base}`,
        cta:      `successful business celebration in modern office, ${base}`,
      };
      return prompts[r] || prompts.hero;
    }
  }
}

function bpSeed(bp: SiteBlueprint): number {
  const raw = (bp.seed || "a1b2c3d4").replace(/[^0-9a-f]/gi, "").slice(0, 8) || "1a2b3c4d";
  return parseInt(raw, 16) % 9_999_997;
}

/**
 * Extract the actual brand/business name from the blueprint.
 * Priority: explicit brandName field → footer copyright → prompt quoted phrase.
 */
function brandFromBlueprint(bp: SiteBlueprint): string {
  // 1. Explicit field set by the engine — most reliable source
  if (bp.brandName) return bp.brandName;
  // 2. Footer copyright: "© 2025 BrandName. All rights reserved."
  const copy = bp.copy?.footer?.copyright ?? "";
  const cpMatch = copy.match(/©\s*\d{4}\s+(.+?)\.\s*(?:All rights|Rights)/i);
  if (cpMatch?.[1]) return cpMatch[1].trim();
  // 3. Quoted text in prompt
  const p = bp.prompt ?? "";
  const quoted = p.match(/['""]([^'""]+)['"'"]/);
  if (quoted?.[1]) return quoted[1].trim();
  return "";
}

function getProps(s: Section): Record<string, any> {
  return (s.component?.props ?? {}) as Record<string, any>;
}

function assetUrls(s: Section): string[] {
  return ((s.component?.assetSlots ?? []) as any[]).map((sl: any) => sl?.generatedUrl).filter(Boolean);
}

/** True if a URL is a generic placeholder that should be replaced with a niche-specific image. */
function isAiImage(u: string): boolean {
  // Only block truly generic placeholders — Pollinations is now our primary source.
  return /stable-?diffusion|deepai|leonardo|picsum\.photos/i.test(u);
}

/** Scan every string prop for a usable real-photo URL. */
function extractUrl(obj: Record<string, any>): string {
  const known = ["image","imageSrc","imageUrl","thumbnail","photo","src","cover","poster","artwork","productImage","img","heroImageSrc","heroMediaSrc","mediaSrc","backgroundMedia","backgroundTexture","foregroundProduct","glitchTexture","marqueeTexture","transitionTexture","glassBackground","leftMediaSrc","rightMediaSrc","featuredImage"];
  for (const k of known) {
    const v = obj[k];
    if (typeof v === "string" && v.startsWith("http") && !isAiImage(v)) return v;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && !isAiImage(v) && /^https?:\/\/.+\.(jpg|jpeg|png|webp|avif)/i.test(v)) return v;
  }
  return "";
}

function getItemImage(item: any, bp: SiteBlueprint, idx: number): string {
  const found = extractUrl(item);
  if (found) return found;
  const name = String(item.title || item.name || "");
  const hash = name.split("").reduce(
    (h, c) => (((h << 5) - h) + c.charCodeAt(0)) | 0,
    (idx + 1) * 7919
  );
  return productImageUrl(name, bp.niche, hash, 800, 800, bp.themeStyle);
}


function detectRole(context: string): string {
  const c = context.toLowerCase();
  if (/hero|cinematic|action|opening|landing/.test(c))            return "hero";
  if (/about|story|heritage|lifestyle|brand|documentary/.test(c)) return "about";
  if (/product|showcase|collection|catalog|grid/.test(c))         return "products";
  if (/contact|location|exterior|interior|ambiance/.test(c))      return "contact";
  if (/cta|call\s+to\s+action|conversion/.test(c))                return "cta";
  return "hero";
}

function getSectionBg(s: Section, bp: SiteBlueprint, idx: number, hint = ""): string {
  const p = getProps(s);
  const found = extractUrl(p);
  if (found) return found;
  const slot = assetUrls(s).find((u) => !isAiImage(u));
  if (slot) return slot;
  const ctx  = hint || s.name || "";
  const role = detectRole(ctx);
  const hash = (ctx + s.name + s.id).split("").reduce(
    (h, c) => (((h << 5) - h) + c.charCodeAt(0)) | 0,
    (idx + 1) * 6151
  );
  return sectionImageUrl(bp.niche, role, Math.abs(hash) + bpSeed(bp), 1600, 900, bp.themeStyle);
}

function getPageBg(bp: SiteBlueprint, context: string, offset: number): string {
  const role = detectRole(context);
  const hash = context.split("").reduce(
    (h, c) => (((h << 5) - h) + c.charCodeAt(0)) | 0,
    (offset + 1) * 8893
  );
  return sectionImageUrl(bp.niche, role, Math.abs(hash) + bpSeed(bp), 1920, 1080, bp.themeStyle);
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

function sharedCss(TEXT: string, BG: string, PRI: string, ACC: string, hf: string, bf: string, style?: string): string {
  // Style-specific overrides applied at the end of the stylesheet so they win
  // the cascade. "minimal" strips decorative effects (blobs, particles, heavy
  // shadows) to actually deliver a minimalist look when the user asks for one.
  const styleOverrides =
    style === "minimal" ? `
/* Minimalist style overrides */
.blob{display:none !important}
#sb-canvas{display:none !important}
.card-3d:hover{transform:translateY(-4px) !important;box-shadow:0 16px 40px ${alpha(TEXT,"14")} !important}
.card-3d::after{display:none !important}
.btn-pri{box-shadow:none !important;border-radius:2px !important;font-weight:600 !important;letter-spacing:.08em !important}
.btn-pri:hover{box-shadow:0 4px 16px ${alpha(PRI,"33")} !important;transform:none !important}
.btn-sec{border-radius:2px !important;font-weight:600 !important;letter-spacing:.08em !important}
.img-wrap::after{display:none !important}
.img-wrap img{filter:none !important}
h1,h2,h3{letter-spacing:-.01em !important;text-transform:none !important}
` :
    style === "luxury" ? `
/* Luxury style overrides */
h1,h2{letter-spacing:-.02em !important}
.btn-pri{border-radius:0 !important;letter-spacing:.24em !important;text-transform:uppercase !important}
.btn-sec{border-radius:0 !important;letter-spacing:.24em !important;text-transform:uppercase !important}
.card-3d{border-radius:0 !important}
` :
    style === "bold" ? `
/* Bold style overrides */
h1,h2,h3{font-weight:900 !important;letter-spacing:-.04em !important;text-transform:uppercase !important}
.btn-pri{box-shadow:0 0 0 4px ${alpha(BG,"00")},0 0 0 6px ${PRI} !important;background:${BG} !important;color:${PRI} !important}
` :
    style === "tech" ? `
/* Tech style overrides */
body{font-family:'Inter','SF Mono','JetBrains Mono',monospace}
.btn-pri{border-radius:4px !important;font-family:'JetBrains Mono',monospace !important}
` : "";

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

/* Card 3D tilt — true perspective depth, cinematic shadow stacking */
.card-3d{transform-style:preserve-3d;perspective:1200px;transition:transform .55s cubic-bezier(.16,1,.3,1),box-shadow .55s ease,border-color .4s ease;will-change:transform}
.card-3d::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,${alpha(PRI,"00")} 0%,${alpha(PRI,"00")} 60%,${alpha(PRI,"22")} 100%);opacity:0;transition:opacity .5s ease;pointer-events:none;z-index:4}
.card-3d:hover{transform:perspective(1200px) rotateX(6deg) rotateY(-7deg) translateY(-14px) scale(1.015) !important;box-shadow:0 50px 110px ${alpha(BG,"ee")},0 22px 40px ${alpha(PRI,"33")},0 0 0 1px ${alpha(PRI,"55")} !important}
.card-3d:hover::after{opacity:1}
.card-3d:hover img.card-img{transform:scale(1.09);filter:saturate(1.15) contrast(1.05)}
.card-3d img.card-img{transition:transform .8s cubic-bezier(.16,1,.3,1),filter .5s ease}

/* Image shimmer placeholder + cinematic finish */
.img-wrap{background:linear-gradient(135deg,${isLight(BG) ? darken(BG, 10) : lighten(BG, 20)},${isLight(BG) ? darken(BG, 4) : lighten(BG, 8)});overflow:hidden;position:relative}
.img-wrap::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,${isLight(BG) ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.07)"} 50%,transparent 100%);background-size:200% 100%;animation:shimmer 1.6s infinite linear;z-index:1;pointer-events:none}
.img-wrap.img-loaded::before{display:none}
/* Vignette ring tightens focus on subject and gives a film-grade feel */
.img-wrap::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 55%,${alpha(BG,"55")} 100%);pointer-events:none;z-index:3;opacity:.85}
.img-wrap img{width:100%;height:100%;object-fit:cover;opacity:1;transition:opacity .4s ease,transform .8s cubic-bezier(.16,1,.3,1),filter .5s ease;position:relative;z-index:2;filter:saturate(1.08) contrast(1.04)}
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
@media(max-width:720px){
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
${styleOverrides}
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

let _fbCtr = 0;
function imgWrap(src: string, alt: string, style = "", cls = ""): string {
  const seed = (++_fbCtr) * 7919 % 9_999_991;
  // Fallback: if Pollinations is slow/down, Picsum always loads instantly.
  const fb = picsumUrl(seed, 800, 800);
  return `<div class="img-wrap ${cls}" style="${style}">
    <img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"
      onload="this.classList.add('loaded');var p=this.parentElement;if(p)p.classList.add('img-loaded')"
      onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${fb}';}else{var p=this.parentElement;if(p)p.classList.add('img-loaded');this.style.display='none';}"
      class="card-img"
      style="min-height:100%;min-width:100%"
    />
  </div>`;
}

// ─── Particle canvas script ───────────────────────────────────────────────────

function particleScript(PRI: string, light: boolean): string {
  const dot  = light ? "0,0,0"       : "255,255,255";
  const line = light ? "0,0,0"       : "255,255,255";
  const dotA = light ? ".22"         : ".5";
  const lnA  = light ? ".08"         : ".12";
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
      ctx.fillStyle='rgba(${dot},${dotA})';ctx.fill();
      for(var j=i+1;j<pts.length;j++){
        var q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<130){
          ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle='rgba(${line},'+(${lnA}*(1-d/130)).toFixed(3)+')';
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
  const SURF   = surfaceFor(c);
  const BORDER = isLight(BG) ? alpha(c.textPrimary, "14") : alpha(TEXT, "12");
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
  style="background:${SURF};border:1px solid ${BORDER};border-radius:20px;overflow:hidden;cursor:pointer;position:relative;${isLight(BG) ? "box-shadow:0 4px 20px rgba(0,0,0,.05);" : ""}">
  <div style="position:relative;aspect-ratio:1/1;overflow:hidden;">
    ${imgWrap(img, name, "position:absolute;inset:0;width:100%;height:100%;", "")}
    <div style="position:absolute;bottom:0;left:0;right:0;z-index:3;padding:14px 16px;background:linear-gradient(0deg,${alpha(BG,"ee")} 0%,transparent 100%);pointer-events:none;">
      <span style="font-family:${fonts(hf)};font-size:13px;font-weight:700;color:${TEXT};letter-spacing:.04em;text-shadow:0 1px 4px rgba(0,0,0,.7);">${name}</span>
    </div>
  </div>
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
    <canvas id="sb-canvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:1;opacity:${isLight(BG) ? ".4" : ".5"};"></canvas>
    ${imgWrap(heroImg, heading, `position:absolute;inset:-8% -4%;width:110%;height:116%;z-index:2;opacity:${isLight(BG) ? ".7" : ".48"};filter:saturate(1.12) contrast(1.07);`, "")}
    <div style="position:absolute;inset:0;z-index:3;background:linear-gradient(160deg,${alpha(BG, isLight(BG) ? "aa" : "cc")} 0%,${alpha(BG, isLight(BG) ? "33" : "55")} 50%,${alpha(BG, isLight(BG) ? "99" : "bb")} 100%);"></div>
    <div style="position:absolute;top:0;left:0;right:0;height:220px;z-index:4;background:linear-gradient(180deg,${alpha(BG, isLight(BG) ? "dd" : "ee")} 0%,transparent 100%);pointer-events:none;"></div>
    ${blobs(PRI, ACC)}
    <div style="position:relative;z-index:10;text-align:center;max-width:1120px;padding:120px 28px 60px;">
      <div data-rc data-reveal-delay="0">${badge(heroSection || {} as any, badgeText, ACC)}</div>
      <h1 data-editable="text" data-rc data-reveal-delay="80"
        style="font-family:${fonts(hf)};font-size:clamp(44px,9vw,112px);font-weight:900;
          line-height:.92;letter-spacing:-.03em;margin:24px 0;color:${TEXT};text-transform:uppercase;
          ${isLight(BG) ? "" : `text-shadow:0 2px 60px ${alpha(BG,"99")};`}">
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
    ${imgWrap(bgImg, pageHead, `position:absolute;inset:0;width:100%;height:100%;opacity:${isLight(BG) ? ".65" : ".4"};filter:saturate(1.1);`, "")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,${alpha(BG, isLight(BG) ? "22" : "44")} 0%,${alpha(BG, isLight(BG) ? "dd" : "ee")} 100%);"></div>
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
  const brand     = brandFromBlueprint(bp) || bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche;
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
    ${imgWrap(bgImg, brand, `position:absolute;inset:0;width:100%;height:100%;opacity:${isLight(BG) ? ".7" : ".5"};filter:saturate(1.1);`, "")}
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${alpha(BG, isLight(BG) ? "bb" : "dd")} 0%,${alpha(BG, isLight(BG) ? "33" : "66")} 60%,${alpha(BG, isLight(BG) ? "aa" : "cc")} 100%);"></div>
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
  const brand = brandFromBlueprint(bp) || bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche;

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
    ${imgWrap(bgImg, "Contact", `position:absolute;inset:0;width:100%;height:100%;opacity:${isLight(BG) ? ".7" : ".44"};filter:saturate(1.1);`, "")}
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${alpha(BG, isLight(BG) ? "cc" : "ee")} 0%,${alpha(BG, isLight(BG) ? "44" : "77")} 60%,${alpha(BG, isLight(BG) ? "aa" : "cc")} 100%);"></div>
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
  const brand = brandFromBlueprint(bp) || bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();

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
  const brand = brandFromBlueprint(bp) || bp.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bp.niche.toUpperCase();
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

export function renderBlueprintToHtml(bp: SiteBlueprint, overrideBrandName?: string): string {
  // Inject correct brand name into blueprint so every sub-renderer reads it
  // without needing to parse copyright/prompt text. Handles both old blueprints
  // (no brandName field) and new ones where an external override is provided.
  const bpR: SiteBlueprint = overrideBrandName
    ? { ...bp, brandName: overrideBrandName }
    : bp;

  const c    = bpR.theme.colors;
  const TEXT = hex(c.textPrimary);
  const BG   = hex(c.background, "#0a0a0a");
  const PRI  = hex(c.primary, "#ff4d00");
  const ACC  = hex(c.accent || c.primary, PRI);
  const hf   = bpR.theme.typography.headingFont;
  const bf   = bpR.theme.typography.bodyFont;

  const page: Page | undefined = bpR.pages[0];
  if (!page) return `<!doctype html><html><body style="background:${BG};color:${TEXT};font-family:sans-serif;padding:40px;"><p>Empty blueprint.</p></body></html>`;

  const pages    = detectPages(bpR);
  const brand    = brandFromBlueprint(bpR) || bpR.copy?.hero?.headline?.split(/[,\-—]/)[0]?.trim() || bpR.niche.toUpperCase();
  const title    = brand || page.meta?.title || bpR.niche;
  const desc     = page.meta?.description || clean(bpR.copy?.hero?.subheadline) || "";

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
${sharedCss(TEXT, BG, PRI, ACC, hf, bf, bpR.themeStyle)}
</style>
</head>
<body>
${renderNav(bpR, pages)}
<main style="padding-top:0;">
${renderHomePage(bpR)}
${renderProductsPage(bpR)}
${renderAboutPage(bpR)}
${renderContactPage(bpR)}
${renderFooter(bpR, pages)}
</main>
${particleScript(PRI, isLight(BG))}
${routerScript(BG, PRI)}
</body>
</html>`;
}
