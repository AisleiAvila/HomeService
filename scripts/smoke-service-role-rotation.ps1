param(
  [string]$BaseUrl = "http://localhost:4002",
  [string]$Email = "",
  [string]$Password = "",
  [string]$Token = "",
  [string]$TenantId = "",
  [switch]$SkipRevoke
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param([string]$Name)

  $value = [string]([Environment]::GetEnvironmentVariable($Name, "Process"))
  if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }

  $value = [string]([Environment]::GetEnvironmentVariable($Name, "User"))
  if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }

  return [string]([Environment]::GetEnvironmentVariable($Name, "Machine"))
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)]$Body,
    [hashtable]$Headers = @{}
  )

  try {
    return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Headers $Headers -Body ($Body | ConvertTo-Json -Depth 10)
  } catch {
    $response = $_.Exception.Response
    if (-not $response) {
      throw $_
    }

    $statusCode = [int]$response.StatusCode
    $responseBody = ""
    try {
      $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
      $responseBody = $reader.ReadToEnd()
    } catch {
      $responseBody = ""
    }

    $details = if ([string]::IsNullOrWhiteSpace($responseBody)) { "<empty-body>" } else { $responseBody }
    throw "HTTP $statusCode calling $Url. Response: $details"
  }
}

$effectiveToken = $Token

if ([string]::IsNullOrWhiteSpace($effectiveToken)) {
  if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = Get-EnvValue -Name "SUPER_USER_EMAIL"
  }

  if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = Get-EnvValue -Name "SUPER_USER_PASSWORD"
  }

  if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw "Provide -Token OR -Email/-Password OR SUPER_USER_EMAIL/SUPER_USER_PASSWORD env vars."
  }

  Write-Host "[1/6] Login"
  $login = Invoke-JsonPost -Url "$BaseUrl/api/login" -Body @{
    email = $Email
    password = $Password
  }

  if (-not $login.success -or -not $login.session.token) {
    throw "Login failed: missing success/token"
  }

  $effectiveToken = [string]$login.session.token
  Write-Host "  OK userId=$($login.user.id) role=$($login.user.role)"
} else {
  Write-Host "[1/6] Login skipped (using provided token)"
}

$authHeaders = @{ Authorization = "Bearer $effectiveToken" }

Write-Host "[2/6] Session validate"
$sessionValidate = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $authHeaders -Body @{ action = "validate" }
if (-not $sessionValidate.success) {
  throw "session validate failed"
}
Write-Host "  OK expiresAt=$($sessionValidate.session.expiresAt)"

Write-Host "[3/6] Session list_tenants"
$tenantsResult = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $authHeaders -Body @{ action = "list_tenants" }
if (-not $tenantsResult.success) {
  throw "session list_tenants failed"
}

$tenants = @($tenantsResult.tenants)
if ($tenants.Count -eq 0) {
  throw "No accessible tenants returned by session list_tenants"
}

$targetTenantId = $TenantId
if ([string]::IsNullOrWhiteSpace($targetTenantId)) {
  $targetTenantId = [string]$tenants[0].id
}
Write-Host "  OK count=$($tenants.Count) targetTenantId=$targetTenantId"

Write-Host "[4/6] Billing get_billing"
$getBilling = Invoke-JsonPost -Url "$BaseUrl/api/billing" -Headers $authHeaders -Body @{
  action = "get_billing"
  tenantId = $targetTenantId
}
if (-not $getBilling.success) {
  throw "billing get_billing failed"
}
Write-Host "  OK status=$($getBilling.state.billing_status) accessAllowed=$($getBilling.state.access_allowed)"

Write-Host "[5/6] Billing list_invoices"
$listInvoices = Invoke-JsonPost -Url "$BaseUrl/api/billing" -Headers $authHeaders -Body @{
  action = "list_invoices"
  tenantId = $targetTenantId
  limit = 5
}
if (-not $listInvoices.success) {
  throw "billing list_invoices failed"
}
Write-Host "  OK invoices=$(@($listInvoices.invoices).Count)"

if ($SkipRevoke.IsPresent) {
  Write-Host "[6/6] Revoke skipped (-SkipRevoke)"
  Write-Host "Smoke pós-rotação concluído com sucesso."
  return
}

Write-Host "[6/6] Session revoke"
$revoke = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $authHeaders -Body @{ action = "revoke" }
if (-not $revoke.success) {
  throw "session revoke failed"
}

Write-Host "Smoke pós-rotação concluído com sucesso."
