param(
  [string]$BaseUrl = "http://localhost:4002",
  [string]$Email = "",
  [string]$Password = "",
  [string]$Token = "",
  [Nullable[int]]$TargetUserId = $null,
  [string]$TenantId = "",
  [string]$Reason = "Smoke report run",
  [switch]$RunWriteActions,
  [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

$startedAt = Get-Date
$status = "success"
$errorMessage = ""
$scriptPath = Join-Path $PSScriptRoot "smoke-super-user-access.ps1"
$workspaceRoot = Split-Path -Parent $PSScriptRoot

try {
  $params = @{
    BaseUrl = $BaseUrl
    Reason = $Reason
  }

  if (-not [string]::IsNullOrWhiteSpace($Email)) {
    $params.Email = $Email
  }
  if (-not [string]::IsNullOrWhiteSpace($Password)) {
    $params.Password = $Password
  }
  if (-not [string]::IsNullOrWhiteSpace($Token)) {
    $params.Token = $Token
  }
  if ($TargetUserId) {
    $params.TargetUserId = $TargetUserId
  }
  if (-not [string]::IsNullOrWhiteSpace($TenantId)) {
    $params.TenantId = $TenantId
  }
  if ($RunWriteActions.IsPresent) {
    $params.RunWriteActions = $true
  }

  & $scriptPath @params
} catch {
  $status = "failure"
  $errorMessage = $_.Exception.Message
}

$finishedAt = Get-Date
$durationSeconds = [math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
  $reportDir = Join-Path $workspaceRoot "docs\reports"
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  $timestamp = $startedAt.ToString("yyyyMMdd-HHmmss")
  $OutputFile = Join-Path $reportDir "super-user-smoke-report-$timestamp.md"
}

$mode = if ($RunWriteActions.IsPresent) { "read-write" } else { "read-only" }
$authMode = if (-not [string]::IsNullOrWhiteSpace($Token)) { "token" } else { "credentials/env" }

$report = @"
# Super User Smoke Report

- Started at: $($startedAt.ToString("yyyy-MM-dd HH:mm:ss K"))
- Finished at: $($finishedAt.ToString("yyyy-MM-dd HH:mm:ss K"))
- Duration (s): $durationSeconds
- Status: $status
- Base URL: $BaseUrl
- Mode: $mode
- Auth mode: $authMode
- Run write actions: $($RunWriteActions.IsPresent)
- Target user id: $(if ($TargetUserId) { $TargetUserId } else { "auto" })
- Tenant id: $(if ([string]::IsNullOrWhiteSpace($TenantId)) { "n/a" } else { $TenantId })

## Notes

- Script executed: scripts/smoke-super-user-access.ps1
- This report does not store credentials or token values.
$(if ($status -eq "failure") { "- Error: $errorMessage" } else { "- All requested smoke steps completed successfully." })
"@

Set-Content -Path $OutputFile -Value $report -Encoding UTF8
Write-Host "Smoke report generated: $OutputFile"

if ($status -eq "failure") {
  throw "Smoke run failed. See report: $OutputFile"
}
