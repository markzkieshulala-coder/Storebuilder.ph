export type VisualMode = "photorealistic" | "editorial" | "3d-render" | "illustration" | "abstract" | "ui-composite";
export type AssetKind = "hero" | "feature" | "background" | "detail" | "product" | "lifestyle";

export interface BrandContext {
  name?: string;
  description?: string;
  colors?: string[];
  fonts?: string[];
  tone?: string;
  audience?: string;
  logoStyle?: string;
  existingVisualNotes?: string;
}

export interface WebsiteVisualRequest {
  websitePrompt: string;
  brand?: BrandContext;
  siteName?: string;
  section?: string;
  assetCount?: number;
  outputDir?: string;
  backend?: {
    type: "automatic1111";
    apiUrl: string;
    authToken?: string;
  };
  imageSize?: {
    width?: number;
    height?: number;
  };
  modelPreset?: "balanced" | "premium" | "fast";
  /** Cap the longest image edge (px). Turbo models / CPU want ~512-768. */
  maxDimension?: number;
  /** Override diffusion steps (turbo models want 1-6). */
  steps?: number;
  /** Override guidance scale (turbo models want ~1-2). */
  cfgScale?: number;
}

export interface WebsiteAnalysis {
  niche: string;
  nicheConfidence: number;
  primaryAudience: string;
  tone: string;
  styleKeywords: string[];
  visualMode: VisualMode;
  colorPalette: string[];
  compositionNotes: string[];
  contentTokens: string[];
  visualConstraints: string[];
}

export interface AssetPlan {
  id: string;
  kind: AssetKind;
  purpose: string;
  aspectRatio: string;
  width: number;
  height: number;
  visualMode: VisualMode;
  promptSeed: string;
}

export interface GeneratedAsset {
  id: string;
  kind: AssetKind;
  purpose: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: string;
  width: number;
  height: number;
  filePath: string;
  backend: string;
  seed: number;
  fingerprint: string;
}

export interface GenerationResult {
  analysis: WebsiteAnalysis;
  assets: GeneratedAsset[];
  manifestPath: string;
}

export interface ImageBackendRequest {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  seed: number;
  steps: number;
  cfgScale: number;
  samplerName: string;
}

export interface ImageBackendResponse {
  images: Buffer[];
  raw: unknown;
}
