/**
 * Universal Diversity Mutation Engine — Main Orchestrator
 * Checks diversity, applies mutations, manages history, produces final layout.
 */

import {
  DiversityEngineConfig,
  DEFAULT_CONFIG,
  DiversityCheckResult,
  DiversityEngineInput,
  GenerationRecord,
  WebsiteFingerprint,
  MutationResult,
} from "./types";
import { generateWebsiteFingerprint, fingerprintToString } from "./fingerprint";
import { generateSimilarityReport, hasHashCollision } from "./similarity";
import { mutateUntilDiverse } from "./mutator";

// ───────────────────────────────────────────────────────────────
// Simple in-memory history (replace with persistent storage in production)
// ───────────────────────────────────────────────────────────────

let globalHistory: GenerationRecord[] = [];

function getHistory(config: DiversityEngineConfig): GenerationRecord[] {
  // Trim to max size
  if (globalHistory.length > config.historySize) {
    globalHistory = globalHistory.slice(-config.historySize);
  }
  return globalHistory;
}

function addToHistory(record: GenerationRecord, config: DiversityEngineConfig): void {
  globalHistory.push(record);
  if (globalHistory.length > config.historySize) {
    globalHistory = globalHistory.slice(-config.historySize);
  }
}

// ───────────────────────────────────────────────────────────────
// Main Diversity Check Function
// ───────────────────────────────────────────────────────────────

export function checkDiversity(
  input: DiversityEngineInput,
  config: DiversityEngineConfig = DEFAULT_CONFIG
): DiversityCheckResult {
  const startTime = Date.now();

  // 1. Generate fingerprint
  const fingerprint = generateWebsiteFingerprint(input);

  // 2. Check for exact hash collision
  const collision = hasHashCollision(fingerprint, getHistory(config));

  // 3. Generate similarity report
  const history = getHistory(config);
  const report = generateSimilarityReport(fingerprint, history, config);

  // 4. If exact collision or exceeds threshold, mutate
  let mutationResult: MutationResult | undefined;
  let finalFingerprint = fingerprint;
  let finalInput = input;

  if (collision.collision || report.exceedsThreshold) {
    // Run mutation loop
    mutationResult = mutateUntilDiverse(finalInput, history, config);

    if (mutationResult.success) {
      finalFingerprint = mutationResult.fingerprintAfter;
      // The mutator may have modified the input in-place, so use the latest version
    }
  }

  // 5. Determine if diverse enough
  const isDiverse = !report.exceedsThreshold && !collision.collision &&
    (mutationResult ? mutationResult.similarityAfter.overall < config.similarityThreshold : true);

  const checkTimeMs = Date.now() - startTime;

  return {
    isDiverse,
    fingerprint: finalFingerprint,
    report,
    mutationResult,
    configUsed: config,
    checkTimeMs,
  };
}

// ───────────────────────────────────────────────────────────────
// Register a generation in history
// ───────────────────────────────────────────────────────────────

export function registerGeneration(
  prompt: string,
  fingerprint: WebsiteFingerprint,
  config: DiversityEngineConfig = DEFAULT_CONFIG
): GenerationRecord {
  const record: GenerationRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    prompt,
    promptHash: fingerprint.promptHash,
    fingerprint,
  };

  addToHistory(record, config);
  return record;
}

// ───────────────────────────────────────────────────────────────
// Get diversity statistics
// ───────────────────────────────────────────────────────────────

export function getDiversityStats(config: DiversityEngineConfig = DEFAULT_CONFIG): {
  totalGenerations: number;
  uniqueFingerprints: number;
  averageSimilarity: number;
  mostCommonDimensions: string[];
} {
  const history = getHistory(config);

  const hashes = new Set(history.map((r) => r.fingerprint.globalHash));
  const dimFreq: Record<string, number> = {};

  for (const record of history) {
    for (const dim of [
      "layout", "visualHierarchy", "typography", "spacing",
      "composition", "structure", "pageRhythm", "componentArrangement",
    ]) {
      const hash = record.fingerprint[dim as keyof WebsiteFingerprint] as WebsiteFingerprint["layout"];
      if (hash && typeof hash === "object" && "hash" in hash) {
        const key = `${dim}:${(hash as { hash: string }).hash}`;
        dimFreq[key] = (dimFreq[key] || 0) + 1;
      }
    }
  }

  const mostCommon = Object.entries(dimFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k.split(":")[0]);

  // Calculate average similarity (simplified)
  let totalSim = 0;
  let count = 0;
  for (let i = 0; i < history.length; i++) {
    for (let j = i + 1; j < history.length; j++) {
      const a = history[i].fingerprint;
      const b = history[j].fingerprint;
      let matches = 0;
      let total = 0;
      for (const dim of ["layout", "visualHierarchy", "typography", "spacing", "composition", "structure", "pageRhythm", "componentArrangement"]) {
        const hashA = (a[dim as keyof WebsiteFingerprint] as { hash: string })?.hash;
        const hashB = (b[dim as keyof WebsiteFingerprint] as { hash: string })?.hash;
        total++;
        if (hashA === hashB) matches++;
      }
      totalSim += 1 - matches / total;
      count++;
    }
  }

  const averageSimilarity = count > 0 ? totalSim / count : 0;

  return {
    totalGenerations: history.length,
    uniqueFingerprints: hashes.size,
    averageSimilarity,
    mostCommonDimensions: [...new Set(mostCommon)],
  };
}

// ───────────────────────────────────────────────────────────────
// Clear history (for testing / reset)
// ───────────────────────────────────────────────────────────────

export function clearHistory(): void {
  globalHistory = [];
}

// ───────────────────────────────────────────────────────────────
// Batch diversity check (for testing multiple prompts)
// ───────────────────────────────────────────────────────────────

export function checkBatchDiversity(
  inputs: DiversityEngineInput[],
  config: DiversityEngineConfig = DEFAULT_CONFIG
): Array<DiversityCheckResult & { inputIndex: number }> {
  const results: Array<DiversityCheckResult & { inputIndex: number }> = [];

  for (let i = 0; i < inputs.length; i++) {
    const result = checkDiversity(inputs[i], config);
    results.push({ ...result, inputIndex: i });

    // Register each in history
    registerGeneration(inputs[i].prompt, result.fingerprint, config);
  }

  return results;
}
