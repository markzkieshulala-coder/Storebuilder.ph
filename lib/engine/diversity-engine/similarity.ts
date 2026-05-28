/**
 * Universal Diversity Mutation Engine — Similarity Scoring
 * Compares website fingerprints across all dimensions to detect repetition.
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
  SimilarityScore,
  SimilarityReport,
  GenerationRecord,
  DiversityEngineConfig,
  MutationStrategy,
  DEFAULT_CONFIG,
} from "./types";

// ───────────────────────────────────────────────────────────────
// String Similarity Utilities
// ───────────────────────────────────────────────────────────────

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(","));
  const setB = new Set(b.split(","));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function sequenceSimilarity(seqA: string, seqB: string): number {
  const maxLen = Math.max(seqA.length, seqB.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(seqA, seqB);
  return 1 - distance / maxLen;
}

function numericSimilarity(a: number, b: number, scale: number = 1): number {
  const diff = Math.abs(a - b);
  return Math.max(0, 1 - diff / scale);
}

function booleanSimilarity(a: boolean, b: boolean): number {
  return a === b ? 1 : 0;
}

function hashSimilarity(hashA: string, hashB: string): number {
  return hashA === hashB ? 1 : 0;
}

// ───────────────────────────────────────────────────────────────
// Per-Dimension Scorers
// ───────────────────────────────────────────────────────────────

function scoreLayout(a: LayoutFingerprint, b: LayoutFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    sequenceSimilarity(a.nodeTypeSequence, b.nodeTypeSequence) * 0.25,
    numericSimilarity(a.nodeCount, b.nodeCount, Math.max(a.nodeCount, b.nodeCount, 5)) * 0.15,
    jaccardSimilarity(a.depthDistribution, b.depthDistribution) * 0.10,
    jaccardSimilarity(a.spanDistribution, b.spanDistribution) * 0.10,
    sequenceSimilarity(a.edgeTypeSequence, b.edgeTypeSequence) * 0.05,
    booleanSimilarity(a.hasNesting, b.hasNesting) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreVisualHierarchy(a: VisualHierarchyFingerprint, b: VisualHierarchyFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    (a.dominantElementType === b.dominantElementType ? 1 : 0) * 0.20,
    jaccardSimilarity(a.weightDistribution, b.weightDistribution) * 0.20,
    sequenceSimilarity(a.visualWeightSequence, b.visualWeightSequence) * 0.15,
    (a.progressionType === b.progressionType ? 1 : 0) * 0.10,
    (a.tensionCurveSignature === b.tensionCurveSignature ? 1 : jaccardSimilarity(a.tensionCurveSignature, b.tensionCurveSignature)) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreTypography(a: TypographyFingerprint, b: TypographyFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    (a.headingFamily === b.headingFamily ? 1 : a.headingFamily.split(" ")[0] === b.headingFamily.split(" ")[0] ? 0.5 : 0) * 0.25,
    (a.bodyFamily === b.bodyFamily ? 1 : a.bodyFamily.split(" ")[0] === b.bodyFamily.split(" ")[0] ? 0.5 : 0) * 0.15,
    numericSimilarity(a.scaleRatio, b.scaleRatio, 5) * 0.15,
    (a.weightContrast === b.weightContrast ? 1 : numericSimilarity(a.weightContrast, b.weightContrast, 500)) * 0.10,
    (a.letterSpacingTightness === b.letterSpacingTightness ? 1 : 0) * 0.03,
    booleanSimilarity(a.hasMonoAccent, b.hasMonoAccent) * 0.02,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreSpacing(a: SpacingFingerprint, b: SpacingFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    (a.rhythmPattern === b.rhythmPattern ? 1 : 0) * 0.25,
    (a.baseUnitSize === b.baseUnitSize ? 1 : numericSimilarity(parseFloat(a.baseUnitSize), parseFloat(b.baseUnitSize), 10)) * 0.15,
    numericSimilarity(a.gapDensity, b.gapDensity, 1) * 0.15,
    numericSimilarity(a.scaleRatio, b.scaleRatio, 3) * 0.10,
    (a.paddingStrategy === b.paddingStrategy ? 1 : 0) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreComposition(a: CompositionFingerprint, b: CompositionFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    (a.globalBalance === b.globalBalance ? 1 : a.globalBalance.split("-")[0] === b.globalBalance.split("-")[0] ? 0.5 : 0) * 0.20,
    (a.primaryAxis === b.primaryAxis ? 1 : 0) * 0.15,
    (a.readingPattern === b.readingPattern ? 1 : 0) * 0.10,
    jaccardSimilarity(a.focalPointDistribution, b.focalPointDistribution) * 0.10,
    numericSimilarity(a.negativeSpaceRatio, b.negativeSpaceRatio, 1) * 0.10,
    (a.alignmentStrategy === b.alignmentStrategy ? 1 : 0) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreStructure(a: StructureFingerprint, b: StructureFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    numericSimilarity(a.sectionCount, b.sectionCount, Math.max(a.sectionCount, b.sectionCount, 5)) * 0.15,
    sequenceSimilarity(a.sectionTypeSequence, b.sectionTypeSequence) * 0.20,
    numericSimilarity(a.ctaCount, b.ctaCount, 5) * 0.10,
    (a.ctaPositions === b.ctaPositions ? 1 : 0) * 0.10,
    numericSimilarity(a.contentBlockCount, b.contentBlockCount, 10) * 0.10,
    booleanSimilarity(a.hasNestedSections, b.hasNestedSections) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scorePageRhythm(a: PageRhythmFingerprint, b: PageRhythmFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    (a.pacing === b.pacing ? 1 : 0) * 0.20,
    (a.scrollBehavior === b.scrollBehavior ? 1 : 0) * 0.15,
    sequenceSimilarity(a.transitionSequence, b.transitionSequence) * 0.15,
    numericSimilarity(a.densityVariance, b.densityVariance, 2) * 0.10,
    numericSimilarity(a.tensionVariance, b.tensionVariance, 2) * 0.05,
    numericSimilarity(a.visualWeightVariance, b.visualWeightVariance, 2) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

function scoreComponentArrangement(a: ComponentArrangementFingerprint, b: ComponentArrangementFingerprint): number {
  const scores = [
    hashSimilarity(a.hash, b.hash) * 0.30,
    sequenceSimilarity(a.gridTypeSequence, b.gridTypeSequence) * 0.20,
    sequenceSimilarity(a.mediaPlacementSequence, b.mediaPlacementSequence) * 0.20,
    (a.ctaPlacementSequence === b.ctaPlacementSequence ? 1 : 0) * 0.15,
    numericSimilarity(a.interactiveElementCount, b.interactiveElementCount, 10) * 0.10,
    numericSimilarity(a.interactiveElementDensity, b.interactiveElementDensity, 1) * 0.05,
  ];
  return scores.reduce((s, w) => s + w, 0);
}

// ───────────────────────────────────────────────────────────────
// Full Similarity Score
// ───────────────────────────────────────────────────────────────

export function computeSimilarity(
  candidate: WebsiteFingerprint,
  existing: WebsiteFingerprint,
  config: DiversityEngineConfig = DEFAULT_CONFIG
): SimilarityScore {
  const layout = scoreLayout(candidate.layout, existing.layout);
  const visualHierarchy = scoreVisualHierarchy(candidate.visualHierarchy, existing.visualHierarchy);
  const typography = scoreTypography(candidate.typography, existing.typography);
  const spacing = scoreSpacing(candidate.spacing, existing.spacing);
  const composition = scoreComposition(candidate.composition, existing.composition);
  const structure = scoreStructure(candidate.structure, existing.structure);
  const pageRhythm = scorePageRhythm(candidate.pageRhythm, existing.pageRhythm);
  const componentArrangement = scoreComponentArrangement(
    candidate.componentArrangement,
    existing.componentArrangement
  );

  const component = (layout * 0.40 + structure * 0.40 + componentArrangement * 0.20);
  const visual = (visualHierarchy * 0.50 + composition * 0.30 + typography * 0.20);
  const structural = (spacing * 0.60 + pageRhythm * 0.40);

  const w = config.dimensionWeights;
  const overall =
    layout * w.layout +
    visualHierarchy * w.visualHierarchy +
    typography * w.typography +
    spacing * w.spacing +
    composition * w.composition +
    structure * w.structure +
    pageRhythm * w.pageRhythm +
    componentArrangement * w.componentArrangement;

  const matchingDimensions: string[] = [];
  const divergentDimensions: string[] = [];

  const dimensions = {
    layout, visualHierarchy, typography, spacing,
    composition, structure, pageRhythm, componentArrangement,
  };

  for (const [name, score] of Object.entries(dimensions)) {
    const threshold = config.dimensionThresholds[name as keyof typeof config.dimensionThresholds] ?? 0.8;
    if (score >= threshold) {
      matchingDimensions.push(name);
    } else {
      divergentDimensions.push(name);
    }
  }

  return {
    layout,
    visualHierarchy,
    typography,
    spacing,
    composition,
    structure,
    pageRhythm,
    componentArrangement,
    component,
    visual,
    structural,
    overall,
    matchingDimensions,
    divergentDimensions,
  };
}

// ───────────────────────────────────────────────────────────────
// Similarity Report against Generation History
// ───────────────────────────────────────────────────────────────

export function generateSimilarityReport(
  candidate: WebsiteFingerprint,
  history: GenerationRecord[],
  config: DiversityEngineConfig = DEFAULT_CONFIG
): SimilarityReport {
  if (history.length === 0) {
    return {
      comparedAgainst: 0,
      highestSimilarity: 0,
      allScores: [],
      exceedsThreshold: false,
      thresholdUsed: config.similarityThreshold,
      recommendedMutationStrategies: [],
    };
  }

  const scores = history.map((record) => ({
    recordId: record.id,
    score: computeSimilarity(candidate, record.fingerprint, config),
    details: computeSimilarity(candidate, record.fingerprint, config),
  }));

  const sorted = [...scores].sort((a, b) => b.score.overall - a.score.overall);
  const highest = sorted[0];

  const exceedsThreshold = highest.score.overall >= config.similarityThreshold;

  // Determine mutation strategies based on which dimensions are most similar
  const strategies: MutationStrategy[] = [];
  const dimScores = highest.score;

  if (dimScores.layout >= config.dimensionThresholds.layout) {
    strategies.push("layout-reorder", "layout-type-swap");
    if (highest.score.component >= 0.8) strategies.push("layout-depth-shift", "layout-span-inversion");
  }
  if (dimScores.visualHierarchy >= config.dimensionThresholds.visualHierarchy) {
    strategies.push("hierarchy-weight-inversion", "hierarchy-flatten");
    if (highest.score.visual >= 0.8) strategies.push("hierarchy-intensify");
  }
  if (dimScores.typography >= config.dimensionThresholds.typography) {
    strategies.push("typography-scale-shift", "typography-family-swap", "typography-mono-inject");
  }
  if (dimScores.spacing >= config.dimensionThresholds.spacing) {
    strategies.push("spacing-rhythm-invert", "spacing-expand", "spacing-compress");
  }
  if (dimScores.composition >= config.dimensionThresholds.composition) {
    strategies.push("composition-balance-flip", "composition-axis-rotate", "composition-focal-scatter");
  }
  if (dimScores.structure >= config.dimensionThresholds.structure) {
    strategies.push("structure-cta-reposition", "structure-fold-insert", "structure-section-type-swap");
    if (highest.score.component >= 0.8) strategies.push("structure-nest-toggle");
  }
  if (dimScores.pageRhythm >= config.dimensionThresholds.pageRhythm) {
    strategies.push("rhythm-pacing-shift", "rhythm-transition-variant", "rhythm-density-invert");
  }
  if (dimScores.componentArrangement >= config.dimensionThresholds.componentArrangement) {
    strategies.push("arrangement-grid-variant", "arrangement-media-scatter", "arrangement-interactive-swap");
  }

  // Remove duplicates
  const uniqueStrategies = [...new Set(strategies)];

  return {
    comparedAgainst: history.length,
    highestSimilarity: highest.score.overall,
    mostSimilarRecord: history.find((r) => r.id === highest.recordId),
    allScores: sorted.map((s) => ({
      recordId: s.recordId,
      score: s.score.overall,
      details: s.score,
    })),
    exceedsThreshold,
    thresholdUsed: config.similarityThreshold,
    recommendedMutationStrategies: uniqueStrategies,
  };
}

// ───────────────────────────────────────────────────────────────
// Quick Global Hash Collision Check
// ───────────────────────────────────────────────────────────────

export function hasHashCollision(
  candidate: WebsiteFingerprint,
  history: GenerationRecord[]
): { collision: boolean; matches: GenerationRecord[] } {
  const matches = history.filter(
    (r) => r.fingerprint.globalHash === candidate.globalHash
  );
  return {
    collision: matches.length > 0,
    matches,
  };
}
