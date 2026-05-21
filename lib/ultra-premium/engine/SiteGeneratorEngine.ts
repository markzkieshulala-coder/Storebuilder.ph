// @ts-nocheck
/**
 * ============================================================================
 * SITE GENERATOR ENGINE — ORCHESTRATION LAYER
 * ============================================================================
 * This module defines the complete pseudo-code flow and function signatures
 * for the backend pipeline that generates a SiteBlueprint from a user prompt.
 *
 * Pipeline: Prompt → NicheExtraction → VocabularyResolution → StructuralChoreography
 *           → ThemeGeneration → CopyGeneration → 3DParamGeneration → SchemaAssembly
 *           → Validation → Output
 */

import { SiteBlueprint, Page, Section, ComponentConfig, BackgroundLayer, ThreeDParams, ColorPalette, TypographySpec, NicheCopy, ComponentName, AssetSlot } from "../types/SiteBlueprint";
import { SiteAssemblyPlan, PageAssembly, assembleSite, resolveSlot, ChoreographerSeed } from "./StructuralChoreographer";
import { NicheVocabulary, resolveNicheVocabulary, validateNoGenericCopy, BANNED_GENERIC_WORDS } from "./NicheVocabularyEngine";
import { ComponentRegistryEntry, ComponentVariant, getComponentByName } from "../registry/ComponentRegistry";
import {
  generateUniqueImageURL,
  hydrateComponentAssets,
  extractPreloadImageUrls,
  validateImageUniqueness,
  ImageURLResult,
  AssetHydrationPatch,
} from "../pipeline/AssetHydrator";

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 1: INPUT & NICHE EXTRACTION
// ═════════════════════════════════════════════════════════════════════════════

interface ParsedPrompt {
  raw: string;
  niche: string;
  nicheConfidence: number;        // 0.0 - 1.0
  moodKeywords: string[];         // e.g., ["modern", "aggressive", "cinematic"]
  pageCountHint?: number;         // if user implies number of pages
  targetAudience?: string;
}

/**
 * Extracts niche, mood, and metadata from the user's natural-language prompt.
 * Uses keyword extraction + lightweight LLM inference in production.
 */
function parseUserPrompt(prompt: string): ParsedPrompt {
  // PSEUDO-CODE:
  // 1. Lowercase and tokenize the prompt.
  // 2. Match against niche keyword dictionary (basketball, watchmaking, cybersecurity, etc.).
  // 3. Extract mood adjectives via sentiment/lexicon matching.
  // 4. Check for explicit page count hints ("3-page", "multi-page", "landing page").
  // 5. Return structured ParsedPrompt.

  return {
    raw: prompt,
    niche: "<extracted>",
    nicheConfidence: 0.95,
    moodKeywords: ["modern", "cinematic"],
    pageCountHint: undefined,
    targetAudience: undefined,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 2: VOCABULARY RESOLUTION
// ═════════════════════════════════════════════════════════════════════════════

interface ResolvedVocabulary {
  vocabulary: NicheVocabulary;
  wasSynthesized: boolean;
  fallbackReason?: string;
}

/**
 * Resolves or synthesizes a niche-specific vocabulary set.
 * Throws if generic words are detected in the resolved output.
 */
function resolveVocabulary(parsed: ParsedPrompt): ResolvedVocabulary {
  // PSEUDO-CODE:
  // 1. Call resolveNicheVocabulary(parsed.niche, parsed.raw).
  // 2. If niche unrecognized, trigger synthesis from moodKeywords + raw prompt.
  // 3. Validate every string in the vocabulary against BANNED_GENERIC_WORDS.
  // 4. If violation found, attempt 1 automatic rewrite using niche synonyms.
  // 5. If still violated, throw VocabularyResolutionError.

  const vocab = resolveNicheVocabulary(parsed.niche, parsed.raw);

  // Validate all vocabulary strings
  const allStrings = [
    ...vocab.nav,
    ...vocab.buttons,
    ...vocab.labels,
    ...vocab.verbs,
    ...vocab.adjectives,
    ...vocab.footerLinks,
    ...vocab.socialVerbs,
  ];

  for (const str of allStrings) {
    validateNoGenericCopy(str);
  }

  return {
    vocabulary: vocab,
    wasSynthesized: false,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 3: STRUCTURAL CHOREOGRAPHY
// ═════════════════════════════════════════════════════════════════════════════

interface ChoreographyResult {
  plan: SiteAssemblyPlan;
  seed: ChoreographerSeed;
}

/**
 * Generates the structural skeleton: which components on which pages.
 * Guarantees variation score ≥ 0.75.
 */
function generateStructure(parsed: ParsedPrompt, userId?: string): ChoreographyResult {
  // PSEUDO-CODE:
  // 1. Build ChoreographerSeed from parsed data + current timestamp.
  // 2. Call assembleSite(seed, constraints).
  // 3. If assembly throws (insufficient 3D, low variation, etc.),
  //    relax constraints by 1 step and retry (max 3 retries).
  // 4. Return the SiteAssemblyPlan.

  const seed: ChoreographerSeed = {
    niche: parsed.niche,
    prompt: parsed.raw,
    timestamp: new Date().toISOString(),
    userId,
  };

  const constraints = {
    minPages: parsed.pageCountHint ?? 3,
    maxPages: Math.min((parsed.pageCountHint ?? 3) + 2, 5),
    minComponentsPerPage: 3,
    maxComponentsPerPage: 7,
    requireUniqueHero: true,
    requireFooter: true,
    requireNav: true,
    maxRepeatComponent: 2,
    require3DCount: 2,
    requireShaderCount: 2,
    diversificationThreshold: 0.75,
  };

  const plan = assembleSite(seed, constraints);

  return { plan, seed };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 4: THEME GENERATION
// ═════════════════════════════════════════════════════════════════════════════

interface GeneratedTheme {
  typography: TypographySpec;
  colors: ColorPalette;
  spacing: any; // SpacingScale
  globalBackground: BackgroundLayer | null;
}

/**
 * Generates a complete design system (colors, typography, spacing, background)
 * tuned to the niche and mood keywords.
 */
function generateTheme(parsed: ParsedPrompt): GeneratedTheme {
  // PSEUDO-CODE:
  // 1. Select color palette based on niche emotional register:
  //    - Basketball: high-energy (court orange, arena black, floodlight white, jersey blue, gold)
  //    - Watchmaking: restrained elegance (atelier black, champagne gold, ivory, steel, ruby)
  //    - Cybersecurity: alert precision (terminal black, secure green, threat red, data blue)
  // 2. Select typography based on genre:
  //    - High-energy → compressed sans-serif (Bebas Neue, Oswald)
  //    - Elegant → high-contrast serif (Bodoni Moda, Playfair Display)
  //    - Technical → geometric sans + monospace (Inter, JetBrains Mono)
  // 3. Build spacing scale from 4px/0.25rem base unit.
  // 4. Generate globalBackground based on mood (aurora for elegant, particleField for tech, etc.).

  return {
    typography: {
      headingFont: "Inter",
      bodyFont: "Inter",
      accentFont: "JetBrains Mono",
      headingScale: [4, 3, 2, 1.5],
      bodySize: "1rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.6,
      textTransform: "none",
    },
    colors: {
      primary: "#FF4D00",
      secondary: "#1A1A1A",
      accent: "#FFD700",
      surface: "#F2F2F2",
      background: "#0A0A0A",
      textPrimary: "#FFFFFF",
      textSecondary: "#A0A0A0",
      textMuted: "#555555",
      gradients: [
        { from: "#FF4D00", to: "#FFD700", angle: 135 },
        { from: "#1A1A1A", to: "#333333", angle: 90 },
      ],
    },
    spacing: {
      unit: 4,
      scale: ["0.25rem", "0.5rem", "1rem", "2rem", "4rem", "8rem", "16rem"],
      sectionPadding: "8rem",
      containerMaxWidth: "1400px",
      gridGap: "2rem",
    },
    globalBackground: null,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 5: COPY GENERATION
// ═════════════════════════════════════════════════════════════════════════════

interface GeneratedCopy {
  nicheCopy: NicheCopy;
  sectionCopies: Array<{
    pageIndex: number;
    sectionIndex: number;
    heading: string;
    body: string;
    cta?: string;
    microCopy: string[];
  }>;
}

/**
 * Generates all textual content using the resolved vocabulary.
 * Every string is validated against banned generic words.
 */
function generateCopy(
  parsed: ParsedPrompt,
  vocabulary: NicheVocabulary,
  plan: SiteAssemblyPlan
): GeneratedCopy {
  // PSEUDO-CODE:
  // 1. Build navigation labels from vocabulary.nav (pick first N where N = num pages + extras).
  // 2. Build hero copy using vocabulary.verbs + vocabulary.adjectives + niche nouns.
  // 3. For each component slot in the plan:
  //    a. Identify component category (hero/showcase/content/conversion/etc.).
  //    b. Select headline formula based on category:
  //       - Hero: [VERB] + [ADJECTIVE] + [NICHE CONCEPT]
  //       - Showcase: [ADJECTIVE] + [NICHE COLLECTION/ITEM] + [VERB PHRASE]
  //       - Content: [NICHE CONCEPT] + [VERB] + [OUTCOME]
  //       - Conversion: [VERB] + [ADJECTIVE] + [ACTION NOUN]
  //    c. Generate body paragraph (2-3 sentences) expanding the headline.
  //    d. Generate CTA from vocabulary.buttons (rotate through list).
  //    e. Generate 2-4 microCopy strings (feature callouts, stats, tags).
  // 4. Validate every generated string against BANNED_GENERIC_WORDS.
  // 5. Build footer copy from vocabulary.footerLinks + vocabulary.socialVerbs.

  return {
    nicheCopy: {
      navigation: [],
      hero: { headline: "", subheadline: "", ctaPrimary: "", ctaSecondary: "" },
      sections: [],
      footer: { links: [], copyright: "", tagline: "" },
    },
    sectionCopies: [],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 6: 3D & SHADER PARAMETER GENERATION
// ═════════════════════════════════════════════════════════════════════════════

function generateThreeDParams(
  componentName: ComponentName,
  variantId: number,
  moodKeywords: string[]
): ThreeDParams {
  // PSEUDO-CODE:
  // 1. Look up component in registry; check if required3D or requiredShader.
  // 2. If required3D:
  //    a. Select geometry based on component category:
  //       - Hero: "morphSphere" or "torusKnot"
  //       - Showcase: "splineTerrain" or "icosahedron"
  //       - Interactive: "particleCloud" or "instancedMesh"
  //    b. Select materialType based on mood (physical for luxury, shader for tech).
  //    c. Derive colorPalette from theme colors.
  //    d. Set animation type (orbit for calm, pulse for energetic, wind for fluid).
  //    e. Configure lighting (always include ambient + directional).
  //    f. Enable postProcessing based on component (bloom for heroes, chromaticAberration for transitions).
  // 3. If requiredShader:
  //    a. Select shaderName from registry (perlinNoise, voronoiDisplacement, etc.).
  //    b. Set uniforms based on component variant's structuralDiff.
  //    c. Set blendMode.

  return {
    geometry: "morphSphere",
    materialType: "shader",
    colorPalette: ["#FF4D00", "#1A1A1A", "#FFD700"],
    animation: {
      type: "pulse",
      speed: 0.5,
      intensity: 1.0,
      mouseInteraction: true,
    },
    lighting: {
      ambient: { color: "#222222", intensity: 0.4 },
      directional: { color: "#FFFFFF", intensity: 1.2, position: [5, 10, 7] },
    },
    postProcessing: {
      bloom: true,
      chromaticAberration: false,
      depthOfField: true,
      vignette: true,
    },
  };
}

function generateBackgroundLayer(
  componentName: ComponentName,
  variantId: number,
  pageIndex: number,
  moodKeywords: string[]
): BackgroundLayer {
  // PSEUDO-CODE:
  // 1. Decide background type based on page position and component category:
  //    - Page 0 Hero: "nebulaDepth" or "cinematicVideo"
  //    - Content sections: "gradientMesh" or "shaderNoise"
  //    - Conversion sections: "liquidSimulation" or "auroraBorealis"
  //    - Footer: "kineticTypographyField" or "strokeReveal"
  // 2. Set zIndex and opacity based on structural role (hero = -1, content = 0, overlay = 1).
  // 3. Call generateThreeDParams or generateShaderParams as needed.
  // 4. Set scrollBehavior from component registry entry.

  const params = generateThreeDParams(componentName, variantId, moodKeywords);

  return {
    type: "nebulaDepth",
    zIndex: -1,
    opacity: 0.85,
    params,
    scrollBehavior: "parallax",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 7: SCHEMA ASSEMBLY
// ═════════════════════════════════════════════════════════════════════════════

function assembleSiteBlueprint(
  parsed: ParsedPrompt,
  vocabulary: NicheVocabulary,
  structure: ChoreographyResult,
  theme: GeneratedTheme,
  copy: GeneratedCopy
): SiteBlueprint {
  // PSEUDO-CODE:
  // 1. Initialize SiteBlueprint with top-level fields (version, generatedAt, seed, niche, prompt).
  // 2. Assign theme (typography, colors, spacing, globalBackground).
  // 3. Build navigation object:
  //    a. nav.items[] from copy.nicheCopy.navigation, each mapped to page paths.
  //    b. nav.style selected based on niche (floatingPill for modern, minimalBar for elegant, helixMorph for tech).
  //    c. nav.scrollBehavior selected based on mood.
  // 4. For each page in structure.plan.pages:
  //    a. Create Page object with id, path, meta, sections[], globalNav, transition.
  //    b. For each component slot in page.components:
  //       i. Resolve component entry and variant via resolveSlot().
  //       ii. Create Section with id, name, order.
  //       iii. Build ComponentConfig with name, componentId (hash), props (from registry propSchema defaults + niche overrides), entrance (from variant), duration, staggerDelay, scrollTrigger, background.
  //       iv. Assign copy from copy.sectionCopies matching (pageIndex, sectionIndex).
  //       v. Assign layoutVariant = variant.id.
  //       vi. Assign responsiveBreak based on component registry notes.
  //    c. Sort sections by order.
  // 5. Assign globalAssets (fonts, icons, preloadedImages based on used components).
  // 6. Assign copy (nicheCopy).
  // 7. Assign choreographer metadata (usedComponents, variationSeed, structuralHash).
  // 8. Return complete SiteBlueprint.

  const plan = structure.plan;

  const pages: Page[] = plan.pages.map((page, pageIdx) => {
    const sections: Section[] = page.components
      .filter((c) => c.position >= 0 && c.position < 999)
      .map((slot, slotIdx) => {
        const resolved = resolveSlot(plan, pageIdx, slotIdx);
        if (!resolved) {
          throw new Error(`Failed to resolve slot: page=${pageIdx}, slot=${slotIdx}`);
        }

        const { entry, variant } = resolved;
        const sectionCopy = copy.sectionCopies.find(
          (sc) => sc.pageIndex === pageIdx && sc.sectionIndex === slotIdx
        );

        const background = entry.required3D || entry.requiredShader
          ? generateBackgroundLayer(slot.name, slot.variantId, pageIdx, parsed.moodKeywords)
          : null;

        // ── ASSET HYDRATION: generate unique image URLs for every asset slot ──
        const baseProps = generatePropsFromSchema(entry, vocabulary, parsed);
        const hydratedAssets = hydrateComponentAssets({
          componentName: slot.name,
          componentId: slot.instanceHash,
          assetSlots: entry.assetSlots ?? [],
          baseProps,
          copyContext: {
            headline: sectionCopy?.heading ?? `${parsed.niche.toUpperCase()} SECTION ${slotIdx + 1}`,
            body: sectionCopy?.body ?? "",
            cta: sectionCopy?.cta ?? "",
          },
          nicheContext: {
            nicheName: parsed.niche,
            vocabulary: vocabulary,
          },
          imageProvider: "pollinations",
          seedOffset: pageIdx * 100 + slotIdx,
        });

        return {
          id: `section-${pageIdx}-${slotIdx}`,
          name: entry.name,
          order: slot.position,
          component: {
            name: slot.name,
            componentId: slot.instanceHash,
            props: { ...baseProps, ...hydratedAssets.patchedProps },
            assetSlots: hydratedAssets.hydratedSlots,
            entrance: selectEntranceForVariant(entry, variant),
            duration: 800 + variant.entranceStagger,
            staggerDelay: variant.entranceStagger,
            scrollTrigger: {
              trigger: `section-${pageIdx}-${slotIdx}`,
              start: "top 80%",
              end: "bottom 20%",
              scrub: false,
              pin: false,
            },
            background,
          },
          copy: {
            heading: sectionCopy?.heading ?? `${parsed.niche.toUpperCase()} SECTION ${slotIdx + 1}`,
            body: sectionCopy?.body ?? "Generated body content.",
            cta: sectionCopy?.cta,
            microCopy: sectionCopy?.microCopy ?? [],
          },
          layoutVariant: variant.id,
          responsiveBreak: "desktop",
        };
      });

    // Sort sections by order
    sections.sort((a, b) => a.order - b.order);

    return {
      id: `page-${pageIdx}`,
      path: page.pagePath,
      meta: {
        title: `${parsed.niche.toUpperCase()} — ${pageIdx === 0 ? "HUB" : `ZONE ${pageIdx}`}`,
        description: `Explore the ${parsed.niche} experience. Page ${pageIdx + 1}.`,
      },
      sections,
      globalNav: pageIdx === 0 || pageIdx < 3,
      transition: selectPageTransition(pageIdx, parsed.moodKeywords),
    };
  });

  return {
    version: "2.0.0-ultra-premium",
    generatedAt: new Date().toISOString(),
    seed: structure.plan.seed,
    niche: parsed.niche,
    prompt: parsed.raw,
    theme: {
      typography: theme.typography,
      colors: theme.colors,
      spacing: theme.spacing,
      globalBackground: theme.globalBackground,
    },
    pages,
    navigation: {
      items: copy.nicheCopy.navigation.map((label, idx) => ({
        label,
        path: pages[idx]?.path ?? "/",
        isCta: idx === copy.nicheCopy.navigation.length - 1,
      })),
      style: selectNavStyle(parsed.niche),
      scrollBehavior: selectNavScrollBehavior(parsed.moodKeywords),
    },
    globalAssets: {
      fonts: [theme.typography.headingFont, theme.typography.bodyFont, theme.typography.accentFont],
      icons: [],
      preloadedImages: extractPreloadImageUrls(pages.flatMap((p) =>
        p.sections
          .filter((s) => s.component.assetSlots && s.component.assetSlots.length > 0)
          .flatMap((s) => s.component.assetSlots!)
          .filter((slot): slot is AssetSlot & { generatedUrl: string } => !!slot.generatedUrl)
          .map((slot) => ({ url: slot.generatedUrl!, seed: slot.derivedSeed! }))
      )),
      threeDModels: pages.flatMap((p) =>
        p.sections
          .filter((s) => s.component.background?.params && "geometry" in (s.component.background.params as any))
          .map((s) => (s.component.background!.params as ThreeDParams).geometry)
      ),
    },
    copy: copy.nicheCopy,
    choreographer: {
      usedComponents: plan.usedComponents,
      variationSeed: plan.seed,
      structuralHash: plan.structuralHash,
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

function generatePropsFromSchema(
  entry: ComponentRegistryEntry,
  _vocab: NicheVocabulary,
  _parsed: ParsedPrompt
): Record<string, unknown> {
  // PSEUDO-CODE:
  // 1. Iterate over entry.propSchema.
  // 2. For each prop, generate a default value matching the type:
  //    - "string" → niche-specific placeholder text
  //    - "number" → 0 or component-specific default
  //    - "boolean" → false or component-specific default
  //    - "array" → []
  //    - "object" → {}
  // 3. Override with vocabulary-derived values where the prop name suggests text content.
  const props: Record<string, unknown> = {};
  for (const [key, type] of Object.entries(entry.propSchema)) {
    switch (type) {
      case "string":
        props[key] = key.includes("headline") || key.includes("text") || key.includes("cta")
          ? "<niche-specific-text>"
          : "";
        break;
      case "number":
        props[key] = 0;
        break;
      case "boolean":
        props[key] = false;
        break;
      case "array":
        props[key] = [];
        break;
      case "object":
        props[key] = {};
        break;
    }
  }
  return props;
}

function selectEntranceForVariant(
  _entry: ComponentRegistryEntry,
  variant: ComponentVariant
): any {
  // Map variant structuralDiff keywords to AnimationEntrance values
  const diff = variant.structuralDiff.toLowerCase();
  if (diff.includes("split") || diff.includes("reveal")) return "clipReveal";
  if (diff.includes("drop") || diff.includes("cascade")) return "fadeUp";
  if (diff.includes("orbit") || diff.includes("rotate")) return "rotateIn";
  if (diff.includes("type") || diff.includes("terminal")) return "charStagger";
  if (diff.includes("scale") || diff.includes("expand")) return "scaleIn";
  if (diff.includes("blur") || diff.includes("glass")) return "blurIn";
  if (diff.includes("draw") || diff.includes("line")) return "lineDraw";
  if (diff.includes("liquid") || diff.includes("morph")) return "morphShape";
  return "fadeUp";
}

function selectPageTransition(pageIndex: number, moodKeywords: string[]): any {
  if (pageIndex === 0) return "fade";
  if (moodKeywords.includes("cinematic") || moodKeywords.includes("dramatic")) {
    return ["morph", "pageTurn", "zoom"][pageIndex % 3];
  }
  if (moodKeywords.includes("modern") || moodKeywords.includes("clean")) {
    return ["slide", "fade", "morph"][pageIndex % 3];
  }
  return "fade";
}

function selectNavStyle(niche: string): any {
  const n = niche.toLowerCase();
  if (n.includes("sport") || n.includes("basketball")) return "helixMorph";
  if (n.includes("luxury") || n.includes("watch")) return "transparentGlass";
  if (n.includes("tech") || n.includes("security")) return "floatingPill";
  return "minimalBar";
}

function selectNavScrollBehavior(moodKeywords: string[]): any {
  if (moodKeywords.includes("cinematic") || moodKeywords.includes("immersive")) return "glassMorphism";
  if (moodKeywords.includes("modern") || moodKeywords.includes("clean")) return "shrink";
  if (moodKeywords.includes("aggressive") || moodKeywords.includes("bold")) return "colorShift";
  return "hide";
}

// ═════════════════════════════════════════════════════════════════════════════
// PHASE 8: VALIDATION & OUTPUT
// ═════════════════════════════════════════════════════════════════════════════

class BlueprintValidationError extends Error {
  constructor(public violations: string[]) {
    super(`Blueprint validation failed with ${violations.length} violation(s): ${violations.join("; ")}`);
  }
}

/**
 * Validates the complete SiteBlueprint against all rules.
 * Throws BlueprintValidationError if any rule is violated.
 */
function validateSiteBlueprint(blueprint: SiteBlueprint): void {
  const violations: string[] = [];

  // 1. Validate no generic words in any text field
  function scanForBanned(obj: any, path: string) {
    if (typeof obj === "string") {
      const lower = obj.toLowerCase();
      for (const banned of BANNED_GENERIC_WORDS) {
        if (lower.includes(banned)) {
          violations.push(`BANNED_WORD at ${path}: contains "${banned}" in "${obj}"`);
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, idx) => scanForBanned(item, `${path}[${idx}]`));
    } else if (obj && typeof obj === "object") {
      for (const [key, val] of Object.entries(obj)) {
        scanForBanned(val, `${path}.${key}`);
      }
    }
  }
  scanForBanned(blueprint, "blueprint");

  // 2. Validate component diversity
  const usedComponents = new Set<ComponentName>();
  const componentCounts: Record<string, number> = {};
  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      usedComponents.add(section.component.name);
      componentCounts[section.component.name] = (componentCounts[section.component.name] || 0) + 1;
    }
  }
  if (usedComponents.size < 8) {
    violations.push(`DIVERSITY: Only ${usedComponents.size} unique components used (minimum 8)`);
  }
  for (const [comp, count] of Object.entries(componentCounts)) {
    if (count > 2) {
      violations.push(`DIVERSITY: Component "${comp}" used ${count} times (maximum 2)`);
    }
  }

  // 3. Validate hero uniqueness
  const heroes = blueprint.pages.map((p) => p.sections[0]?.component.name).filter(Boolean);
  const uniqueHeroes = new Set(heroes);
  if (uniqueHeroes.size !== heroes.length) {
    violations.push(`HERO_UNIQUENESS: Duplicate hero components across pages`);
  }

  // 4. Validate 3D and shader minimums
  let threeDCount = 0;
  let shaderCount = 0;
  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      const entry = getComponentByName(section.component.name);
      if (entry?.required3D) threeDCount++;
      if (entry?.requiredShader) shaderCount++;
    }
  }
  if (threeDCount < 2) violations.push(`3D_MINIMUM: Only ${threeDCount} 3D components (minimum 2)`);
  if (shaderCount < 2) violations.push(`SHADER_MINIMUM: Only ${shaderCount} shader components (minimum 2)`);

  // 5. Validate schema completeness
  if (!blueprint.theme.colors.primary) violations.push("THEME: Missing primary color");
  if (!blueprint.theme.typography.headingFont) violations.push("THEME: Missing heading font");
  if (blueprint.pages.length < 3) violations.push(`PAGES: Only ${blueprint.pages.length} pages (minimum 3)`);

  // 6. Validate image asset pipeline
  const imageSeeds = new Set<number>();
  const imageUrls = new Set<string>();
  const bareNichePatterns = new RegExp(`^${blueprint.niche}\\s+(image|photo|picture|background)$`, "i");
  for (const page of blueprint.pages) {
    for (const section of page.sections) {
      const slots = section.component.assetSlots;
      if (!slots) continue;
      for (const slot of slots) {
        if (!slot.generatedUrl) {
          violations.push(`ASSET: Missing generatedUrl for ${section.component.name}.${slot.targetProp}`);
          continue;
        }
        // URL uniqueness
        if (imageUrls.has(slot.generatedUrl)) {
          violations.push(`ASSET_DUPLICATE: URL reused for ${section.component.name}.${slot.targetProp}`);
        }
        imageUrls.add(slot.generatedUrl);

        // Seed uniqueness
        if (slot.derivedSeed !== undefined) {
          if (imageSeeds.has(slot.derivedSeed)) {
            violations.push(`ASSET_DUPLICATE: Seed ${slot.derivedSeed} reused`);
          }
          imageSeeds.add(slot.derivedSeed);
        }

        // Check seed is present in URL
        const seedMatch = slot.generatedUrl.match(/[?&]seed=(\d+)/);
        if (!seedMatch) {
          violations.push(`ASSET_NO_SEED: URL missing seed param for ${section.component.name}.${slot.targetProp}`);
        }

        // Check prompt quality
        if (slot.generatedPrompt) {
          const promptLower = slot.generatedPrompt.toLowerCase();
          if (bareNichePatterns.test(promptLower) || promptLower === blueprint.niche.toLowerCase()) {
            violations.push(`ASSET_BARE_PROMPT: Bare niche name used as prompt for ${section.component.name}.${slot.targetProp}`);
          }
        }
      }
    }
  }

  // 7. Validate preloadedImages matches assetSlots
  const expectedPreloadCount = imageUrls.size;
  const actualPreloadCount = blueprint.globalAssets.preloadedImages.length;
  if (actualPreloadCount !== expectedPreloadCount) {
    violations.push(`ASSET_PRELOAD: preloadedImages has ${actualPreloadCount} items, expected ${expectedPreloadCount}`);
  }

  if (violations.length > 0) {
    throw new BlueprintValidationError(violations);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR PIPELINE
// ═════════════════════════════════════════════════════════════════════════════

export interface GeneratorResult {
  blueprint: SiteBlueprint;
  plan: SiteAssemblyPlan;
  generationTimeMs: number;
  passedValidation: boolean;
  validationErrors?: string[];
}

/**
 * The main entry point. Accepts a user prompt and produces a SiteBlueprint.
 *
 * FULL PIPELINE:
 * 1. parseUserPrompt(prompt)
 * 2. resolveVocabulary(parsed)
 * 3. generateStructure(parsed, userId)
 * 4. generateTheme(parsed)
 * 5. generateCopy(parsed, vocabulary, plan)
 * 6. generateThreeDParams / generateBackgroundLayer (per section)
 * 7. assembleSiteBlueprint(parsed, vocabulary, structure, theme, copy)
 * 8. validateSiteBlueprint(blueprint)
 * 9. Return GeneratorResult
 */
export function generateSite(userPrompt: string, userId?: string): GeneratorResult {
  const startTime = Date.now();

  // Phase 1
  const parsed = parseUserPrompt(userPrompt);

  // Phase 2
  const vocabResult = resolveVocabulary(parsed);

  // Phase 3
  const structure = generateStructure(parsed, userId);

  // Phase 4
  const theme = generateTheme(parsed);

  // Phase 5
  const copy = generateCopy(parsed, vocabResult.vocabulary, structure.plan);

  // Phase 6 & 7
  const blueprint = assembleSiteBlueprint(parsed, vocabResult.vocabulary, structure, theme, copy);

  // Phase 8 — validation is non-fatal while pseudo-code stubs are in place
  let passedValidation = false;
  let validationErrors: string[] = [];
  try {
    validateSiteBlueprint(blueprint);
    passedValidation = true;
  } catch (err) {
    if (err instanceof BlueprintValidationError) {
      validationErrors = err.violations;
    }
    // Non-fatal: return blueprint with passedValidation=false so caller can decide
  }

  const generationTimeMs = Date.now() - startTime;

  return {
    blueprint,
    plan: structure.plan,
    generationTimeMs,
    passedValidation,
    validationErrors: validationErrors.length ? validationErrors : undefined,
  };
}
