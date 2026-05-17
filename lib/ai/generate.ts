/**
 * Canonical website generator — Native Premium Generator pipeline.
 *
 * Workflow:
 *   1. User submits a prompt.
 *   2. runNativeGenerator() runs the four design skills through Claude:
 *      design-intelligence-engine → premium-asset-pipeline →
 *      style-injection-compiler → universal-component-library.
 *      Claude produces complete, self-contained HTML using the CSS variable
 *      system from globals.css.
 *   3. instrumentForEditor() adds data-editable attributes (sections, text,
 *      images, buttons) so the HtmlEditor can mutate any element in place.
 *
 * Claude IS the designer in this pipeline — guided exclusively by the
 * Website Generator System bundle at lib/ai/native-generator/system/.
 * This file's only job is to call the generator, apply editor instrumentation,
 * and return the standardised result shape that app/api/generate/route.ts expects.
 */

import { Plan } from "@prisma/client";
import * as cheerio from "cheerio";
import { runNativeGenerator } from "./native-generator";

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
 * Minimal compatibility type for the `jsonContent` field on legacy Website
 * rows. New rows store only metadata in jsonContent; the source-of-truth
 * content lives in htmlContent. The only consumers are app/api/contact and
 * app/api/checkout/*, which read settings.contact / settings.payments.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

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

// ─── Editor instrumentation ───────────────────────────────────────────────────
// Adds data-editable attributes to every editable element in the HTML so the
// HtmlEditor bridge can mutate text, images, buttons, and links in place.
// Claude is instructed to add these during generation; this pass is a safety
// net to catch any elements it missed.

function instrumentForEditor(
  html: string,
  brandName: string | null
): { html: string; seoTitle: string; seoDesc: string } {
  const $ = cheerio.load(html);

  // Sections
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
  $("img").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("data-editable")) $el.attr("data-editable", "image");
  });

  // Buttons + anchors
  $("button").each((_, el) => {
    const $el = $(el);
    if (!$el.attr("data-editable")) $el.attr("data-editable", "button");
  });
  $("a").each((_, el) => {
    const $el = $(el);
    if ($el.attr("data-editable")) return;
    const cls = ($el.attr("class") || "").toLowerCase();
    const looksLikeButton = /btn|button|cta|primary|action|book|buy|shop|order/.test(cls);
    $el.attr("data-editable", looksLikeButton ? "button" : "link");
  });

  // Brand name override — ensures the exact user-specified name appears
  // everywhere in the page (nav, headings, title, meta).
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
        if (node.type === "text" && node.data?.includes(detectedBrand)) {
          node.data = node.data.split(detectedBrand).join(brandName);
        }
      });
    }
    $("title").text(brandName);
  }

  const seoTitle = $("title").text().trim();
  const seoDesc  = $('meta[name="description"]').attr("content")?.trim() ?? "";
  return { html: $.html(), seoTitle, seoDesc };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a complete website from a user prompt using the Native Premium
 * Generator. This is the ONLY supported generation path.
 */
export async function generateWebsite(
  userPrompt: string,
  _plan: Plan
): Promise<{ result: GenerationResult; usage: GenerationUsage }> {
  const brandName = extractBrandName(userPrompt);

  // Append explicit brand constraint to the prompt so the generator never
  // invents or changes the name the user specified.
  const enrichedPrompt = brandName
    ? `${userPrompt}\n\nIMPORTANT: The brand name used EVERYWHERE in the website must be exactly: "${brandName}". Do not change, translate, or paraphrase it.`
    : userPrompt;

  // 1. Run the four design skills through Claude
  const { result: generated, usage } = await runNativeGenerator(enrichedPrompt);

  if (!generated.htmlContent || generated.htmlContent.length < 500) {
    throw new Error("The generator returned an unusable result. Please try again.");
  }

  // 2. Add data-editable attributes and apply brand name safety override
  const { html, seoTitle, seoDesc } = instrumentForEditor(
    generated.htmlContent,
    brandName
  );

  // 3. Resolve final name — prefer brand name from prompt, then what the
  //    generator produced, then the first heading in the HTML.
  const $check      = cheerio.load(html);
  const fallbackName =
    $check("h1").first().text().trim() ||
    $check("title").text().trim() ||
    userPrompt.split(/[.,!?\n]/)[0].trim().slice(0, 50);

  const name = (brandName || generated.name || fallbackName).slice(0, 80);
  const type = generated.type || inferWebsiteType(userPrompt);

  return {
    result: {
      htmlContent: html,
      name,
      type,
      seoTitle: (seoTitle || generated.seoTitle || name).slice(0, 70),
      seoDesc:  (seoDesc  || generated.seoDesc  || `${name} — ${userPrompt}`).slice(0, 200),
    },
    usage,
  };
}
