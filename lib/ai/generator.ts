// ---------------------------------------------------------------------------
// SITE GENERATOR — turns a user prompt directly into a complete, prompt-specific
// website using the configured AI engine.
//
// There are NO templates, no fixed section list, no copy banks, and no RNG. The
// AI engine reads the prompt and writes the ENTIRE self-contained HTML document:
// the structure, sections, pages, copy, CTAs and buttons are exactly what the
// prompt asks for and nothing it doesn't. Strict adherence (including honouring
// "no X" exclusions) and an ultra-premium modern 3D aesthetic are enforced
// through the system prompt. We then parse the returned document (brand, niche,
// in-page nav) with cheerio — purely to fill the result metadata, never to alter
// the AI's markup.
// ---------------------------------------------------------------------------

import * as cheerio from 'cheerio';
import { callChatModel, type ChatMessage } from './client';

const SYSTEM_PROMPT = `You are an elite, award-winning web designer and front-end engineer. You turn a single client brief into ONE complete, production-ready website, delivered as a single self-contained HTML document.

# YOUR PRIME DIRECTIVE: STRICT PROMPT ADHERENCE
The website must reflect the user's brief EXACTLY. You are not a template engine and you must never behave like one.
1. Build ONLY the sections, pages, content, CTAs, and buttons the brief asks for or that are genuinely essential to the described business. Never pad the site with sections, features, stats, testimonials, FAQs, pricing, or copy the brief does not motivate.
2. If the brief says NOT to include something ("no FAQ", "no testimonials", "without pricing", "don't add a contact form"), you MUST NOT include it in any form.
3. Use the user's own words. If they gave product names, services, prices, taglines, button labels, or section copy, use them verbatim. Where you must write supporting copy, make it concrete and specific to THIS exact business — never generic filler like "We are the best in the industry".
4. Every button and CTA must be an action the brief motivates (e.g. "Order Now", "Book a Table", "Get a Quote", "Add to Cart"). Use the user's exact button text when given. Do not invent links to pages that don't exist.
5. Never fabricate facts, statistics, prices, addresses, phone numbers, quotes, or team members that the user did not provide. If a contact detail is needed but absent, use a clearly neutral placeholder action (e.g. a mailto: with a generic address) rather than inventing real-looking data.
6. Honour any colours, fonts, tone, mood, or style the user names. Otherwise choose a palette and type system that fits the niche.
7. Two different briefs must produce two visibly different websites. The structure and content are driven entirely by the brief.

# DESIGN QUALITY: ULTRA-PREMIUM MODERN 3D
Regardless of niche, the craft must look like a top-tier 2025+ studio site:
- A cohesive design system: a real colour palette with a primary + accent, considered spacing scale, and 2 tasteful Google Fonts (load them via <link>).
- Depth and dimension: layered gradients, soft glows, glassmorphism (backdrop-filter blur on translucent surfaces), subtle 3D card tilt on pointer move, elevation shadows, and an aurora/mesh-gradient ambience in the background.
- Gradient or high-contrast display headings, generous whitespace, crisp grid/flex layouts.
- Motion: smooth scroll, on-scroll reveal animations via IntersectionObserver, hover micro-interactions. Keep it elegant, never gaudy.
- Fully responsive (mobile-first, works down to ~360px) and accessible (semantic landmarks, alt text, sufficient contrast, focus styles).
- A sticky in-page top <nav> whose links jump to the section ids on the page.

# IMAGERY
Do NOT hotlink external image files (they break). Create visuals with CSS: mesh/aurora gradients, glassmorphism panels, gradient "photo" placeholders, and inline SVG icons/illustrations. These must look intentional and premium, not like empty boxes.

# TECHNICAL OUTPUT CONTRACT
- Output a COMPLETE HTML5 document: <!DOCTYPE html> … </html>.
- It must be 100% self-contained: ALL CSS in a single <style> tag and ALL JS in a single <script> tag. The only allowed external resource is Google Fonts (<link>). No frameworks, no build step, no external JS/CSS files.
- Inside <head>, include:
    - <title> with the business name,
    - <meta name="sb-brand" content="THE BUSINESS NAME">,
    - <meta name="sb-niche" content="A SHORT NICHE LABEL, e.g. 'coffee shop' or 'SaaS analytics'">.
- Give every major <section> a unique id and wire the nav links to those ids.
- The whole site is one rich page with smooth in-page anchor navigation (unless the brief explicitly asks for separate routed pages, in which case still deliver one document and use clear sections).

# RESPONSE FORMAT
Return ONLY the raw HTML document. Do NOT wrap it in markdown code fences. Do NOT add any explanation before or after. The first characters of your reply must be "<!DOCTYPE html>".`;

export interface GeneratedSite {
  /** The complete, self-contained HTML document. */
  html: string;
  /** In-page anchor nav parsed from the document's <nav>. */
  nav: Array<{ label: string; href: string }>;
  /** Business name, from the sb-brand meta / <title> (falls back to the caller's brandName). */
  brandName: string;
  /** Short niche label, from the sb-niche meta. */
  niche: string;
}

/** Strip accidental markdown fences and any preamble before the doctype. */
function cleanHtml(raw: string): string {
  let html = raw.trim();
  // Remove ```html ... ``` or ``` ... ``` wrappers if the model added them.
  const fence = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i);
  if (fence) html = fence[1].trim();
  // Drop any chatter before the document starts.
  const docStart = html.search(/<!doctype html>/i);
  if (docStart > 0) html = html.slice(docStart);
  return html.trim();
}

/**
 * Generate a complete website from a prompt using the configured AI engine.
 *
 * @throws MissingApiKeyError if AI_API_KEY is unset.
 * @throws Error if the engine fails or returns something that isn't an HTML document.
 */
export async function buildSite(prompt: string, brandName?: string): Promise<GeneratedSite> {
  const brief = brandName
    ? `Business / brand name: ${brandName}\n\nClient brief:\n${prompt}`
    : `Client brief:\n${prompt}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: brief },
  ];

  const html = cleanHtml(await callChatModel(messages, { temperature: 0.85, maxTokens: 16000 }));

  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error('AI engine did not return a complete HTML document.');
  }

  // Parse metadata + nav from the AI's own markup. Never mutate the markup.
  const $ = cheerio.load(html);
  const metaBrand = $('meta[name="sb-brand"]').attr('content')?.trim();
  const metaNiche = $('meta[name="sb-niche"]').attr('content')?.trim();
  const title = $('title').first().text().trim();

  const nav: Array<{ label: string; href: string }> = [];
  const seen = new Set<string>();
  $('nav a[href^="#"]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim();
    const label = $(el).text().replace(/\s+/g, ' ').trim();
    if (href && href !== '#' && label && !seen.has(href)) {
      seen.add(href);
      nav.push({ label, href });
    }
  });

  return {
    html,
    nav,
    brandName: metaBrand || title || brandName || 'Untitled',
    niche: metaNiche || '',
  };
}
