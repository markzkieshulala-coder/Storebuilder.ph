/**
 * Universal Diversity Mutation Engine - Type System
 * Prevents repetitive website generations across all dimensions.
 */

// ───────────────────────────────────────────────────────────────
// Fingerprints — Compact structural identifiers
// ───────────────────────────────────────────────────────────────

export type FingerprintString = string;

export interface LayoutFingerprint {
  hash: FingerprintString;
  nodeTypeSequence: string;        // e.g., "hero,strip,cluster,split,signal"
  nodeCount: number;
  depthDistribution: string;       // e.g., "0:3,1:5,10:1"
  spanDistribution: string;        // e.g., "full:4,contained:2,bleed:1"
  edgeTypeSequence: string;        // e.g., "sequence,fold,contrast,echo"
  complexity: string;
  hasNesting: boolean;
}

export interface VisualHierarchyFingerprint {
  hash: FingerprintString;
  dominantElementType: string;
  weightDistribution: string;      // e.g., "dominant:1,heavy:3,medium:4,light:2"
  visualWeightSequence: string;  // e.g., "dominant,light,heavy,medium,heavy"
  tensionCurveSignature: string; // compressed curve representation
  densityCurveSignature: string;
  progressionType: string;
}

export interface TypographyFingerprint {
  hash: FingerprintString;
  headingFamily: string;
  bodyFamily: string;
  scaleRatio: number;              // hero / body ratio
  weightContrast: number;          // heading weight - body weight
  letterSpacingTightness: string; // loose, normal, tight
  hasMonoAccent: boolean;
}

export interface SpacingFingerprint {
  hash: FingerprintString;
  rhythmPattern: string;           // e.g., "even,accelerating,decelerating"
  baseUnitSize: string;
  sectionGapRange: string;         // e.g., "2rem-8rem"
  gapDensity: number;            // low = generous, high = tight
  scaleRatio: number;
  paddingStrategy: string;         // uniform, asymmetric, breathing
}

export interface CompositionFingerprint {
  hash: FingerprintString;
  globalBalance: string;
  primaryAxis: string;
  readingPattern: string;
  focalPointDistribution: string;  // e.g., "center:3,left:2,right:1"
  negativeSpaceRatio: number;
  alignmentStrategy: string;       // strict, loose, broken
  tensionLevel: string;
}

export interface StructureFingerprint {
  hash: FingerprintString;
  sectionCount: number;
  sectionTypeSequence: string;     // e.g., "hero,trust,features,pricing,faq,footer"
  ctaCount: number;
  ctaPositions: string;            // e.g., "2,5,8"
  foldCount: number;
  foldPositions: string;
  contentBlockCount: number;
  hasNestedSections: boolean;
}

export interface PageRhythmFingerprint {
  hash: FingerprintString;
  pacing: string;                 // fast, medium, slow, variable
  scrollBehavior: string;
  transitionSequence: string;     // e.g., "sequence,fold,contrast,reveal"
  densityVariance: number;        // how much density changes across page
  tensionVariance: number;
  visualWeightVariance: number;
  sectionLengthVariance: number;  // variance in section heights
}

export interface ComponentArrangementFingerprint {
  hash: FingerprintString;
  gridTypeSequence: string;       // e.g., "uniform,bento,uniform,masonry"
  mediaPlacementSequence: string; // e.g., "background,inline-left,none,contained"
  ctaPlacementSequence: string;
  interactiveElementCount: number;
  interactiveElementDensity: number;
}

// ───────────────────────────────────────────────────────────────
// Complete Website Fingerprint
// ───────────────────────────────────────────────────────────────

export interface WebsiteFingerprint {
  version: string;
  generatedAt: string;
  promptHash: string;

  layout: LayoutFingerprint;
  visualHierarchy: VisualHierarchyFingerprint;
  typography: TypographyFingerprint;
  spacing: SpacingFingerprint;
  composition: CompositionFingerprint;
  structure: StructureFingerprint;
  pageRhythm: PageRhythmFingerprint;
  componentArrangement: ComponentArrangementFingerprint;

  // ── Global signature ──
  globalHash: FingerprintString;
  component: FingerprintString; // combined layout + structure + component arrangement
  visual: FingerprintString;    // combined visual hierarchy + composition + typography
  structural: FingerprintString;  // combined spacing + page rhythm
}

// ───────────────────────────────────────────────────────────────
// Generation History
// ───────────────────────────────────────────────────────────────

export interface GenerationRecord {
  id: string;
  timestamp: number;
  prompt: string;
  promptHash: string;
  fingerprint: WebsiteFingerprint;
}

export interface DiversityHistory {
  maxRecords: number;
  records: GenerationRecord[];
}

// ───────────────────────────────────────────────────────────────
// Similarity Scores
// ───────────────────────────────────────────────────────────────

export interface SimilarityScore {
  layout: number;           // 0-1
  visualHierarchy: number;
  typography: number;
  spacing: number;
  composition: number;
  structure: number;
  pageRhythm: number;
  componentArrangement: number;

  component: number;        // combined
  visual: number;          // combined
  structural: number;      // combined
  overall: number;         // weighted composite

  matchingDimensions: string[];
  divergentDimensions: string[];
}

export interface SimilarityReport {
  comparedAgainst: number;  // how many records in history
  highestSimilarity: number;
  mostSimilarRecord?: GenerationRecord;
  allScores: Array<{ recordId: string; score: number; details: SimilarityScore }>;
  exceedsThreshold: boolean;
  thresholdUsed: number;
  recommendedMutationStrategies: MutationStrategy[];
}

// ───────────────────────────────────────────────────────────────
// Mutation Strategies
// ───────────────────────────────────────────────────────────────

export type MutationStrategy =
  | "layout-reorder"
  | "layout-type-swap"
  | "layout-depth-shift"
  | "layout-span-inversion"
  | "hierarchy-weight-inversion"
  | "hierarchy-flatten"
  | "hierarchy-intensify"
  | "typography-scale-shift"
  | "typography-family-swap"
  | "typography-mono-inject"
  | "spacing-rhythm-invert"
  | "spacing-expand"
  | "spacing-compress"
  | "composition-balance-flip"
  | "composition-axis-rotate"
  | "composition-focal-scatter"
  | "structure-cta-reposition"
  | "structure-fold-insert"
  | "structure-section-type-swap"
  | "structure-nest-toggle"
  | "rhythm-pacing-shift"
  | "rhythm-transition-variant"
  | "rhythm-density-invert"
  | "arrangement-grid-variant"
  | "arrangement-media-scatter"
  | "arrangement-interactive-swap";

export interface MutationPlan {
  strategies: MutationStrategy[];
  reason: string;
  affectedDimensions: string[];
  severity: "minor" | "moderate" | "major" | "extreme";
  iteration: number;
}

export interface MutationResult {
  success: boolean;
  plan: MutationPlan;
  appliedStrategies: MutationStrategy[];
  fingerprintAfter: WebsiteFingerprint;
  similarityAfter: SimilarityScore;
  similarityBefore: SimilarityScore;
  improvement: number; // how much similarity decreased
  iterations: number;
  warnings: string[];
  errors: string[];
}

// ───────────────────────────────────────────────────────────────
// Engine Configuration
// ───────────────────────────────────────────────────────────────

export interface DiversityEngineConfig {
  historySize: number;
  similarityThreshold: number;      // 0-1, above which triggers mutation
  maxMutationIterations: number;
  autoMutate: boolean;            // automatically mutate if threshold exceeded

  // Per-dimension weights for overall score
  dimensionWeights: {
    layout: number;
    visualHierarchy: number;
    typography: number;
    spacing: number;
    composition: number;
    structure: number;
    pageRhythm: number;
    componentArrangement: number;
  };

  // Per-dimension thresholds
  dimensionThresholds: {
    layout: number;
    visualHierarchy: number;
    typography: number;
    spacing: number;
    composition: number;
    structure: number;
    pageRhythm: number;
    componentArrangement: number;
  };

  // Mutation severity rules
  severityThresholds: {
    minor: number;     // 0.7-0.8
    moderate: number;  // 0.8-0.9
    major: number;     // 0.9-0.95
    extreme: number;   // 0.95+
  };

  // Strategy selection weights
  strategyWeights: Partial<Record<MutationStrategy, number>>;
}

export const DEFAULT_CONFIG: DiversityEngineConfig = {
  historySize: 100,
  similarityThreshold: 0.75,
  maxMutationIterations: 3,
  autoMutate: true,

  dimensionWeights: {
    layout: 0.20,
    visualHierarchy: 0.15,
    typography: 0.10,
    spacing: 0.15,
    composition: 0.15,
    structure: 0.15,
    pageRhythm: 0.05,
    componentArrangement: 0.05,
  },

  dimensionThresholds: {
    layout: 0.75,
    visualHierarchy: 0.80,
    typography: 0.85,
    spacing: 0.80,
    composition: 0.75,
    structure: 0.80,
    pageRhythm: 0.90,
    componentArrangement: 0.90,
  },

  severityThresholds: {
    minor: 0.70,
    moderate: 0.80,
    major: 0.90,
    extreme: 0.95,
  },

  strategyWeights: {},
};

// ───────────────────────────────────────────────────────────────
// Diversity Check Result
// ───────────────────────────────────────────────────────────────

export interface DiversityCheckResult {
  isDiverse: boolean;
  fingerprint: WebsiteFingerprint;
  report: SimilarityReport;
  mutationResult?: MutationResult;
  configUsed: DiversityEngineConfig;
  checkTimeMs: number;
}

// ───────────────────────────────────────────────────────────────
// Engine Input/Output
// ───────────────────────────────────────────────────────────────

export interface DiversityEngineInput {
  prompt: string;
  layoutGraph: {
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
      children?: unknown[];
    }>;
    edges: Array<{
      from: string;
      to: string;
      type: string;
      weight: number;
      spacingMultiplier: number;
    }>;
    complexity: string;
    hasNesting: boolean;
    maxDepth: number;
    nodeCount: number;
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
    gridSystem: {
      baseUnit: string;
      maxWidth: string;
      gutter: string;
      columnCount: number;
      behavior: string;
    };
    spacingRhythm: {
      pattern: string;
      base: string;
      ratio: number;
      values: string[];
    };
    visualHierarchy: {
      levels: number;
      dominantElement: string;
      rhythm: string;
      progression: string;
    };
  };
  visualSystem: {
    colorPalette: Record<string, string>;
    typography: {
      family: { heading: string; body: string; mono?: string };
      scale: Record<string, string>;
      weight: { heading: number; body: number; bold: number };
      letterSpacing: { heading: string; body: string };
    };
    borderRadius: {
      style: string;
    };
    shadows: {
      style: string;
    };
    spacing: {
      unit: number;
      section: string;
      container: string;
      gutter: string;
      gridGap: string;
      scale: string[];
    };
  };
}
