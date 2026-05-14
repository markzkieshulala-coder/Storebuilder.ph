/**
 * Stitch website generation. THIS IS THE ONLY GENERATION PATH.
 *
 *   1. User prompt → Stitch API → full premium website (HTML)
 *   2. All external assets (CSS, images) are downloaded server-side and
 *      embedded as base64 data URIs or inlined <style> blocks so the HTML
 *      is 100% self-contained. This solves CDN URL expiry, CORS, and
 *      referrer-policy blocking that caused blank sections.
 *   3. We instrument the HTML with cheerio to add data-editable attributes
 *      and override the user's brand name.
 *
 * Claude is NOT in this pipeline. Claude's rebuild step was discarding
 * Stitch's premium design, producing generic-looking output, dropping
 * background images, and substituting placeholder URLs. Stitch is the
 * sole designer; this file adds editor metadata only.
 */

import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";
import * as cheerio from "cheerio";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type StitchResult = {
  htmlContent: string;
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
};

export type StitchUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

// ─── Type inference ───────────────────────────────────────────────────────────

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

// ─── Brand name extraction ───────────────────────────────────────────────────

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

// ─── Stitch SDK call ──────────────────────────────────────────────────────────

async function runStitch(userPrompt: string): Promise<string> {
  if (!process.env.STITCH_API_KEY) {
    throw new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
  }
  try {
    const project = await stitch.createProject(`StoreBuilder-${Date.now()}`);
    const screen = await project.generate(userPrompt, "DESKTOP");
    const htmlUrl = await screen.getHtml();
    if (!htmlUrl) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned no design URL.",
        recoverable: true,
      });
    }
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

// ─── Asset embedding — makes the HTML 100% self-contained ────────────────────

const SKIP_DOMAINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.tailwindcss.com",
  "unpkg.com",
  "cdnjs.cloudflare.com",
];
const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB per asset

function shouldSkip(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return SKIP_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return true;
  }
}

async function fetchAsset(url: string): Promise<{ mime: string; b64: string } | null> {
  if (shouldSkip(url)) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_ASSET_BYTES) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_ASSET_BYTES) return null;
    const mime = res.headers.get("content-type")?.split(";")[0].trim() || "application/octet-stream";
    const b64 = Buffer.from(buf).toString("base64");
    return { mime, b64 };
  } catch {
    return null;
  }
}

// Rewrite url() references inside a CSS string, downloading each asset.
async function embedCssUrls(css: string): Promise<string> {
  // Collect all url(...) references
  const urlPattern = /url\(\s*(['"]?)([^'"\)]+)\1\s*\)/g;
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(css)) !== null) {
    const raw = m[2].trim();
    if (raw.startsWith("http") && !shouldSkip(raw)) urls.push(raw);
  }

  // Fetch all in parallel
  const resolved = new Map<string, string>();
  await Promise.all(
    urls.map(async (url) => {
      const asset = await fetchAsset(url);
      if (asset) resolved.set(url, `data:${asset.mime};base64,${asset.b64}`);
    })
  );

  // Replace in CSS
  return css.replace(urlPattern, (match, _q, raw) => {
    const trimmed = raw.trim();
    if (resolved.has(trimmed)) return `url("${resolved.get(trimmed)}")`;
    return match;
  });
}

/**
 * Download all external assets referenced by the HTML and embed them
 * as data URIs. After this call, the returned HTML has ZERO external
 * dependencies (except Google Fonts and major public CDNs we skip).
 */
async function embedExternalAssets(html: string): Promise<string> {
  const $ = cheerio.load(html);

  // ── 1. External CSS → inline <style> block ──────────────────────────────
  const linkEls: Array<{ el: ReturnType<typeof $>[0]; href: string }> = [];
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("http") && !shouldSkip(href)) {
      linkEls.push({ el, href });
    }
  });
  await Promise.all(
    linkEls.map(async ({ el, href }) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
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

  // ── 2. <img src> → data URI ─────────────────────────────────────────────
  const imgEls: Array<{ el: ReturnType<typeof $>[0]; src: string }> = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (src.startsWith("http") && !shouldSkip(src)) imgEls.push({ el, src });
  });
  await Promise.all(
    imgEls.map(async ({ el, src }) => {
      const asset = await fetchAsset(src);
      if (asset) $(el).attr("src", `data:${asset.mime};base64,${asset.b64}`);
    })
  );

  // ── 3. Inline style="background-image: url(...)" attributes ────────────
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

  // ── 4. <style> blocks with url() references ─────────────────────────────
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

// ─── HTML instrumentation (data-editable attrs + brand override) ──────────────

function instrumentStitchHtml(
  html: string,
  brandName: string | null
): {
  html: string;
  seoTitle: string;
  seoDesc: string;
} {
  const $ = cheerio.load(html);

  // ── Inject data-editable attributes ────────────────────────────────────────
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

  $("h1, h2, h3, h4, h5, h6, p, blockquote, li").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("data-editable")) $el.attr("data-editable", "text");
  });

  $("img").each((_, el) => {
    $(el).attr("data-editable", "image");
  });

  $("button").attr("data-editable", "button");
  $("a").each((_, el) => {
    const $el = $(el);
    if ($el.attr("data-editable")) return;
    const cls = ($el.attr("class") || "").toLowerCase();
    const looksLikeButton = /btn|button|cta|primary|action|book|buy|shop|order/.test(cls);
    $el.attr("data-editable", looksLikeButton ? "button" : "link");
  });

  // ── Brand name override ────────────────────────────────────────────────────
  if (brandName) {
    // Detect what Stitch used as the brand name
    const logoText =
      $("nav a, header a").first().text().trim() ||
      $("nav span, header span").first().text().trim() ||
      $("h1").first().text().trim();
    const titleText = $("title").text().trim();
    let detectedBrand = logoText.length < 60 ? logoText : titleText.split(/[|·—–-]/)[0].trim();

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

  const finalTitle = $("title").text().trim();
  const finalDesc = $('meta[name="description"]').attr("content")?.trim() || "";

  return { html: $.html(), seoTitle: finalTitle, seoDesc: finalDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: StitchResult; usage: StitchUsage }> {
  const brandName = extractBrandName(userPrompt);

  // Enrich prompt so Stitch uses the right brand name and real imagery
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

  // Step 1: Stitch generates the full premium website design
  const stitchHtml = await runStitch(enrichedPrompt);

  // Step 2: Download and embed all external assets as data URIs so the HTML
  // is 100% self-contained — CDN URLs won't expire or be CORS-blocked.
  console.log("[stitch-generate] Embedding external assets…");
  const selfContainedHtml = await embedExternalAssets(stitchHtml);

  // Step 3: Add editor metadata (data-editable attrs) and brand name override.
  const { html, seoTitle, seoDesc } = instrumentStitchHtml(selfContainedHtml, brandName);

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
      model: "stitch-direct",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    },
  };
}
