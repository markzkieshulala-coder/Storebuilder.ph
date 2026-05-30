#!/usr/bin/env bash
# Turnkey launcher for the self-hosted image generator.
# Creates a venv, installs deps, auto-picks a hardware-appropriate model, serves.
#
#   cd tools/image-generator && ./run.sh
#
# Override the model with:  MODEL_ID=stabilityai/sdxl-turbo ./run.sh
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-7860}"
PY="${PYTHON:-python3}"

# 1) venv
if [ ! -d .venv ]; then
  echo "[run] creating virtualenv..."
  "$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

# 2) detect hardware → choose torch wheel + default model
HAS_CUDA=0
if command -v nvidia-smi >/dev/null 2>&1; then HAS_CUDA=1; fi

if [ -z "${TORCH_INSTALLED:-}" ] && ! python -c "import torch" >/dev/null 2>&1; then
  echo "[run] installing PyTorch..."
  if [ "$HAS_CUDA" = "1" ]; then
    pip install --quiet torch
  else
    # CPU-only wheel is much smaller than the CUDA build.
    pip install --quiet --index-url https://download.pytorch.org/whl/cpu torch
  fi
fi

echo "[run] installing diffusers stack..."
pip install --quiet diffusers transformers accelerate safetensors fastapi "uvicorn[standard]" pydantic pillow

# 3) pick a model appropriate for the hardware (unless the user set MODEL_ID)
if [ -z "${MODEL_ID:-}" ]; then
  if [ "$HAS_CUDA" = "1" ]; then
    export MODEL_ID="stabilityai/sdxl-turbo"     # fast on GPU, 1024px-capable
  else
    export MODEL_ID="stabilityai/sd-turbo"       # lighter 512px model for CPU
  fi
fi
echo "[run] MODEL_ID=$MODEL_ID  PORT=$PORT  (CUDA=$HAS_CUDA)"

# 4) serve
exec python server.py
