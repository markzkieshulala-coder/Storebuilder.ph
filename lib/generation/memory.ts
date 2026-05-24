import fs from "fs";
import path from "path";
import type { GenerationMemoryEntry } from "./types";

const LOG_PATH = path.join(process.cwd(), "lib/generation/data/generation-log.json");

export function readGenerationLog(): GenerationMemoryEntry[] {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    return JSON.parse(raw) as GenerationMemoryEntry[];
  } catch {
    return [];
  }
}

export function appendGenerationLog(entry: GenerationMemoryEntry): void {
  try {
    const log = readGenerationLog();
    log.push(entry);
    // Keep last 20 entries
    const trimmed = log.slice(-20);
    fs.writeFileSync(LOG_PATH, JSON.stringify(trimmed, null, 2));
  } catch {
    // Non-fatal - generation still succeeds
  }
}

export function buildMemoryContext(log: GenerationMemoryEntry[]): string {
  if (log.length === 0) return "No previous generations. All choices are open.";

  const recent = log.slice(-10);
  const heroTypes = recent.map(e => e.fingerprint.hero_type).filter(Boolean);
  const fonts = recent.map(e => e.fingerprint.display_font).filter(Boolean);
  const easings = recent.map(e => e.fingerprint.easing_family).filter(Boolean);
  const personas = recent.map(e => e.fingerprint.agency_persona).filter(Boolean);

  const overused = (arr: string[]) => {
    const counts: Record<string, number> = {};
    arr.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    return Object.entries(counts).filter(([, c]) => c >= 3).map(([k]) => k);
  };

  const warnings: string[] = [];
  overused(heroTypes).forEach(h => warnings.push(`hero_type '${h}' overused — EXCLUDE`));
  overused(fonts).forEach(f => warnings.push(`display_font '${f}' overused — EXCLUDE`));
  overused(easings).forEach(e => warnings.push(`easing_family '${e}' overused — EXCLUDE`));
  overused(personas).forEach(p => warnings.push(`agency_persona '${p}' overused — EXCLUDE`));

  return `PREVIOUS GENERATIONS (last ${recent.length}):
Hero types used: ${heroTypes.join(", ")}
Display fonts used: ${fonts.join(", ")}
Easing families used: ${easings.join(", ")}
Agency personas used: ${personas.join(", ")}

EXCLUSION WARNINGS:
${warnings.length > 0 ? warnings.join("\n") : "None — all choices open"}

IMPORTANT: Actively avoid the excluded items above to ensure visual uniqueness.`;
}
