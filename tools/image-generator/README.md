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
in-process canvas/SVG visual engine, so site generation never breaks.

## Run it (one command)

**macOS / Linux:**
```bash
cd tools/image-generator
./run.sh
```

**Windows (PowerShell):**
```powershell
cd tools\image-generator
.\run.ps1
```
If PowerShell says *"running scripts is disabled on this system"*, either run the
double-clickable **`run.bat`** instead (it bypasses the policy automatically), or
launch with:
```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1
```

The launcher creates the venv, installs PyTorch (CPU or CUDA wheel
automatically), installs the diffusers stack, picks a hardware-appropriate
model, and serves on `http://127.0.0.1:7860`.

- **GPU detected** → `stabilityai/sdxl-turbo` (fast, up to 1024px)
- **CPU only** → `stabilityai/sd-turbo` (512px, lighter)

Override the model anytime:
- macOS/Linux: `MODEL_ID=stabilityai/sdxl-turbo ./run.sh`
- Windows: `$env:MODEL_ID="stabilityai/sdxl-turbo"; .\run.ps1`

### Manual run (if the launcher fails for any reason)

**macOS / Linux:**
```bash
cd tools/image-generator
python -m venv .venv
source .venv/bin/activate
pip install torch
pip install -r requirements.txt
python server.py                      # http://127.0.0.1:7860
```

**Windows (PowerShell):**
```powershell
cd tools\image-generator
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch
pip install -r requirements.txt
python server.py                      # http://127.0.0.1:7860
```

First run downloads the model weights once (~2.5 GB for sd-turbo, ~7 GB for
sdxl-turbo) from Hugging Face (`huggingface.co` must be reachable). After that
it's fully local — no network needed and no third-party API at runtime.

> The server hardens the reference contract with an on-disk PNG cache
> (`.cache/`), single-flight inference locking, a `/sdapi/v1/sd-models` liveness
> endpoint, and `/healthz`. Generated PNGs are also cached by the Next.js engine
> in `public/generated/` keyed by prompt hash, so identical prompts render once.

## Verifying the wiring without a GPU

The full path — `image-agent.ts` (builds the photographic prompt) →
`image-backend.ts` (POSTs to `/sdapi/v1/txt2img`, caches the PNG to
`public/generated/`) → renderer (embeds `/generated/*.png`) — is independent of
which model is loaded. You can confirm it end-to-end against any server that
speaks the `/sdapi/v1/txt2img` contract before committing GPU time to the real
weights.

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
