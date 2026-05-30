# Turnkey launcher for the self-hosted image generator (Windows / PowerShell).
# Creates a venv, installs deps, auto-picks a hardware-appropriate model, serves.
#
#   cd tools\image-generator
#   .\run.ps1
#
# Override the model with:  $env:MODEL_ID="stabilityai/sdxl-turbo"; .\run.ps1
#
# If you see "running scripts is disabled on this system", run this once:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
# or launch with:  powershell -ExecutionPolicy Bypass -File .\run.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$Port = if ($env:PORT) { $env:PORT } else { "7860" }

# Find a Python launcher
$Py = $null
foreach ($cand in @("python", "py", "python3")) {
  if (Get-Command $cand -ErrorAction SilentlyContinue) { $Py = $cand; break }
}
if (-not $Py) {
  Write-Error "Python not found. Install Python 3.10+ from https://www.python.org/downloads/ (check 'Add to PATH')."
  exit 1
}

# 1) venv
if (-not (Test-Path ".venv")) {
  Write-Host "[run] creating virtualenv..."
  & $Py -m venv .venv
}
$VenvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

# 2) detect hardware
$HasCuda = $false
if (Get-Command "nvidia-smi" -ErrorAction SilentlyContinue) { $HasCuda = $true }

# 3) install torch (only if missing)
& $VenvPy -c "import torch" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[run] installing PyTorch (this can take a few minutes)..."
  & $VenvPy -m pip install --upgrade pip --quiet
  & $VenvPy -m pip install torch --quiet
}

Write-Host "[run] installing diffusers stack..."
& $VenvPy -m pip install diffusers transformers accelerate safetensors fastapi "uvicorn[standard]" pydantic pillow --quiet

# 4) pick a model unless the user set MODEL_ID
if (-not $env:MODEL_ID) {
  if ($HasCuda) { $env:MODEL_ID = "stabilityai/sdxl-turbo" }
  else          { $env:MODEL_ID = "stabilityai/sd-turbo" }
}
$env:PORT = $Port
Write-Host "[run] MODEL_ID=$($env:MODEL_ID)  PORT=$Port  (CUDA=$HasCuda)"

# 5) serve
& $VenvPy server.py
