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
// Conversion History System — process-persistent generation registry.
// Stored on globalThis so it survives module re-evaluation (Next.js dev
// hot-reload, route handler re-imports) within a single server process.
// ───────────────────────────────────────────────────────────────

const HISTORY_KEY = "__fleet_diversity_history__";

function getHistoryStore(): GenerationRecord[] {
  const g = globalThis as unknown as Record<string, GenerationRecord[] | undefined>;
  if (!g[HISTORY_KEY]) g[HISTORY_KEY] = [];
  return g[HISTORY_KEY]!;
}

function setHistoryStore(records: GenerationRecord[]): void {
  (globalThis as unknown as Record<string, GenerationRecord[]>)[HISTORY_KEY] = records;
}

function getHistory(config: DiversityEngineConfig): GenerationRecord[] {
  let store = getHistoryStore();
  if (store.length > config.historySize) {
    store = store.slice(-config.historySize);
    setHistoryStore(store);
  }
  return store;
}

function addToHistory(record: GenerationRecord, config: DiversityEngineConfig): void {
  const store = getHistoryStore();
  store.push(record);
  if (store.length > config.historySize) {
    setHistoryStore(store.slice(-config.historySize));
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
  const finalInput = input;
  let mutatedInput: DiversityEngineInput | undefined;

  if (collision.collision || report.exceedsThreshold) {
    // Run mutation loop
    mutationResult = mutateUntilDiverse(finalInput, history, config);

    if (mutationResult.success) {
      finalFingerprint = mutationResult.fingerprintAfter;
      // Surface the mutated layout graph so the renderer renders the diverse version.
      mutatedInput = mutationResult.mutatedInput;
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
    mutatedInput,
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
  setHistoryStore([]);
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
