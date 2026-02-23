param(
  [string]$BaseUrl = "http://localhost:4002",
  [string]$Email = "",
  [string]$Password = "",
  [string]$Token = "",
  [Nullable[int]]$TargetUserId = $null,
  [string]$TenantId = "",
  [string]$Reason = "Smoke test",
  [switch]$RunWriteActions
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Token)) {
  if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = [string]$env:SUPER_USER_EMAIL
    if ([string]::IsNullOrWhiteSpace($Email)) {
      $Email = [string][Environment]::GetEnvironmentVariable("SUPER_USER_EMAIL", "User")
    }
    if ([string]::IsNullOrWhiteSpace($Email)) {
      $Email = [string][Environment]::GetEnvironmentVariable("SUPER_USER_EMAIL", "Machine")
    }
  }

  if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = [string]$env:SUPER_USER_PASSWORD
    if ([string]::IsNullOrWhiteSpace($Password)) {
      $Password = [string][Environment]::GetEnvironmentVariable("SUPER_USER_PASSWORD", "User")
    }
    if ([string]::IsNullOrWhiteSpace($Password)) {
      $Password = [string][Environment]::GetEnvironmentVariable("SUPER_USER_PASSWORD", "Machine")
    }
  }

  if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) {
    throw "Provide -Token OR provide -Email/-Password (or set SUPER_USER_EMAIL and SUPER_USER_PASSWORD)."
  }
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

if ([string]::IsNullOrWhiteSpace($Token)) {
  Write-Host "[1/7] Login as super_user..."
  $login = Invoke-JsonPost -Url "$BaseUrl/api/login" -Body @{
    email = $Email
    password = $Password
  }

  if (-not $login.success -or -not $login.session.token) {
    throw "Login failed or token missing."
  }

  if ([string]::IsNullOrWhiteSpace([string]$login.user.role) -or [string]$login.user.role -ne "super_user") {
    throw "Authenticated role '$($login.user.role)' is not allowed. Use a user with role 'super_user'."
  }

  $Token = $login.session.token
  Write-Host "  Logged in as userId=$($login.user.id), role=$($login.user.role)"
} else {
  Write-Host "[1/7] Using provided token (login skipped)..."
}

$authHeaders = @{ Authorization = "Bearer $Token" }

Write-Host "[2/7] Action list_users"
$listUsers = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "list_users"
}

if (-not $listUsers.success) {
  throw "list_users failed"
}

$users = @($listUsers.users)
Write-Host "  Super users found: $($users.Count)"

$effectiveTargetUserId = $TargetUserId
if (-not $effectiveTargetUserId -and $users.Count -gt 0) {
  $effectiveTargetUserId = [int]$users[0].id
}

if (-not $effectiveTargetUserId) {
  throw "No target super user available. Use -TargetUserId."
}

Write-Host "[3/7] Action list_audit (targetUserId=$effectiveTargetUserId)"
$auditBefore = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "list_audit"
  userId = $effectiveTargetUserId
  limit = 10
}

if (-not $auditBefore.success) {
  throw "list_audit failed"
}
Write-Host "  Audit rows (before): $(@($auditBefore.logs).Count)"

Write-Host "[4/7] Action get_user_tenants (targetUserId=$effectiveTargetUserId)"
$userTenants = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "get_user_tenants"
  userId = $effectiveTargetUserId
}

if (-not $userTenants.success) {
  throw "get_user_tenants failed"
}

$tenantList = @($userTenants.tenants)
$mappingList = @($userTenants.mappings)
Write-Host "  Tenant rows: $($tenantList.Count) | Access mappings: $($mappingList.Count)"

Write-Host "[5/7] Action list_tenants (session API)"
$sessionTenants = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $authHeaders -Body @{
  action = "list_tenants"
}

if (-not $sessionTenants.success) {
  throw "session list_tenants failed"
}
Write-Host "  Accessible tenants from session: $(@($sessionTenants.tenants).Count)"

if (-not $RunWriteActions) {
  Write-Host "[6/7] Write actions skipped (use -RunWriteActions to run grant/revoke)"
  Write-Host "[7/7] Done (read-only smoke test passed)"
  return
}

if ([string]::IsNullOrWhiteSpace($TenantId)) {
  throw "-TenantId is required when using -RunWriteActions"
}

Write-Host "[6/7] Action grant_access (targetUserId=$effectiveTargetUserId, tenantId=$TenantId)"
$grant = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "grant_access"
  userId = $effectiveTargetUserId
  tenantId = $TenantId
  reason = "$Reason (grant)"
}
if (-not $grant.success) {
  throw "grant_access failed"
}
Write-Host "  grant_access OK"

Write-Host "[7/7] Action revoke_access + list_audit"
$revoke = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "revoke_access"
  userId = $effectiveTargetUserId
  tenantId = $TenantId
  reason = "$Reason (revoke)"
}
if (-not $revoke.success) {
  throw "revoke_access failed"
}

$auditAfter = Invoke-JsonPost -Url "$BaseUrl/api/super-user-access" -Headers $authHeaders -Body @{
  action = "list_audit"
  userId = $effectiveTargetUserId
  limit = 10
}

if (-not $auditAfter.success) {
  throw "list_audit (after) failed"
}

Write-Host "  revoke_access OK | Audit rows (after): $(@($auditAfter.logs).Count)"
Write-Host "Smoke test completed successfully."
