/**
 * Universal Diversity Mutation Engine — Fingerprint Generation
 * Creates compact structural identifiers for all layout/visual dimensions.
 */

import {
  WebsiteFingerprint,
  LayoutFingerprint,
  VisualHierarchyFingerprint,
  TypographyFingerprint,
  SpacingFingerprint,
  CompositionFingerprint,
  StructureFingerprint,
  PageRhythmFingerprint,
  ComponentArrangementFingerprint,
  FingerprintString,
} from "./types";
import type { DiversityEngineInput } from "./types";

// ───────────────────────────────────────────────────────────────
// String Hashing (FNV-1a)
// ───────────────────────────────────────────────────────────────

function fnv1a(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function hashToBase64(hash: number): string {
  const buffer = new Uint8Array(4);
  buffer[0] = (hash >>> 24) & 0xff;
  buffer[1] = (hash >>> 16) & 0xff;
  buffer[2] = (hash >>> 8) & 0xff;
  buffer[3] = hash & 0xff;
  return btoa(String.fromCharCode(...buffer)).replace(/=/g, "");
}

function hashString(str: string): FingerprintString {
  return hashToBase64(fnv1a(str));
}

function hashMultiple(parts: (string | number | boolean)[]): FingerprintString {
  return hashString(parts.map((p) => String(p)).join("|"));
}

// ───────────────────────────────────────────────────────────────
// Layout Fingerprint
// ───────────────────────────────────────────────────────────────

function generateLayoutFingerprint(input: DiversityEngineInput): LayoutFingerprint {
  const { nodes, edges, complexity, hasNesting, maxDepth } = input.layoutGraph;

  // Node type sequence (compress repeated types)
  const typeSeq = nodes.map((n) => n.type).join(",");

  // Depth distribution
  const depthCounts: Record<string, number> = {};
  for (const node of nodes) {
    depthCounts[node.depth] = (depthCounts[node.depth] || 0) + 1;
  }
  const depthDist = Object.entries(depthCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  // Span distribution
  const spanCounts: Record<string, number> = {};
  for (const node of nodes) {
    spanCounts[node.span] = (spanCounts[node.span] || 0) + 1;
  }
  const spanDist = Object.entries(spanCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  // Edge type sequence
  const edgeSeq = edges.map((e) => e.type).join(",");

  const fp: LayoutFingerprint = {
    hash: "",
    nodeTypeSequence: typeSeq,
    nodeCount: nodes.length,
    depthDistribution: depthDist,
    spanDistribution: spanDist,
    edgeTypeSequence: edgeSeq,
    complexity,
    hasNesting,
  };

  fp.hash = hashMultiple([typeSeq, String(nodes.length), depthDist, spanDist, edgeSeq, complexity, String(hasNesting)]);
  return fp;
}

// ───────────────────────────────────────────────────────────────
// Visual Hierarchy Fingerprint
// ───────────────────────────────────────────────────────────────

function generateVisualHierarchyFingerprint(input: DiversityEngineInput): VisualHierarchyFingerprint {
  const { nodes, compositionProfile, visualHierarchy } = input.layoutGraph;

  const weightOrder = ["dominant", "heavy", "medium", "light"];
  const weightCounts: Record<string, number> = {};
  const weightSeq: string[] = [];

  for (const node of nodes) {
    weightCounts[node.visualWeight] = (weightCounts[node.visualWeight] || 0) + 1;
    weightSeq.push(node.visualWeight);
  }

  const weightDist = weightOrder
    .map((w) => `${w}:${weightCounts[w] || 0}`)
    .join(",");

  // Compress curves into low-res signatures
  const tensionSig = compressCurve(compositionProfile.tensionCurve, 4);
  const densitySig = compressCurve(compositionProfile.densityCurve, 4);

  const dominantType = nodes.find((n) => n.visualWeight === "dominant")?.type || "none";

  const fp: VisualHierarchyFingerprint = {
    hash: "",
    dominantElementType: dominantType,
    weightDistribution: weightDist,
    visualWeightSequence: weightSeq.join(","),
    tensionCurveSignature: tensionSig,
    densityCurveSignature: densitySig,
    progressionType: visualHierarchy.progression,
  };

  fp.hash = hashMultiple([
    dominantType, weightDist, tensionSig, densitySig,
    visualHierarchy.progression, String(visualHierarchy.levels),
  ]);

  return fp;
}

function compressCurve(values: number[], buckets: number): string {
  if (values.length === 0) return "empty";
  const step = Math.max(1, Math.floor(values.length / buckets));
  const sampled = [];
  for (let i = 0; i < buckets; i++) {
    const idx = Math.min(i * step, values.length - 1);
    sampled.push(Math.round(values[idx] * 10)); // quantize to 0-10
  }
  return sampled.join("-");
}

// ───────────────────────────────────────────────────────────────
// Typography Fingerprint
// ───────────────────────────────────────────────────────────────

function generateTypographyFingerprint(input: DiversityEngineInput): TypographyFingerprint {
  const { typography } = input.visualSystem;

  const headingFam = typography.family.heading.split(",")[0].trim().toLowerCase();
  const bodyFam = typography.family.body.split(",")[0].trim().toLowerCase();
  const hasMono = !!typography.family.mono;

  // Parse scale sizes
  const parseSize = (s: string): number => {
    const match = s.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const heroSize = parseSize(typography.scale.hero || "4rem");
  const bodySize = parseSize(typography.scale.body || "1rem");
  const scaleRatio = heroSize / bodySize;

  const weightDiff = typography.weight.heading - typography.weight.body;

  const headingSpacing = typography.letterSpacing.heading;
  const spacingTightness = headingSpacing.includes("-") ? "tight" : headingSpacing.includes("0.05") ? "wide" : "normal";

  const fp: TypographyFingerprint = {
    hash: "",
    headingFamily: headingFam,
    bodyFamily: bodyFam,
    scaleRatio: Math.round(scaleRatio * 10) / 10,
    weightContrast: weightDiff,
    letterSpacingTightness: spacingTightness,
    hasMonoAccent: hasMono,
  };

  fp.hash = hashMultiple([headingFam, bodyFam, String(scaleRatio), String(weightDiff), spacingTightness, String(hasMono)]);
  return fp;
}

// ───────────────────────────────────────────────────────────────
// Spacing Fingerprint
// ───────────────────────────────────────────────────────────────

function generateSpacingFingerprint(input: DiversityEngineInput): SpacingFingerprint {
  const { spacing } = input.visualSystem;
  const { spacingRhythm } = input.layoutGraph;

  const baseVal = parseFloat(spacingRhythm.base) || 4;
  const sectionVal = parseFloat(spacing.section) || 4;

  const gapLow = Math.min(sectionVal, baseVal);
  const gapHigh = Math.max(sectionVal, baseVal * 2);

  const gapDensity = 1 / gapLow; // higher = tighter spacing

  const rhythm = spacingRhythm.pattern;
  const paddingStrategy = spacing.gutter.includes("3rem") || spacing.gutter.includes("4rem")
    ? "generous"
    : spacing.gutter.includes("0.5rem") || spacing.gutter.includes("0.75rem")
    ? "tight"
    : "balanced";

  const fp: SpacingFingerprint = {
    hash: "",
    rhythmPattern: rhythm,
    baseUnitSize: spacingRhythm.base,
    sectionGapRange: `${gapLow}rem-${gapHigh}rem`,
    gapDensity: Math.round(gapDensity * 100) / 100,
    scaleRatio: Math.round(spacingRhythm.ratio * 100) / 100,
    paddingStrategy,
  };

  fp.hash = hashMultiple([rhythm, spacingRhythm.base, String(gapDensity), String(spacingRhythm.ratio), paddingStrategy]);
  return fp;
}

// ───────────────────────────────────────────────────────────────
// Composition Fingerprint
// ───────────────────────────────────────────────────────────────

function generateCompositionFingerprint(input: DiversityEngineInput): CompositionFingerprint {
  const { nodes, compositionProfile, flowProfile } = input.layoutGraph;

  const focalCounts: Record<string, number> = {};
  let totalNegativeSpace = 0;
  let alignmentCounts: Record<string, number> = {};

  for (const node of nodes) {
    for (const fp of node.composition.focalPoints || []) {
      const key = `${fp.x}-${fp.y}`;
      focalCounts[key] = (focalCounts[key] || 0) + 1;
    }
    totalNegativeSpace += node.composition.negativeSpaceRatio;
    alignmentCounts[node.composition.alignment] = (alignmentCounts[node.composition.alignment] || 0) + 1;
  }

  const focalDist = Object.entries(focalCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(",");

  const dominantAlignment = Object.entries(alignmentCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "strict";

  const avgNegativeSpace = totalNegativeSpace / Math.max(nodes.length, 1);

  const fp: CompositionFingerprint = {
    hash: "",
    globalBalance: compositionProfile.overallBalance,
    primaryAxis: compositionProfile.primaryAxis,
    readingPattern: flowProfile.readingPattern,
    focalPointDistribution: focalDist,
    negativeSpaceRatio: Math.round(avgNegativeSpace * 100) / 100,
    alignmentStrategy: dominantAlignment,
    tensionLevel: nodes[0]?.composition?.tension || "calm",
  };

  fp.hash = hashMultiple([
    compositionProfile.overallBalance, compositionProfile.primaryAxis, flowProfile.readingPattern,
    focalDist, String(avgNegativeSpace), dominantAlignment,
  ]);

  return fp;
}

// ───────────────────────────────────────────────────────────────
// Structure Fingerprint
// ───────────────────────────────────────────────────────────────

function generateStructureFingerprint(input: DiversityEngineInput): StructureFingerprint {
  const { nodes, edges } = input.layoutGraph;

  const sectionTypes = nodes.map((n) => n.type);
  const typeSeq = sectionTypes.join(",");

  const ctaNodes = nodes.filter((n) => n.type === "signal");
  const ctaPositions = ctaNodes.map((n) => nodes.indexOf(n)).join(",");

  const foldNodes = nodes.filter((n) => n.type === "fold");
  const foldPositions = foldNodes.map((n) => nodes.indexOf(n)).join(",");

  const contentBlocks = nodes.filter((n) => !["hero", "fold", "signal", "strip"].includes(n.type)).length;
  const hasNested = nodes.some((n) => (n.children || []).length > 0);

  const fp: StructureFingerprint = {
    hash: "",
    sectionCount: nodes.length,
    sectionTypeSequence: typeSeq,
    ctaCount: ctaNodes.length,
    ctaPositions: ctaPositions || "none",
    foldCount: foldNodes.length,
    foldPositions: foldPositions || "none",
    contentBlockCount: contentBlocks,
    hasNestedSections: hasNested,
  };

  fp.hash = hashMultiple([
    String(nodes.length), typeSeq, String(ctaNodes.length), ctaPositions,
    String(foldNodes.length), String(contentBlocks), String(hasNested),
  ]);

  return fp;
}

// ───────────────────────────────────────────────────────────────
// Page Rhythm Fingerprint
// ───────────────────────────────────────────────────────────────

function generatePageRhythmFingerprint(input: DiversityEngineInput): PageRhythmFingerprint {
  const { compositionProfile, flowProfile, nodes, spacingRhythm } = input.layoutGraph;

  const transSeq = flowProfile.sectionTransitions.join(",");

  // Calculate variance in density and tension
  const densityValues = compositionProfile.densityCurve;
  const tensionValues = compositionProfile.tensionCurve;

  const densityVar = calculateVariance(densityValues);
  const tensionVar = calculateVariance(tensionValues);

  // Visual weight variance
  const weightValues = nodes.map((n) => {
    const map: Record<string, number> = { light: 1, medium: 2, heavy: 3, dominant: 4 };
    return map[n.visualWeight] || 2;
  });
  const weightVar = calculateVariance(weightValues);

  // Section length variance (based on height)
  const heightMap: Record<string, number> = { auto: 2, short: 1, tall: 3, golden: 3, viewport: 4 };
  const heightValues = nodes.map((n) => heightMap[n.height] || 2);
  const lengthVar = calculateVariance(heightValues);

  const fp: PageRhythmFingerprint = {
    hash: "",
    pacing: compositionProfile.pacing,
    scrollBehavior: flowProfile.scrollBehavior,
    transitionSequence: transSeq,
    densityVariance: Math.round(densityVar * 100) / 100,
    tensionVariance: Math.round(tensionVar * 100) / 100,
    visualWeightVariance: Math.round(weightVar * 100) / 100,
    sectionLengthVariance: Math.round(lengthVar * 100) / 100,
  };

  fp.hash = hashMultiple([
    compositionProfile.pacing, flowProfile.scrollBehavior, transSeq,
    String(densityVar), String(tensionVar), String(weightVar),
  ]);

  return fp;
}

function calculateVariance(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// ───────────────────────────────────────────────────────────────
// Component Arrangement Fingerprint
// ───────────────────────────────────────────────────────────────

function generateComponentArrangementFingerprint(input: DiversityEngineInput): ComponentArrangementFingerprint {
  const { nodes } = input.layoutGraph;

  const gridSeq = nodes.map((n) => n.grid?.type || "none").join(",");
  const mediaSeq = nodes.map((n) => n.mediaPlacement || "none").join(",");
  const ctaSeq = nodes.filter((n) => n.ctaPlacement).map((n) => n.ctaPlacement).join(",");

  const interactiveCount = nodes.filter((n) =>
    n.type === "signal" ||
    n.rhythm === "pulsing" ||
    (n.grid?.autoFlow || "").includes("dense")
  ).length;

  const interactiveDensity = Math.round((interactiveCount / Math.max(nodes.length, 1)) * 100) / 100;

  const fp: ComponentArrangementFingerprint = {
    hash: "",
    gridTypeSequence: gridSeq,
    mediaPlacementSequence: mediaSeq,
    ctaPlacementSequence: ctaSeq || "none",
    interactiveElementCount: interactiveCount,
    interactiveElementDensity: interactiveDensity,
  };

  fp.hash = hashMultiple([gridSeq, mediaSeq, ctaSeq, String(interactiveCount)]);
  return fp;
}

// ───────────────────────────────────────────────────────────────
// Full Website Fingerprint
// ───────────────────────────────────────────────────────────────

export function generateWebsiteFingerprint(input: DiversityEngineInput): WebsiteFingerprint {
  const promptHash = hashString(input.prompt);

  const layout = generateLayoutFingerprint(input);
  const visualHierarchy = generateVisualHierarchyFingerprint(input);
  const typography = generateTypographyFingerprint(input);
  const spacing = generateSpacingFingerprint(input);
  const composition = generateCompositionFingerprint(input);
  const structure = generateStructureFingerprint(input);
  const pageRhythm = generatePageRhythmFingerprint(input);
  const componentArrangement = generateComponentArrangementFingerprint(input);

  // Composite hashes
  const component = hashMultiple([layout.hash, structure.hash, componentArrangement.hash]);
  const visual = hashMultiple([visualHierarchy.hash, composition.hash, typography.hash]);
  const structural = hashMultiple([spacing.hash, pageRhythm.hash]);

  const globalHash = hashMultiple([
    layout.hash, visualHierarchy.hash, typography.hash, spacing.hash,
    composition.hash, structure.hash, pageRhythm.hash, componentArrangement.hash,
  ]);

  return {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    promptHash,

    layout,
    visualHierarchy,
    typography,
    spacing,
    composition,
    structure,
    pageRhythm,
    componentArrangement,

    globalHash,
    component,
    visual,
    structural,
  };
}

// ───────────────────────────────────────────────────────────────
// Fingerprint Utilities
// ───────────────────────────────────────────────────────────────

export function fingerprintToString(fp: WebsiteFingerprint): string {
  return [
    `G:${fp.globalHash}`,
    `L:${fp.layout.hash}`,
    `VH:${fp.visualHierarchy.hash}`,
    `T:${fp.typography.hash}`,
    `S:${fp.spacing.hash}`,
    `C:${fp.composition.hash}`,
    `ST:${fp.structure.hash}`,
    `PR:${fp.pageRhythm.hash}`,
    `CA:${fp.componentArrangement.hash}`,
  ].join(" | ");
}

export function extractDimensionHash(fp: WebsiteFingerprint, dimension: string): string {
  const map: Record<string, string> = {
    layout: fp.layout.hash,
    visualHierarchy: fp.visualHierarchy.hash,
    typography: fp.typography.hash,
    spacing: fp.spacing.hash,
    composition: fp.composition.hash,
    structure: fp.structure.hash,
    pageRhythm: fp.pageRhythm.hash,
    componentArrangement: fp.componentArrangement.hash,
    component: fp.component,
    visual: fp.visual,
    structural: fp.structural,
    global: fp.globalHash,
  };
  return map[dimension] || "unknown";
}
