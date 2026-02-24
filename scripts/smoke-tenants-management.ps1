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
  [switch]$RunWriteActions
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

function Resolve-Token {
  param(
    [string]$ProvidedToken,
    [string]$Email,
    [string]$Password,
    [string]$EmailEnv,
    [string]$PasswordEnv,
    [string]$Label
  )

  if (-not [string]::IsNullOrWhiteSpace($ProvidedToken)) {
    return $ProvidedToken
  }

  $effectiveEmail = $Email
  if ([string]::IsNullOrWhiteSpace($effectiveEmail)) {
    $effectiveEmail = Get-EnvValue -Name $EmailEnv
  }

  $effectivePassword = $Password
  if ([string]::IsNullOrWhiteSpace($effectivePassword)) {
    $effectivePassword = Get-EnvValue -Name $PasswordEnv
  }

  if ([string]::IsNullOrWhiteSpace($effectiveEmail) -or [string]::IsNullOrWhiteSpace($effectivePassword)) {
    return ""
  }

  Write-Host "[AUTH] Login $Label..."
  $login = Invoke-JsonPost -Url "$BaseUrl/api/login" -Body @{
    email = $effectiveEmail
    password = $effectivePassword
  }

  if (-not $login.success -or -not $login.session.token) {
    throw "Login falhou para $Label"
  }

  return [string]$login.session.token
}

function Build-TenantUpdatePayload {
  param($Tenant)

  return @{
    name = [string]$Tenant.name
    phone = if ($null -eq $Tenant.phone) { $null } else { [string]$Tenant.phone }
    contact_email = if ($null -eq $Tenant.contact_email) { $null } else { [string]$Tenant.contact_email }
    address = if ($null -eq $Tenant.address) { $null } else { [string]$Tenant.address }
    locality = if ($null -eq $Tenant.locality) { $null } else { [string]$Tenant.locality }
    postal_code = if ($null -eq $Tenant.postal_code) { $null } else { [string]$Tenant.postal_code }
    logo_image_data = if ($null -eq $Tenant.logo_image_data) { $null } else { [string]$Tenant.logo_image_data }
    status = [string]$Tenant.status
  }
}

function Expect-HttpErrorStatus {
  param(
    [scriptblock]$Action,
    [int[]]$AllowedStatusCodes,
    [string]$Label
  )

  try {
    & $Action | Out-Null
    throw "$Label retornou sucesso quando era esperado erro HTTP $($AllowedStatusCodes -join ', ')"
  } catch {
    $message = [string]$_.Exception.Message
    $matched = $false
    foreach ($statusCode in $AllowedStatusCodes) {
      if ($message -match "HTTP\s+$statusCode\b") {
        $matched = $true
        break
      }
    }

    if (-not $matched) {
      throw "$Label falhou com status inesperado: $message"
    }
  }
}

$superUserToken = Resolve-Token -ProvidedToken $SuperUserToken -Email $SuperUserEmail -Password $SuperUserPassword -EmailEnv "SUPER_USER_EMAIL" -PasswordEnv "SUPER_USER_PASSWORD" -Label "super_user"
if ([string]::IsNullOrWhiteSpace($superUserToken)) {
  throw "Forneça credenciais/token de super_user (SUPER_USER_EMAIL/SUPER_USER_PASSWORD ou -SuperUserToken)."
}

$superHeaders = @{ Authorization = "Bearer $superUserToken" }

Write-Host "[1/6] Super_user list_tenants"
$listTenants = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $superHeaders -Body @{ action = "list_tenants" }
if (-not $listTenants.success) {
  throw "list_tenants falhou para super_user"
}

$tenants = @($listTenants.tenants)
if ($tenants.Count -eq 0) {
  throw "Super user sem tenants acessíveis para smoke test"
}

$targetTenantId = $TenantId
if ([string]::IsNullOrWhiteSpace($targetTenantId)) {
  $targetTenantId = [string]$tenants[0].id
}

Write-Host "[2/6] Super_user get_profile (tenantId=$targetTenantId)"
$superProfile = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $superHeaders -Body @{
  action = "get_profile"
  tenantId = $targetTenantId
}
if (-not $superProfile.success -or -not $superProfile.tenant.id) {
  throw "get_profile falhou para super_user"
}

if ($RunWriteActions.IsPresent) {
  Write-Host "[3/6] Super_user update_profile (idempotente)"
  $superUpdatePayload = Build-TenantUpdatePayload -Tenant $superProfile.tenant
  $superUpdate = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $superHeaders -Body @{
    action = "update_profile"
    tenantId = $targetTenantId
    data = $superUpdatePayload
  }

  if (-not $superUpdate.success) {
    throw "update_profile falhou para super_user"
  }
} else {
  Write-Host "[3/6] update_profile super_user pulado (use -RunWriteActions para validar escrita)"
}

$adminTokenResolved = Resolve-Token -ProvidedToken $AdminToken -Email $AdminEmail -Password $AdminPassword -EmailEnv "ADMIN_EMAIL" -PasswordEnv "ADMIN_PASSWORD" -Label "admin"
if (-not [string]::IsNullOrWhiteSpace($adminTokenResolved)) {
  $adminHeaders = @{ Authorization = "Bearer $adminTokenResolved" }

  Write-Host "[4/6] Admin get_profile (tenant derivado da sessão)"
  $adminProfile = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $adminHeaders -Body @{ action = "get_profile" }
  if (-not $adminProfile.success -or -not $adminProfile.tenant.id) {
    throw "get_profile falhou para admin"
  }

  Write-Host "[5/6] Admin bloqueado para tenantId arbitrário (esperado 400/403)"
  Expect-HttpErrorStatus -AllowedStatusCodes @(400, 403) -Label "admin get_profile com tenantId arbitrário" -Action {
    Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $adminHeaders -Body @{
      action = "get_profile"
      tenantId = [guid]::NewGuid().ToString()
    }
  }
} else {
  Write-Host "[4/6] Admin smoke pulado (sem credenciais/token ADMIN_EMAIL/ADMIN_PASSWORD)"
  Write-Host "[5/6] Admin cross-tenant check pulado"
}

$professionalTokenResolved = Resolve-Token -ProvidedToken $ProfessionalToken -Email $ProfessionalEmail -Password $ProfessionalPassword -EmailEnv "PROFESSIONAL_EMAIL" -PasswordEnv "PROFESSIONAL_PASSWORD" -Label "professional"
if (-not [string]::IsNullOrWhiteSpace($professionalTokenResolved)) {
  $professionalHeaders = @{ Authorization = "Bearer $professionalTokenResolved" }

  Write-Host "[6/6] Professional bloqueado no endpoint /api/tenants (esperado 403)"
  Expect-HttpErrorStatus -AllowedStatusCodes @(403) -Label "professional get_profile" -Action {
    Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $professionalHeaders -Body @{ action = "get_profile" }
  }
} else {
  Write-Host "[6/6] Professional smoke pulado (sem PROFESSIONAL_EMAIL/PROFESSIONAL_PASSWORD)"
}

Write-Host "Smoke test de tenant management concluído com sucesso."
