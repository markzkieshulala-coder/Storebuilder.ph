import { WebsiteImageEngine } from "./engine";
import type { GenerationResult, WebsiteVisualRequest } from "./types";

export async function generateWebsiteVisuals(request: WebsiteVisualRequest): Promise<GenerationResult> {
  const engine = new WebsiteImageEngine();
  return engine.generate(request);
}

export function createWebsiteImageEngine(): WebsiteImageEngine {
  return new WebsiteImageEngine();
}
