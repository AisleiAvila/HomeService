Write-Host "=== Teste de Conexão com Supabase ===" -ForegroundColor Green

$SupabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co"
$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc"

$headers = @{
    'apikey' = $AnonKey
    'Authorization' = "Bearer $AnonKey"
}

Write-Host "Testando conexão com: $SupabaseUrl" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Headers $headers -Method Get
    Write-Host "✅ Conexão com Supabase bem-sucedida!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro na conexão: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 RESUMO DO PROBLEMA:" -ForegroundColor Cyan
Write-Host "• O script original falhou porque 'psql' não está instalado" -ForegroundColor White
Write-Host "• O 'psql' é o cliente PostgreSQL necessário para conectar ao banco" -ForegroundColor White

Write-Host "`n🎯 SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "1. SQL Editor do Supabase (MAIS FÁCIL)" -ForegroundColor Yellow
Write-Host "   - Acesse: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   - Abra SQL Editor no seu projeto" -ForegroundColor White
Write-Host "   - Execute os scripts SQL da pasta 'sql\' em ordem" -ForegroundColor White

Write-Host "`n2. Instalar PostgreSQL Client" -ForegroundColor Yellow
Write-Host "   - Baixe: https://www.postgresql.org/download/windows/" -ForegroundColor White
Write-Host "   - Depois execute: .\scripts\import_portugal_addresses.ps1" -ForegroundColor White

Write-Host "`n📁 ARQUIVOS DISPONÍVEIS:" -ForegroundColor Cyan
if (Test-Path "sql") {
    Get-ChildItem "sql\*.sql" | Sort-Object Name | ForEach-Object { 
        Write-Host "  - $($_.Name)" -ForegroundColor White 
    }
} else {
    Write-Host "  ❌ Pasta 'sql' não encontrada" -ForegroundColor Red
}

Write-Host "`n✅ EXECUTE ESTE COMANDO NO DIRETÓRIO CORRETO:" -ForegroundColor Green
Write-Host "cd C:\Users\aisle\Documents\Ambiente\HomeService" -ForegroundColor White
