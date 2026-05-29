# Self-Hosted Image Generator

This is **your own** image-generation service — it runs an open-source Stable
Diffusion model **on your machine/server**. It is **not** a third-party API and
**not** a paid service. The Storebuilder engine sends it niche-specific prompts
and gets back real photographs that match each website.

## How it fits the engine

```
prompt → understanding (PUO) ─► image-agent.ts  ─► precise photo prompt per section
                                       │
                                       ▼
                              image-backend.ts  ─► POST /sdapi/v1/txt2img ─► THIS SERVICE
                                       │                                         │
                                       │                                    Stable Diffusion
                                       ▼                                         │
                          /public/generated/*.png  ◄───────  base64 PNG  ◄───────┘
                                       │
                                       ▼
                              embedded in the generated website
```

If this service is **not running**, the engine automatically falls back to the
in-process SVG visual engine, so site generation never breaks.

## Run it

```bash
cd tools/image-generator
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python server.py                      # http://127.0.0.1:7860
```

First run downloads the model weights once (a few GB) from Hugging Face. After
that it's fully local.

## Enable it in the app

Add to `.env.local`:

```
IMAGE_GEN_ENABLED=1
IMAGE_GEN_URL=http://127.0.0.1:7860
# Optional tuning:
# IMAGE_GEN_COUNT=6          # distinct images per site
# IMAGE_GEN_STEPS=6          # diffusion steps (SDXL-Turbo: 1-6)
# IMAGE_GEN_CFG=2            # guidance scale
# IMAGE_GEN_TIMEOUT_MS=25000 # per-image budget
# MODEL_ID=stabilityai/sdxl-turbo   # any diffusers text2img model
```

## Hardware

- **NVIDIA GPU (CUDA)** or **Apple Silicon (MPS)**: fast (sub-second to a few seconds per image with SDXL-Turbo).
- **CPU only**: works but slow (tens of seconds per image) — keep `IMAGE_GEN_COUNT` low or pre-warm the cache.

## Notes

- Generated images are cached in `public/generated/` keyed by prompt hash, so
  repeated niches/prompts are only generated once.
- The API contract matches AUTOMATIC1111's `/sdapi/v1/txt2img`, so you can point
  `IMAGE_GEN_URL` at a full A1111 / Forge install instead if you already run one.
