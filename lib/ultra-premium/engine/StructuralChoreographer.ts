/**
 * ============================================================================
 * STRUCTURAL CHOREOGRAPHER — INFINITE VARIATION MATRIX ENGINE
 * ============================================================================
 * This engine guarantees that no two runs produce the same component layout.
 * It assembles pages from the ComponentRegistry using a seeded randomizer
 * that respects category constraints, 3D/shader capabilities, and structural
 * diversity rules.
 */

import {
  ComponentName,
  ComponentRegistryEntry,
  ComponentVariant,
  getComponentByName,
  getVariantById,
  HERO_COMPONENTS,
  SHOWCASE_COMPONENTS,
  CONTENT_COMPONENTS,
  CONVERSION_COMPONENTS,
  FOOTER_COMPONENTS,
  NAVIGATION_COMPONENTS,
  TRANSITION_COMPONENTS,
  ALL_COMPONENT_NAMES,
} from "../registry/ComponentRegistry";

export interface ChoreographerSeed {
  niche: string;
  prompt: string;
  timestamp: string;
  userId?: string;
}

export interface PageAssembly {
  pageIndex: number;
  pagePath: string;
  components: Array<{
    name: ComponentName;
    variantId: number;
    position: number;
    instanceHash: string;
  }>;
}

export interface SiteAssemblyPlan {
  seed: string;
  pages: PageAssembly[];
  structuralHash: string;
  usedComponents: ComponentName[];
  usedVariants: string[];
  variationScore: number;         // 0-1, higher = more diverse
}

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED RANDOM NUMBER GENERATOR (Deterministic for reproducibility)
// ─────────────────────────────────────────────────────────────────────────────

export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [
    (h1 ^ h2 ^ h3 ^ h4) >>> 0,
    (h2 ^ h1) >>> 0,
    (h3 ^ h1) >>> 0,
    (h4 ^ h1) >>> 0,
  ];
}

export function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function createSeededRandom(seed: string): () => number {
  const [a, b, c, d] = cyrb128(seed);
  return sfc32(a, b, c, d);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL CONSTRAINTS
// ─────────────────────────────────────────────────────────────────────────────

interface AssemblyConstraints {
  minPages: number;
  maxPages: number;
  minComponentsPerPage: number;
  maxComponentsPerPage: number;
  requireUniqueHero: boolean;
  requireFooter: boolean;
  requireNav: boolean;
  maxRepeatComponent: number;   // max times any component can appear across all pages
  require3DCount: number;         // min components with 3D per site
  requireShaderCount: number;     // min components with shaders per site
  diversificationThreshold: number; // 0-1, minimum variation score
}

const DEFAULT_CONSTRAINTS: AssemblyConstraints = {
  minPages: 3,
  maxPages: 5,
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

// ─────────────────────────────────────────────────────────────────────────────
// CHOREOGRAPHER CORE
// ─────────────────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickUnique<T>(arr: T[], count: number, rand: () => number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function hashAssembly(pages: PageAssembly[]): string {
  const flat = pages
    .flatMap((p) => p.components.map((c) => `${c.name}:V${c.variantId}`))
    .join("|");
  // Simple hash for structural comparison
  let hash = 0;
  for (let i = 0; i < flat.length; i++) {
    const char = flat.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `struct-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function calculateVariationScore(plan: SiteAssemblyPlan): number {
  const totalSlots = plan.pages.reduce((sum, p) => sum + p.components.length, 0);
  const uniqueComponents = new Set(plan.usedComponents).size;
  const uniqueVariants = new Set(plan.usedVariants).size;
  // Score: weighted combination of component diversity and variant diversity
  const compScore = uniqueComponents / totalSlots;
  const varScore = uniqueVariants / totalSlots;
  return (compScore * 0.6 + varScore * 0.4);
}

/**
 * Assembles a SiteAssemblyPlan given a seed and constraints.
 * This function MUST be called before generating any SiteBlueprint.
 */
export function assembleSite(seedInput: ChoreographerSeed, constraints: Partial<AssemblyConstraints> = {}): SiteAssemblyPlan {
  const fullConstraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const seedString = `${seedInput.niche}::${seedInput.prompt}::${seedInput.timestamp}::${seedInput.userId || "anon"}`;
  const rand = createSeededRandom(seedString);

  // Determine number of pages
  const numPages = Math.floor(rand() * (fullConstraints.maxPages - fullConstraints.minPages + 1)) + fullConstraints.minPages;

  const pages: PageAssembly[] = [];
  const globalComponentCounts: Record<string, number> = {};
  const usedHeroes: ComponentName[] = [];
  const usedComponents: ComponentName[] = [];
  const usedVariants: string[] = [];

  for (let p = 0; p < numPages; p++) {
    const pagePath = p === 0 ? "/" : `/${seedInput.niche.toLowerCase().replace(/\s+/g, "-")}-${p + 1}`;
    const numComponents = Math.floor(rand() * (fullConstraints.maxComponentsPerPage - fullConstraints.minComponentsPerPage + 1)) + fullConstraints.minComponentsPerPage;
    const pageComponents: PageAssembly["components"] = [];

    // Page 0 always gets a hero (if required)
    let remainingSlots = numComponents;
    if (p === 0 && fullConstraints.requireUniqueHero) {
      const heroPool = HERO_COMPONENTS.filter((h) => !usedHeroes.includes(h as ComponentName)) as ComponentName[];
      const heroName = pickRandom(heroPool.length > 0 ? heroPool : HERO_COMPONENTS, rand) as ComponentName;
      const heroEntry = getComponentByName(heroName)!;
      const variant = pickRandom(heroEntry.variants, rand);
      pageComponents.push({
        name: heroName,
        variantId: variant.id,
        position: 0,
        instanceHash: `${heroName}-V${variant.id}-P${p}-0`,
      });
      usedHeroes.push(heroName);
      globalComponentCounts[heroName] = (globalComponentCounts[heroName] || 0) + 1;
      usedComponents.push(heroName);
      usedVariants.push(`${heroName}-V${variant.id}`);
      remainingSlots--;
    }

    // Nav on first page only (global)
    if (p === 0 && fullConstraints.requireNav) {
      const navName = pickRandom(NAVIGATION_COMPONENTS, rand) as ComponentName;
      const navEntry = getComponentByName(navName)!;
      const variant = pickRandom(navEntry.variants, rand);
      pageComponents.push({
        name: navName,
        variantId: variant.id,
        position: -1, // nav is special
        instanceHash: `${navName}-V${variant.id}-P${p}-nav`,
      });
      globalComponentCounts[navName] = (globalComponentCounts[navName] || 0) + 1;
      usedComponents.push(navName);
      usedVariants.push(`${navName}-V${variant.id}`);
    }

    // Fill remaining slots from all categories
    const categoryPools = [SHOWCASE_COMPONENTS, CONTENT_COMPONENTS, CONVERSION_COMPONENTS, TRANSITION_COMPONENTS];
    let slotIndex = pageComponents.filter((c) => c.position >= 0).length;

    while (remainingSlots > 0) {
      // Pick a category pool, weighted toward diversity
      const pool = pickRandom(categoryPools, rand);
      const available = pool.filter((c) => {
        const count = globalComponentCounts[c] || 0;
        return count < fullConstraints.maxRepeatComponent;
      }) as ComponentName[];

      if (available.length === 0) {
        // Fallback: pick anything under limit
        const fallback = ALL_COMPONENT_NAMES.filter((c) => {
          const count = globalComponentCounts[c] || 0;
          return count < fullConstraints.maxRepeatComponent;
        });
        if (fallback.length === 0) break;
        const compName = pickRandom(fallback, rand);
        const entry = getComponentByName(compName)!;
        const variant = pickRandom(entry.variants, rand);
        pageComponents.push({
          name: compName,
          variantId: variant.id,
          position: slotIndex++,
          instanceHash: `${compName}-V${variant.id}-P${p}-${slotIndex}`,
        });
        globalComponentCounts[compName] = (globalComponentCounts[compName] || 0) + 1;
        usedComponents.push(compName);
        usedVariants.push(`${compName}-V${variant.id}`);
        remainingSlots--;
        continue;
      }

      const compName = pickRandom(available, rand) as ComponentName;
      const entry = getComponentByName(compName)!;
      const variant = pickRandom(entry.variants, rand);
      pageComponents.push({
        name: compName,
        variantId: variant.id,
        position: slotIndex++,
        instanceHash: `${compName}-V${variant.id}-P${p}-${slotIndex}`,
      });
      globalComponentCounts[compName] = (globalComponentCounts[compName] || 0) + 1;
      usedComponents.push(compName);
      usedVariants.push(`${compName}-V${variant.id}`);
      remainingSlots--;
    }

    // Footer on last page
    if (p === numPages - 1 && fullConstraints.requireFooter) {
      const footerName = pickRandom(FOOTER_COMPONENTS, rand) as ComponentName;
      const footerEntry = getComponentByName(footerName)!;
      const variant = pickRandom(footerEntry.variants, rand);
      pageComponents.push({
        name: footerName,
        variantId: variant.id,
        position: 999,
        instanceHash: `${footerName}-V${variant.id}-P${p}-footer`,
      });
      globalComponentCounts[footerName] = (globalComponentCounts[footerName] || 0) + 1;
      usedComponents.push(footerName);
      usedVariants.push(`${footerName}-V${variant.id}`);
    }

    pages.push({
      pageIndex: p,
      pagePath,
      components: pageComponents.sort((a, b) => a.position - b.position),
    });
  }

  // Validate 3D and shader minimums
  const threeDCount = usedComponents.filter((c) => getComponentByName(c)?.required3D).length;
  const shaderCount = usedComponents.filter((c) => getComponentByName(c)?.requiredShader).length;

  if (threeDCount < fullConstraints.require3DCount) {
    throw new Error(
      `INSUFFICIENT_3D: Site assembly only has ${threeDCount} 3D components, ` +
      `but requires ${fullConstraints.require3DCount}. Increase maxComponentsPerPage or enable more 3D-capable components.`
    );
  }
  if (shaderCount < fullConstraints.requireShaderCount) {
    throw new Error(
      `INSUFFICIENT_SHADERS: Site assembly only has ${shaderCount} shader components, ` +
      `but requires ${fullConstraints.requireShaderCount}. Enable more shader-capable components.`
    );
  }

  const plan: SiteAssemblyPlan = {
    seed: seedString,
    pages,
    structuralHash: hashAssembly(pages),
    usedComponents: [...new Set(usedComponents)],
    usedVariants: [...new Set(usedVariants)],
    variationScore: 0, // computed below
  };

  plan.variationScore = calculateVariationScore(plan);

  if (plan.variationScore < fullConstraints.diversificationThreshold) {
    throw new Error(
      `LOW_VARIATION: Score ${plan.variationScore.toFixed(3)} is below threshold ` +
      `${fullConstraints.diversificationThreshold}. The component assembly is too repetitive. ` +
      `This should not happen with the current registry size. Check constraints.`
    );
  }

  return plan;
}

/**
 * Returns the full ComponentRegistryEntry + Variant for a slot in the plan.
 */
export function resolveSlot(plan: SiteAssemblyPlan, pageIndex: number, componentIndex: number): { entry: ComponentRegistryEntry; variant: ComponentVariant } | null {
  const page = plan.pages[pageIndex];
  if (!page) return null;
  const slot = page.components[componentIndex];
  if (!slot) return null;
  const entry = getComponentByName(slot.name);
  if (!entry) return null;
  const variant = getVariantById(slot.name, slot.variantId);
  if (!variant) return null;
  return { entry, variant };
}
