$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$taskName = "TaskTracker"
$scriptPath = Join-Path $projectRoot "start_all.bat"

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force
Write-Host "Autostart task '$taskName' configured."
Write-Host "Backend will be available at http://localhost:8000"
Write-Host "Frontend will be available at http://localhost:5173"
