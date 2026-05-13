/**
 * Stitch-only website generation pipeline.
 *
 * Workflow:
 *   1. Pass the user's prompt to Google Stitch as-is
 *   2. Stitch generates the complete designed HTML page
 *   3. Return that HTML unchanged — Stitch IS the design, not a reference
 *
 * We intentionally DO NOT have Claude reinterpret, rewrite, or convert the
 * Stitch output into JSON. Every previous attempt to do so produced lower-
 * fidelity output than Stitch's direct rendering. The renderer embeds the
 * raw Stitch HTML in an iframe, preserving 100% of Stitch's design quality.
 */

import { stitch, StitchError } from "@google/stitch-sdk";
import { Plan } from "@prisma/client";

export type StitchWebsite = {
  name: string;
  type: string;
  seoTitle: string;
  seoDesc: string;
  htmlContent: string;
};

export type StitchUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPhp: number;
};

function inferWebsiteType(prompt: string): string {
  const q = prompt.toLowerCase();
  if (/store|shop|sell|product|merch|e-commerce|ecommerce/.test(q)) return "STORE";
  if (/restaurant|cafe|coffee|food|bistro|diner|eatery|menu/.test(q)) return "RESTAURANT";
  if (/salon|spa|barbershop|nail|beauty|hair/.test(q)) return "SALON";
  if (/portfolio|freelance|designer|photographer|artist|creative/.test(q)) return "PORTFOLIO";
  if (/landing|promo|launch|coming soon/.test(q)) return "LANDING";
  return "BUSINESS";
}

function extractMetadata(html: string, userPrompt: string): {
  name: string;
  seoTitle: string;
  seoDesc: string;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  const h1Match = html.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i);

  const decode = (s: string) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();

  const title = titleMatch?.[1] ? decode(titleMatch[1]) : "";
  const description = descMatch?.[1] ? decode(descMatch[1]) : "";
  const h1 = h1Match?.[1] ? decode(h1Match[1]) : "";

  const fallbackName = userPrompt.split(/[.,!?\n]/)[0].trim().slice(0, 50);
  const name = (h1 || title || fallbackName).slice(0, 80);
  const seoTitle = (title || name).slice(0, 70);
  const seoDesc = (description || `${name} — ${userPrompt}`).slice(0, 200);

  return { name, seoTitle, seoDesc };
}

export async function generateWebsiteWithStitch(
  userPrompt: string,
  _plan: Plan
): Promise<{ website: StitchWebsite; usage: StitchUsage }> {
  if (!process.env.STITCH_API_KEY) {
    throw new StitchError({
      code: "AUTH_FAILED",
      message: "STITCH_API_KEY is not configured.",
      recoverable: false,
    });
  }

  let stitchHtml: string;
  try {
    // Pass the user's prompt to Stitch verbatim. Stitch is the Lead Designer —
    // any prompt augmentation on our side only constrains its output.
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
    stitchHtml = await res.text();

    if (!stitchHtml || stitchHtml.trim().length < 200) {
      throw new StitchError({
        code: "UNKNOWN_ERROR",
        message: "Stitch returned an empty or truncated design.",
        recoverable: true,
      });
    }
  } catch (err: unknown) {
    if (err instanceof StitchError) throw err;
    throw new StitchError({
      code: "UNKNOWN_ERROR",
      message: (err as Error)?.message ?? "Stitch design generation failed.",
      recoverable: true,
    });
  }

  const { name, seoTitle, seoDesc } = extractMetadata(stitchHtml, userPrompt);

  return {
    website: {
      name,
      type: inferWebsiteType(userPrompt),
      seoTitle,
      seoDesc,
      htmlContent: stitchHtml,
    },
    usage: {
      model: "stitch-only",
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      costPhp: 0,
    },
  };
}
