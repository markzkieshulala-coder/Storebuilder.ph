// ---------------------------------------------------------------------------
// CONTENT PLAN — Phase 3: single source of truth for all user-facing copy.
//
// buildContentPlan is the entry point. It runs the full resolution chain for every
// content field — prompt tier first, then NLU synthesis, then niche bank fallback,
// then generic default — and returns a ContentPlan where every field carries a
// Provenance tag describing which tier produced it.
//
// Key design decisions:
//   D5 (Conservative synthesis): short, honest, prompt-derived content is preferred.
//      Fall through to niche fallback rather than fabricating speculative content.
//   D6 (Downgrade synthesized catalogs): products only when explicitly in prompt or
//      nlu.products is non-empty. No catalog solely from niche classification.
//   D7 (Sparse prompt floor): surface provenance metrics. Do not block generation.
// ---------------------------------------------------------------------------

import type { PromptUnderstandingObject } from '../prompt-engine';
import type { WebsiteSpec } from '../spec';
import type { LayoutPlan } from '../layout';
import { normalizeIndustry } from '../html-renderer';
import {
  type ContentPlan, type ContentValue, type FeatureItem, type StatItem,
  type TestimonialItem, type FaqItem, type PricingPlan,
  computeProvenance,
} from './types';
import {
  pick, rotate, titleCase, cleanLabel, spToTitle, extractPromptStats,
  extractNluSignals, getContentWords, buildHeadlinePatterns,
  type NluSignals,
} from './synthesis';
import {
  NICHE_SUBJECT, GALLERY_LABEL_BY_NICHE, CTA_SUB_BY_NICHE,
  TESTIMONIAL_ROLES, TESTIMONIAL_QUOTES,
  ABOUT_BODY_BY_NICHE, FEATURE_SUFFIXES_BY_NICHE, FEATURE_DESC_BY_NICHE,
  GENERIC_TRUST_SIGNALS, resolveNicheFaqs, resolveProductBank,
  buildNichePricingPlans,
} from './banks';

// ── Helper for building ContentValue ────────────────────────────────────────

function cv<T>(value: T, source: ContentValue<T>['source'], origin?: string): ContentValue<T> {
  return { value, source, origin };
}

// ── Content context (shared across all resolvers) ────────────────────────────

interface Ctx {
  prompt: string;
  puo: PromptUnderstandingObject;
  spec: WebsiteSpec;
  layoutPlan: LayoutPlan;
  brand: string;
  fp: number;
  normIndustry: string;
  kws: string[];
  mainKw: string;
  secKw: string;
  thirdKw: string;
  diffAdj: string;
  audFrag: string;
  nlu: NluSignals;
}

function buildCtx(
  prompt: string,
  puo: PromptUnderstandingObject,
  spec: WebsiteSpec,
  layoutPlan: LayoutPlan,
  brand: string,
  fp: number,
): Ctx {
  const normIndustry = normalizeIndustry(puo.inferredIndustry);
  const nlu = extractNluSignals(puo);
  const kws = getContentWords(puo);

  const rawSubject = NICHE_SUBJECT[puo.inferredIndustry] || (puo.inferredIndustry !== 'general' ? cleanLabel(puo.inferredIndustry) : null);
  const normSubject = NICHE_SUBJECT[normIndustry] || null;
  const nicheSubject = rawSubject || normSubject || 'Excellence';

  const slugLike = new Set([puo.inferredIndustry, normIndustry].map(x => String(x).toLowerCase()));
  const kwDisplay = (k: string | undefined, fallback: string): string => {
    if (!k) return fallback;
    if (slugLike.has(k.toLowerCase()) && (rawSubject || normSubject)) return (rawSubject || normSubject) as string;
    return cleanLabel(k);
  };

  const diffWords = new Set(nlu.differentiator.toLowerCase().split(/\s+/).filter(Boolean));
  const kwPool = kws.filter(k => !diffWords.has(k));
  const pool = kwPool.length ? kwPool : kws;
  const allNicheWords = new Set(
    [puo.inferredIndustry, normIndustry].map(s => String(s).toLowerCase())
  );
  const mainKwSrc  = pool.find(k => allNicheWords.has(k)) ?? pool[0];
  const secKwSrc   = pool.find(k => k !== mainKwSrc) ?? kws.find(k => k !== mainKwSrc);
  const thirdKwSrc = pool.find(k => k !== mainKwSrc && k !== secKwSrc) ?? kws.find(k => k !== mainKwSrc && k !== secKwSrc);
  const mainKw  = kwDisplay(mainKwSrc, nicheSubject);
  const secKw   = kwDisplay(secKwSrc, nicheSubject !== 'Experience' ? 'Experience' : 'Quality');
  const thirdKw = kwDisplay(thirdKwSrc, 'Innovation');

  const diffAdj = nlu.differentiator ? `${titleCase(nlu.differentiator)} ` : '';
  const audFrag = nlu.audience ? ` for ${nlu.audience}` : '';

  return { prompt, puo, spec, layoutPlan, brand, fp, normIndustry, kws, mainKw, secKw, thirdKw, diffAdj, audFrag, nlu };
}

// ── Hero resolvers ────────────────────────────────────────────────────────────

function resolveHeroHeadline(ctx: Ctx): ContentValue<string> {
  const { nlu, puo, brand, mainKw, secKw, thirdKw, diffAdj, audFrag, fp } = ctx;

  // Tier 1: Prompt — explicitly stated heroHeadline
  if (nlu.heroHeadline) return cv(nlu.heroHeadline, 'prompt', 'llm.heroHeadline');

  // Tier 1: Prompt — user's own descriptive sentences → title
  if (nlu.descriptiveSPs.length >= 1) {
    const kp = spToTitle(nlu.descriptiveSPs[0]);
    let detail = '';
    if (nlu.descriptiveSPs.length >= 2) {
      const numM = nlu.descriptiveSPs[1].match(/\b(\d+(?:\.\d+)?)\s*[-–]?\s*(?:hour|hr|year|star|location|item|piece|day)\b/i);
      if (numM) {
        const unitRaw = nlu.descriptiveSPs[1].match(/\b(hour|hr|year|star|location|item|piece|day)s?\b/i);
        const unit = unitRaw ? unitRaw[1] : '';
        const unitLabel: Record<string, string> = { hour:'Hour', hr:'Hour', year:'Year', star:'Star', location:'Location', item:'Item', piece:'Piece', day:'Day' };
        detail = ` — ${numM[1]}-${unitLabel[unit.toLowerCase()] || unit.charAt(0).toUpperCase()+unit.slice(1)} ${unit.toLowerCase() === 'hour' || unit.toLowerCase() === 'hr' ? 'Crafted' : 'Proven'}`;
      }
    }
    return cv(kp + detail, 'prompt', 'descriptiveSPs[0]');
  }

  // Tier 2: NLU — personality-based pattern using extracted keywords
  const patterns = buildHeadlinePatterns(brand, mainKw, secKw, thirdKw, diffAdj, audFrag);
  const headlines = patterns[puo.websitePersonality] || patterns.bold;
  return cv(pick(headlines, fp), 'nlu', 'headlinePattern');
}

function resolveHeroSub(ctx: Ctx): ContentValue<string> {
  const { nlu, puo, brand, mainKw, secKw, fp } = ctx;

  // Tier 1: Prompt — explicitly stated heroSub
  if (nlu.heroSub) return cv(nlu.heroSub, 'prompt', 'llm.heroSub');

  // Tier 1: Prompt — user's descriptive sentences
  if (nlu.descriptiveSPs.length >= 1) {
    return cv(nlu.descriptiveSPs.slice(0, 2).join(' '), 'prompt', 'descriptiveSPs');
  }

  // Tier 2: NLU — keyword-anchored hero sub pattern
  const subjectPhrase = (ctx.kws[0] ? ctx.kws[0] : mainKw).toLowerCase();
  const supportPhrase = (ctx.kws[1] ? ctx.kws[1] : secKw).toLowerCase();
  const isEnergetic = nlu.brandVoice?.register === 'energetic' || nlu.brandVoice?.usesExclamations;
  const isLuxe = nlu.brandVoice?.register === 'luxe';
  const { differentiator, audience } = nlu;
  const diffAdj2 = differentiator ? `${titleCase(differentiator)} ` : '';
  const audFrag2 = audience ? ` for ${audience}` : '';

  const heroSubPatterns = [
    differentiator
      ? `${diffAdj2}${subjectPhrase} and ${supportPhrase}${audFrag2} — made with genuine care and no shortcuts.`
      : `${titleCase(subjectPhrase)} and ${supportPhrase}${audFrag2 === '' ? '' : ', for ' + audience} — done the right way, every time.`,
    `Discover ${brand}: a new standard in ${subjectPhrase}, built around ${supportPhrase}${audFrag2 === '' ? '' : ' ' + audience + ' trust'}.`,
    `Experience ${subjectPhrase} done right${audFrag2}. Thoughtfully crafted, expertly delivered, built to last.`,
    `${brand} brings ${subjectPhrase} and ${supportPhrase} together into one ${differentiator ? differentiator + ', ' : ''}seamless experience.`,
    isLuxe
      ? `${brand} was created for ${audience || 'those who expect more'} — where ${subjectPhrase} and ${supportPhrase} are not just promised, but delivered with distinction.`
      : `${brand} was built because ${subjectPhrase} deserved better${audFrag2 === '' ? '' : ' for ' + audience}. ${differentiator ? titleCase(differentiator) + ' and u' : 'U'}ncompromising quality, every time.`,
    isEnergetic
      ? `${brand} is where ${subjectPhrase} gets serious${audFrag2}. Real results. Genuine ${supportPhrase}. No shortcuts.`
      : `${audFrag2 === '' ? 'Genuine' : titleCase(audience!) + ' deserve genuine'} ${subjectPhrase}. Real ${supportPhrase}. ${brand} — the way it should be.`,
  ];
  return cv(pick(heroSubPatterns, fp + 2), 'nlu', 'heroSubPattern');
}

function resolveHeroTag(ctx: Ctx): ContentValue<string> {
  const { nlu, puo, brand, mainKw, fp, normIndustry } = ctx;

  // Tier 1: Prompt — explicit heroTag
  if (nlu.heroTag) return cv(nlu.heroTag, 'prompt', 'llm.heroTag');

  // Tier 1: Prompt — credential signals
  if (nlu.credSignals.length > 0) return cv(titleCase(nlu.credSignals[0]), 'prompt', 'credSignals');

  // Tier 2: NLU — location
  if (nlu.location) return cv(`Serving ${nlu.location}`, 'nlu', 'location');

  // Tier 3: Niche — industry specialisation label
  if (puo.inferredIndustry !== 'general') {
    return cv(`${titleCase(puo.inferredIndustry)} Specialists`, 'niche', 'industry');
  }

  // Generic
  return cv(pick(['Trusted by Thousands', `${mainKw} Experts`, 'Now Open', `Premium ${mainKw}`], fp + 3), 'generic', 'pick');
}

// ── CTA resolvers ─────────────────────────────────────────────────────────────

function resolvePrimaryCta(ctx: Ctx): ContentValue<string> {
  const { nlu } = ctx;

  if (nlu.primaryCta) return cv(nlu.primaryCta, 'prompt', 'llm.primaryCta');
  if (nlu.intentCta) return cv(nlu.intentCta, 'prompt', 'intentCta');

  return cv('', 'absent', 'no-explicit-cta');
}

function resolveSecondaryCta(ctx: Ctx): ContentValue<string> {
  const { nlu } = ctx;

  if (nlu.secondaryCta) return cv(nlu.secondaryCta, 'prompt', 'llm.secondaryCta');

  return cv('', 'absent', 'no-explicit-secondary-cta');
}

// ── Features resolvers ────────────────────────────────────────────────────────

function resolveSectionEyebrow(ctx: Ctx): ContentValue<string> {
  const { nlu, fp } = ctx;
  if (nlu.differentiator) return cv(`What Makes Us ${titleCase(nlu.differentiator)}`, 'nlu', 'differentiator');
  if (nlu.audience) return cv(`Built for ${titleCase(nlu.audience)}`, 'nlu', 'audience');
  if (nlu.activityKeywords[0]) return cv(`Specialising in ${titleCase(nlu.activityKeywords[0])}`, 'nlu', 'activityKeywords');
  return cv(pick(['Why Choose Us', 'What We Offer', 'Our Approach', 'How We Help', 'What Sets Us Apart'], fp + 7), 'generic', 'pick');
}

function resolveFeatureHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw } = ctx;
  if (nlu.differentiator && nlu.audience) {
    return cv(`${titleCase(nlu.differentiator)} ${mainKw} for ${titleCase(nlu.audience)}`, 'nlu', 'differentiator+audience');
  }
  if (nlu.differentiator) return cv(`The ${titleCase(nlu.differentiator)} Difference`, 'nlu', 'differentiator');
  if (nlu.audience) return cv(`Everything ${titleCase(nlu.audience)} Need`, 'nlu', 'audience');
  return cv(`Why ${brand}`, 'generic', 'brand');
}

const FEAT_TITLE_FNS: Array<(kw: string, sf: string) => string> = [
  (kw, sf) => `${titleCase(kw)} ${sf}`,
  (kw, sf) => `Expert ${titleCase(kw)}`,
  (kw, sf) => `${sf}-Grade ${titleCase(kw)}`,
  (kw, sf) => `Proven ${titleCase(kw)}`,
  (kw, sf) => `The ${titleCase(kw)} ${sf}`,
  (kw, sf) => `${titleCase(kw)}: ${sf}`,
];

function resolveFeatures(ctx: Ctx, iconPool: string[], featureHref: string): ContentValue<FeatureItem[]> {
  const { nlu, kws, normIndustry, fp, mainKw, spec } = ctx;

  if (!spec.sections.includes('features')) {
    return cv([], 'absent', 'features-not-requested');
  }

  const suffixes = FEATURE_SUFFIXES_BY_NICHE[normIndustry] || FEATURE_SUFFIXES_BY_NICHE.general;
  const descFor = FEATURE_DESC_BY_NICHE[normIndustry] || FEATURE_DESC_BY_NICHE.general;
  const featureKws = [...new Set([...nlu.activityKeywords.map(k => k.toLowerCase()), ...kws])].slice(0, 6);
  const spTitles = nlu.descriptiveSPs.map(spToTitle);
  // Only USER-listed product names are prompt-faithful feature titles; niche-bank
  // product names must not masquerade as prompt-derived content.
  const productTitles = nlu.products.filter(p => p.fromUser).map(p => p.name).filter(Boolean);

  const hasPromptContent = spTitles.length > 0 || productTitles.length > 0;
  const source = hasPromptContent ? 'prompt' : (featureKws.length > 0 ? 'nlu' : 'niche');

  const getBestTitle = (i: number, kw: string, sf: string): string => {
    if (productTitles[i]) return productTitles[i];
    if (spTitles[i]) return spTitles[i];
    return FEAT_TITLE_FNS[(fp + i * 3) % FEAT_TITLE_FNS.length](kw, sf);
  };
  const spDesc = (i: number): string | null =>
    nlu.descriptiveSPs.length > 0 ? nlu.descriptiveSPs[i % nlu.descriptiveSPs.length] : null;

  const allKwFeatures = (featureKws.length > 0 ? featureKws : kws).slice(0, 6).map((kw, i) => {
    const sf = pick(suffixes, fp + i);
    return {
      icon: iconPool[(fp + i) % iconPool.length],
      title: getBestTitle(i, kw, sf),
      desc: spDesc(i) ?? descFor(kw),
      href: featureHref,
    };
  });

  while (allKwFeatures.length < 3) {
    const defaults: FeatureItem[] = [
      { icon: iconPool[9 % iconPool.length], title: 'Peak Performance', desc: `Our ${mainKw} approach delivers measurable results from day one.`, href: featureHref },
      { icon: iconPool[2 % iconPool.length], title: 'Trusted Quality', desc: `Every aspect of ${ctx.brand} is built on a foundation of quality and trust.`, href: 'about' },
      { icon: iconPool[7 % iconPool.length], title: 'Proven Results', desc: `Hundreds of clients have already experienced the ${ctx.brand} difference.`, href: featureHref },
    ];
    allKwFeatures.push(defaults[allKwFeatures.length % defaults.length]);
  }

  return cv(allKwFeatures.slice(0, 4), source, 'features');
}

// ── Stats resolver ────────────────────────────────────────────────────────────

function resolveStats(ctx: Ctx): ContentValue<StatItem[]> {
  const { puo, normIndustry, prompt, spec } = ctx;

  if (!spec.sections.includes('stats')) {
    return cv([], 'absent', 'stats-not-requested');
  }

  const promptStats = extractPromptStats(puo.originalPrompt || prompt);
  const fallback = GENERIC_TRUST_SIGNALS[normIndustry] || GENERIC_TRUST_SIGNALS.general;

  const merged = [...promptStats];
  for (const ts of fallback) {
    if (merged.length >= 4) break;
    if (!promptStats.some(ps => ps.label === ts.label)) merged.push(ts);
  }

  const source = promptStats.length > 0 ? 'prompt' : 'niche';
  return cv(merged.slice(0, 4), source, 'stats');
}

// ── Testimonials resolver ─────────────────────────────────────────────────────

function resolveTestimonials(ctx: Ctx): ContentValue<TestimonialItem[]> {
  const { nlu, brand, mainKw, secKw, normIndustry, fp, spec } = ctx;

  if (!spec.sections.includes('testimonials')) {
    return cv([], 'absent', 'testimonials-not-requested');
  }

  const roles = TESTIMONIAL_ROLES[normIndustry] || TESTIMONIAL_ROLES.general;

  // Only USER-listed products may appear in quotes / drive 'prompt' provenance.
  const userProducts = nlu.products.filter(p => p.fromUser);
  const tSp0 = nlu.descriptiveSPs[0] ? spToTitle(nlu.descriptiveSPs[0]).toLowerCase() : mainKw.toLowerCase();
  const tSp1 = nlu.descriptiveSPs[1] ? spToTitle(nlu.descriptiveSPs[1]).toLowerCase() : secKw.toLowerCase();
  const tProd0 = userProducts[0]?.name || tSp0;
  const tProd1 = userProducts[1]?.name || tSp1;

  const nicheQuotes = TESTIMONIAL_QUOTES[normIndustry] || TESTIMONIAL_QUOTES.general;
  const interpolate = (q: string) =>
    q.replace(/\[brand\]/g, brand).replace(/\[mainKw\]/g, mainKw).replace(/\[secKw\]/g, secKw);

  const buildQ = (idx: number): string => {
    switch (idx % 3) {
      case 0:
        if (nlu.descriptiveSPs.length >= 1)
          return `${brand}'s ${tSp0} is exactly what I was looking for. I've tried other places — nothing even comes close.`;
        return interpolate(nicheQuotes[0]);
      case 1:
        if (userProducts.length >= 1)
          return `The ${tProd0} at ${brand} exceeded every expectation. I've already recommended it to everyone I know.`;
        if (nlu.descriptiveSPs.length >= 2)
          return `${brand} delivers on every promise — especially the ${tSp1}. An experience worth coming back for again and again.`;
        return interpolate(nicheQuotes[1]);
      default:
        if (userProducts.length >= 2)
          return `Came for the ${tProd0}, stayed for the ${tProd1}. ${brand} is in a class of its own.`;
        if (nlu.descriptiveSPs.length >= 1)
          return `Once you've experienced ${tSp0} at ${brand}, you won't go anywhere else. The quality speaks for itself.`;
        return interpolate(nicheQuotes[2] || nicheQuotes[0]);
    }
  };

  const NAME_POOL = [
    ['A Happy Customer', 'A Regular Client', 'A Returning Customer'],
    ['A Satisfied Client', 'A Verified Buyer', 'A Loyal Customer'],
    ['A Weekly Regular', 'A Happy Client', 'A Long-Time Customer'],
    ['A Local Customer', 'A First-Time Visitor', 'A Returning Guest'],
    ['A Devoted Regular', 'A Happy Customer', 'A Repeat Client'],
    ['A Verified Client', 'A Regular Guest', 'A Satisfied Customer'],
  ];
  const names = NAME_POOL[fp % NAME_POOL.length];
  const items = names.map((name, i) => ({
    quote: buildQ(i),
    name,
    role: roles[i % roles.length] || roles[0],
  }));

  const hasPrompt = nlu.descriptiveSPs.length > 0 || userProducts.length > 0;
  return cv(items, hasPrompt ? 'prompt' : 'niche', 'testimonials');
}

// ── About resolvers ───────────────────────────────────────────────────────────

function resolveAboutHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw } = ctx;
  if (nlu.differentiator && mainKw) return cv(`${titleCase(nlu.differentiator)} ${mainKw}`, 'nlu', 'differentiator+mainKw');
  if (nlu.missionStatement) return cv(`The ${brand} Mission`, 'nlu', 'missionStatement');
  if (nlu.audience) return cv(`${brand}: For ${titleCase(nlu.audience)}`, 'nlu', 'audience');
  return cv(`The ${brand} Story`, 'generic', 'brand');
}

function resolveAboutBody(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw, secKw, normIndustry } = ctx;

  // Tier 1: Prompt — explicit about text from NLU
  if (nlu.about) return cv(nlu.about, 'prompt', 'llm.about');

  // Tier 1: Prompt — 2+ descriptive selling points → use verbatim
  if (nlu.descriptiveSPs.length >= 2) {
    return cv(nlu.descriptiveSPs.slice(0, 3).join(' '), 'prompt', 'descriptiveSPs');
  }

  // Tier 3: Niche template, optionally enriched with 1 descriptive SP
  const tplFn = ABOUT_BODY_BY_NICHE[normIndustry];
  const tpl = tplFn
    ? tplFn(brand, mainKw, secKw, nlu.audience, nlu.differentiator)
    : `${brand} was founded with a single conviction: ${mainKw.toLowerCase()}${nlu.audience ? ' for ' + nlu.audience : ''} should be${nlu.differentiator ? ' ' + nlu.differentiator + ' and' : ''} exceptional. We bring genuine expertise, a passion for ${secKw.toLowerCase()}, and a relentless focus on quality to everything we do.`;

  if (nlu.descriptiveSPs.length === 1) {
    const sentences = tpl.split(/(?<=[.!?])\s+/);
    const intro = sentences.slice(0, 2).join(' ');
    return cv(`${intro} ${nlu.descriptiveSPs[0]}`, 'prompt', 'descriptiveSPs[0]+niche');
  }

  // Tier 3: Niche with NLU enrichment signals
  const extras: string[] = [];
  if (nlu.credSignals.length >= 1) extras.push(`As a ${nlu.credSignals.slice(0, 2).join(', ')} business, quality is built into every decision.`);
  if (nlu.location) extras.push(`Proudly serving ${nlu.location}.`);
  const body = extras.length ? `${tpl} ${extras.join(' ')}` : tpl;
  return cv(body, extras.length ? 'nlu' : 'niche', 'aboutBodyTemplate');
}

function resolveAboutBullets(ctx: Ctx): ContentValue<string[]> {
  const { nlu, kws, mainKw } = ctx;

  if (nlu.descriptiveSPs.length >= 3) {
    return cv(nlu.descriptiveSPs.slice(0, 4).map(sp => spToTitle(sp)), 'prompt', 'descriptiveSPs');
  }
  if (nlu.descriptiveSPs.length >= 1) {
    return cv([
      spToTitle(nlu.descriptiveSPs[0]),
      kws[1] ? titleCase(kws[1]) + '-focused execution' : 'Results-focused execution',
      nlu.differentiator ? titleCase(nlu.differentiator) + ' commitment' : nlu.audience ? 'Built for ' + nlu.audience : 'Uncompromising quality',
      'Transparent, honest, and always improving',
    ], 'prompt', 'descriptiveSPs[0]');
  }
  return cv([
    kws[0] ? titleCase(kws[0]) + '-first approach' : 'Client-first approach',
    kws[1] ? titleCase(kws[1]) + '-focused execution' : 'Results-focused execution',
    nlu.differentiator ? titleCase(nlu.differentiator) + ' commitment' : nlu.audience ? 'Built for ' + nlu.audience : 'Uncompromising quality',
    'Transparent, honest, and always improving',
  ], nlu.differentiator || nlu.audience ? 'nlu' : 'generic', 'aboutBullets');
}

// ── Mission resolvers ─────────────────────────────────────────────────────────

function resolveMissionHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw } = ctx;
  if (nlu.missionStatement) return cv(`The ${brand} Mission`, 'prompt', 'missionStatement');
  if (nlu.differentiator) return cv(`Our ${titleCase(nlu.differentiator)} Promise`, 'nlu', 'differentiator');
  if (nlu.audience) return cv(`Built for ${titleCase(nlu.audience)}`, 'nlu', 'audience');
  return cv(`Why ${brand}`, 'generic', 'brand');
}

function resolveMissionBody(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw, secKw } = ctx;

  if (nlu.missionStatement) {
    const body = nlu.differentiator
      ? `${nlu.missionStatement} — ${nlu.differentiator} at every step.`
      : nlu.missionStatement;
    return cv(body, 'prompt', 'missionStatement');
  }
  if (nlu.descriptiveSPs.length >= 3) {
    return cv(nlu.descriptiveSPs.slice(2).join(' '), 'prompt', 'descriptiveSPs[2+]');
  }
  if (nlu.differentiator && nlu.audience) {
    return cv(`At ${brand}, we're ${nlu.differentiator} to the core — built specifically for ${nlu.audience}. Every ${mainKw.toLowerCase()} decision starts with one question: does this truly serve ${nlu.audience}? Our answer is always ${nlu.differentiator}, always genuine, and never shortcuts.`, 'nlu', 'differentiator+audience');
  }
  if (nlu.differentiator) {
    return cv(`At ${brand}, ${nlu.differentiator} isn't just a tagline — it's how we operate. From our sourcing to our service, every detail reflects our commitment to doing ${mainKw.toLowerCase()} the ${nlu.differentiator} way. No shortcuts. Just work we're proud to put our name on.`, 'nlu', 'differentiator');
  }
  if (nlu.audience) {
    return cv(`${brand} was built specifically for ${nlu.audience}. We understand what ${nlu.audience} need better than anyone — and that understanding shapes every decision we make, from the way we work to the results we deliver.`, 'nlu', 'audience');
  }
  return cv(`Every detail at ${brand} is intentional. We pair deep ${mainKw.toLowerCase()} expertise with an obsession for ${secKw.toLowerCase()}. No shortcuts — just work we're proud to put our name on.`, 'generic', 'template');
}

// ── Gallery / catalog resolvers ───────────────────────────────────────────────

function resolveGalleryHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, normIndustry } = ctx;
  const userProductTitles = nlu.products.filter(p => p.fromUser).map(p => p.name).filter(Boolean);
  const galleryLabel = GALLERY_LABEL_BY_NICHE[normIndustry] || GALLERY_LABEL_BY_NICHE.general;
  if (userProductTitles.length >= 2) return cv(`${brand} — ${galleryLabel}`, 'prompt', 'productTitles');
  return cv(`Our ${galleryLabel}`, 'niche', 'galleryLabel');
}

// D6 quality filter: NLU always produces at least one generic fallback product.
// These are NOT real products — they're placeholders the NLU emits when it can't
// find anything specific. Filter them out so only genuinely prompt-derived products
// activate the products section.
const GENERIC_PRODUCT_RE = /^(our offering|services|consulting|custom|general|get in touch|contact us|donation|donate)$/i;

function isRealProduct(p: { name: string; desc?: string; price?: string }): boolean {
  if (!p.name || GENERIC_PRODUCT_RE.test(p.name.trim())) return false;
  return true;
}

function resolveProducts(ctx: Ctx): ContentValue<Array<{ name: string; desc: string; price: string }> | null> {
  const { nlu, puo, spec, normIndustry } = ctx;

  // D6: products ONLY when spec includes products section. The section is in the
  // spec only when the user (a) listed items (NLU `_fromUser` → spec.ts) or
  // (b) explicitly requested products/menu/shop/catalog (requirements.ts).
  if (!spec.sections.includes('products')) {
    return cv(null, 'absent', 'spec.sections.no-products');
  }

  // Tier 1: Prompt — items the USER explicitly listed. Only `_fromUser` products
  // may be labeled 'prompt'. Niche-bank / activity-inferred items NEVER are.
  const userProducts = nlu.products.filter(p => p.fromUser && isRealProduct(p));
  if (userProducts.length > 0) {
    return cv(userProducts.map(({ name, desc, price }) => ({ name, desc, price })), 'prompt', 'llm.products[_fromUser]');
  }

  // Section was requested (case b) but the user listed no items. Fill from the
  // niche bank — labeled 'niche', because this content is NOT prompt-derived.
  const bank = resolveProductBank(puo.extractedKeywords, puo.inferredIndustry, normIndustry);
  if (bank) return cv(bank.items, 'niche', 'productBank');

  // Last resort: NLU's own niche/activity-inferred items (still not user-listed).
  const inferred = nlu.products.filter(isRealProduct);
  if (inferred.length > 0) {
    return cv(inferred.map(({ name, desc, price }) => ({ name, desc, price })), 'niche', 'nlu.inferred');
  }

  return cv(null, 'absent', 'no-products');
}

function resolveProductEyebrow(ctx: Ctx): ContentValue<string> {
  const { nlu, puo, normIndustry } = ctx;
  if (nlu.products.length > 0) return cv('Featured', 'generic', 'default');
  const bank = resolveProductBank(puo.extractedKeywords, puo.inferredIndustry, normIndustry);
  if (bank) return cv(bank.eyebrow, 'niche', 'productBank.eyebrow');
  return cv('Featured', 'generic', 'default');
}

// ── Contact resolvers ─────────────────────────────────────────────────────────

function resolveContactHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, mainKw } = ctx;
  if (nlu.audience) return cv(`Ready, ${titleCase(nlu.audience)}?`, 'nlu', 'audience');
  return cv(`Let's Talk ${mainKw}`, 'nlu', 'mainKw');
}

function resolveContactSub(ctx: Ctx): ContentValue<string> {
  const { nlu, brand } = ctx;
  const parts: string[] = [
    nlu.operatingHours ? `We're open ${nlu.operatingHours}.` : `Ready to experience ${brand}?`,
    nlu.audience ? ` We work with ${nlu.audience}.` : '',
    nlu.location ? (nlu.location.match(/^(in|at|near)\b/i) ? ` We're ${nlu.location}.` : ` We're based in ${nlu.location}.`) : '',
    nlu.phone ? ` Call us at ${nlu.phone}.` : '',
    ' Have a question? Reach out and we\'ll get back to you soon.',
  ];
  const sub = parts.join('');
  const hasPromptSignals = !!(nlu.operatingHours || nlu.location || nlu.phone || nlu.audience);
  return cv(sub, hasPromptSignals ? 'prompt' : 'generic', 'contactSub');
}

// ── CTA section resolvers ─────────────────────────────────────────────────────

function resolveCtaHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw } = ctx;
  if (nlu.intentCta && nlu.intentCta !== 'Get Started') {
    return cv(`${nlu.intentCta.replace(/\s*now\s*/gi, '').trim()} — ${brand} Is Ready`, 'prompt', 'intentCta');
  }
  if (nlu.descriptiveSPs.length >= 1) {
    return cv(`Experience ${spToTitle(nlu.descriptiveSPs[0])} at ${brand}`, 'prompt', 'descriptiveSPs[0]');
  }
  if (nlu.audience) return cv(`Built for ${titleCase(nlu.audience)} — Ready When You Are`, 'nlu', 'audience');
  return cv(`Ready to Experience ${brand}?`, 'generic', 'brand');
}

function resolveCtaSub(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, normIndustry } = ctx;
  const base = CTA_SUB_BY_NICHE[normIndustry] || CTA_SUB_BY_NICHE.general;
  if (nlu.audience && nlu.differentiator) {
    return cv(`${brand} is ${nlu.differentiator} — designed specifically for ${nlu.audience}. ${base}`, 'nlu', 'differentiator+audience+niche');
  }
  if (nlu.audience) {
    return cv(`${brand} is built for ${nlu.audience}. ${base}`, 'nlu', 'audience+niche');
  }
  if (nlu.differentiator) {
    return cv(`Experience the ${nlu.differentiator} difference at ${brand}. ${base}`, 'nlu', 'differentiator+niche');
  }
  return cv(base, 'niche', 'CTA_SUB_BY_NICHE');
}

// ── Footer resolver ───────────────────────────────────────────────────────────

function resolveFooterTagline(ctx: Ctx): ContentValue<string> {
  const { nlu, brand, mainKw } = ctx;

  if (nlu.tagline) return cv(nlu.tagline, 'prompt', 'llm.tagline');

  let base: string;
  let source: ContentValue<string>['source'];

  if (nlu.differentiator && nlu.location) {
    base = `${titleCase(nlu.differentiator)} ${mainKw.toLowerCase()} in ${nlu.location}.`;
    source = 'nlu';
  } else if (nlu.differentiator) {
    base = `${titleCase(nlu.differentiator)} ${mainKw.toLowerCase()} — every time.`;
    source = 'nlu';
  } else if (nlu.location) {
    base = `Proudly serving ${nlu.location}.`;
    source = 'nlu';
  } else if (nlu.audience) {
    base = `Made for ${nlu.audience}.`;
    source = 'nlu';
  } else {
    base = `${brand} — ${mainKw.toLowerCase()} done right.`;
    source = 'generic';
  }

  const tagline = nlu.operatingHours
    ? `${base.replace(/\.$/, '')} · Open ${nlu.operatingHours}.`
    : nlu.phone
    ? `${base.replace(/\.$/, '')} · ${nlu.phone}`
    : base;

  return cv(tagline, source, 'footerTagline');
}

// ── FAQ resolver ──────────────────────────────────────────────────────────────

function resolveFaqs(ctx: Ctx): ContentValue<FaqItem[] | null> {
  const { nlu, spec, normIndustry } = ctx;

  // D6: FAQs only when spec includes faq section
  if (!spec.sections.includes('faq')) {
    return cv(null, 'absent', 'spec.sections.no-faq');
  }

  // Tier 1: Prompt — user-provided FAQs
  if (nlu.faqs.length > 0) return cv(nlu.faqs, 'prompt', 'llm.faqs');

  // Tier 3: Niche FAQ bank
  return cv(resolveNicheFaqs(normIndustry), 'niche', 'nicheFaq');
}

// ── Pricing resolver ──────────────────────────────────────────────────────────

function resolvePricingPlans(ctx: Ctx): ContentValue<PricingPlan[] | null> {
  const { spec, normIndustry } = ctx;

  // Only emit pricing when spec requires it
  if (!spec.sections.includes('pricing')) {
    return cv(null, 'absent', 'spec.sections.no-pricing');
  }

  // Phase 4C: niche-aware pricing tiers (no prompt extraction yet)
  return cv(buildNichePricingPlans(normIndustry), 'niche', 'pricingTemplate');
}

// ── StartingPrice resolver ────────────────────────────────────────────────────

function resolveStartingPrice(ctx: Ctx): ContentValue<string> {
  if (ctx.nlu.startingPrice) return cv(ctx.nlu.startingPrice, 'prompt', 'llm.startingPrice');
  return cv('', 'absent', 'no-starting-price');
}

// ── Section label resolvers (Phase 4F) ────────────────────────────────────────
// These replace eyebrows/headings the section renderers previously hardcoded
// ("FAQ"/"Common Questions", "Featured", "Highlight", "Stay in the Loop", etc.).
// Each resolves prompt-signal (audience) > niche bank > generic, so different
// niches and prompts produce different copy. Renderers still keep their own
// literal fallback for safety, but in practice always receive a value here.

interface SectionLabel { eyebrow: string; heading: string }

// niche → {eyebrow, heading}. 'general' is the guaranteed fallback key.
const FAQ_LABELS: Record<string, SectionLabel> = {
  food:         { eyebrow: 'Good to Know',     heading: 'Questions, Answered' },
  sports:       { eyebrow: 'Good to Know',     heading: 'Common Questions' },
  technology:   { eyebrow: 'FAQ',              heading: 'Frequently Asked Questions' },
  photography:  { eyebrow: 'Good to Know',     heading: 'Questions Clients Ask' },
  fashion:      { eyebrow: 'Help',             heading: 'Your Questions, Answered' },
  ecommerce:    { eyebrow: 'Help',             heading: 'Shopping Questions' },
  portfolio:    { eyebrow: 'Good to Know',     heading: 'Questions Clients Ask' },
  agency:       { eyebrow: 'FAQ',              heading: 'Questions We Hear Often' },
  wellness:     { eyebrow: 'Before You Begin', heading: 'Common Questions' },
  professional: { eyebrow: 'FAQ',              heading: 'Frequently Asked Questions' },
  hospitality:  { eyebrow: 'Before You Visit', heading: 'Guest Questions' },
  homeservices: { eyebrow: 'Good to Know',     heading: 'Common Questions' },
  automotive:   { eyebrow: 'Good to Know',     heading: 'Common Questions' },
  general:      { eyebrow: 'FAQ',              heading: 'Common Questions' },
};

const TESTIMONIAL_LABELS: Record<string, SectionLabel> = {
  food:         { eyebrow: 'Reviews',       heading: 'Loved by Our Regulars' },
  sports:       { eyebrow: 'Results',       heading: 'What Our Members Say' },
  technology:   { eyebrow: 'Testimonials',  heading: 'Trusted by Teams' },
  photography:  { eyebrow: 'Kind Words',    heading: 'What Clients Say' },
  fashion:      { eyebrow: 'Reviews',       heading: 'What Shoppers Say' },
  ecommerce:    { eyebrow: 'Reviews',       heading: 'What Customers Say' },
  portfolio:    { eyebrow: 'Kind Words',    heading: 'What Clients Say' },
  agency:       { eyebrow: 'Testimonials',  heading: 'What Our Partners Say' },
  wellness:     { eyebrow: 'Kind Words',    heading: 'What Our Clients Feel' },
  professional: { eyebrow: 'Testimonials',  heading: 'What Our Clients Say' },
  hospitality:  { eyebrow: 'Guest Reviews', heading: 'What Our Guests Say' },
  homeservices: { eyebrow: 'Reviews',       heading: 'What Homeowners Say' },
  automotive:   { eyebrow: 'Reviews',       heading: 'What Drivers Say' },
  general:      { eyebrow: 'Testimonials',  heading: 'What People Say' },
};

const PRICING_LABELS: Record<string, SectionLabel> = {
  food:         { eyebrow: 'Menu Pricing', heading: 'Simple, Honest Pricing' },
  sports:       { eyebrow: 'Membership',   heading: 'Plans for Every Goal' },
  technology:   { eyebrow: 'Pricing',      heading: 'Simple, Transparent Pricing' },
  photography:  { eyebrow: 'Packages',     heading: 'Photography Packages' },
  fashion:      { eyebrow: 'Pricing',      heading: 'Pricing & Packages' },
  ecommerce:    { eyebrow: 'Pricing',      heading: 'Pricing & Packages' },
  portfolio:    { eyebrow: 'Packages',     heading: 'Project Packages' },
  agency:       { eyebrow: 'Engagements',  heading: 'Ways to Work Together' },
  wellness:     { eyebrow: 'Memberships',  heading: 'Plans & Packages' },
  professional: { eyebrow: 'Pricing',      heading: 'Transparent Fees' },
  hospitality:  { eyebrow: 'Rates',        heading: 'Rooms & Rates' },
  homeservices: { eyebrow: 'Pricing',      heading: 'Upfront, Honest Pricing' },
  automotive:   { eyebrow: 'Pricing',      heading: 'Service Pricing' },
  general:      { eyebrow: 'Pricing',      heading: 'Simple, Transparent Pricing' },
};

const EVENTS_LABELS: Record<string, SectionLabel> = {
  food:         { eyebrow: "What's On",   heading: 'Upcoming Tastings & Events' },
  sports:       { eyebrow: 'Schedule',    heading: 'Upcoming Classes & Events' },
  technology:   { eyebrow: "What's On",   heading: 'Upcoming Events' },
  photography:  { eyebrow: 'Calendar',    heading: 'Upcoming Sessions' },
  fashion:      { eyebrow: "What's On",   heading: 'Upcoming Drops & Events' },
  ecommerce:    { eyebrow: "What's On",   heading: 'Upcoming Events' },
  portfolio:    { eyebrow: 'Calendar',    heading: 'Upcoming Showings' },
  agency:       { eyebrow: "What's On",   heading: 'Upcoming Events' },
  wellness:     { eyebrow: 'Schedule',    heading: 'Upcoming Workshops' },
  professional: { eyebrow: "What's On",   heading: 'Upcoming Seminars' },
  hospitality:  { eyebrow: "What's On",   heading: 'Upcoming Experiences' },
  homeservices: { eyebrow: "What's On",   heading: 'Upcoming Events' },
  automotive:   { eyebrow: "What's On",   heading: 'Upcoming Events' },
  general:      { eyebrow: "What's On",   heading: 'Upcoming Events' },
};

// Single-eyebrow banks (heading is derived elsewhere or embeds the brand).
const STORY_EYEBROW: Record<string, string> = {
  food: 'Our Story', sports: 'Our Mission', technology: 'Our Approach',
  photography: 'Behind the Lens', fashion: 'The Label', ecommerce: 'Featured',
  portfolio: 'Selected Work', agency: 'Our Approach', wellness: 'Our Philosophy',
  professional: 'Our Practice', hospitality: 'The Experience', homeservices: 'Our Promise',
  automotive: 'Our Workshop', general: 'Featured',
};

const HIGHLIGHT_EYEBROW: Record<string, string> = {
  food: 'Signature', sports: 'Why Train Here', technology: 'Highlights',
  photography: 'Spotlight', fashion: 'Spotlight', ecommerce: 'Featured',
  portfolio: 'Spotlight', agency: 'Highlights', wellness: 'Why Choose Us',
  professional: 'Highlights', hospitality: 'Highlights', homeservices: 'Why Choose Us',
  automotive: 'Why Choose Us', general: 'Highlight',
};

const GALLERY_EYEBROW: Record<string, string> = {
  food: 'On the Plate', sports: 'In Action', technology: 'Showcase',
  photography: 'Portfolio', fashion: 'Lookbook', ecommerce: 'Showcase',
  portfolio: 'Portfolio', agency: 'Our Work', wellness: 'The Space',
  professional: 'Showcase', hospitality: 'The Property', homeservices: 'Our Work',
  automotive: 'Our Work', general: 'Showcase',
};

const CONTACT_EYEBROW: Record<string, string> = {
  food: 'Visit Us', sports: 'Join Us', technology: 'Get in Touch',
  photography: "Let's Create", fashion: 'Get in Touch', ecommerce: 'Get in Touch',
  portfolio: "Let's Work Together", agency: "Let's Talk", wellness: 'Get in Touch',
  professional: 'Get in Touch', hospitality: 'Plan Your Visit', homeservices: 'Get a Quote',
  automotive: 'Book a Visit', general: 'Get in Touch',
};

const NEWSLETTER_EYEBROW: Record<string, string> = {
  food: 'Stay in the Loop', sports: 'Stay Motivated', technology: 'Stay Updated',
  photography: 'Stay Inspired', fashion: 'Stay in the Loop', ecommerce: 'Stay in the Loop',
  portfolio: 'Stay Inspired', agency: 'Stay in the Loop', wellness: 'Stay Well',
  professional: 'Stay Informed', hospitality: 'Stay in the Loop', homeservices: 'Stay in the Loop',
  automotive: 'Stay in the Loop', general: 'Stay in the Loop',
};

const TEAM_EYEBROW: Record<string, string> = {
  food: 'Our Kitchen', sports: 'Our Coaches', technology: 'Our Team',
  photography: 'The Studio', fashion: 'Our Team', ecommerce: 'Our Team',
  portfolio: 'The Studio', agency: 'The Team', wellness: 'Our Practitioners',
  professional: 'Our People', hospitality: 'Our Team', homeservices: 'Our Crew',
  automotive: 'Our Technicians', general: 'Our Team',
};

const BOOKING_EYEBROW: Record<string, string> = {
  food: 'Reservations', sports: 'Book a Session', technology: 'Request Access',
  photography: 'Book a Shoot', fashion: 'Book an Appointment', ecommerce: 'Get in Touch',
  portfolio: 'Start a Project', agency: 'Start a Project', wellness: 'Book a Session',
  professional: 'Book a Consultation', hospitality: 'Reservations', homeservices: 'Request a Quote',
  automotive: 'Book a Service', general: 'Booking',
};

const LOCATION_EYEBROW: Record<string, string> = {
  food: 'Find Us', sports: 'Visit the Gym', technology: 'Our Office',
  photography: 'The Studio', fashion: 'Visit the Store', ecommerce: 'Visit Us',
  portfolio: 'The Studio', agency: 'Our Office', wellness: 'Visit Us',
  professional: 'Our Office', hospitality: 'Find Us', homeservices: 'Service Area',
  automotive: 'Find the Shop', general: 'Visit Us',
};

const BLOG_EYEBROW: Record<string, string> = {
  food: 'From the Kitchen', sports: 'Training Tips', technology: 'From the Blog',
  photography: 'Journal', fashion: 'The Edit', ecommerce: 'From the Blog',
  portfolio: 'Journal', agency: 'Insights', wellness: 'The Journal',
  professional: 'Insights', hospitality: 'Travel Journal', homeservices: 'Tips & Advice',
  automotive: 'Tips & Advice', general: 'From the Blog',
};

function nicheVal(bank: Record<string, string>, niche: string): { value: string; niched: boolean } {
  const hit = bank[niche];
  return hit ? { value: hit, niched: true } : { value: bank.general, niched: false };
}

function resolveFaqEyebrow(ctx: Ctx): ContentValue<string> {
  const l = FAQ_LABELS[ctx.normIndustry];
  return cv((l || FAQ_LABELS.general).eyebrow, l ? 'niche' : 'generic', 'faqLabel');
}
function resolveFaqHeading(ctx: Ctx): ContentValue<string> {
  const { nlu, normIndustry } = ctx;
  if (nlu.audience) return cv(`Questions ${titleCase(nlu.audience)} Ask`, 'nlu', 'audience');
  const l = FAQ_LABELS[normIndustry];
  return cv((l || FAQ_LABELS.general).heading, l ? 'niche' : 'generic', 'faqLabel');
}

function resolveTestimonialsEyebrow(ctx: Ctx): ContentValue<string> {
  const l = TESTIMONIAL_LABELS[ctx.normIndustry];
  return cv((l || TESTIMONIAL_LABELS.general).eyebrow, l ? 'niche' : 'generic', 'testimonialLabel');
}
function resolveTestimonialsHeading(ctx: Ctx): ContentValue<string> {
  const l = TESTIMONIAL_LABELS[ctx.normIndustry];
  return cv((l || TESTIMONIAL_LABELS.general).heading, l ? 'niche' : 'generic', 'testimonialLabel');
}

function resolvePricingEyebrow(ctx: Ctx): ContentValue<string> {
  const l = PRICING_LABELS[ctx.normIndustry];
  return cv((l || PRICING_LABELS.general).eyebrow, l ? 'niche' : 'generic', 'pricingLabel');
}
function resolvePricingHeading(ctx: Ctx): ContentValue<string> {
  const l = PRICING_LABELS[ctx.normIndustry];
  return cv((l || PRICING_LABELS.general).heading, l ? 'niche' : 'generic', 'pricingLabel');
}

function resolveEventsEyebrow(ctx: Ctx): ContentValue<string> {
  const l = EVENTS_LABELS[ctx.normIndustry];
  return cv((l || EVENTS_LABELS.general).eyebrow, l ? 'niche' : 'generic', 'eventsLabel');
}
function resolveEventsHeading(ctx: Ctx): ContentValue<string> {
  const l = EVENTS_LABELS[ctx.normIndustry];
  return cv((l || EVENTS_LABELS.general).heading, l ? 'niche' : 'generic', 'eventsLabel');
}

function resolveStoryEyebrow(ctx: Ctx): ContentValue<string> {
  if (ctx.nlu.differentiator) return cv(`The ${titleCase(ctx.nlu.differentiator)} Difference`, 'nlu', 'differentiator');
  const r = nicheVal(STORY_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'storyEyebrow');
}
function resolveHighlightEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(HIGHLIGHT_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'highlightEyebrow');
}
function resolveGalleryEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(GALLERY_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'galleryEyebrow');
}
function resolveContactEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(CONTACT_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'contactEyebrow');
}

function resolveNewsletterEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(NEWSLETTER_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'newsletterEyebrow');
}
function resolveNewsletterHeading(ctx: Ctx): ContentValue<string> {
  return cv(`Join the ${ctx.brand} List`, 'generic', 'brand');
}

function resolveTeamEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(TEAM_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'teamEyebrow');
}
function resolveTeamHeading(ctx: Ctx): ContentValue<string> {
  return cv(`The People Behind ${ctx.brand}`, 'generic', 'brand');
}

function resolveBookingEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(BOOKING_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'bookingEyebrow');
}
function resolveBookingHeading(ctx: Ctx): ContentValue<string> {
  return cv(`Book with ${ctx.brand}`, 'generic', 'brand');
}

function resolveLocationEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(LOCATION_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'locationEyebrow');
}
function resolveLocationHeading(ctx: Ctx): ContentValue<string> {
  return cv(`Find ${ctx.brand}`, 'generic', 'brand');
}

function resolveBlogEyebrow(ctx: Ctx): ContentValue<string> {
  const r = nicheVal(BLOG_EYEBROW, ctx.normIndustry);
  return cv(r.value, r.niched ? 'niche' : 'generic', 'blogEyebrow');
}
function resolveBlogHeading(ctx: Ctx): ContentValue<string> {
  return cv(`Latest from ${ctx.brand}`, 'generic', 'brand');
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Build the ContentPlan — the single source of truth for all user-facing copy.
 *
 * Call after buildWebsiteSpec() and buildLayoutPlan() so section gating (D6) can
 * check whether products/faq/pricing sections actually exist.
 *
 * @param iconPool  — SVG strings for feature icons (from html-renderer.ts ICON_SVGS)
 * @param featureHref — where feature card CTAs link (from html-renderer layout logic)
 */
export function buildContentPlan(
  prompt: string,
  puo: PromptUnderstandingObject,
  spec: WebsiteSpec,
  layoutPlan: LayoutPlan,
  brand: string,
  fp: number,
  iconPool: string[] = [],
  featureHref = 'about',
): ContentPlan {
  const ctx = buildCtx(prompt, puo, spec, layoutPlan, brand, fp);

  const partial = {
    heroHeadline:   resolveHeroHeadline(ctx),
    heroSub:        resolveHeroSub(ctx),
    heroTag:        resolveHeroTag(ctx),
    primaryCta:     resolvePrimaryCta(ctx),
    secondaryCta:   resolveSecondaryCta(ctx),
    sectionEyebrow: resolveSectionEyebrow(ctx),
    featureHeading: resolveFeatureHeading(ctx),
    features:       resolveFeatures(ctx, iconPool.length ? iconPool : ['●'], featureHref),
    stats:          resolveStats(ctx),
    testimonials:   resolveTestimonials(ctx),
    aboutHeading:   resolveAboutHeading(ctx),
    aboutBody:      resolveAboutBody(ctx),
    aboutBullets:   resolveAboutBullets(ctx),
    missionHeading: resolveMissionHeading(ctx),
    missionBody:    resolveMissionBody(ctx),
    galleryHeading: resolveGalleryHeading(ctx),
    products:       resolveProducts(ctx),
    productEyebrow: resolveProductEyebrow(ctx),
    contactHeading: resolveContactHeading(ctx),
    contactSub:     resolveContactSub(ctx),
    ctaHeading:     resolveCtaHeading(ctx),
    ctaSub:         resolveCtaSub(ctx),
    footerTagline:  resolveFooterTagline(ctx),
    faqs:           resolveFaqs(ctx),
    pricingPlans:   resolvePricingPlans(ctx),
    startingPrice:  resolveStartingPrice(ctx),

    // Section labels (Phase 4F)
    faqEyebrow:          resolveFaqEyebrow(ctx),
    faqHeading:          resolveFaqHeading(ctx),
    testimonialsEyebrow: resolveTestimonialsEyebrow(ctx),
    testimonialsHeading: resolveTestimonialsHeading(ctx),
    storyEyebrow:        resolveStoryEyebrow(ctx),
    highlightEyebrow:    resolveHighlightEyebrow(ctx),
    galleryEyebrow:      resolveGalleryEyebrow(ctx),
    contactEyebrow:      resolveContactEyebrow(ctx),
    newsletterEyebrow:   resolveNewsletterEyebrow(ctx),
    newsletterHeading:   resolveNewsletterHeading(ctx),
    teamEyebrow:         resolveTeamEyebrow(ctx),
    teamHeading:         resolveTeamHeading(ctx),
    bookingEyebrow:      resolveBookingEyebrow(ctx),
    bookingHeading:      resolveBookingHeading(ctx),
    locationEyebrow:     resolveLocationEyebrow(ctx),
    locationHeading:     resolveLocationHeading(ctx),
    blogEyebrow:         resolveBlogEyebrow(ctx),
    blogHeading:         resolveBlogHeading(ctx),
    eventsEyebrow:       resolveEventsEyebrow(ctx),
    eventsHeading:       resolveEventsHeading(ctx),
    pricingEyebrow:      resolvePricingEyebrow(ctx),
    pricingHeading:      resolvePricingHeading(ctx),
  };

  return { ...partial, _provenance: computeProvenance(partial) };
}
