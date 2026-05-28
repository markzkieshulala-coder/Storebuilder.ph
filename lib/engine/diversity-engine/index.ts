/**
 * Universal Diversity Mutation Engine
 * Prevents repetitive website generations across all dimensions.
 */

export { checkDiversity, registerGeneration, getDiversityStats, clearHistory, checkBatchDiversity } from "./engine";
export { generateWebsiteFingerprint, fingerprintToString, extractDimensionHash } from "./fingerprint";
export { computeSimilarity, generateSimilarityReport, hasHashCollision } from "./similarity";
export { mutateUntilDiverse, applyMutation } from "./mutator";
export {
  DEFAULT_CONFIG,
  type DiversityEngineConfig,
  type DiversityEngineInput,
  type WebsiteFingerprint,
  type LayoutFingerprint,
  type VisualHierarchyFingerprint,
  type TypographyFingerprint,
  type SpacingFingerprint,
  type CompositionFingerprint,
  type StructureFingerprint,
  type PageRhythmFingerprint,
  type ComponentArrangementFingerprint,
  type GenerationRecord,
  type SimilarityScore,
  type SimilarityReport,
  type MutationStrategy,
  type MutationPlan,
  type MutationResult,
  type DiversityCheckResult,
  type DiversityHistory,
} from "./types";
