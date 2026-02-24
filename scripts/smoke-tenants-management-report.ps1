param(
  [string]$BaseUrl = "http://localhost:4002",
  [string]$SuperUserEmail = "",
  [string]$SuperUserPassword = "",
  [string]$SuperUserToken = "",
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [string]$AdminToken = "",
  [string]$ProfessionalEmail = "",
  [string]$ProfessionalPassword = "",
  [string]$ProfessionalToken = "",
  [string]$TenantId = "",
  [switch]$RunWriteActions,
  [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"
$startedAt = Get-Date
$status = "success"
$errorMessage = ""
$scriptPath = Join-Path $PSScriptRoot "smoke-tenants-management.ps1"
$workspaceRoot = Split-Path -Parent $PSScriptRoot

try {
  $params = @{
    BaseUrl = $BaseUrl
  }

  if (-not [string]::IsNullOrWhiteSpace($SuperUserEmail)) { $params.SuperUserEmail = $SuperUserEmail }
  if (-not [string]::IsNullOrWhiteSpace($SuperUserPassword)) { $params.SuperUserPassword = $SuperUserPassword }
  if (-not [string]::IsNullOrWhiteSpace($SuperUserToken)) { $params.SuperUserToken = $SuperUserToken }
  if (-not [string]::IsNullOrWhiteSpace($AdminEmail)) { $params.AdminEmail = $AdminEmail }
  if (-not [string]::IsNullOrWhiteSpace($AdminPassword)) { $params.AdminPassword = $AdminPassword }
  if (-not [string]::IsNullOrWhiteSpace($AdminToken)) { $params.AdminToken = $AdminToken }
  if (-not [string]::IsNullOrWhiteSpace($ProfessionalEmail)) { $params.ProfessionalEmail = $ProfessionalEmail }
  if (-not [string]::IsNullOrWhiteSpace($ProfessionalPassword)) { $params.ProfessionalPassword = $ProfessionalPassword }
  if (-not [string]::IsNullOrWhiteSpace($ProfessionalToken)) { $params.ProfessionalToken = $ProfessionalToken }
  if (-not [string]::IsNullOrWhiteSpace($TenantId)) { $params.TenantId = $TenantId }
  if ($RunWriteActions.IsPresent) { $params.RunWriteActions = $true }

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
  $OutputFile = Join-Path $reportDir "tenant-management-smoke-report-$timestamp.md"
}

$mode = if ($RunWriteActions.IsPresent) { "read-write" } else { "read-only" }

$report = @"
# Tenant Management Smoke Report

- Started at: $($startedAt.ToString("yyyy-MM-dd HH:mm:ss K"))
- Finished at: $($finishedAt.ToString("yyyy-MM-dd HH:mm:ss K"))
- Duration (s): $durationSeconds
- Status: $status
- Base URL: $BaseUrl
- Mode: $mode
- Tenant id override: $(if ([string]::IsNullOrWhiteSpace($TenantId)) { "auto" } else { $TenantId })
- Run write actions: $($RunWriteActions.IsPresent)

## Notes

- Script executed: scripts/smoke-tenants-management.ps1
- Super user credentials/token are required.
- Admin/professional checks run only if their credentials/token are provided.
$(if ($status -eq "failure") { "- Error: $errorMessage" } else { "- All requested smoke steps completed successfully." })
"@

Set-Content -Path $OutputFile -Value $report -Encoding UTF8
Write-Host "Smoke report generated: $OutputFile"

if ($status -eq "failure") {
  throw "Smoke run failed. See report: $OutputFile"
}
