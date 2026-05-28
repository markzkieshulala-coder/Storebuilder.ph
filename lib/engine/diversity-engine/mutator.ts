/**
 * Universal Diversity Mutation Engine — Mutation Application
 * Applies mutation strategies to a layout graph to produce structural diversity.
 */

import {
  MutationStrategy,
  MutationPlan,
  MutationResult,
  SimilarityScore,
  DiversityEngineConfig,
  WebsiteFingerprint,
  GenerationRecord,
  DEFAULT_CONFIG,
} from "./types";
import type { DiversityEngineInput } from "./types";
import { generateWebsiteFingerprint, fingerprintToString } from "./fingerprint";
import { computeSimilarity, generateSimilarityReport } from "./similarity";

// ───────────────────────────────────────────────────────────────
// Seeded RNG for deterministic mutations
// ───────────────────────────────────────────────────────────────

function makeSeededRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ───────────────────────────────────────────────────────────────
// Mutation Strategy Application
// Each strategy mutates a specific dimension
// ───────────────────────────────────────────────────────────────

interface MutableGraph {
  nodes: Array<{
    id: string;
    type: string;
    variant: string;
    depth: string;
    density: string;
    visualWeight: string;
    rhythm: string;
    span: string;
    height: string;
    composition: {
      balance: string;
      tension: string;
      primaryAxis: string;
      focalPoints: Array<{ x: string; y: string }>;
      negativeSpaceRatio: number;
      alignment: string;
    };
    grid: {
      type: string;
      columns: number;
      gap: string;
      autoFlow: string;
      alignment: string;
    };
    spacing: {
      before: string;
      after: string;
      internal: string;
      rhythm: string;
    };
    zIndex: number;
    mediaPlacement: string;
    ctaPlacement?: string;
    children?: Array<Record<string, unknown>>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: string;
    weight: number;
    spacingMultiplier: number;
  }>;
  compositionProfile: {
    overallBalance: string;
    primaryAxis: string;
    pacing: string;
    tensionCurve: number[];
    densityCurve: number[];
  };
  flowProfile: {
    direction: string;
    scrollBehavior: string;
    sectionTransitions: string[];
    readingPattern: string;
  };
  visualHierarchy: {
    levels: number;
    dominantElement: string;
    rhythm: string;
    progression: string;
  };
  spacingRhythm: {
    pattern: string;
    base: string;
    ratio: number;
    values: string[];
  };
}

function cloneMutableGraph(input: DiversityEngineInput): MutableGraph {
  return JSON.parse(JSON.stringify({
    nodes: input.layoutGraph.nodes,
    edges: input.layoutGraph.edges,
    compositionProfile: input.layoutGraph.compositionProfile,
    flowProfile: input.layoutGraph.flowProfile,
    visualHierarchy: input.layoutGraph.visualHierarchy,
    spacingRhythm: input.layoutGraph.spacingRhythm,
  }));
}

// ── Layout Mutations ──

function applyLayoutReorder(graph: MutableGraph, rng: () => number): void {
  const nonHero = graph.nodes.filter((n) => n.type !== "hero");
  const hero = graph.nodes.find((n) => n.type === "hero");
  const shuffled = shuffle(rng, nonHero);
  graph.nodes = hero ? [hero, ...shuffled] : shuffled;
  // Regenerate edges to match new order
  graph.edges = regenerateEdges(graph, rng);
}

function applyLayoutTypeSwap(graph: MutableGraph, rng: () => number): void {
  const swapCandidates = graph.nodes.filter((n) => n.type !== "hero" && n.type !== "fold");
  if (swapCandidates.length < 2) return;

  const idx1 = Math.floor(rng() * swapCandidates.length);
  let idx2 = Math.floor(rng() * swapCandidates.length);
  while (idx2 === idx1) idx2 = Math.floor(rng() * swapCandidates.length);

  const n1 = swapCandidates[idx1];
  const n2 = swapCandidates[idx2];

  const tempType = n1.type;
  n1.type = n2.type;
  n2.type = tempType;

  // Also swap visual weight to maintain some logic
  const tempWeight = n1.visualWeight;
  n1.visualWeight = n2.visualWeight;
  n2.visualWeight = tempWeight;
}

function applyLayoutDepthShift(graph: MutableGraph, rng: () => number): void {
  const depths = ["surface", "elevated", "floating", "immersed"];
  for (const node of graph.nodes) {
    if (rng() < 0.4) {
      const currentIdx = depths.indexOf(node.depth);
      const shift = rng() < 0.5 ? 1 : -1;
      const newIdx = Math.max(0, Math.min(depths.length - 1, currentIdx + shift));
      node.depth = depths[newIdx];
    }
  }
}

function applyLayoutSpanInversion(graph: MutableGraph, rng: () => number): void {
  const spans = ["full", "contained", "bleed", "inset"];
  for (const node of graph.nodes) {
    if (rng() < 0.3) {
      const idx = spans.indexOf(node.span);
      if (idx >= 0) {
        node.span = spans[(idx + 1) % spans.length];
      }
    }
  }
}

// ── Hierarchy Mutations ──

function applyHierarchyWeightInversion(graph: MutableGraph, rng: () => number): void {
  const weights = ["light", "medium", "heavy", "dominant"];
  for (const node of graph.nodes) {
    if (rng() < 0.5) {
      const current = weights.indexOf(node.visualWeight);
      const inverted = weights[weights.length - 1 - current];
      node.visualWeight = inverted;
    }
  }
  // Re-evaluate dominant element
  const dominant = graph.nodes.find((n) => n.visualWeight === "dominant");
  if (dominant) {
    graph.visualHierarchy.dominantElement = dominant.id;
  }
}

function applyHierarchyFlatten(graph: MutableGraph, rng: () => number): void {
  // Reduce visual weight variance — make more elements "medium"
  for (const node of graph.nodes) {
    if (node.visualWeight !== "dominant" && rng() < 0.6) {
      node.visualWeight = "medium";
    }
  }
  graph.visualHierarchy.progression = "gradual";
}

function applyHierarchyIntensify(graph: MutableGraph, rng: () => number): void {
  // Increase weight variance
  for (const node of graph.nodes) {
    if (node.visualWeight === "medium" && rng() < 0.5) {
      node.visualWeight = rng() < 0.5 ? "heavy" : "light";
    }
  }
  graph.visualHierarchy.progression = "explosive";
}

// ── Typography Mutations (on visualSystem, not graph) ──

function applyTypographyScaleShift(input: DiversityEngineInput, rng: () => number): void {
  const scale = input.visualSystem.typography.scale;
  const multiplier = rng() < 0.5 ? 0.8 : 1.3;
  for (const key of Object.keys(scale)) {
    const val = scale[key as keyof typeof scale];
    if (typeof val === "string") {
      const numMatch = val.match(/([\d.]+)/);
      if (numMatch) {
        const newVal = parseFloat(numMatch[1]) * multiplier;
        scale[key as keyof typeof scale] = val.replace(numMatch[1], newVal.toFixed(2)) as any;
      }
    }
  }
}

function applyTypographyFamilySwap(input: DiversityEngineInput, rng: () => number): void {
  const families = [
    "Inter", "Helvetica", "Georgia", "Times New Roman", "Playfair Display",
    "Space Grotesk", "Outfit", "Sora", "Oswald", "Montserrat",
    "Basement Grotesque", "Clash Display", "Sohne", "Calibre",
  ];
  input.visualSystem.typography.family.heading = pick(rng, families);
  input.visualSystem.typography.family.body = pick(rng, families);
}

function applyTypographyMonoInject(input: DiversityEngineInput, rng: () => number): void {
  input.visualSystem.typography.family.mono = pick(rng, [
    "SF Mono", "JetBrains Mono", "Fira Code", "IBM Plex Mono",
  ]);
}

// ── Spacing Mutations ──

function applySpacingRhythmInvert(graph: MutableGraph, rng: () => number): void {
  const patterns = ["even", "accelerating", "decelerating", "breathing", "staccato", "wave"];
  const currentIdx = patterns.indexOf(graph.spacingRhythm.pattern);
  const newIdx = (currentIdx + Math.floor(rng() * (patterns.length - 1)) + 1) % patterns.length;
  graph.spacingRhythm.pattern = patterns[newIdx];
}

function applySpacingExpand(graph: MutableGraph, rng: () => number): void {
  for (const node of graph.nodes) {
    const before = parseFloat(node.spacing.before) || 1;
    const after = parseFloat(node.spacing.after) || 1;
    node.spacing.before = `${(before * 1.5).toFixed(1)}rem`;
    node.spacing.after = `${(after * 1.5).toFixed(1)}rem`;
  }
  graph.spacingRhythm.ratio = Math.min(graph.spacingRhythm.ratio * 1.3, 3);
}

function applySpacingCompress(graph: MutableGraph, rng: () => number): void {
  for (const node of graph.nodes) {
    const before = parseFloat(node.spacing.before) || 1;
    const after = parseFloat(node.spacing.after) || 1;
    node.spacing.before = `${(before * 0.6).toFixed(1)}rem`;
    node.spacing.after = `${(after * 0.6).toFixed(1)}rem`;
  }
  graph.spacingRhythm.ratio = Math.max(graph.spacingRhythm.ratio * 0.7, 0.5);
}

// ── Composition Mutations ──

function applyCompositionBalanceFlip(graph: MutableGraph, rng: () => number): void {
  const balanceMap: Record<string, string> = {
    symmetric: "asymmetric-left",
    "asymmetric-left": "asymmetric-right",
    "asymmetric-right": "asymmetric-left",
    "asymmetric-top": "asymmetric-bottom",
    "asymmetric-bottom": "asymmetric-top",
    radial: "diagonal-tl-br",
    "diagonal-tl-br": "diagonal-tr-bl",
    "diagonal-tr-bl": "diagonal-tl-br",
    freeform: "symmetric",
  };
  const current = graph.compositionProfile.overallBalance;
  graph.compositionProfile.overallBalance = balanceMap[current] || "symmetric";

  for (const node of graph.nodes) {
    node.composition.balance = graph.compositionProfile.overallBalance;
  }
}

function applyCompositionAxisRotate(graph: MutableGraph, rng: () => number): void {
  const axes = ["horizontal", "vertical", "diagonal", "radial"];
  const currentIdx = axes.indexOf(graph.compositionProfile.primaryAxis);
  const newIdx = (currentIdx + Math.floor(rng() * (axes.length - 1)) + 1) % axes.length;
  graph.compositionProfile.primaryAxis = axes[newIdx];

  for (const node of graph.nodes) {
    node.composition.primaryAxis = graph.compositionProfile.primaryAxis;
  }
}

function applyCompositionFocalScatter(graph: MutableGraph, rng: () => number): void {
  const positions = ["left", "center", "right", "top", "bottom"];
  for (const node of graph.nodes) {
    if (node.composition.focalPoints) {
      node.composition.focalPoints = node.composition.focalPoints.map(() => ({
        x: pick(rng, ["left", "center", "right"]),
        y: pick(rng, ["top", "center", "bottom"]),
      }));
    }
    node.composition.negativeSpaceRatio = Math.min(1, Math.max(0, node.composition.negativeSpaceRatio + (rng() - 0.5) * 0.4));
  }
}

// ── Structure Mutations ──

function applyStructureCtaReposition(graph: MutableGraph, rng: () => number): void {
  const ctas = graph.nodes.filter((n) => n.type === "signal");
  const nonCtas = graph.nodes.filter((n) => n.type !== "signal");

  // Remove CTAs and re-insert at random positions
  const base = nonCtas;
  for (const cta of ctas) {
    const pos = Math.floor(rng() * Math.max(1, base.length - 2)) + 1;
    base.splice(pos, 0, cta);
  }
  graph.nodes = base;
  graph.edges = regenerateEdges(graph, rng);
}

function applyStructureFoldInsert(graph: MutableGraph, rng: () => number): void {
  const numFolds = Math.floor(rng() * 2) + 1;
  for (let i = 0; i < numFolds; i++) {
    const pos = Math.floor(rng() * Math.max(1, graph.nodes.length - 2)) + 1;
    graph.nodes.splice(pos, 0, {
      id: `fold-mut-${i}`,
      type: "fold",
      variant: "spacer",
      depth: "surface",
      density: "sparse",
      visualWeight: "light",
      rhythm: "steady",
      span: "bleed",
      height: "short",
      composition: {
        balance: "symmetric",
        tension: "calm",
        primaryAxis: "horizontal",
        focalPoints: [],
        negativeSpaceRatio: 0.8,
        alignment: "strict",
      },
      grid: { type: "uniform", columns: 1, gap: "1rem", autoFlow: "row", alignment: "stretch" },
      spacing: { before: "0", after: "0", internal: "1rem", rhythm: "even" },
      zIndex: 0,
      mediaPlacement: "none",
    });
  }
  graph.edges = regenerateEdges(graph, rng);
}

function applyStructureSectionTypeSwap(graph: MutableGraph, rng: () => number): void {
  // Constrained to renderer-supported node types so swaps never produce blank sections.
  const allTypes = ["stage", "cluster", "split", "gallery", "list", "tile", "frame", "strip"];
  const candidates = graph.nodes.filter((n) => !["hero", "fold", "signal"].includes(n.type));
  if (candidates.length === 0) return;

  const target = pick(rng, candidates);
  const newType = pick(rng, allTypes);
  target.type = newType;
}

function applyStructureNestToggle(graph: MutableGraph, rng: () => number): void {
  // Find nodes with children and flatten, or add children to childless nodes
  const withChildren = graph.nodes.filter((n) => n.children && n.children.length > 0);
  const withoutChildren = graph.nodes.filter((n) => !n.children || n.children.length === 0);

  if (withChildren.length > 0 && rng() < 0.5) {
    // Flatten one
    const target = pick(rng, withChildren);
    target.children = [];
  } else if (withoutChildren.length > 0) {
    // Nest one
    const target = pick(rng, withoutChildren);
    const childType = pick(rng, ["stage", "cluster", "split"]);
    target.children = [{
      id: `${target.id}-nested`,
      type: childType,
      variant: "default",
      depth: "elevated",
      density: target.density,
      visualWeight: "medium",
      rhythm: target.rhythm,
      span: "inset",
      height: "auto",
      composition: { ...target.composition },
      grid: { ...target.grid },
      spacing: { ...target.spacing },
      zIndex: 2,
      mediaPlacement: target.mediaPlacement,
    }];
  }
}

// ── Rhythm Mutations ──

function applyRhythmPacingShift(graph: MutableGraph, rng: () => number): void {
  const pacings = ["fast", "medium", "slow", "variable"];
  const currentIdx = pacings.indexOf(graph.compositionProfile.pacing);
  const newIdx = (currentIdx + Math.floor(rng() * (pacings.length - 1)) + 1) % pacings.length;
  graph.compositionProfile.pacing = pacings[newIdx];
}

function applyRhythmTransitionVariant(graph: MutableGraph, rng: () => number): void {
  const edgeTypes = ["sequence", "contrast", "continuation", "reveal", "fold", "echo", "inversion", "compression", "expansion"];
  for (const edge of graph.edges) {
    if (rng() < 0.4) {
      edge.type = pick(rng, edgeTypes);
    }
  }
}

function applyRhythmDensityInvert(graph: MutableGraph, rng: () => number): void {
  const densities = ["sparse", "balanced", "dense", "packed"];
  for (const node of graph.nodes) {
    const current = densities.indexOf(node.density);
    const inverted = densities[densities.length - 1 - current];
    node.density = inverted;
  }
  // Invert curves
  graph.compositionProfile.densityCurve = graph.compositionProfile.densityCurve.map((v) => 1 - v);
}

// ── Arrangement Mutations ──

function applyArrangementGridVariant(graph: MutableGraph, rng: () => number): void {
  const gridTypes = ["uniform", "masonry", "bento", "asymmetric", "freeform", "radial", "diagonal"];
  for (const node of graph.nodes) {
    if (rng() < 0.3) {
      node.grid.type = pick(rng, gridTypes);
    }
  }
}

function applyArrangementMediaScatter(graph: MutableGraph, rng: () => number): void {
  const placements = ["background", "inline-left", "inline-right", "inline-top", "inline-bottom", "overlay", "surrounding", "contained", "scattered", "none"];
  for (const node of graph.nodes) {
    if (rng() < 0.4) {
      node.mediaPlacement = pick(rng, placements);
    }
  }
}

function applyArrangementInteractiveSwap(graph: MutableGraph, rng: () => number): void {
  const rhythms = ["steady", "accelerating", "decelerating", "pulsing", "irregular"];
  for (const node of graph.nodes) {
    if (rng() < 0.3) {
      node.rhythm = pick(rng, rhythms);
    }
  }
}

// ───────────────────────────────────────────────────────────────
// Edge Regeneration (after structural mutations)
// ───────────────────────────────────────────────────────────────

function regenerateEdges(graph: MutableGraph, rng: () => number): MutableGraph["edges"] {
  const edges: MutableGraph["edges"] = [];
  const edgeTypes = ["sequence", "contrast", "continuation", "reveal", "fold", "echo", "inversion", "compression", "expansion"];

  for (let i = 0; i < graph.nodes.length - 1; i++) {
    const from = graph.nodes[i];
    const to = graph.nodes[i + 1];

    let type = "sequence";
    if (from.type !== to.type && rng() < 0.25) type = "fold";
    else if (rng() < 0.15) type = pick(rng, edgeTypes);
    else if (from.density !== to.density) type = from.density === "sparse" && to.density === "dense" ? "compression" : "expansion";

    edges.push({
      from: from.id,
      to: to.id,
      type,
      weight: rng() * 0.7 + 0.3,
      spacingMultiplier: rng() * 0.5 + 0.75,
    });
  }

  return edges;
}

// ───────────────────────────────────────────────────────────────
// Strategy Application Map
// ───────────────────────────────────────────────────────────────

const strategyMap: Record<MutationStrategy, (graph: MutableGraph, input: DiversityEngineInput, rng: () => number) => void> = {
  "layout-reorder": (g, _, rng) => applyLayoutReorder(g, rng),
  "layout-type-swap": (g, _, rng) => applyLayoutTypeSwap(g, rng),
  "layout-depth-shift": (g, _, rng) => applyLayoutDepthShift(g, rng),
  "layout-span-inversion": (g, _, rng) => applyLayoutSpanInversion(g, rng),
  "hierarchy-weight-inversion": (g, _, rng) => applyHierarchyWeightInversion(g, rng),
  "hierarchy-flatten": (g, _, rng) => applyHierarchyFlatten(g, rng),
  "hierarchy-intensify": (g, _, rng) => applyHierarchyIntensify(g, rng),
  "typography-scale-shift": (g, input, rng) => applyTypographyScaleShift(input, rng),
  "typography-family-swap": (g, input, rng) => applyTypographyFamilySwap(input, rng),
  "typography-mono-inject": (g, input, rng) => applyTypographyMonoInject(input, rng),
  "spacing-rhythm-invert": (g, _, rng) => applySpacingRhythmInvert(g, rng),
  "spacing-expand": (g, _, rng) => applySpacingExpand(g, rng),
  "spacing-compress": (g, _, rng) => applySpacingCompress(g, rng),
  "composition-balance-flip": (g, _, rng) => applyCompositionBalanceFlip(g, rng),
  "composition-axis-rotate": (g, _, rng) => applyCompositionAxisRotate(g, rng),
  "composition-focal-scatter": (g, _, rng) => applyCompositionFocalScatter(g, rng),
  "structure-cta-reposition": (g, _, rng) => applyStructureCtaReposition(g, rng),
  "structure-fold-insert": (g, _, rng) => applyStructureFoldInsert(g, rng),
  "structure-section-type-swap": (g, _, rng) => applyStructureSectionTypeSwap(g, rng),
  "structure-nest-toggle": (g, _, rng) => applyStructureNestToggle(g, rng),
  "rhythm-pacing-shift": (g, _, rng) => applyRhythmPacingShift(g, rng),
  "rhythm-transition-variant": (g, _, rng) => applyRhythmTransitionVariant(g, rng),
  "rhythm-density-invert": (g, _, rng) => applyRhythmDensityInvert(g, rng),
  "arrangement-grid-variant": (g, _, rng) => applyArrangementGridVariant(g, rng),
  "arrangement-media-scatter": (g, _, rng) => applyArrangementMediaScatter(g, rng),
  "arrangement-interactive-swap": (g, _, rng) => applyArrangementInteractiveSwap(g, rng),
};

// ───────────────────────────────────────────────────────────────
// Plan Severity
// ───────────────────────────────────────────────────────────────

function determineSeverity(similarity: number, config: DiversityEngineConfig): "minor" | "moderate" | "major" | "extreme" {
  const { severityThresholds } = config;
  if (similarity >= severityThresholds.extreme) return "extreme";
  if (similarity >= severityThresholds.major) return "major";
  if (similarity >= severityThresholds.moderate) return "moderate";
  return "minor";
}

// ───────────────────────────────────────────────────────────────
// Apply Mutation Plan
// ───────────────────────────────────────────────────────────────

export function applyMutation(
  input: DiversityEngineInput,
  plan: MutationPlan,
  config: DiversityEngineConfig = DEFAULT_CONFIG
): { mutatedGraph: MutableGraph; mutatedInput: DiversityEngineInput } {
  // Deep clone
  const mutatedGraph = cloneMutableGraph(input);
  const mutatedInput: DiversityEngineInput = JSON.parse(JSON.stringify(input));

  // Update the graph reference in the mutated input
  mutatedInput.layoutGraph.nodes = mutatedGraph.nodes;
  mutatedInput.layoutGraph.edges = mutatedGraph.edges;
  mutatedInput.layoutGraph.compositionProfile = mutatedGraph.compositionProfile;
  mutatedInput.layoutGraph.flowProfile = mutatedGraph.flowProfile;
  mutatedInput.layoutGraph.visualHierarchy = mutatedGraph.visualHierarchy;
  mutatedInput.layoutGraph.spacingRhythm = mutatedGraph.spacingRhythm;

  const seed = fnv1a(plan.reason + plan.iteration);
  const rng = makeSeededRNG(seed);

  for (const strategy of plan.strategies) {
    const apply = strategyMap[strategy];
    if (apply) {
      apply(mutatedGraph, mutatedInput, rng);
    }
  }

  return { mutatedGraph, mutatedInput };
}

// Simple FNV-1a for mutation seeding
function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// ───────────────────────────────────────────────────────────────
// Full Mutation Loop
// ───────────────────────────────────────────────────────────────

export function mutateUntilDiverse(
  input: DiversityEngineInput,
  history: GenerationRecord[],
  config: DiversityEngineConfig = DEFAULT_CONFIG
): MutationResult {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  let currentInput = input;
  let iteration = 0;
  let bestFingerprint: WebsiteFingerprint | null = null;
  let bestSimilarity: SimilarityScore | null = null;

  try {
    // Generate initial fingerprint
    let currentFingerprint = generateWebsiteFingerprint(currentInput);
    let report = generateSimilarityReport(currentFingerprint, history, config);

    bestFingerprint = currentFingerprint;
    if (report.allScores.length > 0) {
      bestSimilarity = report.allScores[0].details;
    }

    // If already diverse, return early
    if (!report.exceedsThreshold) {
      return {
        success: true,
        plan: {
          strategies: [],
          reason: "Already diverse enough — no mutation needed",
          affectedDimensions: [],
          severity: "minor",
          iteration: 0,
        },
        appliedStrategies: [],
        fingerprintAfter: currentFingerprint,
        similarityAfter: bestSimilarity || computeSimilarity(currentFingerprint, currentFingerprint, config),
        similarityBefore: bestSimilarity || computeSimilarity(currentFingerprint, currentFingerprint, config),
        improvement: 0,
        iterations: 0,
        warnings: ["No mutation needed — initial generation is diverse"],
        errors: [],
        mutatedInput: currentInput,
      };
    }

    // Mutation loop
    while (report.exceedsThreshold && iteration < config.maxMutationIterations) {
      iteration++;

      const severity = determineSeverity(report.highestSimilarity, config);
      const strategies = report.recommendedMutationStrategies.slice(0, severity === "extreme" ? 8 : severity === "major" ? 6 : severity === "moderate" ? 4 : 2);

      const plan: MutationPlan = {
        strategies,
        reason: `Iteration ${iteration}: overall similarity ${(report.highestSimilarity * 100).toFixed(1)}% exceeds threshold ${(config.similarityThreshold * 100).toFixed(0)}%`,
        affectedDimensions: report.allScores[0]?.details?.matchingDimensions || [],
        severity,
        iteration,
      };

      // Apply mutations
      const { mutatedInput: newInput } = applyMutation(currentInput, plan, config);
      currentInput = newInput;
      currentFingerprint = generateWebsiteFingerprint(currentInput);
      report = generateSimilarityReport(currentFingerprint, history, config);

      // Track best
      const currentHighest = report.allScores[0]?.details;
      if (currentHighest && (!bestSimilarity || currentHighest.overall < bestSimilarity.overall)) {
        bestSimilarity = currentHighest;
        bestFingerprint = currentFingerprint;
      }

      warnings.push(`Iteration ${iteration}: applied ${strategies.length} strategies, similarity now ${(report.highestSimilarity * 100).toFixed(1)}%`);
    }

    const finalSimilarity = report.allScores[0]?.details || computeSimilarity(currentFingerprint, currentFingerprint, config);
    const initialSimilarity = bestSimilarity || finalSimilarity;
    const improvement = Math.max(0, initialSimilarity.overall - finalSimilarity.overall);

    if (report.exceedsThreshold) {
      warnings.push(`Max iterations (${config.maxMutationIterations}) reached. Similarity still ${(report.highestSimilarity * 100).toFixed(1)}%. Consider increasing mutation severity.`);
    }

    return {
      success: !report.exceedsThreshold || improvement > 0.1,
      plan: {
        strategies: report.recommendedMutationStrategies,
        reason: `Final state after ${iteration} mutation iteration(s)`,
        affectedDimensions: report.allScores[0]?.details?.matchingDimensions || [],
        severity: determineSeverity(report.highestSimilarity, config),
        iteration,
      },
      appliedStrategies: report.recommendedMutationStrategies,
      fingerprintAfter: currentFingerprint,
      similarityBefore: initialSimilarity,
      similarityAfter: finalSimilarity,
      improvement,
      iterations: iteration,
      warnings,
      errors,
      mutatedInput: currentInput,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return {
      success: false,
      plan: {
        strategies: [],
        reason: "Mutation failed due to error",
        affectedDimensions: [],
        severity: "extreme",
        iteration,
      },
      appliedStrategies: [],
      fingerprintAfter: bestFingerprint || generateWebsiteFingerprint(currentInput),
      similarityBefore: bestSimilarity || computeSimilarity(generateWebsiteFingerprint(currentInput), generateWebsiteFingerprint(currentInput), config),
      similarityAfter: bestSimilarity || computeSimilarity(generateWebsiteFingerprint(currentInput), generateWebsiteFingerprint(currentInput), config),
      improvement: 0,
      iterations: iteration,
      warnings,
      errors,
      mutatedInput: currentInput,
    };
  }
}
