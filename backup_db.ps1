$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbPath = Join-Path $projectRoot "task_tracker.db"
$backupDir = Join-Path $projectRoot "backups"

if (-not (Test-Path $backupDir)) {
    New-Item -Path $backupDir -ItemType Directory | Out-Null
}

if (Test-Path $dbPath) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $dbPath (Join-Path $backupDir "task_tracker-$timestamp.db")
    Write-Host "Backup created."
} else {
    Write-Host "Database file not found."
}
