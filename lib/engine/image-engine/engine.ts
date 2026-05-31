import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { analyzeWebsitePrompt, buildPromptSeedTokens, stableHashToNumber } from "./analyze";
import { Automatic1111Backend } from "./backend/automatic1111";
import { VariationMemory } from "./memory";
import {
  AssetKind,
  AssetPlan,
  GenerationResult,
  GeneratedAsset,
  ImageBackendRequest,
  WebsiteVisualRequest,
} from "./types";

const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), "public", "generated");
// Repetition-guard state lives inside the gitignored public/generated dir.
const DEFAULT_MEMORY_FILE = path.resolve(process.cwd(), "public", "generated", ".image-engine-memory.json");

const VARIATION_POOLS = {
  composition: [
    "wide cinematic framing",
    "clean centered framing with negative space",
    "diagonal composition with depth",
    "editorial three-quarter view",
    "close-up crop with premium details",
    "layered foreground and background separation",
    "off-center layout with copy-safe area",
    "product-forward framing with subtle context",
  ],
  lighting: [
    "soft natural light",
    "controlled studio lighting",
    "gentle rim light",
    "high-contrast directional light",
    "diffused daylight",
    "clean softbox lighting",
    "moody cinematic lighting",
  ],
  texture: [
    "subtle grain and tactile detail",
    "smooth premium surfaces",
    "light atmospheric texture",
    "high-fidelity material detail",
    "soft gradients and depth",
    "realistic surface variation",
  ],
  background: [
    "minimal background with quiet spatial depth",
    "brand-colored backdrop with subtle gradient",
    "architectural environment with modern lines",
    "abstract layered backdrop",
    "soft neutral scene with room for copy",
    "refined studio setting without clutter",
  ],
  subject: [
    "single strong focal subject",
    "modular scene with one primary object",
    "human-centered but candid and authentic moment",
    "product-centric composition with design polish",
    "systematic visual metaphor for the service",
    "clean environment that feels bespoke",
  ],
} as const;

const NEGATIVE_PROMPT = [
  "stock photo",
  "generic office",
  "overly posed people",
  "handshake cliché",
  "smiling team in conference room",
  "random unrelated objects",
  "watermark",
  "logo",
  "text overlay",
  "poor anatomy",
  "deformed hands",
  "blurry",
  "low quality",
  "duplicate composition",
  "repetitive image",
  "clip art",
  "template look",
  "oversaturated",
  "flat lighting",
  "messy background",
].join(", ");

// Tuned for the distilled TURBO models the bundled SD server runs
// (stabilityai/sd-turbo on CPU, sdxl-turbo on GPU). Turbo checkpoints are trained
// to converge in 1-6 steps at guidance ~1-2. Running them at 20-36 steps / cfg 6+
// (the values a full SD1.5/SDXL base model wants) is both far slower AND produces
// washed-out, over-saturated results — which is why generation kept timing out.
const PRESET_SETTINGS = {
  fast: { steps: 3, cfgScale: 1.0, samplerName: "Euler a" },
  balanced: { steps: 5, cfgScale: 1.5, samplerName: "Euler a" },
  premium: { steps: 8, cfgScale: 2.0, samplerName: "Euler a" },
} as const;

function roundTo64(value: number): number {
  return Math.max(64, Math.round(value / 64) * 64);
}

// Scale a width/height pair down so the longest edge fits `maxDimension`, keeping
// aspect ratio. Big canvases (1536px) are off-distribution for 512px turbo models
// and brutally slow on CPU; capping keeps generation fast and on-model.
function capDimensions(width: number, height: number, maxDimension?: number): { width: number; height: number } {
  if (!maxDimension || maxDimension <= 0) return { width, height };
  const longest = Math.max(width, height);
  if (longest <= maxDimension) return { width, height };
  const scale = maxDimension / longest;
  return { width: roundTo64(width * scale), height: roundTo64(height * scale) };
}

function ratioToDimensions(ratio: string): { width: number; height: number } {
  switch (ratio) {
    case "16:9":
      return { width: 1536, height: 896 };
    case "4:3":
      return { width: 1280, height: 960 };
    case "3:2":
      return { width: 1536, height: 1024 };
    case "1:1":
      return { width: 1024, height: 1024 };
    case "3:4":
      return { width: 960, height: 1280 };
    case "2:3":
      return { width: 896, height: 1344 };
    default:
      return { width: 1408, height: 896 };
  }
}

function planForIndex(index: number, section?: string): { kind: AssetKind; ratio: string; purpose: string } {
  const requestedSection = (section ?? "").toLowerCase();
  if (index === 0) {
    return { kind: "hero", ratio: "16:9", purpose: requestedSection ? `${requestedSection} hero visual` : "hero section visual" };
  }
  const cycle: Array<{ kind: AssetKind; ratio: string; purpose: string }> = [
    { kind: "feature", ratio: "4:3", purpose: "feature section visual" },
    { kind: "background", ratio: "3:2", purpose: "supporting background visual" },
    { kind: "detail", ratio: "1:1", purpose: "detail or card image" },
    { kind: "product", ratio: "3:4", purpose: "product-focused visual" },
    { kind: "lifestyle", ratio: "2:3", purpose: "lifestyle or human-context visual" },
  ];
  return cycle[(index - 1) % cycle.length] ?? cycle[0]!;
}

function variationToken(seed: number, pool: readonly string[], salt: number): string {
  return pool[(seed + salt) % pool.length] ?? pool[0]!;
}

function buildAssetPrompt(params: {
  websitePrompt: string;
  siteName?: string;
  section?: string;
  plan: AssetPlan;
  analysisText: string;
  analysis: ReturnType<typeof analyzeWebsitePrompt>;
  brandName?: string;
  brandDescription?: string;
  seed: number;
  extraVariation: number;
}): string {
  const { websitePrompt, siteName, section, plan, analysisText, analysis, brandName, brandDescription, seed, extraVariation } = params;
  const modeInstruction: Record<string, string> = {
    photorealistic: "Create a photorealistic scene with authentic details and a bespoke composition.",
    editorial: "Create a premium editorial scene with art direction and strong visual hierarchy.",
    "3d-render": "Create a high-end 3D render with realistic materials and studio presentation.",
    illustration: "Create a custom illustration with layered shapes, refined linework, and brand fidelity.",
    abstract: "Create an abstract but highly intentional design visual with layered form and depth.",
    "ui-composite": "Create a website-ready composite that combines product realism with interface cues.",
  };

  const composition = variationToken(seed + extraVariation, VARIATION_POOLS.composition, plan.id.length);
  const lighting = variationToken(seed + extraVariation, VARIATION_POOLS.lighting, plan.kind.length);
  const texture = variationToken(seed + extraVariation, VARIATION_POOLS.texture, plan.purpose.length);
  const background = variationToken(seed + extraVariation, VARIATION_POOLS.background, plan.aspectRatio.length);
  const subject = variationToken(seed + extraVariation, VARIATION_POOLS.subject, analysis.styleKeywords.length + extraVariation);

  const baseTokens = buildPromptSeedTokens(analysis, websitePrompt, {
    name: brandName,
    description: brandDescription,
  });

  const tokenString = baseTokens.slice(0, 8).join(", ");
  const sectionPrefix = section ? `for the ${section} section ` : "";
  const sitePrefix = siteName ? `for ${siteName} ` : "";
  const brandPrefix = brandName ? `aligned with the ${brandName} brand ` : "";

  return [
    modeInstruction[analysis.visualMode],
    `Design a ${plan.kind} visual ${sectionPrefix}${sitePrefix}${brandPrefix}based on this website brief: ${websitePrompt}`.trim(),
    `Niche: ${analysis.niche}. Audience: ${analysis.primaryAudience}. Tone: ${analysis.tone}.`,
    `Style references: ${analysis.styleKeywords.join(", ")}.`,
    `Visual cues: ${analysisText}.`,
    brandDescription ? `Brand context: ${brandDescription}` : "",
    `Composition: ${composition}; ${lighting}; ${background}; ${subject}.`,
    `Texture and finish: ${texture}.`,
    `Color direction: ${analysis.colorPalette.join(", ")}.`,
    `Site-ready requirement: leave clean copy space, avoid stock-photo clichés, avoid repetitive framing, and make this image feel unique and custom-generated.`,
    `Relevant tokens: ${tokenString}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildNegativePrompt(analysis: ReturnType<typeof analyzeWebsitePrompt>): string {
  const nicheAdditions = [
    analysis.visualMode === "photorealistic" ? "posed smile" : "corporate stock template",
    analysis.visualMode === "ui-composite" ? "random dashboard clutter" : "generic pattern background",
    ...analysis.visualConstraints,
  ];
  return [NEGATIVE_PROMPT, ...nicheAdditions].join(", ");
}

function fingerprintForAsset(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function imageFileName(assetId: string, seed: number): string {
  return `${assetId}-${seed}.png`;
}

export class WebsiteImageEngine {
  private readonly memory: VariationMemory;

  constructor(private readonly defaultBackend = new Automatic1111Backend({ apiUrl: "http://127.0.0.1:7860" })) {
    this.memory = new VariationMemory(DEFAULT_MEMORY_FILE);
  }

  async generate(request: WebsiteVisualRequest): Promise<GenerationResult> {
    if (!request.websitePrompt?.trim()) {
      throw new Error("websitePrompt is required");
    }

    const outputDir = path.resolve(request.outputDir ?? DEFAULT_OUTPUT_DIR);
    await fs.mkdir(outputDir, { recursive: true });

    const analysis = analyzeWebsitePrompt(request.websitePrompt, request.brand);
    const summary = `${analysis.niche} | ${analysis.primaryAudience} | ${analysis.visualMode} | ${analysis.styleKeywords.join(",")}`;
    const memoryState = await this.memory.load();
    const assetCount = Math.max(1, Math.min(request.assetCount ?? 4, 8));
    const backendClient = request.backend
      ? new Automatic1111Backend({ apiUrl: request.backend.apiUrl, authToken: request.backend.authToken })
      : this.defaultBackend;
    const preset = PRESET_SETTINGS[request.modelPreset ?? "balanced"];

    const plans: AssetPlan[] = Array.from({ length: assetCount }, (_, index) => {
      const planned = planForIndex(index, request.section);
      const dims = ratioToDimensions(planned.ratio);
      const seedBasis = `${request.websitePrompt}|${summary}|${planned.kind}|${planned.purpose}|${index}`;
      const baseSeed = stableHashToNumber(seedBasis);
      const capped = capDimensions(
        request.imageSize?.width ?? dims.width,
        request.imageSize?.height ?? dims.height,
        request.maxDimension,
      );
      const width = roundTo64(capped.width);
      const height = roundTo64(capped.height);
      return {
        id: `asset-${index + 1}`,
        kind: planned.kind,
        purpose: planned.purpose,
        aspectRatio: planned.ratio,
        width,
        height,
        visualMode: analysis.visualMode,
        promptSeed: String(baseSeed),
      };
    });

    const assets: GeneratedAsset[] = [];
    let nextMemory = memoryState;

    for (const plan of plans) {
      const seed = stableHashToNumber(`${plan.promptSeed}:${request.websitePrompt}:${plan.id}`);
      const analysisText = [analysis.niche, analysis.tone, analysis.styleKeywords.join(", "), analysis.compositionNotes.join(", ")].join("; ");
      const prompt = buildAssetPrompt({
        websitePrompt: request.websitePrompt,
        siteName: request.siteName,
        section: request.section,
        plan,
        analysisText,
        analysis,
        brandName: request.brand?.name,
        brandDescription: request.brand?.description,
        seed,
        extraVariation: assets.length + nextMemory.recentFingerprints.length,
      });
      const negativePrompt = buildNegativePrompt(analysis);
      const fingerprint = fingerprintForAsset(`${prompt}|${negativePrompt}|${plan.kind}|${plan.aspectRatio}`);
      const repeated = this.memory.isRepeated(fingerprint, nextMemory);
      const finalPrompt = repeated
        ? `${prompt} Add a fresh composition variation, a different camera angle, and a more distinctive background so the result is not repetitive.`
        : prompt;
      const finalFingerprint = fingerprintForAsset(`${finalPrompt}|${negativePrompt}|${plan.kind}|${plan.aspectRatio}`);
      const backendRequest: ImageBackendRequest = {
        prompt: finalPrompt,
        negativePrompt,
        width: plan.width,
        height: plan.height,
        seed: repeated ? seed + 1337 : seed,
        steps: request.steps ?? preset.steps,
        cfgScale: request.cfgScale ?? preset.cfgScale,
        samplerName: preset.samplerName,
      };

      const response = await backendClient.generate(backendRequest);
      const filePath = path.join(outputDir, imageFileName(plan.id, backendRequest.seed));
      await fs.writeFile(filePath, response.images[0]!);

      assets.push({
        id: plan.id,
        kind: plan.kind,
        purpose: plan.purpose,
        prompt: finalPrompt,
        negativePrompt,
        aspectRatio: plan.aspectRatio,
        width: plan.width,
        height: plan.height,
        filePath,
        backend: "automatic1111",
        seed: backendRequest.seed,
        fingerprint: finalFingerprint,
      });

      nextMemory = this.memory.record(nextMemory, {
        fingerprint: finalFingerprint,
        prompt: finalPrompt,
        mode: analysis.visualMode,
        kind: plan.kind,
      });
    }

    await this.memory.save(nextMemory);

    const manifest = {
      generatedAt: new Date().toISOString(),
      summary,
      request: {
        siteName: request.siteName,
        section: request.section,
        outputDir,
        assetCount,
      },
      analysis,
      assets,
    };
    const manifestPath = path.join(outputDir, "manifest.json");
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    return {
      analysis,
      assets,
      manifestPath,
    };
  }
}
