/**
 * Stitch website generation. THIS IS THE ONLY GENERATION PATH.
 *
 *   1. User prompt → Stitch API → full premium website (HTML)
 *   2. The FULL, UNMODIFIED Stitch HTML is kept as-is so the design,
 *      imagery, colours, fonts, layout, and copy stay 100% faithful
 *      to what Stitch produced.
 *   3. We instrument the HTML server-side with cheerio to:
 *        • inject data-editable attributes for the editor
 *        • add a no-referrer meta so Stitch CDN assets load cross-origin
 *        • override the brand name with the user's explicitly-specified
 *          brand name (so "Brand name: Foo" in the prompt always wins)
 *
 * Claude is NOT in this pipeline. Claude's rebuild step was discarding
 * Stitch's premium design, producing generic-looking output, dropping
 * background images, and substituting placeholder URLs.  Stitch is the
 * sole designer; this file just adds editor metadata.
 */

import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";
import * as cheerio from "cheerio";

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

// ─── HTML instrumentation (no LLM, no rewrite) ────────────────────────────────

/**
 * Walk Stitch's HTML and add the metadata the editor needs.
 * Does NOT change colours, layout, copy, or imagery.
 */
function instrumentStitchHtml(
  html: string,
  brandName: string | null
): {
  html: string;
  detectedBrandName: string;
  seoTitle: string;
  seoDesc: string;
} {
  const $ = cheerio.load(html);

  // ── Add a no-referrer meta so Stitch CDN images load cross-origin ──────────
  if ($('meta[name="referrer"]').length === 0) {
    $("head").prepend('<meta name="referrer" content="no-referrer">');
  }
  // Ensure responsive viewport tag exists
  if ($('meta[name="viewport"]').length === 0) {
    $("head").prepend('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }

  // ── Inject data-editable attributes ────────────────────────────────────────
  // Sections: every top-level visible block becomes editor-aware
  let sectionIndex = 0;
  const sectionSelector = "body > nav, body > header, body > section, body > main > section, body > main > div, body > div, body > footer, main > section, main > nav, main > header, main > footer";
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

  // Text: headings, paragraphs, list items, blockquotes
  $("h1, h2, h3, h4, h5, h6, p, blockquote, li").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("data-editable")) $el.attr("data-editable", "text");
  });

  // Images
  $("img").each((_, el) => {
    const $el = $(el);
    $el.attr("data-editable", "image");
    if (!$el.attr("loading")) $el.attr("loading", "lazy");
    if (!$el.attr("referrerpolicy")) $el.attr("referrerpolicy", "no-referrer");
  });

  // Buttons + CTA-styled anchors
  $("button").attr("data-editable", "button");
  $("a").each((_, el) => {
    const $el = $(el);
    if ($el.attr("data-editable")) return;
    const cls = ($el.attr("class") || "").toLowerCase();
    const looksLikeButton =
      /btn|button|cta|primary|action|book|buy|shop|order/.test(cls) ||
      $el.find("button").length > 0;
    $el.attr("data-editable", looksLikeButton ? "button" : "link");
  });

  // ── Brand name override ────────────────────────────────────────────────────
  // Detect the brand Stitch used so we can replace it everywhere with the
  // user's explicitly specified brand.
  let detectedBrand = "";
  const titleText = $("title").text().trim();
  const logoText =
    $("nav a, header a").first().text().trim() ||
    $("nav span, header span").first().text().trim() ||
    $("nav h1, header h1, nav h2, header h2").first().text().trim() ||
    $("h1").first().text().trim();

  // Use the shorter of (title, logo) — the logo is usually just the brand;
  // the title often includes a tagline.  Falling back to title is fine.
  if (logoText && logoText.length < 40) detectedBrand = logoText;
  else if (titleText) detectedBrand = titleText.split(/[|·—–-]/)[0].trim();

  if (brandName && detectedBrand && detectedBrand !== brandName) {
    // Replace inside text nodes only — never touch attribute values.
    $("*").contents().each(function () {
      const node = this as { type?: string; data?: string };
      if (node.type === "text" && node.data && node.data.indexOf(detectedBrand) !== -1) {
        node.data = node.data.split(detectedBrand).join(brandName);
      }
    });
    $("title").text(brandName);
  } else if (brandName && !detectedBrand) {
    if ($("title").length === 0) $("head").append(`<title>${brandName}</title>`);
    else $("title").text(brandName);
  }

  // ── Extract SEO metadata from the (possibly brand-replaced) HTML ───────────
  const finalTitle = $("title").text().trim();
  const finalDesc = $('meta[name="description"]').attr("content")?.trim() || "";

  return {
    html: $.html(),
    detectedBrandName: detectedBrand,
    seoTitle: brandName || finalTitle,
    seoDesc: finalDesc,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: StitchResult; usage: StitchUsage }> {
  const brandName = extractBrandName(userPrompt);

  // Enrich the Stitch prompt so Stitch tries to honour the user's brand name
  // and uses real, niche-appropriate imagery from the start.
  const enrichedPrompt = brandName
    ? `${userPrompt}\n\nMandatory requirements:\n- The brand name throughout the entire website is exactly: "${brandName}". Do not invent or substitute any other brand name.\n- Use realistic, high-quality imagery that fits the business niche described above.\n- Every section must have real visuals (no blank backgrounds).\n- The design must look like a real, professional production website.`
    : `${userPrompt}\n\nMandatory requirements:\n- Use realistic, high-quality imagery that fits the business niche.\n- Every section must have real visuals (no blank backgrounds).\n- The design must look like a real, professional production website.`;

  const stitchHtml = await runStitch(enrichedPrompt);

  const { html, seoTitle, seoDesc } = instrumentStitchHtml(stitchHtml, brandName);

  if (!html || html.length < 500) {
    throw new Error("Stitch returned an unusable design. Please try again.");
  }

  // Site name: user's brand name wins; otherwise pull from title / first H1.
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
