/**
 * Canonical website generator — Stitch-only pipeline.
 *
 * Workflow (NEW — fully replaces the previous Claude-based generation):
 *   1. User submits a prompt.
 *   2. Google Stitch generates the FULL visual website design (layouts,
 *      images, branding, typography, UI/UX, section structure).
 *   3. We download and embed every external asset (CSS, images, fonts)
 *      as base64 data URIs so the HTML is 100% self-contained and never
 *      depends on Stitch's CDN — no expiry, no CORS, no blank sections.
 *   4. We instrument the HTML with `data-editable` attributes so the
 *      editor can mutate any text/image/link/button in place. The design
 *      itself is left untouched.
 *   5. The user's explicitly-specified brand name (if any) overrides
 *      whatever Stitch invented, everywhere in the HTML.
 *
 * Claude is NOT a designer in this pipeline. It does not generate, rewrite,
 * or "rebuild" the website. Stitch is the sole designer. This file's only
 * job is to make Stitch's output (a) self-contained and (b) editable.
 *
 * There is NO fallback, NO mock mode, and NO legacy JSON-section path.
 */

import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";
import * as cheerio from "cheerio";

// ─── Public types ─────────────────────────────────────────────────────────────

export type GenerationResult = {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
};

export type GenerationUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

/**
 * Minimal compatibility type for the `jsonContent` field of legacy Website
 * rows that pre-date the Stitch pipeline. New rows store only metadata in
 * `jsonContent` ({ stitchGenerated: true, version: 2, name, type, seoTitle,
 * seoDesc, settings? }); the source-of-truth content lives in `htmlContent`.
 *
 * The only consumers that still read this type are `app/api/contact` and
 * `app/api/checkout/*`, which look up `settings.contact` / `settings.payments`
 * and may iterate over legacy `sections` for backward compatibility.
 */
export type GeneratedWebsite = {
  name?: string;
  type?: string;
  seoTitle?: string;
  seoDesc?: string;
  subdomain?: string | null;
  sections?: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  settings?: {
    payments?: {
      gcash?: boolean;
      paymaya?: boolean;
      creditCard?: boolean;
      cod?: boolean;
      bankTransfer?: boolean;
      grabpay?: boolean;
    };
    contact?: { phone?: string; email?: string; address?: string };
  };
};

// ─── Niche → website type inference ──────────────────────────────────────────

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

// ─── Brand name extraction ────────────────────────────────────────────────────

function extractBrandName(prompt: string): string | null {
  const patterns = [
    /brand\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /brand\s+name\s+is\s+(.+?)(?:\n|\.|,|$)/i,
    /brand\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /store\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /business\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /company\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /shop\s+name\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /called\s+"(.+?)"/i,
    /called\s+'(.+?)'/i,
    /named\s+"(.+?)"/i,
    /named\s+'(.+?)'/i,
  ];
  for (const pat of patterns) {
    const m = prompt.match(pat);
    if (m?.[1]) return m[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
}

// ─── Step 1: Stitch design generation ────────────────────────────────────────

async function runStitch(userPrompt: string): Promise<string> {
  if (!process.env.STITCH_API_KEY) {
    throw new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
  }
  try {
    console.log("[generate] Stitch: creating project…");
    const project = await stitch.createProject(`StoreBuilder-${Date.now()}`);
    console.log("[generate] Stitch: generating screen from text…");
    const screen = await project.generate(userPrompt, "DESKTOP");
    const htmlUrl = await screen.getHtml();
    if (!htmlUrl) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned no design URL.",
        recoverable: true,
      });
    }
    console.log("[generate] Stitch: fetching HTML from CDN…");
    const res = await fetch(htmlUrl);
    if (!res.ok) {
      throw new StitchError({
        code: "NETWORK_ERROR",
        message: `Could not download Stitch design (${res.status} ${res.statusText}).`,
        recoverable: true,
      });
    }
    const html = await res.text();
    if (!html || html.trim().length < 200) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned an empty or truncated design.",
        recoverable: true,
      });
    }
    console.log(`[generate] Stitch: received ${html.length} bytes of HTML.`);
    return html;
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "UNKNOWN_ERROR",
      message: (err as Error)?.message ?? "Stitch design generation failed.",
      recoverable: true,
    });
  }
}

// ─── Step 2: Embed every external asset as a data URI ────────────────────────
// After this step the HTML is 100% self-contained — no CDN dependencies.

const SKIP_DOMAINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.tailwindcss.com",
  "unpkg.com",
  "cdnjs.cloudflare.com",
];
const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB per asset
const ASSET_TIMEOUT_MS = 12000;

function shouldSkipUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SKIP_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return true;
  }
}

async function fetchAsset(url: string): Promise<{ mime: string; b64: string } | null> {
  if (shouldSkipUrl(url)) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ASSET_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const lenHeader = Number(res.headers.get("content-length") || 0);
    if (lenHeader > MAX_ASSET_BYTES) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_ASSET_BYTES) return null;
    const mime =
      res.headers.get("content-type")?.split(";")[0].trim() ||
      "application/octet-stream";
    const b64 = Buffer.from(buf).toString("base64");
    return { mime, b64 };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

async function embedCssUrls(css: string): Promise<string> {
  const urlPattern = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g;
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(css)) !== null) {
    const raw = m[2].trim();
    if (raw.startsWith("http") && !shouldSkipUrl(raw)) urls.push(raw);
  }
  const resolved = new Map<string, string>();
  await Promise.all(
    urls.map(async (url) => {
      const asset = await fetchAsset(url);
      if (asset) resolved.set(url, `data:${asset.mime};base64,${asset.b64}`);
    })
  );
  return css.replace(urlPattern, (match, _q, raw) => {
    const trimmed = raw.trim();
    if (resolved.has(trimmed)) return `url("${resolved.get(trimmed)}")`;
    return match;
  });
}

async function embedExternalAssets(html: string): Promise<string> {
  const $ = cheerio.load(html);

  // 1. External CSS → inline <style> block (with embedded url() references)
  const linkEls: Array<{ el: ReturnType<typeof $>[0]; href: string }> = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("http") && !shouldSkipUrl(href)) linkEls.push({ el, href });
  });
  await Promise.all(
    linkEls.map(async ({ el, href }) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ASSET_TIMEOUT_MS);
      try {
        const res = await fetch(href, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) return;
        let css = await res.text();
        css = await embedCssUrls(css);
        $(el).replaceWith(`<style>${css}</style>`);
      } catch {
        clearTimeout(timer);
      }
    })
  );

  // 2. <img src="http..."> → data URI
  const imgEls: Array<{ el: ReturnType<typeof $>[0]; src: string }> = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("http") && !shouldSkipUrl(src)) imgEls.push({ el, src });
  });
  await Promise.all(
    imgEls.map(async ({ el, src }) => {
      const asset = await fetchAsset(src);
      if (asset) $(el).attr("src", `data:${asset.mime};base64,${asset.b64}`);
    })
  );

  // 3. Inline style="background-image:url(http...)"
  const inlineEls: Array<{ el: ReturnType<typeof $>[0]; style: string }> = [];
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    if (/url\s*\(\s*['"]?http/.test(style)) inlineEls.push({ el, style });
  });
  await Promise.all(
    inlineEls.map(async ({ el, style }) => {
      const embedded = await embedCssUrls(style);
      $(el).attr("style", embedded);
    })
  );

  // 4. <style> blocks with url() references
  const styleEls: ReturnType<typeof $>[] = [];
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    if (/url\s*\(\s*['"]?http/.test(css)) styleEls.push($(el));
  });
  await Promise.all(
    styleEls.map(async ($el) => {
      const embedded = await embedCssUrls($el.html() || "");
      $el.html(embedded);
    })
  );

  return $.html();
}

// ─── Step 3: Editor instrumentation + brand override ─────────────────────────

function instrumentForEditor(
  html: string,
  brandName: string | null
): { html: string; seoTitle: string; seoDesc: string } {
  const $ = cheerio.load(html);

  // Tag sections so the HtmlEditor can list + reorder them
  let sectionIndex = 0;
  const sectionSelector =
    "body > nav, body > header, body > section, body > main > section, " +
    "body > main > div, body > div, body > footer, " +
    "main > section, main > nav, main > header, main > footer";

  $(sectionSelector).each((_, el) => {
    const $el = $(el);
    if ($el.attr("data-editable")) return;
    $el.attr("data-editable", "section");
    $el.attr("data-section-index", String(sectionIndex++));
    if (!$el.attr("id")) {
      const tag = (el as { tagName?: string }).tagName?.toLowerCase() || "section";
      $el.attr("id", `${tag}-${sectionIndex}`);
    }
  });

  // Text nodes
  $("h1, h2, h3, h4, h5, h6, p, blockquote, li").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("data-editable")) $el.attr("data-editable", "text");
  });

  // Images
  $("img").attr("data-editable", "image");

  // Buttons + anchors
  $("button").attr("data-editable", "button");
  $("a").each((_, el) => {
    const $el = $(el);
    if ($el.attr("data-editable")) return;
    const cls = ($el.attr("class") || "").toLowerCase();
    const looksLikeButton = /btn|button|cta|primary|action|book|buy|shop|order/.test(cls);
    $el.attr("data-editable", looksLikeButton ? "button" : "link");
  });

  // Brand name override — replaces every occurrence of Stitch's invented brand
  // with the user's explicitly-specified brand name.
  if (brandName) {
    const logoText =
      $("nav a, header a").first().text().trim() ||
      $("nav span, header span").first().text().trim() ||
      $("h1").first().text().trim();
    const titleText = $("title").text().trim();
    const detectedBrand =
      logoText && logoText.length < 60
        ? logoText
        : titleText.split(/[|·—–-]/)[0].trim();

    if (detectedBrand && detectedBrand !== brandName) {
      $("*").contents().each(function () {
        const node = this as { type?: string; data?: string };
        if (node.type === "text" && node.data && node.data.indexOf(detectedBrand) !== -1) {
          node.data = node.data.split(detectedBrand).join(brandName);
        }
      });
    }
    $("title").text(brandName);
  }

  const seoTitle = $("title").text().trim();
  const seoDesc = $('meta[name="description"]').attr("content")?.trim() || "";
  return { html: $.html(), seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a complete website from a user prompt using Google Stitch.
 * This is the ONLY supported generation path. No legacy fallback exists.
 */
export async function generateWebsite(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: GenerationResult; usage: GenerationUsage }> {
  const brandName = extractBrandName(userPrompt);

  const enrichedPrompt = [
    userPrompt,
    "",
    "Design requirements:",
    "- Use realistic, high-quality imagery that fits the exact business niche described above.",
    "- Every section must have real visuals — no blank backgrounds, no empty sections.",
    "- The design must look like a real, professional production website.",
    brandName
      ? `- The brand name used EVERYWHERE in the design must be exactly: "${brandName}". Do not invent or substitute any other name.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 1. Stitch generates the full premium website
  const stitchHtml = await runStitch(enrichedPrompt);

  // 2. Embed every external asset as a data URI (self-contained HTML)
  console.log("[generate] Embedding external assets…");
  const selfContainedHtml = await embedExternalAssets(stitchHtml);

  // 3. Add editor metadata and apply brand name override
  const { html, seoTitle, seoDesc } = instrumentForEditor(selfContainedHtml, brandName);

  if (!html || html.length < 500) {
    throw new Error("Stitch returned an unusable design. Please try again.");
  }

  const $check = cheerio.load(html);
  const fallbackName =
    $check("h1").first().text().trim() ||
    $check("title").text().trim() ||
    userPrompt.split(/[.,!?\n]/)[0].trim().slice(0, 50);
  const name = (brandName || fallbackName).slice(0, 80);
  const type = inferWebsiteType(userPrompt);

  return {
    result: {
      htmlContent: html,
      name,
      type,
      seoTitle: (seoTitle || name).slice(0, 70),
      seoDesc: (seoDesc || `${name} — ${userPrompt}`).slice(0, 200),
    },
    usage: {
      model: "stitch",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    },
  };
}
