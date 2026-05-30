import { promises as fs } from "node:fs";
import path from "node:path";
import { ImageBackendRequest, ImageBackendResponse } from "../types";

export interface Automatic1111Options {
  apiUrl: string;
  authToken?: string;
}

export class Automatic1111Backend {
  constructor(private readonly options: Automatic1111Options) {}

  async generate(request: ImageBackendRequest): Promise<ImageBackendResponse> {
    const url = new URL("/sdapi/v1/txt2img", this.options.apiUrl).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.options.authToken ? { Authorization: `Bearer ${this.options.authToken}` } : {}),
      },
      body: JSON.stringify({
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        width: request.width,
        height: request.height,
        seed: request.seed,
        steps: request.steps,
        cfg_scale: request.cfgScale,
        sampler_name: request.samplerName,
        batch_size: 1,
        n_iter: 1,
        restore_faces: false,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Automatic1111 request failed (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as { images?: string[] };
    const images = (payload.images ?? []).map((base64) => Buffer.from(base64, "base64"));
    if (images.length === 0) {
      throw new Error("Automatic1111 returned no images");
    }
    return { images, raw: payload };
  }

  async writeFirstImage(buffer: Buffer, outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
}
