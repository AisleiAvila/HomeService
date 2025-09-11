#!/usr/bin/env pwsh

# Script de teste rápido para verificar a importação
param(
    [string]$SupabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co",
    [string]$Password = ""
)

if ([string]::IsNullOrEmpty($Password)) {
    $Password = Read-Host -Prompt "Digite a senha do Supabase" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
}

$Host = $SupabaseUrl.Replace("https://", "").Replace(".supabase.co", "")

Write-Host "=== Teste Rápido de Importação ===" -ForegroundColor Green

# Configurar variáveis de ambiente
$env:PGPASSWORD = $Password

# Testar conexão
Write-Host "Testando conexão..." -ForegroundColor Yellow
$connectionTest = psql -h $Host -p 5432 -U postgres -d postgres -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Conexão bem-sucedida" -ForegroundColor Green
} else {
    Write-Error "❌ Falha na conexão: $connectionTest"
    exit 1
}

# Executar apenas criação de tabelas e distritos para teste
Write-Host "Executando scripts básicos..." -ForegroundColor Yellow

$basicScripts = @(
    "sql\01_create_tables_portugal_addresses.sql",
    "sql\03_insert_distritos.sql"
)

foreach ($script in $basicScripts) {
    if (Test-Path $script) {
        Write-Host "Executando: $script" -ForegroundColor Cyan
        $result = psql -h $Host -p 5432 -U postgres -d postgres -f $script 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $script - OK" -ForegroundColor Green
        } else {
            Write-Warning "⚠️ Erro em $script`: $result"
        }
    }
}

# Verificar resultados
Write-Host "`nVerificando resultados..." -ForegroundColor Yellow
$verifyQuery = "SELECT COUNT(*) as total_distritos FROM distritos;"
$result = psql -h $Host -p 5432 -U postgres -d postgres -c $verifyQuery -t 2>&1

Write-Host "Total de distritos importados: $($result.Trim())" -ForegroundColor Green

Write-Host "`n=== Teste Concluído ===" -ForegroundColor Green
Write-Host "Se tudo correu bem, execute o script completo:" -ForegroundColor Yellow
Write-Host ".\scripts\import_portugal_addresses.ps1 -SupabaseUrl $SupabaseUrl -SupabasePassword ***" -ForegroundColor Cyan
