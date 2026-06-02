// ---------------------------------------------------------------------------
// PIPELINE AUDIT & FIDELITY TRACER
//
// Instruments every stage of the generation pipeline and produces a
// structured report showing:
//  1. What the user said in their prompt
//  2. What each stage extracted / transformed
//  3. What actually appeared in the final website
//  4. Which user requirements were honoured, ignored, or replaced
//
// Enable via: AUDIT_PIPELINE=1 in env, or call auditPrompt() directly.
// Output written to: public/generated/.audit-{hash}.json (if writable)
//                    or returned as object from auditPrompt().
// ---------------------------------------------------------------------------

import { understandPrompt } from './nlu/index';
import { foldNluIntoPuo } from './nlu/fold';
import { parsePrompt } from './prompt-engine/parser';
import type { NluContent } from './nlu/index';
import type { PromptUnderstandingObject } from './prompt-engine';

// ── Types ───────────────────────────────────────────────────────────────────

export interface StageTrace {
  stage: string;
  inputSummary: Record<string, unknown>;
  outputSummary: Record<string, unknown>;
  transformations: Array<{
    field: string;
    from: string;
    to: string;
    source: 'user-prompt' | 'nlu-extract' | 'niche-template' | 'pick-fallback' | 'hardcoded' | 'computed';
    note?: string;
  }>;
  warnings: string[];
}

export interface FieldFidelity {
  field: string;
  userProvided: boolean;
  userValue: string;       // What the user wrote (or '' if not specified)
  generatedValue: string;  // What ended up in the site
  source: 'user-prompt' | 'nlu-extract' | 'niche-template' | 'pick-fallback' | 'hardcoded' | 'computed';
  match: 'exact' | 'partial' | 'thematic' | 'none' | 'added';  // How well generated matches user intent
  severity: 'ok' | 'warn' | 'critical';
}

export interface FidelityReport {
  prompt: string;
  promptHash: string;

  // Stage-by-stage traces
  stages: {
    nlu: StageTrace;
    parser: StageTrace;
    fold: StageTrace;
    ghostPipeline: StageTrace;  // The 9 "engines" that run but don't affect output
    buildSiteCopy: StageTrace;
  };

  // Per-field comparison
  fieldFidelity: FieldFidelity[];

  // Summary counts
  summary: {
    totalFields: number;
    userProvidedHonoured: number;     // User gave value, it appeared in output
    userProvidedIgnored: number;      // User gave value, it was replaced by template
    templateGenerated: number;        // User gave nothing, template filled it (OK)
    contentAdded: number;             // Content in output user never requested
    criticalIssues: number;
    warnings: number;
  };

  // Ghost pipeline finding
  ghostPipelineAnalysis: {
    conclusion: string;
    evidence: string[];
    stagesRun: string[];
    stagesUsedByRenderer: string[];
    artifactsIgnored: string[];
  };

  // Ranked issues
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    location: string;
    description: string;
    evidence: string;
    userWrote: string;
    siteShows: string;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function promptContains(prompt: string, value: string): boolean {
  if (!value || !prompt) return false;
  const pLower = prompt.toLowerCase();
  const vLower = value.toLowerCase().replace(/\s+/g, ' ').trim();
  if (pLower.includes(vLower)) return true;
  // Check if any 3+ consecutive words from value appear in prompt
  const words = vLower.split(/\s+/).filter(w => w.length > 3);
  if (words.length >= 2) {
    return words.some((w, i) => i > 0 && pLower.includes(words[i - 1] + ' ' + w));
  }
  return false;
}

function classifySource(
  fieldValue: string,
  prompt: string,
  nlu: NluContent,
  isFromNlu: boolean,
): FieldFidelity['source'] {
  if (promptContains(prompt, fieldValue)) return 'user-prompt';
  if (isFromNlu) return 'nlu-extract';
  // Check if it looks like a template pattern
  if (/^The \w+ Story$/.test(fieldValue)) return 'hardcoded';
  if (/^(Why Choose Us|What We Offer|Our Approach)$/.test(fieldValue)) return 'pick-fallback';
  return 'niche-template';
}

function classifyMatch(
  prompt: string,
  userValue: string,
  generatedValue: string,
): FieldFidelity['match'] {
  if (!userValue) return 'added'; // Nothing requested, content was generated
  const gen = generatedValue.toLowerCase();
  const usr = userValue.toLowerCase();
  if (gen === usr) return 'exact';
  if (gen.includes(usr) || usr.includes(gen.slice(0, 20))) return 'partial';
  // Check for thematic overlap (shared keywords)
  const userWords = new Set(usr.split(/\s+/).filter(w => w.length > 4));
  const genWords = gen.split(/\s+/).filter(w => w.length > 4);
  const overlap = genWords.filter(w => userWords.has(w)).length;
  if (overlap >= 2) return 'thematic';
  return 'none';
}

// ── Stage 1: NLU trace ──────────────────────────────────────────────────────

function traceNlu(prompt: string, nlu: NluContent): StageTrace {
  const transformations: StageTrace['transformations'] = [];
  const warnings: string[] = [];

  // Check what was extracted vs what's in the prompt
  if (nlu.brandName) {
    transformations.push({
      field: 'brandName',
      from: '(extracted from prompt)',
      to: nlu.brandName,
      source: 'nlu-extract',
    });
  } else {
    warnings.push('brandName: not extracted — site will use fallback "Brand"');
  }

  if (nlu.location) {
    transformations.push({ field: 'location', from: '(extracted)', to: nlu.location, source: 'nlu-extract' });
  } else if (/\bin\s+[A-Z]/.test(prompt)) {
    warnings.push('location: prompt contains "in [City]" but nothing was extracted — location patterns may need broadening');
  }

  if (nlu.audience) {
    transformations.push({ field: 'audience', from: '(extracted)', to: nlu.audience, source: 'nlu-extract' });
  } else {
    warnings.push('audience: not extracted — contact heading and feature copy will be generic');
  }

  if (nlu.differentiator) {
    transformations.push({ field: 'differentiator', from: '(extracted)', to: nlu.differentiator, source: 'nlu-extract' });
  }

  if (nlu.intentCta) {
    transformations.push({ field: 'intentCta', from: '(extracted from prompt action phrase)', to: nlu.intentCta, source: 'nlu-extract' });
  } else if (/\b(book|order|call|contact|shop|buy|sign up)\b/i.test(prompt)) {
    warnings.push('intentCta: prompt contains action phrase but no CTA was extracted — hero button will use niche default');
  }

  if (nlu.operatingHours) {
    transformations.push({ field: 'operatingHours', from: '(extracted)', to: nlu.operatingHours, source: 'nlu-extract' });
  } else if (/\b(open|hours|monday|tuesday|wednesday|thursday|friday|saturday|sunday|am|pm)\b/i.test(prompt)) {
    warnings.push('operatingHours: prompt may contain hours but nothing was extracted — contact section will be generic');
  }

  if (nlu.phone) {
    transformations.push({ field: 'phone', from: '(extracted)', to: nlu.phone, source: 'nlu-extract' });
  }

  if (nlu.startingPrice) {
    transformations.push({ field: 'startingPrice', from: '(extracted)', to: nlu.startingPrice, source: 'nlu-extract' });
  } else if (/[$€£₱¥₩]\d/.test(prompt) || /\b\d+\s*(?:dollars?|pesos?|euros?|pounds?)\b/i.test(prompt)) {
    warnings.push('startingPrice: prompt contains price but it was not extracted — product cards will show no price');
  }

  if (nlu.sellingPoints && nlu.sellingPoints.length > 0) {
    transformations.push({
      field: 'sellingPoints',
      from: '(user\'s own sentences)',
      to: nlu.sellingPoints.join(' | '),
      source: 'user-prompt',
      note: `${nlu.sellingPoints.length} descriptive sentence(s) extracted`,
    });
  } else {
    warnings.push('sellingPoints: EMPTY — no descriptive sentences extracted from prompt. Hero, about, and features will use niche templates entirely.');
  }

  if (nlu.products && nlu.products.length > 0) {
    const hasUserProducts = nlu.products.some(p => promptContains(prompt, p.name));
    if (hasUserProducts) {
      transformations.push({
        field: 'products',
        from: '(user listed products/services)',
        to: nlu.products.map(p => p.name + (p.price ? ` (${p.price})` : '')).join(', '),
        source: 'user-prompt',
      });
    } else {
      warnings.push(`products: ${nlu.products.length} items were INFERRED from niche profile, not extracted from user's prompt`);
    }
  }

  return {
    stage: 'nlu-extraction',
    inputSummary: { prompt: prompt.slice(0, 200), promptLength: prompt.length },
    outputSummary: {
      industry: nlu.industry,
      brandName: nlu.brandName,
      location: nlu.location,
      audience: nlu.audience,
      differentiator: nlu.differentiator,
      intentCta: nlu.intentCta,
      operatingHours: nlu.operatingHours,
      phone: nlu.phone,
      startingPrice: nlu.startingPrice,
      sellingPointsCount: nlu.sellingPoints?.length ?? 0,
      productsCount: nlu.products?.length ?? 0,
      missionStatement: nlu.missionStatement ?? null,
    },
    transformations,
    warnings,
  };
}

// ── Stage 2: Parser trace ───────────────────────────────────────────────────

function traceParser(prompt: string, nlu: NluContent): StageTrace {
  const parsed = parsePrompt(prompt, undefined, {
    industry: nlu.industry && nlu.industry !== 'general' ? nlu.industry : undefined,
    keywords: nlu.keywords,
  });
  const puo = parsed.success ? parsed.object : parsePrompt('modern professional website').object;

  const warnings: string[] = [];
  if (!parsed.success) {
    warnings.push('Parser failed — fell back to generic "modern professional website" defaults');
  }

  const layoutDir = puo.layout.direction;
  if (!/portfolio|e-commerce|saas|showcase/.test(layoutDir) && (
    /\b(shop|store|buy|order|cart|checkout|product)\b/i.test(prompt) ||
    /\b(portfolio|work|case\s*stud|project)\b/i.test(prompt) ||
    /\b(saas|software|platform|app|dashboard|api)\b/i.test(prompt)
  )) {
    warnings.push(`layoutDirection="${layoutDir}" may not match user's actual business type — could cause wrong section types`);
  }

  return {
    stage: 'deterministic-parser',
    inputSummary: { prompt: prompt.slice(0, 100), industryOverride: nlu.industry, keywordsCount: nlu.keywords.length },
    outputSummary: {
      inferredIndustry: puo.inferredIndustry,
      layoutDirection: puo.layout.direction,
      visualMood: puo.visualMood,
      designStyle: puo.designStyle,
      personality: puo.websitePersonality,
      tone: puo.businessTone,
      primaryColor: puo.visual.colorPalette.primary,
      accentColor: puo.visual.colorPalette.accent,
      confidence: puo.confidence,
    },
    transformations: [
      { field: 'inferredIndustry', from: nlu.industry, to: puo.inferredIndustry, source: 'nlu-extract' },
      { field: 'layoutDirection', from: '(computed from industry+keywords)', to: puo.layout.direction, source: 'computed' },
      { field: 'colorPalette.primary', from: '(niche defaults)', to: puo.visual.colorPalette.primary, source: 'niche-template' },
    ],
    warnings,
  };
}

// ── Stage 3: Ghost pipeline trace ───────────────────────────────────────────

function traceGhostPipeline(): StageTrace {
  return {
    stage: 'ghost-pipeline',
    inputSummary: { note: 'The 9-stage orchestration pipeline runs here' },
    outputSummary: { note: 'Artifacts produced: planning, blueprint, design-dna, component, frontend, motion, validation, scoring, final-rendering' },
    transformations: [
      {
        field: 'ALL 9 STAGE ARTIFACTS',
        from: 'userPrompt',
        to: 'artifacts stored in context.artifacts{}',
        source: 'computed',
        note: 'CRITICAL: These artifacts are NEVER read by the HTML renderer. html-renderer.ts only reads context.input.userPrompt (2 occurrences). The 9 engines run but their output is completely disconnected from the actual HTML generation.',
      },
      {
        field: 'context.artifacts.planning',
        from: 'Extracts: pages[], features[], userFlow[], complexity from prompt keywords',
        to: 'STORED BUT NEVER READ by renderer',
        source: 'computed',
        note: 'extractFeatures() only checks for 10 hardcoded keywords: hero,gallery,contact,blog,shop,auth,dashboard,search,filter,map',
      },
      {
        field: 'context.artifacts.design-dna',
        from: 'Generates colorPalette from 3 boolean flags: isModern, isPlayful, isDark',
        to: 'STORED BUT NEVER READ by renderer',
        source: 'computed',
        note: 'The actual CSS colors come from prompt-engine/parser.ts, not this engine',
      },
      {
        field: 'context.artifacts.blueprint',
        from: 'Builds page blueprints with sections',
        to: 'STORED BUT NEVER READ by renderer',
        source: 'computed',
        note: 'The actual page layout comes from layout-composer/composer.ts, not this engine',
      },
    ],
    warnings: [
      'STRUCTURAL ISSUE: The 9-stage pipeline (planning → blueprint → design-dna → component → frontend → motion → validation → scoring → final-rendering) runs but produces artifacts that are NEVER consumed by the HTML renderer.',
      'html-renderer.ts only uses context.input.userPrompt (to extract the raw prompt). All 9 stage artifacts sit in context.artifacts unused.',
      'The actual website is built ENTIRELY by: (1) NLU understanding, (2) prompt-engine parser, (3) buildSiteCopy() in html-renderer.ts — none of which are pipeline stages.',
      'This means the 9 "engines" add latency and complexity but contribute zero to website fidelity.',
    ],
  };
}

// ── Stage 4: buildSiteCopy trace ────────────────────────────────────────────

function traceBuildSiteCopy(
  prompt: string,
  nlu: NluContent,
  puo: PromptUnderstandingObject,
): { trace: StageTrace; siteCopySnapshot: Record<string, string> } {
  const llmCtx = (puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm || {};
  const strVal = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');

  const audience       = strVal(llmCtx.audience);
  const differentiator = strVal(llmCtx.differentiator);
  const location       = strVal(llmCtx.location);
  const intentCta      = strVal(llmCtx.intentCta);
  const missionStmt    = strVal(llmCtx.missionStatement);
  const sellingPoints  = Array.isArray(llmCtx.sellingPoints) ? (llmCtx.sellingPoints as string[]) : [];
  const products       = Array.isArray(llmCtx.products) ? (llmCtx.products as Array<{name:string;price?:string}>) : [];
  const operatingHours = strVal(llmCtx.operatingHours);
  const phone          = strVal(llmCtx.phone);
  const startingPrice  = strVal(llmCtx.startingPrice);
  const industry       = puo.inferredIndustry;

  const hasSellingPoints = sellingPoints.length > 0;
  const hasProducts = products.length > 0 && products.some(p => promptContains(prompt, p.name));

  const transformations: StageTrace['transformations'] = [];
  const warnings: string[] = [];

  // heroHeadline
  if (hasSellingPoints) {
    transformations.push({ field: 'heroHeadline', from: sellingPoints[0], to: '(derived from sellingPoint[0] via spToTitle)', source: 'user-prompt' });
  } else {
    transformations.push({ field: 'heroHeadline', from: '(no sellingPoints)', to: `pick(headlines[${puo.websitePersonality}], fp)`, source: 'pick-fallback', note: 'Rotates through 8 templates for this personality type' });
    warnings.push('heroHeadline: falling back to pick() — user has no descriptive selling points');
  }

  // heroSub
  if (hasSellingPoints) {
    transformations.push({ field: 'heroSub', from: sellingPoints.slice(0,2).join(' '), to: '(verbatim user sentences)', source: 'user-prompt' });
  } else {
    transformations.push({ field: 'heroSub', from: '(no sellingPoints)', to: 'pick(heroSubPatterns, fp+2)', source: 'pick-fallback' });
    warnings.push('heroSub: falling back to pick() template');
  }

  // primaryCta
  if (intentCta) {
    transformations.push({ field: 'primaryCta', from: `user action phrase → "${intentCta}"`, to: intentCta, source: 'user-prompt' });
  } else {
    transformations.push({ field: 'primaryCta', from: '(no intentCta)', to: `ctaByNiche[${industry}] or ctaMap[direction]`, source: 'niche-template' });
    warnings.push('primaryCta: using niche-template default, not user\'s action phrase');
  }

  // aboutHeading
  const aboutHdg = differentiator && puo.extractedKeywords[0]
    ? `${differentiator} ${puo.extractedKeywords[0]}`
    : missionStmt ? `The ${nlu.brandName || 'Brand'} Mission`
    : audience ? `${nlu.brandName || 'Brand'}: For ${audience}`
    : `The ${nlu.brandName || 'Brand'} Story`;
  transformations.push({
    field: 'aboutHeading',
    from: differentiator ? `differentiator="${differentiator}"` : '(none)',
    to: aboutHdg,
    source: differentiator ? 'nlu-extract' : 'hardcoded',
    note: differentiator ? 'NLU-derived' : 'HARDCODED: "The {Brand} Story"',
  });
  if (!differentiator && !missionStmt && !audience) {
    warnings.push('aboutHeading: no differentiator/mission/audience → falls back to hardcoded "The {Brand} Story"');
  }

  // aboutBody — is it from user's words or template?
  const usesNicheTemplate = !hasSellingPoints;
  transformations.push({
    field: 'aboutBody',
    from: hasSellingPoints ? 'user sellingPoints' : `ABOUT_BODY[${industry}] template function`,
    to: hasSellingPoints ? sellingPoints.slice(0,3).join(' ') : '(niche-specific template with ${brand}, ${mainKw} interpolation)',
    source: hasSellingPoints ? 'user-prompt' : 'niche-template',
    note: usesNicheTemplate ? `TEMPLATE: 14 niche-specific templates, picks by industry="${industry}"` : 'User words verbatim',
  });
  if (usesNicheTemplate) warnings.push('aboutBody: using niche template — does not reflect user\'s actual description');

  // contact section
  if (operatingHours) {
    transformations.push({ field: 'contactSub.hours', from: operatingHours, to: `"We're open ${operatingHours}"`, source: 'user-prompt' });
  } else {
    transformations.push({ field: 'contactSub', from: '(no hours extracted)', to: 'hardcoded "Have a question? Reach out and we\'ll get back to you soon."', source: 'hardcoded' });
    warnings.push('contactSub: closing sentence is hardcoded regardless of user content');
  }

  // testimonials
  transformations.push({
    field: 'testimonials[*].name',
    from: '(not in user prompt)',
    to: 'NAME_POOL[fp % 5][0..2] — "Alex Chen", "Sarah Miller", "Marcus Johnson" etc.',
    source: 'hardcoded',
    note: 'HARDCODED POOL: 5 name pools × 3 names each, seeded by hash',
  });
  transformations.push({
    field: 'testimonials[*].role',
    from: '(not in user prompt)',
    to: `TESTIMONIAL_ROLES[${industry}] — e.g. "Regular Guest", "Food Critic"`,
    source: 'niche-template',
    note: '11 niche-specific role pools',
  });
  transformations.push({
    field: 'testimonials[*].quote',
    from: hasSellingPoints ? 'Uses sellingPoints to parameterise' : '(no user content)',
    to: hasSellingPoints ? '(derived from user words)' : `TESTIMONIAL_QUOTES[${industry}] — templates with \${brand}, \${mainKw}`,
    source: hasSellingPoints ? 'user-prompt' : 'niche-template',
  });

  // sections/layout
  transformations.push({
    field: 'layoutGraph (section order)',
    from: 'puo.layoutDirection, puo.designStyle, puo.websitePersonality',
    to: 'weighted-random section sequence seeded by prompt hash',
    source: 'computed',
    note: `Sections chosen from: cluster|stage|split|gallery|tile|frame|list. Count: ${
      puo.layout.direction === 'e-commerce' || puo.layout.direction === 'saas' ? '6-9' :
      puo.layout.direction === 'portfolio' ? '3-5' : '3-5'
    } sections (${puo.layout.direction} complexity band)`,
  });

  // products section
  if (hasProducts) {
    transformations.push({ field: 'products', from: 'user\'s listed items', to: products.map(p=>p.name).join(', '), source: 'user-prompt' });
  } else if (products.length > 0) {
    transformations.push({
      field: 'products',
      from: '(inferred, not from user)',
      to: products.map(p=>p.name).join(', '),
      source: 'niche-template',
      note: 'Products inferred from niche profile or activity keywords, NOT from user\'s prompt',
    });
    warnings.push('products: showing inferred/template products, not user\'s actual products');
  }

  const siteCopySnapshot: Record<string, string> = {
    heroHeadline_source: hasSellingPoints ? 'user-content' : 'template-pick',
    heroSub_source: hasSellingPoints ? 'user-content' : 'template-pick',
    primaryCta_source: intentCta ? 'user-intent' : 'niche-template',
    aboutHeading_source: differentiator ? 'nlu-derived' : 'hardcoded',
    aboutBody_source: hasSellingPoints ? 'user-content' : 'niche-template',
    testimonials_source: 'hardcoded-names + niche-roles + partial-user-words',
    products_source: hasProducts ? 'user-listed' : 'inferred-from-niche',
    contactSub_source: operatingHours ? 'user-hours' : 'hardcoded-template',
    sectionOrder_source: 'computed-weighted-random (seeded by prompt hash)',
  };

  return {
    trace: {
      stage: 'buildSiteCopy',
      inputSummary: {
        industry,
        hasSellingPoints,
        sellingPointsCount: sellingPoints.length,
        hasAudience: !!audience,
        hasDifferentiator: !!differentiator,
        hasLocation: !!location,
        hasIntentCta: !!intentCta,
        hasOperatingHours: !!operatingHours,
        hasPhone: !!phone,
        hasStartingPrice: !!startingPrice,
        productsFromUser: hasProducts,
      },
      outputSummary: siteCopySnapshot,
      transformations,
      warnings,
    },
    siteCopySnapshot,
  };
}

// ── Field-level fidelity comparison ─────────────────────────────────────────

function buildFieldFidelity(
  prompt: string,
  nlu: NluContent,
  puo: PromptUnderstandingObject,
): FieldFidelity[] {
  const llmCtx = (puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm || {};
  const strVal = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const sellingPoints = Array.isArray(llmCtx.sellingPoints) ? (llmCtx.sellingPoints as string[]) : [];
  const products = Array.isArray(llmCtx.products) ? (llmCtx.products as Array<{name:string;price?:string}>) : [];

  const fidelity: FieldFidelity[] = [];

  const addField = (
    field: string,
    userValue: string,
    generatedValue: string,
    source: FieldFidelity['source'],
  ) => {
    const userProvided = !!userValue || promptContains(prompt, generatedValue);
    const match = classifyMatch(prompt, userValue, generatedValue);
    const severity: FieldFidelity['severity'] =
      userValue && match === 'none' ? 'critical' :
      userValue && match === 'thematic' ? 'warn' :
      source === 'hardcoded' && !userValue ? 'warn' :
      'ok';
    fidelity.push({ field, userProvided: !!userValue, userValue, generatedValue, source, match, severity });
  };

  // Brand name
  addField('brandName', nlu.brandName || '', nlu.brandName || 'Brand', nlu.brandName ? 'nlu-extract' : 'hardcoded');

  // Location
  addField('location', nlu.location || '', nlu.location || '', nlu.location ? 'nlu-extract' : 'pick-fallback');

  // Audience
  addField('audience', nlu.audience || '', nlu.audience || '', nlu.audience ? 'nlu-extract' : 'niche-template');

  // Differentiator
  addField('differentiator', nlu.differentiator || '', nlu.differentiator || '', nlu.differentiator ? 'nlu-extract' : 'niche-template');

  // Intent CTA
  addField('primaryCtaIntent', nlu.intentCta || '', nlu.intentCta || '', nlu.intentCta ? 'user-prompt' : 'niche-template');

  // Operating hours
  addField('operatingHours', nlu.operatingHours || '', nlu.operatingHours || '', nlu.operatingHours ? 'user-prompt' : 'hardcoded');

  // Phone
  addField('phone', nlu.phone || '', nlu.phone || '', nlu.phone ? 'user-prompt' : 'hardcoded');

  // Starting price
  addField('startingPrice', nlu.startingPrice || '', nlu.startingPrice || '', nlu.startingPrice ? 'user-prompt' : 'hardcoded');

  // Hero content source
  addField(
    'heroContent',
    sellingPoints[0] || '',
    sellingPoints.length > 0 ? '(from user sellingPoints)' : '(pick() from niche template bank)',
    sellingPoints.length > 0 ? 'user-prompt' : 'pick-fallback',
  );

  // About body source
  addField(
    'aboutBody',
    sellingPoints.length >= 2 ? sellingPoints.slice(0, 3).join(' ') : '',
    sellingPoints.length > 0 ? '(user sentences used verbatim)' : `ABOUT_BODY["${nlu.industry}"] template`,
    sellingPoints.length > 0 ? 'user-prompt' : 'niche-template',
  );

  // Mission statement
  addField(
    'missionStatement',
    nlu.missionStatement || '',
    nlu.missionStatement || '',
    nlu.missionStatement ? 'user-prompt' : 'niche-template',
  );

  // Products
  const userProductNames = products.filter(p => promptContains(prompt, p.name)).map(p => p.name).join(', ');
  const allProductNames = products.map(p => p.name).join(', ');
  addField('products', userProductNames, allProductNames, userProductNames ? 'user-prompt' : 'niche-template');

  // Testimonial names — always template
  addField('testimonialNames', '', 'Alex Chen, Sarah Miller, Marcus Johnson (etc.)', 'hardcoded');

  // Testimonial roles — niche template
  addField('testimonialRoles', '', `niche-specific roles for "${nlu.industry}"`, 'niche-template');

  // Contact sub closing
  const userHasContactContent = !!(nlu.operatingHours || nlu.phone || nlu.location);
  addField(
    'contactSubClosing',
    userHasContactContent ? 'user contact info' : '',
    userHasContactContent ? '(hours/phone injected)' : 'hardcoded: "Have a question? Reach out and we\'ll get back to you soon."',
    userHasContactContent ? 'user-prompt' : 'hardcoded',
  );

  // Section order
  addField('sectionOrder', '', 'computed from layoutDirection × designStyle × hash', 'computed');

  // Footer tagline
  const hasTaglineSignals = !!(nlu.differentiator || nlu.location || nlu.audience);
  addField(
    'footerTagline',
    hasTaglineSignals ? 'derived from extracted signals' : '',
    hasTaglineSignals ? '(NLU-derived)' : `"${nlu.brandName || 'Brand'} — {niche} done right."`,
    hasTaglineSignals ? 'nlu-extract' : 'niche-template',
  );

  return fidelity;
}

// ── Issues builder ───────────────────────────────────────────────────────────

function buildIssues(
  prompt: string,
  nlu: NluContent,
  puo: PromptUnderstandingObject,
  fieldFidelity: FieldFidelity[],
): FidelityReport['issues'] {
  const issues: FidelityReport['issues'] = [];
  const llmCtx = (puo.customAttributes as { llm?: Record<string, unknown> } | undefined)?.llm || {};
  const sellingPoints = Array.isArray(llmCtx.sellingPoints) ? (llmCtx.sellingPoints as string[]) : [];

  // #1 Ghost pipeline — always critical
  issues.push({
    severity: 'critical',
    location: 'lib/engine/generate.ts + lib/engine/bootstrap.ts',
    description: 'The 9-stage pipeline (planning → blueprint → design-dna → component → frontend → motion → validation → scoring → final-rendering) runs on every generation but NONE of its artifacts are used by the HTML renderer.',
    evidence: 'grep "getArtifact" lib/engine/html-renderer.ts → 0 results. grep "context\\." html-renderer.ts → only context.input.userPrompt (2 occurrences). The renderer builds everything from PUO (NLU understanding), not from pipeline artifacts.',
    userWrote: '(any prompt)',
    siteShows: 'Site content comes entirely from NLU + buildSiteCopy, not from the 9 "engines"',
  });

  // #2 Selling points / hero content
  if (sellingPoints.length === 0) {
    issues.push({
      severity: 'critical',
      location: 'lib/engine/html-renderer.ts:buildSiteCopy → heroHeadline, heroSub',
      description: 'When NLU extracts zero sellingPoints (no descriptive sentences in prompt), heroHeadline and heroSub fall through to pick() — they select from template banks based on personality type, using none of the user\'s actual words.',
      evidence: 'Line 1441-1442: heroHeadline = pick(headlines, fp); Line 1474: pick(heroSubPatterns, fp + 2)',
      userWrote: prompt.slice(0, 100),
      siteShows: '(template headline from personality bank)',
    });
  }

  // #3 Testimonial names always hardcoded
  issues.push({
    severity: 'high',
    location: 'lib/engine/html-renderer.ts:1748-1757 (NAME_POOL)',
    description: 'Testimonial reviewer names are ALWAYS from a hardcoded pool of Western names regardless of business niche or locale. "Alex Chen", "Sarah Miller", "Marcus Johnson" etc. appear on every site.',
    evidence: 'NAME_POOL has 5 pools of 3 names each — all hardcoded. No extraction from prompt. No locale awareness.',
    userWrote: '(any niche, any country)',
    siteShows: '"Alex Chen", "Sarah Miller", "Marcus Johnson" (rotated by hash)',
  });

  // #4 About section template vs user content
  if (sellingPoints.length < 2) {
    issues.push({
      severity: 'high',
      location: 'lib/engine/html-renderer.ts:1773-1869 (ABOUT_BODY)',
      description: '14 hardcoded niche-specific "about" template functions. When the user has fewer than 2 selling points, the about body is taken entirely from these templates, which use only brand name and mainKw — no user-specific content.',
      evidence: `ABOUT_BODY["${nlu.industry}"] function returns parameterized template. User selling points: ${sellingPoints.length}`,
      userWrote: prompt.slice(0, 150),
      siteShows: `Template: "${nlu.industry === 'food' ? 'was born from a genuine passion for [kw]...' : nlu.industry === 'wellness' ? 'was created from the conviction that [kw] should be genuinely accessible...' : 'Generic ' + nlu.industry + ' template'}"`,
    });
  }

  // #5 Products section — inferred vs user-listed
  const products = Array.isArray(llmCtx.products) ? (llmCtx.products as Array<{name:string}>) : [];
  const userProducts = products.filter(p => promptContains(prompt, p.name));
  if (userProducts.length < products.length && products.length > 0) {
    issues.push({
      severity: 'high',
      location: 'lib/engine/nlu/index.ts:inferProductsFromActivity + lib/engine/nlu/lexicon.ts',
      description: `${products.length - userProducts.length} of ${products.length} products/services shown were NOT extracted from the user's prompt — they were inferred from the niche profile or activity keywords.`,
      evidence: `User explicitly listed: ${userProducts.map(p=>p.name).join(', ') || 'none'}. Template/inferred: ${products.filter(p=>!promptContains(prompt,p.name)).map(p=>p.name).join(', ')}`,
      userWrote: products.length > 0 ? 'Products in prompt' : '(no products listed)',
      siteShows: products.map(p=>p.name).join(', '),
    });
  }

  // #6 FAQ section — always niche defaults
  issues.push({
    severity: 'medium',
    location: 'lib/engine/html-renderer.ts:1148-1147 (NICHE_FAQ) + nlu/lexicon.ts profile.faqs',
    description: 'FAQs are ALWAYS from NICHE_FAQ template banks (11 niche-specific sets of 4 Q&As). The user cannot provide custom FAQs unless they use an explicit "FAQ:" section format that extractFaqs() recognizes.',
    evidence: 'resolveFaqs(normIndustry) called at line 1964 — always returns template, never user content unless explicitly tagged.',
    userWrote: '(any prompt without explicit FAQ: format)',
    siteShows: `NICHE_FAQ["${nlu.industry}"] — e.g. "Do you take reservations?", "What are your opening hours?"`,
  });

  // #7 Section layout — user has no control
  issues.push({
    severity: 'medium',
    location: 'lib/engine/layout-composer/composer.ts:795-920 (composeLayoutGraph)',
    description: 'Users cannot request specific sections or section order. The layout graph is generated by weighted-random selection based only on layoutDirection, designStyle, and a hash. Users who say "I want: hero, features, pricing, contact" do NOT get that specific order.',
    evidence: 'buildComposerInput() reads only: visualMood, designStyle, personality, layoutDirection, motion, composition. No user section preferences are passed.',
    userWrote: '(any section request)',
    siteShows: 'Weighted-random section sequence (hero + 3-9 content sections)',
  });

  // #8 Stats — often fabricated
  issues.push({
    severity: 'medium',
    location: 'lib/engine/html-renderer.ts (extractPromptStats + STAT_BANKS)',
    description: 'Stats displayed in the stats section may be fabricated from niche template banks when the user did not provide real numbers. Only explicit numbers in the prompt (years, quantities) are extracted.',
    evidence: 'STAT_BANKS[industry] contains hardcoded credibility numbers per niche.',
    userWrote: '(prompt without explicit stats)',
    siteShows: 'Niche-specific made-up numbers (e.g., "1,200+ Happy Customers", "98% Satisfaction Rate")',
  });

  // #9 Contact section hardcoded content
  if (!nlu.operatingHours && !nlu.phone) {
    issues.push({
      severity: 'low',
      location: 'lib/engine/html-renderer.ts:1942 (contactSub)',
      description: 'Contact section closing text is hardcoded when no hours/phone are extracted.',
      evidence: 'contactSub = "Have a question? Reach out and we\'ll get back to you soon."',
      userWrote: '(no hours or phone in prompt)',
      siteShows: 'Generic contact invitation',
    });
  }

  // #10 PlanningEngine extractFeatures is too narrow
  issues.push({
    severity: 'low',
    location: 'lib/engine/engines/planning.ts:57-60 (extractFeatures)',
    description: 'PlanningEngine.extractFeatures() only checks for 10 hardcoded keywords. Even if this artifact were used, it would miss most user feature requests.',
    evidence: 'keywords = [hero, gallery, contact, blog, shop, auth, dashboard, search, filter, map] — only these 10 trigger page/feature extraction.',
    userWrote: 'Any feature request not in these 10 words',
    siteShows: '(artifact is unused anyway)',
  });

  return issues.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });
}

// ── Main audit function ──────────────────────────────────────────────────────

export function auditPrompt(prompt: string): FidelityReport {
  const nlu = understandPrompt(prompt);
  const parsed = parsePrompt(prompt, undefined, {
    industry: nlu.industry && nlu.industry !== 'general' ? nlu.industry : undefined,
    keywords: nlu.keywords,
  });
  let puo = parsed.success ? parsed.object : parsePrompt('modern professional website').object;
  puo = foldNluIntoPuo(puo, nlu);

  const nluTrace = traceNlu(prompt, nlu);
  const parserTrace = traceParser(prompt, nlu);
  const ghostTrace = traceGhostPipeline();
  const { trace: copTrace, siteCopySnapshot } = traceBuildSiteCopy(prompt, nlu, puo);
  const fieldFidelity = buildFieldFidelity(prompt, nlu, puo);
  const issues = buildIssues(prompt, nlu, puo, fieldFidelity);

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const userProvided = fieldFidelity.filter(f => f.userProvided).length;
  const honoured = fieldFidelity.filter(f => f.userProvided && f.match !== 'none').length;
  const ignored = fieldFidelity.filter(f => f.userProvided && f.match === 'none').length;
  const added = fieldFidelity.filter(f => !f.userProvided && f.source === 'hardcoded').length;
  const templateGenerated = fieldFidelity.filter(f => !f.userProvided && (f.source === 'niche-template' || f.source === 'pick-fallback')).length;

  return {
    prompt,
    promptHash: fnv(prompt).toString(16),
    stages: {
      nlu: nluTrace,
      parser: parserTrace,
      fold: {
        stage: 'fold-nlu-into-puo',
        inputSummary: { nluFieldsPresent: Object.keys(nlu as unknown as Record<string,unknown>).filter(k => (nlu as unknown as Record<string,unknown>)[k] !== undefined).length },
        outputSummary: { llmChannelKeys: Object.keys((puo.customAttributes as {llm?:Record<string,unknown>} | undefined)?.llm || {}) },
        transformations: [
          { field: 'customAttributes.llm', from: 'NluContent fields', to: 'Merged into PUO.customAttributes.llm channel', source: 'nlu-extract', note: 'All NLU fields stashed here for renderer consumption' },
        ],
        warnings: [],
      },
      ghostPipeline: ghostTrace,
      buildSiteCopy: copTrace,
    },
    fieldFidelity,
    summary: {
      totalFields: fieldFidelity.length,
      userProvidedHonoured: honoured,
      userProvidedIgnored: ignored,
      templateGenerated,
      contentAdded: added,
      criticalIssues: criticalCount,
      warnings: highCount,
    },
    ghostPipelineAnalysis: {
      conclusion: 'The 9-stage orchestration pipeline (planning → blueprint → design-dna → component → frontend → motion → validation → scoring → final-rendering) runs on EVERY website generation but contributes ZERO to the actual HTML output. It is a ghost pipeline.',
      evidence: [
        'html-renderer.ts only reads context.input.userPrompt (2 usages). Zero calls to context.getArtifact().',
        'renderMultiPageSiteInner() builds the site entirely from: (1) PUO (NLU understanding), (2) composeLayoutGraph(buildComposerInput(puo)), (3) buildSiteCopy(puo, brand, fp)',
        'DesignDNAEngine produces colorPalette from 3 boolean flags; CSS colors come from prompt-engine/parser.ts instead',
        'PlanningEngine extracts pages/features from 10 hardcoded keywords; actual page structure comes from getHiddenPageConfig(normIndustry)',
        'All 9 engines run sequentially and waste latency with zero fidelity benefit',
      ],
      stagesRun: ['planning', 'blueprint', 'design-dna', 'component', 'frontend', 'motion', 'validation', 'scoring', 'final-rendering'],
      stagesUsedByRenderer: [],
      artifactsIgnored: ['planning', 'blueprint', 'design-dna', 'component', 'frontend', 'motion', 'validation', 'scoring', 'final-rendering'],
    },
    issues,
  };
}
