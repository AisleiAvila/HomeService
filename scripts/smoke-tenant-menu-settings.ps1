param(
  [string]$BaseUrl = "http://localhost:4002",
  [string]$SuperUserEmail = "",
  [string]$SuperUserPassword = "",
  [string]$SuperUserToken = "",
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

function Normalize-MenuItems {
  param($Items)

  if ($null -eq $Items) { return @() }
  $array = @($Items)
  return $array | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
}

$effectiveToken = $SuperUserToken

if ([string]::IsNullOrWhiteSpace($effectiveToken)) {
  if ([string]::IsNullOrWhiteSpace($SuperUserEmail)) {
    $SuperUserEmail = Get-EnvValue -Name "SUPER_USER_EMAIL"
  }

  if ([string]::IsNullOrWhiteSpace($SuperUserPassword)) {
    $SuperUserPassword = Get-EnvValue -Name "SUPER_USER_PASSWORD"
  }

  if ([string]::IsNullOrWhiteSpace($SuperUserEmail) -or [string]::IsNullOrWhiteSpace($SuperUserPassword)) {
    throw "Forneça SUPER_USER_EMAIL/SUPER_USER_PASSWORD ou -SuperUserToken."
  }

  Write-Host "[1/7] Login super_user"
  $login = Invoke-JsonPost -Url "$BaseUrl/api/login" -Body @{
    email = $SuperUserEmail
    password = $SuperUserPassword
  }

  if (-not $login.success -or -not $login.session.token) {
    throw "Login super_user falhou"
  }

  $effectiveToken = [string]$login.session.token
  Write-Host "  OK userId=$($login.user.id)"
} else {
  Write-Host "[1/7] Login pulado (token fornecido)"
}

$headers = @{ Authorization = "Bearer $effectiveToken" }

Write-Host "[2/7] Listar tenants acessíveis"
$listTenants = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $headers -Body @{ action = "list_tenants" }
if (-not $listTenants.success) {
  throw "list_tenants falhou"
}

$tenants = @($listTenants.tenants)
if ($tenants.Count -eq 0) {
  throw "Nenhum tenant acessível para super_user"
}

$targetTenantId = $TenantId
if ([string]::IsNullOrWhiteSpace($targetTenantId)) {
  $targetTenantId = [string]$tenants[0].id
}

Write-Host "[3/7] Trocar tenant ativo (switch_tenant)"
$switchResult = Invoke-JsonPost -Url "$BaseUrl/api/session" -Headers $headers -Body @{
  action = "switch_tenant"
  tenantId = $targetTenantId
  reason = "Smoke test tenant menu settings"
}
if (-not $switchResult.success) {
  throw "switch_tenant falhou"
}

Write-Host "[4/7] Ler configuração de menu do tenant"
try {
  $menuSettings = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $headers -Body @{
    action = "get_menu_settings"
    tenantId = $targetTenantId
  }
} catch {
  $message = [string]$_.Exception.Message
  if ($message -match "HTTP\s+500\b") {
    throw "Falha ao ler tenant_menu_settings. Verifique se a migration sql/2026-02-24-add-tenant-menu-settings.sql foi aplicada. Detalhe: $message"
  }
  throw
}

if (-not $menuSettings.success) {
  throw "get_menu_settings falhou"
}

$settings = @($menuSettings.settings)
if ($settings.Count -eq 0) {
  throw "Configuração de menu não encontrada para o tenant"
}

$adminSetting = $settings | Where-Object { $_.role -eq "admin" } | Select-Object -First 1
if ($null -eq $adminSetting) {
  throw "Configuração de menu para role admin não encontrada"
}

$adminItems = Normalize-MenuItems -Items $adminSetting.enabled_items
if ($adminItems.Count -eq 0) {
  throw "Role admin sem itens de menu habilitados"
}

Write-Host "[5/7] Validar rejeição de item inválido (esperado 400)"
Expect-HttpErrorStatus -AllowedStatusCodes @(400) -Label "update_menu_settings com item inválido" -Action {
  Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $headers -Body @{
    action = "update_menu_settings"
    tenantId = $targetTenantId
    data = @{
      role = "admin"
      enabled_items = @("invalid-menu-item")
    }
  }
}

if ($RunWriteActions.IsPresent) {
  Write-Host "[6/7] Atualização idempotente de menu (admin)"
  $writeResult = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $headers -Body @{
    action = "update_menu_settings"
    tenantId = $targetTenantId
    data = @{
      role = "admin"
      enabled_items = $adminItems
    }
  }

  if (-not $writeResult.success) {
    throw "update_menu_settings (idempotente) falhou"
  }
} else {
  Write-Host "[6/7] Escrita pulada (use -RunWriteActions para validar update_menu_settings)"
}

Write-Host "[7/7] Releitura de menu pós-validação"
$menuSettingsAfter = Invoke-JsonPost -Url "$BaseUrl/api/tenants" -Headers $headers -Body @{
  action = "get_menu_settings"
  tenantId = $targetTenantId
}
if (-not $menuSettingsAfter.success) {
  throw "Releitura de menu falhou"
}

Write-Host "Smoke test tenant_menu_settings concluído com sucesso."
