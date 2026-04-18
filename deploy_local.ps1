$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$venvPath = Join-Path $projectRoot ".venv"
$pythonExe = Join-Path $venvPath "Scripts\python.exe"
$pipExe = Join-Path $venvPath "Scripts\pip.exe"

Set-Location $projectRoot

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

Write-Host "Installing backend dependencies..."
& $pipExe install -r requirements.txt

Write-Host "Installing frontend dependencies..."
Set-Location (Join-Path $projectRoot "frontend")
npm install

Write-Host "Building frontend..."
npm run build

Set-Location $projectRoot
Write-Host "Deploy preparation completed."
Write-Host "Run .\start_backend.bat to start the application."
