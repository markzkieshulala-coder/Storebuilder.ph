#!/usr/bin/env python3
"""
Storebuilder.ph — Self-hosted image generator (YOUR OWN system, no third-party API).

A local service that turns the engine's text prompts into real photographs using
an open-source Stable Diffusion model running on YOUR machine. The Next.js engine
(lib/engine/image-backend.ts) POSTs to /sdapi/v1/txt2img and receives a base64
PNG — the same contract AUTOMATIC1111 uses, so you can also point the engine at a
full A1111 install if you prefer.

The model weights download ONCE from Hugging Face on first run; after that it is
fully local. Not a paid API, not a runtime third-party dependency — your own
generator.

----------------------------------------------------------------------
QUICK START
----------------------------------------------------------------------
  cd tools/image-generator
  ./run.sh                      # creates venv, installs, picks a model, serves

  # or manually:
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python server.py              # http://127.0.0.1:7860

Then in .env.local:
  IMAGE_GEN_ENABLED=1
  IMAGE_GEN_URL=http://127.0.0.1:7860

MODEL SELECTION (env MODEL_ID):
  - GPU (CUDA/MPS): stabilityai/sdxl-turbo            (default, 1-6 steps, fast)
  - CPU only:       stabilityai/sd-turbo              (512px, lighter, set MODEL_ID)
The launcher (run.sh) auto-picks sd-turbo on CPU and sdxl-turbo on GPU.
----------------------------------------------------------------------
"""
import base64
import hashlib
import io
import os
import threading
import time

import torch
from diffusers import AutoPipelineForText2Image
from fastapi import FastAPI
from pydantic import BaseModel

MODEL_ID = os.environ.get("MODEL_ID", "stabilityai/sdxl-turbo")
# On-disk cache of generated PNGs so identical prompts are produced once.
CACHE_DIR = os.environ.get("IMAGE_GEN_CACHE", os.path.join(os.path.dirname(__file__), ".cache"))
os.makedirs(CACHE_DIR, exist_ok=True)


def pick_device():
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32


DEVICE, DTYPE = pick_device()
print(f"[image-generator] loading {MODEL_ID} on {DEVICE} ({DTYPE}) ...", flush=True)

_t0 = time.time()
_variant = "fp16" if DTYPE == torch.float16 else None
try:
    pipe = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=DTYPE, variant=_variant)
except Exception:
    # Some models have no fp16 variant — retry without it.
    pipe = AutoPipelineForText2Image.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
pipe = pipe.to(DEVICE)
# Drop the safety checker for product photography (optional). Set DISABLE_SAFETY=0
# to keep it.
if hasattr(pipe, "safety_checker") and os.environ.get("DISABLE_SAFETY", "1") == "1":
    pipe.safety_checker = None
print(f"[image-generator] ready in {time.time() - _t0:.1f}s.", flush=True)

# Serialize inference: a single CPU/GPU pipeline is not safe for concurrent calls.
_lock = threading.Lock()

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


def _cache_key(req: "Txt2Img", w: int, h: int) -> str:
    raw = f"{MODEL_ID}|{req.prompt}|{req.negative_prompt}|{req.seed}|{w}x{h}|{req.steps}|{req.cfg_scale}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:24]


@app.post("/sdapi/v1/txt2img")
def txt2img(req: Txt2Img):
    # Round dims to multiples of 8 (model requirement).
    w = max(256, (req.width // 8) * 8)
    h = max(256, (req.height // 8) * 8)

    # Disk cache hit → return immediately (no recompute).
    key = _cache_key(req, w, h)
    cached = os.path.join(CACHE_DIR, f"{key}.png")
    if os.path.exists(cached):
        with open(cached, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
        return {"images": [b64], "parameters": req.dict(), "info": "cache"}

    generator = torch.Generator(device=DEVICE).manual_seed(int(req.seed) & 0x7FFFFFFF)
    with _lock:
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
    png = buf.getvalue()
    # Persist to disk cache.
    try:
        with open(cached, "wb") as fh:
            fh.write(png)
    except OSError:
        pass

    b64 = base64.b64encode(png).decode("ascii")
    return {"images": [b64], "parameters": req.dict(), "info": ""}


# A1111-compatible model-list endpoint (the engine probes this for liveness).
@app.get("/sdapi/v1/sd-models")
def sd_models():
    return [{"title": MODEL_ID, "model_name": MODEL_ID, "hash": None, "sha256": None, "filename": MODEL_ID}]


@app.get("/healthz")
def healthz():
    return {"ok": True, "model": MODEL_ID, "device": DEVICE}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "7860")))
