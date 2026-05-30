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

function Show-PythonHelp {
  Write-Host ""
  Write-Host "  Could not find a REAL Python install." -ForegroundColor Red
  Write-Host "  (The Windows 'python' you have is just a Microsoft Store stub.)" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Fix it in 2 steps:" -ForegroundColor Yellow
  Write-Host "    1. Install Python 3.10+ from https://www.python.org/downloads/"
  Write-Host "       -> on the FIRST installer screen, TICK 'Add python.exe to PATH'."
  Write-Host "    2. Close and reopen this terminal, then run .\run.ps1 again."
  Write-Host ""
  Write-Host "  If it still says 'not found', disable the stub:" -ForegroundColor Yellow
  Write-Host "    Settings > Apps > Advanced app settings > App execution aliases"
  Write-Host "    -> turn OFF python.exe and python3.exe."
  Write-Host ""
}

# Find a REAL Python (the Microsoft Store stub answers `python` but is not real:
# it prints 'Python was not found' and exits non-zero, so we verify --version).
$Py = $null
foreach ($cand in @("py", "python", "python3")) {
  if (-not (Get-Command $cand -ErrorAction SilentlyContinue)) { continue }
  $ver = (& $cand --version 2>&1 | Out-String).Trim()
  if ($LASTEXITCODE -eq 0 -and $ver -match "Python\s+3\.") { $Py = $cand; break }
}
if (-not $Py) {
  Show-PythonHelp
  exit 1
}
Write-Host "[run] using $Py ($((& $Py --version 2>&1 | Out-String).Trim()))"

# 1) venv
if (-not (Test-Path ".venv")) {
  Write-Host "[run] creating virtualenv..."
  & $Py -m venv .venv
}
$VenvPy = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"

# Verify the venv interpreter actually exists (it won't if Python was a stub).
if (-not (Test-Path $VenvPy)) {
  Write-Host "[run] virtualenv was not created correctly (removing partial .venv)." -ForegroundColor Red
  if (Test-Path ".venv") { Remove-Item -Recurse -Force ".venv" }
  Show-PythonHelp
  exit 1
}

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
