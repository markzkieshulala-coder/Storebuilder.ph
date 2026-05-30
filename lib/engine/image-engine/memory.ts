import { promises as fs } from "node:fs";
import path from "node:path";

export interface EngineMemoryState {
  recentFingerprints: string[];
  recentPrompts: string[];
  recentModes: string[];
  recentKinds: string[];
}

const DEFAULT_STATE: EngineMemoryState = {
  recentFingerprints: [],
  recentPrompts: [],
  recentModes: [],
  recentKinds: [],
};

export class VariationMemory {
  constructor(private readonly memoryPath: string, private readonly maxEntries = 80) {}

  async load(): Promise<EngineMemoryState> {
    try {
      const raw = await fs.readFile(this.memoryPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<EngineMemoryState>;
      return {
        recentFingerprints: Array.isArray(parsed.recentFingerprints) ? parsed.recentFingerprints.slice(-this.maxEntries) : [],
        recentPrompts: Array.isArray(parsed.recentPrompts) ? parsed.recentPrompts.slice(-this.maxEntries) : [],
        recentModes: Array.isArray(parsed.recentModes) ? parsed.recentModes.slice(-this.maxEntries) : [],
        recentKinds: Array.isArray(parsed.recentKinds) ? parsed.recentKinds.slice(-this.maxEntries) : [],
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  async save(state: EngineMemoryState): Promise<void> {
    await fs.mkdir(path.dirname(this.memoryPath), { recursive: true });
    const trimmed: EngineMemoryState = {
      recentFingerprints: state.recentFingerprints.slice(-this.maxEntries),
      recentPrompts: state.recentPrompts.slice(-this.maxEntries),
      recentModes: state.recentModes.slice(-this.maxEntries),
      recentKinds: state.recentKinds.slice(-this.maxEntries),
    };
    await fs.writeFile(this.memoryPath, JSON.stringify(trimmed, null, 2), "utf8");
  }

  isRepeated(fingerprint: string, state: EngineMemoryState): boolean {
    return state.recentFingerprints.includes(fingerprint);
  }

  record(state: EngineMemoryState, entry: { fingerprint: string; prompt: string; mode: string; kind: string }): EngineMemoryState {
    return {
      recentFingerprints: [...state.recentFingerprints, entry.fingerprint].slice(-this.maxEntries),
      recentPrompts: [...state.recentPrompts, entry.prompt].slice(-this.maxEntries),
      recentModes: [...state.recentModes, entry.mode].slice(-this.maxEntries),
      recentKinds: [...state.recentKinds, entry.kind].slice(-this.maxEntries),
    };
  }
}
