#!/usr/bin/env python3
"""
Storebuilder.ph — Self-hosted image generator (YOUR OWN system, no third-party API).

A tiny local service that turns the engine's text prompts into real photographs
using an open-source Stable Diffusion model running on YOUR machine. The Next.js
engine (lib/engine/image-backend.ts) POSTs to /sdapi/v1/txt2img and receives a
base64 PNG — the same contract AUTOMATIC1111 uses, so you can also point the
engine at a full A1111 install if you prefer.

The model weights are downloaded ONCE from Hugging Face the first time you run
this; after that everything is local. This is not a paid API and not a runtime
third-party dependency — it is your own generator.

----------------------------------------------------------------------
SETUP
----------------------------------------------------------------------
  cd tools/image-generator
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python server.py            # serves on http://127.0.0.1:7860

Then in your Next.js app set (e.g. in .env.local):
  IMAGE_GEN_ENABLED=1
  IMAGE_GEN_URL=http://127.0.0.1:7860

GPU strongly recommended (NVIDIA CUDA / Apple MPS). On CPU it works but is slow.
Default model is SDXL-Turbo (fast, ~1-6 steps). Override with MODEL_ID env var.
----------------------------------------------------------------------
"""
import base64
import io
import os

import torch
from diffusers import AutoPipelineForText2Image
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_ID = os.environ.get("MODEL_ID", "stabilityai/sdxl-turbo")

def pick_device():
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32

DEVICE, DTYPE = pick_device()
print(f"[image-generator] loading {MODEL_ID} on {DEVICE} ({DTYPE}) ...")
pipe = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=DTYPE, variant="fp16" if DTYPE == torch.float16 else None)
pipe = pipe.to(DEVICE)
print("[image-generator] ready.")

app = FastAPI(title="Storebuilder image generator")


class Txt2Img(BaseModel):
    prompt: str
    negative_prompt: str = ""
    seed: int = 0
    width: int = 768
    height: int = 768
    steps: int = 6
    cfg_scale: float = 2.0
    sampler_name: str = "Euler a"  # accepted for A1111 compatibility, ignored here


@app.post("/sdapi/v1/txt2img")
def txt2img(req: Txt2Img):
    # SDXL-Turbo wants guidance_scale ~0; keep low for other models too.
    generator = torch.Generator(device=DEVICE).manual_seed(int(req.seed) & 0x7FFFFFFF)
    # Round dims to multiples of 8 (model requirement).
    w = max(256, (req.width // 8) * 8)
    h = max(256, (req.height // 8) * 8)
    image = pipe(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt or None,
        num_inference_steps=max(1, int(req.steps)),
        guidance_scale=float(req.cfg_scale),
        width=w,
        height=h,
        generator=generator,
    ).images[0]

    buf = io.BytesIO()
    image.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    # A1111-compatible response shape.
    return {"images": [b64], "parameters": req.dict(), "info": ""}


@app.get("/healthz")
def healthz():
    return {"ok": True, "model": MODEL_ID, "device": DEVICE}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", "7860")))
