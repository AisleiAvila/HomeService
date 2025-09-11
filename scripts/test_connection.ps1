# =====================================================
# Script de Teste de Conexão Supabase
# =====================================================

param(
    [string]$SupabaseUrl = "https://uqrvenlkquheajuveggv.supabase.co",
    [string]$AnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcnZlbmxrcXVoZWFqdXZlZ2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzg4NDgsImV4cCI6MjA3MjY1NDg0OH0.ZdgBkvjC5irHh7E9fagqX_Pu797anPfE8jO91iNDRIc"
)

Write-Host "=== Teste de Conexão com Supabase ===" -ForegroundColor Green

# Testar conexão básica
$headers = @{
    'apikey' = $AnonKey
    'Authorization' = "Bearer $AnonKey"
}

try {
    Write-Host "Testando conexão com: $SupabaseUrl" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Headers $headers -Method Get
    Write-Host "✅ Conexão com Supabase bem-sucedida!" -ForegroundColor Green
    
    # Verificar se as tabelas já existem
    try {
        $tables = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/distritos?select=count" -Headers $headers -Method Get
        Write-Host "✅ Tabela 'distritos' já existe" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Tabela 'distritos' não existe ainda" -ForegroundColor Yellow
    }
    
    Write-Host "`n🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "1. Abra o SQL Editor no Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Execute os scripts SQL na pasta 'sql\' na ordem numérica" -ForegroundColor White
    Write-Host "3. Ou use um dos métodos alternativos descritos no INSTRUCOES_EXECUCAO.md" -ForegroundColor White
    
} catch {
    Write-Host "❌ Erro na conexão: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifique se a URL e a API Key estão corretas." -ForegroundColor Yellow
}

Write-Host "`n📁 ARQUIVOS DISPONÍVEIS:" -ForegroundColor Cyan
if (Test-Path "sql\*.sql") {
    Get-ChildItem "sql\*.sql" | ForEach-Object { 
        Write-Host "  - $($_.Name)" -ForegroundColor White 
    }
} else {
    Write-Host "  Nenhum arquivo SQL encontrado na pasta sql\" -ForegroundColor Red
}
